resource "incapsula_site" "air_site" {
  domain = "air.lab.amplifys.us"

  # Sources IP directly from state (34.107.239.76)
  site_ip = google_compute_global_address.air_ingress_ip.address

  # Force SSL is supported at the top level
  force_ssl = true

  depends_on = [google_dns_record_set.air_origin]
}