import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escapeHtml, fmtDate, fmtDateTime, todayISO, genToken, getCurrentPosition, showToast, pctColor } from "./utils.js";
import { renderQrCode } from "./qr.js";
import { notify } from "./notifications.js";

let ctx;
let mySubjects = [];
let myClassIds = [];
let activeSession = null;
let sessionUnsub = null;
let classStudentsCache = {}; // classId -> [students]

export function init(appCtx) {
  ctx = appCtx;
  ctx.registerView("f-dashboard", renderDashboard);
  ctx.registerView("f-session", renderSessionView);
  ctx.registerView("f-students", renderStudents);
  ctx.registerView("f-attendance", renderAttendance);
  ctx.registerView("f-leave", renderLeave);
  ctx.registerView("f-reports", renderReports);
  ctx.registerView("f-subjects", renderSubjects);
  wireStaticHandlers();
}

async function fetchMySubjects() {
  const snap = await getDocs(query(collection(db, "subjects"), where("facultyId", "==", ctx.user.uid)));
  mySubjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  myClassIds = [...new Set(mySubjects.map((s) => s.classId))];
  return mySubjects;
}

async function fetchAllClasses() {
  const snap = await getDocs(collection(db, "classes"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchStudentsForClass(classId) {
  if (classStudentsCache[classId]) return classStudentsCache[classId];
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", "student"), where("classId", "==", classId)));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.rollNo || "").localeCompare(b.rollNo || "", undefined, { numeric: true }));
  classStudentsCache[classId] = list;
  return list;
}

/* ---------------- Dashboard ---------------- */
async function renderDashboard() {
  const wrap = document.getElementById("fDashWrap");
  wrap.innerHTML = `<p class="muted">Loading…</p>`;
  await fetchMySubjects();
  wrap.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Subjects</div><div class="value">${mySubjects.length}</div><div class="sub">you teach</div></div>
      <div class="stat-card sage-accent"><div class="label">Classes</div><div class="value">${myClassIds.length}</div><div class="sub">assigned to you</div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h3>Your subjects</h3><p>Start a session from here or from "Take Attendance".</p></div></div>
      ${
        mySubjects.length === 0
          ? `<div class="empty-state"><p>No subjects assigned yet. Ask an admin to assign one, or add it yourself under "Subjects".</p></div>`
          : `<div class="ledger">${mySubjects
              .map((s) => `<div class="ledger-row"><span class="name" style="flex:1">${escapeHtml(s.name)}<span class="sub">${escapeHtml(s.code || "")} · Class ${escapeHtml(s.classId)}</span></span></div>`)
              .join("")}</div>`
      }
    </div>`;
}

/* ---------------- Session / QR ---------------- */
async function renderSessionView() {
  await fetchMySubjects();
  const sel = document.getElementById("sessionSubjectSelect");
  sel.innerHTML = mySubjects.map((s) => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.classId)})</option>`).join("");
  if (mySubjects.length === 0) sel.innerHTML = `<option value="">No subjects — add one first</option>`;
  document.getElementById("activeSessionPanel").style.display = "none";
  document.getElementById("startSessionBtn").style.display = "inline-flex";

  // manual marking date defaults to today
  document.getElementById("manualMarkDate").value = todayISO();
  document.getElementById("manualMarkDate").max = todayISO();
  await renderManualLedger();
}

async function handleStartSession() {
  const subjectId = document.getElementById("sessionSubjectSelect").value;
  if (!subjectId) {
    showToast("Choose a subject first");
    return;
  }
  const subject = mySubjects.find((s) => s.id === subjectId);
  const radius = parseInt(document.getElementById("sessionRadius").value) || 100;
  const duration = parseInt(document.getElementById("sessionDuration").value) || 10;
  const grace = parseInt(document.getElementById("sessionGraceMin").value) || 10;
  const useGps = document.getElementById("sessionUseGps").checked;

  let gps = null;
  if (useGps) {
    try {
      const coords = await getCurrentPosition();
      gps = { lat: coords.latitude, lng: coords.longitude, radius };
    } catch (e) {
      showToast("Couldn't get your location — starting without GPS check");
    }
  }

  const token = genToken();
  const startedAtMs = Date.now();
  const ref = await addDoc(collection(db, "sessions"), {
    subjectId,
    subjectName: subject.name,
    classId: subject.classId,
    facultyId: ctx.user.uid,
    date: todayISO(),
    token,
    active: true,
    gps,
    graceMinutes: grace,
    expiresAt: startedAtMs + duration * 60000,
    startedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  activeSession = { id: ref.id, subjectName: subject.name };
  document.getElementById("startSessionBtn").style.display = "none";
  document.getElementById("activeSessionPanel").style.display = "block";
  document.getElementById("activeSessionSubject").textContent = subject.name;
  document.getElementById("activeSessionExpiry").textContent = `expires in ${duration} min${gps ? " · GPS check " + radius + "m" : ""}`;

  renderQrCode("sessionQr", JSON.stringify({ sessionId: ref.id, token }));
  listenToSessionAttendance(ref.id, subjectId, subject.classId);
}

function listenToSessionAttendance(sessionId, subjectId, classId) {
  if (sessionUnsub) sessionUnsub();
  const q = query(collection(db, "attendance"), where("sessionId", "==", sessionId));
  sessionUnsub = onSnapshot(q, async (snap) => {
    const marks = snap.docs.map((d) => d.data());
    const students = await fetchStudentsForClass(classId);
    const nameOf = (uid) => students.find((s) => s.id === uid)?.name || "Unknown";
    document.getElementById("sessionScanCount").textContent = `${marks.length} of ${students.length} scanned`;
    document.getElementById("sessionScanList").innerHTML = marks
      .sort((a, b) => (a.markedAt?.toMillis?.() || 0) - (b.markedAt?.toMillis?.() || 0))
      .map((m) => `<div class="scan-chip ${m.status}">${escapeHtml(nameOf(m.studentId))} <span>${m.status}</span></div>`)
      .join("") || `<span class="muted" style="font-size:13px;">Nobody has scanned yet.</span>`;
  });
}

async function handleStopSession() {
  if (activeSession) {
    await updateDoc(doc(db, "sessions", activeSession.id), { active: false });
  }
  if (sessionUnsub) sessionUnsub();
  sessionUnsub = null;
  activeSession = null;
  document.getElementById("activeSessionPanel").style.display = "none";
  document.getElementById("startSessionBtn").style.display = "inline-flex";
  showToast("Session ended");
}

/* Manual marking fallback ledger */
async function renderManualLedger() {
  const subjectId = document.getElementById("sessionSubjectSelect").value;
  const date = document.getElementById("manualMarkDate").value || todayISO();
  const ledger = document.getElementById("manualMarkLedger");
  if (!subjectId) {
    ledger.innerHTML = `<div class="empty-state"><p>Choose a subject above to mark attendance manually.</p></div>`;
    return;
  }
  const subject = mySubjects.find((s) => s.id === subjectId);
  const students = await fetchStudentsForClass(subject.classId);
  const attSnap = await getDocs(query(collection(db, "attendance"), where("subjectId", "==", subjectId), where("date", "==", date)));
  const existing = {};
  attSnap.docs.forEach((d) => (existing[d.data().studentId] = { id: d.id, ...d.data() }));

  if (students.length === 0) {
    ledger.innerHTML = `<div class="empty-state"><p>No students found in this class yet.</p></div>`;
    return;
  }
  ledger.innerHTML = students
    .map((s) => {
      const st = existing[s.id]?.status;
      return `<div class="ledger-row" data-student="${s.id}">
      <span class="roll">#${escapeHtml(s.rollNo || "—")}</span>
      <span class="name" style="flex:1">${escapeHtml(s.name)}</span>
      <div class="toggle-pair">
        <button class="toggle-btn present ${st === "present" ? "active" : ""}" data-status="present" aria-label="Present">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.6"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="toggle-btn absent ${st === "absent" ? "active" : ""}" data-status="absent" aria-label="Absent">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>`;
    })
    .join("");

  ledger.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".ledger-row");
      row.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      row.dataset.chosen = btn.dataset.status;
    });
  });

  document.getElementById("manualMarkLedger").dataset.existing = JSON.stringify(
    Object.fromEntries(Object.entries(existing).map(([k, v]) => [k, v.id]))
  );
}

