resource "google_artifact_registry_repository" "lab_repo" {
  location      = var.region
  repository_id = "amplify-lab-repo"
  description   = "Docker repository for Amplify Lab images"
  format        = "DOCKER"
}
