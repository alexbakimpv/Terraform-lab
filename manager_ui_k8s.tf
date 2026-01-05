# Static IP for Manager UI Ingress
resource "google_compute_global_address" "manager_ui_ingress_ip" {
  name = "manager-ui-ingress-ip"
}

# Namespace (modular)
resource "kubectl_manifest" "ns_amplify_manager" {
  yaml_body = <<YAML
apiVersion: v1
kind: Namespace
metadata:
  name: amplify-manager
YAML
}

# Deployment (THIS is where step #2 goes: imagePullPolicy: Always)
resource "kubectl_manifest" "manager_ui_deploy" {
  yaml_body = <<YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: amplify-manager-ui
  namespace: amplify-manager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: amplify-manager-ui
  template:
    metadata:
      labels:
        app: amplify-manager-ui
    spec:
      containers:
      - name: ui
        image: "us-east1-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/amplify-manager-ui:latest"
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
YAML

  wait_for_rollout = false
  depends_on       = [kubectl_manifest.ns_amplify_manager]
}

resource "kubectl_manifest" "manager_ui_svc" {
  yaml_body = <<YAML
apiVersion: v1
kind: Service
metadata:
  name: amplify-manager-ui-svc
  namespace: amplify-manager
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: NodePort
  selector:
    app: amplify-manager-ui
  ports:
  - port: 80
    targetPort: 8080
YAML

  depends_on = [kubectl_manifest.manager_ui_deploy]
}

resource "kubectl_manifest" "manager_ui_ingress" {
  yaml_body  = <<YAML
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: amplify-manager-ui-ing
  namespace: amplify-manager
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "${google_compute_global_address.manager_ui_ingress_ip.name}"
spec:
  tls:
  - secretName: lab-wildcard-tls
    hosts:
    - manager.lab.amplifys.us
  rules:
  - host: manager.lab.amplifys.us
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: amplify-manager-ui-svc
            port:
              number: 80
YAML
  depends_on = [kubectl_manifest.manager_ui_svc]
}