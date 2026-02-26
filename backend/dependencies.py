import os
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import Header, HTTPException, Depends

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
anon_key: str = os.environ.get("SUPABASE_KEY")
_raw_service_key: str = os.environ.get("SUPABASE_SERVICE_KEY", "")
# Fall back to anon key if service key is missing or still contains the placeholder
service_key: str = _raw_service_key if (_raw_service_key and not _raw_service_key.startswith("PASTE_")) else anon_key


# Service-role client — bypasses RLS entirely.
# The backend validates users via JWT in Python (get_current_user),
# so RLS is not needed at the DB level.
_service_client: Client = None

def _get_service_client() -> Client:
    global _service_client
    if _service_client is None:
        if not url or not service_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        _service_client = create_client(url, service_key)
    return _service_client


async def get_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authentication header format")
    return authorization.split(" ")[1]


def get_supabase() -> Client:
    """Service-role client — bypasses RLS."""
    return _get_service_client()


def get_authenticated_client(token: str = Depends(get_token)) -> Client:
    import httpx
    # Create a fresh client instance per request
    client = create_client(url, anon_key)
    # Build a fresh httpx session with the user's JWT baked into default headers.
    # This guarantees auth.uid() resolves correctly in Supabase RLS.
    authed_session = httpx.Client(
        base_url=client.postgrest.session.base_url,
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": anon_key,
        },
        timeout=10,
    )
    client.postgrest.session = authed_session
    return client


async def get_current_user(token: str = Depends(get_token)):
    """Validates the user JWT using the anon client."""
    try:
        auth_client = create_client(url, anon_key)
        user_response = auth_client.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")





