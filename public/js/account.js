const summary = document.getElementById("account-summary");
const form = document.getElementById("change-password-form");
const message = document.getElementById("password-message");

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

function renderSummary(user) {
  summary.innerHTML = `
    <h2>${escapeHtml(user.name)}</h2>
    <p>${escapeHtml(user.email)}</p>
    <p>${escapeHtml(user.role)}${user.department ? ` - ${escapeHtml(user.department)}` : ""}</p>
  `;
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  message.classList.remove("success");

  const formData = new FormData(form);
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword !== confirmPassword) {
    message.textContent = "New passwords do not match";
    return;
  }

  try {
    await fetchJson("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    form.reset();
    message.textContent = "Password updated successfully";
    message.classList.add("success");
  } catch (error) {
    message.textContent = error.message;
  }
});

requireCurrentUser(["employee", "admin"]).then((user) => {
  if (user) renderSummary(user);
});
