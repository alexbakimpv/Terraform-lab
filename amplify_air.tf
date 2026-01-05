# 1. Public IP Resource
resource "google_compute_global_address" "air_ingress_ip" {
  name = "air-ingress-ip"
}

# 2. Namespace
resource "kubectl_manifest" "air_namespace" {
  yaml_body = <<YAML
apiVersion: v1
kind: Namespace
metadata:
  name: amplify-air
YAML
}

# 3. Deployment (The App)
resource "kubectl_manifest" "air_deployment" {
  yaml_body        = <<YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: amplify-air
  namespace: amplify-air
  labels:
    app: amplify-air
spec:
  replicas: 1
  selector:
    matchLabels:
      app: amplify-air
  template:
    metadata:
      labels:
        app: amplify-air
    spec:
      containers:
      - name: air-container
        # Uses your dynamic repository variables
        image: "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/amplify-air:latest"
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /
            port: 8080
        livenessProbe:
          httpGet:
            path: /
            port: 8080
YAML
  wait_for_rollout = false
  depends_on       = [kubectl_manifest.air_namespace]
}

# 4. Service (The Bridge)
resource "kubectl_manifest" "air_service" {
  yaml_body  = <<YAML
apiVersion: v1
kind: Service
metadata:
  name: amplify-air-svc
  namespace: amplify-air
  annotations:
    # CRITICAL: This enables NEG (Network Endpoint Groups) for healthy load balancing
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: NodePort
  selector:
    app: amplify-air
  ports:
  - port: 80
    targetPort: 8080
YAML
  depends_on = [kubectl_manifest.air_namespace]
}

# 5. Ingress (The HTTPS Router)
resource "kubectl_manifest" "air_ingress" {
  yaml_body  = <<YAML
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: amplify-air-ing
  namespace: amplify-air
  annotations:
    # Connects to the Static IP we created in step 1
    kubernetes.io/ingress.global-static-ip-name: "air-ingress-ip"
    # REMOVED: networking.gke.io/managed-certificates (We use the wildcard secret instead)
spec:
  # --- THIS APPLIES YOUR WILDCARD CERTIFICATE ---
  tls:
  - secretName: lab-wildcard-tls
    hosts:
    - air.lab.amplifys.us
    - air-origin.lab.amplifys.us
  # ----------------------------------------------
  rules:
  - host: air.lab.amplifys.us
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: amplify-air-svc
            port:
              number: 80
  # We also route the Origin domain so it uses the same cert
  - host: air-origin.lab.amplifys.us
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: amplify-air-svc
            port:
              number: 80
YAML
  depends_on = [kubectl_manifest.air_service]
}