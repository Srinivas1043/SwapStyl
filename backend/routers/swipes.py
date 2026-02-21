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

    # Record the swipe — non-fatal if duplicate
    try:
        supabase.table("swipes").upsert({
            "swiper_id": current_user.id,
            "item_id": swipe.item_id,
            "direction": swipe.direction,
        }, on_conflict="swiper_id,item_id").execute()
    except Exception as e:
        # Swipes table may not exist yet — still return success
        return {"swiped": True, "matched": False, "warning": str(e)}

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

        # Create/upsert conversation (canonical ordering: smaller uuid = user1)
        u1 = min(current_user.id, owner_id)
        u2 = max(current_user.id, owner_id)

        conv_resp = supabase.table("conversations").upsert({
            "user1_id": u1,
            "user2_id": u2,
            "item_id": swipe.item_id,
        }, on_conflict="user1_id,user2_id,item_id").execute()

        conversation_id = (conv_resp.data or [{}])[0].get("id")

        if conversation_id:
            message_text = f"{swiper_name} is interested in your \"{item['title']}\""
            supabase.table("messages").insert({
                "conversation_id": conversation_id,
                "sender_id": current_user.id,
                "content": message_text,
            }).execute()

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
