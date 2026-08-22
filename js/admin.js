import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escapeHtml, fmtDate, todayISO, showToast, pctColor } from "./utils.js";

let ctx;
let cache = { departments: [], classes: [], subjects: [], students: [], faculty: [] };

export function init(appCtx) {
  ctx = appCtx;
  ctx.registerView("a-dashboard", renderDashboard);
  ctx.registerView("a-departments", renderDepartments);
  ctx.registerView("a-classes", renderClasses);
  ctx.registerView("a-students", renderStudents);
  ctx.registerView("a-faculty", renderFaculty);
  ctx.registerView("a-subjects", renderSubjectsAdmin);
  ctx.registerView("a-records", renderRecords);
  ctx.registerView("a-announcements", renderAnnouncements);
  wireStaticHandlers();
}

async function refreshCache() {
  const [dSnap, cSnap, subSnap, uSnap] = await Promise.all([
    getDocs(collection(db, "departments")),
    getDocs(collection(db, "classes")),
    getDocs(collection(db, "subjects")),
    getDocs(collection(db, "users")),
  ]);
  cache.departments = dSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  cache.classes = cSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  cache.subjects = subSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const users = uSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  cache.students = users.filter((u) => u.role === "student");
  cache.faculty = users.filter((u) => u.role === "faculty");
}

