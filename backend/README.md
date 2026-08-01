# Climb Pakistan — Backend

Express.js + MongoDB (Mongoose) REST API with JWT authentication, rate limiting, Helmet security headers, Cloudinary image upload, Excel file parsing, and Web3Forms contact form.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose 9 ODM
- **Auth:** bcryptjs password hashing + jsonwebtoken (signed JWT, 7-day expiry)
- **Security:** Helmet (HTTP headers), express-rate-limit (brute-force protection), CORS
- **Image Upload:** Cloudinary SDK + Multer (file & URL upload)
- **Excel Parsing:** xlsx (SheetJS) for importing rankings, results, and team data
- **Contact Email:** Web3Forms API (external service — no SMTP credentials needed)
- **File Format:** ES Modules (`"type": "module"`)

## Project Structure

```
backend/
├── src/
│   ├── index.js                  # Server entry — mounts all routes, connects DB, middleware
│   ├── db.js                     # MongoDB connection (with DNS fix for Windows)
│   ├── cloudinary.js             # Cloudinary SDK configuration
│   ├── middleware/
│   │   └── auth.js               # JWT verification middleware (protects POST/PUT/DELETE)
│   ├── models/                   # Mongoose schemas (one file per entity)
│   │   ├── Athlete.js            # Athlete profile with medals subdocs
│   │   ├── News.js               # News articles with body paragraphs
│   │   ├── Competition.js        # Competitions with nested results + images array
│   │   ├── ChampionshipResult.js # Championship results from Excel import (Mixed schema)
│   │   ├── NationalRecord.js     # Speed climbing national records (current/previous)
│   │   ├── RecordsPage.js        # Records page SEO & hero settings
│   │   ├── LearnSection.js       # Educational content with gallery
│   │   ├── AboutContent.js       # Single-document about page
│   │   ├── Photo.js              # Media library (name, url, category, publicId)
│   │   ├── Ranking.js            # Single-document rankings (Mixed schema)
│   │   ├── TeamRanking.js        # Team rankings (Mixed schema)
│   │   ├── Team.js               # Team profiles (name, slug, logo, description)
│   │   ├── MainPage.js           # Homepage settings (hero, champions, coverage, CTA)
│   │   ├── ContactSetting.js     # Notification email for contact form
│   │   ├── PageView.js           # Anonymous page view analytics
│   │   └── User.js               # Admin users with bcrypt hashing
│   ├── routes/                   # Express route handlers
│   │   ├── auth.js               # POST /api/auth/login (returns signed JWT)
│   │   ├── athletes.js           # CRUD /api/athletes
│   │   ├── news.js               # CRUD /api/news
│   │   ├── competitions.js       # CRUD /api/competitions
│   │   ├── learn.js              # CRUD /api/learn
│   │   ├── about.js              # GET/PUT /api/about
│   │   ├── photos.js             # GET/POST/PUT/DELETE /api/photos (with category filter)
│   │   ├── rankings.js           # GET/PUT /api/rankings, GET /api/rankings/years
│   │   ├── teamRankings.js       # GET/PUT /api/team-rankings, GET /api/team-rankings/years
│   │   ├── teams.js              # CRUD /api/teams
│   │   ├── mainPage.js           # GET/PUT /api/main-page
│   │   ├── contact.js            # GET/PUT settings (auth-protected), POST contact form (public)
│   │   ├── upload.js             # POST /api/upload (file) + /api/upload/from-url
│   │   ├── nationalRecords.js    # CRUD /api/national-records (+ tags)
│   │   ├── recordsPage.js        # GET/PUT /api/records-page
│   │   ├── results.js            # CRUD /api/results (championship results with Excel import)
│   │   ├── pageViews.js          # POST /api/page-views (public), GET /api/page-views/stats (admin)
│   │   └── rebuild.js            # POST /api/rebuild (triggers Vercel deploy hook)
│   └── utils/
│       ├── xlsx-parser.js            # Generic Excel parser
│       ├── athlete-ranking-xlsx-parser.js  # Parse athlete ranking Excel files
│       ├── team-ranking-xlsx-parser.js     # Parse team ranking Excel files
│       ├── results-xlsx-parser.js          # Parse championship results Excel files
│       └── rebuild.js                     # Vercel deploy hook trigger helper
├── scripts/
│   └── import-athletes.js        # Bulk import from Excel
├── .env                          # Environment variables (gitignored)
├── .gitignore
└── package.json
```

## API Endpoints

### Auth
| Method | Endpoint            | Auth  | Description                     |
|--------|---------------------|-------|---------------------------------|
| `POST` | `/api/auth/login`   | —     | Admin login → returns signed JWT |

