# ParkIQ

AI Smart Parking Management System built with Node.js, Express, MongoDB, React, and Vite.

![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

## Overview

ParkIQ is a microservices-based parking platform that handles user authentication, slot management, booking, pricing, and payments. The frontend is a Vite React app and the backend is split into an API gateway plus dedicated services.

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

Email: saisriram2796@gmail.com

LinkedIn: saisriramv

This repository is for personal and authorized use only. Do not copy, redistribute, or reuse this project or its code without permission from the author.

## License

MIT License applies only if the repository also includes and retains the MIT license file and terms.
