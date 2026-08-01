# Climb Pakistan

A sport climbing digital platform for Pakistan — rankings, news, athlete profiles, competition coverage, national records, championship results, and educational content.

## Project Overview

The platform consists of **three applications** in a monorepo:

| App                       | Directory          | Description                                                                                          |
| ------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| **Backend API**           | `backend/`         | Express.js + MongoDB REST API with JWT auth, rate limiting, Helmet security, Cloudinary uploads, and Web3Forms contact form |
| **Public Website**        | `frontend/main/`   | Vike (SSR/SSG) + React 19 public-facing website — pre-rendered static pages for visitors             |
| **Admin Dashboard**       | `admin/`           | React 19 + Vite admin panel for managing all content                                                 |

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
(port 5173,     (Vike SSR/SSG)      │
 pre-rendered)                       │
                                    ├── Backend API ──→ Cloudinary
                                    │   (port 3001)    (image storage)
                                    │
Admin Browser ──→ Admin Dashboard ──┤
(port 5174)                         │
                                    └── Web3Forms (contact email)
                                         │
                                    Vercel Deploy Hook
                                    (rebuild trigger)
```

- The **Public Frontend** uses [Vike](https://vike.dev) for server-side rendering and static site generation — all pages are pre-rendered at build time
- The **Admin Dashboard** lets administrators create, edit, and delete content (CRUD via API, JWT-protected)
- The **Backend API** serves as the single source of truth for all data — public GET requests are open, all mutations require a valid JWT token
- **Rate limiting** protects login (5 req/15min) and contact form (3 req/15min) endpoints
- **Helmet** adds security headers to all responses
- **Page view tracking** counts anonymous visits to public pages
- **Vercel rebuild hook** automatically regenerates the static site after admin content changes

## Feature Summary

| Feature                      | Public                            | Admin                                  | API |
| ---------------------------- | --------------------------------- | -------------------------------------- | --- |
| Athlete Profiles             | ✅ Browse + search                | ✅ CRUD + medals                       | ✅  |
| News Articles                | ✅ Read + related stories         | ✅ CRUD + publish/draft                | ✅  |
| Competitions                 | ✅ Browse + results + gallery     | ✅ CRUD + results editor + year filter | ✅  |
| Player Rankings              | ✅ View by year/gender/discipline | ✅ Slug/manual entry modes             | ✅  |
| Team Rankings                | ✅ View with logos                | ✅ Slug/manual entry modes             | ✅  |
| Team Profiles                | —                                 | ✅ CRUD + logo upload                  | ✅  |
| National Records             | ✅ View by gender + time sorting  | ✅ CRUD + date picker + tags           | ✅  |
| Championship Results         | ✅ View with Excel import data    | ✅ Excel file import                   | ✅  |
| Learn Climbing               | ✅ Educational guides + gallery   | ✅ CRUD + rich text + gallery          | ✅  |
| Photo Library                | —                                 | ✅ Upload + categorize + filter        | ✅  |
| Homepage Content             | ✅ Dynamic display                | ✅ Full editor (6 sections)            | ✅  |
| About Page                   | ✅ Display                        | ✅ Text editor                         | ✅  |
| Contact Form                 | ✅ Submit via Web3Forms           | ✅ Notification email settings         | ✅  |
| User Auth                    | —                                 | ✅ JWT login (real signed tokens)      | ✅  |
| SEO / Structured Data        | ✅ JSON-LD, sitemap, OG tags      | —                                      | —   |
| Page View Analytics          | —                                 | ✅ View page visit stats               | ✅  |
| Vercel Auto-rebuild          | —                                 | ✅ Trigger rebuild on content change   | ✅  |

## Tech Stack

| Layer                   | Technology                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| **Frontend (public)**   | React 19, Vike (SSR/SSG), Vite 8                                       |
| **Frontend (admin)**    | React 19, React Router 7, Vite 6                                       |
| **Styling**             | Custom CSS with dark/light theme via CSS variables                      |
| **Backend**             | Express.js, Mongoose 9, JWT auth (jsonwebtoken + bcryptjs)              |
| **Database**            | MongoDB Atlas                                                           |
| **Media Storage**       | Cloudinary                                                              |
| **Contact Email**       | Web3Forms API                                                           |
| **File Upload**         | Multer (memory storage) + Cloudinary SDK                                |
| **Security**            | Helmet, express-rate-limit, CORS                                        |
| **Excel Parsing**       | xlsx (SheetJS)                                                          |
| **SEO**                 | JSON-LD structured data, sitemap.xml, OG meta tags, pre-rendered static |

## Environment Variables

### Backend (`backend/.env`) — Required

| Variable                  | Description                               |
| ------------------------- | ----------------------------------------- |
| `MONGO_URI`               | MongoDB Atlas connection string           |
| `JWT_SECRET`              | Secret key for signing admin JWT tokens   |
| `ADMIN_EMAIL`             | Admin login email                         |
| `ADMIN_PASSWORD`          | Admin login password                      |
| `CLOUDINARY_CLOUD_NAME`   | Cloudinary cloud name (for image uploads) |
| `CLOUDINARY_API_KEY`      | Cloudinary API key                        |
| `CLOUDINARY_API_SECRET`   | Cloudinary API secret                     |
| `WEB3FORMS_ACCESS_KEY`    | Web3Forms access key (for contact form)   |
| `PORT`                    | Server port (default: `3001`)             |
| `CORS_ORIGIN`             | Comma-separated allowed origins (optional)|

### Frontend (`frontend/main/.env`) — Optional

| Variable         | Default                                                     | Description     |
| ---------------- | ----------------------------------------------------------- | --------------- |
| `VITE_API_URL`   | `http://localhost:3001/api` (dev) / `https://climb-pakistan-backend.onrender.com/api` (prod) | Backend API URL |

### Admin (`admin/.env`) — Optional

| Variable         | Default                       | Description     |
| ---------------- | ----------------------------- | --------------- |
| `VITE_API_URL`   | `http://localhost:3001/api` | Backend API URL |

## Authentication

- Admin login at `/login` sends email + password to `POST /api/auth/login`
- Backend validates credentials against `.env` values and returns a **signed JWT** (7-day expiry)
- All `POST`/`PUT`/`DELETE` requests to the backend require `Authorization: Bearer <token>`
- `GET` requests are public (no auth required)
- Rate limiting: max 5 login attempts per 15-minute window
- Invalid or expired tokens return `401` and the admin frontend redirects to login

## Data Relations

```
Athlete ────slug────→ Player Rankings
Team ──────slug────→ Team Rankings
Photo ─────category──→ (Athletes | News | Learn Climbing | Teams | Competitions)
Competition ──slug──→ Results (Speed/Lead/Boulder × Men/Women)
MainPage ────champions[].slug──→ Athlete
NationalRecord ──gender/discipline──→ Current & Previous records
```

Each `README.md` in the subdirectories has detailed documentation for that specific app.
