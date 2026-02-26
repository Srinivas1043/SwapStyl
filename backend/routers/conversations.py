from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from dependencies import get_supabase, get_current_user, get_authenticated_client

router = APIRouter(prefix="/conversations", tags=["conversations"])


class SendMessage(BaseModel):
    content: str
    type: str = "text"                # text | item_proposal
    metadata: Optional[dict] = None   # { item_id, item_title, item_image, item_brand, item_size }


class UpdateStatus(BaseModel):
    action: str   # agree | complete | cancel


# ── Helpers ───────────────────────────────────────────────────────────────────

def _other_user(conv: dict, my_id: str) -> str:
    return conv["user2_id"] if conv["user1_id"] == my_id else conv["user1_id"]


def _unread_field(conv: dict, my_id: str) -> str:
    return "unread_user1" if conv["user1_id"] == my_id else "unread_user2"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
def list_conversations(
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    """Return all conversations for current user, enriched with last message + other user profile + item."""
    uid = current_user.id

    # Fetch conversations where I am user1 or user2
    resp = (
        supabase.table("conversations")
        .select(
            "*, "
            "item:item_id(id, title, images, brand, size, condition, status), "
            "user1:user1_id(id, full_name, username, avatar_url, location, rating), "
            "user2:user2_id(id, full_name, username, avatar_url, location, rating)"
        )
        .or_(f"user1_id.eq.{uid},user2_id.eq.{uid}")
        .order("last_message_at", desc=True)
        .execute()
    )
    convs = resp.data or []

    # For each conversation, fetch last message + compute unread
    result = []
    for conv in convs:
        # Last message
        msg_resp = (
            supabase.table("messages")
            .select("id, content, type, sender_id, created_at, is_deleted")
            .eq("conversation_id", conv["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        last_msg = (msg_resp.data or [None])[0]

        # Determine "other" user
        other = conv["user2"] if conv["user1_id"] == uid else conv["user1"]
        my_unread_field = "unread_user1" if conv["user1_id"] == uid else "unread_user2"

        result.append({
            **conv,
            "last_message": last_msg,
            "other_user": other,
            "my_unread": conv.get(my_unread_field, 0),
        })

    return result


@router.post("")
def create_conversation(
    target_user_id: str = Body(..., embed=True),
    item_id: Optional[str] = Body(None, embed=True),
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    """Start or retrieve conversation with another user."""
    uid = current_user.id
    
    # Ensure consistent ordering for lookup
    # Because we store user1_id < user2_id (usually), but let's check both ways or ensure order
    # The schema usually implies user1 < user2, but let's be safe
    u1, u2 = sorted([uid, target_user_id])

    # 1. Check if conversation already exists between these two users
    try:
        existing = (
            supabase.table("conversations")
            .select("id")
            .eq("user1_id", u1)
            .eq("user2_id", u2)
            .execute()
        )
        if existing.data:
            return {"id": existing.data[0]["id"], "is_new": False}
    except Exception:
        pass

    # 2. If not exists, create new
    try:
        new_conv = {
            "user1_id": u1,
            "user2_id": u2,
            "item_id": item_id,
            "status": "interested"
        }
        resp = supabase.table("conversations").insert(new_conv).execute()
        if resp.data:
            return {"id": resp.data[0]["id"], "is_new": True}
    except Exception as e:
        # If race condition or whatever, try fetch again
        raise HTTPException(400, f"Failed to create conversation: {str(e)}")


@router.get("/{conv_id}")
def get_conversation(
    conv_id: str,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    """Single conversation with full detail."""
    uid = current_user.id
    resp = (
        supabase.table("conversations")
        .select(
            "*, "
            "item:item_id(id, title, images, brand, size, condition, status, owner_id), "
            "user1:user1_id(id, full_name, username, avatar_url, location, rating, items_listed, items_swapped), "
            "user2:user2_id(id, full_name, username, avatar_url, location, rating, items_listed, items_swapped)"
        )
        .eq("id", conv_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = resp.data

    if conv["user1_id"] != uid and conv["user2_id"] != uid:
        raise HTTPException(status_code=403, detail="Not a participant")

    # Mark messages as read — reset my unread counter
    my_unread_field = "unread_user1" if conv["user1_id"] == uid else "unread_user2"
    supabase.table("conversations").update({my_unread_field: 0}).eq("id", conv_id).execute()

    other = conv["user2"] if conv["user1_id"] == uid else conv["user1"]
    return {**conv, "other_user": other}


@router.get("/{conv_id}/messages")
def get_messages(
    conv_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(40, le=100),
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    """Paginated message history for a conversation."""
    uid = current_user.id

    # Verify participant
    conv_resp = supabase.table("conversations").select("user1_id, user2_id").eq("id", conv_id).single().execute()
    if not conv_resp.data:
        raise HTTPException(status_code=404)
    conv = conv_resp.data
    if conv["user1_id"] != uid and conv["user2_id"] != uid:
        raise HTTPException(status_code=403)

    offset = (page - 1) * page_size
    msg_resp = (
        supabase.table("messages")
        .select("*, sender:sender_id(id, full_name, username, avatar_url)")
        .eq("conversation_id", conv_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    messages = msg_resp.data or []

    # Mark unread messages from other user as read
    try:
        supabase.table("messages").update({"read_at": "now()"}).eq("conversation_id", conv_id).neq("sender_id", uid).is_("read_at", "null").execute()
        my_unread_field = "unread_user1" if conv["user1_id"] == uid else "unread_user2"
        supabase.table("conversations").update({my_unread_field: 0}).eq("id", conv_id).execute()
    except Exception:
        pass

    return {
        "messages": list(reversed(messages)),  # chronological order
        "page": page,
        "has_more": len(messages) == page_size,
    }


@router.post("/{conv_id}/messages")
def send_message(
    conv_id: str,
    payload: SendMessage,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    """Send a message (text, item_proposal, or system event)."""
    uid = current_user.id

    # Verify participant
    conv_resp = supabase.table("conversations").select("user1_id, user2_id, status").eq("id", conv_id).single().execute()
    if not conv_resp.data:
        raise HTTPException(status_code=404)
    conv = conv_resp.data
    if conv["user1_id"] != uid and conv["user2_id"] != uid:
        raise HTTPException(status_code=403)
    if conv["status"] in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot message a {conv['status']} conversation")

    row = {
        "conversation_id": conv_id,
        "sender_id": uid,
        "content": payload.content,
        "type": payload.type,
    }
    if payload.metadata:
        row["metadata"] = payload.metadata

    resp = supabase.table("messages").insert(row).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to send message")

    # Update conversation: bump last_message_at + increment recipient's unread counter
    try:
        recipient_id = conv["user2_id"] if conv["user1_id"] == uid else conv["user1_id"]
        recipient_unread_field = "unread_user1" if conv["user1_id"] == recipient_id else "unread_user2"
        conv_detail = supabase.table("conversations").select(recipient_unread_field).eq("id", conv_id).single().execute()
        current_unread = (conv_detail.data or {}).get(recipient_unread_field, 0) or 0
        supabase.table("conversations").update({
            "last_message_at": "now()",
            recipient_unread_field: current_unread + 1,
        }).eq("id", conv_id).execute()
    except Exception:
        pass  # Non-critical

    return resp.data[0]


@router.patch("/{conv_id}/status")
def update_deal_status(
    conv_id: str,
    payload: UpdateStatus,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    """Advance deal: agree | complete | cancel."""
    uid = current_user.id

    conv_resp = (
        supabase.table("conversations")
        .select("*")
        .eq("id", conv_id)
        .single()
        .execute()
    )
    if not conv_resp.data:
        raise HTTPException(status_code=404)
    conv = conv_resp.data
    if conv["user1_id"] != uid and conv["user2_id"] != uid:
        raise HTTPException(status_code=403)

    action = payload.action
    update: dict = {}
    system_msg: Optional[str] = None

    if action == "agree":
        agreed_by = list(conv.get("deal_agreed_by") or [])
        if uid in agreed_by:
            return {"status": conv["status"], "detail": "Already agreed"}
        agreed_by.append(uid)
        update["deal_agreed_by"] = agreed_by

        if len(agreed_by) >= 2:
            update["status"] = "deal_agreed"
            update["deal_agreed_at"] = "now()"
            system_msg = "🎉 Both parties agreed to the deal!"
        else:
            other_name = conv["user2_id"] if uid == conv["user1_id"] else conv["user1_id"]
            system_msg = "✅ You agreed to the deal. Waiting for the other party…"

    elif action == "complete":
        if conv["status"] not in ("deal_agreed",):
            raise HTTPException(status_code=400, detail="Deal must be agreed before completing")
        completed_by = list(conv.get("completed_by") or [])
        if uid in completed_by:
            return {"status": conv["status"], "detail": "Already marked"}
        completed_by.append(uid)
        update["completed_by"] = completed_by

        if len(completed_by) >= 2:
            update["status"] = "completed"
            update["completed_at"] = "now()"
            system_msg = "🎊 Swap completed! Both users confirmed the exchange."
            
            # --- Swap Side Effects (Bypass RLS) ---
            admin_client = get_supabase()
            try:
                # 1. Update the original item and any proposed items to 'swapped'
                items_to_swap = set([conv["item_id"]])
                proposals = admin_client.table("messages").select("metadata").eq("conversation_id", conv_id).eq("type", "item_proposal").execute()
                for p in (proposals.data or []):
                    pid = p.get("metadata", {}).get("item_id")
                    if pid:
                        items_to_swap.add(pid)
                
                for iid in items_to_swap:
                    admin_client.table("items").update({"status": "swapped"}).eq("id", iid).execute()

                # 2. Grant 200 eco_points to both users
                user1 = admin_client.table("profiles").select("eco_points").eq("id", conv["user1_id"]).single().execute()
                user2 = admin_client.table("profiles").select("eco_points").eq("id", conv["user2_id"]).single().execute()

                p1 = (user1.data.get("eco_points") or 0) + 200 if user1.data else 200
                p2 = (user2.data.get("eco_points") or 0) + 200 if user2.data else 200

                admin_client.table("profiles").update({"eco_points": p1}).eq("id", conv["user1_id"]).execute()
                admin_client.table("profiles").update({"eco_points": p2}).eq("id", conv["user2_id"]).execute()
            except Exception as e:
                print(f"Error processing swap side-effects {conv_id}: {e}")

        else:
            system_msg = "✅ You marked this swap as complete. Waiting for the other party to confirm…"

    elif action == "cancel":
        if conv["status"] == "completed":
            raise HTTPException(status_code=400, detail="Cannot cancel a completed swap")
        update["status"] = "cancelled"
        update["cancelled_by"] = uid
        update["cancelled_at"] = "now()"
        system_msg = "❌ This deal was cancelled."
    else:
        raise HTTPException(status_code=400, detail="action must be agree | complete | cancel")

    # Apply update
    supabase.table("conversations").update(update).eq("id", conv_id).execute()

    # Insert system message
    if system_msg:
        try:
            supabase.table("messages").insert({
                "conversation_id": conv_id,
                "sender_id": uid,
                "content": system_msg,
                "type": "system",
            }).execute()
        except Exception:
            pass

    return {**conv, **update}


@router.get("/{conv_id}/wardrobe/{user_id}")
def get_user_wardrobe(
    conv_id: str,
    user_id: str,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Fetch available items from either participant (for in-chat wardrobe browsing)."""
    uid = current_user.id

    # Verify this user is a participant of the conversation
    conv_resp = supabase.table("conversations").select("user1_id, user2_id").eq("id", conv_id).single().execute()
    if not conv_resp.data:
        raise HTTPException(status_code=404)
    conv = conv_resp.data
    if conv["user1_id"] != uid and conv["user2_id"] != uid:
        raise HTTPException(status_code=403)
    if user_id not in (conv["user1_id"], conv["user2_id"]):
        raise HTTPException(status_code=403, detail="User is not a participant")

    resp = (
        supabase.table("items")
        .select("id, title, brand, size, condition, color, category, images, status")
        .eq("owner_id", user_id)
        .eq("status", "available")
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []
