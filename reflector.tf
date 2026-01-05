# Namespace for cluster-wide add-ons
resource "kubectl_manifest" "ns_appsec_unilab_system" {
  yaml_body = <<YAML
apiVersion: v1
kind: Namespace
metadata:
  name: appsec-unilab-system
YAML
}

resource "helm_release" "reflector" {
  name       = "reflector"
  namespace  = "appsec-unilab-system"
  repository = "https://emberstack.github.io/helm-charts"
  chart      = "reflector"
  version    = "5.3.1"

  depends_on = [kubectl_manifest.ns_appsec_unilab_system]
}