# The air_origin_ip variable has been removed to stop prompts. 
# The IP is now sourced directly from the google_compute_global_address resource.

variable "imperva_validation_txt_name" {
  description = "The DNS TXT record name required by Imperva for domain ownership validation (if applicable)."
  type        = string
  default     = ""
}

variable "imperva_validation_txt_value" {
  description = "The DNS TXT record value required by Imperva for domain ownership validation (if applicable)."
  type        = string
  default     = ""
}