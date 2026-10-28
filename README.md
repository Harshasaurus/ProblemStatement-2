# Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code

> **Mini Project on Infrastructure as Code (IaC)**  
> **Course / Lab:** Cloud Computing & DevOps  
> **Technologies:** Terraform, Cloudflare Workers, Cloudflare Workers KV, GitHub Actions, JavaScript, HTML5, CSS3  

---

## 📌 Executive Summary

Modern cloud systems demand reliable, consistent, and reproducible infrastructure. Creating cloud resources manually via graphical dashboards introduces human error, configuration drift, lack of version history, and slow disaster recovery.

**Infrastructure as Code (IaC)** addresses these challenges by specifying infrastructure declarations in machine-readable code files. In this mini project, a complete serverless **Student Task Management Application** is defined, provisioned, updated, destroyed, and recreated automatically using **HashiCorp Terraform** targeting the **Cloudflare Serverless Platform** (Workers compute and Workers KV storage), automated through a **GitHub Actions CI/CD pipeline**.

---

## 🏗️ System Architecture

### Runtime Application Flow
```
                      STUDENT
                         |
                         v
                    Web Browser
                         |
                         v
              Cloudflare Edge Worker
              /                   \
             v                     v
       Web Interface            REST API
      (HTML/CSS/JS)                |
                                   v
                         Cloudflare Workers KV
                          (Persistent Storage)
                                   |
                                   v
                             Task Records
```

### Infrastructure as Code (IaC) Provisioning Flow
```
              Developer (Git Commit & Push)
                         |
                         v
                 GitHub Repository
                         |
                         v
                   GitHub Actions
                         |
                         v
                  HashiCorp Terraform
                         |
                Cloudflare Provider v4
                /                    \
               v                      v
      Cloudflare Worker          Workers KV
   (Serverless Compute)       (student_tasks)
               \                      /
                \                    /
                 v                  v
             Worker-to-KV Binding (TASKS_KV)
                         |
                         v
          Public Route (*.workers.dev Subdomain)
```

---

## 📁 Project Directory Structure

```text
Problem-2/
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Actions CI/CD automation pipeline
├── application/
│   ├── index.html                   # Student Task Management Web Interface
│   ├── style.css                    # Modern responsive styling & design tokens
│   ├── script.js                    # Frontend controller & API fetch client
│   └── worker.js                    # Serverless Cloudflare Worker script & REST API
├── terraform/
│   ├── providers.tf                 # Terraform provider declarations (Cloudflare)
│   ├── variables.tf                 # Input variable definitions (IDs, names, environments)
│   ├── main.tf                      # Cloud infrastructure resources & KV bindings
│   ├── outputs.tf                   # Useful outputs post-deployment (URLs, IDs)
│   └── terraform.tfvars.example     # Example variable values template
├── screenshots/
│   └── README.md                    # Mandatory screenshots checklist & guide
├── .gitignore                       # Git ignore rules for state files, tokens & cache
├── README.md                        # Complete project documentation & guide
└── REPORT.md                        # Comprehensive 10-chapter academic project report
```

---

## 🚀 Key Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| **FR1** | **Add Task** | Create tasks with auto-generated ID (`T101`, `T102`), Title, Priority (`High`, `Medium`, `Low`), and Status (`Pending`, `In Progress`, `Completed`). |
| **FR2** | **View Tasks** | Display stored tasks with search filter, priority badges, and status pills. |
| **FR3** | **Update Task** | Edit task details or toggle status directly from Pending to Completed. |
| **FR4** | **Delete Task** | Remove task record permanently from Workers KV storage. |
| **FR5** | **Persistent Storage** | Key-Value persistence on Cloudflare's globally distributed Workers KV. |

---

## 📡 REST API Reference

All API endpoints are hosted on the deployed Cloudflare Worker at `/api/tasks`:

| Method | Endpoint | Description | Request Payload | Response Sample |
|---|---|---|---|---|
| `GET` | `/api/tasks` | Retrieve all academic tasks | None | `[ { "id": "T101", "title": "...", "priority": "High", "status": "Pending", "createdAt": "..." } ]` |
| `GET` | `/api/tasks/:id` | Retrieve single task by ID | None | `{ "id": "T101", "title": "...", "priority": "High", ... }` |
| `POST` | `/api/tasks` | Create a new task in KV | `{ "title": "Submit Report", "priority": "High", "status": "Pending" }` | `{ "success": true, "task": { "id": "T101", ... } }` |
| `PUT` | `/api/tasks/:id` | Update an existing task | `{ "status": "Completed" }` | `{ "success": true, "task": { "id": "T101", ... } }` |
| `DELETE` | `/api/tasks/:id` | Delete task from KV | None | `{ "success": true, "message": "Task T101 deleted" }` |

---

## 🛠️ Step-by-Step Implementation Guide

