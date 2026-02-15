from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from dependencies import get_supabase

router = APIRouter(prefix="/swipes", tags=["swipes"])

class SwipeCreate(BaseModel):
    swiper_id: str
    item_id: str
    direction: str # 'right' or 'left'

@router.post("/")
def create_swipe(swipe: SwipeCreate, supabase = Depends(get_supabase)):
    # Record swipe
    response = supabase.table("swipes").insert(swipe.dict()).execute()
    
    # Check for match (Mutual Right Swipe)
    if swipe.direction == 'right':
        # Get item owner
        item_response = supabase.table("items").select("owner_id").eq("id", swipe.item_id).single().execute()
        item_owner_id = item_response.data.get("owner_id")
        
        # Check if owner swiped right on any of swiper's items?
        # 1-1 Swap Logic: 
        # Did item_owner swipe right on ANY item owned by swiper_id?
        # OR is there a specific item-to-item match?
        # "The other user can choose any item from the person who swiped right"
        # So if A swipes right on B's item X.
        # B gets notified. B looks at A's wardrobe. B swipes right on A's item Y.
        # MATCH!
        
        # Check if inverse swipe exists
        # Find swipes where swiper_id = item_owner AND direction = 'right'
        # AND item_id belongs to current swiper.
        
        # This is complex query. For MVP, let's just record swipe.
        pass

    return response.data