/* ---------------- Dashboard ---------------- */
async function renderDashboard() {
  const wrap = document.getElementById("aDashWrap");
  wrap.innerHTML = `<p class="muted">Loading…</p>`;
  await refreshCache();
  const attSnap = await getDocs(query(collection(db, "attendance"), where("date", "==", todayISO())));
  const todayCount = attSnap.size;

  wrap.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Students</div><div class="value">${cache.students.length}</div><div class="sub">enrolled</div></div>
      <div class="stat-card sage-accent"><div class="label">Faculty</div><div class="value">${cache.faculty.length}</div><div class="sub">registered</div></div>
      <div class="stat-card"><div class="label">Classes</div><div class="value">${cache.classes.length}</div><div class="sub">across ${cache.departments.length} department${cache.departments.length === 1 ? "" : "s"}</div></div>
      <div class="stat-card clay-accent"><div class="label">Marked Today</div><div class="value">${todayCount}</div><div class="sub">attendance records</div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h3>System snapshot</h3><p>${cache.subjects.length} subjects registered across all classes.</p></div></div>
      <div class="ledger">
        ${cache.classes
          .slice(0, 8)
          .map((c) => {
            const count = cache.students.filter((s) => s.classId === c.id).length;
            return `<div class="ledger-row"><span class="name" style="flex:1">${escapeHtml(c.name)}<span class="sub">${escapeHtml(c.department || "")} · Semester ${escapeHtml(c.semester || "—")}</span></span><span style="font-family:var(--font-mono); color:var(--ink-soft); font-size:13px;">${count} students</span></div>`;
          })
          .join("") || `<div class="empty-state"><p>Add a department and class to get started.</p></div>`}
      </div>
    </div>`;
}

/* ---------------- Departments ---------------- */
async function renderDepartments() {
  await refreshCache();
  const list = document.getElementById("deptList");
  list.innerHTML = cache.departments.length
    ? `<div class="ledger">${cache.departments
        .map((d) => `<div class="ledger-row"><span class="name" style="flex:1">${escapeHtml(d.name)}</span><button class="icon-btn danger del-dept" data-id="${d.id}"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button></div>`)
        .join("")}</div>`
    : `<div class="empty-state"><p>No departments yet.</p></div>`;
  list.querySelectorAll(".del-dept").forEach((b) =>
    b.addEventListener("click", async () => {
      await deleteDoc(doc(db, "departments", b.dataset.id));
      showToast("Department removed");
      renderDepartments();
    })
  );
}

async function handleAddDepartment() {
  const name = document.getElementById("newDeptName").value.trim();
  if (!name) return;
  await addDoc(collection(db, "departments"), { name, createdAt: serverTimestamp() });
  document.getElementById("newDeptName").value = "";
  showToast("Department added");
  renderDepartments();
}

/* ---------------- Classes ---------------- */
async function renderClasses() {
  await refreshCache();
  const deptSel = document.getElementById("newClassDept");
  deptSel.innerHTML = cache.departments.map((d) => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join("") || `<option value="">Add a department first</option>`;

  const list = document.getElementById("classList");
  list.innerHTML = cache.classes.length
    ? `<div class="ledger">${cache.classes
        .map((c) => `<div class="ledger-row"><span class="name" style="flex:1">${escapeHtml(c.name)}<span class="sub">${escapeHtml(c.department || "")} · Semester ${escapeHtml(c.semester || "—")}</span></span><button class="icon-btn danger del-class" data-id="${c.id}"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button></div>`)
        .join("")}</div>`
    : `<div class="empty-state"><p>No classes yet.</p></div>`;
  list.querySelectorAll(".del-class").forEach((b) =>
    b.addEventListener("click", async () => {
      await deleteDoc(doc(db, "classes", b.dataset.id));
      showToast("Class removed");
      renderClasses();
    })
  );
}

async function handleAddClass() {
  const name = document.getElementById("newClassName").value.trim();
  const department = document.getElementById("newClassDept").value;
  const semester = document.getElementById("newClassSemester").value.trim();
  if (!name) {
    showToast("Class name is required");
    return;
  }
  await addDoc(collection(db, "classes"), { name, department, semester, createdAt: serverTimestamp() });
  document.getElementById("newClassName").value = "";
  document.getElementById("newClassSemester").value = "";
  showToast("Class added");
  renderClasses();
}

/* ---------------- Students ---------------- */
async function renderStudents() {
  await refreshCache();
  const body = document.getElementById("aStudentTableBody");
  if (cache.students.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="muted" style="padding:20px;">No students have signed up yet.</td></tr>`;
    return;
  }
  body.innerHTML = cache.students
    .map(
      (s) => `<tr data-id="${s.id}">
      <td style="font-family:var(--font-mono);">#${escapeHtml(s.rollNo || "—")}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.email)}</td>
      <td>
        <select class="select-student class-assign">
          <option value="">Unassigned</option>
          ${cache.classes.map((c) => `<option value="${c.id}" ${s.classId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
        </select>
      </td>
      <td><button class="icon-btn danger del-user"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button></td>
    </tr>`
    )
    .join("");

  body.querySelectorAll(".class-assign").forEach((sel) =>
    sel.addEventListener("change", async (e) => {
      const uid = e.target.closest("tr").dataset.id;
      await updateDoc(doc(db, "users", uid), { classId: e.target.value });
      showToast("Class assigned");
    })
  );
  body.querySelectorAll(".del-user").forEach((b) =>
    b.addEventListener("click", async () => {
      const uid = b.closest("tr").dataset.id;
      await deleteDoc(doc(db, "users", uid));
      showToast("Student profile removed");
      renderStudents();
    })
  );
}

/* ---------------- Faculty ---------------- */
async function renderFaculty() {
  await refreshCache();
  const body = document.getElementById("aFacultyTableBody");
  if (cache.faculty.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="muted" style="padding:20px;">No faculty have signed up yet.</td></tr>`;
    return;
  }
  body.innerHTML = cache.faculty
    .map(
      (f) => `<tr data-id="${f.id}">
      <td>${escapeHtml(f.name)}</td>
      <td>${escapeHtml(f.email)}</td>
      <td>
        <select class="select-student dept-assign">
          <option value="">Unassigned</option>
          ${cache.departments.map((d) => `<option value="${escapeHtml(d.name)}" ${f.department === d.name ? "selected" : ""}>${escapeHtml(d.name)}</option>`).join("")}
        </select>
      </td>
      <td><button class="icon-btn danger del-user"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button></td>
    </tr>`
    )
    .join("");

  body.querySelectorAll(".dept-assign").forEach((sel) =>
    sel.addEventListener("change", async (e) => {
      const uid = e.target.closest("tr").dataset.id;
      await updateDoc(doc(db, "users", uid), { department: e.target.value });
      showToast("Department assigned");
    })
  );
  body.querySelectorAll(".del-user").forEach((b) =>
    b.addEventListener("click", async () => {
      const uid = b.closest("tr").dataset.id;
      await deleteDoc(doc(db, "users", uid));
      showToast("Faculty profile removed");
      renderFaculty();
    })
  );
}