### Prerequisites
1. **Cloudflare Account:** Free plan registered at [cloudflare.com](https://dash.cloudflare.com).
2. **Git:** Installed on system (`git --version`).
3. **Terraform CLI:** HashiCorp Terraform 1.5+ installed (`terraform --version`).
4. **GitHub Account:** For version control and CI/CD automation.

---

### Step 1: Cloudflare Credentials Setup
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Note your **Account ID** from the right sidebar of the **Workers & Pages** overview page.
3. Generate a scoped API Token:
   - Navigate to **My Profile** &rarr; **API Tokens** &rarr; **Create Token**.
   - Use the **Create Custom Token** option.
   - Set Permissions:
     - `Account` | `Workers KV Storage` | `Edit`
     - `Account` | `Workers Scripts` | `Edit`
     - `Account` | `Account Settings` | `Read`
   - Copy the generated API Token.

---

### Step 2: Configure Terraform Variables
Navigate into the `terraform/` directory:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and supply your actual credentials:
```hcl
cloudflare_account_id = "your_32_char_account_id"
cloudflare_api_token  = "your_secret_api_token"
worker_name           = "student-task-manager"
kv_namespace_name     = "student_tasks"
environment           = "production"
```

> **Security Note:** `terraform.tfvars` is ignored by `.gitignore` to prevent leaking API secrets.

---

### Step 3: Initialize Terraform
Download and initialize the official Cloudflare Terraform provider:
```bash
terraform init
```
*Expected Output:* `Terraform has been successfully initialized!`

---

### Step 4: Validate and Format Configuration
Ensure standard HCL style and configuration correctness:
```bash
terraform fmt
terraform validate
```
*Expected Output:* `Success! The configuration is valid.`

---

### Step 5: Generate Execution Plan
Inspect the resources Terraform proposes to create:
```bash
terraform plan
```
*Key symbols to verify:*
- `+` `cloudflare_workers_kv_namespace.tasks_kv` (Create)
- `+` `cloudflare_worker_script.task_manager` (Create)
- `+` `cloudflare_workers_script_subdomain.task_manager_subdomain` (Create)

---

### Step 6: Provision Cloud Infrastructure
Apply the planned configuration to deploy to Cloudflare:
```bash
terraform apply
```
*Type `yes` when prompted.*  
*Expected Output:* `Apply complete! Resources: 3 added, 0 changed, 0 destroyed.`

---

### Step 7: Verify and Test the Application
1. Check the outputs displayed in the terminal:
   ```bash
   terraform output
   ```
2. Open your web browser and navigate to:
   ```
   https://student-task-manager-production.<your-subdomain>.workers.dev
   ```
3. Perform CRUD verification:
   - **Create:** Add a task ("Complete Cloud Computing Assignment", High Priority).
   - **Read:** Confirm the task appears in the table.
   - **Update:** Click the checkmark to mark it `Completed`.
   - **Delete:** Click the trash icon to remove the task.

---

### Step 8: Infrastructure Modification Experiment (IaC Lifecycle)
Demonstrate declarative modification:
1. Open `terraform/variables.tf` or `terraform/main.tf`.
2. Add an additional plain text variable binding or update `environment = "staging"`.
3. Run:
   ```bash
   terraform plan
   terraform apply
   ```
4. Observe how Terraform updates the existing resources in-place without manual dashboard intervention.

---

### Step 9: Configure CI/CD with GitHub Actions
1. Initialize Git and commit project files:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Terraform IaC student task manager"
   ```
2. Create a remote GitHub repository and push:
   ```bash
   git remote add origin https://github.com/<your-username>/student-task-manager-iac.git
   git branch -M main
   git push -u origin main
   ```
3. In GitHub repository, go to **Settings** &rarr; **Secrets and variables** &rarr; **Actions**.
4. Add two Repository Secrets:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
5. Pushing any change to `application/` or `terraform/` triggers `.github/workflows/deploy.yml` which automatically initializes, plans, and applies infrastructure updates!

---

### Step 10: Infrastructure Destruction & Re-creation
To demonstrate complete infrastructure lifecycle management:

1. **Destroy Infrastructure:**
   ```bash
   terraform destroy
   ```
   *Confirm with `yes`.*  
   *Output:* `Destroy complete! Resources: 3 destroyed.`  
   Verify that the Worker and KV namespace are removed from the Cloudflare Dashboard.

2. **Recreate Entire Infrastructure from Code:**
   ```bash
   terraform apply -auto-approve
   ```
   The entire serverless stack is restored in seconds purely from the declared code!

---

## 📋 Evaluation Demonstration Sequence

When demonstrating this project for academic evaluation or viva:
1. **Show Source Code:** Explain `main.tf`, `variables.tf`, `providers.tf`, and `worker.js`.
2. **Run Validation:** Run `terraform validate`.
3. **Run Plan:** Run `terraform plan` and explain the `+` resource additions.
4. **Run Apply:** Run `terraform apply` to show live provisioning.
5. **Show Live Resources:** Show the provisioned Worker and KV namespace in Cloudflare Dashboard.
6. **Test CRUD:** Add, update status, and delete tasks in the web browser.
7. **Show CI/CD:** Push a commit and display the automated GitHub Actions pipeline.
8. **Demonstrate Destroy & Recreate:** Run `terraform destroy` followed by `terraform apply`.
