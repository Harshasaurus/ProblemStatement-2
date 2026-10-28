# ==============================================================================
# Terraform Variables Declaration
# Mini Project: Automated Deployment of Serverless Student Task Management (IaC)
# ==============================================================================

variable "cloudflare_api_token" {
  description = "Cloudflare API Token with Workers Scripts:Edit and Workers KV Storage:Edit permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID found on the Workers & Pages dashboard overview"
  type        = string
}

variable "worker_name" {
  description = "Name of the serverless Cloudflare Worker script"
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Name/title of the Cloudflare Workers KV namespace"
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Deployment environment (e.g., dev, test, production)"
  type        = string
  default     = "production"
}

variable "compatibility_date" {
  description = "Cloudflare Workers runtime compatibility date"
  type        = string
  default     = "2024-01-01"
}
