# Climb Pakistan — Admin Dashboard

React + Vite admin panel for managing the Climb Pakistan platform.

## Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite 6
- **Routing:** React Router DOM 7
- **Styling:** Custom CSS (no framework, dark/light theme via CSS variables)
- **Auth:** Real signed JWT with 7-day expiry, stored in localStorage, sent as Bearer token
- **Data:** All content is managed through the backend API (`/api`)

## Project Structure

```
admin/
├── src/
│   ├── main.jsx                  # App entry — BrowserRouter + Auth + Theme providers
│   ├── App.jsx                   # Route definitions, ProtectedRoute wrapper
│   ├── api.js                    # API client (CRUD functions, auth token handling)
│   ├── components/
│   │   ├── DashboardLayout.jsx   # Layout: Sidebar + Topbar + Outlet
│   │   ├── Sidebar.jsx           # Navigation sidebar with icon links
│   │   └── Topbar.jsx            # Top bar: page title, theme toggle, logout, avatar
│   ├── contexts/
│   │   ├── AuthContext.jsx       # Auth state (login/logout via backend API)
│   │   └── ThemeContext.jsx      # Dark/light theme toggle
│   ├── pages/
│   │   ├── Login.jsx             # Admin login form (email + password)
│   │   ├── Dashboard.jsx         # Overview with live content counts
│   │   ├── MainPage.jsx          # Homepage editor (hero, champions, coverage, CTA)
│   │   ├── LatestNews.jsx        # News articles CRUD with rich text editor
│   │   ├── Athletes.jsx          # Athlete profiles CRUD with medals
│   │   ├── Rankings.jsx          # Individual + Team rankings editor (slug/manual modes)
│   │   ├── Teams.jsx             # Team profiles CRUD with logo upload
│   │   ├── Competitions.jsx      # Competitions CRUD with results + image links + year filter
│   │   ├── LearnClimbing.jsx     # Educational sections CRUD with gallery
│   │   ├── Photos.jsx            # Media library with category filter + upload + competition filter
│   │   ├── About.jsx             # About page content editor
│   │   └── Contact.jsx           # Contact settings (notification email save/validate)
│   └── styles/
│       └── global.css            # All admin styles (variables, layout, components)
├── vite.config.js                # Dev server on port 5174
└── package.json
```

## Admin Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Email + password authentication |
| `/` | Dashboard | Stats overview (live counts from API) |
| `/main` | Homepage | Hero banner, CTA buttons, featured champions, latest news count, coverage sections, follow CTA |
| `/latest-news` | Latest News | CRUD for news articles with publish/draft status, rich text body editor |
| `/athletes` | Athletes | CRUD for athletes with medals, champion status, World Climbing URL |
| `/rankings` | Rankings | **Individual Rankings**: slug/manual modes, year/gender/discipline. **Team Rankings**: slug/manual modes, men/women/total points |
| `/teams` | Teams | Team profiles CRUD with name, slug, logo upload (Cloudinary), description, active status |
| `/competitions` | Competitions | CRUD with results editor (Speed/Lead/Boulder × Men/Women), image links array, year filter |
| `/learn-climbing` | Learn Climbing | CRUD for educational sections with gallery and rich text body editor |
| `/photos` | Photos | Media library: add with name + category + upload, category filter, competition filter, edit/delete |
| `/about` | About | Edit intro, mission, closing text |
| `/contact` | Contact | Notification email management with validation, how-it-works info |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start development server (port 5174)
npm run dev

# 3. Build for production
npm run build
```

## API Configuration

The admin panel connects to the backend at `http://localhost:3001/api` by default. To change it, set the `VITE_API_URL` environment variable:

```bash
# Windows (cmd)
set VITE_API_URL=https://your-api.com && npm run dev

# Windows (PowerShell)
$env:VITE_API_URL="https://your-api.com"; npm run dev
```

## Auth Flow

1. Login form sends `{ email, password }` to `POST /api/auth/login`
2. Backend validates credentials against `ADMIN_EMAIL`/`ADMIN_PASSWORD` environment variables and returns a **signed JWT** with 7-day expiry
3. Token is stored in `localStorage` as `admin-token`
4. All API calls include `Authorization: Bearer <token>` header
5. `GET` requests are public (no auth required on the backend)
6. `POST`/`PUT`/`DELETE` requests are protected — if the backend returns a 401, the session is cleared and redirected to `/login`

## Key Features

### Rankings Editor
- **Two input modes**: Select by Slug (auto-fills name/team/photo from athlete/team profiles) or Manual entry
- **Slug autocomplete**: Suggestions dropdown with real-time filtering as you type
- **Individual Rankings**: Filterable by gender (Men/Women), discipline (Speed/Lead/Boulder), and year
- **Team Rankings**: Separate tab with men's points, women's points, and auto-calculated total
- **Persists via** `markModified('data')` to handle Mongoose Mixed-type schemas
- **Year selection**: Dynamic year list derived from actual ranking data; any year can be used

### Homepage Editor
- **Hero Banner**: Two-line title (line 1 + accent line 2), subtitle, primary + secondary CTA buttons
- **Featured Champions**: 3 athlete slug entries with discipline title, rank, and points
- **Latest News Section**: Configurable number of articles to display
- **Coverage Sections**: 4 editable cards with title, description, and link
- **Follow CTA**: Title, subtitle, Instagram handle

### Photos Library
- **Category system**: Athletes, News, Learn Climbing, Teams, Competitions
- **Upload flow**: Select file → upload to Cloudinary → URL auto-fills → save with name + category
- **Category filter**: Filter the photo grid by category
- **Competition filter**: Filter photos linked to specific competitions
- **Edit/Delete**: Change name/category, replace image, or delete (removes from Cloudinary)

### Competitions
- **Image Links**: Dynamic array of image URLs with add/remove buttons and thumbnail previews
- **Results Editor**: Inline editing for Speed/Lead/Boulder × Men/Women with rank, name, team, mark
- **Year Filter**: Auto-generated year list from competition data, defaults to All Years
- **News Linking**: Link competition to related news articles

### Teams
- **Team Profiles**: Name, unique slug, logo upload (→ Cloudinary), description, active toggle
- **Reusable**: Team slug is used in Team Rankings for auto-resolution of name/logo
- **CRUD**: Full create, view, edit, delete
