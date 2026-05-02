const usersList = document.getElementById("users-list");
const createUserForm = document.getElementById("create-user-form");
const createUserMessage = document.getElementById("create-user-message");
const temporaryPasswordPanel = document.getElementById("temporary-password-panel");
const temporaryPasswordText = document.getElementById("temporary-password-text");
const refreshUsersButton = document.getElementById("refresh-users");

function showTemporaryPassword(password) {
  if (!password) {
    temporaryPasswordPanel.hidden = true;
    temporaryPasswordText.textContent = "";
    return;
  }

  temporaryPasswordText.textContent = password;
  temporaryPasswordPanel.hidden = false;
}

function userStatusLabel(user) {
  return user.isActive ? "Active" : "Inactive";
}

function formatDate(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character];
  });
}

function renderUsers(users) {
  if (!users.length) {
    usersList.innerHTML = "<p>No users have been created yet.</p>";
    return;
  }

  usersList.innerHTML = users
    .map(
      (user) => `
        <article class="user-row ${user.isActive ? "" : "inactive"}">
          <div class="user-details">
            <h3>${escapeHtml(user.name)}</h3>
            <div class="user-meta">
              <span>${escapeHtml(user.email)}</span>
              <span>${escapeHtml(user.department || "No department")}</span>
              <span>Last login: ${formatDate(user.lastLoginAt)}</span>
            </div>
            <div class="user-meta">
              <span class="pill ${user.role === "admin" ? "admin" : ""}">${user.role}</span>
              <span class="pill ${user.isActive ? "" : "inactive"}">${userStatusLabel(user)}</span>
              ${
                user.staffName
                  ? `<span class="pill">Staff: ${escapeHtml(user.staffName)}</span>`
                  : ""
              }
            </div>
          </div>
          <div class="user-actions">
            <button class="secondary" type="button" data-action="reset" data-id="${user.id}">
              Reset password
            </button>
            <button
              class="${user.isActive ? "danger" : "secondary"}"
              type="button"
              data-action="active"
              data-active="${!user.isActive}"
              data-id="${user.id}"
            >
              ${user.isActive ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function loadUsers() {
  usersList.innerHTML = "<p>Loading users...</p>";
  const data = await fetchJson("/api/auth/users");
  renderUsers(data.users || []);
}

createUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  createUserMessage.textContent = "";
  showTemporaryPassword(null);

  const formData = new FormData(createUserForm);
  const payload = {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    department: formData.get("department"),
    password: formData.get("password"),
    createStaff: document.getElementById("create-staff").checked,
  };

  try {
    const data = await fetchJson("/api/auth/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    createUserForm.reset();
    document.getElementById("create-staff").checked = true;
    showTemporaryPassword(data.temporaryPassword);
    await loadUsers();
  } catch (error) {
    createUserMessage.textContent = error.message;
  }
});

usersList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const userId = Number(button.dataset.id);
  const action = button.dataset.action;
  const body =
    action === "reset"
      ? { resetPassword: true }
      : { isActive: button.dataset.active === "true" };

  button.disabled = true;
  showTemporaryPassword(null);

  try {
    const data = await fetchJson(`/api/auth/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    showTemporaryPassword(data.temporaryPassword);
    await loadUsers();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

refreshUsersButton.addEventListener("click", loadUsers);
loadUsers().catch((error) => {
  usersList.innerHTML = `<p>${error.message}</p>`;
});
