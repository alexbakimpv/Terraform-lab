"""Infrastructure services for Cloud Run, DNS, and Email."""
import os
import re
import secrets
import string
import hashlib
from datetime import datetime, timezone
from typing import Optional
from google.cloud import run_v2
from google.cloud.run_v2 import types
from google.cloud import dns
from google.iam.v1 import policy_pb2, iam_policy_pb2
import resend
from app.config import (
    GCP_PROJECT, GCP_REGION, DNS_ZONE_NAME, DNS_ZONE_DOMAIN,
    ATTACK_CLIENT_IMAGE, AIR_ORIGIN_HOSTNAME, RESEND_API_KEY
)

def _debug_log(payload: dict) -> None:
    """Write NDJSON debug log for runtime analysis."""
    try:
        with open("/Users/alexb/Desktop/Cursor/Terraform-lab/.cursor/debug.log", "a", encoding="utf-8") as log_file:
            import json
            log_file.write(json.dumps(payload) + "\n")
    except Exception:
        pass

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    if not os.getenv("RESEND_API_KEY"):
        print(f"✓ RESEND_API_KEY loaded from Secret Manager (project: {GCP_PROJECT})")

ALPHANUM = string.ascii_letters + string.digits

def make_lab_name(email: str) -> str:
    """Generate a lab name from email."""
    local = email.split("@")[0]
    letters = re.sub(r"[^a-zA-Z]", "", local)
    prefix = (letters[:4] or local[:4]).title()
    suffix = "".join(secrets.choice(ALPHANUM) for _ in range(4))
    return f"{prefix}-{suffix}"

def make_dns_hostname(email: str, scenario_id: Optional[str] = None) -> str:
    """Create STABLE DNS hostname from email (based on lab_id and scenario)."""
    lab_id = stable_lab_id_from_email(email)
    if scenario_id == "air":
        hostname = f"{lab_id}.air.{DNS_ZONE_DOMAIN}"
    else:
        hostname = f"{lab_id}.{DNS_ZONE_DOMAIN}"
    # #region agent log
    _debug_log({
        "sessionId": "debug-session",
        "runId": "pre-fix",
        "hypothesisId": "H1",
        "location": "services.py:make_dns_hostname",
        "message": "Computed scenario hostname",
        "data": {"lab_id": lab_id, "scenario_id": scenario_id, "hostname": hostname},
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
    })
    # #endregion
    return hostname

def stable_lab_id_from_email(email: str) -> str:
    """Generate stable lab ID from email."""
    prefix = re.sub(r"[^a-zA-Z0-9]", "", email.split("@")[0])[:4] or "user"
    digest = hashlib.sha1(email.encode("utf-8")).hexdigest()[:4]
    return f"{prefix}-{digest}"

def create_cloud_run_service(service_name: str, dns_hostname: str) -> str:
    """Create a Cloud Run service and return its URL."""
    client = run_v2.ServicesClient()
    parent = f"projects/{GCP_PROJECT}/locations/{GCP_REGION}"
    service_path = f"{parent}/services/{service_name}"
    
    # Check if service already exists
    try:
        existing_service = client.get_service(name=service_path)
        # Get URI from the service - it might be in different attributes
        uri = existing_service.uri or ""
        if not uri and hasattr(existing_service, 'urls') and existing_service.urls:
            uri = existing_service.urls[0]
        if not uri:
            # Construct URL from service name if not available
            uri = f"https://{service_name}-{GCP_PROJECT[:8]}.{GCP_REGION}.run.app"
        print(f"[DEBUG CLOUDRUN] Found existing service: {service_path}, uri={uri}")
        return uri
    except Exception as e:
        print(f"[DEBUG CLOUDRUN] Service doesn't exist, creating: {service_path}, error={e}")
    
    # Create container with ports and env vars (updated API structure)
    container = types.Container(
        image=ATTACK_CLIENT_IMAGE,
        ports=[types.ContainerPort(container_port=8080)],
        env=[types.EnvVar(name="ROLE", value="ATTACKER")],
    )
    
    # Create revision template (new API - containers directly on template, no spec)
    revision_template = types.RevisionTemplate(
        containers=[container],
        service_account=f"sa-attack-client@{GCP_PROJECT}.iam.gserviceaccount.com",
    )
    
    # Create service
    service = types.Service(
        labels={"managed-by": "lab-manager"},
        template=revision_template,
    )
    
    request = types.CreateServiceRequest(
        parent=parent,
        service=service,
        service_id=service_name,
    )
    
    operation = client.create_service(request=request)
    response = operation.result(timeout=300)
    
    print(f"[DEBUG CLOUDRUN] Service created: name={response.name}, uri={response.uri}")
    
    # Grant public access
    try:
        policy_request = iam_policy_pb2.GetIamPolicyRequest(resource=response.name)
        policy = client.get_iam_policy(request=policy_request)
        
        existing_binding = None
        for b in policy.bindings:
            if b.role == "roles/run.invoker":
                existing_binding = b
                break
        
        if existing_binding:
            if "allUsers" not in existing_binding.members:
                existing_binding.members.append("allUsers")
        else:
            binding = policy_pb2.Binding()
            binding.role = "roles/run.invoker"
            binding.members.append("allUsers")
            policy.bindings.append(binding)
        
        set_policy_request = iam_policy_pb2.SetIamPolicyRequest(
            resource=response.name,
            policy=policy,
        )
        client.set_iam_policy(request=set_policy_request)
    except Exception as e:
        print(f"WARNING: Failed to grant public access: {e}")
    
    # Return URI, or construct it if empty
    uri = response.uri or ""
    if not uri:
        # Construct URL from response name if URI not available
        # response.name format: projects/{project}/locations/{region}/services/{service_name}
        uri = f"https://{service_name}-{GCP_PROJECT[:8]}.{GCP_REGION}.run.app"
        print(f"[DEBUG CLOUDRUN] URI was empty, constructed: {uri}")
    
    return uri

