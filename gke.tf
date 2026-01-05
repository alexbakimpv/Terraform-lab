resource "google_container_cluster" "primary" {
  name                = "amplify-lab-cluster"
  location            = var.zone
  deletion_protection = false

  # Remove default pool to use a custom managed one below
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.subnet_gke.id

  # VPC-native networking (Required for Elastic WAF & Pod IPs)
  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  # --- CRITICAL FIX: Enable Workload Identity on the Cluster ---
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = "REGULAR"
  }

  # Ensure APIs are ready before creating
  depends_on = [google_project_service.apis]
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "amplify-node-pool"
  location   = var.zone
  cluster    = google_container_cluster.primary.name
  node_count = 1

  autoscaling {
    min_node_count = 1
    max_node_count = 3
  }

  node_config {
    machine_type = "e2-standard-2"
    spot         = true

    # Google recommends custom SAs for nodes, not default compute
    service_account = google_service_account.gke_node_sa.email

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]


    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      env = "amplify-lab"
    }
  }
}