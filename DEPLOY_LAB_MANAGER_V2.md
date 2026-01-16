# Lab Manager v2 Deployment Guide

This guide explains how to deploy the new Lab Manager v2 service with automated Cloud Build.

## Prerequisites

1. **Terraform Infrastructure**: Ensure your Terraform infrastructure is applied (GKE cluster, Artifact Registry, DNS, etc.)
2. **GitHub Repository**: The lab-manager-v2 code should be in a GitHub repository accessible via Cloud Build
3. **Attack Client Repository**: Already configured at `https://github.com/alexbakimpv/amplify-attack-client`

## Architecture Overview

### Attack Client
- **Source**: GitHub repo `https://github.com/alexbakimpv/amplify-attack-client`
- **Build**: Cloud Build automatically builds on push to `main` branch
- **Output**: Docker image pushed to Artifact Registry: `{region}-docker.pkg.dev/{project_id}/amplify-lab-repo/attack-client:latest`
- **Deployment**: Used by Cloud Run services (created dynamically by lab manager)

### Lab Manager v2
- **Source**: Code in `services/lab-manager-v2/`
- **Build**: Cloud Build automatically builds backend API
- **Output**: Docker image: `{region}-docker.pkg.dev/{project_id}/amplify-lab-repo/lab-manager-v2-api:latest`
- **Deployment**: Deployed to GKE (similar to existing manager)

## Step 1: Apply Terraform Configuration

```bash
cd /path/to/terraform-lab

# Review the new Cloud Build configurations
terraform plan

# Apply the infrastructure
terraform apply
```

This will create:
- Cloud Build trigger for attack-client
- Cloud Build trigger for lab-manager-v2-api
- Service accounts with required permissions
- Repository links (if needed)

## Step 2: Set Up Attack Client Build

The attack client Cloud Build trigger is configured to:
1. Watch the GitHub repo: `https://github.com/alexbakimpv/amplify-attack-client`
2. Trigger on push to `main` branch
3. Build Docker image from repo root
4. Push to Artifact Registry as `attack-client:latest`

**First Build**: You can manually trigger the build or push to the repo:

```bash
# From your attack-client repo
git push origin main
```

Or manually trigger via gcloud:
```bash
gcloud builds triggers run deploy-attack-client --region=us-east1
```

## Step 3: Deploy Lab Manager v2 Backend

### Option A: Deploy to GKE (Recommended - matches existing manager)

1. **Create Kubernetes Deployment** (create `lab_manager_v2_k8s.tf` or add to existing):

```hcl
# Namespace (if needed)
resource "kubectl_manifest" "lab_manager_v2_namespace" {
  yaml_body = <<YAML
apiVersion: v1
kind: Namespace
metadata:
  name: lab-manager-v2
YAML
}

# Service Account with Workload Identity
resource "kubectl_manifest" "lab_manager_v2_ksa" {
  yaml_body = <<YAML
apiVersion: v1
kind: ServiceAccount
metadata:
  name: lab-manager-v2
  namespace: lab-manager-v2
  annotations:
    iam.gke.io/gcp-service-account: "${google_service_account.lab_manager_sa.email}"
YAML

  depends_on = [kubectl_manifest.lab_manager_v2_namespace]
}

# Deployment
resource "kubectl_manifest" "lab_manager_v2_deploy" {
  yaml_body = <<YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lab-manager-v2-api
  namespace: lab-manager-v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lab-manager-v2-api
  template:
    metadata:
      labels:
        app: lab-manager-v2-api
    spec:
      serviceAccountName: lab-manager-v2
      containers:
      - name: api
        image: "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/lab-manager-v2-api:latest"
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
        env:
        - name: GCP_PROJECT
          value: "${var.project_id}"
        - name: FIRESTORE_DB
          value: "(default)"
        - name: GCP_REGION
          value: "${var.region}"
        - name: DNS_ZONE_NAME
          value: "${google_dns_managed_zone.lab_zone.name}"
        - name: DNS_ZONE_DOMAIN
          value: "${trim(google_dns_managed_zone.lab_zone.dns_name, ".")}"
        - name: AIR_ORIGIN_HOSTNAME
          value: "${trim(google_dns_record_set.air_origin.name, ".")}"
        - name: ATTACK_CLIENT_IMAGE
          value: "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/attack-client:latest"
        - name: CORS_ALLOW_ORIGINS
          value: "https://manager.lab.amplifys.us,http://localhost:5173"
YAML

  depends_on = [kubectl_manifest.lab_manager_v2_ksa]
}

# Service
resource "kubectl_manifest" "lab_manager_v2_svc" {
  yaml_body = <<YAML
apiVersion: v1
kind: Service
metadata:
  name: lab-manager-v2-api-svc
  namespace: lab-manager-v2
spec:
  type: NodePort
  selector:
    app: lab-manager-v2-api
  ports:
  - port: 80
    targetPort: 8080
YAML

  depends_on = [kubectl_manifest.lab_manager_v2_namespace]
}
```

2. **Apply Terraform**:
```bash
terraform apply
```

3. **Trigger Build** (or push code):
```bash
# Push code to trigger build, or manually trigger:
gcloud builds triggers run deploy-lab-manager-v2-api --region=us-east1
```

### Option B: Deploy to Cloud Run (Alternative)

If you prefer Cloud Run deployment, you can modify the Cloud Build trigger to deploy to Cloud Run instead of GKE.

## Step 4: Verify Deployment

### Check Attack Client Image
```bash
# List images in Artifact Registry
gcloud artifacts docker images list \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/amplify-lab-repo \
  --include-tags \
  --filter="package=attack-client"

# Should show: attack-client:latest
```

### Check Lab Manager v2 Deployment
```bash
# Get cluster credentials
gcloud container clusters get-credentials ${CLUSTER_NAME} \
  --zone=${ZONE} \
  --project=${PROJECT_ID}

# Check deployment
kubectl -n lab-manager-v2 get deployments
kubectl -n lab-manager-v2 get pods

# Check logs
kubectl -n lab-manager-v2 logs -l app=lab-manager-v2-api
```

## Step 5: Update Lab Manager Config to Use Attack Client Image

The lab manager v2's `config.py` expects `ATTACK_CLIENT_IMAGE` to be set. Update your deployment to use:

```
ATTACK_CLIENT_IMAGE={region}-docker.pkg.dev/{project_id}/amplify-lab-repo/attack-client:latest
```

This is already configured in the Kubernetes deployment example above.

## Automated Builds

Once configured, both services will automatically build on:
- **Attack Client**: Push to `main` branch in `amplify-attack-client` repo
- **Lab Manager v2**: Push to `main` branch in your terraform/manager repo

## Troubleshooting

### Attack Client Build Fails
1. Check Cloud Build logs: `gcloud builds list --limit=5`
2. Verify GitHub connection: `gcloud builds connections list`
3. Verify Dockerfile exists in repo root
4. Check service account permissions

### Lab Manager v2 Build Fails
1. Verify path to Dockerfile is correct in trigger
2. Check if code is in the expected repo location
3. Verify service account has required permissions
4. Check Kubernetes RBAC if deploying to GKE

### Image Not Found When Creating Cloud Run Services
- Ensure attack-client image is built first
- Verify image name matches: `attack-client:latest`
- Check Artifact Registry permissions
- Verify project ID and region are correct

## Next Steps

1. Set up frontend build (if separate from backend)
2. Configure Ingress/DNS for lab-manager-v2 API
3. Set up monitoring and logging
4. Configure CI/CD for testing
