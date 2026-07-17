// State Management
let currentUser = null; // { username, displayName }
let currentSpreadsheet = 'today'; // 'today' or 'week'
let selectedTaskId = null;
let editingTaskId = null;

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Auth Functions
async function handleSignup(event) {
    event.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    try {
        const res = await apiPost('/api/auth/signup', { username, email, password });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showMessage('signupMessage', data.error || 'Sign up failed', 'error');
            return;
        }
        showMessage('signupMessage', 'Account created successfully! Please log in.', 'success');
        setTimeout(() => {
            showScreen('loginScreen');
            document.getElementById('signupForm').reset();
            document.getElementById('signupMessage').innerHTML = '';
        }, 1500);
    } catch (e) {
        showMessage('signupMessage', 'Network error. Please try again.', 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await apiPost('/api/auth/login', { username, password });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showMessage('loginMessage', data.error || 'Invalid username or password', 'error');
            return;
        }
        const data = await res.json();
        currentUser = { username: data.username, displayName: data.displayName };
        document.getElementById('loginForm').reset();
        document.getElementById('loginMessage').innerHTML = '';

        if (!currentUser.displayName) {
            showScreen('nameSetupScreen');
        } else {
            loadProfile();
        }
    } catch (e) {
        showMessage('loginMessage', 'Network error. Please try again.', 'error');
    }
}

async function handleNameSetup(event) {
    event.preventDefault();
    const displayName = document.getElementById('userName').value.trim();

    if (currentUser) {
        try {
            const res = await apiPost('/api/auth/name', {
                username: currentUser.username,
                displayName
            });
            if (res.ok) {
                const data = await res.json();
                currentUser.displayName = data.displayName;
                document.getElementById('nameSetupForm').reset();
                loadProfile();
            }
        } catch (e) {
            // ignore
        }
    }
}

async function loadProfile() {
    document.getElementById('displayUserName').textContent = currentUser.displayName;
    currentSpreadsheet = 'today';
    await updateSpreadsheet();
    showScreen('profileScreen');
}

// Spreadsheet Functions
function switchSpreadsheet(direction) {
    currentSpreadsheet = currentSpreadsheet === 'today' ? 'week' : 'today';
    updateSpreadsheet();
}

async function updateSpreadsheet() {
    const title = document.getElementById('spreadsheetTitle');
    const tbody = document.getElementById('taskTableBody');

    title.textContent = currentSpreadsheet === 'today' ? "Today's Tasks" : "Next 7 Days Tasks";

    const tasks = await getUserTasks();
    const taskList = tasks[currentSpreadsheet] || [];

    if (taskList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-tasks">No tasks for this period. Click "Add Task" to create one.</td></tr>';
    } else {
        tbody.innerHTML = taskList.map(task => `
            <tr class="${task.completed ? 'task-completed' : ''}">
                <td class="checkbox-cell">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskComplete('${task.id}')">
                </td>
                <td>${escapeHtml(task.name)}</td>
                <td>${escapeHtml(task.category)}</td>
                <td>${formatDate(task.dueDate)}</td>
                <td>${getPriorityBadge(task.priority)}</td>
            </tr>
        `).join('');
    }
}

function getPriorityBadge(priority) {
    const colors = {
        'High': '#ff4444',
        'Medium': '#ffaa00',
        'Low': '#44ff44'
    };
    return `<span style="color: ${colors[priority] || '#ffffff'}; font-weight: bold;">${priority}</span>`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
}

async function toggleTaskComplete(taskId) {
    await apiPost(`/api/tasks/${encodeURIComponent(currentUser.username)}/toggle/${encodeURIComponent(taskId)}`, {});
    await updateSpreadsheet();
}

// Modal Functions
function openAddModal() {
    document.getElementById('addTaskForm').reset();
    document.getElementById('addModal').classList.add('active');
}

async function handleAddTask(event) {
    event.preventDefault();

    const newTask = {
        id: 'task_' + Date.now(),
        name: document.getElementById('taskName').value,
        category: document.getElementById('taskCategory').value,
        dueDate: document.getElementById('taskDueDate').value,
        priority: document.getElementById('taskPriority').value,
        completed: false
    };

    await apiPost(`/api/tasks/${encodeURIComponent(currentUser.username)}`, newTask);
    closeModal('addModal');
    await updateSpreadsheet();
}

