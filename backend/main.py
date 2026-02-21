from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import items, swipes, profiles

app = FastAPI(title="SwapStyl API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router)
app.include_router(swipes.router)
app.include_router(profiles.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to SwapStyl API"}
