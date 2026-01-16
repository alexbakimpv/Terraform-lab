"""Lab management routes."""
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
import socket
from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from google.cloud import firestore
from app.auth import get_current_user, get_db
from app.config import LABS_COLLECTION, INVITES_COLLECTION, AUDIT_LOGS_COLLECTION
from app.services import (
    stable_lab_id_from_email, create_cloud_run_service, create_dns_record,
    make_dns_hostname, now_utc
)

router = APIRouter(prefix="/api/v1", tags=["labs"])

def _debug_log(payload: Dict) -> None:
    """Write NDJSON debug log for runtime analysis."""
    try:
        with open("/Users/alexb/Desktop/Cursor/Terraform-lab/.cursor/debug.log", "a", encoding="utf-8") as log_file:
            import json
            log_file.write(json.dumps(payload) + "\n")
    except Exception:
        pass

def _dns_resolves(hostname: Optional[str]) -> bool:
    """Return True if hostname resolves via DNS."""
    if not hostname:
        return False
    try:
        socket.gethostbyname(hostname)
        return True
    except Exception:
        return False

DEFAULT_SCENARIOS = {
    "air": {
        "scenario_id": "air",
        "scenario_name": "Amplify Air",
        "runbook_url": None,
        # Per-lab victim hostname (CNAME -> air-origin.lab.amplifys.us)
        "victim_url_template": "https://{lab_id}.air.lab.amplifys.us",
        # Placeholder until Cloud Run URL is provisioned
        "client_url_template": "https://{lab_id}.launch.lab.amplifys.us",
    }
}

class LabCurrentResponse(BaseModel):
    victim_url: str
    client_url: str
    scenario_id: str
    scenario_name: str
    runbook_url: Optional[str] = None
    status: str = "ready"  # ready, provisioning, resetting, error, pending, expired
    imperva: Dict = Field(default_factory=lambda: {"waf": "OFF", "cert": "PENDING", "dns": "OK"})

class ExtendRequest(BaseModel):
    extend_minutes: int = 240

class ImpervaOnboardRequest(BaseModel):
    protected_cname: str
    txt_validation: Optional[str] = None

