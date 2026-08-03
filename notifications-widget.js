(function () {
  const POLL_INTERVAL_MS = 60000; // refresh unread count every 60s

  function createBellMarkup() {
    return `
      <div class="notif-bell-wrap" id="notifBellWrap">
        <button class="notif-bell-btn" id="notifBellBtn" aria-label="Notifications">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12,22c1.1,0,2-0.9,2-2h-4C10,21.1,10.9,22,12,22z M18,16v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-0.83-0.67-1.5-1.5-1.5S10.5,3.17,10.5,4v0.68 C7.64,5.36,6,7.92,6,11v5l-2,2v1h16v-1L18,16z"/>
          </svg>
          <span class="notif-badge" id="notifBadge"></span>
        </button>
        <div class="notif-panel" id="notifPanel">
          <div class="notif-panel-header">
            <span>Notifications</span>
            <button class="notif-mark-all" id="notifMarkAll">Mark all as read</button>
          </div>
          <div class="notif-list" id="notifList">
            <div class="notif-empty">Loading...</div>
          </div>
        </div>
      </div>
    `;
  }

  function createModalMarkup() {
    return `
      <div class="notif-modal-overlay" id="notifModalOverlay">
        <div class="notif-modal" id="notifModal">
          <button class="notif-modal-close" id="notifModalClose">✕</button>
          <div class="notif-modal-icon-circle" id="notifModalIconCircle"></div>
          <div class="notif-modal-pill" id="notifModalPill"></div>
          <div class="notif-modal-heading" id="notifModalHeading"></div>
          <hr class="notif-modal-divider">
          <div class="notif-modal-time">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10,10-4.48,10-10S17.52,2,12,2z M12.5,7H11v6l5.25,3.15.75-1.23-4.5-2.67V7z"/></svg>
            <span id="notifModalTime"></span>
          </div>
          <div class="notif-modal-details-label">Details</div>
          <div class="notif-modal-details-text" id="notifModalDetails"></div>
          <div class="notif-modal-info-card" id="notifModalInfoCard" style="display:none;">
            <div class="notif-modal-info-row">
              <div class="notif-modal-info-icon">🆔</div>
              <div>
                <div class="notif-modal-info-label">Submission ID</div>
                <div class="notif-modal-info-value" id="notifModalSubId"></div>
              </div>
            </div>
            <div class="notif-modal-info-row">
              <div class="notif-modal-info-icon" id="notifModalTypeIcon">🏷️</div>
              <div>
                <div class="notif-modal-info-label">Type</div>
                <div class="notif-modal-info-value" id="notifModalSubType"></div>
              </div>
            </div>
            <div class="notif-modal-info-row">
              <div class="notif-modal-info-icon">📅</div>
              <div>
                <div class="notif-modal-info-label">Submitted on</div>
                <div class="notif-modal-info-value" id="notifModalSubDate"></div>
              </div>
            </div>
          </div>
          <button class="notif-modal-btn-primary" id="notifModalMarkRead">✓ Mark as Read</button>
          <button class="notif-modal-btn-outline" id="notifModalGotIt">✕ Got it</button>
        </div>
      </div>
    `;
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  function formatFullDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
      " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function iconFor(type) {
    const icons = {
      resolved: { bg: "#23C483", glyph: "✓", color: "#fff" },
      in_review: { bg: "#FFF3D6", glyph: "⏳", color: "#F5A623" },
      escalation: { bg: "#FFF3D6", glyph: "⏳", color: "#F5A623" },
      admin_reply: { bg: "#F3E8FF", glyph: "💬", color: "#7C3AED" },
      announcement: { bg: "#E3F0FF", glyph: "📣", color: "#2F80ED" },
      system: { bg: "#FCE4EC", glyph: "🎁", color: "#EC1561" },
    };
    return icons[type] || icons.in_review;
  }

  function pillColorFor(type) {
    const v = iconFor(type);
    return { bg: v.bg, text: v.color === "#fff" ? "#1a7a4c" : v.color };
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function highlightStatusWord(text, color) {
    const keywords = ["Resolved", "In Review", "Pending"];
    for (const kw of keywords) {
      const idx = text.indexOf(kw);
      if (idx >= 0) {
        const before = escapeHtml(text.slice(0, idx));
        const after = escapeHtml(text.slice(idx + kw.length));
        return `${before}<span style="color:${color}">${escapeHtml(kw)}</span>${after}`;
      }
    }
    return escapeHtml(text);
  }

  function detailsTextFor(type, typeLabel) {
    if (type === "resolved") {
      return `Great news! Your ${typeLabel} has been resolved. Thank you for helping us make Lourdes College better.`;
    }
    if (type === "in_review" || type === "escalation") {
      return `Thank you for your ${typeLabel}. We've received it and our team is currently reviewing it.\n\nWe'll notify you again once there is an update.`;
    }
    return "";
  }

  async function loadNotifications(userId) {
    const { data, error } = await supabaseClient
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Failed to load notifications:", error);
      return [];
    }
    return data || [];
  }

  function renderList(notifications) {
    const list = document.getElementById("notifList");
    if (!notifications.length) {
      list.innerHTML = `<div class="notif-empty">No notifications yet</div>`;
      return;
    }
    list.innerHTML = notifications.map(n => {
      const visuals = iconFor(n.type);
      return `
        <div class="notif-item" data-id="${n.id}">
          <div class="notif-icon" style="background:${visuals.bg}; color:${visuals.color};">${visuals.glyph}</div>
          <div class="notif-content">
            <div class="notif-title">${escapeHtml(n.title)}</div>
            <div class="notif-body">${escapeHtml(n.body)}</div>
            <div class="notif-time">${timeAgo(n.created_at)}</div>
          </div>
          ${n.is_read ? "" : `<div class="notif-dot"></div>`}
        </div>
      `;
    }).join("");
  }

  function updateBadge(notifications) {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const badge = document.getElementById("notifBadge");
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }

  async function markAsRead(notificationId) {
    await supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
  }

  async function markAllAsRead(userId) {
    await supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);
  }

  async function fetchSubmissionInfo(submissionId) {
    try {
      const { data, error } = await supabaseClient
        .from("submissions")
        .select("type, created_at")
        .eq("id", submissionId)
        .single();
      if (error || !data) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  async function init() {
    if (typeof supabaseClient === "undefined") return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) return; // no bell for guests

    const accountLink = document.getElementById("navAccountLink");
    if (!accountLink || !accountLink.parentElement) return;

    accountLink.insertAdjacentHTML("afterend", createBellMarkup());
    document.body.insertAdjacentHTML("beforeend", createModalMarkup());

    const wrap = document.getElementById("notifBellWrap");
    const bellBtn = document.getElementById("notifBellBtn");
    const panel = document.getElementById("notifPanel");
    const list = document.getElementById("notifList");
    const markAllBtn = document.getElementById("notifMarkAll");

    const modalOverlay = document.getElementById("notifModalOverlay");
    const modalClose = document.getElementById("notifModalClose");
    const modalIconCircle = document.getElementById("notifModalIconCircle");
    const modalPill = document.getElementById("notifModalPill");
    const modalHeading = document.getElementById("notifModalHeading");
    const modalTime = document.getElementById("notifModalTime");
    const modalDetails = document.getElementById("notifModalDetails");
    const modalInfoCard = document.getElementById("notifModalInfoCard");
    const modalSubId = document.getElementById("notifModalSubId");
    const modalTypeIcon = document.getElementById("notifModalTypeIcon");
    const modalSubType = document.getElementById("notifModalSubType");
    const modalSubDate = document.getElementById("notifModalSubDate");
    const modalMarkRead = document.getElementById("notifModalMarkRead");
    const modalGotIt = document.getElementById("notifModalGotIt");

    wrap.style.display = "inline-flex";

    let cachedNotifications = [];
    let activeNotif = null;

    async function refresh() {
      cachedNotifications = await loadNotifications(session.user.id);
      updateBadge(cachedNotifications);
      if (panel.style.display === "flex") {
        renderList(cachedNotifications);
      }
    }

    function closeModal() {
      modalOverlay.style.display = "none";
      activeNotif = null;
    }

    async function openModal(notif) {
      activeNotif = notif;
      const visuals = iconFor(notif.type);
      const pillColors = pillColorFor(notif.type);

      modalIconCircle.style.background = visuals.bg;
      modalIconCircle.style.color = visuals.color;
      modalIconCircle.textContent = visuals.glyph;

      modalPill.textContent = notif.title;
      modalPill.style.background = pillColors.bg;
      modalPill.style.color = pillColors.text;

      modalHeading.innerHTML = highlightStatusWord(notif.body, pillColors.text);
      modalTime.textContent = timeAgo(notif.created_at);

      modalMarkRead.style.display = notif.is_read ? "none" : "block";

      if (notif.submission_id) {
        modalInfoCard.style.display = "block";
        modalSubId.textContent = "#" + notif.submission_id.slice(0, 8);
        modalDetails.textContent = "Loading details...";
        modalSubType.textContent = "—";
        modalSubDate.textContent = "—";

        const info = await fetchSubmissionInfo(notif.submission_id);
        if (info) {
          const typeLabel = info.type || "submission";
          modalSubType.textContent = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
          modalTypeIcon.textContent = typeLabel === "suggestion" ? "💡" : "❗";
          modalSubDate.textContent = formatFullDate(info.created_at);
          modalDetails.textContent = detailsTextFor(notif.type, typeLabel);
        } else {
          modalDetails.textContent = notif.body;
        }
      } else {
        modalInfoCard.style.display = "none";
        modalDetails.textContent = notif.body;
      }

      modalOverlay.style.display = "flex";
      panel.style.display = "none";
    }

    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = panel.style.display === "flex";
      panel.style.display = isOpen ? "none" : "flex";
      if (!isOpen) renderList(cachedNotifications);
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) {
        panel.style.display = "none";
      }
    });

    list.addEventListener("click", (e) => {
      const item = e.target.closest(".notif-item");
      if (!item) return;
      const id = item.dataset.id;
      const notif = cachedNotifications.find(n => n.id === id);
      if (notif) openModal(notif);
    });

    markAllBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await markAllAsRead(session.user.id);
      cachedNotifications.forEach(n => n.is_read = true);
      renderList(cachedNotifications);
      updateBadge(cachedNotifications);
    });

    modalClose.addEventListener("click", closeModal);
    modalGotIt.addEventListener("click", closeModal);

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    modalMarkRead.addEventListener("click", async () => {
      if (!activeNotif) return;
      await markAsRead(activeNotif.id);
      activeNotif.is_read = true;
      updateBadge(cachedNotifications);
      closeModal();
    });

    await refresh();
    setInterval(refresh, POLL_INTERVAL_MS);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
