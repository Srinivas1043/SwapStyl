from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from dependencies import get_supabase, get_current_user, get_authenticated_client

router = APIRouter(prefix="/admin", tags=["admin"])


class ModerateItemPayload(BaseModel):
    action: str  # "approve" | "reject"
    reason: Optional[str] = None


class ReportPayload(BaseModel):
    reported_type: str  # "item" | "user"
    reported_item_id: Optional[str] = None
    reported_user_id: Optional[str] = None
    reason: str
    description: Optional[str] = None


class ResolveReportPayload(BaseModel):
    status: str  # "resolved" | "dismissed"
    action_taken: Optional[str] = None


class SuspendUserPayload(BaseModel):
    reason: str



# ── Middleware: Check if user is admin ──
def check_admin(current_user=Depends(get_current_user), supabase=Depends(get_supabase)):
    """Verify user is admin."""
    resp = supabase.table("profiles").select("role").eq("id", current_user.id).single().execute()
    user = resp.data
    if not user or user.get("role") not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ──────────────────────────────────────────────────────────────────────────────
# ADMIN USER MANAGEMENT
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/users/admins")
def list_admin_users(
    current_user=Depends(check_admin),
    supabase=Depends(get_supabase),
):
    """List all admin and moderator users."""
    try:
        response = supabase.table("profiles").select(
            "id, email, role, created_at"
        ).in_("role", ["admin", "moderator"]).execute()
        
        return {
            "users": response.data or []
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching admin users: {str(e)}")


@router.post("/users/{user_id}/set-role")
def set_user_role(
    user_id: str,
    role: Optional[str] = None,
    current_user=Depends(check_admin),
    supabase=Depends(get_supabase),
):
    """Set admin or moderator role for a user."""
    try:
        # Update role
        supabase.table("profiles").update({
            "role": role
        }).eq("id", user_id).execute()
        
        # Log this action
        supabase.table("moderation_log").insert({
            "moderator_id": current_user.id,
            "action_type": "user_role_changed",
            "target": f"user:{user_id}",
            "reason": f"Role set to: {role}",
            "timestamp": datetime.utcnow().isoformat()
        }).execute()
        
        return {"success": True, "message": f"User role set to {role}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting user role: {str(e)}")






@router.get("/dashboard")
def get_dashboard(
    current_user=Depends(check_admin),
    supabase=Depends(get_supabase),
):
    """Get admin dashboard stats."""
    # Pending reviews
    pending = supabase.table("items").select("id", count="exact").eq("moderation_status", "pending_review").execute()
    pending_count = pending.count or 0

    # Open reports
    reports = supabase.table("reports").select("id", count="exact").eq("status", "open").execute()
    reports_count = reports.count or 0

    # Suspended users (count where suspended_at IS NOT NULL)
    try:
        # Use is notation for NULL checks in PostgREST
        suspended = supabase.table("profiles").select("id", count="exact").filter("suspended_at", "is", "not null").execute()
        suspended_count = suspended.count or 0
    except:
        suspended_count = 0

    # Total items (count where deleted_at IS NULL)
    try:
        # Count active items (not deleted)
        items = supabase.table("items").select("id", count="exact").filter("deleted_at", "is", "null").execute()
        total_items = items.count or 0
    except:
        total_items = 0

    # Total users
    users = supabase.table("profiles").select("id", count="exact").execute()
    total_users = users.count or 0

    return {
        "pending_reviews": pending_count,
        "open_reports": reports_count,
        "suspended_users": suspended_count,
        "total_items": total_items,
        "total_users": total_users,
    }


# ──────────────────────────────────────────────────────────────────────────────
# PRODUCT MODERATION
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/items/pending")
def get_pending_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    current_user=Depends(check_admin),
    supabase=Depends(get_supabase),
):
    """Get items pending manual review (ai_score < 75%)."""
    offset = (page - 1) * page_size
    resp = (
        supabase.table("items")
        .select("*, owner:owner_id(id, full_name, username, avatar_url)")
        .eq("moderation_status", "pending_review")
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    items = resp.data or []
    
    # Get total count
    count_resp = supabase.table("items").select("id", count="exact").eq("moderation_status", "pending_review").execute()
    total = count_resp.count or 0

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "has_more": offset + page_size < total,
    }


@router.post("/items/{item_id}/moderate")
def moderate_item(
    item_id: str,
    payload: ModerateItemPayload,
    current_user=Depends(check_admin),
    supabase=Depends(get_authenticated_client),
):
    """Approve or reject a pending item."""
    if payload.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Invalid action")

    # Get item
    item_resp = supabase.table("items").select("*").eq("id", item_id).single().execute()
    if not item_resp.data:
        raise HTTPException(status_code=404, detail="Item not found")

    item = item_resp.data
    if item["moderation_status"] != "pending_review":
        raise HTTPException(status_code=400, detail="Item not pending review")

    # Update item
    new_status = "approved" if payload.action == "approve" else "rejected"
    update_data = {
        "moderation_status": new_status,
        "reviewed_by": current_user.id,
        "reviewed_at": "now()",
    }
    if payload.reason:
        update_data["moderation_reason"] = payload.reason

    supabase.table("items").update(update_data).eq("id", item_id).execute()

    # Log action
    supabase.table("moderation_log").insert({
        "moderator_id": current_user.id,
        "action_type": payload.action,
        "target_type": "item",
        "target_id": item_id,
        "reason": payload.reason,
    }).execute()

    return {"success": True, "status": new_status}


# ──────────────────────────────────────────────────────────────────────────────
# PRODUCT DELETION (with cascading)
# ──────────────────────────────────────────────────────────────────────────────

