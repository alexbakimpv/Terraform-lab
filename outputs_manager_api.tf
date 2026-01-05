############################################
# Outputs: Manager API endpoint plumbing
############################################

output "manager_api_ingress_ip" {
  value = google_compute_global_address.manager_api_ingress_ip.address
}

output "manager_api_imperva_cname_target" {
  value = incapsula_site.manager_api_site.dns_cname_record_value
}