/* ---------------- Subjects (admin overview) ---------------- */
async function renderSubjectsAdmin() {
  await refreshCache();
  const body = document.getElementById("aSubjectTableBody");
  if (cache.subjects.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="muted" style="padding:20px;">No subjects yet.</td></tr>`;
    return;
  }
  const facultyName = (id) => cache.faculty.find((f) => f.id === id)?.name || "Unassigned";
  const className = (id) => cache.classes.find((c) => c.id === id)?.name || id;
  body.innerHTML = cache.subjects
    .map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.code || "—")}</td><td>${escapeHtml(className(s.classId))}</td><td>${escapeHtml(facultyName(s.facultyId))}</td></tr>`)
    .join("");
}

/* ---------------- Records ---------------- */
async function renderRecords() {
  await refreshCache();
  const classSel = document.getElementById("recFilterClass");
  classSel.innerHTML = `<option value="">All classes</option>` + cache.classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  document.getElementById("recFilterDate").value = "";
  await loadRecords();
}

async function loadRecords() {
  const classId = document.getElementById("recFilterClass").value;
  const dateFilter = document.getElementById("recFilterDate").value;
  const body = document.getElementById("recTableBody");
  body.innerHTML = `<tr><td colspan="5" class="muted" style="padding:20px;">Loading…</td></tr>`;

  let q = collection(db, "attendance");
  const snap = await getDocs(q);
  let records = snap.docs.map((d) => d.data());
  if (classId) records = records.filter((r) => r.classId === classId);
  if (dateFilter) records = records.filter((r) => r.date === dateFilter);
  records.sort((a, b) => (a.date < b.date ? 1 : -1));

  const studentName = (id) => cache.students.find((s) => s.id === id)?.name || "Unknown";
  const subjectName = (id) => cache.subjects.find((s) => s.id === id)?.name || "—";

  if (records.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="muted" style="padding:20px;">No records match this filter.</td></tr>`;
    return;
  }
  body.innerHTML = records
    .slice(0, 500)
    .map(
      (r) => `<tr><td>${fmtDate(r.date)}</td><td>${escapeHtml(studentName(r.studentId))}</td><td>${escapeHtml(subjectName(r.subjectId))}</td><td><span class="status-pill ${r.status}">${r.status}</span></td><td style="color:var(--ink-soft); font-size:12.5px; text-transform:capitalize;">${r.method}</td></tr>`
    )
    .join("");

  document.getElementById("exportRecordsBtn").onclick = () => {
    const csv = ["Date,Student,Subject,Status,Method", ...records.map((r) => `${r.date},${studentName(r.studentId)},${subjectName(r.subjectId)},${r.status},${r.method}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-records-${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
}

/* ---------------- Announcements ---------------- */
async function renderAnnouncements() {
  const snap = await getDocs(collection(db, "announcements"));
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  const list = document.getElementById("announcementList");
  list.innerHTML = items.length
    ? `<div class="ledger">${items
        .map((a) => `<div class="ledger-row"><span class="name" style="flex:1">${escapeHtml(a.title)}<span class="sub">${escapeHtml(a.body)} · ${escapeHtml(a.audience)}</span></span></div>`)
        .join("")}</div>`
    : `<div class="empty-state"><p>No announcements posted yet.</p></div>`;
}

async function handlePostAnnouncement() {
  const title = document.getElementById("annTitle").value.trim();
  const body = document.getElementById("annBody").value.trim();
  const audience = document.getElementById("annAudience").value;
  if (!title || !body) {
    showToast("Title and message are required");
    return;
  }
  await addDoc(collection(db, "announcements"), { title, body, audience, createdBy: ctx.user.uid, createdAt: serverTimestamp() });
  document.getElementById("annTitle").value = "";
  document.getElementById("annBody").value = "";
  showToast("Announcement posted");
  renderAnnouncements();
}

function wireStaticHandlers() {
  document.getElementById("addDeptBtn").addEventListener("click", handleAddDepartment);
  document.getElementById("addClassBtn").addEventListener("click", handleAddClass);
  document.getElementById("recFilterClass").addEventListener("change", loadRecords);
  document.getElementById("recFilterDate").addEventListener("change", loadRecords);
  document.getElementById("postAnnBtn").addEventListener("click", handlePostAnnouncement);
}
