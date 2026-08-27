import { onAuthReady, logout } from "./auth.js";
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { initNotificationBell } from "./notifications.js";
import { escapeHtml } from "./utils.js";
import * as StudentModule from "./student.js";
import * as FacultyModule from "./faculty.js";
import * as AdminModule from "./admin.js";

const renderers = {};
let currentUser = null;
let currentProfile = null;

function registerView(name, fn) {
  renderers[name] = fn;
}

function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  const activeBtn = document.querySelector(`.nav-item[data-view="${name}"]`);
  if (activeBtn) {
    document.getElementById("topTitle").textContent = activeBtn.textContent.trim();
    document.getElementById("topEyebrow").textContent = currentProfile ? currentProfile.role : "Smart Attendance";
  }
  if (renderers[name]) renderers[name]();
  closeSidebarMobile();
}

function closeSidebarMobile() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("scrim").classList.remove("show");
}

const DEFAULT_VIEW = { student: "s-dashboard", faculty: "f-dashboard", admin: "a-dashboard" };

onAuthReady(async (user, profile) => {
  if (!user || !profile) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  currentProfile = profile;

  document.getElementById("userNameLabel").textContent = profile.name;
  document.getElementById("userRoleLabel").textContent = profile.role;
  document.getElementById("userAvatar").textContent = (profile.name || "?").trim().charAt(0).toUpperCase();
  document.getElementById("appShell").style.display = "flex";
  document.getElementById("loadingScreen").style.display = "none";

  document.querySelectorAll(`.nav-item[data-role]`).forEach((btn) => {
    btn.style.display = btn.dataset.role === profile.role ? "flex" : "none";
  });

  const ctx = { user, profile, registerView, showView };
  if (profile.role === "student") StudentModule.init(ctx);
  if (profile.role === "faculty") FacultyModule.init(ctx);
  if (profile.role === "admin") AdminModule.init(ctx);

  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  initNotificationBell(user.uid);
  loadAnnouncementBanner(profile.role);
  showView(DEFAULT_VIEW[profile.role]);
});

async function loadAnnouncementBanner(role) {
  try {
    const snap = await getDocs(collection(db, "announcements"));
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => a.audience === "all" || a.audience === role)
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const latest = items[0];
    const dismissed = localStorage.getItem("sas_dismissed_ann");
    const banner = document.getElementById("announcementBanner");
    if (!latest || dismissed === latest.id) {
      banner.style.display = "none";
      return;
    }
    banner.style.display = "flex";
    banner.querySelector("#annBannerText").innerHTML = `<strong>${escapeHtml(latest.title)}</strong> — ${escapeHtml(latest.body)}`;
    document.getElementById("annBannerClose").onclick = () => {
      localStorage.setItem("sas_dismissed_ann", latest.id);
      banner.style.display = "none";
    };
  } catch (e) {
    /* announcements collection may not exist yet — ignore */
  }
}

/* ---- Chrome: sidebar, theme, logout ---- */
document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("scrim").classList.toggle("show");
});
document.getElementById("scrim").addEventListener("click", closeSidebarMobile);
document.getElementById("logoutBtn").addEventListener("click", logout);

const themeToggle = document.getElementById("themeToggle");
function applyTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem("sas_theme", mode);
  themeToggle.textContent = mode === "dark" ? "☀️" : "🌙";
}
applyTheme(localStorage.getItem("sas_theme") || "light");
themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
});
