"""Admin routes."""
from typing import Dict, Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from google.cloud import firestore
from app.auth import get_current_user, get_db
from app.config import LABS_COLLECTION, INVITES_COLLECTION, AUDIT_LOGS_COLLECTION
from app.services import send_invite_email, now_utc

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

def require_admin(user: Dict = Depends(get_current_user)) -> Dict:
    """Require admin role."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return user

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

class InviteParticipantRequest(BaseModel):
    email: str

class InviteBulkRequest(BaseModel):
    participants: List[Dict]

@router.get("/participants")
def get_participants(user: Dict = Depends(require_admin)):
    """Get all participants."""
    db = get_db()
    labs = db.collection(LABS_COLLECTION).where("status", "==", "active").stream()
    participants = []
    for lab in labs:
        data = lab.to_dict()
        created_at = data.get("created_at")
        expires_at = data.get("expires_at")
        participants.append({
            "email": data.get("owner_email"),
            "lab_id": lab.id,
            "lab_name": data.get("lab_name"),
            "status": data.get("status"),
            "created_at": created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at),
            "expires_at": expires_at.isoformat() if hasattr(expires_at, 'isoformat') else str(expires_at),
        })
    return {"participants": participants}

@router.get("/users")
def get_users(user: Dict = Depends(require_admin)):
    """Alias for participants."""
    return get_participants(user)

@router.get("/admins")
def get_admins(user: Dict = Depends(require_admin)):
    """Get admins."""
    return {"admins": []}

@router.get("/profile")
def get_profile(user: Dict = Depends(require_admin)):
    """Get admin profile."""
    return {"email": user["email"], "display_name": "Admin", "notes": ""}

@router.put("/profile")
def update_profile(body: Dict, user: Dict = Depends(require_admin)):
    """Update admin profile."""
    return {"ok": True}

@router.get("/audit-logs")
def get_audit_logs(limit: int = 50, role_filter: Optional[str] = None, search: Optional[str] = None, user: Dict = Depends(require_admin)):
    """Get audit logs."""
    db = get_db()
    logs = db.collection(AUDIT_LOGS_COLLECTION)
    
    query = logs.order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit)
    
    if role_filter and role_filter.upper() in ["ADMIN", "STUDENT", "PARTICIPANT", "SYSTEM"]:
        query = query.where("actor_role", "==", role_filter.upper())
    
    log_docs = list(query.stream())
    audit_logs = []
    
    for doc in log_docs:
        data = doc.to_dict()
        
        if search:
            search_lower = search.lower()
            if not any(
                search_lower in str(data.get("actor_email", "")).lower() or
                search_lower in str(data.get("action", "")).lower() or
                search_lower in str(data.get("target", "")).lower() or
                search_lower in str(data.get("status", "")).lower()
                for _ in [None]
            ):
                continue
        
        timestamp = data.get("timestamp")
        if hasattr(timestamp, 'isoformat'):
            timestamp = timestamp.isoformat()
        elif hasattr(timestamp, 'seconds'):
            from datetime import datetime, timezone
            timestamp = datetime.fromtimestamp(timestamp.seconds, tz=timezone.utc).isoformat()
        
        audit_logs.append({
            "id": doc.id,
            "timestamp": timestamp,
            "role": data.get("actor_role", "UNKNOWN"),
            "actor": data.get("actor_email", "unknown"),
            "action": data.get("action", "unknown"),
            "target": data.get("target", ""),
            "status": data.get("status", "unknown"),
            "details": data.get("details", {}),
        })
    
    return {"logs": audit_logs}

@router.post("/participants/invite")
def invite_participant(req: InviteParticipantRequest, user: Dict = Depends(require_admin)):
    """Invite a participant."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    try:
        email_sent = send_invite_email(email)
        db = get_db()
        db.collection(INVITES_COLLECTION).add({
            "email": email,
            "invited_by": user["email"],
            "invited_at": now_utc(),
            "status": "pending",
            "email_sent": email_sent,
        })
        log_audit_event(user["email"], "ADMIN", "invite_participant", email, "success" if email_sent else "partial")
        return {"success": True, "email_sent": email_sent}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to invite: {str(e)}")

@router.post("/participants/invite-bulk")
def invite_participants_bulk(req: InviteBulkRequest, user: Dict = Depends(require_admin)):
    """Bulk invite participants."""
    if not req.participants:
        raise HTTPException(status_code=400, detail="No participants provided")
    
    db = get_db()
    invites = db.collection(INVITES_COLLECTION)
    success_count = 0
    email_sent_count = 0
    errors = []
    
    for idx, participant in enumerate(req.participants):
        try:
            email = (participant.get("email") or "").strip().lower()
            if not email or "@" not in email:
                errors.append(f"Participant {idx + 1}: Invalid email")
                continue
            
            name = participant.get("name")
            email_sent = send_invite_email(email, name)
            if email_sent:
                email_sent_count += 1
            
            invites.add({
                "email": email,
                "name": name,
                "invited_by": user["email"],
                "invited_at": now_utc(),
                "status": "pending",
                "email_sent": email_sent,
            })
            success_count += 1
        except Exception as e:
            errors.append(f"Error processing participant {idx + 1}: {str(e)}")
    
    result = {
        "success": success_count > 0,
        "count": success_count,
        "emails_sent": email_sent_count,
        "total_requested": len(req.participants)
    }
    
    if errors:
        result["errors"] = errors
        result["error_count"] = len(errors)
    
    log_audit_event(user["email"], "ADMIN", "invite_participants_bulk", f"{len(req.participants)} participants", "success" if success_count > 0 else "error", result)
    
    return result

@router.post("/admins/invite")
def invite_admin(req: InviteParticipantRequest, user: Dict = Depends(require_admin)):
    """Invite an admin."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    if not email.endswith("@imperva.com"):
        raise HTTPException(status_code=400, detail="Admin emails must be @imperva.com")
    
    # For now, just log - admin creation would require user creation in users collection
    log_audit_event(user["email"], "ADMIN", "invite_admin", email, "success")
    return {"success": True}