def log_audit_event(actor_email: str, actor_role: str, action: str, target: Optional[str] = None, status: str = "success", details: Optional[Dict] = None):
    """Log audit event to Firestore."""
    try:
        db = get_db()
        logs = db.collection(AUDIT_LOGS_COLLECTION)
        logs.add({
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

@router.get("/me")
def get_me(user: Dict = Depends(get_current_user)):
    """Get current user info."""
    from datetime import timedelta
    from app.auth import TOKEN_EXPIRE_HOURS
    
    lab_id = stable_lab_id_from_email(user["email"])
    session_expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    
    # #region agent log
    print(f"[DEBUG H3A,H3B] labs.py:get_me - lab_id={lab_id}, TOKEN_EXPIRE_HOURS={TOKEN_EXPIRE_HOURS}, session_expires={session_expires.isoformat()}")
    # #endregion
    
    return {
        "role": user["role"],
        "lab_id": lab_id,
        "scenario_id": "air",
        "session_expires_at": session_expires.isoformat(),
    }

@router.get("/labs/current", response_model=LabCurrentResponse)
def get_lab_current(user: Dict = Depends(get_current_user)):
    """Get current lab info for authenticated user."""
    db = get_db()
    lab_id = stable_lab_id_from_email(user["email"])
    lab_ref = db.collection(LABS_COLLECTION).document(lab_id)
    lab_doc = lab_ref.get()
    
    scenario = DEFAULT_SCENARIOS.get("air", DEFAULT_SCENARIOS["air"])
    victim_url = scenario["victim_url_template"].format(lab_id=lab_id)
    client_url = scenario["client_url_template"].format(lab_id=lab_id)
    status = "ready"
    
    # #region agent log
    _debug_log({
        "sessionId": "debug-session",
        "runId": "pre-fix",
        "hypothesisId": "H1,H2",
        "location": "labs.py:get_lab_current:entry",
        "message": "Computed initial URLs",
        "data": {
            "lab_id": lab_id,
            "victim_url": victim_url,
            "client_url": client_url
        },
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
    })
    # #endregion
    
    victim_host = urlparse(victim_url).hostname
    client_host = urlparse(client_url).hostname
    dns_victim_ok = _dns_resolves(victim_host)
    dns_client_ok = _dns_resolves(client_host)
    
    # #region agent log
    _debug_log({
        "sessionId": "debug-session",
        "runId": "pre-fix",
        "hypothesisId": "H4",
        "location": "labs.py:get_lab_current:dns_check_initial",
        "message": "Initial DNS check for victim/client hosts",
        "data": {
            "victim_host": victim_host,
            "client_host": client_host,
            "dns_victim_ok": dns_victim_ok,
            "dns_client_ok": dns_client_ok
        },
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
    })
    # #endregion
    
    # #region agent log
    import json; print(f"[DEBUG H1A,H2A,H4A] labs.py:get_lab_current:entry - lab_id={lab_id}, email={user['email']}, lab_doc_exists={lab_doc.exists}")
    # #endregion
    
    if lab_doc.exists:
        data = lab_doc.to_dict()
        attack_data = data.get("attack", {})
        dns_hostname = attack_data.get("dns_hostname")
        cloud_run_url = attack_data.get("cloud_run_url")
        attack_state = attack_data.get("state", "unknown")
        expected_dns_hostname = make_dns_hostname(user["email"], scenario_id="air")
        
        # Ensure per-lab CNAME exists for victim URL (backfill for older labs)
        if not dns_hostname or dns_hostname != expected_dns_hostname:
            try:
                from app.config import AIR_ORIGIN_HOSTNAME
                create_dns_record(expected_dns_hostname, AIR_ORIGIN_HOSTNAME)
                lab_ref.update({
                    "attack.dns_hostname": expected_dns_hostname,
                })
                dns_hostname = expected_dns_hostname
                # #region agent log
                _debug_log({
                    "sessionId": "debug-session",
                    "runId": "pre-fix",
                    "hypothesisId": "H1,H3",
                    "location": "labs.py:get_lab_current:dns_backfill",
                    "message": "Backfilled DNS hostname",
                    "data": {
                        "expected_dns_hostname": expected_dns_hostname,
                        "previous_dns_hostname": attack_data.get("dns_hostname"),
                        "air_origin": AIR_ORIGIN_HOSTNAME
                    },
                    "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
                })
                # #endregion
            except Exception as e:
                # #region agent log
                _debug_log({
                    "sessionId": "debug-session",
                    "runId": "pre-fix",
                    "hypothesisId": "H3",
                    "location": "labs.py:get_lab_current:dns_backfill_error",
                    "message": "Failed to backfill DNS hostname",
                    "data": {
                        "expected_dns_hostname": expected_dns_hostname,
                        "error": str(e)
                    },
                    "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
                })
                # #endregion
        
        # Check lab expiration
        expires_at = data.get("expires_at")
        if expires_at:
            if hasattr(expires_at, 'timestamp'):
                # Firestore timestamp
                expiry_time = expires_at
            else:
                expiry_time = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > expiry_time:
                status = "expired"
        
        # #region agent log
        expires_at_raw = data.get("expires_at")
        print(f"[DEBUG H1A,H2A,H4A] labs.py:get_lab_current:attack_data - attack_data={attack_data}, dns_hostname={dns_hostname}, cloud_run_url={cloud_run_url}, attack_state={attack_state}, expires_at={expires_at_raw}, full_data_keys={list(data.keys())}")
        # #endregion
        
        # Map attack state to status (only if not expired)
        if status != "expired":
            if attack_state == "ready" or attack_state == "online":
                status = "ready"  # "online" maps to "ready" for display
            elif attack_state == "error":
                status = "error"
            elif attack_state == "not_invited":
                status = "pending"
            elif attack_state == "provisioning":
                status = "provisioning"
            else:
                status = attack_state if attack_state != "unknown" else "ready"
        
        # Use Cloud Run URL for client if available from provisioning
        if cloud_run_url:
            client_url = cloud_run_url
        
        # #region agent log
        _debug_log({
            "sessionId": "debug-session",
            "runId": "pre-fix",
            "hypothesisId": "H2,H3",
            "location": "labs.py:get_lab_current:provisioning",
            "message": "Applied provisioning data",
            "data": {
                "cloud_run_url": cloud_run_url,
                "dns_hostname": dns_hostname,
                "attack_state": attack_state,
                "status": status
            },
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        })
        # #endregion
        
        # Re-check DNS after provisioning data is applied
        victim_host = urlparse(victim_url).hostname
        client_host = urlparse(client_url).hostname
        dns_victim_ok = _dns_resolves(victim_host)
        dns_client_ok = _dns_resolves(client_host)
        
        # #region agent log
        _debug_log({
            "sessionId": "debug-session",
            "runId": "pre-fix",
            "hypothesisId": "H4",
            "location": "labs.py:get_lab_current:dns_check_post",
            "message": "Post-provision DNS check for victim/client hosts",
            "data": {
                "victim_host": victim_host,
                "client_host": client_host,
                "dns_victim_ok": dns_victim_ok,
                "dns_client_ok": dns_client_ok
            },
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        })
        # #endregion
    
    # Only show online/ready when both victim and client DNS resolve
    if status == "ready" and not (dns_victim_ok and dns_client_ok):
        status = "provisioning"
    
    # #region agent log
    print(f"[DEBUG H1A,H1B,H2A,H4A] labs.py:get_lab_current:response - victim_url={victim_url}, client_url={client_url}, status={status}, lab_id={lab_id}")
    _debug_log({
        "sessionId": "debug-session",
        "runId": "pre-fix",
        "hypothesisId": "H1,H2,H4",
        "location": "labs.py:get_lab_current:response",
        "message": "Returning lab response",
        "data": {
            "victim_url": victim_url,
            "client_url": client_url,
            "status": status,
            "lab_id": lab_id,
            "dns_victim_ok": dns_victim_ok,
            "dns_client_ok": dns_client_ok
        },
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
    })
    # #endregion
    
    return LabCurrentResponse(
        victim_url=victim_url,
        client_url=client_url,
        scenario_id=scenario["scenario_id"],
        scenario_name=scenario["scenario_name"],
        runbook_url=scenario.get("runbook_url"),
        status=status,
        imperva={"waf": "OFF", "cert": "PENDING", "dns": "OK"},
    )

@router.post("/labs/current/extend")
def extend_lab(req: ExtendRequest, user: Dict = Depends(get_current_user)):
    """Extend lab session - updates the lab's expires_at in Firestore."""
    db = get_db()
    lab_id = stable_lab_id_from_email(user["email"])
    lab_ref = db.collection(LABS_COLLECTION).document(lab_id)
    
    new_expiry = datetime.now(timezone.utc) + timedelta(minutes=req.extend_minutes)
    
    # Update the lab document with new expiry
    lab_doc = lab_ref.get()
    if lab_doc.exists:
        lab_ref.update({"expires_at": new_expiry})
    else:
        # Create lab document if it doesn't exist
        lab_ref.set({
            "owner_email": user["email"],
            "lab_name": lab_id,
            "created_at": datetime.now(timezone.utc),
            "expires_at": new_expiry,
            "status": "active",
            "attack": {"state": "pending"},
        })
    
    return {"new_expiry": new_expiry.isoformat()}

@router.post("/labs/current/reset")
def reset_lab(user: Dict = Depends(get_current_user)):
    """Reset lab - reprovisions the attack client and resets state."""
    from app.config import AIR_ORIGIN_HOSTNAME, ATTACK_CLIENT_IMAGE
    
    db = get_db()
    lab_id = stable_lab_id_from_email(user["email"])
    lab_ref = db.collection(LABS_COLLECTION).document(lab_id)
    
    new_expiry = datetime.now(timezone.utc) + timedelta(hours=4)
    
    # #region agent log
    print(f"[DEBUG RESET] Starting reset for lab_id={lab_id}, email={user['email']}, ATTACK_CLIENT_IMAGE={ATTACK_CLIENT_IMAGE}")
    # #endregion
    
    # Actually provision the attack client
    try:
        dns_hostname = make_dns_hostname(user["email"], scenario_id="air")
        service_name = f"attack-client-{lab_id.lower()}"
        
        # #region agent log
        print(f"[DEBUG RESET] Provisioning: service_name={service_name}, dns_hostname={dns_hostname}")
        _debug_log({
            "sessionId": "debug-session",
            "runId": "pre-fix",
            "hypothesisId": "H1,H3",
            "location": "labs.py:reset_lab:provisioning",
            "message": "Provisioning attack client and DNS",
            "data": {
                "service_name": service_name,
                "dns_hostname": dns_hostname,
                "scenario_id": "air"
            },
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        })
        # #endregion
        
        cloud_run_url = create_cloud_run_service(service_name, dns_hostname)
        
        # #region agent log
        print(f"[DEBUG RESET] Cloud Run created: cloud_run_url={cloud_run_url}")
        # #endregion
        
        create_dns_record(dns_hostname, AIR_ORIGIN_HOSTNAME)
        
        # #region agent log
        print(f"[DEBUG RESET] DNS record created for {dns_hostname} -> {AIR_ORIGIN_HOSTNAME}")
        # #endregion
        
        # Update lab with successful provisioning
        lab_ref.update({
            "expires_at": new_expiry,
            "attack": {
                "state": "ready",
                "cloud_run_service": service_name,
                "cloud_run_url": cloud_run_url,
                "dns_hostname": dns_hostname,
            },
        })
        
        # #region agent log
        print(f"[DEBUG RESET] SUCCESS: Lab updated with cloud_run_url={cloud_run_url}, dns_hostname={dns_hostname}")
        # #endregion
        
        log_audit_event(user["email"], user.get("role", "student").upper(), "lab_reset", lab_id, "success")
        return {"status": "reset_complete", "cloud_run_url": cloud_run_url, "dns_hostname": dns_hostname}
        
    except Exception as e:
        import traceback
        print(f"ERROR: Failed to provision attack client: {e}")
        print(f"[DEBUG RESET] Traceback: {traceback.format_exc()}")
        # Update with error state
        lab_ref.update({
            "expires_at": new_expiry,
            "attack": {"state": "error", "error": str(e)},
        })
        log_audit_event(user["email"], user.get("role", "student").upper(), "lab_reset", lab_id, "error", {"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Failed to provision: {str(e)}")

@router.post("/labs/current/imperva/onboard")
def onboard_imperva(req: ImpervaOnboardRequest, user: Dict = Depends(get_current_user)):
    """Onboard lab to Imperva."""
    db = get_db()
    lab_id = stable_lab_id_from_email(user["email"])
    lab_ref = db.collection(LABS_COLLECTION).document(lab_id)
    lab_doc = lab_ref.get()
    
    if not lab_doc.exists:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    data = lab_doc.to_dict()
    attack_data = data.get("attack", {})
    dns_hostname = attack_data.get("dns_hostname")
    
    if not dns_hostname:
        raise HTTPException(status_code=400, detail="DNS hostname not found")
    
    try:
        imperva_cname = req.protected_cname.strip()
        if not imperva_cname.endswith("."):
            imperva_cname = f"{imperva_cname}."
        
        create_dns_record(dns_hostname, imperva_cname)
        
        imperva_data = data.get("imperva", {})
        imperva_data["protected_cname"] = req.protected_cname
        imperva_data["dns"] = "OK"
        imperva_data["onboarded_at"] = now_utc()
        
        lab_ref.update({"imperva": imperva_data})
        
        return {
            "accepted": True,
            "protected_cname": req.protected_cname,
            "dns_hostname": dns_hostname,
            "message": "DNS CNAME updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update DNS: {str(e)}")
