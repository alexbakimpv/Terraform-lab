output "lab_zone_name" {
  description = "Cloud DNS managed zone resource name"
  value       = google_dns_managed_zone.lab_zone.name
}

output "lab_zone_dns_name" {
  description = "The DNS name of the delegated zone"
  value       = google_dns_managed_zone.lab_zone.dns_name
}

output "lab_zone_name_servers" {
  description = "Authoritative name servers for delegating lab.<parent> to Cloud DNS"
  value       = google_dns_managed_zone.lab_zone.name_servers
}
