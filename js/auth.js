import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function signup({ email, password, name, role, rollNo, classId, department }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile = {
    uid: cred.user.uid,
    name,
    email,
    role, // 'student' | 'faculty'  (admin is promoted manually in Firestore — see SETUP.md)
    createdAt: serverTimestamp(),
  };
  if (role === "student") {
    profile.rollNo = rollNo || "";
    profile.classId = classId || "";
  }
  if (role === "faculty") {
    profile.department = department || "";
  }
  await setDoc(doc(db, "users", cred.user.uid), profile);
  return cred.user;
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
  window.location.href = "index.html";
}

export function getProfile(uid) {
  return getDoc(doc(db, "users", uid)).then((snap) => (snap.exists() ? snap.data() : null));
}

// Call once per page load to gate access + fetch the current user's profile.
// onReady(user, profile) fires once auth state is known.
export function onAuthReady(onReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onReady(null, null);
      return;
    }
    const profile = await getProfile(user.uid);
    onReady(user, profile);
  });
}
