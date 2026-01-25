resource "google_cloudbuildv2_repository" "manager_repo" {
  location          = var.region
  name              = "appsec-unilab-manager-repo"
  parent_connection = google_cloudbuildv2_connection.github_conn.name
  remote_uri        = "https://github.com/alexbakimpv/appsec-unilab-manager.git"
}

resource "google_service_account" "lab_manager_v2_ui_build_sa" {
  account_id   = "lab-manager-v2-ui-builder"
  display_name = "Service Account for Lab Manager v2 UI Cloud Build"
}

resource "google_project_iam_member" "lab_manager_v2_ui_build_sa_roles" {
  for_each = toset([
    "roles/cloudbuild.builds.builder",
    "roles/logging.logWriter",
    "roles/artifactregistry.writer",
    "roles/container.developer",
  ])
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.lab_manager_v2_ui_build_sa.email}"
}

resource "kubectl_manifest" "lab_manager_v2_ui_build_rbac" {
  yaml_body = <<YAML
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: lab-manager-v2-ui-cloudbuild-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: "serviceAccount:${google_service_account.lab_manager_v2_ui_build_sa.email}"
YAML

  depends_on = [google_container_cluster.primary]
}

resource "google_cloudbuild_trigger" "lab_manager_v2_ui_deploy_trigger" {
  name     = "deploy-lab-manager-v2-ui"
  location = var.region

  service_account = google_service_account.lab_manager_v2_ui_build_sa.id

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
        "--build-arg", "VITE_API_BASE_URL=https://lab-manager-v2-api.lab.amplifys.us/api/v1",
        "-t",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/lab-manager-v2-ui:latest",
        "frontend"
      ]
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/lab-manager-v2-ui:latest"
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
          "kubectl -n amplify-manager rollout restart deployment/lab-manager-v2-ui; ",
          "kubectl -n amplify-manager rollout status deployment/lab-manager-v2-ui --timeout=300s"
        ])
      ]
    }
  }

  depends_on = [
    google_cloudbuildv2_repository.manager_repo,
    kubectl_manifest.lab_manager_v2_ui_build_rbac
  ]
}
