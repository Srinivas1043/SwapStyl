from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dependencies import get_supabase

router = APIRouter(prefix="/items", tags=["items"])

class ItemCreate(BaseModel):
    title: str
    brand: str
    category: str
    condition: str
    size: str
    color: str
    images: List[str]
    owner_id: str

@router.get("/")
def get_items(supabase = Depends(get_supabase)):
    # Logic to get items not swiped by current user
    # For now, return all
    response = supabase.table("items").select("*").execute()
    return response.data

@router.post("/")
def create_item(item: ItemCreate, supabase = Depends(get_supabase)):
    response = supabase.table("items").insert(item.dict()).execute()
    return response.data