async function openEditModal() {
    const tasks = await getUserTasks();
    const taskList = tasks[currentSpreadsheet] || [];
    const taskListEl = document.getElementById('editTaskList');

    if (taskList.length === 0) {
        taskListEl.innerHTML = '<div class="no-tasks">No tasks to edit in this view.</div>';
        document.getElementById('editForm').style.display = 'none';
    } else {
        taskListEl.innerHTML = taskList.map(task => `
            <div class="task-item" onclick="selectTaskForEdit('${task.id}')" id="editTask_${task.id}">
                <strong>${escapeHtml(task.name)}</strong> - ${escapeHtml(task.category)} - ${task.priority}
            </div>
        `).join('');
        document.getElementById('editForm').style.display = 'none';
        selectedTaskId = null;
    }

    document.getElementById('editModal').classList.add('active');
}

async function selectTaskForEdit(taskId) {
    document.querySelectorAll('#editTaskList .task-item').forEach(el => {
        el.classList.remove('selected');
    });
    document.getElementById(`editTask_${taskId}`).classList.add('selected');
    selectedTaskId = taskId;

    const tasks = await getUserTasks();
    const taskList = tasks[currentSpreadsheet] || [];
    const task = taskList.find(t => t.id === taskId);

    if (task) {
        document.getElementById('editTaskName').value = task.name;
        document.getElementById('editTaskCategory').value = task.category;
        document.getElementById('editTaskDueDate').value = task.dueDate;
        document.getElementById('editTaskPriority').value = task.priority;
        document.getElementById('editForm').style.display = 'block';
        editingTaskId = taskId;
    }
}

async function saveTaskEdit() {
    if (!editingTaskId) return;

    const updated = {
        id: editingTaskId,
        name: document.getElementById('editTaskName').value,
        category: document.getElementById('editTaskCategory').value,
        dueDate: document.getElementById('editTaskDueDate').value,
        priority: document.getElementById('editTaskPriority').value,
        completed: false
    };

    await apiPut(`/api/tasks/${encodeURIComponent(currentUser.username)}/${encodeURIComponent(editingTaskId)}`, updated);
    await updateSpreadsheet();
    closeModal('editModal');
}

async function openRemoveModal() {
    const tasks = await getUserTasks();
    const taskList = tasks[currentSpreadsheet] || [];
    const taskListEl = document.getElementById('removeTaskList');

    if (taskList.length === 0) {
        taskListEl.innerHTML = '<div class="no-tasks">No tasks to remove in this view.</div>';
    } else {
        taskListEl.innerHTML = taskList.map(task => `
            <div class="task-item">
                <strong>${escapeHtml(task.name)}</strong> - ${escapeHtml(task.category)}
                <button class="btn" style="margin-left: 10px; padding: 5px 15px; font-size: 0.8rem;" onclick="removeTask('${task.id}')">Remove</button>
            </div>
        `).join('');
    }

    document.getElementById('removeModal').classList.add('active');
}

async function removeTask(taskId) {
    await apiDelete(`/api/tasks/${encodeURIComponent(currentUser.username)}/${encodeURIComponent(taskId)}`);
    await updateSpreadsheet();
    openRemoveModal();
}

// Utility Functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    selectedTaskId = null;
    editingTaskId = null;
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = type === 'error' ? 'error-message' : 'success-message';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// API helpers
async function apiPost(url, body) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

async function apiPut(url, body) {
    return fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

async function apiDelete(url) {
    return fetch(url, { method: 'DELETE' });
}

async function getUserTasks() {
    if (!currentUser) return { today: [], week: [] };
    const res = await fetch(`/api/tasks/${encodeURIComponent(currentUser.username)}`);
    if (!res.ok) return { today: [], week: [] };
    return await res.json();
}

// Close modals on escape key
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Initialize
window.addEventListener('load', function () {
    showScreen('startScreen');
});