@router.delete("/items/{item_id}")
def delete_item_admin(
    item_id: str,
    reason: Optional[str] = Query(None),
    current_user=Depends(check_admin),
    supabase=Depends(get_authenticated_client),
):
    """Delete an item with cascading deletions."""
    # Get item
    item_resp = supabase.table("items").select("*").eq("id", item_id).single().execute()
    if not item_resp.data:
        raise HTTPException(status_code=404, detail="Item not found")

    # Soft delete: mark deleted_at instead of removing
    supabase.table("items").update({
        "deleted_at": "now()",
        "status": "deleted",
    }).eq("id", item_id).execute()

    # Cascade: Delete from wishlists
    supabase.table("wishlists").delete().eq("item_id", item_id).execute()

    # Cascade: Delete from swipes
    supabase.table("swipes").delete().eq("item_id", item_id).execute()

    # Cascade: Mark reviews as referencing deleted item (don't delete, keeps history)
    # Reviews stay but item_id is now orphaned - UI can handle "item deleted"

    # Log action
    supabase.table("moderation_log").insert({
        "moderator_id": current_user.id,
        "action_type": "delete",
        "target_type": "item",
        "target_id": item_id,
        "reason": reason or "Admin deletion",
    }).execute()

    return {"success": True, "item_id": item_id, "status": "deleted"}


# ──────────────────────────────────────────────────────────────────────────────
# REPORTING & FLAGGING
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/reports")
def create_report(
    payload: ReportPayload,
    current_user=Depends(get_current_user),
    supabase=Depends(get_authenticated_client),
):
    """User reports an item or another user."""
    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="Reason must be at least 5 characters")

    resp = supabase.table("reports").insert({
        "reporter_id": current_user.id,
        "reported_type": payload.reported_type,
        "reported_item_id": payload.reported_item_id,
        "reported_user_id": payload.reported_user_id,
        "reason": payload.reason,
        "description": payload.description,
    }).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create report")

    return {"report_id": resp.data[0]["id"], "status": "submitted"}


@router.get("/reports")
def get_reports(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    current_user=Depends(check_admin),
    supabase=Depends(get_supabase),
):
    """Get reports (admins only)."""
    offset = (page - 1) * page_size
    
    query = supabase.table("reports").select(
        "*, reporter:reporter_id(id, full_name, avatar_url), "
        "item:reported_item_id(id, title, images, owner_id), "
        "user:reported_user_id(id, full_name, avatar_url)"
    )
    
    if status:
        query = query.eq("status", status)
    
    resp = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
    reports = resp.data or []

    # Get total
    count_query = supabase.table("reports").select("id", count="exact")
    if status:
        count_query = count_query.eq("status", status)
    count = count_query.execute().count or 0

    return {
        "reports": reports,
        "page": page,
        "page_size": page_size,
        "total": count,
        "has_more": offset + page_size < count,
    }


@router.patch("/reports/{report_id}")
def resolve_report(
    report_id: str,
    payload: ResolveReportPayload,
    current_user=Depends(check_admin),
    supabase=Depends(get_authenticated_client),
):
    """Resolve a report."""
    if payload.status not in ("resolved", "dismissed"):
        raise HTTPException(status_code=400, detail="Invalid status")

    # Get report
    rep_resp = supabase.table("reports").select("*").eq("id", report_id).single().execute()
    if not rep_resp.data:
        raise HTTPException(status_code=404, detail="Report not found")

    report = rep_resp.data

    # Update report
    supabase.table("reports").update({
        "status": payload.status,
        "action_taken": payload.action_taken,
        "resolved_at": "now()",
        "resolved_by": current_user.id,
    }).eq("id", report_id).execute()

    # Log action
    supabase.table("moderation_log").insert({
        "moderator_id": current_user.id,
        "action_type": "flag_resolved",
        "target_type": "report",
        "target_id": report_id,
        "reason": payload.status,
    }).execute()

    return {"success": True, "status": payload.status}


# ──────────────────────────────────────────────────────────────────────────────
# USER MANAGEMENT
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/users/{user_id}/suspend")
def suspend_user(
    user_id: str,
    payload: SuspendUserPayload,
    current_user=Depends(check_admin),
    supabase=Depends(get_authenticated_client),
):
    """Suspend a user account."""
    supabase.table("profiles").update({
        "suspended_at": "now()",
        "suspension_reason": payload.reason,
    }).eq("id", user_id).execute()

    supabase.table("moderation_log").insert({
        "moderator_id": current_user.id,
        "action_type": "user_suspended",
        "target_type": "user",
        "target_id": user_id,
        "reason": payload.reason,
    }).execute()

    return {"success": True, "user_id": user_id, "status": "suspended"}


@router.post("/users/{user_id}/unsuspend")
def unsuspend_user(
    user_id: str,
    current_user=Depends(check_admin),
    supabase=Depends(get_authenticated_client),
):
    """Unsuspend a user account."""
    supabase.table("profiles").update({
        "suspended_at": None,
        "suspension_reason": None,
    }).eq("id", user_id).execute()

    return {"success": True, "user_id": user_id, "status": "active"}


@router.get("/users")
def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    suspended_only: bool = Query(False),
    current_user=Depends(check_admin),
    supabase=Depends(get_supabase),
):
    """Get users list."""
    offset = (page - 1) * page_size
    
    query = supabase.table("profiles").select("id, full_name, email, avatar_url, role, created_at, suspended_at, suspension_reason")
    
    if suspended_only:
        query = query.neq("suspended_at", None)
    
    resp = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
    users = resp.data or []

    # Get total
    count_resp = supabase.table("profiles").select("id", count="exact")
    if suspended_only:
        count_resp = count_resp.neq("suspended_at", None)
    count = count_resp.execute().count or 0

    return {
        "users": users,
        "page": page,
        "page_size": page_size,
        "total": count,
        "has_more": offset + page_size < count,
    }
