# Deployment Prompt for Lab Manager v2

Use this prompt to deploy the Lab Manager v2 service:

---

**Prompt for AI Agent:**

Please deploy the Lab Manager v2 service with the following requirements:

1. **Infrastructure Setup**:
   - Apply the Terraform configurations for Cloud Build triggers:
     - `cloudbuild_attack_client.tf` - Builds attack client from GitHub repo
     - `cloudbuild_lab_manager_v2_api.tf` - Builds lab-manager-v2 backend
   - Ensure the following resources exist:
     - GKE cluster (`google_container_cluster.primary`)
     - Artifact Registry repository (`google_artifact_registry_repository.lab_repo`)
     - GitHub connection (`google_cloudbuildv2_connection.github_conn`)
     - DNS zone and related resources

2. **Attack Client Build**:
   - The attack client should build automatically from the GitHub repo: `https://github.com/alexbakimpv/amplify-attack-client`
   - Build trigger: `deploy-attack-client`
   - Output image: `{region}-docker.pkg.dev/{project_id}/amplify-lab-repo/attack-client:latest`
   - Verify the build completes successfully

3. **Lab Manager v2 Deployment**:
   - Create Kubernetes deployment for lab-manager-v2-api in namespace `lab-manager-v2` (or `amplify-manager`)
   - Use the image: `{region}-docker.pkg.dev/{project_id}/amplify-lab-repo/lab-manager-v2-api:latest`
   - Configure environment variables:
     - `GCP_PROJECT`: `appsec-unilab`
     - `FIRESTORE_DB`: `(default)`
     - `GCP_REGION`: `us-east1`
     - `DNS_ZONE_NAME`: `appsec-unilab-zone`
     - `DNS_ZONE_DOMAIN`: `lab.amplifys.us`
     - `AIR_ORIGIN_HOSTNAME`: `air-origin.lab.amplifys.us`
     - `ATTACK_CLIENT_IMAGE`: `{region}-docker.pkg.dev/{project_id}/amplify-lab-repo/attack-client:latest`
     - `CORS_ALLOW_ORIGINS`: `https://manager.lab.amplifys.us,http://localhost:5173`
   - Use Workload Identity with service account: `sa-lab-manager`
   - Expose on port 8080

4. **Verification**:
   - Check that attack-client image is built: `gcloud artifacts docker images list {region}-docker.pkg.dev/{project_id}/amplify-lab-repo --include-tags --filter="package=attack-client"`
   - Check that lab-manager-v2-api image is built: `gcloud artifacts docker images list {region}-docker.pkg.dev/{project_id}/amplify-lab-repo --include-tags --filter="package=lab-manager-v2-api"`
   - Verify Kubernetes deployment: `kubectl -n lab-manager-v2 get deployments,services,pods`
   - Check logs: `kubectl -n lab-manager-v2 logs -l app=lab-manager-v2-api`

5. **Configuration Notes**:
   - JWT_SECRET_KEY is automatically loaded from Secret Manager secret: `lab-manager-auth-token`
   - RESEND_API_KEY is automatically loaded from Secret Manager secret: `resend-key`
   - Default users are seeded on startup:
     - Admin: `alexb@imperva.com` / `Admin123!`
     - Student: `alexbak@gmail.com` / `Student123!`

6. **Network/DNS** (if needed):
   - Create Service and Ingress for lab-manager-v2-api (if exposing externally)
   - Configure DNS if needed

Please proceed with the deployment and report any issues.

---

## Quick Deploy Commands

```bash
# 1. Apply Terraform
cd /path/to/terraform-lab
terraform plan  # Review changes
terraform apply # Apply infrastructure

# 2. Trigger builds (or push to GitHub to trigger automatically)
gcloud builds triggers run deploy-attack-client --region=us-east1
gcloud builds triggers run deploy-lab-manager-v2-api --region=us-east1

# 3. Verify images
gcloud artifacts docker images list \
  us-east1-docker.pkg.dev/appsec-unilab/amplify-lab-repo \
  --include-tags

# 4. Deploy to Kubernetes (if using the example from DEPLOY_LAB_MANAGER_V2.md)
kubectl apply -f lab_manager_v2_k8s.yaml  # Or use Terraform
```
