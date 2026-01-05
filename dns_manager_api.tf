############################################
# DNS: manager-api.lab.amplifys.us -> Imperva protected CNAME
############################################

resource "google_dns_record_set" "manager_api_primary" {
  name         = "manager-api.${google_dns_managed_zone.lab_zone.dns_name}"
  managed_zone = google_dns_managed_zone.lab_zone.name
  type         = "CNAME"
  ttl          = 300

  # Imperva wants a trailing dot for the target.
  rrdatas = ["${incapsula_site.manager_api_site.dns_cname_record_value}."]
}

# Optional: Imperva TXT validation (only if Imperva asks for it for this site)
resource "google_dns_record_set" "manager_api_imperva_validation" {
  count = var.manager_api_imperva_validation_txt_name != "" ? 1 : 0

  name         = var.manager_api_imperva_validation_txt_name
  managed_zone = google_dns_managed_zone.lab_zone.name
  type         = "TXT"
  ttl          = 300
  rrdatas      = [var.manager_api_imperva_validation_txt_value]
}
