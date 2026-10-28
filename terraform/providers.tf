# ==============================================================================
# Terraform Providers Configuration
# Mini Project: Automated Deployment of Serverless Student Task Management (IaC)
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
  }
}

# Cloudflare Provider Configuration
# Authentication is performed using a scoped API token (not hardcoded)
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
