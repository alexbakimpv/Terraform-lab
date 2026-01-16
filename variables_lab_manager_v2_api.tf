############################################
# Lab Manager V2 API variables (Imperva validation optional)
############################################

variable "lab_manager_v2_api_imperva_validation_txt_name" {
  description = "TXT record name Imperva requires for lab-manager-v2-api.lab.amplifys.us validation (if applicable)."
  type        = string
  default     = ""
}

variable "lab_manager_v2_api_imperva_validation_txt_value" {
  description = "TXT record value Imperva requires for lab-manager-v2-api.lab.amplifys.us validation (if applicable)."
  type        = string
  default     = ""
}
