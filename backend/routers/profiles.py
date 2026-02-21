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
    preferences: Optional[Dict[str, Any]] = None
    onboarding_completed_at: Optional[str] = None   # ISO-8601 string

@router.get("/me")
def get_my_profile(current_user = Depends(get_current_user), supabase = Depends(get_supabase)):
    response = supabase.table("profiles").select("*").eq("id", current_user.id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return response.data

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
