# Attack Client Cloud Build trigger
# Builds from https://github.com/alexbakimpv/amplify-attack-client
# Builds Docker image and pushes to Artifact Registry
# Cloud Run services (created by lab manager) will use this image

# Repository Link
resource "google_cloudbuildv2_repository" "attack_client_repo" {
  location          = var.region
  name              = "amplify-attack-client-repo"
  parent_connection = google_cloudbuildv2_connection.github_conn.name
  remote_uri        = "https://github.com/alexbakimpv/amplify-attack-client.git"

  depends_on = [google_cloudbuildv2_connection.github_conn]
}

# Service Account for Attack Client builds
resource "google_service_account" "attack_client_build_sa" {
  account_id   = "amplify-attack-client-builder"
  display_name = "Service Account for Attack Client Cloud Build"
}

# Grant required roles
resource "google_project_iam_member" "attack_client_build_sa_roles" {
  for_each = toset([
    "roles/cloudbuild.builds.builder",
    "roles/logging.logWriter",
    "roles/artifactregistry.writer",
  ])
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.attack_client_build_sa.email}"
}

# Cloud Build Trigger
resource "google_cloudbuild_trigger" "attack_client_deploy_trigger" {
  name     = "deploy-attack-client"
  location = var.region

  service_account = google_service_account.attack_client_build_sa.id

  repository_event_config {
    repository = google_cloudbuildv2_repository.attack_client_repo.id
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
        "-t",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/attack-client:latest",
        "-t",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/attack-client:$SHORT_SHA",
        "."
      ]
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/attack-client:latest"
      ]
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/attack-client:$SHORT_SHA"
      ]
    }
  }

  depends_on = [
    google_cloudbuildv2_repository.attack_client_repo,
    google_artifact_registry_repository.lab_repo
  ]
}