async function handleSaveManual() {
  const subjectId = document.getElementById("sessionSubjectSelect").value;
  const date = document.getElementById("manualMarkDate").value || todayISO();
  if (!subjectId) return;
  const subject = mySubjects.find((s) => s.id === subjectId);
  const existingIds = JSON.parse(document.getElementById("manualMarkLedger").dataset.existing || "{}");
  const rows = document.querySelectorAll("#manualMarkLedger .ledger-row");
  const jobs = [];
  rows.forEach((row) => {
    const studentId = row.dataset.student;
    const chosen = row.dataset.chosen;
    if (!chosen) return;
    if (existingIds[studentId]) {
      jobs.push(updateDoc(doc(db, "attendance", existingIds[studentId]), { status: chosen, editedBy: ctx.user.uid, editedAt: serverTimestamp() }));
    } else {
      jobs.push(
        addDoc(collection(db, "attendance"), {
          studentId,
          subjectId,
          classId: subject.classId,
          date,
          status: chosen,
          method: "manual",
          gpsVerified: null,
          markedAt: serverTimestamp(),
        })
      );
    }
  });
  await Promise.all(jobs);
  showToast("Register saved");
  renderManualLedger();
}

/* ---------------- Students ---------------- */
async function renderStudents() {
  await fetchMySubjects();
  const body = document.getElementById("facultyStudentTableBody");
  body.innerHTML = `<tr><td colspan="4" class="muted" style="padding:20px;">Loading…</td></tr>`;
  let all = [];
  for (const cid of myClassIds) {
    all = all.concat(await fetchStudentsForClass(cid));
  }
  renderStudentTable(all);
  document.getElementById("facultyStudentSearch").oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderStudentTable(all.filter((s) => s.name.toLowerCase().includes(q) || (s.rollNo || "").toLowerCase().includes(q)));
  };
}

