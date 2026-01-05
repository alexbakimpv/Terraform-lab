resource "google_dns_managed_zone" "lab_zone" {
  name        = "appsec-unilab-zone"
  dns_name    = "lab.amplifys.us."
  description = "Managed zone for AppSec-UniLab victims and portal"
  visibility  = "public"

  labels = {
    project = "appsec-unilab"
  }
}

output "lab_name_servers" {
  description = "The nameservers for the lab subdomain. Add these to the parent domain NS records."
  value       = google_dns_managed_zone.lab_zone.name_servers
}