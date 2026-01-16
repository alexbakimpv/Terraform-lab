"""Authentication routes."""
from datetime import timedelta
from fastapi import APIRouter, HTTPException
from google.cloud import firestore
from app.auth import LoginRequest, LoginResponse, create_token, authenticate_user, get_db, TOKEN_EXPIRE_HOURS
from app.config import LABS_COLLECTION, INVITES_COLLECTION, AUDIT_LOGS_COLLECTION, AIR_ORIGIN_HOSTNAME
from app.services import stable_lab_id_from_email, create_cloud_run_service, create_dns_record, make_dns_hostname, now_utc

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

def log_audit_event(actor_email: str, actor_role: str, action: str, target: str = None, status: str = "success", details: dict = None):
    """Log audit event."""
    try:
        db = get_db()
        db.collection(AUDIT_LOGS_COLLECTION).add({
            "timestamp": now_utc(),
            "actor_email": actor_email,
            "actor_role": actor_role,
            "action": action,
            "target": target,
            "status": status,
            "details": details or {},
        })
    except Exception as e:
        print(f"WARNING: Failed to log audit event: {e}")

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    """Authenticate user and return token."""
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["email"], user["role"])
    lab_id = stable_lab_id_from_email(user["email"])
    
    # For students, ensure lab exists
    if user["role"] == "student":
        db = get_db()
        lab_ref = db.collection(LABS_COLLECTION).document(lab_id)
        lab_doc = lab_ref.get()
        
        if not lab_doc.exists:
            try:
                dns_hostname = make_dns_hostname(request.email, scenario_id="air")
                service_name = f"attack-client-{lab_id.lower()}"
                cloud_run_url = create_cloud_run_service(service_name, dns_hostname)
                create_dns_record(dns_hostname, AIR_ORIGIN_HOSTNAME)
                
                session_expires = now_utc() + timedelta(hours=TOKEN_EXPIRE_HOURS)
                lab_ref.set({
                    "lab_name": lab_id,
                    "owner_email": user["email"],
                    "status": "active",
                    "owner_status": f"{user['email']}|active",
                    "created_at": now_utc(),
                    "expires_at": session_expires,
                    "attack": {
                        "state": "ready",
                        "cloud_run_service": service_name,
                        "cloud_run_url": cloud_run_url,
                        "dns_hostname": dns_hostname,
                    },
                    "victims": {},
                    "imperva": {},
                })
                log_audit_event(user["email"], "STUDENT", "lab_created", lab_id, "success")
            except Exception as e:
                print(f"Warning: Failed to create lab resources: {e}")
                session_expires = now_utc() + timedelta(hours=TOKEN_EXPIRE_HOURS)
                lab_ref.set({
                    "lab_name": lab_id,
                    "owner_email": user["email"],
                    "status": "active",
                    "created_at": now_utc(),
                    "expires_at": session_expires,
                    "attack": {"state": "error", "error": str(e)},
                    "victims": {},
                    "imperva": {},
                })
    
    log_audit_event(user["email"], user["role"].upper(), "login", lab_id, "success")
    
    from datetime import datetime, timezone
    session_expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    user_response = {
        "email": user["email"],
        "role": user["role"],
        "lab_id": lab_id,
        "scenario_id": "air",
        "session_expires_at": session_expires.isoformat(),
    }
    
    return LoginResponse(access_token=token, user=user_response)

@router.post("/logout")
def logout():
    """Logout endpoint (client-side token removal)."""
    return {"message": "Logged out successfully"}
