# 1. "Overwrite" / Adopt: 
# This tells Terraform: "Don't try to create this from scratch (which causes 400 Error).
# Instead, go find this existing ID in NS1 and map it to the resource below."
import {
  to = ns1_record.lab_delegation
  id = "amplifys.us/lab.amplifys.us/NS"
}

resource "ns1_record" "lab_delegation" {
  zone   = "amplifys.us"
  domain = "lab.amplifys.us"
  type   = "NS"
  ttl    = 3600

  dynamic "answers" {
    for_each = google_dns_managed_zone.lab_zone.name_servers
    content {
      answer = answers.value
    }
  }

  # 2. "Not Destroy":
  # This acts as a safety lock. If you run 'terraform destroy', 
  # Terraform will refuse to delete this specific record.
  lifecycle {
    prevent_destroy = true
  }
}