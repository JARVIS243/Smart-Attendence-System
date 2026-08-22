# Smart Attendance System

A modern, responsive **Smart Attendance System** for educational institutions. It provides separate dashboards and features for **Students, Faculty, and Administrators**, with QR-based attendance, GPS verification, leave management, notifications, and attendance analytics.

## ✨ Features

### 👨‍🎓 Student

* Student registration and login
* Personal dashboard
* QR code attendance scanning
* GPS-based attendance verification
* View attendance percentage
* Subject-wise attendance
* Apply for leave
* View leave status
* Notifications and announcements

### 👨‍🏫 Faculty

* Faculty registration and login
* Faculty dashboard
* Create attendance sessions
* Generate time-limited QR codes
* GPS attendance verification
* Manual attendance marking
* Late attendance detection
* Approve or reject leave requests
* View student attendance
* Attendance reports and analytics
* Post announcements

### 👨‍💼 Admin

* Admin dashboard
* Manage departments
* Manage classes
* Manage subjects
* Manage students
* Manage faculty
* Manage institution structure
* View attendance statistics
* Manage announcements

## 📱 Additional Features

* QR-code based attendance
* GPS/location verification
* Duplicate attendance prevention
* Late attendance detection
* Manual attendance fallback
* Leave management
* Attendance analytics
* CSV report export
* In-app notifications
* Announcements
* Dark/Light mode
* Responsive mobile-friendly interface
* Offline support through Firestore

## 🛠️ Technologies Used

* **HTML5**
* **CSS3**
* **JavaScript**
* **Bootstrap**
* **Firebase Authentication**
* **Cloud Firestore**
* **Firebase Hosting**
* **QR Code**
* **Browser Geolocation API**

## 📂 Project Structure

```text
Smart-Attendance-System/
│
├── css/
│   └── styles.css
│
├── js/
│   ├── admin.js
│   ├── app.js
│   ├── auth.js
│   ├── faculty.js
│   ├── firebase-config.js
│   ├── notifications.js
│   ├── qr.js
│   ├── student.js
│   └── utils.js
│
├── app.html
├── index.html
├── firestore.rules
├── SETUP.md
└── README.md
```

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/Smart-Attendance-System.git
```

### 2. Open the project

```bash
cd Smart-Attendance-System
```

### 3. Configure Firebase

Open:

```text
js/firebase-config.js
```

Add your Firebase Web App configuration.

### 4. Enable Firebase services

In the Firebase Console, enable:

* Authentication → Email/Password
* Cloud Firestore

Apply the security rules from:

```text
firestore.rules
```

### 5. Run locally

Because the project uses JavaScript modules, run it through a local web server.

For example, with VS Code, use **Live Server**.

Or use Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## 🔐 Security

The application uses role-based access control for:

* Student
* Faculty
* Admin

Firestore security rules are included in:

```text
firestore.rules
```

**Never upload private credentials, service-account JSON files, passwords, or other secret keys to GitHub.**

## 🗄️ Firestore Collections

The system uses the following collections:

```text
users
departments
classes
subjects
sessions
attendance
leaves
notifications
announcements
timetable
```

## 🚀 Deployment

The application can be hosted using:

* Firebase Hosting
* Netlify
* Vercel
* GitHub Pages

Firebase Hosting is recommended for the current Firebase-based version because the frontend and Firebase services work together directly.

## 📊 Attendance Workflow

```text
Faculty
   ↓
Create Attendance Session
   ↓
Generate QR Code
   ↓
Student Scans QR
   ↓
GPS Verification
   ↓
Attendance Validation
   ↓
Firestore
   ↓
Attendance Report
```

## 📌 Project Status

**Under Development**

This project is being developed as an educational Smart Attendance System for colleges and other educational institutions.

## 👨‍💻 Author

**Aju Krishna.B**

B.Sc. Computer Science
College of Applied Science Mavelikara

## 📄 License

This project is licensed under the **MIT License**.

See the `LICENSE` file for details.

---

⭐ If you find this project useful, consider giving the repository a star.
