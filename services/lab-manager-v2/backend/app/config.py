"""Configuration management with Secret Manager integration."""
import os
from functools import lru_cache

try:
    from google.cloud import secretmanager
    
    @lru_cache(maxsize=32)
    def _load_secret_from_sm(secret_id: str, project_id: str) -> str:
        """Load secret from Secret Manager."""
        try:
            client = secretmanager.SecretManagerServiceClient()
            name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
            resp = client.access_secret_version(request={"name": name})
            return resp.payload.data.decode("utf-8").strip()
        except Exception as e:
            print(f"WARNING: Failed to load secret {secret_id}: {e}")
            return ""
except ImportError:
    def _load_secret_from_sm(secret_id: str, project_id: str) -> str:
        return ""

# GCP Configuration
GCP_PROJECT = os.getenv("GCP_PROJECT", "appsec-unilab")
FIRESTORE_DB = os.getenv("FIRESTORE_DB", "(default)")
GCP_REGION = os.getenv("GCP_REGION", "us-east1")

# JWT Configuration
JWT_SECRET_ENV = os.getenv("JWT_SECRET_KEY", "")
JWT_SECRET = (
    JWT_SECRET_ENV 
    or _load_secret_from_sm("lab-manager-auth-token", GCP_PROJECT)
    or "dev-secret-change-me-in-production"
)
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "4"))

# Firestore Collections
LABS_COLLECTION = os.getenv("LABS_COLLECTION", "labs")
USERS_COLLECTION = os.getenv("USERS_COLLECTION", "users")
INVITES_COLLECTION = os.getenv("INVITES_COLLECTION", "invites")
AUDIT_LOGS_COLLECTION = os.getenv("AUDIT_LOGS_COLLECTION", "audit_logs")

# DNS Configuration
DNS_ZONE_NAME = os.getenv("DNS_ZONE_NAME", "appsec-unilab-zone")
DNS_ZONE_DOMAIN = os.getenv("DNS_ZONE_DOMAIN", "lab.amplifys.us")
AIR_ORIGIN_HOSTNAME = os.getenv("AIR_ORIGIN_HOSTNAME", "air-origin.lab.amplifys.us")

# Cloud Run Configuration
# Format: {region}-docker.pkg.dev/{project_id}/{repo_id}/attack-client:latest
# Note: The attack client source is at https://github.com/alexbakimpv/amplify-attack-client
# The actual deployed image should be in GCP Artifact Registry
ATTACK_CLIENT_IMAGE = os.getenv("ATTACK_CLIENT_IMAGE", "")

# Email Configuration
RESEND_API_KEY_ENV = os.getenv("RESEND_API_KEY", "")
RESEND_API_KEY = (
    RESEND_API_KEY_ENV 
    or _load_secret_from_sm("resend-key", GCP_PROJECT)
    or ""
)

# CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,https://manager.lab.amplifys.us")
CORS_ORIGINS_LIST = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]

# Print configuration status on import
if JWT_SECRET != "dev-secret-change-me-in-production" and not JWT_SECRET_ENV:
    print(f"✓ JWT_SECRET_KEY loaded from Secret Manager (project: {GCP_PROJECT})")
