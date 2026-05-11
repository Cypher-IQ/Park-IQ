# 🚀 ParkIQ — Quick Start Guide

Welcome to the **ParkIQ** Smart Parking Management System.

The application has been upgraded to a **Robust Production Architecture**. All microservices are fully integrated with **MongoDB** for data persistence, **Bcrypt** for secure password hashing, and the **Stripe SDK** for real-world payment processing.

---

## 🏃 Starting the System (One-Click Start)

We have configured a root-level script that uses `concurrently` to boot up the **API Gateway**, all **5 Microservices**, and the **React Frontend** in a single terminal.

1. Open a terminal at the root of the project:
   ```powershell
   cd "C:\Users\hp\Desktop\Projects\Car Parking System"
   ```

2. Run the start-all command:
   ```powershell
   npm run dev:all
   ```

3. Open your browser:
   **http://localhost:5173**

---

## ⚠️ MongoDB Development Behavior

- Services first try `MONGO_URI`.
- If that fails, they try `MONGO_LOCAL_URI` (default: `mongodb://127.0.0.1:27017/parkiq`).
- In `NODE_ENV=development`, services keep running even if MongoDB is unavailable, so the UI and non-DB endpoints still boot.
- In `NODE_ENV=production`, services still fail fast if DB connection is unavailable.

Development note: each service exposes a `/health` endpoint that now includes a `degradedMode` flag and `db` connection info. When MongoDB is unreachable in development:

- Read endpoints may return fallback data (example: parking slots) with `degradedMode: true`.
- Write endpoints (creates/updates) will return `503` with a message indicating the DB is unavailable.

If you see Atlas IP whitelist errors, either add your current IP in Atlas Network Access or run a local MongoDB instance for fallback.

If you see Atlas IP whitelist errors, either add your current IP in Atlas Network Access or run a local MongoDB instance for fallback.

---

## 🔑 Default Accounts & Seeding Data

The system utilizes MongoDB for full data persistence. We have pre-configured test credentials and automated scripts so you can test it instantly!

### Admin Login
An admin account is hardcoded into the system on startup.
- **Email**: `admin@parkiq.com`
- **Password**: `password123`

### Seeding Parking Slots
1. Log in to the application using the **Admin** credentials.
2. Navigate to the **Admin Dashboard** via the top navigation bar.
3. Click the **"Seed Slots"** button in the dashboard to automatically generate 50 parking slots across 5 zones.

---

## 🌐 Service URLs

If you need to access individual microservices directly or check their health status:

| Service | Port | Health Check URL |
|---------|------|-----------------|
| API Gateway | 3000 | http://localhost:3000/health |
| User Service | 3001 | http://localhost:3001/health |
| Parking Service | 3002 | http://localhost:3002/health |
| Booking Service | 3003 | http://localhost:3003/health |
| Pricing Service | 3004 | http://localhost:3004/health |
| Payment Service | 3005 | http://localhost:3005/health |
| Frontend | 5173 | http://localhost:5173 |
