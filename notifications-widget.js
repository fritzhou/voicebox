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

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
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

  async function init() {
    if (typeof supabaseClient === "undefined") return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) return; // no bell for guests

    const accountLink = document.getElementById("navAccountLink");
    if (!accountLink || !accountLink.parentElement) return;

    accountLink.insertAdjacentHTML("afterend", createBellMarkup());

    const wrap = document.getElementById("notifBellWrap");
    const bellBtn = document.getElementById("notifBellBtn");
    const panel = document.getElementById("notifPanel");
    const list = document.getElementById("notifList");
    const markAllBtn = document.getElementById("notifMarkAll");

    wrap.style.display = "inline-flex";

    let cachedNotifications = [];

    async function refresh() {
      cachedNotifications = await loadNotifications(session.user.id);
      updateBadge(cachedNotifications);
      if (panel.style.display === "flex") {
        renderList(cachedNotifications);
      }
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

    list.addEventListener("click", async (e) => {
      const item = e.target.closest(".notif-item");
      if (!item) return;
      const id = item.dataset.id;
      const notif = cachedNotifications.find(n => n.id === id);
      if (notif && !notif.is_read) {
        await markAsRead(id);
        notif.is_read = true;
        renderList(cachedNotifications);
        updateBadge(cachedNotifications);
      }
    });

    markAllBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await markAllAsRead(session.user.id);
      cachedNotifications.forEach(n => n.is_read = true);
      renderList(cachedNotifications);
      updateBadge(cachedNotifications);
    });

    await refresh();
    setInterval(refresh, POLL_INTERVAL_MS);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