def create_dns_record(hostname: str, target: str) -> None:
    """Create or update a DNS CNAME record."""
    client = dns.Client(project=GCP_PROJECT)
    zone = client.zone(DNS_ZONE_NAME)
    
    if hostname.endswith("."):
        hostname = hostname[:-1]
    
    if hostname.endswith(f".{DNS_ZONE_DOMAIN}"):
        record_name = hostname[:-(len(DNS_ZONE_DOMAIN) + 1)]
    else:
        record_name = hostname.split(".")[0]
    
    if not target.endswith("."):
        target = f"{target}."
    
    full_record_name = f"{record_name}.{DNS_ZONE_DOMAIN}."
    
    print(f"[DEBUG DNS] Creating/updating record: {full_record_name} -> {target}")
    # #region agent log
    _debug_log({
        "sessionId": "debug-session",
        "runId": "pre-fix",
        "hypothesisId": "H1,H3",
        "location": "services.py:create_dns_record",
        "message": "Creating or updating CNAME",
        "data": {"full_record_name": full_record_name, "target": target},
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
    })
    # #endregion
    
    # Check if record already exists
    existing_record = None
    try:
        # List all records and find the matching one
        records = list(zone.list_resource_record_sets())
        for record in records:
            if record.name == full_record_name and record.record_type == "CNAME":
                existing_record = record
                break
    except Exception as e:
        print(f"[DEBUG DNS] Error checking existing records: {e}")
    
    if existing_record:
        # Record exists - check if it needs updating
        if existing_record.rrdatas and existing_record.rrdatas[0] == target:
            print(f"[DEBUG DNS] Record already exists with correct target, skipping")
            return
        else:
            # Delete old record and add new one
            print(f"[DEBUG DNS] Record exists with different target, updating: {existing_record.rrdatas} -> {target}")
            changes = zone.changes()
            changes.delete_record_set(existing_record)
            new_record = zone.resource_record_set(full_record_name, "CNAME", 300, [target])
            changes.add_record_set(new_record)
            changes.create()
            return
    
    # Record doesn't exist, create it
    print(f"[DEBUG DNS] Creating new record: {full_record_name}")
    record_set = zone.resource_record_set(full_record_name, "CNAME", 300, [target])
    changes = zone.changes()
    changes.add_record_set(record_set)
    changes.create()

def send_invite_email(email: str, name: Optional[str] = None) -> bool:
    """Send invitation email."""
    if not RESEND_API_KEY:
        print("WARNING: RESEND_API_KEY not configured")
        return False
    
    try:
        manager_url = os.getenv("MANAGER_URL", "https://manager.lab.amplifys.us")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 40px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px;">
                <h1 style="color: #333;">Welcome to Amplify Security Lab</h1>
                <p>Hi {name or 'there'},</p>
                <p>You've been invited to participate in the Amplify Security Lab.</p>
                <p><strong>Access URL:</strong> <a href="{manager_url}">{manager_url}</a></p>
                <p>Use your email address and password to log in.</p>
            </div>
        </body>
        </html>
        """
        
        result = resend.emails.send({
            "from": "Amplify Lab <notifications@amplifys.us>",
            "to": [email],
            "subject": "Welcome to Amplify Security Lab",
            "html": html_content,
        })
        return True
    except Exception as e:
        print(f"ERROR sending email: {e}")
        return False

def now_utc():
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)
