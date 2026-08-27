// ====================================================================
// FIREBASE CONFIGURATION
// Replace the values below with YOUR Firebase project's config.
// Firebase Console -> Project Settings -> General -> Your apps -> SDK setup
// Full walkthrough: see SETUP.md in this folder.
// ====================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDFuIfEm4nRINHd2J3kc9W62UvuW4wbBcI",
  authDomain: "smart-attendance-system-56f77.firebaseapp.com",
  projectId: "smart-attendance-system-56f77",
  storageBucket: "smart-attendance-system-56f77.firebasestorage.app",
  messagingSenderId: "896511642528",
  appId: "1:896511642528:web:a286d68354830951aff2c5",
  measurementId: "G-Q48JBJZRZY"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Offline attendance storage: queues writes locally when there's no
// connection and syncs automatically the moment the device is back online.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Offline persistence only works in one tab at a time.");
  } else if (err.code === "unimplemented") {
    console.warn("This browser does not support offline persistence.");
  }
});
