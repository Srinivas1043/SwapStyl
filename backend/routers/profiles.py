from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from dependencies import get_supabase, get_current_user, get_authenticated_client

router = APIRouter(prefix="/profiles", tags=["profiles"])

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    avatar_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    preferences: Optional[Dict[str, Any]] = None
    onboarding_completed_at: Optional[str] = None   # ISO-8601 string

@router.get("/me")
def get_my_profile(current_user = Depends(get_current_user), supabase = Depends(get_supabase)):
    response = supabase.table("profiles").select("*").eq("id", current_user.id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    profile = response.data
    
    # Calculate live stats
    # 1. Items listed (including pending_review and available and swapped)
    items_count_resp = supabase.table("items").select("id", count="exact").eq("owner_id", current_user.id).execute()
    profile["items_listed"] = items_count_resp.count if items_count_resp.count is not None else 0
    
    # 2. Items swapped
    swapped_count_resp = supabase.table("items").select("id", count="exact").eq("owner_id", current_user.id).eq("status", "swapped").execute()
    profile["items_swapped"] = swapped_count_resp.count if swapped_count_resp.count is not None else 0
    
    # 3. Wishlist count
    wishlist_count_resp = supabase.table("wishlists").select("id", count="exact").eq("user_id", current_user.id).execute()
    profile["wishlist_count"] = wishlist_count_resp.count if wishlist_count_resp.count is not None else 0

    # 4. Average Rating
    reviews_resp = supabase.table("reviews").select("rating").eq("reviewee_id", current_user.id).execute()
    if reviews_resp.data:
        ratings = [r["rating"] for r in reviews_resp.data]
        profile["rating"] = round(sum(ratings) / len(ratings), 1)
    else:
        profile["rating"] = 0.0

    # 5. Eco points (read from DB — updated on swap completion)
    profile["eco_points"] = profile.get("eco_points") or 0

    return profile

@router.get("/{user_id}")
def get_user_profile(user_id: str, supabase = Depends(get_supabase)):
    """Get a public user profile (limited info for matched users)."""
    response = supabase.table("profiles").select("id, full_name, username, avatar_url, location, latitude, longitude, eco_points, created_at").eq("id", user_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile = response.data
    
    # 1. Items swapped
    swapped_count_resp = supabase.table("items").select("id", count="exact").eq("owner_id", user_id).eq("status", "swapped").execute()
    profile["items_swapped"] = swapped_count_resp.count if swapped_count_resp.count is not None else 0
    
    # 2. Average Rating
    reviews_resp = supabase.table("reviews").select("rating").eq("reviewee_id", user_id).execute()
    if reviews_resp.data:
        ratings = [r["rating"] for r in reviews_resp.data]
        profile["rating"] = round(sum(ratings) / len(ratings), 1)
    else:
        profile["rating"] = 0.0

    # 3. Eco points
    profile["eco_points"] = profile.get("eco_points") or 0

    return profile

@router.put("/me")
def update_my_profile(
    profile: ProfileUpdate,
    current_user = Depends(get_current_user),
    supabase = Depends(get_authenticated_client)
):
    update_data = {k: v for k, v in profile.dict().items() if v is not None}

    if not update_data:
        return {"message": "No data to update"}

    # id is required for upsert (creates row if first time)
    update_data["id"] = current_user.id

    # supabase-py upsert returns data without explicitly chaining .select() in this version
    response = supabase.table("profiles").upsert(update_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Profile update failed")

    return response.data[0]

@router.patch("/me")
def patch_my_profile(
    profile: ProfileUpdate,
    current_user = Depends(get_current_user),
    supabase = Depends(get_authenticated_client)
):
    """Partial update — only sends non-null fields."""
    update_data = {k: v for k, v in profile.dict().items() if v is not None}

    if not update_data:
        return {"message": "No data to update"}

    response = (
        supabase.table("profiles")
        .update(update_data)
        .eq("id", current_user.id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return response.data[0]
