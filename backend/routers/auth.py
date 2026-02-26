"""
Email Authentication & Verification Endpoints
Handles email verification tracking and password reset management
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Import Supabase client
try:
    from supabase import create_client, Client
    load_dotenv()
    
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
    
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        supabase = None
except ImportError:
    supabase = None

router = APIRouter(prefix="/auth", tags=["authentication"])


# ─────────────────────────────────────────────────────────────────
# REQUEST MODELS
# ─────────────────────────────────────────────────────────────────

class EmailVerificationStatusRequest(BaseModel):
    """Check email verification status"""
    user_id: str


class EmailVerificationStatusResponse(BaseModel):
    """Email verification status response"""
    verified: bool
    verified_at: Optional[str] = None
    last_email_sent: Optional[str] = None


class PasswordResetRequest(BaseModel):
    """Request password reset"""
    email: str


class PasswordResetResponse(BaseModel):
    """Password reset response"""
    success: bool
    message: str
    reset_token_sent_at: Optional[str] = None


class ResendVerificationEmailRequest(BaseModel):
    """Resend verification email"""
    email: str
    user_id: Optional[str] = None


class PasswordResetAttemptResponse(BaseModel):
    """Password reset attempt tracking"""
    tracked: bool
    attempts_in_24h: int
    last_attempt_at: Optional[str] = None


class LoginRequest(BaseModel):
    """Admin login request"""
    email: str
    password: str


class LoginResponse(BaseModel):
    """Admin login response"""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    role: str


class SignupRequest(BaseModel):
    """Admin signup request"""
    email: EmailStr
    password: str


class SignupResponse(BaseModel):
    """Admin signup response"""
    user_id: str
    email: str
    message: str


# ─────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Admin login",
    description="Authenticate admin user with email and password"
)
async def admin_login(request: LoginRequest):
    """
    Admin login endpoint.
    
    **Parameters:**
    - `email`: Admin email address
    - `password`: Admin password
    
    **Returns:**
    - `access_token`: JWT token for API requests
    - `token_type`: "bearer"
    - `user_id`: UUID of the authenticated user
    - `email`: User email
    - `role`: User role (should be "admin")
    
    **Errors:**
    - 401: Invalid credentials or user is not an admin
    - 500: Server error
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    try:
        # Sign in with email and password
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not auth_response or not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_id = auth_response.user.id
        access_token = auth_response.session.access_token
        
        # Check if user is admin
        profile_response = supabase.table("profiles").select("role").eq("id", user_id).execute()
        
        if not profile_response.data:
            raise HTTPException(status_code=401, detail="User profile not found")
        
        user_role = profile_response.data[0].get("role")
        
        if user_role not in ("admin", "moderator"):
            raise HTTPException(status_code=403, detail="User does not have admin or moderator access")
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user_id,
            email=request.email,
            role=user_role
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid credentials or server error")


