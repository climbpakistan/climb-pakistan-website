# Google Search Console Indexing Audit — Climb Pakistan

**Date:** 2026-09-08
**Scope:** Investigation only — no SEO/config/code changes were made. This document explains **why ~20 of the ~50 discovered pages are not indexed** and what to do about it.

---

## 1. Summary

- **Live sitemap:** 43 URLs (`https://www.climbpakistan.com/sitemap.xml`).
- **GSC status:** ~30 indexed, ~20 not indexed (~50 discovered URLs — 7 more than the sitemap, so 7 pages were found outside the sitemap, e.g. trailing-slash variants or removed URLs).
- **All 43 sitemap URLs return HTTP 200** with meaningful server-rendered HTML and self-referencing canonical tags. There is **no `noindex` on the core pages**, `robots.txt` blocks nothing except `/thanks`, and non-www → www is a clean **308** redirect.
- **Root cause is not crawl-blocking.** Nothing is blocked from crawling. The blockers are **discoverability (no internal links), thin content, duplicate content, and one error-page bug.**

---

## 2. Indexed Pages (working well)

Core, well-linked, content-rich pages index fine:

- Home `/`, `/news`, `/athletes`, `/rankings`, `/competitions`, `/learn`, `/about`, `/records`, `/results`, `/contact`
- All **4 `/learn/*`** subpages (~900–1100 words each)
- All **5 `/news/*`** articles (~4700–6400 words each, full SSR + `NewsArticle` JSON-LD)
- **12 of 13 `/athletes/*`** profiles (content-rich ones)

---

## 3. Non-Indexed Pages — Categorised

### 3a. Deliberately excluded (intentional)
| URL | Why |
|---|---|
| `/community/feed` | Page hard-codes `noIndex` (feed is app-like/dynamic content). Correct behaviour — keep as-is. |

### 3b. Thin / low-value content — "Crawled – currently not indexed"
These render little discoverable text, so Google crawls once via the sitemap and declines to index.

| URL | Content depth |
|---|---|
| `/community` | **~97 words, no `<h1>`, no `<title>`** — server-renders an empty auth spinner (login gate). Thin + JS-dependent. |
| `/rankings/teams/2024` | ~203 words (team list only) |
| `/rankings/teams/2025` | ~198 words (team list only) |
| `/rankings/women/speed/2025` | **1 data row** |
| `/athletes/yasin-ali` | ~159 words |
| `/athletes/iqra-jilani` | ~159 words |
| `/athletes/saba-zahra` | ~158 words |
| `/athletes/hanzala-hussain-zafar` | ~165 words |
| `/athletes/huzaifa-imran` | ~174 words |
| `/athletes/umar-bilal-zafar` | ~182 words |

### 3c. Discoverability gap — no internal links (all ranking detail pages)
The `/rankings` parent page renders the tables but **links to none of the detail URLs**. The 8 ranking detail pages are reachable **only via the sitemap**. Google crawls them but, with no internal-link signal and limited text, tags them "Crawled – currently not indexed".

- `/rankings/men/speed/2024`, `/rankings/men/speed/2025`
- `/rankings/men/lead/2024`
- `/rankings/men/boulder/2024`
- `/rankings/women/speed/2024`, `/rankings/women/speed/2025`
- `/rankings/teams/2024`, `/rankings/teams/2025`

### 3d. Duplicate content
| URLs | Issue |
|---|---|
| `/news/9th-national-sport-climbing-championship` | Same title/H1 ("9th National Sport Climbing Championship") and ~equivalent body |
| `/competitions/nationals-2025` | Same title/H1 as the news article → Google indexes one, drops the other. |

---

## 4. Technical Problems

1. **404s return HTTP 500 (soft-404 / error bug).**
   Non-existent paths (`/athletes/nope`, `/rankings/men`) return **HTTP 500** with a bare `<p>An error occurred.</p>` placeholder — not the `_error/+Page.jsx`. Vike fails to render the error page in production, so Googlebot sees a server error instead of a clean 404/410. This can cause misclassification of legitimate not-found URLs.

2. **`/community` shells out for logged-in/crawler states.** The page component returns a **spinner only** (`initializing || !isGuest`) before mounting `<Seo>`, so the SSR output has no `<title>`/`<h1>`. It is effectively blank to a crawler.

3. **Trailing-slash variants return 200** (both `/news/slug` and `/news/slug/` work). They self-canonicalise to the non-slash form, so this is handled, but it explains the ~7 "extra" discovered URLs.

---

## 5. Normal Google Exclusions (expected, not bugs)

- `/community/feed` — intended `noindex`.
- Old/2026 ranking combos with no data.
- Thin athlete profiles for unknown/lesser athletes — normal for a new site; they gain indexing as content/links grow.

---

## 6. Recommended Fixes

| # | Fix | Impact |
|---|---|---|
| 1 | **Add internal links from `/rankings` to all 8 detail pages** (year/category tabs already exist on detail pages — mirror them on the parent). | Highest — directly fixes 3c, the single biggest category. |
| 2 | **Fix 404 → 500**: ensure `_error/+Page.jsx` renders and non-existent dynamic routes return a true 404 (not Vike's placeholder). | Reduces soft-404 misclassification. |
| 3 | **Dedupe `/competitions/nationals-2025` vs the news article**: canonicalise one, or enrich the competition page with distinct content (schedule/results/entries). | Fixes duplicate-content drop. |
| 4 | **Thicken thin pages**: add 2–3 sentences of descriptive text/FAQ to `/community`, team rankings, `women/speed/2025`, and the shortest athlete profiles. | Fixes 3b. |
| 5 | Consider `noindex` on truly thin/placeholder pages instead of leaving them "crawled, not indexed". | Cleaner GSC reporting. |
| 6 | Request re-indexing of affected pages in GSC after fixes (URL Inspection → Request Indexing). | Faster pickup. |

---

## 7. Top 5 Actions (priority order)

1. Add internal links on `/rankings` → ranking detail pages.
2. Fix 404 handling (return real 404, render `_error` page).
3. Resolve the competition/news duplicate (canonical or distinct content).
4. Add descriptive text to thin pages (`/community`, team rankings, `women/speed/2025`, short athlete profiles).
5. Request re-indexing in GSC after the above deploy.

---

## 8. Indexing Health Score

**6 / 10** — Content and SSR are fundamentally solid (no crawl-blocking, all 200s, good structured data), but ~half the non-indexed pages come from **missing internal links + thin content + one duplicate**, all of which are fixed with code changes, not configuration.

---

## 9. Main Problem

The ranking detail pages are **discovered only through the sitemap** (no internal links) and combine with **thin athlete/team/community pages** and **one competition/news duplicate** — producing ~20 "Crawled — currently not indexed" URLs.

---

## 10. Recommended First Fix

Add year/category navigation links from `/rankings` to every detail URL (mirror the existing filter chips on the detail pages). This is low-risk, high-yield, and addresses the largest single category of non-indexed pages.
