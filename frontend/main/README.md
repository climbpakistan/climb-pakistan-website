# Climb Pakistan — Public Frontend

Vike (SSR/SSG) + React 19 public-facing website for Pakistan's sport climbing platform — fully pre-rendered as static HTML.

## Tech Stack

- **Framework:** React 19 with [Vike](https://vike.dev) (SSR/SSG framework, file-based routing)
- **Build Tool:** Vite 8
- **Styling:** Custom CSS (no framework, dark/light theme via CSS variables)
- **Data:** Fetched at build time via Vike's `+data.js` hooks from the backend API
- **SEO:** JSON-LD structured data, Open Graph tags, sitemap.xml, pre-rendered static pages
- **Contact Form:** Submits via Web3Forms API
- **Analytics:** Custom page view tracking via backend API

## Project Structure

```
frontend/main/
├── pages/                          # Vike file-based routing — each directory = route
│   ├── +config.js                  # Vike config — extends vike-react, prerender: true
│   ├── +Layout.jsx                 # Root layout: ThemeProvider, Header, Footer, SEO, page view tracking
│   ├── +data.js                    # Shared API utilities
│   ├── index/                      # Route: /
│   │   ├── +data.js                # Homepage data (main page settings, athletes, news)
│   │   └── +Page.jsx               # Hero, champions, latest news, coverage, CTA
│   ├── about/
│   │   ├── +data.js                # About page content
│   │   └── +Page.jsx               # Platform story and mission
│   ├── athletes/                   # Route: /athletes
│   │   ├── +data.js                # All athletes + rankings
│   │   ├── +Page.jsx               # Athlete directory with gender/discipline filters
│   │   └── @slug/                  # Route: /athletes/:slug
│   │       ├── +data.js            # Single athlete + rankings + competitions
│   │       ├── +Page.jsx           # Profile, stats, medals, social links
│   │       └── +onBeforePrerenderStart.js  # Generate all athlete slugs at build time
│   ├── competitions/               # Route: /competitions
│   │   ├── +data.js                # All competitions
│   │   ├── +Page.jsx               # Competition listing
│   │   └── @slug/                  # Route: /competitions/:slug
│   │       ├── +data.js            # Single competition + news + photos
│   │       ├── +Page.jsx           # Tabs: overview, results, news, gallery
│   │       └── +onBeforePrerenderStart.js  # Generate all competition slugs
│   ├── contact/
│   │   └── +Page.jsx               # Contact form (submits via Web3Forms)
│   ├── learn/                      # Route: /learn
│   │   ├── +data.js                # All learn sections
│   │   ├── +Page.jsx               # Educational guides cards
│   │   └── @slug/                  # Route: /learn/:slug
│   │       ├── +data.js            # Single learn section
│   │       ├── +Page.jsx           # Full guide with body, details, gallery
│   │       └── +onBeforePrerenderStart.js  # Generate all learn slugs
│   ├── news/                       # Route: /news
│   │   ├── +data.js                # All published articles
│   │   ├── +Page.jsx               # News articles grid
│   │   └── @slug/                  # Route: /news/:slug
│   │       ├── +data.js            # Single article + related articles
│   │       ├── +Page.jsx           # Full article with body, related stories
│   │       └── +onBeforePrerenderStart.js  # Generate all article slugs
│   ├── rankings/                   # Route: /rankings
│   │   ├── +data.js                # Rankings data structure
│   │   ├── +Page.jsx               # Rankings hub page
│   │   ├── @category/              # Route: /rankings/:category/:discipline/:year
│   │   │   └── @discipline/
│   │   │       └── @year/
│   │   │           ├── +data.js    # Filtered player rankings
│   │   │           ├── +Page.jsx   # Rankings table with podium
│   │   │           └── +onBeforePrerenderStart.js  # Generate all ranking combinations
│   │   └── teams/                  # Route: /rankings/teams/:year
│   │       └── @year/
│   │           ├── +data.js        # Team rankings data
│   │           ├── +Page.jsx       # Team rankings with logos
│   │           └── +onBeforePrerenderStart.js  # Generate all team ranking years
│   ├── records/                    # Route: /records
│   │   ├── +data.js                # National records + page settings
│   │   └── +Page.jsx               # Speed climbing records by gender, time-sorted
│   ├── results/                    # Route: /results
│   │   ├── +data.js                # Championship results
│   │   └── +Page.jsx               # National Championship Results tables
│   ├── thanks/                     # Route: /thanks
│   │   └── +Page.jsx               # Post-contact-form confirmation
│   └── _error/                     # Route: * (404 fallback)
│       └── +Page.jsx               # 404 page
├── src/
│   ├── api.js                      # API client (fetch functions for all public endpoints)
│   ├── components/
│   │   ├── Header.jsx              # Site header: logo, nav with dropdown, search, theme toggle
│   │   ├── Footer.jsx              # Site footer with explore/more links and social
│   │   ├── AthleteCard.jsx         # Athlete card + ChampionCard (with crown icon badge)
│   │   ├── NewsCard.jsx            # News article card component with date & summary
│   │   ├── MedalIcon.jsx           # Medal SVG icon (Gold/Silver/Bronze)
│   │   ├── RecommendationCard.jsx  # Recommended content card
│   │   └── Seo.jsx                 # SEO component: title, meta, JSON-LD structured data
│   ├── data/
│   │   └── siteData.js             # Static nav links, footer links
│   ├── hooks/
│   │   ├── useFetch.js             # Generic data fetching hook (loading/error/data)
│   │   ├── useInView.js            # Intersection observer hook for scroll animations
│   │   ├── ThemeContext.jsx         # Dark/light theme context + localStorage persistence
│   │   ├── useAnalytics.jsx         # Analytics provider for page view tracking
│   │   └── animations.jsx          # AnimatedSection and StaggeredGrid components
│   ├── styles/
│   │   └── main.css                # All site styles (theme variables, layout, components, responsive)
│   └── utils/
│       └── jsonLd.js              # JSON-LD helpers: organization, website, breadcrumb, article, FAQ, athlete schemas
├── scripts/
│   └── generate-sitemap.js         # Build-time sitemap.xml generation
├── public/
│   ├── favicon.svg                 # SVG favicon
│   ├── favicon.png                 # PNG favicon fallback
│   ├── robots.txt                  # Search engine crawl rules
│   └── og-default.png              # Default Open Graph image
├── vite.config.js                  # Vike plugin config
├── index.html                     # Base HTML shell (favicon links live in +Layout.jsx for the build — see note below)
└── package.json
```

> **Favicon gotcha:** Vike strips `<head>` content from `index.html` during pre-rendering, so the favicon `<link>` tags there never reach the built pages. The favicon is therefore declared **both** in `index.html` (dev server) and in `pages/+Layout.jsx` via `vike-react/Head` (production build). When updating the logo/favicon, update both files or deployed pages will show no (or a stale cached) favicon.

## Pages

| Route                                              | Page        | Description                                                             |
| -------------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| `/`                                                | Home        | Dynamic hero, national champions, latest news, coverage sections, CTA   |
| `/news`                                            | News        | All published articles grid                                             |
| `/news/:slug`                                      | Article     | Single article with body, metadata, related stories                     |
| `/athletes`                                        | Athletes    | Athlete directory with gender/discipline filters & crown badges         |
| `/athletes/:slug`                                  | Athlete     | Profile, stats, medals, about, Instagram & World Climbing links         |
| `/rankings`                                        | Rankings    | Rankings hub                                                            |
| `/rankings/:category/:discipline/:year`            | Rankings    | Player rankings table with podium (by gender, discipline, year)         |
| `/rankings/teams/:year`                            | Teams       | Team rankings with logos                                                |
| `/records`                                         | Records     | National speed climbing records by gender, sorted by time               |
| `/results`                                         | Results     | National Championship Results tables                                    |
| `/competitions`                                    | Competitions| Competition listing                                                     |
| `/competitions/:slug`                              | Competition | Overview, results (tabs: Speed/Lead/Boulder × Men/Women), news, gallery |
| `/learn`                                           | Learn       | Educational guides cards                                                |
| `/learn/:slug`                                     | Guide       | Full guide with body, details, gallery                                  |
| `/about`                                           | About       | Platform story and mission                                              |
| `/contact`                                         | Contact     | Contact form (submits via Web3Forms)                                    |
| `/thanks`                                          | Thanks      | Post-submission confirmation                                            |
| `*`                                                | 404         | Not found page                                                          |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start development server (SSR, hot reload)
npm run dev
# → http://localhost:5173

# 3. Build for production (pre-renders all static HTML)
npm run build

# 4. Preview production build
npm run preview
```

## API Configuration

The frontend fetches data from the backend API. Defaults:

- **Development:** `http://localhost:3001/api`
- **Production:** `https://climb-pakistan-backend.onrender.com/api`

Override with the `VITE_API_URL` environment variable:

```bash
# Windows (cmd)
set VITE_API_URL=https://your-api.com && npm run dev

# Windows (PowerShell)
$env:VITE_API_URL=\"https://your-api.com\"; npm run dev
```

## API Endpoints Used

| Function                   | Endpoint                             | Description                        |
| -------------------------- | ------------------------------------ | ---------------------------------- |
| `getAthletes()`            | `GET /api/athletes`                  | All athletes                       |
| `getAthlete(slug)`         | `GET /api/athletes/:slug`           | Single athlete                     |
| `getNews()`                | `GET /api/news?status=Published`     | Published articles                 |
| `getNewsArticle(slug)`     | `GET /api/news/:slug`               | Single article                     |
| `getCompetitions()`        | `GET /api/competitions`              | All competitions                   |
| `getCompetition(slug)`     | `GET /api/competitions/:slug`       | Single competition                 |
| `getLearnSections()`       | `GET /api/learn?status=Published`    | Published learn sections           |
| `getLearnSection(slug)`    | `GET /api/learn/:slug`              | Single section                     |
| `getAboutContent()`        | `GET /api/about`                     | About page content                 |
| `getRankings()`            | `GET /api/rankings`                  | All player rankings                |
| `getRankingYears()`        | `GET /api/rankings/years`            | Available ranking years            |
| `getTeamRankings()`        | `GET /api/team-rankings`             | All team rankings                  |
| `getTeamRankingYears()`    | `GET /api/team-rankings/years`       | Available team ranking years       |
| `getTeams()`               | `GET /api/teams`                     | All team profiles                  |
| `getMainPage()`            | `GET /api/main-page`                 | Homepage dynamic content           |
| `getNationalRecords()`     | `GET /api/national-records`          | National speed climbing records    |
| `getRecordsPage()`         | `GET /api/records-page`              | Records page SEO settings          |
| `getResults()`             | `GET /api/results`                   | Championship results               |
| `submitContact(data)`      | `POST /api/contact`                  | Submit contact form                |

## Key Features

- **Vike SSR/SSG**: All pages are pre-rendered to static HTML at build time — zero server runtime for visitors, fast loads, great SEO
- **File-based Routing**: Route paths map directly to the `pages/` directory structure. Dynamic routes use `@slug/` directories
- **Data at Build Time**: Each page defines a `+data.js` that fetches data during prerendering, baked into the static HTML
- **Dynamic Homepage**: Hero text, CTA buttons, champion cards, coverage sections, and follow CTA are all editable from the admin dashboard via the `main-page` API
- **Rankings**: Player rankings filterable by year/gender/discipline. Team rankings with team logos resolved from Team profiles. Automatically loads the most recent year with data
- **National Records**: Speed climbing records by gender (Men/Women), sorted by fastest time first. Current and historical records displayed in dedicated tables with tags
- **Championship Results**: Results tables from national championships, imported from Excel files via the admin dashboard
- **Competition Gallery**: Images stored as an array of URLs, displayed in a responsive grid. Competition pages have tabs for overview, results, news, and gallery
- **SEO Optimized**: JSON-LD structured data (Organization, Website, Breadcrumb, Article, FAQ, Athlete schemas), Open Graph tags, sitemap.xml generated at build time, sport-climbing-specific keywords
- **Dark/Light Theme**: Toggle via the header button, persists in localStorage, applied before first paint to prevent flash
- **Animations**: Scroll-triggered entrance animations, staggered grid reveals using Intersection Observer
- **Page View Tracking**: Anonymous page view analytics sent to the backend on each route change
- **Athlete Cards**: National Champions display a crown icon badge; athlete profiles include Instagram and World Climbing links
- **Responsive**: Layout adapts from desktop (3-column grids) down to mobile (single column) with horizontal scroll for tables and swipeable mobile views
- **Three states per page**: Loading, empty, and error states handled throughout all data-driven pages
- **Accessibility**: Skip-to-content link, semantic HTML, ARIA labels on interactive elements
