resource "google_compute_firewall" "allow_lb_health_check" {
  name        = "allow-google-health-checks"
  description = "Allow Google Load Balancer to access backend pods for health checks"

  # DYNAMIC REFERENCE:

  network = google_compute_network.vpc.name

  # Google's official Load Balancer IP ranges (Global + Regional)
  source_ranges = [
    "130.211.0.0/22",
    "35.191.0.0/16"
  ]

  # Allow traffic to the Pods (8080) and standard NodePorts (30000-32767)
  allow {
    protocol = "tcp"
    ports    = ["8080", "10256", "30000-32767"]
  }

  # We apply this to the whole VPC to ensure all Nodes are covered
  # (Since your GKE cluster is the primary tenant of this VPC)
}