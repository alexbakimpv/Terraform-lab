# Manager API Cloud Build trigger (backend/)
# Builds from backend/Dockerfile and deploys to GKE.

resource "google_service_account" "manager_api_build_sa" {
  account_id   = "amplify-manager-api-builder"
  display_name = "Service Account for Amplify Manager API Cloud Build"
}

resource "google_project_iam_member" "manager_api_build_sa_roles" {
  for_each = toset([
    "roles/cloudbuild.builds.builder",
    "roles/logging.logWriter",
    "roles/artifactregistry.writer",
    "roles/container.developer" # needed for get-credentials + kubectl to GKE
  ])
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.manager_api_build_sa.email}"
}

resource "kubectl_manifest" "manager_api_build_rbac" {
  yaml_body = <<YAML
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: manager-api-cloudbuild-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: "serviceAccount:${google_service_account.manager_api_build_sa.email}"
YAML

  depends_on = [google_container_cluster.primary]
}

# DISABLED: Replaced by lab-manager-v2
resource "google_cloudbuild_trigger" "manager_api_deploy_trigger" {
  name     = "deploy-amplify-manager-api"
  location = var.region
  disabled = true

  service_account = google_service_account.manager_api_build_sa.id

  repository_event_config {
    repository = google_cloudbuildv2_repository.manager_repo.id
    push {
      branch = "^main$"
    }
  }

  build {
    options { logging = "CLOUD_LOGGING_ONLY" }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-f", "backend/Dockerfile",
        "-t",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/amplify-manager-api:latest",
        "backend"
      ]
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/amplify-manager-api:latest"
      ]
    }

    step {
      name       = "gcr.io/cloud-builders/gcloud"
      entrypoint = "bash"
      args = [
        "-c",
        join("", [
          "set -euo pipefail; ",
          "gcloud container clusters get-credentials ", google_container_cluster.primary.name,
          " --project=", var.project_id,
          " --zone=", google_container_cluster.primary.location,
          "; ",
          "kubectl -n amplify-manager set image deployment/amplify-manager-api api=${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/amplify-manager-api:latest; ",
          "kubectl -n amplify-manager rollout status deployment/amplify-manager-api --timeout=120s"
        ])
      ]
    }
  }

  depends_on = [
    google_cloudbuildv2_repository.manager_repo,
    kubectl_manifest.manager_api_build_rbac
  ]
}
