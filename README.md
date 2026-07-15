# Climb Pakistan

A sport climbing platform for Pakistan — rankings, news, athlete profiles, competition coverage, and educational content.

## Project Overview

The platform consists of **three applications** in a monorepo:

| App | Directory | Description |
|-----|-----------|-------------|
| **Backend API** | `backend/` | Express.js + MongoDB REST API with JWT auth, Cloudinary uploads, and Web3Forms contact form |
| **Public Website** | `frontend/main/` | React + Vite public-facing website for visitors |
| **Admin Dashboard** | `admin/` | React + Vite admin panel for managing all content |

## Quick Start

### 1. Backend

```bash
cd backend
npm install
# Create backend/.env with the required variables (see table below)
npm run dev
# → http://localhost:3001
```

### 2. Public Frontend

```bash
cd frontend/main
npm install
npm run dev
# → http://localhost:5173
```

### 3. Admin Dashboard

```bash
cd admin
npm install
npm run dev
# → http://localhost:5174
```

## Architecture

```
                          ┌──────────────────────┐
                          │   MongoDB Atlas       │
                          └─────────┬────────────┘
                                    │
User Browser ──→ Public Frontend ──→┤
(port 5173)                         │
                                    ├── Backend API ──→ Cloudinary
                                    │   (port 3001)
Admin Browser ──→ Admin Dashboard ──┤
(port 5174)                         │
                                    └── Web3Forms (contact email)
```

- The **Public Frontend** displays content to visitors (read-only via API)
- The **Admin Dashboard** lets administrators create, edit, and delete content (CRUD via API, JWT-protected)
- The **Backend API** serves as the single source of truth for all data — public GET requests are open, all mutations require a valid JWT token

## Feature Summary

| Feature | Public | Admin | API |
|---------|--------|-------|-----|
| Athlete Profiles | ✅ Browse + search | ✅ CRUD + medals | ✅ |
| News Articles | ✅ Read | ✅ CRUD + publish/draft | ✅ |
| Competitions | ✅ Browse + results | ✅ CRUD + results editor + year filter | ✅ |
| Player Rankings | ✅ View by year/gender/discipline | ✅ Slug/manual entry modes | ✅ |
| Team Rankings | ✅ View with logos | ✅ Slug/manual entry modes | ✅ |
| Team Profiles | — | ✅ CRUD + logo upload | ✅ |
| Learn Climbing | ✅ Educational guides | ✅ CRUD + gallery | ✅ |
| Photo Library | — | ✅ Upload + categorize + filter | ✅ |
| Homepage Content | ✅ Dynamic display | ✅ Full editor (6 sections) | ✅ |
| About Page | ✅ Display | ✅ Text editor | ✅ |
| Contact Form | ✅ Submit via Web3Forms | ✅ Notification email settings | ✅ |
| User Auth | — | ✅ JWT login (real signed tokens) | ✅ |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, React Router 7 |
| **Styling** | Custom CSS with dark/light theme via CSS variables |
| **Backend** | Express.js, Mongoose 9, JWT auth (jsonwebtoken + bcryptjs) |
| **Database** | MongoDB Atlas |
| **Media Storage** | Cloudinary |
| **Contact Email** | Web3Forms API |
| **File Upload** | Multer (memory storage) + Cloudinary SDK |

## Environment Variables

### Backend (`backend/.env`) — Required

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing admin JWT tokens |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (for image uploads) |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `WEB3FORMS_ACCESS_KEY` | Web3Forms access key (for contact form) |
| `PORT` | Server port (default: `3001`) |

### Frontend (`frontend/main/.env`) — Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001/api` | Backend API URL |

### Admin (`admin/.env`) — Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001/api` | Backend API URL |

## Authentication

- Admin login at `/login` sends email + password to `POST /api/auth/login`
- Backend validates credentials against `.env` values and returns a **signed JWT** (7-day expiry)
- All `POST`/`PUT`/`DELETE` requests to the backend require `Authorization: Bearer <token>`
- `GET` requests are public (no auth required)
- Invalid or expired tokens return `401` and the admin frontend redirects to login

## Data Relations

```
Athlete ──slug──→ Player Rankings
Team ────slug──→ Team Rankings
Photo ───category──→ (Athletes | News | Learn Climbing | Teams)
Competition ──slug──→ Results (Speed/Lead/Boulder × Men/Women)
MainPage ──champions[].slug──→ Athlete
```

Each `README.md` in the subdirectories has detailed documentation for that specific app.
