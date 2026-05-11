# 🚗 ParkIQ

> **Intelligent Parking Management System** | AI-Powered Microservices | Full-Stack Demo

**ParkIQ** is a production-ready parking management platform showcasing modern full-stack architecture with microservices, real-time booking, and payment integration.

---

## 🎖 Tech Stack & Badges

![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?style=for-the-badge&logo=node.js)
![Express](https://img.shields.io/badge/Express-Backend-90C53F?style=for-the-badge&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Data-00ED64?style=for-the-badge&logo=mongodb)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=for-the-badge&logo=stripe)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker)

![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen?style=for-the-badge)
![Microservices](https://img.shields.io/badge/Architecture-Microservices-FF6B6B?style=for-the-badge)

## 📋 Overview

ParkIQ is a **microservices-based parking platform** that handles user authentication, slot management, booking, pricing, and payments. The frontend is a Vite React app and the backend is split into an API gateway plus dedicated services. Designed to be scalable, maintainable, and production-ready.

## System Architecture

```text
User Browser
    |
    v
Frontend (React + Vite)
    |
    v
API Gateway (Express)
    |
    +--> User Service
    +--> Parking Service
    +--> Booking Service
    +--> Pricing Service
    +--> Payment Service
    |
    v
MongoDB + External Services
```

The frontend handles the UI and routing, the gateway centralizes request flow, and each service owns one business domain. This structure makes the project easier to scale, test, and extend.

## Project Structure

- `frontend/` - React + Vite UI
- `api-gateway/` - Express gateway and routing layer
- `services/user-service/` - Authentication and user profile logic
- `services/parking-service/` - Parking slot and availability logic
- `services/booking-service/` - Booking lifecycle and receipts
- `services/pricing-service/` - Pricing and peak-hour calculations
- `services/payment-service/` - Payment flows and revenue tracking

## Features

- User registration, login, reset password, and profile management
- Parking slot browsing, booking, entry, exit, and cancellation
- Admin dashboard for slot seeding and operational management
- Pricing calculations with peak-hour support
- Payment initiation, retry flow, and booking-based payment lookup
- Receipt download for completed bookings
- Responsive frontend with routing and API integration

## Career Highlights

This project demonstrates practical full-stack and backend engineering skills that are valuable for internships and developer roles:

- Microservices architecture with a dedicated API gateway
- Authentication, authorization, and protected routes
- MongoDB data modeling and service-level separation
- Production-style environment configuration with `.env` examples
- Frontend deployment support for Vercel
- Backend orchestration and local multi-service startup scripts
- Testing coverage across services
- Real-world features such as booking, payment, and receipts

## Professional Profile

- Name: Sai Sri Ram Vanama
- Email: saisriram2796@gmail.com
- LinkedIn: [saisriramv](https://www.linkedin.com/in/saisriramv/)

If you are reviewing this repository for hiring or collaboration, the best places to start are the architecture, features, and deployment sections above.

## Tech Stack

- Node.js and Express.js
- MongoDB and Mongoose
- React 18, Vite, and React Router
- Tailwind CSS
- Axios
- Socket.IO client
- Chart.js and react-chartjs-2
- bcrypt, JWT, and Stripe integration

## Prerequisites

- Node.js 20 or later
- npm
- MongoDB running locally or a MongoDB Atlas cluster

## Local Setup

Clone the repository:

```powershell
git clone https://github.com/Cypher-IQ/Park-IQ.git
cd "Car Parking System"
```

Install dependencies for every package:

```powershell
npm run install:all
```

Create the environment files described in [ENVIRONMENT.md](ENVIRONMENT.md).

Start MongoDB.

Run the full app:

```powershell
npm run dev:all
```

Open the frontend in your browser:

```text
http://localhost:5173
```

## GitHub Setup

If you are pushing this project to a new GitHub repository:

```powershell
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/Cypher-IQ/Park-IQ.git
git push -u origin main
```

If the remote already exists, just use `git add`, `git commit`, and `git push`.

## Vercel Deployment

Deploy the frontend only.

Push the repository to GitHub.

Open Vercel and click New Project.

Import the GitHub repository.

Set the Root Directory to `frontend`.

Keep these settings:

- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Add `VITE_API_URL` in Vercel and point it to your live API gateway URL.

Deploy the project.

The frontend Vercel settings are aligned with [frontend/vercel.json](frontend/vercel.json).

## Default Admin

- Email: `admin@parkiq.com`
- Password: `password123`

## API Reference

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`

### Parking

- `GET /api/parking/slots`
- `POST /api/parking/slots`
- `PATCH /api/parking/slots/:id/status`
- `GET /api/parking/slots/nearest`
- `POST /api/parking/slots/seed`

### Bookings

- `POST /api/bookings`
- `GET /api/bookings`
- `GET /api/bookings/admin/all`
- `GET /api/bookings/:id`
- `GET /api/bookings/:id/receipt`
- `POST /api/bookings/entry`
- `POST /api/bookings/exit`
- `PATCH /api/bookings/:id/cancel`

### Pricing

- `POST /api/pricing/calculate`
- `GET /api/pricing/peak-hours`
- `PUT /api/pricing/peak-hours`

### Payments

- `POST /api/payments/initiate`
- `POST /api/payments/retry/:id`
- `GET /api/payments/booking/:id`
- `GET /api/payments/admin/revenue`

## Copyright and Usage

Copyright © 2026 Sai Sri Ram Vanama. All rights reserved.

Author: Sai Sri Ram Vanama

LinkedIn: [saisriramv](https://www.linkedin.com/in/saisriramv/)

This repository is for personal and authorized use only. Do not copy, redistribute, or reuse this project or its code without permission from the author.

## License

MIT License applies only if the repository also includes and retains the MIT license file and terms.
