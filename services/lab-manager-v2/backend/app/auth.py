"""Simplified authentication system with bcrypt and JWT."""
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from fastapi import HTTPException, Header
from pydantic import BaseModel, EmailStr
from google.cloud import firestore
from app.config import (
    JWT_SECRET, JWT_ALGORITHM, TOKEN_EXPIRE_HOURS, USERS_COLLECTION,
    GCP_PROJECT, FIRESTORE_DB
)

# Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    user: Dict

# Helper Functions
def hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())

def is_master_password(password: str) -> bool:
    """Allow login with the lab_manager_auth_token secret value."""
    return bool(JWT_SECRET) and password == JWT_SECRET

def create_token(email: str, role: str) -> str:
    """Create JWT token."""
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": email, "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Dict:
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Firestore Operations
def get_db():
    return firestore.Client(project=GCP_PROJECT, database=FIRESTORE_DB)

def create_user(email: str, password: str, role: str):
    """Create user in Firestore."""
    db = get_db()
    email_lower = email.lower().strip()
    
    # Check if exists
    users = db.collection(USERS_COLLECTION).where("email", "==", email_lower).stream()
    if list(users):
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    user_data = {
        "email": email_lower,
        "password_hash": hash_password(password),
        "role": role,
        "created_at": datetime.now(timezone.utc),
        "is_active": True,
    }
    
    db.collection(USERS_COLLECTION).add(user_data)
    return user_data

def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """Authenticate user and return user data."""
    db = get_db()
    email_lower = email.lower().strip()
    
    # Find user
    users = db.collection(USERS_COLLECTION).where("email", "==", email_lower).limit(1).stream()
    user_list = list(users)
    
    if not user_list:
        return None
    
    user_doc = user_list[0]
    user_data = user_doc.to_dict()
    
    # Check active
    if not user_data.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account deactivated")
    
    # Verify password (allow Secret Manager token as a master password)
    if is_master_password(password):
        return {"email": user_data["email"], "role": user_data["role"]}
    if not verify_password(password, user_data["password_hash"]):
        return None
    
    return {"email": user_data["email"], "role": user_data["role"]}

# Dependency
def get_current_user(authorization: Optional[str] = Header(None)) -> Dict:
    """Get current user from token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    return {"email": payload["sub"], "role": payload.get("role", "student")}
