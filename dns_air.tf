# 1. Create the PERMANENT Origin Record (A Record)
# This points to the static IP sourced from your state
resource "google_dns_record_set" "air_origin" {
  name         = "air-origin.${google_dns_managed_zone.lab_zone.dns_name}"
  managed_zone = google_dns_managed_zone.lab_zone.name
  type         = "A"
  ttl          = 300

  rrdatas = [google_compute_global_address.air_ingress_ip.address]
}

# 2. Update the Primary Domain to Route through Imperva (CNAME)
resource "google_dns_record_set" "air_primary" {
  name         = "air.${google_dns_managed_zone.lab_zone.dns_name}"
  managed_zone = google_dns_managed_zone.lab_zone.name
  type         = "CNAME"
  ttl          = 300

  # Point to the Imperva Protected CNAME. Have to add a trailing "." since imperva does not provide it.
  rrdatas = ["${incapsula_site.air_site.dns_cname_record_value}."]
}

# 3. Optional: Imperva Domain Ownership Validation (TXT)
resource "google_dns_record_set" "air_imperva_validation" {
  count = var.imperva_validation_txt_name != "" ? 1 : 0

  # Logic handles if the variable includes the trailing dot or not
  name = endswith(var.imperva_validation_txt_name, ".") ? var.imperva_validation_txt_name : "${var.imperva_validation_txt_name}.${google_dns_managed_zone.lab_zone.dns_name}"

  managed_zone = google_dns_managed_zone.lab_zone.name
  type         = "TXT"
  ttl          = 300
  rrdatas      = [var.imperva_validation_txt_value]
}
