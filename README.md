# 🎓 Robust Online Attendance System Using ML

A full-stack attendance management system using **Face Recognition (ML)** with student & faculty dashboards. Built with React, Express, and Amazon RDS (PostgreSQL) for real-time and scalable data management.

---

## 🚀 Setup (VS Code)

### 1. Prerequisites

* Node.js (v18+)
* VS Code

### 2. Environment Setup

Rename `.env.example` → `.env` and add:

```env
DB_HOST=your_rds_endpoint
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=postgres
DB_PORT=5432
JWT_SECRET=your_secret
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
```

---

### 3. Install & Run

```bash
npm install
npm run dev
```

App runs at: `http://localhost:3000`

---

## 🛠️ Features

* 🤖 Face Recognition-based Attendance
* 👨‍🎓 Student Dashboard
* 👩‍🏫 Faculty Dashboard
* 🔐 Secure OTP Login
* ☁️ Amazon RDS Integration

---

## 📁 Structure

* `/src/pages` → Frontend
* `/src/server` → Backend
* `server.ts` → API & server

---

## ⚠️ Note

* Dataset & large files are excluded
* Configure `.env` before running

---

## 📸 Screenshots

### 🔐 Login Page
![Login]

### 👨‍🎓 Student Dashboard
![Student]

### 👩‍🏫 Faculty Dashboard
![Faculty]

### 🤖 Face Recognition Output
![ML Output]

## 👨‍💻 Author

Akhtar Raza
B.Tech CSE (AI & ML)
Saurabh Raj 
Gulshan Baghel
