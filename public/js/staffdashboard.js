const staffColumns = {
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

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function fetchInformation() {
  try {
    const data = await fetchJson("/api/forms");
    Object.values(staffColumns).forEach((column) => {
      column.innerHTML = "";
    });

    data.forEach((info) => {
      const state = String(info.state_type || "").toLowerCase();
      if (staffColumns[state]) staffColumns[state].appendChild(createInfoBox(info));
    });
  } catch (error) {
    console.error("Error fetching information:", error);
  }
}

function createInfoBox(info) {
  const box = document.createElement("div");
  const acknowledged = Boolean(info.acknowledged_by_current_user);
  const text = String(info.information || "");
  const truncatedText = text.length > 100 ? `${text.substring(0, 100)}...` : text;

  box.className = `info-box-item ${acknowledged ? "acknowledged fully-acknowledged" : ""}`;
  box.dataset.id = info.id;
  box.innerHTML = `
    <div class="info-header">
      <span>${formatDateTime(info.created_at)}</span>
      <span class="status-pill ${acknowledged ? "complete" : "pending"}">
        ${acknowledged ? "Acknowledged" : "Action needed"}
      </span>
    </div>
    <div class="info-body">
      <p class="info-text">${escapeHtml(truncatedText)}</p>
      <div class="info-meta">
        <span class="info-home">${escapeHtml(info.home)}</span>
        <span class="info-department">${escapeHtml(info.department)}</span>
      </div>
    </div>
    <div class="info-footer">
      <span class="info-author">By: ${escapeHtml(info.name)}</span>
      <div class="button-group">
        ${
          acknowledged
            ? ""
            : `<button class="acknowledge-btn" type="button" onclick="showModal('${safeJson(info)}', true)">Acknowledge</button>`
        }
        <button class="view-more-btn" type="button" onclick="showModal('${safeJson(info)}', false)">View More</button>
      </div>
    </div>
  `;

  return box;
}

function showModal(infoString, isAcknowledge) {
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
        ${
          isAcknowledge
            ? `
              <div class="acknowledge-section">
                <p class="signed-in-acknowledgment">
                  Signed in as ${escapeHtml(window.CareConnectUser?.name || "")}
                </p>
                <button class="modal-acknowledge-btn" type="button" onclick="acknowledgeInfo('${info.id}', this)">
                  Confirm Acknowledgment
                </button>
              </div>
            `
            : ""
        }
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector(".close-modal").onclick = () => modal.remove();
  modal.onclick = (event) => {
    if (event.target === modal) modal.remove();
  };
}

async function acknowledgeInfo(infoId, button) {
  button.disabled = true;

  try {
    await fetchJson("/api/acknowledge", {
      method: "POST",
      body: JSON.stringify({ infoId }),
    });
    button.closest(".modal").remove();
    await fetchInformation();
  } catch (error) {
    alert(error.message);
    button.disabled = false;
  }
}

fetchInformation();
setInterval(fetchInformation, 30000);
