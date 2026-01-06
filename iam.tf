# --- 1. GKE Node Service Account (The Hardware) ---
resource "google_service_account" "gke_node_sa" {
  account_id   = "sa-gke-node"
  display_name = "GKE Node Service Account"
}

# Basic Logging/Monitoring/Registry for Nodes
resource "google_project_iam_member" "node_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/artifactregistry.reader"
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_node_sa.email}"
}

# --- 2. Lab Manager Identity (The Brain) ---
resource "google_service_account" "lab_manager_sa" {
  account_id   = "sa-lab-manager"
  display_name = "Lab Manager Service Account"
}

# Grant "The Brain" power over DNS, Secrets, and Cloud Run
resource "google_project_iam_member" "manager_roles" {
  for_each = toset([
    "roles/dns.admin",
    "roles/secretmanager.secretAccessor",
    "roles/datastore.user",  # Firestore Native mode access (this role works for both Datastore and Firestore Native)
    "roles/run.admin"        # Create and manage Cloud Run services
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.lab_manager_sa.email}"
}

# Workload Identity Binding
# Allows K8s SA "lab-manager" in namespace "default" to act as this Google SA
resource "google_service_account_iam_member" "lab_manager_wi" {
  service_account_id = google_service_account.lab_manager_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/lab-manager]"
}


# Workload Identity Binding (amplify-manager namespace)
# Allows K8s SA "lab-manager" in namespace "amplify-manager" to act as this Google SA
resource "google_service_account_iam_member" "lab_manager_wi_amplify_manager" {
  service_account_id = google_service_account.lab_manager_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[amplify-manager/lab-manager]"
}

# --- 3. Attack Client Identity ---
resource "google_service_account" "attack_client_sa" {
  account_id   = "sa-attack-client"
  display_name = "Attack Client Service Account"
}