# MINI PROJECT REPORT

## Project Title
**Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code**

---

### Course & Academic Details
- **Student Name:** Harshal Kuratkar
- **Subject:** Cloud Computing / DevOps Engineering Lab
- **Project Type:** Infrastructure as Code (IaC) Serverless Deployment
- **IaC Tool:** HashiCorp Terraform v1.9.8
- **Cloud Provider:** Cloudflare (Workers & Workers KV)
- **Live Deployed URL:** https://student-task-manager-production.kuratkarharshal20.workers.dev
- **Provisioned KV Namespace ID:** `b4259994837a4c26a13aabf80f9366dc`
- **CI/CD Platform:** GitHub Actions

---

## TABLE OF CONTENTS
1. [Chapter 1: Introduction](#chapter-1-introduction)
2. [Chapter 2: Background of Cloud Computing and Infrastructure as Code](#chapter-2-background-of-cloud-computing-and-infrastructure-as-code)
3. [Chapter 3: Problem Statement](#chapter-3-problem-statement)
4. [Chapter 4: Proposed Architecture](#chapter-4-proposed-architecture)
5. [Chapter 5: Technologies Used](#chapter-5-technologies-used)
6. [Chapter 6: Terraform Configuration Details](#chapter-6-terraform-configuration-details)
7. [Chapter 7: Application Implementation](#chapter-7-application-implementation)
8. [Chapter 8: CI/CD Implementation with GitHub Actions](#chapter-8-cicd-implementation-with-github-actions)
9. [Chapter 9: Testing and Experimental Results](#chapter-9-testing-and-experimental-results)
10. [Chapter 10: Conclusion and Future Scope](#chapter-10-conclusion-and-future-scope)
11. [Section 11: Answers to Mandatory Report Questions](#section-11-answers-to-mandatory-report-questions)
12. [Section 12: Viva Voce Preparation Guide](#section-12-viva-voce-preparation-guide)

---

## Chapter 1: Introduction

In contemporary cloud engineering, the speed, reproducibility, and security of software deployments depend directly on how cloud resources are provisioned and maintained. Historically, system administrators and developers configured computing instances, databases, and network routes manually through cloud graphical web dashboards or ad-hoc shell commands. While intuitive for trivial prototypes, manual administration introduces configuration inconsistencies ("configuration drift"), human error, lack of auditability, and catastrophic downtime when disaster recovery is required.

**Infrastructure as Code (IaC)** represents an architectural paradigm shift where entire cloud topographies—virtual machines, serverless functions, storage volumes, DNS records, and network bindings—are defined using declarative machine-readable configuration files.

This mini project demonstrates the complete lifecycle of Infrastructure as Code through the automated provisioning of a serverless **Student Task Management Application**. By utilizing **HashiCorp Terraform** targeting the **Cloudflare Developer Platform**, this project creates, binds, modifies, destroys, and recreates serverless compute (**Cloudflare Workers**) and globally distributed key-value storage (**Cloudflare Workers KV**) entirely through code. Furthermore, continuous deployment is achieved via **GitHub Actions**, validating that production infrastructure updates can occur reliably on every version-controlled Git commit.

---

## Chapter 2: Background of Cloud Computing and Infrastructure as Code

### 2.1 Evolution of Cloud Computing
Cloud computing has evolved through three distinct paradigms:
1. **Infrastructure as a Service (IaaS):** Provisioning raw virtual machines and storage volumes (e.g., AWS EC2, GCP Compute Engine). Requires full operating system and runtime maintenance.
2. **Platform as a Service (PaaS):** Abstracting the OS while providing a managed runtime (e.g., Heroku, Elastic Beanstalk).
3. **Function as a Service (FaaS) / Serverless:** Execution of stateless, event-driven functions at the edge without persistent servers, virtual machines, or idle cost (e.g., Cloudflare Workers, AWS Lambda).

### 2.2 The IaC Paradigm: Declarative vs. Imperative
- **Imperative Approaches (CLI Scripts, Bash, Python):** Require defining *how* to achieve a target state through explicit sequential steps. If a script fails halfway through, the environment is left in an unpredictable, partial state.
- **Declarative Approaches (Terraform, OpenTofu, CloudFormation):** Specify *what* the desired end state of the infrastructure should be. The underlying engine calculates the differential between the current state and the desired state, generating an optimized execution plan to reconcile discrepancies.

### 2.3 Benefits of Infrastructure as Code
- **Reproducibility:** Identical staging, development, and production environments can be generated from the same source files.
- **Version Control & Auditing:** Every infrastructure change is recorded in Git, offering complete history, blame analysis, and instant rollback.
- **Drift Detection:** IaC engines identify unauthorized manual dashboard modifications and restore the infrastructure to the canonical configuration.
- **Automated Destruction and Cost Control:** Transient testing environments can be spun up for CI test suites and immediately destroyed (`terraform destroy`).

---

## Chapter 3: Problem Statement

Modern web applications require coordinated compute resources, data storage, network bindings, and environment variables. In academic institutions and corporate settings alike, manual provisioning through cloud provider web consoles introduces critical operational vulnerabilities:
1. **Irreproducible Environments:** Difficult to replicate identical setups across multiple student groups or deployment stages.
2. **Human Error:** Mistyped binding names, forgotten access rules, or mismatched permissions cause runtime failures.
3. **No Audit Trail:** Dashboard clicks leave no granular commit log explaining *who* changed a setting, *why*, or *when*.
4. **Disaster Recovery Latency:** Rebuilding accidentally deleted infrastructure requires tedious manual reconfiguration.
5. **Configuration Drift:** Manual dashboard tweaks break team synchronization.

### Project Objective
The central objective of this project is to eliminate all manual dashboard operations by:
- Writing declarative Terraform configurations to provision a Cloudflare Worker script and Workers KV storage namespace.
- Binding compute and storage programmatically (`TASKS_KV`).
- Serving a responsive academic task manager web interface and REST API from the edge.
- Automating infrastructure changes through a GitHub Actions CI/CD pipeline.
- Proving infrastructure resilience through automated destruction and instant recreation.

---

## Chapter 4: Proposed Architecture

The system utilizes an ultra-low-latency serverless edge architecture:

```
                            STUDENT / CLIENT
                                   |
                                   | HTTPS Request
                                   v
                         Cloudflare Global Edge
                                   |
                                   v
                       Cloudflare Worker Script
                  ("student-task-manager-production")
                     /                           \
                    /                             \
                   v                               v
             Static Web UI                      REST API
        (HTML5 / CSS3 / JS)                  (/api/tasks)
                   |                               |
                   | API Fetch Calls               | CRUD Operations
                   +-------------------------------+
                                   |
                                   | env.TASKS_KV Binding
                                   v
                        Cloudflare Workers KV
                     ("student_tasks_production")
                                   |
                                   v
                         JSON Task Storage Records
                        [task:T101, task:T102, ...]
```

### Provisioning Pipeline Architecture
```
              Developer
                 |  git commit & push
                 v
         GitHub Repository
                 |  Webhook trigger
                 v
           GitHub Actions (Ubuntu Runner)
                 |
                 +--> terraform fmt -check
                 +--> terraform init
                 +--> terraform validate
                 +--> terraform plan
                 +--> terraform apply -auto-approve
                 |
                 v (Cloudflare Provider v4)
         Cloudflare Account
                 |
                 +--> 1. Provisions Workers KV Namespace
                 +--> 2. Uploads Worker Script & Binds KV
                 +--> 3. Activates *.workers.dev Subdomain Route
```

---

## Chapter 5: Technologies Used

| Layer | Technology | Role & Justification |
|---|---|---|
| **IaC Engine** | **HashiCorp Terraform (v1.9+)** | Declarative configuration management, state tracking, and execution plan generation. |
| **Cloud Provider** | **Cloudflare** | Industry-leading edge compute platform with official Terraform provider support. |
| **Compute** | **Cloudflare Workers (V8 Engine)** | Zero-cold-start serverless JavaScript runtime running across 300+ edge locations globally. |
| **Storage** | **Cloudflare Workers KV** | High-performance, distributed key-value store optimized for high-read applications. |
| **Application** | **Vanilla HTML5, CSS3, ES Modules** | Lightweight, zero-dependency client interface avoiding bloated bundlers. |
| **REST API** | **JavaScript (ES Module Worker fetch handler)** | Native Request/Response handling for CRUD endpoints. |
| **Version Control** | **Git & GitHub** | Distributed source code tracking, branch management, and audit history. |
| **CI/CD** | **GitHub Actions** | Automated validation, planning, and deployment pipeline triggered on repository push. |
| **Agent Protocol** | **Model Context Protocol (MCP)** | Open standard connecting AI pair programming agents to GitHub tools via `@modelcontextprotocol/server-github` over local stdio transport. |

---

## Chapter 6: Terraform Configuration Details

The infrastructure code is modularized within the `terraform/` directory:

### 6.1 Provider Declaration (`providers.tf`)
Configures Terraform to download and authenticate against the official `cloudflare/cloudflare` provider (v4.x):
```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

### 6.2 Variable Declarations (`variables.tf`)
Decouples environment parameters from infrastructure logic:
- `cloudflare_api_token`: Sensitive bearer token with scoped Workers and KV editing privileges.
- `cloudflare_account_id`: 32-character hexadecimal identifier for the target Cloudflare account.
- `worker_name`: Base name for the worker script (`student-task-manager`).
- `kv_namespace_name`: Identifier for the KV store (`student_tasks`).
- `environment`: Deployment tier (`production`, `staging`, `dev`).

### 6.3 Resource Provisioning & Binding (`main.tf`)
Declares three essential cloud resources:
1. `cloudflare_workers_kv_namespace`: Provisions the key-value database namespace.
2. `cloudflare_worker_script`: Uploads `application/worker.js`, enables ES module mode, attaches the runtime compatibility date, and binds the KV namespace under the variable name `TASKS_KV`.
3. `cloudflare_workers_script_subdomain`: Exposes the worker publicly on the account's `*.workers.dev` domain.

### 6.4 Deployment Outputs (`outputs.tf`)
Exposes verifiable deployment attributes:
- `worker_name`
- `kv_namespace_id`
- `kv_namespace_title`
- `access_instructions`

---

## Chapter 7: Application Implementation

### 7.1 Architecture of the Cloudflare Worker (`application/worker.js`)
The worker acts as a unified edge controller handling both API requests and static UI rendering:
1. **Edge Router:** Parses incoming `request.url` and `request.method`.
2. **CORS Handling:** Returns standard `Access-Control-Allow-*` headers for preflight and standard requests.
3. **KV CRUD Operations:**
   - `POST /api/tasks`: Validates task title, computes sequential ID (`T101`, `T102`), serializes metadata, and commits to `env.TASKS_KV.put("task:Txxx", ...)`.
   - `GET /api/tasks`: Performs `env.TASKS_KV.list({ prefix: 'task:' })`, fetches all task records concurrently, sorts by creation timestamp, and returns JSON.
   - `GET /api/tasks/:id`: Fetches a single record by key; returns 404 if absent.
   - `PUT /api/tasks/:id`: Updates task title, priority, or toggles status between `Pending` and `Completed`.
   - `DELETE /api/tasks/:id`: Permanently deletes the key via `env.TASKS_KV.delete("task:Txxx")`.
4. **Zero-Dependency Web Server:** Serves modern HTML, CSS, and client-side JavaScript when accessing `/`, eliminating the need for separate web hosting.

### 7.2 Web User Interface (`index.html`, `style.css`, `script.js`)
- Responsive CSS Grid and Flexbox dashboard with academic theme.
- Dynamic statistics counters (Total Tasks, Pending, In Progress, Completed).
- Live search filtering by task ID or title.
- Priority and Status dropdown filters.
- Modal dialog for task editing.
- Instant optimistic feedback and notification toasts.

---

## Chapter 8: CI/CD Implementation with GitHub Actions

The automation workflow is defined in `.github/workflows/deploy.yml`:
1. **Trigger Events:** Automated runs on push to `main` involving `terraform/**` or `application/**`, and manual triggering via `workflow_dispatch`.
2. **Runner Environment:** Ephemeral `ubuntu-latest` virtual machine.
3. **Execution Pipeline:**
   - **Checkout:** Pulls repository files.
   - **Setup Terraform:** Installs Terraform binary (v1.9.0).
   - **Format Validation (`terraform fmt -check`):** Verifies code style adherence.
   - **Provider Initialization (`terraform init`):** Downloads Cloudflare provider plugins.
   - **Syntax Validation (`terraform validate`):** Verifies HCL configuration syntax.
   - **Plan Execution (`terraform plan`):** Calculates changes against real cloud state.
   - **Automated Apply (`terraform apply -auto-approve`):** Deploys changes to Cloudflare.
4. **Secret Management:** Sensitive credentials (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are stored as encrypted GitHub Repository Secrets, injected exclusively as environment variables during execution.

---

## Chapter 9: Testing and Experimental Results

### 9.1 Test Cases and Results
| Test ID | Objective | Operation | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **TC-01** | Terraform Validation | Run `terraform validate` | "Success! The configuration is valid." | Valid configuration output | **PASS** |
| **TC-02** | Infrastructure Provisioning | Run `terraform apply` | 3 resources created (Worker, KV, Subdomain) | Resources created successfully | **PASS** |
| **TC-03** | Web UI Access | Access `*.workers.dev` | Academic dashboard renders in browser | Full dashboard rendered | **PASS** |
| **TC-04** | Create Task (FR1) | `POST /api/tasks` | Task `T101` created and stored in KV | Task appears in UI & KV | **PASS** |
| **TC-05** | View Tasks (FR2) | `GET /api/tasks` | Returns JSON array of stored tasks | All tasks retrieved | **PASS** |
| **TC-06** | Update Task Status (FR3) | `PUT /api/tasks/T101` | Status changes from `Pending` to `Completed` | UI & KV reflect update | **PASS** |
| **TC-07** | Delete Task (FR4) | `DELETE /api/tasks/T101` | Task record deleted from KV | Record removed from table | **PASS** |
| **TC-08** | Infrastructure Modification | Change variable & apply | In-place infrastructure update | Terraform reconciles state | **PASS** |
| **TC-09** | Infrastructure Teardown | Run `terraform destroy` | All 3 resources cleanly removed | Cloudflare resources deleted | **PASS** |
| **TC-10** | Disaster Recreation | Re-run `terraform apply` | Entire stack restored from code in seconds | Application running again | **PASS** |

---

## Chapter 10: Conclusion and Future Scope

### 10.1 Conclusion
This mini project successfully demonstrates the fundamental principles and benefits of Infrastructure as Code. By defining serverless compute and distributed storage within declarative Terraform scripts, the entire Student Task Management system was provisioned, bound, updated, destroyed, and restored without performing a single manual creation step in the cloud provider's dashboard. Integrating Git and GitHub Actions established a professional CI/CD pipeline, proving that modern cloud applications can achieve high agility, zero configuration drift, and instant disaster recovery through code.

### 10.2 Future Scope
1. **Multi-Environment Workspaces:** Implementing Terraform workspaces or directory modules for `dev`, `staging`, and `production`.
2. **Custom Domain & SSL Provisioning:** Adding Terraform resources for `cloudflare_record` and `cloudflare_worker_domain` to map the application to an institutional domain.
3. **Authentication Layer:** Integrating Cloudflare Access / Zero Trust or JWT-based student authentication into the Worker.
4. **Remote State Backend:** Storing Terraform state in Cloudflare R2 or Terraform Cloud with state locking to facilitate multi-developer collaboration.

---

## Section 11: Answers to Mandatory Report Questions

### 1. What is Infrastructure as Code?
Infrastructure as Code (IaC) is the practice of provisioning, managing, and configuring computer data centers and cloud resources through machine-readable definition files, rather than through manual physical hardware configuration or interactive web dashboard clicks.

### 2. What problem does IaC solve?
IaC solves:
- Inconsistent and irreproducible environments across teams.
- Human error during manual console configuration.
- Configuration drift (undocumented changes in production).
- Slow and error-prone disaster recovery.
- Inability to version control, review, and audit infrastructure changes.

### 3. Why is Terraform called a declarative IaC tool?
Terraform is declarative because users describe the **desired end state** of the infrastructure (what resources should exist and with what properties) rather than writing procedural, step-by-step instructions on how to create them. Terraform automatically calculates the dependency graph and determines the optimal sequence of API calls needed to achieve that target state.

### 4. What is a Terraform provider?
A Terraform provider is a plugin that acts as a translation layer between Terraform core and a target cloud platform's API (e.g., Cloudflare, AWS, Azure). The provider defines which resources and data sources are available and implements the CRUD operations against the provider's API.

### 5. What is a Terraform resource?
A Terraform resource is the fundamental declarative block in HCL (`resource "type" "name" { ... }`) representing an infrastructure object managed by Terraform, such as a Cloudflare Worker script, a Workers KV namespace, or a DNS record.

### 6. What is a Terraform variable?
A Terraform variable (`variable "name" { ... }`) is a parameterized input that allows Terraform configurations to be dynamic, customizable, and reusable without hardcoding environment-specific values like account IDs, region names, or service sizes.

### 7. What is a Terraform output?
A Terraform output (`output "name" { ... }`) exposes values from the provisioned infrastructure to the user via the terminal or to other automated systems (e.g., returning the provisioned Worker URL or KV Namespace ID after deployment).

### 8. What is Terraform state?
Terraform state is a JSON metadata database (stored locally in `terraform.tfstate` or remotely in a cloud backend) that records the mapping between declared configuration resources and the real-world infrastructure instances created by cloud APIs. It tracks attributes, IDs, and dependencies.

### 9. What happens during `terraform init`?
`terraform init` initializes the working directory containing Terraform configuration files. It scans the files for provider requirements, downloads and caches the required provider plugins into `.terraform/`, and configures the state backend.

### 10. What happens during `terraform plan`?
`terraform plan` reads the current configuration, refreshes the state against the real cloud infrastructure, and computes an execution plan showing what actions (create `+`, modify `~`, destroy `-`) Terraform will take to reconcile differences without actually modifying the cloud resources.

### 11. What happens during `terraform apply`?
`terraform apply` executes the actions proposed in the execution plan. It makes the necessary API calls to the cloud provider to provision, update, or remove resources, and updates the `terraform.tfstate` file with the newly created resource IDs and attributes.

### 12. What happens during `terraform destroy`?
`terraform destroy` looks at the state file and generates an execution plan to delete all managed cloud infrastructure resources in the correct reverse-dependency order, returning the cloud environment to a clean state.

### 13. Why should infrastructure not be modified manually after Terraform manages it?
Modifying infrastructure through cloud web dashboards creates **configuration drift**, where the real cloud state diverges from the Terraform state and configuration files. During subsequent `terraform plan` or `apply` runs, Terraform may overwrite or revert manual changes, or fail due to unexpected conflicts.

### 14. Why should API tokens not be stored in Terraform source code?
Storing API tokens in source code files exposes credentials to anyone with repository access. If committed to a public Git repository, attackers can compromise cloud accounts. Sensitive tokens must always be supplied via environment variables (`TF_VAR_*`), `.tfvars` files ignored by Git, or secret management vaults.

### 15. What is a KV database?
A Key-Value (KV) database is a NoSQL data storage paradigm that stores data as a collection of unique keys mapped to specific values. Cloudflare Workers KV is a low-latency, globally distributed key-value store optimized for high-volume read workloads with eventual consistency across edge nodes.

### 16. Why was serverless computing selected for this project?
Serverless computing was selected because:
- **Zero Server Management:** Eliminates OS maintenance, patching, and capacity planning.
- **Edge Performance:** Cloudflare Workers run within milliseconds of global end users.
- **Cost Efficiency:** No idle cost; scales down to zero on the Cloudflare Free plan.
- **Microservice Integration:** Native integration between serverless compute and Workers KV storage.

### 17. What is CI/CD?
Continuous Integration (CI) is the practice of automatically integrating and validating code changes from multiple contributors through automated testing and formatting checks. Continuous Deployment (CD) automatically releases and provisions validated changes to staging or production environments without manual intervention.

### 18. What role does GitHub Actions perform?
GitHub Actions acts as the CI/CD orchestration engine. When a developer pushes code to GitHub, GitHub Actions spins up an ephemeral runner, installs Terraform, checks formatting, validates syntax, generates an execution plan, and runs `terraform apply` using repository secrets.

### 19. How can Terraform recreate infrastructure after deletion?
Because the entire topology (resource types, configurations, bindings, script contents) is declared declaratively in code, Terraform does not rely on human memory. Running `terraform apply` re-invokes the Cloudflare APIs and provisions identical resources from scratch.

### 20. What is infrastructure drift?
Infrastructure drift occurs when the actual state of cloud resources diverges from the state declared in IaC configuration files. This typically happens due to manual dashboard modifications, emergency hotfixes, or external automated scripts. Terraform detects drift during `terraform plan` and proposes actions to restore the declared state.

---

## Section 12: Viva Voce Preparation Guide

### Basic Level Questions
- **Q: What is IaC?**  
  *A:* The practice of defining and managing cloud infrastructure using machine-readable configuration files rather than manual dashboard configuration.
- **Q: Which IaC tool have you used?**  
  *A:* HashiCorp Terraform.
- **Q: Which cloud provider did you deploy to?**  
  *A:* Cloudflare.
- **Q: Which compute and storage services did you use?**  
  *A:* Cloudflare Workers for serverless compute and Cloudflare Workers KV for distributed key-value storage.

### Intermediate Level Questions
- **Q: Explain the difference between `terraform plan` and `terraform apply`.**  
  *A:* `terraform plan` is a read-only preview showing what changes will be made, while `terraform apply` actually performs those changes against the cloud provider's API.
- **Q: What is the purpose of `terraform.tfstate`?**  
  *A:* It maps declared Terraform resources to actual real-world cloud resource IDs and attributes, allowing Terraform to calculate differentials on future runs.
- **Q: How does the Worker access the KV storage?**  
  *A:* Through a resource binding declared in Terraform (`kv_namespace_binding`). At runtime, the Worker accesses it globally via `env.TASKS_KV`.

### Advanced Level Questions
- **Q: How do you handle secrets securely in Terraform and CI/CD?**  
  *A:* By declaring variables with `sensitive = true`, excluding `.tfvars` from Git using `.gitignore`, and passing secrets into GitHub Actions runners via encrypted repository secrets.
- **Q: What happens if someone manually deletes the KV namespace from the Cloudflare dashboard?**  
  *A:* On the next `terraform plan`, Terraform detects drift (the resource is missing from the cloud), compares it to the declared HCL, and marks the KV namespace for recreation (`+ create`).
- **Q: How would you structure this configuration to support multiple environments (`dev`, `staging`, `prod`)?**  
  *A:* By utilizing Terraform modules or directory workspaces (`terraform/dev`, `terraform/prod`) and parameterizing the `environment` variable to append environment tags to resource names.

### Model Context Protocol (MCP) Questions
- **Q: How is this project connected to an MCP server?**  
  *A:* The workspace defines an agent plugin at `.agents/plugins/mcp-tools/` which registers the `@modelcontextprotocol/server-github` MCP server. The language server communicates with it via JSON-RPC over local stdio transport.
- **Q: What capabilities does the MCP server provide?**  
  *A:* It exposes 26 standardized tools allowing the AI assistant to query commits, inspect repository files, review issues, and manage pull requests directly.
- **Q: How are credentials secured in the MCP configuration?**  
  *A:* The `GITHUB_PERSONAL_ACCESS_TOKEN` is supplied strictly in the local `mcp_config.json` which is ignored via `.gitignore`. A sanitized template `mcp_config.example.json` is checked into version control for team reproduction.
