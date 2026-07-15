// In production, set VITE_API_URL in your deployment environment.
// Defaults to the local backend during development.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Athletes ──
export function getAthletes() {
  return fetchJSON(`${BASE_URL}/athletes`);
}

export function getAthlete(slug) {
  return fetchJSON(`${BASE_URL}/athletes/${slug}`);
}

// ── News ──
export function getNews() {
  return fetchJSON(`${BASE_URL}/news?status=Published`);
}

export function getNewsArticle(slug) {
  return fetchJSON(`${BASE_URL}/news/${slug}`);
}

// ── Competitions ──
export function getCompetitions() {
  return fetchJSON(`${BASE_URL}/competitions`);
}

export function getCompetition(slug) {
  return fetchJSON(`${BASE_URL}/competitions/${slug}`);
}

// ── Learn Sections ──
export function getLearnSections() {
  return fetchJSON(`${BASE_URL}/learn?status=Published`);
}

export function getLearnSection(slug) {
  return fetchJSON(`${BASE_URL}/learn/${slug}`);
}

// ── About ──
export function getAboutContent() {
  return fetchJSON(`${BASE_URL}/about`);
}

// ── Rankings ──
export function getRankings() {
  return fetchJSON(`${BASE_URL}/rankings`);
}

export function getRankingYears() {
  return fetchJSON(`${BASE_URL}/rankings/years`);
}

// ── Team Rankings ──
export function getTeamRankings() {
  return fetchJSON(`${BASE_URL}/team-rankings`);
}

export function getTeamRankingYears() {
  return fetchJSON(`${BASE_URL}/team-rankings/years`);
}

// ── Teams ──
export function getTeams() {
  return fetchJSON(`${BASE_URL}/teams`);
}

// ── Main Page ──
export function getMainPage() {
  return fetchJSON(`${BASE_URL}/main-page`);
}

// ── Contact ──
export async function submitContact(data) {
  const res = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send message');
  }
  return res.json();
}
