from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from dependencies import get_supabase, get_current_user, get_authenticated_client

router = APIRouter(prefix="/swipes", tags=["swipes"])


class SwipeCreate(BaseModel):
    item_id: str
    direction: str  # "left" or "right"


@router.post("")
def record_swipe(
    swipe: SwipeCreate,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
    public_supabase=Depends(get_supabase),
):
    if swipe.direction not in ("left", "right"):
        raise HTTPException(status_code=400, detail="direction must be 'left' or 'right'")

    # Record the swipe — non-fatal (RLS on swipes table may reject it)
    swipe_warning = None
    try:
        supabase.table("swipes").upsert({
            "swiper_id": current_user.id,
            "item_id": swipe.item_id,
            "direction": swipe.direction,
        }, on_conflict="swiper_id,item_id").execute()
    except Exception as e:
        swipe_warning = str(e)
        # For left swipes we just return — no conversation to create
        if swipe.direction != "right":
            return {"swiped": True, "matched": False, "warning": swipe_warning}

    if swipe.direction != "right":
        return {"swiped": True, "matched": False}


    # ── Right swipe: try to open a conversation ─────────────────────────────
    try:
        # Fetch item owner
        item_resp = public_supabase.table("items").select("id, title, owner_id").eq("id", swipe.item_id).single().execute()
        if not item_resp.data:
            return {"swiped": True, "matched": False}

        item = item_resp.data
        owner_id = item["owner_id"]

        if owner_id == current_user.id:
            return {"swiped": True, "matched": False}

        # Fetch swiper name
        profile_resp = public_supabase.table("profiles").select("full_name, username").eq("id", current_user.id).single().execute()
        swiper_name = (profile_resp.data or {}).get("full_name") or (profile_resp.data or {}).get("username") or "Someone"

        # Create/get conversation (canonical ordering: smaller uuid = user1)
        u1 = min(current_user.id, owner_id)
        u2 = max(current_user.id, owner_id)

        # Step 1: Check if a conversation already exists for this pair+item
        existing_resp = (
            public_supabase.table("conversations")
            .select("id")
            .eq("user1_id", u1)
            .eq("user2_id", u2)
            .eq("item_id", swipe.item_id)
            .limit(1)
            .execute()
        )
        existing_rows = existing_resp.data or []
        conversation_id = existing_rows[0].get("id") if existing_rows else None

        # Step 2: No existing conversation — create one
        if not conversation_id:
            insert_resp = (
                public_supabase.table("conversations")
                .insert({
                    "user1_id": u1,
                    "user2_id": u2,
                    "item_id": swipe.item_id,
                })
                .execute()
            )
            conversation_id = (insert_resp.data or [{}])[0].get("id")

        if conversation_id:
            message_text = f"{swiper_name} is interested in your \"{item['title']}\""
            public_supabase.table("messages").insert({
                "conversation_id": conversation_id,
                "sender_id": current_user.id,
                "content": message_text,
            }).execute()

            # Increment unread counter for the item owner (User B) so they see a badge
            # u1 = min(swiper, owner), u2 = max; determine which slot the owner occupies
            owner_unread_field = "unread_user1" if owner_id == u1 else "unread_user2"
            try:
                conv_data = public_supabase.table("conversations").select(owner_unread_field).eq("id", conversation_id).single().execute()
                current_unread = (conv_data.data or {}).get(owner_unread_field, 0) or 0
                public_supabase.table("conversations").update({
                    owner_unread_field: current_unread + 1,
                    "last_message_at": "now()",
                }).eq("id", conversation_id).execute()
            except Exception:
                pass  # Non-critical — chat still works without the badge

        return {"swiped": True, "matched": True, "conversation_id": conversation_id}

    except Exception as e:
        # Return warning with full error so we can diagnose
        import traceback
        return {"swiped": True, "matched": False, "warning": str(e), "detail": traceback.format_exc()}


@router.get("/seen")
def get_seen_items(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    try:
        resp = supabase.table("swipes").select("item_id").eq("swiper_id", current_user.id).execute()
        return {"seen": [row["item_id"] for row in (resp.data or [])]}
    except Exception:
        return {"seen": []}
