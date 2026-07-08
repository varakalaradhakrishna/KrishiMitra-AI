/* ============================================================
   KrishiMitra — Farmer Advisory Agent · Frontend Logic
   ============================================================ */

"use strict";

// ── DOM references ──
const chatMessages    = document.getElementById("chatMessages");
const userInput       = document.getElementById("userInput");
const sendBtn         = document.getElementById("sendBtn");
const chatHero        = document.getElementById("chatHero");
const typingIndicator = document.getElementById("typingIndicator");
const charCount       = document.getElementById("charCount");
const themeToggle     = document.getElementById("themeToggle");
const themeIcon       = document.getElementById("themeIcon");
const statusDot       = document.getElementById("statusDot");
const statusText      = document.getElementById("statusText");
const dashFarms       = document.getElementById("dashFarms");
const dashSeason      = document.getElementById("dashSeason");

// ── State ──
let isLoading = false;

// ── Configure marked.js ──
if (window.marked) {
  marked.setOptions({
    gfm: true,
    breaks: true,
    sanitize: false,
  });
}

// ════════════════════════════════════════════════════════════
// THEME
// ════════════════════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem("krishimitra-theme") || "light";
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("krishimitra-theme", theme);
  if (themeIcon) {
    themeIcon.className = theme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-fill";
  }
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

// ════════════════════════════════════════════════════════════
// HEALTH CHECK & STATUS
// ════════════════════════════════════════════════════════════
async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.credentials_configured) {
      setStatus("online", "AI Online");
    } else {
      setStatus("demo", "Demo Mode");
    }
  } catch {
    setStatus("offline", "Offline");
  }
}

function setStatus(state, label) {
  if (statusDot)  { statusDot.className = `status-dot ${state}`; statusDot.title = label; }
  if (statusText) { statusText.textContent = label; }
}

// ════════════════════════════════════════════════════════════
// PANEL NAVIGATION
// ════════════════════════════════════════════════════════════
function switchPanel(panelId) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  const target = document.getElementById(`panel-${panelId}`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".sidebar-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.panel === panelId);
  });

  if (panelId === "farms") loadFarmCards();
  if (panelId === "dashboard") updateDashboardStats();
}

document.querySelectorAll(".sidebar-item[data-panel]").forEach(btn => {
  btn.addEventListener("click", () => switchPanel(btn.dataset.panel));
});

// ════════════════════════════════════════════════════════════
// CHAT — Send & Receive
// ════════════════════════════════════════════════════════════
function hideHero() {
  if (chatHero && !chatHero.classList.contains("hidden")) {
    chatHero.classList.add("hidden");
    chatHero.style.display = "none";
  }
}

