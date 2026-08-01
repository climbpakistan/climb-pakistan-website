# Contributing to Climb Pakistan

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **MongoDB Atlas** account (or local MongoDB instance with a connection string)
- **Cloudinary** account (for image upload features in the admin dashboard)
- **Web3Forms** access key (for contact form — no SMTP credentials needed)

### Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd climb-pakistan

# Install dependencies for all three apps
cd backend && npm install && cd ..
cd frontend/main && npm install && cd ../..
cd admin && npm install && cd ..

# Create environment files (see each app's README for required variables)
touch backend/.env
```

## Development Workflow

### Running the full stack locally

You need **three terminal windows**:

```bash
# Terminal 1 — Backend API (port 3001)
cd backend
npm run dev

# Terminal 2 — Public Frontend (port 5173)
cd frontend/main
npm run dev

# Terminal 3 — Admin Dashboard (port 5174)
cd admin
npm run dev
```

### Backend (`backend/`)

- Runs with `node --watch` for auto-restart on file changes
- All API routes are in `src/routes/`
- All database models are in `src/models/`
- Uses ES Modules (`"type": "module"`)
- Mongoose 9 — `pre('save')` hooks do **not** use a `next()` callback

**Security middleware (already configured):**
- **Helmet** — sets security headers (CSP, X-Frame-Options, etc.) automatically
- **Rate limiting** — login endpoint: 5 req/15min; contact form: 3 req/15min
- **CORS** — restricts to allowed origins (configure via `CORS_ORIGIN` env var)

**Adding a new model:**
1. Create the schema in `src/models/`
2. Create the route handler in `src/routes/`
3. Register the route in `src/index.js`
4. If the resource needs admin auth, wrap it with `requireAdmin` middleware in `src/index.js`
5. Add the CRUD functions in `admin/src/api.js`
6. If public-facing, add read functions in `frontend/main/src/api.js`

### Public Frontend (`frontend/main/`)

- Built with **React 19** + **Vike** (SSR/SSG framework with file-based routing) + **Vite 8**
- All routes are defined by the directory structure under `pages/`
- Pages are **pre-rendered to static HTML** at build time (`prerender: true` in config)
- Dynamic route parameters use `@slug/` directory naming convention

**Vike file conventions in `pages/`:**

| File                        | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `+Page.jsx`                 | The React component rendered for this route                 |
| `+data.js`                  | Data fetching function, runs at build time (SSG) or request (SSR) |
| `+onBeforePrerenderStart.js`| Generates a list of slugs/dynamic routes to pre-render      |
| `+Layout.jsx`               | Layout wrapper for the route (root level only)             |
| `+config.js`                | Vike configuration for the route / app                      |

**Example: Adding a new page at `/events`**

```
pages/
├── events/
│   ├── +Page.jsx              # Events listing component
│   └── +data.js               # Fetch events from API
│   └── @slug/                 # Dynamic route: /events/:slug
│       ├── +Page.jsx          # Single event component
│       ├── +data.js           # Fetch single event
│       └── +onBeforePrerenderStart.js  # Return all event slugs for pre-rendering
```

**Data fetching patterns:**
- **Build-time data** (recommended): Define a `+data.js` that fetches from the API and returns data. Vike passes it to `+Page.jsx` via the `data` prop.
- **Client-side data**: Use the `useFetch` hook from `src/hooks/useFetch.js` for dynamic content that changes frequently.

**Run commands:**
```bash
npm run dev      # → http://localhost:5173 (SSR with hot reload)
npm run build    # Pre-renders all pages + generates sitemap.xml
npm run preview  # Previews production build
npm run lint     # Runs oxlint
```

### Admin Dashboard (`admin/`)

- Built with React 19 + Vite 6
- Pages are in `src/pages/`
- API client in `src/api.js` handles auth tokens automatically
- Auth context in `src/contexts/AuthContext.jsx`
- All pages are behind a `ProtectedRoute` wrapper

## Coding Standards

### JavaScript / JSX

- Use **ES Modules** (`import`/`export`) everywhere
- Use **functional components** with hooks (no class components)
- Use **arrow functions** for component definitions
- Use **descriptive variable names** — avoid single-letter names except in loops/maps
- Use **optional chaining** (`?.`) and **nullish coalescing** (`??`) for safe property access

### Styling

- All styles are in a single `main.css` (frontend) or `global.css` (admin) — no CSS modules or styled-components
- Use CSS **custom properties** (variables) for colors, spacing, and typography
- Use lowercase-kebab-case with the component name as a prefix: `.component-name`, `.component-name-media`, `.component-name-body`
- Dark theme is the default; light theme overrides via `[data-theme='light']`

### API Patterns

- **Frontend API functions** are named `getXxx()` / `createXxx()` / `updateXxx()` / `deleteXxx()`
- All API functions return promises that resolve to JSON
- Backend routes return consistent error shapes: `{ error: "message" }`
- Mongoose Mixed-type fields (Ranking, TeamRanking, ChampionshipResult) require `markModified('fieldName')` before `save()` for nested changes to persist

## Git Guidelines

### Branch Naming

- `feature/short-description` — New features
- `fix/short-description` — Bug fixes
- `refactor/short-description` — Code restructuring
- `docs/short-description` — Documentation updates

### Commit Messages

Use conventional commits:

```
feat: add athlete rankings slug autocomplete
fix: resolve Mongoose Mixed-type persistence for rankings
docs: update API endpoint table in README
refactor: extract medal counting logic into helper
style: adjust champion card hover transition
```

### Pull Request Checklist

- [ ] Code builds without errors (`cd <app> && npm run build`)
- [ ] Frontend builds and lints: `cd frontend/main && npm run lint && npm run build`
- [ ] Admin builds: `cd admin && npm run build`
- [ ] No console errors or warnings
- [ ] Follows existing code patterns and conventions
- [ ] Self-reviewed for dead code, commented-out code, and debugging logs
- [ ] README files updated if adding new features or endpoints

## Project Structure Reference

### All Apps

```
climb-pakistan/
├── backend/                   # Express.js + MongoDB REST API (port 3001)
├── frontend/main/             # Vike + React public website (port 5173)
├── admin/                     # React + Vite admin dashboard (port 5174)
├── README.md                  # Root documentation
├── CONTRIBUTING.md            # This file
```

### Backend Entities

```
Athlete ────────── slug ──→ Player Rankings
Team ───────────── slug ──→ Team Rankings
Photo ──────────── category ──→ (athletes | news | learn-climbing | teams | competitions)
MainPage ───────── champions[].slug ──→ Athlete
Competition ────── images[] ──→ string URLs
NationalRecord ─── gender/discipline ──→ Current & Previous records
ContactForm ────── Web3Forms API (no DB storage)
ChampionshipResult ── Excel import ──→ Mixed schema data
```

### Admin Sections

| Section       | Pages                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Content       | Dashboard, Homepage                                                   |
| Management    | Latest News, Athletes, Rankings, Teams, Competitions, Learn Climbing, Photos |
| Records       | National Records, Records Page, Results                               |
| Settings      | About, Contact                                                        |

### Frontend Public Pages

| Route                                              | Vike File Pattern                          |
| -------------------------------------------------- | ------------------------------------------ |
| `/`                                                | `pages/index/+Page.jsx`                    |
| `/news`                                            | `pages/news/+Page.jsx`                     |
| `/news/:slug`                                      | `pages/news/@slug/+Page.jsx`              |
| `/athletes`                                        | `pages/athletes/+Page.jsx`                 |
| `/athletes/:slug`                                  | `pages/athletes/@slug/+Page.jsx`          |
| `/rankings`                                        | `pages/rankings/+Page.jsx`                 |
| `/rankings/:category/:discipline/:year`            | `pages/rankings/@category/@discipline/@year/+Page.jsx` |
| `/rankings/teams/:year`                            | `pages/rankings/teams/@year/+Page.jsx`     |
| `/records`                                         | `pages/records/+Page.jsx`                  |
| `/results`                                         | `pages/results/+Page.jsx`                  |
| `/competitions`                                    | `pages/competitions/+Page.jsx`            |
| `/competitions/:slug`                              | `pages/competitions/@slug/+Page.jsx`     |
| `/learn`                                           | `pages/learn/+Page.jsx`                    |
| `/learn/:slug`                                     | `pages/learn/@slug/+Page.jsx`            |
| `/about`                                           | `pages/about/+Page.jsx`                    |
| `/contact`                                         | `pages/contact/+Page.jsx`                  |
| `/thanks`                                          | `pages/thanks/+Page.jsx`                   |
| `*` (404)                                          | `pages/_error/+Page.jsx`                   |

## Key Patterns to Follow

### Adding a new editable field to the Homepage

1. Add the field to `backend/src/models/MainPage.js`
2. Add the field to the PUT handler in `backend/src/routes/mainPage.js`
3. Add state + input to `admin/src/pages/MainPage.jsx`
4. Update `frontend/main/pages/index/+data.js` to pass the field
5. Reference the field in `frontend/main/pages/index/+Page.jsx` with a fallback

### Adding a new CRUD resource

1. `backend/src/models/<Resource>.js` — Mongoose schema
2. `backend/src/routes/<resource>.js` — CRUD route handlers
3. `backend/src/index.js` — Register route (with `requireAdmin` if admin-only)
4. `admin/src/api.js` — Add CRUD functions
5. `admin/src/pages/<Resource>.jsx` — Admin page
6. `admin/src/App.jsx` — Add route entry
7. `admin/src/components/Sidebar.jsx` — Add sidebar link
8. `frontend/main/src/api.js` — Add read functions (if public-facing)
9. `frontend/main/pages/<resource>/+Page.jsx` — Public page component
10. `frontend/main/pages/<resource>/+data.js` — Public page data fetching

### SEO best practices

- Wrap each page in `<Seo>` component from `src/components/Seo.jsx`
- Add page-specific JSON-LD via the `jsonLd` prop (helpers in `src/utils/jsonLd.js`)
- Update `scripts/generate-sitemap.js` if adding new static routes

### Adding a Vike dynamic route (with pre-rendering)

1. Create `pages/<route>/@slug/` directory
2. Add `+data.js` — use `pageContext.routeParams.slug` to fetch specific content
3. Add `+onBeforePrerenderStart.js` — return an array of `{ params: { slug: "..." } }` objects
4. Add `+Page.jsx` — receive `data` prop and render

## Questions?

If you're unsure about patterns or conventions, check existing code in the same area first — consistency is more important than perfection.
