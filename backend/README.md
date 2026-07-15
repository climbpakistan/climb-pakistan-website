# Climb Pakistan — Backend

Express.js + MongoDB (Mongoose) REST API with JWT authentication, Cloudinary image upload, and Web3Forms contact form.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose ODM
- **Auth:** bcryptjs password hashing + jsonwebtoken (signed JWT, 7-day expiry)
- **Image Upload:** Cloudinary SDK + Multer (file & URL upload)
- **Contact Email:** Web3Forms API (external service — no SMTP credentials needed)
- **File Format:** ES Modules (`"type": "module"`)

## Project Structure

```
backend/
├── src/
│   ├── index.js                  # Server entry — mounts all routes, connects DB
│   ├── db.js                     # MongoDB connection (with DNS fix for Windows)
│   ├── cloudinary.js             # Cloudinary SDK configuration
│   ├── middleware/
│   │   └── auth.js               # JWT verification middleware (protects POST/PUT/DELETE)
│   ├── models/                   # Mongoose schemas (one file per entity)
│   │   ├── Athlete.js            # Athlete profile with medals subdocs
│   │   ├── News.js               # News articles with body paragraphs
│   │   ├── Competition.js        # Competitions with nested results + images array
│   │   ├── LearnSection.js       # Educational content with gallery
│   │   ├── AboutContent.js       # Single-document about page
│   │   ├── Photo.js              # Media library (name, url, category, publicId)
│   │   ├── Ranking.js            # Single-document rankings (Mixed schema)
│   │   ├── TeamRanking.js        # Team rankings (Mixed schema)
│   │   ├── Team.js               # Team profiles (name, slug, logo, description)
│   │   ├── MainPage.js           # Homepage settings (hero, champions, coverage, CTA)
│   │   ├── ContactSetting.js     # Notification email for contact form
│   │   └── User.js               # Admin users with bcrypt hashing
│   └── routes/                   # Express route handlers
│       ├── auth.js               # POST /api/auth/login (returns signed JWT)
│       ├── athletes.js           # CRUD /api/athletes
│       ├── news.js               # CRUD /api/news
│       ├── competitions.js       # CRUD /api/competitions
│       ├── learn.js              # CRUD /api/learn
│       ├── about.js              # GET/PUT /api/about
│       ├── photos.js             # GET/POST/PUT/DELETE /api/photos (with category filter)
│       ├── rankings.js           # GET/PUT /api/rankings
│       ├── teamRankings.js       # GET/PUT /api/team-rankings
│       ├── teams.js              # CRUD /api/teams
│       ├── mainPage.js           # GET/PUT /api/main-page
│       ├── contact.js            # GET/PUT settings (auth-protected), POST contact form (public)
│       └── upload.js             # POST /api/upload (file) + /api/upload/from-url
├── scripts/
│   └── import-athletes.js        # Bulk import from Excel
├── .env                          # Environment variables (gitignored)
├── .gitignore
└── package.json
```

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | — | Admin login → returns signed JWT |

### Athletes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/athletes` | Public | List all athletes |
| `POST` | `/api/athletes` | Admin | Create athlete |
| `PUT` | `/api/athletes/:slug` | Admin | Update athlete by slug |
| `DELETE` | `/api/athletes/:slug` | Admin | Delete athlete by slug |

### News
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/news` | Public | List articles (`?status=Published`) |
| `POST` | `/api/news` | Admin | Create article |
| `PUT` | `/api/news/:slug` | Admin | Update article |
| `DELETE` | `/api/news/:slug` | Admin | Delete article |

### Competitions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/competitions` | Public | List all competitions |
| `POST` | `/api/competitions` | Admin | Create competition |
| `PUT` | `/api/competitions/:slug` | Admin | Update competition |
| `DELETE` | `/api/competitions/:slug` | Admin | Delete competition |

