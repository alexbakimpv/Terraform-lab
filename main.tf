terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = ">= 1.14.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    ns1 = {
      source  = "ns1-terraform/ns1"
      version = "~> 1.12"
    }
    incapsula = {
      source  = "imperva/incapsula"
      version = ">= 3.0"
    }
  }
}

# Secrets for provider creds
data "google_secret_manager_secret_version" "imperva_id" {
  secret = "imperva-api-id"
}

data "google_secret_manager_secret_version" "imperva_key" {
  secret = "imperva-api-key"
}

data "google_secret_manager_secret_version" "ns1_key" {
  secret = "ns1-api-key"
}

provider "ns1" {
  apikey = data.google_secret_manager_secret_version.ns1_key.secret_data
}

provider "incapsula" {
  api_id  = data.google_secret_manager_secret_version.imperva_id.secret_data
  api_key = data.google_secret_manager_secret_version.imperva_key.secret_data
}

provider "google" {
  project = var.project_id
  region  = var.region

  # Required for GKE API server auth from Terraform providers (kubectl/kubernetes/helm)
  scopes = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
  ]
}

provider "google-beta" {
  project = var.project_id
  region  = var.region

  # Required for GKE API server auth from Terraform providers (kubectl/kubernetes/helm)
  scopes = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
  ]
}

# Enable APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "dns.googleapis.com",
    "secretmanager.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "firestore.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# VPC
resource "google_compute_network" "vpc" {
  name                    = "imperva-lab-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet_gke" {
  name          = "subnet-app-gke"
  ip_cidr_range = "10.10.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id

  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = "10.48.0.0/14"
  }

  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = "10.52.0.0/20"
  }
}

# Client config for K8s providers
data "google_client_config" "default" {}

provider "kubernetes" {
  host                   = "https://${google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = "https://${google_container_cluster.primary.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
  }
}

provider "kubectl" {
  host                   = "https://${google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
  load_config_file       = false
}