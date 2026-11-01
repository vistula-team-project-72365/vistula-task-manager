let config = null;
let editingId = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const submitButton = document.getElementById("task-submit");
const cancelButton = document.getElementById("cancel-edit");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");

function showMessage(text, isError) {
  statusMessage.textContent = text;
  statusMessage.className = isError ? "error" : "success";
}

function getHeaders() {
  return {
    "apikey": config.supabasePublishableKey,
    "Authorization": "Bearer " + config.supabasePublishableKey,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };
}

function getApiUrl() {
  return config.supabaseUrl + "/rest/v1/" + config.tableName;
}

async function loadConfig() {
  const response = await fetch("config.json");
  if (!response.ok) {
    throw new Error("Could not load config.json");
  }
  config = await response.json();
}

async function fetchTasks() {
  const response = await fetch(getApiUrl() + "?select=*&order=id.asc", {
    headers: getHeaders()
  });
  if (!response.ok) {
    throw new Error("Failed to load tasks (" + response.status + ")");
  }
  return await response.json();
}

async function createTask(task) {
  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(task)
  });
  if (!response.ok) {
    throw new Error("Failed to create task (" + response.status + ")");
  }
}

async function updateTask(id, changes) {
  const response = await fetch(getApiUrl() + "?id=eq." + id, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(changes)
  });
  if (!response.ok) {
    throw new Error("Failed to update task (" + response.status + ")");
  }
}

async function deleteTask(id) {
  const response = await fetch(getApiUrl() + "?id=eq." + id, {
    method: "DELETE",
    headers: getHeaders()
  });
  if (!response.ok) {
    throw new Error("Failed to delete task (" + response.status + ")");
  }
}

function renderTasks(tasks) {
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    taskList.innerHTML = "<p class='empty'>No tasks yet. Add one above!</p>";
    return;
  }

  tasks.forEach(function (task) {
    const item = document.createElement("div");
    item.className = "task-item" + (task.completed ? " completed" : "");
    item.dataset.id = task.id;

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;

    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description || "";

    const status = document.createElement("span");
    status.className = "task-status";
    status.textContent = task.completed ? "Completed" : "Incomplete";

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const toggleButton = document.createElement("button");
    toggleButton.className = "toggle-task";
    toggleButton.textContent = task.completed ? "Mark Incomplete" : "Mark Complete";
    toggleButton.addEventListener("click", function () {
      handleToggle(task);
    });

    const editButton = document.createElement("button");
    editButton.className = "edit-task";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      startEdit(task);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-task";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      handleDelete(task.id);
    });

    actions.appendChild(toggleButton);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    item.appendChild(title);
    item.appendChild(description);
    item.appendChild(status);
    item.appendChild(actions);

    taskList.appendChild(item);
  });
}

async function refreshTasks() {
  try {
    const tasks = await fetchTasks();
    renderTasks(tasks);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function startEdit(task) {
  editingId = task.id;
  titleInput.value = task.title;
  descriptionInput.value = task.description || "";
  submitButton.textContent = "Save Changes";
  cancelButton.classList.remove("hidden");
  titleInput.focus();
}

function resetForm() {
  editingId = null;
  form.reset();
  submitButton.textContent = "Add Task";
  cancelButton.classList.add("hidden");
}

async function handleSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) {
    showMessage("Title is required.", true);
    return;
  }

  try {
    if (editingId === null) {
      await createTask({ title: title, description: description, completed: false });
      showMessage("Task added.", false);
    } else {
      await updateTask(editingId, { title: title, description: description });
      showMessage("Task updated.", false);
    }
    resetForm();
    await refreshTasks();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function handleToggle(task) {
  try {
    await updateTask(task.id, { completed: !task.completed });
    showMessage("Task status changed.", false);
    await refreshTasks();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function handleDelete(id) {
  if (!confirm("Delete this task?")) {
    return;
  }
  try {
    await deleteTask(id);
    if (editingId === id) {
      resetForm();
    }
    showMessage("Task deleted.", false);
    await refreshTasks();
  } catch (error) {
    showMessage(error.message, true);
  }
}

form.addEventListener("submit", handleSubmit);
cancelButton.addEventListener("click", resetForm);

async function init() {
  try {
    await loadConfig();
    await refreshTasks();
  } catch (error) {
    showMessage(error.message, true);
  }
}

init();
