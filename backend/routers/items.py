from fastapi import APIRouter, Depends, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List
from dependencies import get_supabase, get_current_user, get_authenticated_client
import math

router = APIRouter(prefix="/items", tags=["items"])


class ItemCreate(BaseModel):
    title: str
    brand: str
    category: str
    gender: Optional[str] = None
    condition: str
    color: Optional[str] = None
    size: Optional[str] = None
    description: Optional[str] = None
    estimated_value: Optional[float] = None
    images: List[str] = []       # public URLs
    ai_score: Optional[float] = None


class ItemPatch(BaseModel):
    title: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    gender: Optional[str] = None
    condition: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None   # 'available' | 'pending_review'


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    """Distance in km between two lat/lon points."""
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("/feed")
def get_feed(
    category: Optional[str] = Query(None),
    gender:   Optional[str] = Query(None),
    size:     Optional[str] = Query(None),
    color:    Optional[str] = Query(None),
    brand:    Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    sort:     str = Query("newest"),
    lat:      Optional[float] = Query(None),
    lng:      Optional[float] = Query(None),
    radius_km: Optional[float] = Query(None),
    page:     int = Query(1, ge=1),
    page_size: int = Query(20, le=50),
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),   # authenticated — needed for RLS on swipes
    public_supabase=Depends(get_supabase),         # anon — for reading public items
):
    # 1. Get already-seen item IDs (use authenticated client — RLS requires auth.uid())
    try:
        seen_resp = supabase.table("swipes").select("item_id").eq("swiper_id", current_user.id).execute()
        seen_ids = [r["item_id"] for r in (seen_resp.data or [])]
    except Exception:
        seen_ids = []

    # 2. Build base query — join with profiles (use public client for items)
    query = (
        public_supabase.table("items")
        .select("*, profiles:owner_id(id, full_name, username, avatar_url, location, latitude, longitude)")
        .eq("status", "available")
        .neq("owner_id", current_user.id)
    )

    # 3. Apply filters
    if category:
        query = query.ilike("category", f"%{category}%")
    if gender:
        query = query.ilike("gender", f"%{gender}%") if hasattr(query, 'ilike') else query
    if size:
        query = query.ilike("size", f"%{size}%")
    if color:
        query = query.ilike("color", f"%{color}%")
    if brand:
        query = query.ilike("brand", f"%{brand}%")
    if condition:
        query = query.ilike("condition", f"%{condition}%")

    # 4. Sort
    query = query.order("created_at", desc=(sort == "newest"))

    # 5. Fetch all (we filter by seen + radius in Python for simplicity)
    resp = query.execute()
    all_items = resp.data or []

    # 6. Exclude seen
    result = [item for item in all_items if item["id"] not in seen_ids]

    # 7. Radius filter (if lat/lng + radius provided)
    if lat is not None and lng is not None and radius_km is not None:
        filtered = []
        for item in result:
            owner = item.get("profiles") or {}
            o_lat = owner.get("latitude")
            o_lng = owner.get("longitude")
            if o_lat is not None and o_lng is not None:
                dist = haversine_km(lat, lng, o_lat, o_lng)
                if dist <= radius_km:
                    item["_distance_km"] = round(dist, 1)
                    filtered.append(item)
            else:
                # No location data — include anyway
                filtered.append(item)
        result = filtered

    # 8. Paginate
    total = len(result)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = result[start:end]

    return {
        "items": page_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": end < total,
    }


