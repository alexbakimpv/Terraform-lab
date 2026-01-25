data "google_project" "project" {}

# 1. IAM: Connection Service Agent access to PAT
resource "google_secret_manager_secret_iam_member" "cb_service_agent_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.lab_secrets["github-pat"].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudbuild.iam.gserviceaccount.com"
}

# 2. Connection
resource "google_cloudbuildv2_connection" "github_conn" {
  location = var.region
  name     = "github-connection"

  github_config {
    app_installation_id = 101536077
    authorizer_credential {
      # This is the line that fails if the secret is empty
      oauth_token_secret_version = "projects/${var.project_id}/secrets/github-pat/versions/latest"
    }
  }

  # This ensures theuser runs the script  and populates the PAT before this resource is created
  depends_on = [
    google_secret_manager_secret_iam_member.cb_service_agent_accessor,
    terraform_data.bootstrap_secrets
  ]
}

# 3. Repository Link
resource "google_cloudbuildv2_repository" "air_repo" {
  location          = var.region
  name              = "amplify-air-repo"
  parent_connection = google_cloudbuildv2_connection.github_conn.name
  remote_uri        = "https://github.com/alexbakimpv/amplifychat-1eee5cdc.git"
}

# 4. USER-MANAGED SERVICE ACCOUNT FOR REGIONAL BUILD
# This replaces the default Google-managed account for the regional trigger
resource "google_service_account" "air_build_sa" {
  account_id   = "amplify-air-builder"
  display_name = "Service Account for Amplify AIR Cloud Build"
}

# Grant required roles to the new Service Account
resource "google_project_iam_member" "air_build_sa_roles" {
  for_each = toset([
    "roles/cloudbuild.builds.builder", # Ability to run builds
    "roles/logging.logWriter",         # Mandatory: must have logging permissions to run
    "roles/artifactregistry.writer"    # Permission to push to your lab repo
  ])
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.air_build_sa.email}"
}

# 5. Trigger
resource "google_cloudbuild_trigger" "air_deploy_trigger" {
  name     = "deploy-amplify-air"
  location = var.region

  # Use the user-managed service account ID
  service_account = google_service_account.air_build_sa.id

  repository_event_config {
    repository = google_cloudbuildv2_repository.air_repo.id
    push {
      branch = "^main$"
    }
  }

  build {
    # Mandatory for user-managed service accounts
    options {
      logging = "CLOUD_LOGGING_ONLY"
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["build", "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/amplify-air:latest", "."]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.lab_repo.repository_id}/amplify-air:latest"]
    }
    step {
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk"
      entrypoint = "bash"
      args = [
        "-c",
        <<-EOT
        gcloud container clusters get-credentials amplify-lab-cluster --zone us-east1-b --project "$PROJECT_ID"
        kubectl -n amplify-air rollout restart deployment/amplify-air
        kubectl -n amplify-air rollout status deployment/amplify-air
        EOT
      ]
    }
  }

  depends_on = [google_cloudbuildv2_repository.air_repo]
}