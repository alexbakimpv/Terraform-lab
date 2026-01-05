variable "project_id" {
  description = "The GCP Project ID"
  type        = string
}

variable "region" {
  description = "The GCP Region"
  type        = string
  default     = "us-east1"
}

variable "zone" {
  description = "The GCP Zone"
  type        = string
  default     = "us-east1-b"
}

variable "dns_domain" {
  description = "The Root DNS domain (e.g., amplifys.us.)"
  type        = string
  default     = "amplifys.us."
}

variable "bootstrap" {
  description = "Set to true for the first run to create secret boxes without reading them."
  type        = bool
  default     = false
}