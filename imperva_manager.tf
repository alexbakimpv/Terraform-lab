resource "incapsula_site" "manager_site" {
  domain    = "manager.lab.amplifys.us"
  site_ip   = google_compute_global_address.lab_manager_v2_ui_ingress_ip.address
  force_ssl = true
}