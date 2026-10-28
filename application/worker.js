/**
 * Cloudflare Worker: Student Task Management Serverless Application
 * Infrastructure as Code Mini Project
 * 
 * Handles:
 * 1. Serving responsive Frontend Web UI (HTML, CSS, JS)
 * 2. REST API endpoints for Student Tasks CRUD operations
 * 3. Interfacing with Cloudflare Workers KV persistent storage (TASKS_KV binding)
 */

// In-memory fallback for local mock/testing if KV binding is not present
const inMemoryStore = new Map([
  [
    'task:T101',
    JSON.stringify({
      id: 'T101',
      title: 'Complete Cloud Computing Assignment',
      priority: 'High',
      status: 'Pending',
      createdAt: new Date().toISOString()
    })
  ],
  [
    'task:T102',
    JSON.stringify({
      id: 'T102',
      title: 'Prepare Project Presentation',
      priority: 'High',
      status: 'Completed',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    })
  ]
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    // CORS headers for API requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Helper: KV wrapper (supports binding or fallback)
    const kv = {
      async get(key) {
        if (env && env.TASKS_KV) return await env.TASKS_KV.get(key);
        return inMemoryStore.get(key) || null;
      },
      async put(key, value) {
        if (env && env.TASKS_KV) return await env.TASKS_KV.put(key, value);
        inMemoryStore.set(key, value);
      },
      async delete(key) {
        if (env && env.TASKS_KV) return await env.TASKS_KV.delete(key);
        inMemoryStore.delete(key);
      },
      async list(options) {
        if (env && env.TASKS_KV) return await env.TASKS_KV.list(options);
        const prefix = (options && options.prefix) || '';
        const keys = Array.from(inMemoryStore.keys())
          .filter(k => k.startsWith(prefix))
          .map(name => ({ name }));
        return { keys };
      }
    };

    // ------------------------------------------------------------------------
    // REST API Routes (/api/tasks)
    // ------------------------------------------------------------------------
    if (path.startsWith('/api/tasks')) {
      const parts = path.split('/').filter(Boolean); // ['api', 'tasks', '{id}?']
      const taskId = parts[2] ? decodeURIComponent(parts[2]) : null;

      try {
        // GET /api/tasks - Retrieve all tasks
        if (method === 'GET' && !taskId) {
          const listResult = await kv.list({ prefix: 'task:' });
          const tasks = [];
          for (const keyItem of listResult.keys) {
            const raw = await kv.get(keyItem.name);
            if (raw) {
              try {
                tasks.push(JSON.parse(raw));
              } catch (e) {
                // skip corrupted record
              }
            }
          }
          // Sort descending by ID / created date
          tasks.sort((a, b) => (b.id || '').localeCompare(a.id || ''));

          return jsonResponse(tasks, 200, corsHeaders);
        }

        // GET /api/tasks/:id - Retrieve individual task
        if (method === 'GET' && taskId) {
          const raw = await kv.get(`task:${taskId}`);
          if (!raw) {
            return jsonResponse({ error: `Task ${taskId} not found` }, 404, corsHeaders);
          }
          return jsonResponse(JSON.parse(raw), 200, corsHeaders);
        }

        // POST /api/tasks - Create a new task
        if (method === 'POST') {
          let body;
          try {
            body = await request.json();
          } catch (e) {
            return jsonResponse({ error: 'Invalid JSON request body' }, 400, corsHeaders);
          }

          if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
            return jsonResponse({ error: 'Task title is required' }, 400, corsHeaders);
          }

          // Generate sequential or custom ID (e.g. T101, T102...)
          const listResult = await kv.list({ prefix: 'task:' });
          let nextNum = 101;
          for (const k of listResult.keys) {
            const match = k.name.match(/task:T(\d+)/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num >= nextNum) nextNum = num + 1;
            }
          }
          const id = `T${nextNum}`;

          const newTask = {
            id: id,
            title: body.title.trim(),
            priority: body.priority || 'Medium',
            status: body.status || 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await kv.put(`task:${id}`, JSON.stringify(newTask));

          return jsonResponse({
            success: true,
            message: 'Task created successfully in Cloudflare Workers KV',
            task: newTask
          }, 201, corsHeaders);
        }

        // PUT /api/tasks/:id - Update an existing task
        if (method === 'PUT' && taskId) {
          let body;
          try {
            body = await request.json();
          } catch (e) {
            return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
          }

          const raw = await kv.get(`task:${taskId}`);
          if (!raw) {
            return jsonResponse({ error: `Task ${taskId} not found` }, 404, corsHeaders);
          }

          const existingTask = JSON.parse(raw);
          const updatedTask = {
            ...existingTask,
            title: body.title !== undefined ? String(body.title).trim() : existingTask.title,
            priority: body.priority || existingTask.priority,
            status: body.status || existingTask.status,
            updatedAt: new Date().toISOString()
          };

          await kv.put(`task:${taskId}`, JSON.stringify(updatedTask));

          return jsonResponse({
            success: true,
            message: `Task ${taskId} updated successfully in KV`,
            task: updatedTask
          }, 200, corsHeaders);
        }

        // DELETE /api/tasks/:id - Delete an existing task
        if (method === 'DELETE' && taskId) {
          const raw = await kv.get(`task:${taskId}`);
          if (!raw) {
            return jsonResponse({ error: `Task ${taskId} not found` }, 404, corsHeaders);
          }

          await kv.delete(`task:${taskId}`);

          return jsonResponse({
            success: true,
            message: `Task ${taskId} deleted successfully from KV`
          }, 200, corsHeaders);
        }

        return jsonResponse({ error: 'Method Not Allowed' }, 405, corsHeaders);

      } catch (err) {
        return jsonResponse({ error: err.message || 'Internal Server Error' }, 500, corsHeaders);
      }
    }

    // ------------------------------------------------------------------------
    // Static Asset Serving (Frontend Web UI)
    // ------------------------------------------------------------------------
    if (path === '/' || path === '/index.html') {
      return new Response(INDEX_HTML(env), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (path === '/style.css') {
      return new Response(STYLE_CSS, {
        headers: { 'Content-Type': 'text/css; charset=utf-8' }
      });
    }

    if (path === '/script.js') {
      return new Response(SCRIPT_JS, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders
    }
  });
}

// ----------------------------------------------------------------------------
// Embedded Frontend Assets (Ensures Zero-Dependency Deployment via Terraform)
// ----------------------------------------------------------------------------
function INDEX_HTML(env) {
  const envName = (env && env.ENVIRONMENT) || 'production';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Task Manager | Cloudflare & Terraform IaC</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <div class="logo-icon">📋</div>
        <div>
          <h1>Student Task Manager</h1>
          <p class="subtitle">Automated Serverless Academic Task Management • Terraform IaC Demo</p>
        </div>
      </div>
      <div class="header-badges">
        <span class="badge badge-cloudflare">⚡ Cloudflare Workers</span>
        <span class="badge badge-kv">🗄️ Workers KV</span>
        <span class="badge badge-terraform">🏗️ Terraform Managed</span>
      </div>
    </header>

    <section class="iac-banner">
      <div class="banner-content">
        <span class="status-indicator"></span>
        <span class="banner-text"><strong>Architecture:</strong> End User &rarr; Cloudflare Edge Worker &rarr; Workers KV Persistent Storage (Provisioned via Terraform IaC & GitHub Actions)</span>
      </div>
      <div class="banner-env">
        <span class="env-tag" id="envBadge">${envName}</span>
      </div>
    </section>

    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Tasks</div>
        <div class="stat-value" id="statTotal">0</div>
        <div class="stat-sub">Tracked in Workers KV</div>
      </div>
      <div class="stat-card stat-pending">
        <div class="stat-label">Pending</div>
        <div class="stat-value" id="statPending">0</div>
        <div class="stat-sub">Needs attention</div>
      </div>
      <div class="stat-card stat-progress">
        <div class="stat-label">In Progress</div>
        <div class="stat-value" id="statProgress">0</div>
        <div class="stat-sub">Currently underway</div>
      </div>
      <div class="stat-card stat-completed">
        <div class="stat-label">Completed</div>
        <div class="stat-value" id="statCompleted">0</div>
        <div class="stat-sub">Finished successfully</div>
      </div>
    </section>

    <main class="main-layout">
      <section class="panel create-panel">
        <div class="panel-header">
          <h2>➕ Add New Task</h2>
          <span class="hint">POST /api/tasks</span>
        </div>
        <form id="createTaskForm">
          <div class="form-group">
            <label for="taskTitle">Task Title <span class="required">*</span></label>
            <input type="text" id="taskTitle" placeholder="e.g., Complete Cloud Computing Assignment" required autocomplete="off">
          </div>
          <div class="form-row">
            <div class="form-group col">
              <label for="taskPriority">Priority</label>
              <select id="taskPriority">
                <option value="High">🔴 High</option>
                <option value="Medium" selected>🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
            </div>
            <div class="form-group col">
              <label for="taskStatus">Initial Status</label>
              <select id="taskStatus">
                <option value="Pending" selected>⏳ Pending</option>
                <option value="In Progress">🔄 In Progress</option>
                <option value="Completed">✅ Completed</option>
              </select>
            </div>
          </div>
          <div class="sample-pills">
            <span class="sample-label">Quick samples:</span>
            <button type="button" class="btn-pill" data-title="Complete Cloud Computing Assignment" data-priority="High">Cloud Assignment</button>
            <button type="button" class="btn-pill" data-title="Prepare Project Presentation" data-priority="High">Project Presentation</button>
            <button type="button" class="btn-pill" data-title="Submit Final Year Project Report" data-priority="High">Project Report</button>
            <button type="button" class="btn-pill" data-title="Attend Project Viva" data-priority="Medium">Project Viva</button>
          </div>
          <button type="submit" class="btn btn-primary" id="btnSubmitTask">
            <span class="btn-icon">💾</span> Create Task
          </button>
        </form>
      </section>

      <section class="panel list-panel">
        <div class="panel-header">
          <div class="header-with-count">
            <h2>📑 Academic Tasks</h2>
            <span class="count-badge" id="taskCountBadge">0</span>
          </div>
          <button class="btn btn-secondary btn-sm" id="btnRefresh" title="Reload tasks from KV">
            🔄 Refresh
          </button>
        </div>

        <div class="toolbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchInput" placeholder="Search by ID or Title...">
          </div>
          <div class="filter-group">
            <label for="filterStatus">Status:</label>
            <select id="filterStatus">
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="filterPriority">Priority:</label>
            <select id="filterPriority">
              <option value="All">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="tasks-table">
            <thead>
              <tr>
                <th style="width: 90px;">Task ID</th>
                <th>Task Title</th>
                <th style="width: 110px;">Priority</th>
                <th style="width: 130px;">Status</th>
                <th style="width: 140px;">Created Date</th>
                <th style="width: 160px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="tasksTableBody">
              <tr>
                <td colspan="6" class="loading-state">
                  <div class="spinner"></div>
                  <p>Loading tasks from Cloudflare Workers KV...</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <div class="modal-backdrop" id="editModalBackdrop">
      <div class="modal">
        <div class="modal-header">
          <h3>✏️ Edit Task: <span id="editTaskIdLabel" class="mono"></span></h3>
          <button class="modal-close" id="btnCancelEdit">&times;</button>
        </div>
        <form id="editTaskForm">
          <input type="hidden" id="editTaskId">
          <div class="form-group">
            <label for="editTaskTitle">Task Title</label>
            <input type="text" id="editTaskTitle" required>
          </div>
          <div class="form-row">
            <div class="form-group col">
              <label for="editTaskPriority">Priority</label>
              <select id="editTaskPriority">
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
            </div>
            <div class="form-group col">
              <label for="editTaskStatus">Status</label>
              <select id="editTaskStatus">
                <option value="Pending">⏳ Pending</option>
                <option value="In Progress">🔄 In Progress</option>
                <option value="Completed">✅ Completed</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="btnModalCancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <div id="toast" class="toast"></div>

    <footer class="app-footer">
      <div class="footer-left">
        <p><strong>Course Mini Project:</strong> Infrastructure as Code (IaC) with Terraform & Cloudflare Serverless</p>
        <p class="footer-sub">Resources provisioned purely via code: <code>cloudflare_workers_kv_namespace</code> &bull; <code>cloudflare_worker_script</code></p>
      </div>
      <div class="footer-right">
        <div class="api-status">
          <span class="status-dot"></span>
          <span>Workers KV API Online</span>
        </div>
      </div>
    </footer>
  </div>

  <script src="/script.js"></script>
</body>
</html>`;
}

const STYLE_CSS = `
:root {
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --primary-subtle: #eff6ff;
  --bg-main: #f8fafc;
  --bg-card: #ffffff;
  --border: #e2e8f0;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --text-subtle: #94a3b8;
  --cf-orange: #f38020;
  --tf-purple: #7b42bc;
  --priority-high-bg: #fee2e2;
  --priority-high-text: #b91c1c;
  --priority-med-bg: #fef3c7;
  --priority-med-text: #b45309;
  --priority-low-bg: #dcfce7;
  --priority-low-text: #15803d;
  --status-pending-bg: #ffedd5;
  --status-pending-text: #c2410c;
  --status-progress-bg: #e0f2fe;
  --status-progress-text: #0369a1;
  --status-completed-bg: #d1fae5;
  --status-completed-text: #065f46;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg-main); color: var(--text-main); line-height: 1.5; min-height: 100vh; padding: 24px 16px; }
.mono { font-family: 'JetBrains Mono', monospace; }
.app-container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
.app-header { background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.header-left { display: flex; align-items: center; gap: 16px; }
.logo-icon { font-size: 2.2rem; background: var(--primary-subtle); padding: 12px; border-radius: var(--radius-md); }
.app-header h1 { font-size: 1.6rem; font-weight: 700; }
.subtitle { font-size: 0.9rem; color: var(--text-muted); }
.header-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.badge { font-size: 0.78rem; font-weight: 600; padding: 6px 12px; border-radius: 9999px; }
.badge-cloudflare { background: #fff7ed; color: var(--cf-orange); border: 1px solid #fed7aa; }
.badge-kv { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.badge-terraform { background: #f5f3ff; color: var(--tf-purple); border: 1px solid #ddd6fe; }
.iac-banner { background: linear-gradient(90deg, #1e293b 0%, #0f172a 100%); color: #f8fafc; padding: 12px 20px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 0.85rem; }
.banner-content { display: flex; align-items: center; gap: 10px; }
.status-indicator { width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }
.env-tag { background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: var(--radius-sm); font-family: monospace; font-size: 0.75rem; text-transform: uppercase; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.stat-card { background: var(--bg-card); padding: 18px 20px; border-radius: var(--radius-md); border: 1px solid var(--border); }
.stat-label { font-size: 0.82rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; }
.stat-value { font-size: 2rem; font-weight: 700; margin: 4px 0 2px 0; }
.stat-sub { font-size: 0.75rem; color: var(--text-subtle); }
.stat-pending .stat-value { color: #ea580c; }
.stat-progress .stat-value { color: #0284c7; }
.stat-completed .stat-value { color: #059669; }
.main-layout { display: grid; grid-template-columns: 360px 1fr; gap: 20px; align-items: start; }
@media (max-width: 900px) { .main-layout { grid-template-columns: 1fr; } }
.panel { background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border); padding: 24px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.panel-header h2 { font-size: 1.15rem; font-weight: 600; }
.panel-header .hint { font-family: monospace; font-size: 0.75rem; background: var(--bg-main); padding: 4px 8px; border-radius: var(--radius-sm); color: var(--text-muted); }
.header-with-count { display: flex; align-items: center; gap: 10px; }
.count-badge { background: var(--primary-subtle); color: var(--primary); font-size: 0.8rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 0.85rem; font-weight: 500; margin-bottom: 6px; }
.form-group label .required { color: #ef4444; }
input[type="text"], select { width: 100%; padding: 10px 12px; font-size: 0.9rem; border: 1px solid var(--border); border-radius: var(--radius-sm); }
input[type="text"]:focus, select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
.form-row { display: flex; gap: 12px; }
.form-row .col { flex: 1; }
.sample-pills { margin: 12px 0 18px 0; display: flex; flex-wrap: wrap; gap: 6px; }
.sample-label { font-size: 0.75rem; color: var(--text-muted); width: 100%; margin-bottom: 2px; }
.btn-pill { background: var(--bg-main); border: 1px dashed var(--border); padding: 4px 8px; font-size: 0.72rem; border-radius: 9999px; color: var(--text-muted); cursor: pointer; }
.btn-pill:hover { background: var(--primary-subtle); color: var(--primary); border-color: var(--primary); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 18px; font-size: 0.88rem; font-weight: 500; border-radius: var(--radius-sm); cursor: pointer; border: none; }
.btn-primary { background-color: var(--primary); color: #fff; width: 100%; }
.btn-primary:hover { background-color: var(--primary-hover); }
.btn-secondary { background: var(--bg-main); color: var(--text-main); border: 1px solid var(--border); }
.btn-sm { padding: 6px 12px; font-size: 0.8rem; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.search-box { position: relative; flex: 1; min-width: 200px; }
.search-box .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-subtle); }
.search-box input { padding-left: 32px; }
.filter-group { display: flex; align-items: center; gap: 6px; }
.filter-group label { font-size: 0.8rem; color: var(--text-muted); }
.filter-group select { width: auto; padding: 8px 10px; font-size: 0.82rem; }
.table-responsive { overflow-x: auto; }
.tasks-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
.tasks-table th { background: var(--bg-main); color: var(--text-muted); font-weight: 600; padding: 10px 14px; font-size: 0.78rem; text-transform: uppercase; border-bottom: 1px solid var(--border); }
.tasks-table td { padding: 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tasks-table tr:hover td { background-color: #f8fafc; }
.task-id-badge { font-family: monospace; font-weight: 600; font-size: 0.8rem; background: #f1f5f9; padding: 3px 6px; border-radius: var(--radius-sm); }
.task-title-cell { font-weight: 500; }
.task-date-cell { font-size: 0.78rem; color: var(--text-muted); }
.pill { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
.pill-priority-high { background: var(--priority-high-bg); color: var(--priority-high-text); }
.pill-priority-medium { background: var(--priority-med-bg); color: var(--priority-med-text); }
.pill-priority-low { background: var(--priority-low-bg); color: var(--priority-low-text); }
.pill-status-pending { background: var(--status-pending-bg); color: var(--status-pending-text); }
.pill-status-in-progress { background: var(--status-progress-bg); color: var(--status-progress-text); }
.pill-status-completed { background: var(--status-completed-bg); color: var(--status-completed-text); }
.action-buttons { display: flex; gap: 6px; justify-content: flex-end; }
.btn-icon-action { background: var(--bg-main); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 8px; font-size: 0.8rem; cursor: pointer; }
.btn-icon-action.delete:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }
.loading-state, .empty-state { text-align: center; padding: 40px 16px !important; color: var(--text-muted); }
.spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; visibility: hidden; transition: 0.2s; padding: 16px; }
.modal-backdrop.open { opacity: 1; visibility: visible; }
.modal { background: var(--bg-card); border-radius: var(--radius-lg); max-width: 480px; width: 100%; padding: 24px; box-shadow: var(--shadow-lg); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-close { background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.toast { position: fixed; bottom: 24px; right: 24px; background: #1e293b; color: #fff; padding: 12px 20px; border-radius: var(--radius-md); font-size: 0.88rem; opacity: 0; transform: translateY(20px); transition: 0.25s; z-index: 2000; }
.toast.show { opacity: 1; transform: translateY(0); }
.toast.success { border-left: 4px solid #10b981; }
.toast.error { border-left: 4px solid #ef4444; }
.app-footer { margin-top: 10px; padding: 16px 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 0.8rem; color: var(--text-muted); }
.footer-sub { font-size: 0.74rem; color: var(--text-subtle); margin-top: 2px; }
.api-status { display: flex; align-items: center; gap: 6px; font-size: 0.76rem; color: #10b981; font-weight: 500; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
`;

const SCRIPT_JS = `
const API_BASE = '/api/tasks';
let tasks = [];
let activeFilters = { search: '', status: 'All', priority: 'All' };

const tasksTableBody = document.getElementById('tasksTableBody');
const createTaskForm = document.getElementById('createTaskForm');
const taskTitleInput = document.getElementById('taskTitle');
const taskPriorityInput = document.getElementById('taskPriority');
const taskStatusInput = document.getElementById('taskStatus');
const btnSubmitTask = document.getElementById('btnSubmitTask');
const btnRefresh = document.getElementById('btnRefresh');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const taskCountBadge = document.getElementById('taskCountBadge');

const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statProgress = document.getElementById('statProgress');
const statCompleted = document.getElementById('statCompleted');

const editModalBackdrop = document.getElementById('editModalBackdrop');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskId = document.getElementById('editTaskId');
const editTaskIdLabel = document.getElementById('editTaskIdLabel');
const editTaskTitle = document.getElementById('editTaskTitle');
const editTaskPriority = document.getElementById('editTaskPriority');
const editTaskStatus = document.getElementById('editTaskStatus');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const btnModalCancel = document.getElementById('btnModalCancel');

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadTasks();
});

function setupEventListeners() {
  createTaskForm.addEventListener('submit', handleCreateTask);
  editTaskForm.addEventListener('submit', handleUpdateTask);
  btnRefresh.addEventListener('click', () => {
    showToast('Refreshing tasks from Workers KV...', 'info');
    loadTasks();
  });
  searchInput.addEventListener('input', (e) => {
    activeFilters.search = e.target.value.trim().toLowerCase();
    renderTasks();
  });
  filterStatus.addEventListener('change', (e) => {
    activeFilters.status = e.target.value;
    renderTasks();
  });
  filterPriority.addEventListener('change', (e) => {
    activeFilters.priority = e.target.value;
    renderTasks();
  });
  document.querySelectorAll('.btn-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      taskTitleInput.value = btn.dataset.title;
      taskPriorityInput.value = btn.dataset.priority;
      taskTitleInput.focus();
    });
  });
  btnCancelEdit.addEventListener('click', closeModal);
  btnModalCancel.addEventListener('click', closeModal);
  editModalBackdrop.addEventListener('click', (e) => {
    if (e.target === editModalBackdrop) closeModal();
  });
}

async function loadTasks() {
  renderLoadingState();
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('HTTP error ' + res.status);
    const data = await res.json();
    tasks = Array.isArray(data) ? data : (data.tasks || []);
    renderTasks();
    updateStats();
  } catch (err) {
    console.error('Failed to fetch tasks:', err);
    renderErrorState('Could not connect to Workers KV: ' + err.message);
  }
}

async function handleCreateTask(e) {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  const priority = taskPriorityInput.value;
  const status = taskStatusInput.value;
  if (!title) return;

  btnSubmitTask.disabled = true;
  btnSubmitTask.innerHTML = '<span class="spinner" style="width:16px;height:16px;margin:0 6px 0 0;display:inline-block;vertical-align:middle;"></span> Saving to KV...';

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, status })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'HTTP error ' + res.status);
    }
    const result = await res.json();
    showToast('Task ' + (result.task ? result.task.id : '') + ' created successfully in KV!', 'success');
    taskTitleInput.value = '';
    taskPriorityInput.value = 'Medium';
    taskStatusInput.value = 'Pending';
    await loadTasks();
  } catch (err) {
    console.error('Create task error:', err);
    showToast('Failed to create task: ' + err.message, 'error');
  } finally {
    btnSubmitTask.disabled = false;
    btnSubmitTask.innerHTML = '<span class="btn-icon">💾</span> Create Task';
  }
}

async function handleUpdateTask(e) {
  e.preventDefault();
  const id = editTaskId.value;
  const title = editTaskTitle.value.trim();
  const priority = editTaskPriority.value;
  const status = editTaskStatus.value;

  try {
    const res = await fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, status })
    });
    if (!res.ok) throw new Error('HTTP error ' + res.status);
    closeModal();
    showToast('Task ' + id + ' updated successfully!', 'success');
    await loadTasks();
  } catch (err) {
    console.error('Update task error:', err);
    showToast('Update failed: ' + err.message, 'error');
  }
}

async function toggleTaskStatus(id, currentStatus) {
  const nextStatus = (currentStatus === 'Completed') ? 'Pending' : 'Completed';
  try {
    const res = await fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    if (!res.ok) throw new Error('HTTP error ' + res.status);
    showToast('Task ' + id + ' marked as ' + nextStatus, 'success');
    await loadTasks();
  } catch (err) {
    console.error('Toggle status error:', err);
    showToast('Status update failed: ' + err.message, 'error');
  }
}

async function deleteTask(id) {
  if (!confirm('Are you sure you want to permanently delete task ' + id + ' from Cloudflare Workers KV?')) {
    return;
  }
  try {
    const res = await fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('HTTP error ' + res.status);
    showToast('Task ' + id + ' permanently removed from KV', 'success');
    await loadTasks();
  } catch (err) {
    console.error('Delete task error:', err);
    showToast('Delete failed: ' + err.message, 'error');
  }
}

function renderTasks() {
  const filtered = tasks.filter(task => {
    const matchesSearch = !activeFilters.search ||
      task.title.toLowerCase().includes(activeFilters.search) ||
      task.id.toLowerCase().includes(activeFilters.search);
    const matchesStatus = (activeFilters.status === 'All') ||
      (task.status.toLowerCase() === activeFilters.status.toLowerCase());
    const matchesPriority = (activeFilters.priority === 'All') ||
      (task.priority.toLowerCase() === activeFilters.priority.toLowerCase());
    return matchesSearch && matchesStatus && matchesPriority;
  });

  taskCountBadge.textContent = filtered.length + ' of ' + tasks.length;

  if (filtered.length === 0) {
    tasksTableBody.innerHTML = '<tr><td colspan="6" class="empty-state"><div style="font-size:2rem;margin-bottom:8px;">📭</div><p><strong>No academic tasks found.</strong></p></td></tr>';
    return;
  }

  tasksTableBody.innerHTML = filtered.map(task => {
    const priorityClass = 'pill-priority-' + task.priority.toLowerCase();
    const statusClass = 'pill-status-' + task.status.toLowerCase().replace(/\\s+/g, '-');
    const isCompleted = task.status === 'Completed';

    return '<tr data-id="' + escapeHtml(task.id) + '">' +
      '<td><span class="task-id-badge">' + escapeHtml(task.id) + '</span></td>' +
      '<td class="task-title-cell" style="' + (isCompleted ? 'text-decoration: line-through; opacity: 0.75;' : '') + '">' + escapeHtml(task.title) + '</td>' +
      '<td><span class="pill ' + priorityClass + '">' + escapeHtml(task.priority) + '</span></td>' +
      '<td><span class="pill ' + statusClass + '">' + escapeHtml(task.status) + '</span></td>' +
      '<td class="task-date-cell">' + formatDate(task.createdAt) + '</td>' +
      '<td><div class="action-buttons">' +
        '<button class="btn-icon-action" onclick="toggleTaskStatus(\\'' + escapeHtml(task.id) + '\\', \\'' + escapeHtml(task.status) + '\\')" title="Toggle Status">' + (isCompleted ? '↩️' : '✅') + '</button>' +
        '<button class="btn-icon-action" onclick="openEditModal(\\'' + escapeHtml(task.id) + '\\')" title="Edit Task">✏️</button>' +
        '<button class="btn-icon-action delete" onclick="deleteTask(\\'' + escapeHtml(task.id) + '\\')" title="Delete Task">🗑️</button>' +
      '</div></td></tr>';
  }).join('');
}

function updateStats() {
  statTotal.textContent = tasks.length;
  statPending.textContent = tasks.filter(t => t.status === 'Pending').length;
  statProgress.textContent = tasks.filter(t => t.status === 'In Progress').length;
  statCompleted.textContent = tasks.filter(t => t.status === 'Completed').length;
}

function renderLoadingState() {
  tasksTableBody.innerHTML = '<tr><td colspan="6" class="loading-state"><div class="spinner"></div><p>Loading tasks from Cloudflare Workers KV...</p></td></tr>';
}

function renderErrorState(message) {
  tasksTableBody.innerHTML = '<tr><td colspan="6" class="empty-state" style="color:#ef4444;"><p><strong>Error loading tasks</strong></p><p>' + escapeHtml(message) + '</p></td></tr>';
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editTaskId.value = task.id;
  editTaskIdLabel.textContent = task.id;
  editTaskTitle.value = task.title;
  editTaskPriority.value = task.priority;
  editTaskStatus.value = task.status;
  editModalBackdrop.classList.add('open');
}

function closeModal() {
  editModalBackdrop.classList.remove('open');
}

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.className = 'toast show ' + (type || 'info');
  toast.textContent = message;
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return isoStr; }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

window.toggleTaskStatus = toggleTaskStatus;
window.openEditModal = openEditModal;
window.deleteTask = deleteTask;
window.loadTasks = loadTasks;
`;
