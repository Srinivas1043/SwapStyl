import os
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import Header, HTTPException, Depends

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

def get_supabase() -> Client:
    if not url or not key:
        raise ValueError("Supabase URL and Key must be set in .env")
    return create_client(url, key)

async def get_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authentication header format")
    return authorization.split(" ")[1]

async def get_current_user(token: str = Depends(get_token), supabase: Client = Depends(get_supabase)):
    # Verify token with Supabase
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
             raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def get_authenticated_client(token: str = Depends(get_token)) -> Client:
    client = create_client(url, key)
    client.postgrest.auth(token)
    return client
