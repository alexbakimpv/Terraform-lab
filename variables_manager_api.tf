############################################
# Manager API variables (Imperva validation optional)
############################################

variable "manager_api_imperva_validation_txt_name" {
  description = "TXT record name Imperva requires for manager-api.lab.amplifys.us validation (if applicable)."
  type        = string
  default     = ""
}

variable "manager_api_imperva_validation_txt_value" {
  description = "TXT record value Imperva requires for manager-api.lab.amplifys.us validation (if applicable)."
  type        = string
  default     = ""
}
