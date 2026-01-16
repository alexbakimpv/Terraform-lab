############################################
# DNS: lab-manager-v2-api.lab.amplifys.us -> Imperva protected CNAME
############################################

resource "google_dns_record_set" "lab_manager_v2_api_primary" {
  name         = "lab-manager-v2-api.${google_dns_managed_zone.lab_zone.dns_name}"
  managed_zone = google_dns_managed_zone.lab_zone.name
  type         = "CNAME"
  ttl          = 300

  # Imperva wants a trailing dot for the target.
  rrdatas = ["${incapsula_site.lab_manager_v2_api_site.dns_cname_record_value}."]
}

# Optional: Imperva TXT validation (only if Imperva asks for it for this site)
resource "google_dns_record_set" "lab_manager_v2_api_imperva_validation" {
  count = var.lab_manager_v2_api_imperva_validation_txt_name != "" ? 1 : 0

  name         = var.lab_manager_v2_api_imperva_validation_txt_name
  managed_zone = google_dns_managed_zone.lab_zone.name
  type         = "TXT"
  ttl          = 300
  rrdatas      = [var.lab_manager_v2_api_imperva_validation_txt_value]
}
