############################################
# Firestore (initialization + indexes)
############################################

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.firestore_location_id
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.apis]

  lifecycle {
    prevent_destroy = true
  }
}

# Composite index: labs(owner_email ASC, status ASC)
resource "google_firestore_index" "labs_owner_status" {
  provider    = google-beta
  project     = var.project_id
  database    = google_firestore_database.default.name
  collection  = "labs"
  query_scope = "COLLECTION"

  fields {
    field_path = "owner_email"
    order      = "ASCENDING"
  }

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }

  depends_on = [
    google_project_service.apis,
    google_firestore_database.default
  ]
}

# Composite index: labs(status ASC, expires_at ASC)
resource "google_firestore_index" "labs_status_expires" {
  provider    = google-beta
  project     = var.project_id
  database    = google_firestore_database.default.name
  collection  = "labs"
  query_scope = "COLLECTION"

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }

  fields {
    field_path = "expires_at"
    order      = "ASCENDING"
  }

  depends_on = [
    google_project_service.apis,
    google_firestore_database.default
  ]
}