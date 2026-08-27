📋 Smart Attendance System

A modern, responsive Smart Attendance System designed for colleges and educational institutions. The platform provides dedicated interfaces for students, faculty members, and administrators, supporting QR-based attendance, GPS verification, leave management, notifications, reporting, and analytics.

The system is developed as a Progressive Web App (PWA), enabling users to access it through a web browser and install it on Android devices like a native application.

---

✨ Features

👨‍🎓 Student

- 🔐 Student registration and authentication
- 📊 Student dashboard
- 📱 QR-code-based attendance
- 📍 GPS-based attendance verification
- 📈 Overall attendance percentage
- 📚 Subject-wise attendance records
- 📝 Leave application submission
- ✅ Leave status tracking
- 🔔 Notifications
- 📢 Announcements

👨‍🏫 Faculty

- 🔐 Faculty authentication
- 📊 Faculty dashboard
- 📝 Attendance session creation
- 📱 QR code generation
- 📍 GPS verification
- ✍️ Manual attendance marking
- ⏰ Late attendance detection
- 📝 Leave application approval and rejection
- 👨‍🎓 Student attendance management
- 📊 Attendance reporting
- 📢 Announcement management

👨‍💼 Administrator

- 📊 Administrative dashboard
- 👨‍🎓 Student management
- 👨‍🏫 Faculty management
- 🏢 Department management
- 🏫 Class management
- 📚 Subject management
- 📈 Attendance statistics
- 📢 Announcement management

---

🚀 Key Features

- 📱 QR-code-based attendance
- 📍 GPS and location verification
- 🚫 Duplicate attendance prevention
- ⏰ Late attendance detection
- ✍️ Manual attendance marking
- 📝 Leave management
- 📊 Attendance analytics
- 📥 CSV report export
- 🔔 Notifications
- 📢 Announcements
- 🌙 Dark and light modes
- 📱 Fully responsive design
- 🌐 Progressive Web App (PWA) support
- 📲 Installable on Android devices

---

🛠️ Technologies

- HTML5
- CSS3
- JavaScript
- Bootstrap
- Firebase Authentication
- Cloud Firestore
- QR Code
- Browser Geolocation API
- PWA / Service Worker

---

📂 Project Structure

Smart-Attendence-System/
│
├── css/
│   └── styles.css
│
├── icons/
│   └── application-icons
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
├── manifest.json
├── sw.js
├── SETUP.md
├── LICENSE
└── README.md

---

⚙️ Installation

1. Clone the Repository

git clone https://github.com/JARVIS243/Smart-Attendence-System.git

cd Smart-Attendence-System

2. Configure Firebase

Open the following file:

js/firebase-config.js

Add your Firebase Web App configuration.

Enable the following Firebase services:

- Firebase Authentication
- Email/Password Authentication
- Cloud Firestore

Apply the security rules provided in:

firestore.rules

«⚠️ Never commit Firebase service-account credentials or other sensitive information to GitHub.»

---

💻 Run Locally

Because the project uses JavaScript modules, it must be served through a local web server.

VS Code

Install the Live Server extension and open:

index.html

Then select:

Open with Live Server

Python

If Python is installed, run:

python -m http.server 8000

Open the application at:

http://localhost:8000

---

☁️ Deploy on Render

This project can be deployed as a Static Site on Render.

Render Configuration

Create a new Static Site and connect it to the following repository:

GitHub Repository:
JARVIS243/Smart-Attendence-System

Branch:
main

Use the following configuration:

Build Command:
Leave empty

Publish Directory:
.

Then select:

Create Static Site

Render will provide a URL similar to:

https://smart-attendence-system.onrender.com

Whenever changes are pushed to the connected GitHub repository, Render can automatically deploy the updated version.

---

📱 Install on Android Devices

The application supports installation as a Progressive Web App (PWA).

Installation Steps

1. Open the Render deployment URL in Google Chrome.
2. Open the browser menu ⋮.
3. Select Install app or Add to Home screen.
4. Confirm the installation.
5. The Smart Attendance System will appear on the device's home screen.

The application can then be launched from the home screen similarly to a native application.

PWA Files

The project uses:

manifest.json
sw.js

These files provide PWA installation support and service-worker functionality.

---

🔐 Security

The application implements role-based access control for the following user roles:

Student
   ↓
Attendance / Leave / Reports

Faculty
   ↓
Sessions / Attendance / Leave Approval

Admin
   ↓
Users / Departments / Classes / Subjects

Firestore security rules are provided in:

firestore.rules

---

📊 Attendance Workflow

Faculty
   │
   ▼
Create Attendance Session
   │
   ▼
Generate QR Code
   │
   ▼
Student Scans QR Code
   │
   ▼
GPS Verification
   │
   ▼
Attendance Validation
   │
   ▼
Firestore
   │
   ▼
Attendance Report

---

🗄️ Firestore Collections

The system may use collections such as:

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

---

🎯 Objectives

- Reduce the administrative effort associated with manual attendance
- Prevent duplicate attendance records
- Maintain accurate attendance data
- Use QR codes to streamline attendance marking
- Verify student locations during attendance submission
- Provide dedicated dashboards for students, faculty, and administrators
- Simplify leave management
- Generate comprehensive attendance reports
- Improve the efficiency and reliability of attendance management

---

📱 Platform Support

Platform| Support
Android| ✅
iPhone/iPad| ✅ PWA
Windows| ✅ Browser/PWA
Linux| ✅ Browser/PWA
macOS| ✅ Browser/PWA

«The project is primarily a web application and PWA. Android Studio is not required to install it on a mobile device.»

---

🔮 Future Improvements

- 🤖 AI- and face-recognition-based attendance
- 📊 Advanced analytics
- 📄 PDF report generation
- 📧 Email notifications
- 🔔 Push notifications
- 📱 Enhanced offline synchronization
- 🛡️ Improved security
- 👥 Parent and guardian dashboard

---

👨‍💻 Author

Aju Krishna.B

B.Sc. Computer Science
College of Applied Science, Mavelikara
Kerala, India

GitHub: "JARVIS243" (https://github.com/JARVIS243)

---

📄 License

This project is licensed under the MIT License.

See the ""LICENSE"" (LICENSE) file for additional details.

---

⭐ Support

If you find this project useful:

⭐ Star the repository
🍴 Fork the repository
🐛 Report issues
💡 Suggest new features

---

<p align="center">

🎓 Smart Attendance System

Smart • Secure • Fast • Mobile-Friendly

</p>* Manage students
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
