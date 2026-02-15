from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from dependencies import get_supabase

router = APIRouter(prefix="/deals", tags=["deals"])

class DealUpdate(BaseModel):
    deal_id: str
    status: str # 'confirmed', 'declined', 'completed'

@router.put("/{deal_id}")
def update_deal(deal_id: str, deal: DealUpdate, supabase = Depends(get_supabase)):
    response = supabase.table("deals").update({"status": deal.status}).eq("id", deal_id).execute()
    return response.data
