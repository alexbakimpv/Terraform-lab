# Manager UI Cloud Build trigger (frontend/)
# Builds from frontend/Dockerfile and deploys to GKE.

# Reuse your existing github connection:
# google_cloudbuildv2_connection.github_conn

# 1) Repository link
resource "google_cloudbuildv2_repository" "manager_repo" {
  location          = var.region
  name              = "appsec-unilab-manager-repo"
  parent_connection = google_cloudbuildv2_connection.github_conn.name
  remote_uri        = "https://github.com/alexbakimpv/appsec-unilab-manager.git"
}

# 2) Build SA
resource "google_service_account" "manager_ui_build_sa" {
  account_id   = "amplify-manager-ui-builder"
  display_name = "Service Account for Amplify Manager UI Cloud Build"
}

resource "google_project_iam_member" "manager_ui_build_sa_roles" {
  for_each = toset([
    "roles/cloudbuild.builds.builder",
    "roles/logging.logWriter",
    "roles/artifactregistry.writer",
    "roles/container.developer" # needed for get-credentials + kubectl to GKE
  ])
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.manager_ui_build_sa.email}"
}

# 3) Give this SA Kubernetes RBAC (cluster-admin for now; tighten later)
resource "kubectl_manifest" "manager_ui_build_rbac" {
  yaml_body = <<YAML
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: manager-ui-cloudbuild-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: "serviceAccount:${google_service_account.manager_ui_build_sa.email}"
YAML

  depends_on = [google_container_cluster.primary]
}

# 4) Trigger: build/push UI image from frontend/ and restart deployment
resource "google_cloudbuild_trigger" "manager_ui_deploy_trigger" {
  name     = "deploy-amplify-manager-ui"
  location = var.region

  service_account = google_service_account.manager_ui_build_sa.id

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
        "-f", "frontend/Dockerfile",
        "-t",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/amplify-manager-ui:latest",
        "frontend"
      ]
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/amplify-manager-ui:latest"
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
          "kubectl -n amplify-manager rollout restart deployment/amplify-manager-ui; ",
          "kubectl -n amplify-manager rollout status deployment/amplify-manager-ui --timeout=300s"
        ])
      ]
    }
  }

  depends_on = [
    google_cloudbuildv2_repository.manager_repo,
    kubectl_manifest.manager_ui_build_rbac
  ]
}
