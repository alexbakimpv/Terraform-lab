"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, labs, admin
from app.auth import create_user, get_db
from app.config import CORS_ORIGINS_LIST, USERS_COLLECTION, GCP_PROJECT

app = FastAPI(title="Lab Manager API", version="2.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(labs.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"ok": True, "version": "2.0.0"}

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.on_event("startup")
def startup_event():
    """Seed initial users on startup."""
    try:
        db = get_db()
        
        users_to_create = [
            {"email": "alexb@imperva.com", "password": "Admin123!", "role": "admin"},
            {"email": "alexbak@gmail.com", "password": "Student123!", "role": "student"},
        ]
        
        for user_data in users_to_create:
            try:
                # Check if user exists
                existing = db.collection(USERS_COLLECTION).where("email", "==", user_data["email"].lower()).stream()
                if not list(existing):
                    create_user(user_data["email"], user_data["password"], user_data["role"])
                    print(f"✓ Created user: {user_data['email']} (role: {user_data['role']})")
                else:
                    print(f"⊘ User already exists: {user_data['email']}")
            except Exception as e:
                if "already exists" not in str(e).lower():
                    print(f"✗ Error creating {user_data['email']}: {e}")
    except Exception as e:
        print(f"WARNING: Failed to seed users: {e}")
