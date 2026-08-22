import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { escapeHtml, fmtDateTime } from "./utils.js";

export async function notify(userId, title, body) {
  await addDoc(collection(db, "notifications"), {
    userId,
    title,
    body,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function markRead(notifId) {
  await updateDoc(doc(db, "notifications", notifId), { read: true });
}

// Wires up the bell icon + dropdown. Call once after login.
export function initNotificationBell(userId) {
  const bell = document.getElementById("notifBell");
  const dot = document.getElementById("notifDot");
  const panel = document.getElementById("notifPanel");
  const list = document.getElementById("notifList");
  if (!bell) return;

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("open");
  });
  document.addEventListener("click", () => panel.classList.remove("open"));
  panel.addEventListener("click", (e) => e.stopPropagation());

  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(25)
  );
  onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const unread = items.filter((n) => !n.read).length;
    dot.style.display = unread > 0 ? "block" : "none";

    if (items.length === 0) {
      list.innerHTML = `<div class="notif-empty">No notifications yet.</div>`;
      return;
    }
    list.innerHTML = items
      .map(
        (n) => `
      <div class="notif-item ${n.read ? "" : "unread"}" data-id="${n.id}">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        <div class="notif-body">${escapeHtml(n.body)}</div>
        <div class="notif-time">${fmtDateTime(n.createdAt)}</div>
      </div>`
      )
      .join("");

    list.querySelectorAll(".notif-item.unread").forEach((el) => {
      el.addEventListener("click", () => markRead(el.dataset.id));
    });
  });
}