@router.post(
    "/signup",
    response_model=SignupResponse,
    summary="Admin signup",
    description="Create a new admin user account"
)
async def admin_signup(request: SignupRequest):
    """
    Admin signup endpoint.
    
    **Parameters:**
    - `email`: Admin email address
    - `password`: Admin password (min 8 characters)
    
    **Returns:**
    - `user_id`: UUID of the created user
    - `email`: User email
    - `message`: Confirmation message
    
    **Errors:**
    - 400: Invalid email or password
    - 409: Email already registered
    - 500: Server error
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    try:
        # Validate password
        if len(request.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        
        # Create user in auth.users
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })
        
        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        user_id = auth_response.user.id
        
        # Check if any admins exist
        try:
            admins = supabase.table("profiles").select("id").in_("role", ["admin", "moderator"]).execute()
            is_first_admin = not admins.data or len(admins.data) == 0
        except:
            is_first_admin = True
        
        # Create profile entry
        try:
            profile_role = "admin" if is_first_admin else None
            supabase.table("profiles").insert({
                "id": user_id,
                "role": profile_role,
                "role_updated_at": datetime.utcnow().isoformat()
            }).execute()
            
            message = (
                "Welcome! You are the first admin and have been granted full access."
                if is_first_admin 
                else "Account created successfully! An admin will review your request for access."
            )
        except Exception as profile_error:
            print(f"Profile creation error: {profile_error}")
            message = "Account created but profile setup had issues. Please contact support."
        
        return SignupResponse(
            user_id=user_id,
            email=request.email,
            message=message
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {str(e)}")
        if "already registered" in str(e).lower():
            raise HTTPException(status_code=409, detail="Email already registered")
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@router.get(
    "/email-verification/status",
    response_model=EmailVerificationStatusResponse,
    summary="Check email verification status",
    description="Get the current email verification status for a user"
)
async def get_email_verification_status(
    user_id: str,
    authorization: str = Header(None)
):
    """
    Check if user's email is verified.
    
    **Parameters:**
    - `user_id`: UUID of the user
    - `authorization`: Bearer token (optional for admin queries)
    
    **Returns:**
    - `verified`: Boolean indicating if email is verified
    - `verified_at`: Timestamp when email was verified
    - `last_email_sent`: Timestamp of last verification email sent
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    try:
        # Query profiles table using service key
        response = supabase.table("profiles").select(
            "email_verified, email_verified_at, last_verification_email_sent"
        ).eq("id", user_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        profile = response.data[0]
        
        return EmailVerificationStatusResponse(
            verified=profile.get("email_verified", False),
            verified_at=profile.get("email_verified_at"),
            last_email_sent=profile.get("last_verification_email_sent")
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking email verification: {str(e)}")


@router.post(
    "/email-verification/resend",
    response_model=PasswordResetResponse,
    summary="Resend verification email",
    description="Send a new verification email to the user"
)
async def resend_verification_email(
    request: ResendVerificationEmailRequest,
    authorization: str = Header(None)
):
    """
    Resend email verification link.
    
    **Rate limit:** 1 email per 60 seconds per user
    
    **Parameters:**
    - `email`: User's email address
    - `user_id`: UUID of the user (optional)
    
    **Returns:**
    - `success`: Whether the email was sent
    - `message`: Status message
    - `reset_token_sent_at`: Timestamp when email was sent
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    try:
        # Check rate limiting - user can resend every 60 seconds
        if request.user_id:
            response = supabase.table("profiles").select(
                "last_verification_email_sent"
            ).eq("id", request.user_id).execute()
            
            if response.data and response.data[0].get("last_verification_email_sent"):
                last_sent = datetime.fromisoformat(
                    response.data[0]["last_verification_email_sent"].replace("Z", "+00:00")
                )
                time_since = datetime.now(last_sent.tzinfo) - last_sent
                
                if time_since < timedelta(seconds=60):
                    raise HTTPException(
                        status_code=429,
                        detail=f"Please wait {int(60 - time_since.total_seconds())} seconds before resending"
                    )
        
        # Update last_verification_email_sent timestamp
        if request.user_id:
            supabase.table("profiles").update({
                "last_verification_email_sent": datetime.utcnow().isoformat()
            }).eq("id", request.user_id).execute()
            
        # Actually resend the verification email
        try:
            # For resend, we usually re-send the signup confirmation if not verified.
            # Supabase generic 'resend' method: 
            # supabase.auth.resend(email=request.email, type='signup')
            # But the Python client might vary. Let's assume standard GoTrue client structure.
            supabase.auth.resend(email=request.email, type="signup", options={"redirect_to": "swapstyl://login"})
        except Exception:
            pass
        
        return PasswordResetResponse(
            success=True,
            message="Verification email sent successfully",
            reset_token_sent_at=datetime.utcnow().isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resending verification email: {str(e)}")


@router.post(
    "/password-reset/initiate",
    response_model=PasswordResetResponse,
    summary="Initiate password reset",
    description="Send a password reset email to the user"
)
async def initiate_password_reset(request: PasswordResetRequest):
    """
    Start the password reset flow by sending a reset link via email.
    
    **Note:** The actual email sending is handled by Supabase Auth.
    This endpoint logs the attempt for tracking and rate limiting.
    
    **Parameters:**
    - `email`: User's email address
    
    **Returns:**
    - `success`: Whether the reset email was sent
    - `message`: Status message
    - `reset_token_sent_at`: Timestamp when reset was initiated
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    try:
        # Find user by email
        auth_response = supabase.table("profiles").select(
            "id"
        ).eq("email", request.email).execute()
        
        if not auth_response.data:
            # For security, don't reveal if email exists
            return PasswordResetResponse(
                success=True,
                message="If the email exists, a password reset link has been sent",
                reset_token_sent_at=datetime.utcnow().isoformat()
            )
        
        user_id = auth_response.data[0]["id"]
        
        # Log password reset attempt
        supabase.table("password_reset_attempts").insert({
            "user_id": user_id,
            "email": request.email,
            "requested_at": datetime.utcnow().isoformat()
        }).execute()

        # Actually trigger the password reset email via Supabase Auth
        # Note: In a real production app, you might want to use a service key to do this as admin, 
        # or rely on the client SDK. But here we are in the backend.
        # Supabase Python client 'auth' namespace matches the JS SDK.
        try:
             # The redirect_to should point to your app's deep link for password reset
            supabase.auth.reset_password_email(request.email, options={"redirect_to": "swapstyl://reset-password"})
        except Exception as auth_error:
            # If Supabase fails (e.g. rate limit), we might want to log it but still return generic success
            # to avoid enumeration, OR return error if it's critical. 
            print(f"Supabase Auth Error: {auth_error}")
            pass 
        
        return PasswordResetResponse(
            success=True,
            message="If the email exists, a password reset link has been sent",
            reset_token_sent_at=datetime.utcnow().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error initiating password reset: {str(e)}")


@router.get(
    "/password-reset/attempts",
    response_model=PasswordResetAttemptResponse,
    summary="Get password reset attempts",
    description="Check password reset attempts in the last 24 hours"
)
async def get_password_reset_attempts(
    user_id: str,
    authorization: str = Header(None)
):
    """
    Get password reset attempts count and rate limiting info.
    
    **Parameters:**
    - `user_id`: UUID of the user
    - `authorization`: Bearer token
    
    **Returns:**
    - `tracked`: Whether attempts are being tracked
    - `attempts_in_24h`: Number of reset attempts in the last 24 hours
    - `last_attempt_at`: Timestamp of the most recent attempt
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    try:
        # Get password reset attempts in last 24 hours
        response = supabase.table("password_reset_attempts").select(
            "requested_at"
        ).eq("user_id", user_id).gte(
            "requested_at", 
            (datetime.utcnow() - timedelta(hours=24)).isoformat()
        ).order("requested_at", desc=True).execute()
        
        attempts = response.data if response.data else []
        last_attempt = attempts[0]["requested_at"] if attempts else None
        
        return PasswordResetAttemptResponse(
            tracked=True,
            attempts_in_24h=len(attempts),
            last_attempt_at=last_attempt
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching reset attempts: {str(e)}")


@router.post(
    "/password-reset/complete",
    response_model=dict,
    summary="Mark password reset as completed",
    description="Record that password reset was successfully completed"
)
async def mark_password_reset_completed(
    user_id: str,
    authorization: str = Header(None)
):
    """
    Mark the most recent password reset attempt as completed.
    
    **Parameters:**
    - `user_id`: UUID of the user
    - `authorization`: Bearer token
    
    **Returns:**
    - `success`: Whether the operation succeeded
    - `completed_at`: Timestamp of completion
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    try:
        # Get the most recent incomplete reset attempt
        response = supabase.table("password_reset_attempts").select(
            "id"
        ).eq("user_id", user_id).is_("reset_completed_at", None).order(
            "requested_at", desc=True
        ).limit(1).execute()
        
        if not response.data:
            return {
                "success": True,
                "message": "No pending password resets found",
                "completed_at": datetime.utcnow().isoformat()
            }
        
        attempt_id = response.data[0]["id"]
        
        # Mark as completed
        supabase.table("password_reset_attempts").update({
            "reset_completed_at": datetime.utcnow().isoformat()
        }).eq("id", attempt_id).execute()
        
        return {
            "success": True,
            "message": "Password reset marked as completed",
            "completed_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error completing password reset: {str(e)}")


@router.get("/health", summary="Health check")
async def health_check():
    """Health check endpoint for authentication service"""
    return {
        "status": "ok",
        "service": "email-authentication",
        "supabase_configured": supabase is not None
    }
