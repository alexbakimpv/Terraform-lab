############################################
# Imperva site: manager-api.lab.amplifys.us
############################################

resource "incapsula_site" "manager_api_site" {
  domain    = "manager-api.lab.amplifys.us"
  site_ip   = google_compute_global_address.manager_api_ingress_ip.address
  force_ssl = true
}
