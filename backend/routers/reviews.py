from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from dependencies import get_supabase, get_current_user, get_authenticated_client

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewCreate(BaseModel):
    reviewee_id: str
    conversation_id: str
    rating: int
    comment: Optional[str] = None


@router.post("")
def create_review(
    payload: ReviewCreate,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """Leave a review for a user, granted the conversation is completed."""
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    uid = current_user.id

    # Verify conversation is completed and user is part of it
    conv_resp = supabase.table("conversations").select("user1_id, user2_id, status").eq("id", payload.conversation_id).single().execute()
    if not conv_resp.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conv = conv_resp.data
    if conv["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed swaps")
    if uid not in (conv["user1_id"], conv["user2_id"]):
        raise HTTPException(status_code=403, detail="Not participants")
    if payload.reviewee_id not in (conv["user1_id"], conv["user2_id"]) or payload.reviewee_id == uid:
        raise HTTPException(status_code=400, detail="Invalid reviewee")

    # Insert review using admin client (bypassing RLS) since we validated the user in Python
    admin_client = get_supabase()
    resp = admin_client.table("reviews").insert({
        "reviewer_id": uid,
        "reviewee_id": payload.reviewee_id,
        "conversation_id": payload.conversation_id,
        "rating": payload.rating,
        "comment": payload.comment
    }).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save review")

    # Add 100 points for a 5-star review (bypass RLS)
    if payload.rating == 5:
        try:
            admin_client = get_supabase()
            profile_resp = admin_client.table("profiles").select("points").eq("id", payload.reviewee_id).single().execute()
            if profile_resp.data:
                current_points = profile_resp.data.get("points") or 0
                admin_client.table("profiles").update({"points": current_points + 100}).eq("id", payload.reviewee_id).execute()
        except Exception as e:
            print("Failed to add points for 5-star review:", e)

    return resp.data[0]


@router.get("/{user_id}")
def get_user_reviews(
    user_id: str,
    limit: int = 50,
    supabase=Depends(get_supabase) # Anyone can read
):
    """Get all reviews written about a specific user."""
    resp = (
        supabase.table("reviews")
        .select("*, reviewer:reviewer_id(id, full_name, avatar_url, username)")
        .eq("reviewee_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    
    # Calculate average
    reviews = resp.data or []
    average = sum([r["rating"] for r in reviews]) / len(reviews) if reviews else 0.0
    
    return {
        "reviews": reviews,
        "average_rating": round(average, 1),
        "total_count": len(reviews)
    }
