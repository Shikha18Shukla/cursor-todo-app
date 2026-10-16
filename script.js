'use strict';

/* ===== State ===== */
let tasks = [];
let currentFilter = 'all';
const STORAGE_KEY = 'taskflow-tasks';

/* ===== DOM Elements ===== */
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const inputError = document.getElementById('input-error');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const emptyMessage = document.getElementById('empty-message');
const totalCountEl = document.getElementById('total-count');
const completedCountEl = document.getElementById('completed-count');
const filterButtons = document.querySelectorAll('.filter-btn');

/* ===== Initialization ===== */
function init() {
  loadTasks();
  render();
  setupEventListeners();
}

/* ===== localStorage ===== */
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      tasks = JSON.parse(stored);
      // Validate data integrity
      if (!Array.isArray(tasks)) {
        tasks = [];
      } else {
        tasks = tasks.filter(t => t && typeof t.text === 'string');
      }
    }
  } catch (e) {
    console.warn('Failed to load tasks from localStorage:', e);
    tasks = [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to localStorage:', e);
  }
}

/* ===== Task Operations ===== */
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    showError('Please enter a task.');
    return;
  }

  tasks.push({
    id: Date.now() + Math.random().toString(36).slice(2, 8),
    text: trimmed,
    completed: false,
    createdAt: Date.now()
  });

  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    render();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function editTask(id, newText) {
  const trimmed = newText.trim();
  const task = tasks.find(t => t.id === id);

  if (!task) return;

  if (!trimmed) {
    // Revert if empty — reload from storage
    loadTasks();
    render();
    showError('Task cannot be empty.');
    return;
  }

  task.text = trimmed;
  saveTasks();
  render();
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
}

/* ===== Rendering ===== */
function getFilteredTasks() {
  switch (currentFilter) {
    case 'active':
      return tasks.filter(t => !t.completed);
    case 'completed':
      return tasks.filter(t => t.completed);
    default:
      return tasks;
  }
}

function render() {
  const filtered = getFilteredTasks();
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;

  // Stats
  totalCountEl.textContent = total;
  completedCountEl.textContent = completed;

  // Empty state
  if (filtered.length === 0) {
    taskList.innerHTML = '';
    taskList.style.display = 'none';
    emptyState.style.display = 'flex';
    updateEmptyMessage(total);
    return;
  }

  emptyState.style.display = 'none';
  taskList.style.display = 'flex';
  taskList.innerHTML = filtered.map(createTaskHTML).join('');
}

function createTaskHTML(task) {
  return `
    <li class="task-item${task.completed ? ' completed' : ''}" data-id="${task.id}">
      <label class="task-checkbox">
        <input
          type="checkbox"
          aria-label="Mark "${escapeHTML(task.text)}" as ${task.completed ? 'active' : 'completed'}"
          ${task.completed ? 'checked' : ''}
          data-action="toggle"
          data-id="${task.id}"
        />
        <span class="checkmark" aria-hidden="true"></span>
      </label>
      <span class="task-text" title="Double-click to edit">${escapeHTML(task.text)}</span>
      <button
        class="btn-delete"
        data-action="delete"
        data-id="${task.id}"
        aria-label="Delete task: ${escapeHTML(task.text)}"
        title="Delete task"
      >&times;</button>
    </li>
  `;
}

function updateEmptyMessage(total) {
  if (total === 0) {
    emptyMessage.textContent = 'No tasks yet. Add one above!';
  } else if (currentFilter === 'active') {
    emptyMessage.textContent = 'No active tasks. Nice work! 🎉';
  } else if (currentFilter === 'completed') {
    emptyMessage.textContent = 'No completed tasks yet.';
  } else {
    emptyMessage.textContent = 'No tasks found.';
  }
}

/* ===== Error Handling ===== */
function showError(message) {
  inputError.textContent = message;
  taskInput.classList.add('error');
  taskInput.focus();
}

function clearError() {
  inputError.textContent = '';
  taskInput.classList.remove('error');
}

/* ===== Escape HTML to prevent XSS ===== */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ===== Inline Editing ===== */
function startEditing(taskItem, id) {
  const textEl = taskItem.querySelector('.task-text');
  const currentText = tasks.find(t => t.id === id)?.text || '';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.className = 'task-edit-input';
  input.maxLength = 200;
  input.setAttribute('aria-label', 'Edit task');

  textEl.replaceWith(input);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  let finished = false;

  const finish = (save) => {
    if (finished) return;
    finished = true;

    if (save) {
      editTask(id, input.value);
    } else {
      render();
    }
  };

  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });
}

/* ===== Event Listeners ===== */
function setupEventListeners() {
  // Add task
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();
    addTask(taskInput.value);
    taskInput.value = '';
    taskInput.focus();
  });

  // Clear error on input
  taskInput.addEventListener('input', clearError);

  // Filter buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // Task list actions (event delegation)
  taskList.addEventListener('change', (e) => {
    if (e.target.dataset.action === 'toggle') {
      toggleTask(e.target.dataset.id);
    }
  });

  taskList.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'delete') {
      deleteTask(e.target.dataset.id);
    }
  });

  // Double-click to edit
  taskList.addEventListener('dblclick', (e) => {
    if (e.target.classList.contains('task-text')) {
      const taskItem = e.target.closest('.task-item');
      if (taskItem) {
        startEditing(taskItem, taskItem.dataset.id);
      }
    }
  });
}

/* ===== Start ===== */
init();
