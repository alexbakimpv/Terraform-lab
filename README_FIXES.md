Fixes for your current plan errors
==================================

1) Firestore variable missing
- Add variables_firestore.tf (included) OR add the variable to your existing variables file.

2) incapsula_site.manager_api_site undeclared
- Add imperva_manager_api.tf (included).
- Ensure you have manager_api_k8s.tf (or equivalent) that defines:
    google_compute_global_address.manager_api_ingress_ip

3) "Unsupported block type" in main.tf
- You accidentally placed a `resource "google_project_service" "firestore" { ... }` block INSIDE
  `resource "google_compute_subnetwork" "subnet_gke" { ... }` around main.tf line ~99.
- Delete that nested resource entirely.
- Instead, make sure your existing `google_project_service.apis` (for_each list/set) includes:
    firestore.googleapis.com

4) google-beta provider
- Your root must have a google-beta provider configured, because firestore indexes use google_beta_firestore_index.
