# Lab Manager v2 API Cloud Build trigger (backend/)
# Builds from backend/Dockerfile in the manager repository
# Repository: https://github.com/alexbakimpv/appsec-unilab-manager.git

# Service Account for Lab Manager v2 builds
resource "google_service_account" "lab_manager_v2_build_sa" {
  account_id   = "lab-manager-v2-api-builder"
  display_name = "Service Account for Lab Manager v2 API Cloud Build"
}

# Grant required roles
resource "google_project_iam_member" "lab_manager_v2_build_sa_roles" {
  for_each = toset([
    "roles/cloudbuild.builds.builder",
    "roles/logging.logWriter",
    "roles/artifactregistry.writer",
    "roles/container.developer", # needed for get-credentials + kubectl to GKE
  ])
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.lab_manager_v2_build_sa.email}"
}

# Kubernetes RBAC (if deploying to GKE)
resource "kubectl_manifest" "lab_manager_v2_build_rbac" {
  yaml_body = <<YAML
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: lab-manager-v2-cloudbuild-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: "serviceAccount:${google_service_account.lab_manager_v2_build_sa.email}"
YAML

  depends_on = [google_container_cluster.primary]
}

# Cloud Build Trigger
# TODO: Update repository link based on where lab-manager-v2 code lives
# Option 1: If in same repo as terraform, use existing manager_repo
# Option 2: If separate repo, create new google_cloudbuildv2_repository resource
resource "google_cloudbuild_trigger" "lab_manager_v2_api_deploy_trigger" {
  name     = "deploy-lab-manager-v2-api"
  location = var.region

  service_account = google_service_account.lab_manager_v2_build_sa.id

  # Using manager_repo which contains the lab-manager-v2 code
  repository_event_config {
    repository = google_cloudbuildv2_repository.manager_repo.id
    push {
      branch = "^main$"
    }
  }

  build {
    options {
      logging = "CLOUD_LOGGING_ONLY"
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-f", "lab-manager-v2/backend/Dockerfile",
        "-t",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/lab-manager-v2-api:latest",
        "lab-manager-v2/backend"
      ]
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/lab-manager-v2-api:latest"
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
          "kubectl -n amplify-manager set image deployment/lab-manager-v2-api api=${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/lab-manager-v2-api:latest; ",
          "kubectl -n amplify-manager rollout status deployment/lab-manager-v2-api --timeout=120s"
        ])
      ]
    }
  }

  depends_on = [
    google_cloudbuildv2_repository.manager_repo,
    kubectl_manifest.lab_manager_v2_build_rbac
  ]
}
