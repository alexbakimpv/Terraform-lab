# --- 1. Identity for Cert-Manager ---
resource "google_service_account" "cert_manager_sa" {
  account_id   = "cert-manager-sa"
  display_name = "Cert Manager Service Account"
}

# Allow Cert-Manager to modify Cloud DNS (Required for DNS-01 challenges)
resource "google_project_iam_member" "cert_manager_dns_admin" {
  project = var.project_id
  role    = "roles/dns.admin"
  member  = "serviceAccount:${google_service_account.cert_manager_sa.email}"
}

# Bind K8s SA to Google SA (Workload Identity)
resource "google_service_account_iam_member" "cert_manager_workload_identity" {
  service_account_id = google_service_account.cert_manager_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[cert-manager/cert-manager]"
}

# --- 2. Install Cert-Manager via Helm ---
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = "v1.14.0"
  namespace        = "cert-manager"
  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }
  set {
    name  = "serviceAccount.annotations.iam\\.gke\\.io/gcp-service-account"
    value = google_service_account.cert_manager_sa.email
  }
}

# --- 3. Configure the Issuer ---
# This tells Cert-Manager to use Cloud DNS for verification
resource "kubectl_manifest" "letsencrypt_issuer" {
  depends_on = [helm_release.cert_manager]
  yaml_body  = <<YAML
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: admin@amplifys.us
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - dns01:
        cloudDNS:
          project: ${var.project_id}
YAML
}

# --- 4. The "One Ring" Certificate ---
resource "kubectl_manifest" "wildcard_cert" {
  depends_on = [kubectl_manifest.letsencrypt_issuer]
  yaml_body  = <<YAML
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: lab-wildcard-cert
  namespace: amplify-air
spec:
  secretName: lab-wildcard-tls
  secretTemplate:
    annotations:
      reflector.v1.k8s.emberstack.com/reflection-allowed: "true"
      reflector.v1.k8s.emberstack.com/reflection-auto-enabled: "true"
      reflector.v1.k8s.emberstack.com/reflection-allowed-namespaces: ""
      reflector.v1.k8s.emberstack.com/reflection-auto-namespaces: ""
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  commonName: "*.lab.amplifys.us"
  dnsNames:
  - "*.lab.amplifys.us"
  - "*.air.lab.amplifys.us"
  - "*.api.lab.amplifys.us"
  - "*.buy.lab.amplifys.us"
  - "*.city.lab.amplifys.us"
  - "*.health.lab.amplifys.us"
  - "*.money.lab.amplifys.us"
  - "*.tix.lab.amplifys.us"
  - "*.client.lab.amplifys.us"
YAML
}