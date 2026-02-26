from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from dependencies import get_supabase, get_current_user, get_authenticated_client

router = APIRouter(prefix="/wishlists", tags=["wishlists"])


class WishlistAdd(BaseModel):
    item_id: str


@router.get("")
def get_my_wishlist(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    resp = (
        supabase.table("wishlists")
        .select("id, item_id, created_at, items(id, title, brand, size, color, condition, category, images, owner_id)")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


@router.post("")
def add_to_wishlist(
    payload: WishlistAdd,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    # Upsert to handle duplicate saves gracefully
    resp = supabase.table("wishlists").upsert({
        "user_id": current_user.id,
        "item_id": payload.item_id,
    }, on_conflict="user_id,item_id").execute()

    # Increment wishlist_count on the user's profile
    # We use the service client here because the RPC function might not be exposed to the anon role
    from dependencies import get_supabase
    service_client = get_supabase()
    service_client.rpc("increment_wishlist_count", {"uid": current_user.id}).execute()

    return resp.data[0] if resp.data else {"saved": True}


@router.delete("/{item_id}")
def remove_from_wishlist(
    item_id: str,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    supabase.table("wishlists").delete().eq("user_id", current_user.id).eq("item_id", item_id).execute()

    # Decrement wishlist_count (floor at 0)
    from dependencies import get_supabase
    service_client = get_supabase()
    service_client.rpc("decrement_wishlist_count", {"uid": current_user.id}).execute()

    return {"removed": True}


@router.get("/check/{item_id}")
def check_wishlist(
    item_id: str,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    resp = (
        supabase.table("wishlists")
        .select("id")
        .eq("user_id", current_user.id)
        .eq("item_id", item_id)
        .execute()
    )
    return {"saved": bool(resp.data)}
