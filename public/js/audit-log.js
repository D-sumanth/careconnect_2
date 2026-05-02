const auditList = document.getElementById("audit-list");
const refreshButton = document.getElementById("refresh-audit");

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

function formatAction(action) {
  return String(action || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "";
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function renderEvents(events) {
  if (!events.length) {
    auditList.innerHTML = "<p>No audit events found.</p>";
    return;
  }

  auditList.innerHTML = events
    .map((event) => {
      const metadata = event.metadata
        ? JSON.stringify(event.metadata, null, 2)
        : "{}";

      return `
        <article class="audit-row">
          <div>
            <div class="audit-title">
              <strong>${formatAction(event.action)}</strong>
              <span class="pill">${escapeHtml(event.entity_type || "system")}</span>
            </div>
            <div class="audit-meta">
              <span>${escapeHtml(event.user_name || "System")}</span>
              <span>${escapeHtml(event.user_email || "")}</span>
              <span>${formatDate(event.created_at)}</span>
              ${
                event.entity_id
                  ? `<span>Record #${escapeHtml(event.entity_id)}</span>`
                  : ""
              }
            </div>
            <pre class="audit-json">${escapeHtml(metadata)}</pre>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadAuditLog() {
  auditList.innerHTML = "<p>Loading audit log...</p>";
  const data = await fetchJson("/api/audit-log?limit=100");
  renderEvents(data.events || []);
}

refreshButton.addEventListener("click", loadAuditLog);
loadAuditLog().catch((error) => {
  auditList.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
});
