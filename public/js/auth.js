async function getCurrentUser() {
  const response = await fetch("/api/auth/me");
  const data = await response.json();
  return data.user;
}

async function requireCurrentUser(allowedRoles = []) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "/login.html";
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    window.location.href =
      user.role === "employee" ? "/staff-dashboard.html" : "/";
    return null;
  }

  window.CareConnectUser = user;
  renderUserBar(user);
  return user;
}

function renderUserBar(user) {
  const bar = document.createElement("div");
  bar.className = "session-bar";
  bar.innerHTML = `
    <span>${user.name} · ${user.role}</span>
    <button type="button" id="logout-button">Sign out</button>
  `;
  document.body.prepend(bar);

  document.getElementById("logout-button").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });
}
