import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escapeHtml, fmtDate, todayISO, distanceMeters, getCurrentPosition, showToast, pctColor } from "./utils.js";
import { startQrScanner } from "./qr.js";
import { notify } from "./notifications.js";

let ctx; // { user, profile, registerView, showView }
let subjectsCache = [];
let stopScanner = null;

export function init(appCtx) {
  ctx = appCtx;
  ctx.registerView("s-dashboard", renderDashboard);
  ctx.registerView("s-scan", renderScan);
  ctx.registerView("s-history", renderHistory);
  ctx.registerView("s-leave", renderLeave);
  ctx.registerView("s-timetable", renderTimetable);
  ctx.registerView("s-profile", renderProfile);
  wireStaticHandlers();
}

async function fetchSubjects() {
  if (subjectsCache.length) return subjectsCache;
  const snap = await getDocs(query(collection(db, "subjects"), where("classId", "==", ctx.profile.classId || "__none__")));
  subjectsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return subjectsCache;
}

async function fetchMyAttendance() {
  const snap = await getDocs(query(collection(db, "attendance"), where("studentId", "==", ctx.user.uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function groupBySubject(records, subjects) {
  const bySub = {};
  subjects.forEach((s) => (bySub[s.id] = { subject: s, present: 0, total: 0 }));
  records.forEach((r) => {
    if (!bySub[r.subjectId]) bySub[r.subjectId] = { subject: { name: "Unknown" }, present: 0, total: 0 };
    bySub[r.subjectId].total++;
    if (r.status === "present" || r.status === "late") bySub[r.subjectId].present++;
  });
  return Object.values(bySub).map((g) => ({
    ...g,
    pct: g.total > 0 ? (g.present / g.total) * 100 : 0,
  }));
}

/* ---------------- Dashboard ---------------- */
async function renderDashboard() {
  const wrap = document.getElementById("sDashWrap");
  wrap.innerHTML = `<p class="muted">Loading your attendance…</p>`;
  const [subjects, records] = await Promise.all([fetchSubjects(), fetchMyAttendance()]);
  const groups = groupBySubject(records, subjects);
  const totalPresent = records.filter((r) => r.status === "present" || r.status === "late").length;
  const overallPct = records.length ? (totalPresent / records.length) * 100 : 0;
  const low = groups.filter((g) => g.total > 0 && g.pct < 75);

  wrap.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="label">Overall Attendance</div>
        <div class="value" style="color:${pctColor(overallPct)}">${records.length ? Math.round(overallPct) + "%" : "—"}</div>
        <div class="sub">${records.length} classes recorded</div>
      </div>
      <div class="stat-card sage-accent">
        <div class="label">Subjects</div>
        <div class="value">${subjects.length}</div>
        <div class="sub">enrolled this semester</div>
      </div>
      <div class="stat-card ${low.length ? "clay-accent" : ""}">
        <div class="label">Below 75%</div>
        <div class="value" style="color:${low.length ? "var(--clay)" : "var(--ink-green)"}">${low.length}</div>
        <div class="sub">subject${low.length === 1 ? "" : "s"} need attention</div>
      </div>
    </div>
    ${
      low.length
        ? `<div class="banner clay">
            <strong>Low attendance warning.</strong> You're below the 75% requirement in
            ${low.map((g) => escapeHtml(g.subject.name)).join(", ")}. Attend upcoming classes to bring this back up.
          </div>`
        : ""
    }
    <div class="panel">
      <div class="panel-head"><div><h3>Subject-wise attendance</h3><p>Present + late counts as attended.</p></div></div>
      ${
        groups.length === 0
          ? `<div class="empty-state"><p>No subjects assigned to your class yet — check back once your faculty has set things up.</p></div>`
          : `<div class="ledger">` +
            groups
              .map(
                (g) => `
            <div class="ledger-row">
              <span class="name" style="flex:1">${escapeHtml(g.subject.name)}<span class="sub">${g.present}/${g.total} classes attended</span></span>
              <div style="width:160px;"><div class="pct-bar-track"><div class="pct-bar-fill ${g.pct < 60 ? "low" : ""}" style="width:${Math.max(g.pct, 3)}%"></div></div></div>
              <span style="font-family:var(--font-mono); font-weight:700; width:48px; text-align:right; color:${pctColor(g.pct)}">${g.total ? Math.round(g.pct) + "%" : "—"}</span>
            </div>`
              )
              .join("") +
            `</div>`
      }
    </div>`;
}

/* ---------------- QR Scan ---------------- */
function renderScan() {
  document.getElementById("scanResult").innerHTML = "";
  document.getElementById("scanStatus").textContent = 'Tap "Start camera" and point it at your faculty\'s QR code.';
  document.getElementById("scanStartBtn").style.display = "inline-flex";
  document.getElementById("scanStopBtn").style.display = "none";
}

async function handleScanStart() {
  const video = document.getElementById("scanVideo");
  const canvas = document.getElementById("scanCanvas");
  const status = document.getElementById("scanStatus");
  const result = document.getElementById("scanResult");
  document.getElementById("scanStartBtn").style.display = "none";
  document.getElementById("scanStopBtn").style.display = "inline-flex";
  status.textContent = "Point your camera at the QR code…";
  result.innerHTML = "";

  stopScanner = await startQrScanner(
    video,
    canvas,
    async (text) => {
      stopScanner && stopScanner();
      stopScanner = null;
      document.getElementById("scanStartBtn").style.display = "inline-flex";
      document.getElementById("scanStopBtn").style.display = "none";
      await processScannedSession(text, status, result);
    },
    (err) => {
      status.textContent = "Couldn't access the camera: " + err.message;
      document.getElementById("scanStartBtn").style.display = "inline-flex";
      document.getElementById("scanStopBtn").style.display = "none";
    }
  );
}

function handleScanStop() {
  if (stopScanner) stopScanner();
  stopScanner = null;
  document.getElementById("scanStartBtn").style.display = "inline-flex";
  document.getElementById("scanStopBtn").style.display = "none";
  document.getElementById("scanStatus").textContent = "Scanning stopped.";
}

async function processScannedSession(text, status, result) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (e) {
    status.textContent = "That QR code isn't a valid attendance code.";
    return;
  }
  status.textContent = "Verifying…";

  const sessSnap = await getDoc(doc(db, "sessions", payload.sessionId));
  if (!sessSnap.exists()) {
    status.textContent = "This session doesn't exist or has been removed.";
    return;
  }
  const session = sessSnap.data();

  if (session.token !== payload.token) {
    status.textContent = "This QR code is invalid.";
    return;
  }
  if (!session.active || Date.now() > session.expiresAt) {
    status.textContent = "This QR code has expired. Ask your faculty to generate a new one.";
    return;
  }
  if (session.classId !== ctx.profile.classId) {
    status.textContent = "This session isn't for your class.";
    return;
  }

  // Duplicate prevention
  const dupSnap = await getDocs(
    query(collection(db, "attendance"), where("sessionId", "==", payload.sessionId), where("studentId", "==", ctx.user.uid))
  );
  if (!dupSnap.empty) {
    status.textContent = "You've already been marked present for this class.";
    return;
  }

  // GPS verification
  let gpsVerified = true;
  let distance = null;
  if (session.gps && session.gps.lat != null) {
    try {
      const coords = await getCurrentPosition();
      distance = Math.round(distanceMeters(coords.latitude, coords.longitude, session.gps.lat, session.gps.lng));
      gpsVerified = distance <= (session.gps.radius || 100);
      if (!gpsVerified) {
        status.textContent = `You appear to be ${distance}m from the classroom (limit ${session.gps.radius}m). Attendance not marked.`;
        return;
      }
    } catch (e) {
      status.textContent = "Location access is required to verify attendance. Please allow it and try again.";
      return;
    }
  }

  // Late detection
  const startedAtMs = session.startedAt?.toMillis ? session.startedAt.toMillis() : Date.now();
  const graceMs = (session.graceMinutes || 10) * 60000;
  const isLate = Date.now() > startedAtMs + graceMs;
  const finalStatus = isLate ? "late" : "present";

  await addDoc(collection(db, "attendance"), {
    sessionId: payload.sessionId,
    studentId: ctx.user.uid,
    subjectId: session.subjectId,
    classId: session.classId,
    date: session.date,
    status: finalStatus,
    method: "qr",
    gpsVerified,
    distance,
    markedAt: serverTimestamp(),
  });

  await notify(ctx.user.uid, "Attendance marked", `Marked ${finalStatus} for ${session.subjectName || "class"} · ${fmtDate(session.date)}`);

  status.textContent = "";
  result.innerHTML = `<div class="banner ${isLate ? "amber" : "sage"}">
    <strong>${isLate ? "Marked late" : "Attendance confirmed"}</strong> for ${escapeHtml(session.subjectName || "your class")} — ${fmtDate(session.date)}.
  </div>`;
  showToast(isLate ? "Marked late" : "Attendance confirmed");
}

/* ---------------- History ---------------- */
async function renderHistory() {
  const body = document.getElementById("historyTableBody");
  body.innerHTML = `<tr><td colspan="4" class="muted" style="padding:20px;">Loading…</td></tr>`;
  const [subjects, records] = await Promise.all([fetchSubjects(), fetchMyAttendance()]);
  const subjMap = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (sorted.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="muted" style="padding:20px;">No attendance recorded yet.</td></tr>`;
    return;
  }
  body.innerHTML = sorted
    .map(
      (r) => `<tr>
      <td>${fmtDate(r.date)}</td>
      <td>${escapeHtml(subjMap[r.subjectId] || "—")}</td>
      <td><span class="status-pill ${r.status}">${r.status}</span></td>
      <td style="text-transform:capitalize; color:var(--ink-soft); font-size:12.5px;">${r.method}${r.method === "qr" ? (r.gpsVerified ? " · GPS ✓" : "") : ""}</td>
    </tr>`
    )
    .join("");
}

/* ---------------- Leave ---------------- */
async function renderLeave() {
  document.getElementById("leaveFromDate").value = "";
  document.getElementById("leaveToDate").value = "";
  document.getElementById("leaveReason").value = "";
  await refreshMyLeaves();
}

async function refreshMyLeaves() {
  const list = document.getElementById("myLeavesList");
  const snap = await getDocs(query(collection(db, "leaves"), where("studentId", "==", ctx.user.uid)));
  const leaves = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fromDate < b.fromDate ? 1 : -1));
  if (leaves.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>No leave requests yet.</p></div>`;
    return;
  }
  list.innerHTML =
    `<div class="ledger">` +
    leaves
      .map(
        (l) => `<div class="ledger-row">
        <span class="name" style="flex:1">${fmtDate(l.fromDate)} → ${fmtDate(l.toDate)}<span class="sub">${escapeHtml(l.reason)}</span></span>
        <span class="status-pill ${l.status}">${l.status}</span>
      </div>`
      )
      .join("") +
    `</div>`;
}

async function handleLeaveSubmit() {
  const fromDate = document.getElementById("leaveFromDate").value;
  const toDate = document.getElementById("leaveToDate").value;
  const reason = document.getElementById("leaveReason").value.trim();
  if (!fromDate || !toDate || !reason) {
    showToast("Fill in dates and a reason");
    return;
  }
  await addDoc(collection(db, "leaves"), {
    studentId: ctx.user.uid,
    classId: ctx.profile.classId || "",
    fromDate,
    toDate,
    reason,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  showToast("Leave request submitted");
  renderLeave();
}

/* ---------------- Timetable ---------------- */
async function renderTimetable() {
  const wrap = document.getElementById("studentTimetableWrap");
  wrap.innerHTML = `<p class="muted">Loading…</p>`;
  const snap = await getDocs(query(collection(db, "timetable"), where("classId", "==", ctx.profile.classId || "__none__")));
  const rows = snap.docs.map((d) => d.data());
  if (rows.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><p>Your faculty hasn't published a timetable yet.</p></div>`;
    return;
  }
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  wrap.innerHTML = days
    .map((day) => {
      const entries = rows.filter((r) => r.day === day).sort((a, b) => a.time.localeCompare(b.time));
      if (entries.length === 0) return "";
      return `<div class="panel" style="margin-bottom:14px;">
        <h4 style="font-family:var(--font-display); color:var(--ink-green); margin-bottom:10px;">${day}</h4>
        <div class="ledger">${entries.map((e) => `<div class="ledger-row"><span class="roll" style="width:70px;">${escapeHtml(e.time)}</span><span class="name">${escapeHtml(e.subjectName)}</span></div>`).join("")}</div>
      </div>`;
    })
    .join("");
}

/* ---------------- Profile ---------------- */
function renderProfile() {
  document.getElementById("profileName").textContent = ctx.profile.name;
  document.getElementById("profileEmail").textContent = ctx.profile.email;
  document.getElementById("profileRoll").textContent = ctx.profile.rollNo || "—";
  document.getElementById("profileClassLabel").textContent = ctx.profile.classId || "Not assigned yet";
}

function wireStaticHandlers() {
  document.getElementById("scanStartBtn").addEventListener("click", handleScanStart);
  document.getElementById("scanStopBtn").addEventListener("click", handleScanStop);
  document.getElementById("submitLeaveBtn").addEventListener("click", handleLeaveSubmit);
}
