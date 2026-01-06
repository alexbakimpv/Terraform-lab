# Lab Manager API (FastAPI) on GKE
#
# Mirrors the existing AIR / Manager UI pattern:
# - GKE Ingress (L7) + NodePort Service + NEG annotation
# - Static Global IP
# - TLS via the existing wildcard secret: lab-wildcard-tls

resource "google_compute_global_address" "manager_api_ingress_ip" {
  name = "manager-api-ingress-ip"
}

# K8s ServiceAccount (Workload Identity -> google_service_account.lab_manager_sa)
resource "kubectl_manifest" "manager_api_ksa" {
  yaml_body = <<YAML
apiVersion: v1
kind: ServiceAccount
metadata:
  name: lab-manager
  namespace: amplify-manager
  annotations:
    iam.gke.io/gcp-service-account: "${google_service_account.lab_manager_sa.email}"
YAML

  depends_on = [kubectl_manifest.ns_amplify_manager]
}

resource "kubectl_manifest" "manager_api_deploy" {
  yaml_body = <<YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: amplify-manager-api
  namespace: amplify-manager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: amplify-manager-api
  template:
    metadata:
      labels:
        app: amplify-manager-api
    spec:
      serviceAccountName: lab-manager
      containers:
      - name: api
        image: "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/amplify-manager-api:latest"
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
        env:
        - name: GCP_PROJECT
          value: "${var.project_id}"
        - name: FIRESTORE_DB
          value: "(default)"
        - name: LABS_COLLECTION
          value: "labs"
        - name: USERS_COLLECTION
          value: "users"
        - name: INVITES_COLLECTION
          value: "invites"

        - name: CORS_ALLOW_ORIGINS
          value: "https://manager.lab.amplifys.us,http://localhost:5173"
        - name: LAB_MANAGER_AUTH_TOKEN_SECRET_NAME
          value: "lab-manager-auth-token"
        - name: AUTH_SECRET_SECRET_NAME
          value: "lab-manager-auth-token"
        - name: GCP_REGION
          value: "${var.region}"
        - name: DNS_ZONE_NAME
          value: "${google_dns_managed_zone.lab_zone.name}"
        - name: DNS_ZONE_DOMAIN
          value: "${trim(google_dns_managed_zone.lab_zone.dns_name, ".")}"
        - name: AIR_ORIGIN_HOSTNAME
          value: "${trim(google_dns_record_set.air_origin.name, ".")}"
        - name: ATTACK_CLIENT_IMAGE
          value: "us-docker.pkg.dev/cloudrun/container/hello"
        - name: RESEND_API_KEY_SECRET_NAME
          value: "resend-key"
        - name: MANAGER_URL
          value: "https://manager.lab.amplifys.us"

YAML

  depends_on = [kubectl_manifest.manager_api_ksa]
}

resource "kubectl_manifest" "manager_api_svc" {
  yaml_body = <<YAML
apiVersion: v1
kind: Service
metadata:
  name: amplify-manager-api-svc
  namespace: amplify-manager
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: NodePort
  selector:
    app: amplify-manager-api
  ports:
  - port: 80
    targetPort: 8080
YAML

  depends_on = [kubectl_manifest.manager_api_deploy]
}

resource "kubectl_manifest" "manager_api_ingress" {
  yaml_body = <<YAML
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: amplify-manager-api-ing
  namespace: amplify-manager
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "${google_compute_global_address.manager_api_ingress_ip.name}"
spec:
  tls:
  - secretName: lab-wildcard-tls
    hosts:
    - manager-api.lab.amplifys.us
  rules:
  - host: manager-api.lab.amplifys.us
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: amplify-manager-api-svc
            port:
              number: 80
YAML

  depends_on = [kubectl_manifest.manager_api_svc]
}
