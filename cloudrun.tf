# This file is NOW ONLY for the Attack Client (Traffic Generator).
# The Lab Manager has been moved to GKE.

resource "google_cloud_run_v2_service" "attack_client" {
  name     = "attack-client"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.attack_client_sa.email

    containers {
      # Placeholder image - we will deploy the real Python client later
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      env {
        name  = "ROLE"
        value = "ATTACKER"
      }
    }
  }
}