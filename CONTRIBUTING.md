# Contributing to Climb Pakistan

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **MongoDB** — either a local instance or an Atlas connection string
- **Cloudinary** account (for image upload features)
- **SMTP credentials** (for contact form email notifications)

### Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd climb-pakistan

# Install dependencies for all three apps
cd backend && npm install && cd ..
cd frontend/main && npm install && cd ../..
cd admin && npm install && cd ..

# Set up environment variables (see each app's README)
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

**Adding a new model:**
1. Create the schema in `src/models/`
2. Create the route handler in `src/routes/`
3. Register the route in `src/index.js`
4. Add the API function in both `admin/src/api.js` and `frontend/main/src/api.js`

### Public Frontend (`frontend/main/`)

- Built with React 19 + Vite 8
- Pages are in `src/pages/`
- Shared components are in `src/components/`
- All styles are in `src/styles/main.css` (~1500 lines)
- Data fetching uses the `useFetch` custom hook

**Page conventions:**
- Each page handles three states: **loading**, **empty**, and **data**
- `useFetch` returns `{ data, loading, error }`
- Dynamic routes use React Router's `useParams()`

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

- All styles are in `main.css` (frontend) or `global.css` (admin) — no CSS modules or styled-components
- Use CSS **custom properties** (variables) for colors, spacing, and typography
- Use lowercase-kebab-case with the component name as a prefix: `.component-name`, `.component-name-media`, `.component-name-body`
- Dark theme is the default; light theme overrides via `[data-theme='light']`

### API Patterns

- **Frontend API functions** are named `getXxx()` / `createXxx()` / `updateXxx()` / `deleteXxx()`
- All API functions return promises that resolve to JSON
- Backend routes return consistent error shapes: `{ error: "message" }`
- Mongoose Mixed-type fields require `markModified('fieldName')` before `save()` for nested changes to persist

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

- [ ] Code builds without errors (`npm run build`)
- [ ] No console errors or warnings
- [ ] Follows existing code patterns and conventions
- [ ] Self-reviewed for dead code, commented-out code, and debugging logs
- [ ] README files updated if adding new features or endpoints

## Project Structure Reference

### Backend Entities

```
Athlete ───── slug ──→ Player Rankings
Team ──────── slug ──→ Team Rankings
Photo ─────── category ──→ (athletes | news | learn-climbing | teams)
MainPage ──── champions[].slug ──→ Athlete
Competition ─ images[] ──→ string URLs
ContactForm ─ email notification only (no DB storage)
```

### Admin Sections

| Section | Pages |
|---------|-------|
| Content | Dashboard, Homepage |
| Management | Latest News, Athletes, Rankings, Teams, Competitions, Learn Climbing, Photos |
| Settings | About, Contact |

## Key Patterns to Follow

### Adding a new editable field to the Homepage

1. Add the field to `backend/src/models/MainPage.js`
2. Add the field to the PUT handler in `backend/src/routes/mainPage.js`
3. Add state + input to `admin/src/pages/MainPage.jsx`
4. Reference the field in `frontend/main/src/pages/Home.jsx` with a fallback

### Adding a new CRUD resource

1. `backend/src/models/<Resource>.js` — Mongoose schema
2. `backend/src/routes/<resource>.js` — CRUD route handlers
3. `backend/src/index.js` — Register route
4. `admin/src/api.js` — Add CRUD functions
5. `admin/src/pages/<Resource>.jsx` — Admin page
6. `frontend/main/src/api.js` — Add read functions (if public-facing)
7. `frontend/main/src/pages/<Resource>.jsx` or update existing page
8. `admin/src/App.jsx` — Add route
9. `admin/src/components/Sidebar.jsx` — Add sidebar link

## Questions?

If you're unsure about patterns or conventions, check existing code in the same area first — consistency is more important than perfection.
