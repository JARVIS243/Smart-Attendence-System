# Smart Attendance System — Setup Guide

This is a real multi-user app: students, faculty, and admins log in from
their own devices and share one live database. It's built on **Firebase**
(Google's backend platform), which has a genuinely free tier (Spark plan)
that covers everything here — no credit card, no server to run.

## 1. Create your Firebase project

1. Go to https://console.firebase.google.com and click **Add project**.
2. Give it a name (e.g. "smart-attendance-system"). You can skip Google
   Analytics — it isn't used here.
3. Once created, click the **web icon (`</>`)** on the project overview
   page to register a web app. Give it any nickname.
4. Firebase will show you a `firebaseConfig` object. Copy it.

## 2. Plug in your config

Open `js/firebase-config.js` and replace the placeholder values with the
ones Firebase gave you:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

## 3. Turn on Authentication

In the Firebase console: **Build → Authentication → Get started →
Sign-in method → Email/Password → Enable → Save.**

## 4. Turn on Firestore (the database)

**Build → Firestore Database → Create database.** Choose a region close
to your users, and start in **production mode** (the rules below lock
it down properly — you don't need "test mode").

Then apply the security rules: open **Firestore → Rules**, paste in the
contents of `firestore.rules` from this folder, and click **Publish**.
(If you have the Firebase CLI installed, `firebase deploy --only
firestore:rules` does the same thing from your terminal.)

## 5. Run it locally

Because this uses ES modules, opening `index.html` directly with
`file://` won't work in most browsers — it needs to be served over
`http://`. Easiest options:

- **VS Code**: install the "Live Server" extension, right-click
  `index.html` → "Open with Live Server".
- **Python**: `python3 -m http.server 8000` from this folder, then
  visit `http://localhost:8000`.
- **Firebase Hosting** (see step 7) also works great for this.

## 6. Bootstrap your first Admin account

There's no public "become an admin" button on purpose — that's a
privileged role. To create your first admin:

1. Sign up normally as a **Student** or **Faculty** from the app (use
   your own email).
2. In the Firebase console, go to **Firestore Database → users**, find
   your document (matches your email), and edit the `role` field from
   `student`/`faculty` to `admin`.
3. Log out and back in — you'll land on the Admin dashboard.

From there, use the Admin → Departments/Classes screens to set up your
institution's structure, and use Admin → Students/Faculty to assign
people to classes and departments as they sign up.

## 7. Deploy it (optional, so it's reachable from any phone)

**Firebase Hosting** (free, and lives in the same project):

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # choose this folder as the public directory
firebase deploy
```

You'll get a `https://your-project.web.app` URL that students and
faculty can open on their own phones.

Netlify or GitHub Pages work too — this is a static site, so just
upload the whole folder as-is.

## What's implemented

- **Auth & roles** — email/password login, self-signup as Student or
  Faculty, Admin promoted manually (see step 6), role-based navigation
  and Firestore security rules.
- **QR attendance** — faculty generates a time-limited QR per session;
  students scan with their camera; duplicate scans are rejected.
- **GPS verification** — faculty can require students to be within a
  configurable radius of their location to be marked present.
- **Late detection** — a configurable grace period after which a scan
  is marked "late" instead of "present".
- **Offline support** — Firestore's built-in offline persistence queues
  attendance writes when a device has no signal and syncs automatically
  once it reconnects.
- **Manual marking** — a roll-call fallback for faculty when QR isn't
  practical, with an authorized-edit flow (reason required, logged).
- **Leave management** — students apply, faculty approve/reject,
  students get notified.
- **Reports & analytics** — per-subject charts, per-student percentages,
  low-attendance warnings, CSV export.
- **In-app notifications & announcements** — a notification bell per
  user, plus admin/faculty-posted announcements shown to the right
  audience.
- **Dark/light mode**, responsive mobile layout with a collapsible
  sidebar.

## Honest limitations (things a static front-end genuinely can't do)

- **Admin can't create logins directly.** Firebase's client-side SDK
  can only create the account it then signs in as — there's no safe
  way to mint other people's accounts from the browser without a
  server-side Admin SDK (a paid-tier Cloud Function). That's why
  students/faculty self-register and admins assign them afterward.
- **GPS verification is a deterrent, not a lock.** Browser location can
  be spoofed by a determined user. It's genuinely useful for "did you
  forget to walk into the room," not airtight security.
- **Push notifications** (phone buzzes even when the app is closed)
  need Firebase Cloud Messaging plus a service worker and a bit more
  setup than fits here. What's built is a live in-app notification
  center — instant while the app is open, but not a push alert. I can
  add real push notifications as a follow-up if you want them.
- **PDF export** — CSV export is included for all reports; if you
  specifically need PDF, that's an easy add-on (a client-side library)
  I can wire in on request.
- **Duplicate-prevention & GPS checks run in the browser**, not in a
  server-side function — enough for a real class, but a student who
  edits the page's JavaScript directly could bypass them. Locking that
  down fully means moving the "mark attendance" logic into a Cloud
  Function, which needs Firebase's paid Blaze plan (it still has a
  generous free quota, just requires adding a billing method).

## Data model (Firestore collections)

- `users` — profile + role (`student` / `faculty` / `admin`)
- `departments`, `classes`, `subjects` — institution structure
- `sessions` — one doc per QR attendance window
- `attendance` — one doc per student per class per day
- `leaves` — leave requests + approval status
- `notifications` — per-user in-app notifications
- `announcements` — admin/faculty broadcast messages
- `timetable` — per-class weekly schedule entries
