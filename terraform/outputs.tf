# ==============================================================================
# Terraform Outputs Definition
# Mini Project: Automated Deployment of Serverless Student Task Management (IaC)
# ==============================================================================

output "worker_name" {
  description = "Name of the provisioned Cloudflare Worker"
  value       = cloudflare_workers_script.task_manager.name
}

output "kv_namespace_id" {
  description = "Unique Identifier of the provisioned Workers KV Namespace"
  value       = cloudflare_workers_kv_namespace.tasks_kv.id
}

output "kv_namespace_title" {
  description = "Title of the provisioned Workers KV Namespace"
  value       = cloudflare_workers_kv_namespace.tasks_kv.title
}

output "environment" {
  description = "Target deployment environment"
  value       = var.environment
}

output "access_instructions" {
  description = "Instructions for accessing the deployed application"
  value       = "Visit https://${cloudflare_workers_script.task_manager.name}.<your-workers-subdomain>.workers.dev in your web browser."
}
