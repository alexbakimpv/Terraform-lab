############################################
# Outputs: Lab Manager V2 API endpoint plumbing
############################################

output "lab_manager_v2_api_ingress_ip" {
  value = google_compute_global_address.lab_manager_v2_ingress_ip.address
}

output "lab_manager_v2_api_imperva_cname_target" {
  value = incapsula_site.lab_manager_v2_api_site.dns_cname_record_value
}
