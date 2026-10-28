/**
 * Student Task Management Application - Client-side Controller
 * Interacts with Cloudflare Worker REST API backed by Cloudflare Workers KV
 */

const API_BASE = '/api/tasks';

// State
let tasks = [];
let activeFilters = {
  search: '',
  status: 'All',
  priority: 'All'
};

// DOM Elements
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

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statProgress = document.getElementById('statProgress');
const statCompleted = document.getElementById('statCompleted');

// Modal Elements
const editModalBackdrop = document.getElementById('editModalBackdrop');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskId = document.getElementById('editTaskId');
const editTaskIdLabel = document.getElementById('editTaskIdLabel');
const editTaskTitle = document.getElementById('editTaskTitle');
const editTaskPriority = document.getElementById('editTaskPriority');
const editTaskStatus = document.getElementById('editTaskStatus');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const btnModalCancel = document.getElementById('btnModalCancel');

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadTasks();
});

function setupEventListeners() {
  // Form submission
  createTaskForm.addEventListener('submit', handleCreateTask);
  editTaskForm.addEventListener('submit', handleUpdateTask);

  // Refresh
  btnRefresh.addEventListener('click', () => {
    showToast('Refreshing tasks from Workers KV...', 'info');
    loadTasks();
  });

  // Search & Filters
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

  // Sample quick buttons
  document.querySelectorAll('.btn-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      taskTitleInput.value = btn.dataset.title;
      taskPriorityInput.value = btn.dataset.priority;
      taskTitleInput.focus();
    });
  });

  // Modal close handlers
  btnCancelEdit.addEventListener('click', closeModal);
  btnModalCancel.addEventListener('click', closeModal);
  editModalBackdrop.addEventListener('click', (e) => {
    if (e.target === editModalBackdrop) closeModal();
  });
}

// --------------------------------------------------------------------------
// API Calls (CRUD Operations)
// --------------------------------------------------------------------------

/**
 * FR2: Read All Tasks (GET /api/tasks)
 */
async function loadTasks() {
  renderLoadingState();
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    tasks = Array.isArray(data) ? data : (data.tasks || []);
    renderTasks();
    updateStats();
  } catch (err) {
    console.error('Failed to fetch tasks:', err);
    renderErrorState(`Could not connect to Workers KV: ${err.message}`);
  }
}

/**
 * FR1: Create Task (POST /api/tasks)
 */
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
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    const result = await res.json();
    showToast(`Task ${result.task ? result.task.id : ''} created successfully in KV!`, 'success');

    // Reset Form
    taskTitleInput.value = '';
    taskPriorityInput.value = 'Medium';
    taskStatusInput.value = 'Pending';

    // Reload tasks
    await loadTasks();
  } catch (err) {
    console.error('Create task error:', err);
    showToast(`Failed to create task: ${err.message}`, 'error');
  } finally {
    btnSubmitTask.disabled = false;
    btnSubmitTask.innerHTML = '<span class="btn-icon">💾</span> Create Task';
  }
}

/**
 * FR3: Update Task (PUT /api/tasks/:id)
 */
async function handleUpdateTask(e) {
  e.preventDefault();
  const id = editTaskId.value;
  const title = editTaskTitle.value.trim();
  const priority = editTaskPriority.value;
  const status = editTaskStatus.value;

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, status })
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    closeModal();
    showToast(`Task ${id} updated successfully!`, 'success');
    await loadTasks();
  } catch (err) {
    console.error('Update task error:', err);
    showToast(`Update failed: ${err.message}`, 'error');
  }
}

/**
 * FR3 (Quick Status Toggle): Changes Pending -> Completed, or Completed -> Pending
 */
async function toggleTaskStatus(id, currentStatus) {
  const nextStatus = (currentStatus === 'Completed') ? 'Pending' : 'Completed';
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    showToast(`Task ${id} marked as ${nextStatus}`, 'success');
    await loadTasks();
  } catch (err) {
    console.error('Toggle status error:', err);
    showToast(`Status update failed: ${err.message}`, 'error');
  }
}

/**
 * FR4: Delete Task (DELETE /api/tasks/:id)
 */
