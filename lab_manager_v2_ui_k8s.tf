resource "google_compute_global_address" "lab_manager_v2_ui_ingress_ip" {
  name = "lab-manager-v2-ui-ingress-ip"
}

resource "kubectl_manifest" "ns_amplify_manager" {
  yaml_body = <<YAML
apiVersion: v1
kind: Namespace
metadata:
  name: amplify-manager
YAML
}

resource "kubectl_manifest" "lab_manager_v2_ui_deploy" {
  yaml_body = <<YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lab-manager-v2-ui
  namespace: amplify-manager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lab-manager-v2-ui
  template:
    metadata:
      labels:
        app: lab-manager-v2-ui
    spec:
      containers:
      - name: ui
        image: "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/lab-manager-v2-ui:latest"
        imagePullPolicy: Always
        ports:
        - containerPort: 80
YAML

  wait_for_rollout = false
  depends_on       = [kubectl_manifest.ns_amplify_manager]
}

resource "kubectl_manifest" "lab_manager_v2_ui_svc" {
  yaml_body = <<YAML
apiVersion: v1
kind: Service
metadata:
  name: lab-manager-v2-ui-svc
  namespace: amplify-manager
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: NodePort
  selector:
    app: lab-manager-v2-ui
  ports:
  - port: 80
    targetPort: 80
YAML

  depends_on = [kubectl_manifest.lab_manager_v2_ui_deploy]
}

resource "kubectl_manifest" "lab_manager_v2_ui_ingress" {
  yaml_body  = <<YAML
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lab-manager-v2-ui-ing
  namespace: amplify-manager
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "${google_compute_global_address.lab_manager_v2_ui_ingress_ip.name}"
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
            name: lab-manager-v2-ui-svc
            port:
              number: 80
YAML
  depends_on = [kubectl_manifest.lab_manager_v2_ui_svc]
}
