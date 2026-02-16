from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from dependencies import get_supabase, get_current_user, get_authenticated_client

router = APIRouter(prefix="/profiles", tags=["profiles"])

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

@router.get("/me")
def get_my_profile(current_user = Depends(get_current_user), supabase = Depends(get_supabase)):
    response = supabase.table("profiles").select("*").eq("id", current_user.id).single().execute()
    return response.data

@router.put("/me")
def update_my_profile(profile: ProfileUpdate, current_user = Depends(get_current_user), supabase = Depends(get_authenticated_client)):
    update_data = {k: v for k, v in profile.dict().items() if v is not None}
    
    if not update_data:
        return {"message": "No data to update"}

    # Use upsert to create profile if it doesn't exist (e.g. first time login)
    # id is required for upsert
    update_data['id'] = current_user.id
    response = supabase.table("profiles").upsert(update_data).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found or update failed")
        
    return response.data[0]
