# ==============================================================================
# Terraform Main Infrastructure Definition
# Mini Project: Automated Deployment of Serverless Student Task Management (IaC)
# 
# Provisioned Resources:
# 1. Cloudflare Workers KV Namespace (Persistent Key-Value Store)
# 2. Cloudflare Worker Script (Serverless Application & REST API)
# 3. Worker-to-KV Binding (TASKS_KV)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Cloudflare Workers KV Namespace for Student Task Storage
# ------------------------------------------------------------------------------
resource "cloudflare_workers_kv_namespace" "tasks_kv" {
  account_id = var.cloudflare_account_id
  title      = "${var.kv_namespace_name}_${var.environment}"
}

# ------------------------------------------------------------------------------
# 2. Cloudflare Worker Script (Serverless Compute & REST API)
# ------------------------------------------------------------------------------
resource "cloudflare_workers_script" "task_manager" {
  account_id         = var.cloudflare_account_id
  name               = "${var.worker_name}-${var.environment}"
  content            = file("${path.module}/../application/worker.js")
  module             = true
  compatibility_date = var.compatibility_date

  # Binding: Connects the Worker to the Workers KV Namespace
  kv_namespace_binding {
    name         = "TASKS_KV"
    namespace_id = cloudflare_workers_kv_namespace.tasks_kv.id
  }

  # Plain text environment variable binding
  plain_text_binding {
    name = "ENVIRONMENT"
    text = var.environment
  }
}