### Learn
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/learn` | Public | List sections (`?status=Published`) |
| `POST` | `/api/learn` | Admin | Create section |
| `PUT` | `/api/learn/:slug` | Admin | Update section |
| `DELETE` | `/api/learn/:slug` | Admin | Delete section |

### Photos & Upload
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/photos` | Public | List photos (`?category=athletes`) |
| `POST` | `/api/photos` | Admin | Create photo record |
| `PUT` | `/api/photos/:id` | Admin | Update photo |
| `DELETE` | `/api/photos/:id` | Admin | Delete photo (removes from Cloudinary) |
| `POST` | `/api/upload` | Admin | Upload image file → Cloudinary |
| `POST` | `/api/upload/from-url` | Admin | Download URL → Cloudinary |

### Rankings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/rankings` | Public | Get all individual rankings |
| `PUT` | `/api/rankings` | Admin | Update all individual rankings |
| `GET` | `/api/team-rankings` | Public | Get all team rankings |
| `PUT` | `/api/team-rankings` | Admin | Update all team rankings |

### Teams
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/teams` | Public | List all team profiles |
| `POST` | `/api/teams` | Admin | Create team profile |
| `PUT` | `/api/teams/:slug` | Admin | Update team by slug |
| `DELETE` | `/api/teams/:slug` | Admin | Delete team by slug |

### Homepage
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/main-page` | Public | Get homepage settings |
| `PUT` | `/api/main-page` | Admin | Update homepage settings |

### Contact
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/contact/settings` | Admin | Get notification email |
| `PUT` | `/api/contact/settings` | Admin | Update notification email |
| `POST` | `/api/contact` | Public | Submit contact form (sent via Web3Forms, no DB storage) |

### About
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/about` | Public | Get about page content |
| `PUT` | `/api/about` | Admin | Update about page content |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (see variables below)

# 3. Start development server (auto-restarts on changes)
npm run dev

# 4. Start production server
npm start
```

## Environment Variables

All variables go in `backend/.env` (gitignored). **Credentials must come from `.env` only** — there are no hardcoded fallbacks.

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ Yes | Secret key for signing admin JWT tokens |
| `ADMIN_EMAIL` | ✅ Yes | Admin login email |
| `ADMIN_PASSWORD` | ✅ Yes | Admin login password |
| `CLOUDINARY_CLOUD_NAME` | ✅ For uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ For uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ For uploads | Cloudinary API secret |
| `WEB3FORMS_ACCESS_KEY` | ✅ For contact | Web3Forms API access key |
| `PORT` | ❌ No | Server port (default: `3001`) |

## Authentication Flow

1. **Login** — `POST /api/auth/login` with `{ email, password }` → validates against `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars
2. **Token** — On success, returns a signed JWT containing `{ id, email, name }` with **7-day expiry**
3. **Protection** — A `requireAdmin` middleware (in `src/middleware/auth.js`) runs on all `POST`/`PUT`/`DELETE` routes:
   - Allows `GET` requests through without auth (public reads)
   - Rejects missing, expired, or invalid tokens with `401`
   - The old `mock-jwt-token-placeholder` is explicitly rejected
4. **Frontend** — The admin dashboard stores the token in `localStorage` and sends it as `Authorization: Bearer <token>` on all API calls. `401` responses clear the session and redirect to `/login`.

## Key Notes

- **Rankings persistence**: Both `Ranking` and `TeamRanking` use Mongoose `Mixed` schema types. Updates use `markModified('data')` to ensure Mongoose persists nested changes.
- **Contact form**: Messages are sent via Web3Forms API (no SMTP configuration needed). Configure `WEB3FORMS_ACCESS_KEY` in `.env`. Messages are **not** stored in the database.
- **Auth**: Credentials are read from environment variables only — no hardcoded fallbacks exist in the source code.
- **File uploads**: Capped at 10 MB for both direct file upload and URL download.
- **DNS fix**: The server sets DNS to `8.8.8.8` at startup to resolve SRV issues on Windows.
- **Mongoose 9**: All `pre('save')` hooks use modern Mongoose 9 syntax without the `next()` callback.
