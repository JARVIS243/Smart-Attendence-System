// Shared helpers used across student.js, faculty.js, admin.js, app.js

export function todayISO() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
  );
}

export function genToken() {
  return "tok_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

// Distance between two lat/lng points in meters (Haversine formula).
// Used for GPS verification: is the student within the class's radius?
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation isn't supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, ...options }
    );
  });
}

let toastTimer = null;
export function showToast(msg, tone = "default") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.querySelector("#toastText").textContent = msg;
  t.dataset.tone = tone;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

export function pctColor(pct) {
  return pct < 60 ? "var(--clay)" : pct < 75 ? "var(--amber-dark)" : "var(--ink-green)";
}

// Simple role guard: redirects to login if not authenticated / wrong role.
export function requireRole(profile, allowed) {
  if (!profile || !allowed.includes(profile.role)) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}
