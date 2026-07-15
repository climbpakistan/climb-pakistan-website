# Climb Pakistan — Public Frontend

React + Vite public-facing website for Pakistan's sport climbing platform.

## Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite 8
- **Routing:** React Router DOM 7
- **Styling:** Custom CSS (no framework, dark/light theme via CSS variables)
- **Data:** Fetched live from the backend API via custom hooks
- **Contact Form:** Submits via Web3Forms API

## Project Structure

```
frontend/main/
├── src/
│   ├── main.jsx                  # App entry
│   ├── App.jsx                   # Route definitions with Layout wrapper
│   ├── api.js                    # API client (fetch functions for all endpoints)
│   ├── components/
│   │   ├── Layout.jsx            # Shared layout: Header + Outlet + Footer
│   │   ├── Header.jsx            # Site header with nav, search, theme toggle
│   │   ├── Footer.jsx            # Site footer with links and social
│   │   ├── AthleteCard.jsx       # Athlete card + ChampionCard (with crown icon)
│   │   └── NewsCard.jsx          # News article card component
│   ├── data/
│   │   └── siteData.js           # Static data (nav links, footer links only)
│   ├── hooks/
│   │   ├── useFetch.js           # Generic data fetching hook (loading/error/data)
│   │   ├── useInView.js          # Intersection observer hook
│   │   ├── ThemeContext.jsx       # Dark/light theme context
│   │   └── animations.jsx        # AnimatedSection and StaggeredGrid components
│   ├── pages/
│   │   ├── Home.jsx              # Hero, champions, latest news, coverage, CTA
│   │   ├── News.jsx              # All news articles grid
│   │   ├── Article.jsx           # Single news article with related stories
│   │   ├── Athletes.jsx          # Athlete directory with gender/discipline filters
│   │   ├── Athlete.jsx           # Single athlete profile with medals
│   │   ├── Rankings.jsx          # Player + Team rankings by year, gender, discipline
│   │   ├── Competitions.jsx      # Competition listing
│   │   ├── Competition.jsx       # Competition with tabs (overview/results/news/gallery)
│   │   ├── Learn.jsx             # Educational guides listing
│   │   ├── LearnArticle.jsx      # Single guide with body content and gallery
│   │   ├── About.jsx             # About page with mission and stats
│   │   ├── Contact.jsx           # Contact form (submits via Web3Forms)
│   │   ├── Thanks.jsx            # Thank-you page after contact form submission
│   │   └── NotFound.jsx          # 404 page
│   ├── assets/
│   │   └── crown-icon.webp       # Crown icon for National Champion badge
│   └── styles/
│       └── main.css              # All site styles (1500+ lines)
├── vite.config.js
├── index.html
└── package.json
```

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Dynamic hero, national champions, latest news, coverage sections |
| `/news` | News | All articles grid |
| `/news/:slug` | Article | Single article with body and related stories |
| `/athletes` | Athletes | Athlete directory with gender/discipline filters & crown badges |
| `/athletes/:slug` | Athlete | Profile, stats, medals, about, Instagram & World Climbing links |
| `/rankings` | Rankings | Player rankings (year/gender/discipline) + Team rankings tabs |
| `/competitions` | Competitions | Competition listing |
| `/competitions/:slug` | Competition | Overview, results, related news, gallery images |
| `/learn` | Learn | Educational guides cards |
| `/learn/:slug` | LearnArticle | Full guide with body, details, gallery |
| `/about` | About | Platform story and mission |
| `/contact` | Contact | Contact form (submits via Web3Forms) |
| `/thanks` | Thanks | Post-submission confirmation |
| `*` | NotFound | 404 page |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start development server (port 5173)
npm run dev

# 3. Build for production
npm run build
```

## API Configuration

The frontend fetches data from `http://localhost:3001/api` by default. To change it, set the `VITE_API_URL` environment variable:

```bash
# Windows (cmd)
set VITE_API_URL=https://your-api.com && npm run dev

# Windows (PowerShell)
$env:VITE_API_URL="https://your-api.com"; npm run dev
```

## API Endpoints Used

| Function | Endpoint | Description |
|----------|----------|-------------|
| `getAthletes()` | `GET /api/athletes` | All athletes |
| `getAthlete(slug)` | `GET /api/athletes/:slug` | Single athlete |
| `getNews()` | `GET /api/news?status=Published` | Published articles |
| `getNewsArticle(slug)` | `GET /api/news/:slug` | Single article |
| `getCompetitions()` | `GET /api/competitions` | All competitions |
| `getCompetition(slug)` | `GET /api/competitions/:slug` | Single competition |
| `getLearnSections()` | `GET /api/learn?status=Published` | Published learn sections |
| `getLearnSection(slug)` | `GET /api/learn/:slug` | Single section |
| `getAboutContent()` | `GET /api/about` | About page content |
| `getRankings()` | `GET /api/rankings` | All player rankings |
| `getTeamRankings()` | `GET /api/team-rankings` | All team rankings |
| `getTeams()` | `GET /api/teams` | All team profiles |
| `getMainPage()` | `GET /api/main-page` | Homepage dynamic content |
| `submitContact(data)` | `POST /api/contact` | Submit contact form |

## Key Features

- **Dynamic Homepage**: Hero text, CTA buttons, champion cards, coverage sections, and follow CTA are all editable from the admin dashboard via the `main-page` API
- **Rankings**: Player rankings filterable by year/gender/discipline + Team rankings with team logos resolved from Team profiles. Automatically loads the most recent year with data.
- **Athlete Cards**: National Champions display a crown icon badge; athlete profiles include Instagram and World Climbing links
- **Competition Gallery**: Images stored as an array of URLs, displayed in a responsive grid
- **Responsive**: The layout adapts from desktop (3-column grids) down to mobile (single column) with horizontal scroll for tables
- **Animations**: Scroll-triggered entrance animations, staggered grid reveals
- **Dark/Light Theme**: Toggle via the header button, persists in localStorage
- **Three states per page**: Loading, empty, and error states handled throughout