async function deleteTask(id) {
  if (!confirm(`Are you sure you want to permanently delete task ${id} from Cloudflare Workers KV?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    showToast(`Task ${id} permanently removed from KV`, 'success');
    await loadTasks();
  } catch (err) {
    console.error('Delete task error:', err);
    showToast(`Delete failed: ${err.message}`, 'error');
  }
}

// --------------------------------------------------------------------------
// UI Rendering & Filtering
// --------------------------------------------------------------------------

function renderTasks() {
  const filtered = tasks.filter(task => {
    // Search match (id or title)
    const matchesSearch = !activeFilters.search ||
      task.title.toLowerCase().includes(activeFilters.search) ||
      task.id.toLowerCase().includes(activeFilters.search);

    // Status filter
    const matchesStatus = (activeFilters.status === 'All') ||
      (task.status.toLowerCase() === activeFilters.status.toLowerCase());

    // Priority filter
    const matchesPriority = (activeFilters.priority === 'All') ||
      (task.priority.toLowerCase() === activeFilters.priority.toLowerCase());

    return matchesSearch && matchesStatus && matchesPriority;
  });

  taskCountBadge.textContent = `${filtered.length} of ${tasks.length}`;

  if (filtered.length === 0) {
    tasksTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div style="font-size: 2rem; margin-bottom: 8px;">📭</div>
          <p><strong>No academic tasks found.</strong></p>
          <p style="font-size: 0.8rem; color: var(--text-subtle);">Create a new task on the left or adjust your search filters.</p>
        </td>
      </tr>
    `;
    return;
  }

  tasksTableBody.innerHTML = filtered.map(task => {
    const priorityClass = `pill-priority-${task.priority.toLowerCase()}`;
    const statusClass = `pill-status-${task.status.toLowerCase().replace(/\s+/g, '-')}`;
    const isCompleted = task.status === 'Completed';

    return `
      <tr data-id="${escapeHtml(task.id)}">
        <td><span class="task-id-badge">${escapeHtml(task.id)}</span></td>
        <td class="task-title-cell" style="${isCompleted ? 'text-decoration: line-through; opacity: 0.75;' : ''}">
          ${escapeHtml(task.title)}
        </td>
        <td>
          <span class="pill ${priorityClass}">${escapeHtml(task.priority)}</span>
        </td>
        <td>
          <span class="pill ${statusClass}">${escapeHtml(task.status)}</span>
        </td>
        <td class="task-date-cell">${formatDate(task.createdAt)}</td>
        <td>
          <div class="action-buttons">
            <button 
              class="btn-icon-action" 
              onclick="toggleTaskStatus('${escapeHtml(task.id)}', '${escapeHtml(task.status)}')"
              title="${isCompleted ? 'Mark Pending' : 'Mark Completed'}"
            >
              ${isCompleted ? '↩️' : '✅'}
            </button>
            <button 
              class="btn-icon-action" 
              onclick="openEditModal('${escapeHtml(task.id)}')"
              title="Edit Task"
            >
              ✏️
            </button>
            <button 
              class="btn-icon-action delete" 
              onclick="deleteTask('${escapeHtml(task.id)}')"
              title="Delete Task"
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateStats() {
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const progress = tasks.filter(t => t.status === 'In Progress').length;
  const completed = tasks.filter(t => t.status === 'Completed').length;

  statTotal.textContent = total;
  statPending.textContent = pending;
  statProgress.textContent = progress;
  statCompleted.textContent = completed;
}

function renderLoadingState() {
  tasksTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="loading-state">
        <div class="spinner"></div>
        <p>Loading tasks from Cloudflare Workers KV...</p>
      </td>
    </tr>
  `;
}

function renderErrorState(message) {
  tasksTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="empty-state" style="color: #ef4444;">
        <div style="font-size: 2rem; margin-bottom: 8px;">⚠️</div>
        <p><strong>Error loading tasks</strong></p>
        <p style="font-size: 0.82rem;">${escapeHtml(message)}</p>
        <button class="btn btn-secondary btn-sm" onclick="loadTasks()" style="margin-top: 12px;">Try Again</button>
      </td>
    </tr>
  `;
}

// --------------------------------------------------------------------------
// Modal Helpers
// --------------------------------------------------------------------------

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

// --------------------------------------------------------------------------
// Utilities
// --------------------------------------------------------------------------

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.className = `toast show ${type}`;
  toast.textContent = message;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return isoStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Expose handlers to window for inline onclick attributes
window.toggleTaskStatus = toggleTaskStatus;
window.openEditModal = openEditModal;
window.deleteTask = deleteTask;
window.loadTasks = loadTasks;