### Athletes
| Method   | Endpoint                  | Auth  | Description            |
|----------|---------------------------|-------|------------------------|
| `GET`    | `/api/athletes`           | Public | List all athletes     |
| `POST`   | `/api/athletes`           | Admin  | Create athlete        |
| `PUT`    | `/api/athletes/:slug`     | Admin  | Update athlete by slug|
| `DELETE` | `/api/athletes/:slug`     | Admin  | Delete athlete by slug|

### News
| Method   | Endpoint              | Auth  | Description                              |
|----------|-----------------------|-------|------------------------------------------|
| `GET`    | `/api/news`           | Public | List articles (`?status=Published`)     |
| `POST`   | `/api/news`           | Admin  | Create article                          |
| `PUT`    | `/api/news/:slug`     | Admin  | Update article                          |
| `DELETE` | `/api/news/:slug`     | Admin  | Delete article                          |

### Competitions
| Method   | Endpoint                      | Auth  | Description            |
|----------|-------------------------------|-------|------------------------|
| `GET`    | `/api/competitions`           | Public | List all competitions |
| `POST`   | `/api/competitions`           | Admin  | Create competition    |
| `PUT`    | `/api/competitions/:slug`     | Admin  | Update competition    |
| `DELETE` | `/api/competitions/:slug`     | Admin  | Delete competition    |

### Learn
| Method   | Endpoint              | Auth  | Description                              |
|----------|-----------------------|-------|------------------------------------------|
| `GET`    | `/api/learn`          | Public | List sections (`?status=Published`)     |
| `POST`   | `/api/learn`          | Admin  | Create section                          |
| `PUT`    | `/api/learn/:slug`    | Admin  | Update section                          |
| `DELETE` | `/api/learn/:slug`    | Admin  | Delete section                          |

### Photos & Upload
| Method   | Endpoint                    | Auth  | Description                                |
|----------|-----------------------------|-------|--------------------------------------------|
| `GET`    | `/api/photos`               | Public | List photos (`?category=athletes`)        |
| `POST`   | `/api/photos`               | Admin  | Create photo record                       |
| `PUT`    | `/api/photos/:id`           | Admin  | Update photo                              |
| `DELETE` | `/api/photos/:id`           | Admin  | Delete photo (removes from Cloudinary)    |
| `POST`   | `/api/upload`               | Admin  | Upload image file → Cloudinary            |
| `POST`   | `/api/upload/from-url`      | Admin  | Download URL → Cloudinary                 |

### Rankings
| Method   | Endpoint                      | Auth  | Description                          |
|----------|-------------------------------|-------|--------------------------------------|
| `GET`    | `/api/rankings`               | Public | Get all individual rankings         |
| `GET`    | `/api/rankings/years`         | Public | Get available ranking years         |
| `PUT`    | `/api/rankings`               | Admin  | Update all individual rankings      |
| `GET`    | `/api/team-rankings`          | Public | Get all team rankings               |
| `GET`    | `/api/team-rankings/years`    | Public | Get available team ranking years    |
| `PUT`    | `/api/team-rankings`          | Admin  | Update all team rankings            |

### Teams
| Method   | Endpoint              | Auth  | Description            |
|----------|-----------------------|-------|------------------------|
| `GET`    | `/api/teams`          | Public | List all team profiles|
| `POST`   | `/api/teams`          | Admin  | Create team profile   |
| `PUT`    | `/api/teams/:slug`    | Admin  | Update team by slug   |
| `DELETE` | `/api/teams/:slug`    | Admin  | Delete team by slug   |

### National Records
| Method   | Endpoint                            | Auth  | Description                           |
|----------|-------------------------------------|-------|---------------------------------------|
| `GET`    | `/api/national-records`             | Public | List records (`?gender=Men`)        |
| `GET`    | `/api/national-records/tags`        | Public | Get unique tags                      |
| `POST`   | `/api/national-records`             | Admin  | Create record                        |
| `PUT`    | `/api/national-records/:id`         | Admin  | Update record                        |
| `DELETE` | `/api/national-records/:id`         | Admin  | Delete record                        |

### Records Page Settings
| Method   | Endpoint                    | Auth  | Description                  |
|----------|-----------------------------|-------|------------------------------|
| `GET`    | `/api/records-page`         | Public | Get records page settings   |
| `PUT`    | `/api/records-page`         | Admin  | Update records page settings|

### Championship Results
| Method   | Endpoint                    | Auth  | Description                           |
|----------|-----------------------------|-------|---------------------------------------|
| `GET`    | `/api/results`              | Public | Get all championship results         |
| `POST`   | `/api/results`              | Admin  | Create result (or import from Excel) |
| `PUT`    | `/api/results/:id`          | Admin  | Update result                        |
| `DELETE` | `/api/results/:id`          | Admin  | Delete result                        |

### Homepage
| Method   | Endpoint                | Auth  | Description                 |
|----------|-------------------------|-------|-----------------------------|
| `GET`    | `/api/main-page`        | Public | Get homepage settings      |
| `PUT`    | `/api/main-page`        | Admin  | Update homepage settings   |

