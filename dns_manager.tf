# Primary protected hostname -> Imperva protected CNAME
resource "google_dns_record_set" "manager_primary" {
  name         = "manager.${google_dns_managed_zone.lab_zone.dns_name}"
  managed_zone = google_dns_managed_zone.lab_zone.name
  type         = "CNAME"
  ttl          = 300

  # Imperva value needs trailing dot
  rrdatas = ["${incapsula_site.manager_site.dns_cname_record_value}."]
}

# Optional: Imperva ownership validation TXT (only if Imperva asks for it)
resource "google_dns_record_set" "manager_imperva_validation" {
  count = var.manager_imperva_validation_txt_name != "" ? 1 : 0

  name         = var.manager_imperva_validation_txt_name
  managed_zone = google_dns_managed_zone.lab_zone.name
  type         = "TXT"
  ttl          = 300
  rrdatas      = [var.manager_imperva_validation_txt_value]
}