############################################
# Firestore variables
############################################

variable "firestore_location_id" {
  description = "Firestore location. Pick ONCE (e.g. nam5 for multi-region US)."
  type        = string
  default     = "nam5"
}
