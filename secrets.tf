# This creates the Secret Manager resources (the "Boxes")
# The VALUES are populated by bootstrap_secrets.sh, avoiding the Terraform State file.

locals {
  required_secrets = [
    "imperva-api-id",
    "imperva-api-key",
    "openai-api-key",
    "github-pat",
    "supabase-url",
    "supabase-anon-key",
    "lab-manager-auth-token",
    "ns1-api-key",
    "resend-api-key"
  ]
}

resource "google_secret_manager_secret" "lab_secrets" {
  for_each  = toset(local.required_secrets)
  secret_id = each.value

  replication {
    auto {}
  }

  # Ensure APIs are on first
  depends_on = [google_project_service.apis]
}

# Use terraform_data for TF 1.4+, otherwise null_resource
resource "terraform_data" "bootstrap_secrets" {
  # This ensures it runs only AFTER all secrets in the map are created
  depends_on = [google_secret_manager_secret.lab_secrets]

  provisioner "local-exec" {
    # manual prompt instead to ask user to deploy ./bootstrap_secrets.v2.sh before continueing with other services that depends on the secrets existing in the boxes.
    command = "echo '******PAUSE*******: if this is your first execution, please run bootstrap_secrets.v2.sh in another terminal now. Otherwise you can ignore'"

  }
}