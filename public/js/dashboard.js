const columns = {
  critical: document.getElementById("criticalContent"),
  routine: document.getElementById("routineContent"),
  "event-based": document.getElementById("eventContent"),
};

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

function safeJson(value) {
  return encodeURIComponent(JSON.stringify(value));
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "Pending";
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function fetchInformation() {
  try {
    const data = await fetchJson("/api/forms");
    Object.values(columns).forEach((column) => {
      column.innerHTML = "";
    });

    data.forEach((info) => {
      const state = String(info.state_type || "").toLowerCase();
      if (columns[state]) columns[state].appendChild(createInfoBox(info));
    });
  } catch (error) {
    console.error("Error fetching information:", error);
  }
}

function createInfoBox(info) {
  const box = document.createElement("div");
  const totalStaff = Number(info.total_staff || 0);
  const acknowledgedCount = Number(info.acknowledged_count || 0);
  const pendingCount = Math.max(totalStaff - acknowledgedCount, 0);
  const isComplete = totalStaff > 0 && acknowledgedCount === totalStaff;
  const text = String(info.information || "");
  const truncatedText = text.length > 100 ? `${text.substring(0, 100)}...` : text;

  box.className = `info-box-item ${isComplete ? "fully-acknowledged" : ""}`;
  box.dataset.id = info.id;
  box.innerHTML = `
    <div class="info-header">
      <span class="info-date">${formatDate(info.created_at)}</span>
      <span class="status-pill ${isComplete ? "complete" : "pending"}">
        ${acknowledgedCount}/${totalStaff} acknowledged
      </span>
    </div>
    <div class="info-body">
      <p class="info-text">${escapeHtml(truncatedText)}</p>
      <div class="info-meta">
        <span class="info-home">${escapeHtml(info.home)}</span>
        <span class="info-department">${escapeHtml(info.department)}</span>
        <span class="info-department">${pendingCount} pending</span>
      </div>
    </div>
    <div class="info-footer">
      <span class="info-author">By: ${escapeHtml(info.name)}</span>
      <button class="view-more-btn" type="button" onclick="showModal('${safeJson(info)}')">
        View Report
      </button>
    </div>
  `;

  return box;
}

function showModal(infoString) {
  const info = JSON.parse(decodeURIComponent(infoString));
  const modal = document.createElement("div");

  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h2>${escapeHtml(info.home)} - ${escapeHtml(info.department)}</h2>
      <div class="modal-info">
        <p class="full-info">${escapeHtml(info.information)}</p>
        <div class="info-details">
          <p><strong>Author:</strong> ${escapeHtml(info.name)}</p>
          <p><strong>Authorized By:</strong> ${escapeHtml(info.authorized_by)}</p>
          <p><strong>Date:</strong> ${formatDateTime(info.created_at)}</p>
          <p><strong>Send To:</strong> ${escapeHtml(Array.isArray(info.send_to) ? info.send_to.join(", ") : info.send_to)}</p>
        </div>
        <div class="acknowledgments-section">
          <h3>Acknowledgment Report</h3>
          <div class="acknowledgments-list">
            <div class="loading-spinner">Loading acknowledgments...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  loadAcknowledgmentReport(info.id, modal.querySelector(".acknowledgments-list"));

  modal.querySelector(".close-modal").onclick = () => modal.remove();
  modal.onclick = (event) => {
    if (event.target === modal) modal.remove();
  };
}

function renderReportTable(title, rows, emptyText) {
  if (!rows.length) {
    return `
      <section class="report-section">
        <h4>${title}</h4>
        <p class="no-acknowledgments">${emptyText}</p>
      </section>
    `;
  }

  return `
    <section class="report-section">
      <h4>${title}</h4>
      <div class="acknowledgments-wrapper">
        <table class="acknowledgments-table">
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Department</th>
              <th>Status Time</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.staff_name)}</td>
                    <td>${escapeHtml(row.department)}</td>
                    <td>${formatDateTime(row.acknowledged_at)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function loadAcknowledgmentReport(infoId, container) {
  try {
    const report = await fetchJson(`/api/acknowledgment-report/${infoId}`);
    container.innerHTML = `
      <div class="report-summary">
        <span class="status-pill complete">${report.acknowledgedCount} acknowledged</span>
        <span class="status-pill pending">${report.pendingCount} pending</span>
        <span class="status-pill">${report.totalStaff} assigned</span>
      </div>
      ${renderReportTable("Pending", report.pending || [], "No pending acknowledgments")}
      ${renderReportTable("Acknowledged", report.acknowledged || [], "No acknowledgments yet")}
    `;
  } catch (error) {
    console.error("Error loading acknowledgment report:", error);
    container.innerHTML = '<p class="error-message">Error loading acknowledgment report</p>';
  }
}

fetchInformation();
setInterval(fetchInformation, 30000);