@router.post("")
def create_item(
    payload: ItemCreate,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    ai_score = payload.ai_score or 0
    status = "available" if ai_score >= 85 else "pending_review"

    # Core columns — always present in the original schema
    row = {
        "owner_id": current_user.id,
        "title": payload.title,
        "brand": payload.brand,
        "category": payload.category,
        "condition": payload.condition,
        "color": payload.color,
        "size": payload.size,
        "description": payload.description,
        "images": payload.images,
        "ai_verified": ai_score >= 85,
        "status": status,
    }

    # Optional columns — only include if you've run the ALTER TABLE migrations
    # ALTER TABLE public.items ADD COLUMN IF NOT EXISTS gender text;
    # ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_score numeric(5,2) default 0;
    if payload.gender is not None:
        row["gender"] = payload.gender
    if ai_score is not None:
        row["ai_score"] = ai_score

    resp = supabase.table("items").insert(row).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create item")

    # Increment items_listed on profile (non-critical)
    try:
        profile = supabase.table("profiles").select("items_listed").eq("id", current_user.id).single().execute()
        current_count = (profile.data or {}).get("items_listed", 0) or 0
        supabase.table("profiles").update({"items_listed": current_count + 1}).eq("id", current_user.id).execute()
    except Exception:
        pass

    return {"item": resp.data[0], "status": status, "ai_score": ai_score}


@router.get("/my")
def get_my_items(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    resp = (
        supabase.table("items")
        .select("*")
        .eq("owner_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


@router.get("/{item_id}")
def get_item(
    item_id: str,
    supabase=Depends(get_supabase),
):
    resp = (
        supabase.table("items")
        .select("*, profiles:owner_id(id, full_name, username, avatar_url, location, rating)")
        .eq("id", item_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return resp.data


@router.post("/{item_id}/re-verify")
async def re_verify_item(
    item_id: str,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    """Re-run AI verification on a pending_review item and publish if ≥85% confident."""
    # Fetch the item
    item_resp = supabase.table("items").select("*").eq("id", item_id).single().execute()
    if not item_resp.data:
        raise HTTPException(status_code=404, detail="Item not found")
    item = item_resp.data
    if item["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not your item")

    images = item.get("images") or []
    brand = item.get("brand", "")
    category = item.get("category", "")

    if not images:
        raise HTTPException(status_code=422, detail="No images to verify")

    # Call the verify endpoint logic directly
    from routers.verify import _call_openai_sync
    import asyncio, httpx

    # Download brand-tag photo (index 1 preferred)
    image_url = images[1] if len(images) > 1 else images[0]
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            img_resp = await client.get(image_url)
            img_resp.raise_for_status()
            image_bytes = img_resp.content
            mime_type = img_resp.headers.get("content-type", "image/jpeg").split(";")[0]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not fetch image: {e}")

    result = await asyncio.to_thread(_call_openai_sync, image_bytes, mime_type, brand, category)
    confidence = result["confidence"]
    new_status = "available" if confidence >= 85 else "pending_review"

    update_data: dict = {"ai_verified": confidence >= 85, "status": new_status}
    try:
        update_data["ai_score"] = confidence
    except Exception:
        pass

    supabase.table("items").update(update_data).eq("id", item_id).execute()

    return {
        "ai_score": confidence,
        "verified": confidence >= 85,
        "status": new_status,
        "reason": result.get("reason", ""),
    }


@router.patch("/{item_id}")
def update_item(
    item_id: str,
    payload: ItemPatch,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    """Allow owner to update fields (e.g. status=available to publish manually)."""
    item_resp = supabase.table("items").select("owner_id").eq("id", item_id).single().execute()
    if not item_resp.data:
        raise HTTPException(status_code=404, detail="Item not found")
    if item_resp.data["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not your item")

    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    resp = supabase.table("items").update(update_data).eq("id", item_id).execute()
    return resp.data[0] if resp.data else {"updated": True}


@router.delete("/{item_id}")
def delete_item(
    item_id: str,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    item_resp = supabase.table("items").select("owner_id").eq("id", item_id).single().execute()
    if not item_resp.data:
        raise HTTPException(status_code=404, detail="Item not found")
    if item_resp.data["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not your item")

    supabase.table("items").delete().eq("id", item_id).execute()
    return {"deleted": True}

@router.get("/user/{user_id}")
def get_user_wardrobe(
    user_id: str,
    public_supabase=Depends(get_supabase),
):
    """Get a user's wardrobe (available items only for matched users)."""
    resp = public_supabase.table("items").select("*").eq("owner_id", user_id).eq("status", "available").execute()
    return {"items": resp.data or []}
