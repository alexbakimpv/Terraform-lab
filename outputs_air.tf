output "air_imperva_protected_cname" {
  description = "The CNAME provided by Imperva to point the public DNS to."
  # FIXED: Use 'dns_cname_record_value'
  value = incapsula_site.air_site.dns_cname_record_value
}

output "air_origin_hostname" {
  description = "The permanent origin FQDN pointing to the direct IP."
  value       = trim(google_dns_record_set.air_origin.name, ".")
}