function renderStudentTable(list) {
  const body = document.getElementById("facultyStudentTableBody");
  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="muted" style="padding:20px;">No students found.</td></tr>`;
    return;
  }
  body.innerHTML = list
    .map((s) => `<tr><td style="font-family:var(--font-mono);">#${escapeHtml(s.rollNo || "—")}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.classId || "—")}</td><td>${escapeHtml(s.email)}</td></tr>`)
    .join("");
}

/* ---------------- Attendance records + edit ---------------- */
async function renderAttendance() {
  await fetchMySubjects();
  const sel = document.getElementById("attFilterSubject");
  sel.innerHTML = `<option value="">All subjects</option>` + mySubjects.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  document.getElementById("attFilterDate").value = "";
  await loadAttendanceTable();
}

async function loadAttendanceTable() {
  const subjectId = document.getElementById("attFilterSubject").value;
  const dateFilter = document.getElementById("attFilterDate").value;
  const body = document.getElementById("attTableBody");
  body.innerHTML = `<tr><td colspan="5" class="muted" style="padding:20px;">Loading…</td></tr>`;

  const subjIds = subjectId ? [subjectId] : mySubjects.map((s) => s.id);
  if (subjIds.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="muted" style="padding:20px;">No subjects yet.</td></tr>`;
    return;
  }
  let records = [];
  for (const sid of subjIds) {
    const snap = await getDocs(query(collection(db, "attendance"), where("subjectId", "==", sid)));
    records = records.concat(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  if (dateFilter) records = records.filter((r) => r.date === dateFilter);
  records.sort((a, b) => (a.date < b.date ? 1 : -1));

  const classIds = [...new Set(records.map((r) => r.classId))];
  let students = [];
  for (const cid of classIds) students = students.concat(await fetchStudentsForClass(cid));
  const nameOf = (uid) => students.find((s) => s.id === uid)?.name || "Unknown";
  const subjNameOf = (sid) => mySubjects.find((s) => s.id === sid)?.name || "—";

  if (records.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="muted" style="padding:20px;">No records for this filter.</td></tr>`;
    return;
  }
  body.innerHTML = records
    .map(
      (r) => `<tr>
      <td>${fmtDate(r.date)}</td>
      <td>${escapeHtml(nameOf(r.studentId))}</td>
      <td>${escapeHtml(subjNameOf(r.subjectId))}</td>
      <td><span class="status-pill ${r.status}">${r.status}</span></td>
      <td><button class="icon-btn edit-att-btn" data-id="${r.id}" data-status="${r.status}" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></td>
    </tr>`
    )
    .join("");

  body.querySelectorAll(".edit-att-btn").forEach((btn) =>
    btn.addEventListener("click", () => openEditAttendance(btn.dataset.id, btn.dataset.status))
  );
}

