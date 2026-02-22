import os
import json
import re
import asyncio
import httpx
import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Configure the SDK once at startup
try:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    _SDK_AVAILABLE = True
except ImportError:
    _SDK_AVAILABLE = False

router = APIRouter(prefix="/verify", tags=["verify"])


class VerifyRequest(BaseModel):
    brand: str
    image_urls: List[str]


def _call_openai_sync(image_bytes: bytes, mime_type: str, brand: str) -> dict:
    """Synchronous OpenAI call  runs in a thread via asyncio.to_thread."""
    if not _SDK_AVAILABLE:
        return {"confidence": 0, "reason": "openai SDK not installed"}

    prompt = (
        f'You are a fashion authentication expert. '
        f'Examine this clothing item image. '
        f'Does it show a genuine item from the brand "{brand}"? '
        f'Check for brand labels, logos, tags, and stitching quality. '
        f'Reply ONLY with JSON (no markdown): {{"confidence": <0-100 integer>, "reason": "<one sentence>"}}'
    )

    base64_image = base64.b64encode(image_bytes).decode('utf-8')

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300,
        )
        
        text = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        text = re.sub(r'^```json\s*|\s*```$', '', text, flags=re.DOTALL).strip()
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
            return {
                "confidence": int(parsed.get("confidence", 0)),
                "reason": parsed.get("reason", ""),
            }
    except Exception as e:
        return {"confidence": 0, "reason": f"AI error: {str(e)}"}

    return {"confidence": 0, "reason": "Failed to parse OpenAI response"}


@router.post("/item")
async def verify_item(payload: VerifyRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    if not payload.image_urls:
        raise HTTPException(status_code=400, detail="At least one image URL required")

    # Prefer brand-tag photo (slot index 1), fallback to first
    image_url = payload.image_urls[1] if len(payload.image_urls) > 1 else payload.image_urls[0]

    # Download image
    try:
        async with httpx.AsyncClient(timeout=20) as http_client:
            img_resp = await http_client.get(image_url)
            img_resp.raise_for_status()
            image_bytes = img_resp.content
            mime_type = img_resp.headers.get("content-type", "image/jpeg").split(";")[0]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not fetch image: {e}")

    # Run SDK call in thread pool (SDK is synchronous)
    result = await asyncio.to_thread(_call_openai_sync, image_bytes, mime_type, payload.brand)

    confidence = result["confidence"]
    reason = result["reason"]

    return {
        "ai_score": confidence,
        "verified": confidence >= 75,
        "reason": reason,
        "status": "available" if confidence >= 75 else "pending_review",
    }