### Contact
| Method   | Endpoint                      | Auth  | Description                                                  |
|----------|-------------------------------|-------|--------------------------------------------------------------|
| `GET`    | `/api/contact/settings`       | Admin  | Get notification email                                      |
| `PUT`    | `/api/contact/settings`       | Admin  | Update notification email                                   |
| `POST`   | `/api/contact`                | Public | Submit contact form (sent via Web3Forms, no DB storage)     |

### About
| Method   | Endpoint              | Auth  | Description                     |
|----------|-----------------------|-------|---------------------------------|
| `GET`    | `/api/about`          | Public | Get about page content         |
| `PUT`    | `/api/about`          | Admin  | Update about page content      |

### Page Views
| Method   | Endpoint                         | Auth  | Description                         |
|----------|----------------------------------|-------|-------------------------------------|
| `POST`   | `/api/page-views`                | Public | Track page view (anonymous)       |
| `GET`    | `/api/page-views/stats`          | Admin  | Get page view statistics           |

### System
| Method   | Endpoint                | Auth  | Description                          |
|----------|-------------------------|-------|--------------------------------------|
| `GET`    | `/api/health`           | Public | Health check                        |
| `POST`   | `/api/rebuild`          | Admin  | Trigger Vercel deploy hook to rebuild static site |

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

| Variable                  | Required      | Description                                      |
| ------------------------- | ------------- | ------------------------------------------------ |
| `MONGO_URI`               | ✅ Yes        | MongoDB Atlas connection string                  |
| `JWT_SECRET`              | ✅ Yes        | Secret key for signing admin JWT tokens          |
| `ADMIN_EMAIL`             | ✅ Yes        | Admin login email                                |
| `ADMIN_PASSWORD`          | ✅ Yes        | Admin login password                             |
| `CLOUDINARY_CLOUD_NAME`   | ✅ For uploads| Cloudinary cloud name                            |
| `CLOUDINARY_API_KEY`      | ✅ For uploads| Cloudinary API key                               |
| `CLOUDINARY_API_SECRET`   | ✅ For uploads| Cloudinary API secret                            |
| `WEB3FORMS_ACCESS_KEY`    | ✅ For contact| Web3Forms API access key                         |
| `CORS_ORIGIN`             | ❌ Optional   | Comma-separated allowed origins                  |
| `PORT`                    | ❌ No         | Server port (default: `3001`)                    |

## Authentication Flow

1. **Login** — `POST /api/auth/login` with `{ email, password }` → validates against `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars
2. **Rate Limiting** — Login endpoint limited to 5 attempts per 15-minute window
3. **Token** — On success, returns a signed JWT containing `{ id, email, name }` with **7-day expiry**
4. **Protection** — A `requireAdmin` middleware (in `src/middleware/auth.js`) runs on all `POST`/`PUT`/`DELETE` routes:
   - Allows `GET` requests through without auth (public reads)
   - Rejects missing, expired, or invalid tokens with `401`
   - The old `mock-jwt-token-placeholder` is explicitly rejected
5. **Frontend** — The admin dashboard stores the token in `localStorage` and sends it as `Authorization: Bearer <token>` on all API calls. `401` responses clear the session and redirect to `/login`

## Security

- **Helmet** — Adds security headers (CSP, X-Frame-Options, XSS protection, etc.) to all responses
- **Rate Limiting** — Login: 5 requests per 15 min. Contact form: 3 requests per 15 min
- **CORS** — Restricts origins in production; allows common dev origins + custom domain
- **Auth** — All mutations require a valid signed JWT. Credentials from env vars only

## Key Notes

- **Rankings persistence**: Both `Ranking` and `TeamRanking` use Mongoose `Mixed` schema types. Updates use `markModified('data')` to ensure Mongoose persists nested changes
- **National Records**: Speed climbing records by gender. Supports `current` and `previous` record types with full date picking, tags, and time-sorted display
- **Championship Results**: Imported from Excel (.xlsx) files. Stored as Mixed schema for flexible data structures per competition
- **Page Views**: Anonymous tracking (path + timestamp) for basic analytics. GET stats endpoint is admin-protected
- **Contact form**: Messages are sent via Web3Forms API (no SMTP configuration needed). Messages are not stored in the database
- **Auth**: Credentials are read from environment variables only — no hardcoded fallbacks exist in the source code
- **File uploads**: Capped at 10 MB for both direct file upload and URL download
- **Excel parsing**: SheetJS (xlsx) library handles Excel import for rankings, team rankings, and championship results
- **Vercel rebuild**: After admin content changes, `POST /api/rebuild` triggers a Vercel deploy hook to regenerate the static site
- **DNS fix**: The server sets DNS to `8.8.8.8` at startup to resolve SRV issues on Windows
- **Mongoose 9**: All `pre('save')` hooks use modern Mongoose 9 syntax without the `next()` callback