function openEditAttendance(id, currentStatus) {
  const modal = document.getElementById("editAttModal");
  modal.dataset.id = id;
  document.getElementById("editAttStatus").value = currentStatus;
  document.getElementById("editAttReason").value = "";
  modal.classList.add("active");
}

async function handleSaveEditAttendance() {
  const modal = document.getElementById("editAttModal");
  const id = modal.dataset.id;
  const status = document.getElementById("editAttStatus").value;
  const reason = document.getElementById("editAttReason").value.trim();
  if (!reason) {
    showToast("Add a short reason for the edit");
    return;
  }
  await updateDoc(doc(db, "attendance", id), {
    status,
    edited: true,
    editReason: reason,
    editedBy: ctx.user.uid,
    editedAt: serverTimestamp(),
  });
  modal.classList.remove("active");
  showToast("Attendance updated");
  loadAttendanceTable();
}

/* ---------------- Leave approval ---------------- */
async function renderLeave() {
  await fetchMySubjects();
  const list = document.getElementById("facultyLeaveList");
  list.innerHTML = `<p class="muted">Loading…</p>`;
  let leaves = [];
  for (const cid of myClassIds) {
    const snap = await getDocs(query(collection(db, "leaves"), where("classId", "==", cid)));
    leaves = leaves.concat(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  leaves.sort((a, b) => (a.status === "pending" ? -1 : 1));
  if (leaves.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>No leave requests from your classes yet.</p></div>`;
    return;
  }
  const students = [];
  for (const cid of myClassIds) students.push(...(await fetchStudentsForClass(cid)));
  const nameOf = (uid) => students.find((s) => s.id === uid)?.name || "Unknown";

  list.innerHTML =
    `<div class="ledger">` +
    leaves
      .map(
        (l) => `<div class="ledger-row" data-id="${l.id}">
      <span class="name" style="flex:1">${escapeHtml(nameOf(l.studentId))}<span class="sub">${fmtDate(l.fromDate)} → ${fmtDate(l.toDate)} · ${escapeHtml(l.reason)}</span></span>
      ${
        l.status === "pending"
          ? `<div class="row-actions">
              <button class="btn small amber approve-btn" data-id="${l.id}" data-student="${l.studentId}">Approve</button>
              <button class="btn small clay reject-btn" data-id="${l.id}" data-student="${l.studentId}">Reject</button>
            </div>`
          : `<span class="status-pill ${l.status}">${l.status}</span>`
      }
    </div>`
      )
      .join("") +
    `</div>`;

  list.querySelectorAll(".approve-btn").forEach((b) => b.addEventListener("click", () => reviewLeave(b.dataset.id, b.dataset.student, "approved")));
  list.querySelectorAll(".reject-btn").forEach((b) => b.addEventListener("click", () => reviewLeave(b.dataset.id, b.dataset.student, "rejected")));
}

async function reviewLeave(leaveId, studentId, decision) {
  await updateDoc(doc(db, "leaves", leaveId), { status: decision, reviewedBy: ctx.user.uid, reviewedAt: serverTimestamp() });
  await notify(studentId, `Leave ${decision}`, `Your leave request was ${decision} by your faculty.`);
  showToast(`Leave ${decision}`);
  renderLeave();
}

/* ---------------- Reports ---------------- */
async function renderReports() {
  await fetchMySubjects();
  const sel = document.getElementById("reportSubjectSelect");
  sel.innerHTML = mySubjects.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  if (mySubjects.length) await loadReport(mySubjects[0].id);
}

let reportChart = null;
async function loadReport(subjectId) {
  const snap = await getDocs(query(collection(db, "attendance"), where("subjectId", "==", subjectId)));
  const records = snap.docs.map((d) => d.data());
  const present = records.filter((r) => r.status === "present").length;
  const late = records.filter((r) => r.status === "late").length;
  const absent = records.filter((r) => r.status === "absent").length;

  const ctx2d = document.getElementById("fReportChart").getContext("2d");
  if (reportChart) reportChart.destroy();
  // eslint-disable-next-line no-undef
  reportChart = new Chart(ctx2d, {
    type: "doughnut",
    data: {
      labels: ["Present", "Late", "Absent"],
      datasets: [{ data: [present, late, absent], backgroundColor: ["#E8A33D", "#8FAF9C", "#C1483C"] }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });

  const subject = mySubjects.find((s) => s.id === subjectId);
  const students = await fetchStudentsForClass(subject.classId);
  const body = document.getElementById("fReportTableBody");
  const perStudent = students.map((s) => {
    const mine = records.filter((r) => r.studentId === s.id);
    const p = mine.filter((r) => r.status === "present" || r.status === "late").length;
    const pct = mine.length ? (p / mine.length) * 100 : 0;
    return { ...s, present: p, total: mine.length, pct };
  });
  body.innerHTML = perStudent
    .sort((a, b) => a.pct - b.pct)
    .map(
      (s) => `<tr><td style="font-family:var(--font-mono);">#${escapeHtml(s.rollNo || "—")}</td><td>${escapeHtml(s.name)}</td><td>${s.present}/${s.total}</td><td style="color:${pctColor(s.pct)}; font-weight:700;">${s.total ? Math.round(s.pct) + "%" : "—"}</td></tr>`
    )
    .join("");

  document.getElementById("exportReportBtn").onclick = () => exportReportCsv(subject.name, perStudent);
}

function exportReportCsv(subjectName, rows) {
  const csv = ["Roll,Name,Present,Total,Percentage", ...rows.map((r) => `${r.rollNo || ""},${r.name},${r.present},${r.total},${r.total ? Math.round(r.pct) : ""}%`)].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${subjectName.replace(/\s+/g, "-")}-report.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------- Subjects ---------------- */
async function renderSubjects() {
  const classes = await fetchAllClasses();
  const sel = document.getElementById("newSubjectClassSelect");
  sel.innerHTML = classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  await fetchMySubjects();
  const list = document.getElementById("facultySubjectList");
  if (mySubjects.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>You haven't added any subjects yet.</p></div>`;
    return;
  }
  list.innerHTML = `<div class="ledger">${mySubjects.map((s) => `<div class="ledger-row"><span class="name" style="flex:1">${escapeHtml(s.name)}<span class="sub">${escapeHtml(s.code || "")} · Class ${escapeHtml(s.classId)}</span></span></div>`).join("")}</div>`;
}

async function handleAddSubject() {
  const name = document.getElementById("newSubjectName").value.trim();
  const code = document.getElementById("newSubjectCode").value.trim();
  const classId = document.getElementById("newSubjectClassSelect").value;
  if (!name || !classId) {
    showToast("Subject name and class are required");
    return;
  }
  await addDoc(collection(db, "subjects"), { name, code, classId, facultyId: ctx.user.uid, createdAt: serverTimestamp() });
  document.getElementById("newSubjectName").value = "";
  document.getElementById("newSubjectCode").value = "";
  showToast("Subject added");
  renderSubjects();
}

function wireStaticHandlers() {
  document.getElementById("startSessionBtn").addEventListener("click", handleStartSession);
  document.getElementById("stopSessionBtn").addEventListener("click", handleStopSession);
  document.getElementById("sessionSubjectSelect").addEventListener("change", renderManualLedger);
  document.getElementById("manualMarkDate").addEventListener("change", renderManualLedger);
  document.getElementById("saveManualBtn").addEventListener("click", handleSaveManual);
  document.getElementById("attFilterSubject").addEventListener("change", loadAttendanceTable);
  document.getElementById("attFilterDate").addEventListener("change", loadAttendanceTable);
  document.getElementById("cancelEditAttBtn").addEventListener("click", () => document.getElementById("editAttModal").classList.remove("active"));
  document.getElementById("saveEditAttBtn").addEventListener("click", handleSaveEditAttendance);
  document.getElementById("reportSubjectSelect").addEventListener("change", (e) => loadReport(e.target.value));
  document.getElementById("addSubjectBtn").addEventListener("click", handleAddSubject);
}
