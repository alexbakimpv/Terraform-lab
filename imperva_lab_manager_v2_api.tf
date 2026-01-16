############################################
# Imperva site: lab-manager-v2-api.lab.amplifys.us
############################################

resource "incapsula_site" "lab_manager_v2_api_site" {
  domain    = "lab-manager-v2-api.lab.amplifys.us"
  site_ip   = google_compute_global_address.lab_manager_v2_ingress_ip.address
  force_ssl = true
}
