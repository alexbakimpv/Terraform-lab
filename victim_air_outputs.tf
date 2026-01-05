output "cloud_build_trigger_id" {
  value = google_cloudbuild_trigger.air_deploy_trigger.trigger_id
}
output "project_id" {
  value       = var.project_id
  description = "The GCP Project ID used for the deployment"
}