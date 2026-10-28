# Mandatory Project Screenshots Guide

Per Section 32 (F) of the project specification, the following 15 screenshots are required for project evaluation and report submission.

Place your captured image files in this directory using the suggested filenames below:

| # | Filename | Description / Step | What to Capture |
|---|----------|--------------------|-----------------|
| 1 | `01_terraform_version.png` | Step 2: Install Terraform | Output of `terraform --version` in terminal |
| 2 | `02_terraform_init.png` | Step 12: Initialize Terraform | Output of `terraform init` showing provider download & initialization |
| 3 | `03_terraform_validate.png` | Step 14: Validate Configuration | Output of `terraform validate` showing "Success! The configuration is valid." |
| 4 | `04_terraform_plan.png` | Step 15: Execution Plan | Output of `terraform plan` showing `+` create actions for Worker & KV |
| 5 | `05_terraform_apply.png` | Step 16: Provision Infrastructure | Output of `terraform apply` showing "Apply complete!" and outputs |
| 6 | `06_cf_worker_dashboard.png` | Step 17: Cloudflare Dashboard | Cloudflare Dashboard &rarr; Workers & Pages showing `student-task-manager` |
| 7 | `07_cf_kv_dashboard.png` | Step 17: Workers KV Dashboard | Cloudflare Dashboard &rarr; Workers KV showing `student_tasks_production` |
| 8 | `08_app_running.png` | Step 18: Working Web App | Deployed web application loaded in browser at `*.workers.dev` |
| 9 | `09_crud_create.png` | Step 19: Test Case 1 | Creating a new task (e.g., "Prepare Final Year Presentation") |
| 10 | `10_crud_update.png` | Step 19: Test Case 3 | Updating task status from `Pending` to `Completed` |
| 11 | `11_crud_delete.png` | Step 19: Test Case 4 | Deleting an existing task from KV |
| 12 | `12_github_repo.png` | Step 22: Version Control | GitHub repository overview showing meaningful commits history |
| 13 | `13_github_actions.png` | Step 26: CI/CD Pipeline | GitHub Actions workflow execution showing green checkmarks |
| 14 | `14_terraform_destroy.png` | Step 27: Destroy Environment | Output of `terraform destroy` showing "Destroy complete!" |
| 15 | `15_terraform_recreate.png` | Step 29: Recreate Infrastructure | Output of `terraform apply` rebuilding infrastructure from code |