function renderMarkdown(text) {
  if (window.marked) {
    try { return marked.parse(text); }
    catch { return escapeHtml(text).replace(/\n/g, "<br>"); }
  }
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function appendMessage(role, content, time) {
  hideHero();
  const isUser = role === "user";
  const msg = document.createElement("div");
  msg.className = `message ${isUser ? "user-msg" : "ai-msg"}`;

  const avatarEmoji = isUser ? "👨‍🌾" : "🌾";

  msg.innerHTML = `
    <div class="msg-avatar">${avatarEmoji}</div>
    <div class="msg-body">
      <div class="msg-bubble">${isUser ? escapeHtml(content) : renderMarkdown(content)}</div>
      <div class="msg-time">${time || getCurrentTime()}</div>
    </div>`;

  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msg;
}

function showTyping() {
  if (typingIndicator) typingIndicator.classList.remove("d-none");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  if (typingIndicator) typingIndicator.classList.add("d-none");
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
}

async function sendMessage(messageText) {
  const text = (messageText || userInput.value).trim();
  if (!text || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;
  userInput.value = "";
  updateCharCount(0);
  autoResizeTextarea();

  appendMessage("user", text);
  showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();
    hideTyping();

    if (res.ok && data.reply) {
      appendMessage("assistant", data.reply, data.timestamp);
    } else {
      appendMessage("assistant", `⚠️ ${data.error || "Something went wrong. Please try again."}`);
    }
  } catch (err) {
    hideTyping();
    appendMessage("assistant", "⚠️ Could not reach the server. Check that Flask is running on port 5000.");
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
}

// Global helper for hero chips & panel buttons
window.sendQuick = function (msg) {
  switchPanel("chat");
  sendMessage(msg);
};

// ── Quick prompt buttons in sidebar ──
document.querySelectorAll(".qp-btn[data-msg]").forEach(btn => {
  btn.addEventListener("click", () => {
    switchPanel("chat");
    sendMessage(btn.dataset.msg);
  });
});

// ── Send on click ──
if (sendBtn) sendBtn.addEventListener("click", () => sendMessage());

// ── Send on Enter (Shift+Enter = newline) ──
if (userInput) {
  userInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  userInput.addEventListener("input", () => {
    updateCharCount(userInput.value.length);
    autoResizeTextarea();
  });
}

function updateCharCount(len) {
  if (!charCount) return;
  charCount.textContent = `${len} / 1000`;
  charCount.className = "char-count" + (len > 900 ? " danger" : len > 750 ? " warn" : "");
}

function autoResizeTextarea() {
  if (!userInput) return;
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + "px";
}

// ── Clear chat ──
async function clearChat() {
  if (!confirm("Clear the conversation history?")) return;
  try {
    await fetch("/api/conversation/clear", { method: "POST" });
  } catch {/* ignore */}

  chatMessages.innerHTML = "";
  if (chatHero) {
    chatHero.classList.remove("hidden");
    chatHero.style.display = "";
  }
}

document.getElementById("clearChatBtn")?.addEventListener("click", clearChat);
document.getElementById("clearChatBtnMobile")?.addEventListener("click", clearChat);

// ════════════════════════════════════════════════════════════
// FARM PROFILES
// ════════════════════════════════════════════════════════════
let farmModal = null;

function initFarmModal() {
  const el = document.getElementById("addFarmModal");
  if (el && window.bootstrap) farmModal = new bootstrap.Modal(el);
}

async function loadFarmCards() {
  try {
    const res = await fetch("/api/farms");
    const data = await res.json();
    renderFarmCards(data.farms || []);
  } catch {
    renderFarmCards([]);
  }
}

function renderFarmCards(farms) {
  const list = document.getElementById("farmList");
  const noMsg = document.getElementById("noFarmsMsg");
  if (!list) return;

  // Update dashboard
  if (dashFarms) dashFarms.textContent = farms.length;

  // Remove existing farm card columns (keep noFarmsMsg)
  list.querySelectorAll(".farm-col").forEach(el => el.remove());

  if (farms.length === 0) {
    if (noMsg) noMsg.style.display = "";
    return;
  }
  if (noMsg) noMsg.style.display = "none";

  farms.forEach(farm => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4 farm-col";
    col.innerHTML = `
      <div class="farm-card">
        <div class="farm-card-title">
          <i class="bi bi-geo-alt-fill text-success"></i>
          ${escapeHtml(farm.name)}
        </div>
        ${farm.location ? `<div class="farm-detail"><i class="bi bi-pin-map"></i>${escapeHtml(farm.location)}</div>` : ""}
        ${farm.area ? `<div class="farm-detail"><i class="bi bi-rulers"></i>${escapeHtml(farm.area)}</div>` : ""}
        ${farm.soil_type ? `<div class="farm-detail"><i class="bi bi-layers"></i>${escapeHtml(farm.soil_type)}</div>` : ""}
        ${farm.irrigation ? `<div class="farm-detail"><i class="bi bi-droplet"></i>${escapeHtml(farm.irrigation)}</div>` : ""}
        ${farm.current_crops ? `<div class="farm-detail"><i class="bi bi-tree"></i>${escapeHtml(farm.current_crops)}</div>` : ""}
        ${farm.notes ? `<div class="farm-detail mt-1"><i class="bi bi-sticky"></i><em>${escapeHtml(farm.notes)}</em></div>` : ""}
        <div class="farm-actions">
          <button class="btn btn-success btn-sm flex-grow-1"
            onclick="switchPanel('chat'); sendQuick('Give me personalised advice for my farm: ${escapeHtml(farm.name)} in ${escapeHtml(farm.location || "my area")}, soil: ${escapeHtml(farm.soil_type || "unknown")}, growing: ${escapeHtml(farm.current_crops || "various crops")}.')">
            <i class="bi bi-chat-dots me-1"></i>Ask AI
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteFarm(${farm.id})" title="Delete farm">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>`;
    list.appendChild(col);
  });
}

async function saveFarm() {
  const name      = document.getElementById("farmName")?.value.trim();
  const location  = document.getElementById("farmLocation")?.value.trim();
  const area      = document.getElementById("farmArea")?.value.trim();
  const soil_type = document.getElementById("farmSoil")?.value;
  const irrigation= document.getElementById("farmIrrigation")?.value;
  const current_crops = document.getElementById("farmCrops")?.value.trim();
  const notes     = document.getElementById("farmNotes")?.value.trim();

  if (!name) { alert("Please enter a farm name."); return; }

  const btn = document.getElementById("saveFarmBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }

  try {
    const res = await fetch("/api/farms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, location, area, soil_type, irrigation, current_crops, notes }),
    });
    const data = await res.json();
    if (res.ok) {
      farmModal?.hide();
      document.getElementById("addFarmForm")?.reset();
      loadFarmCards();
      switchPanel("farms");
    } else {
      alert(data.error || "Could not save farm.");
    }
  } catch {
    alert("Server error — is Flask running?");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Save Farm'; }
  }
}

async function deleteFarm(farmId) {
  if (!confirm("Delete this farm profile?")) return;
  try {
    const res = await fetch(`/api/farms/${farmId}`, { method: "DELETE" });
    if (res.ok) loadFarmCards();
    else alert("Could not delete farm.");
  } catch {
    alert("Server error.");
  }
}

document.getElementById("saveFarmBtn")?.addEventListener("click", saveFarm);

// ════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ════════════════════════════════════════════════════════════
function updateDashboardStats() {
  // Current season based on month
  const month = new Date().getMonth() + 1; // 1–12
  let season = "—";
  if (month >= 6 && month <= 10) season = "Kharif";
  else if (month >= 11 || month <= 2) season = "Rabi";
  else season = "Zaid";
  if (dashSeason) dashSeason.textContent = season;
}

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  checkHealth();
  initFarmModal();
  updateDashboardStats();
  updateCharCount(0);
  if (userInput) userInput.focus();
});
