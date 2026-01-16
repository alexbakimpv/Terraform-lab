# Lab Manager v2 API (FastAPI) on GKE
#
# Deploys lab-manager-v2-api to the amplify-manager namespace
# Uses Workload Identity with sa-lab-manager service account

# Static IP for Lab Manager v2 API Ingress
resource "google_compute_global_address" "lab_manager_v2_ingress_ip" {
  name = "lab-manager-v2-ingress-ip"
}

# K8s ServiceAccount (Workload Identity -> google_service_account.lab_manager_sa)
# Reusing the existing lab-manager service account in amplify-manager namespace
# (Already created in manager_api_k8s.tf, but we'll reference it)

# Deployment
resource "kubectl_manifest" "lab_manager_v2_deploy" {
  yaml_body = <<YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lab-manager-v2-api
  namespace: amplify-manager
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
      serviceAccountName: lab-manager
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
          value: "https://manager.lab.amplifys.us"
        # JWT_SECRET_KEY and RESEND_API_KEY are automatically loaded from Secret Manager
        # if not set as environment variables. Secrets used:
        # - lab-manager-auth-token (for JWT)
        # - resend-key (for Resend API)
YAML

  depends_on = [
    kubectl_manifest.ns_amplify_manager,
    kubectl_manifest.manager_api_ksa
  ]
}

# Service
resource "kubectl_manifest" "lab_manager_v2_svc" {
  yaml_body = <<YAML
apiVersion: v1
kind: Service
metadata:
  name: lab-manager-v2-api-svc
  namespace: amplify-manager
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: NodePort
  selector:
    app: lab-manager-v2-api
  ports:
  - port: 80
    targetPort: 8080
YAML

  depends_on = [kubectl_manifest.lab_manager_v2_deploy]
}

# Ingress
resource "kubectl_manifest" "lab_manager_v2_ingress" {
  yaml_body = <<YAML
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lab-manager-v2-api-ing
  namespace: amplify-manager
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "${google_compute_global_address.lab_manager_v2_ingress_ip.name}"
spec:
  tls:
  - secretName: lab-wildcard-tls
    hosts:
    - lab-manager-v2-api.lab.amplifys.us
  rules:
  - host: lab-manager-v2-api.lab.amplifys.us
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lab-manager-v2-api-svc
            port:
              number: 80
YAML

  depends_on = [kubectl_manifest.lab_manager_v2_svc]
}
