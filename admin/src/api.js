const BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://climb-pakistan-backend.onrender.com/api' : 'http://localhost:3001/api');

function getToken() {
  return localStorage.getItem('admin-token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  return res.json();
}

// ── Auth ──
export async function loginAPI(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Invalid email or password');
  }
  return res.json();
}

// ── Athletes ──
export function getAthletes() { return apiFetch(`${BASE_URL}/athletes`); }
export function createAthlete(data) { return apiFetch(`${BASE_URL}/athletes`, { method: 'POST', body: JSON.stringify(data) }); }
export function updateAthlete(slug, data) { return apiFetch(`${BASE_URL}/athletes/${slug}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteAthlete(slug) { return apiFetch(`${BASE_URL}/athletes/${slug}`, { method: 'DELETE' }); }

// ── Athletes — Bulk import from Excel ──
export async function importAthletesExcel(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('admin-token');
  const res = await fetch(`${BASE_URL}/athletes/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Import failed');
  }

  return res.json();
}

// ── News ──
export function getNews() { return apiFetch(`${BASE_URL}/news`); }
export function createNews(data) { return apiFetch(`${BASE_URL}/news`, { method: 'POST', body: JSON.stringify(data) }); }
export function updateNews(slug, data) { return apiFetch(`${BASE_URL}/news/${slug}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteNews(slug) { return apiFetch(`${BASE_URL}/news/${slug}`, { method: 'DELETE' }); }

// ── Competitions ──
export function getCompetitions() { return apiFetch(`${BASE_URL}/competitions`); }
export function createCompetition(data) { return apiFetch(`${BASE_URL}/competitions`, { method: 'POST', body: JSON.stringify(data) }); }
export function updateCompetition(slug, data) { return apiFetch(`${BASE_URL}/competitions/${slug}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteCompetition(slug) { return apiFetch(`${BASE_URL}/competitions/${slug}`, { method: 'DELETE' }); }

// ── Learn Sections ──
export function getLearnSections() { return apiFetch(`${BASE_URL}/learn`); }
export function createLearnSection(data) { return apiFetch(`${BASE_URL}/learn`, { method: 'POST', body: JSON.stringify(data) }); }
export function updateLearnSection(slug, data) { return apiFetch(`${BASE_URL}/learn/${slug}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteLearnSection(slug) { return apiFetch(`${BASE_URL}/learn/${slug}`, { method: 'DELETE' }); }

// ── About ──
export function getAbout() { return apiFetch(`${BASE_URL}/about`); }
export function updateAbout(data) { return apiFetch(`${BASE_URL}/about`, { method: 'PUT', body: JSON.stringify(data) }); }

// ── Photos ──
export function getPhotos(category) { const qs = category && category !== 'all' ? `?category=${category}` : ''; return apiFetch(`${BASE_URL}/photos${qs}`); }
export function createPhoto(data) { return apiFetch(`${BASE_URL}/photos`, { method: 'POST', body: JSON.stringify(data) }); }
export function updatePhoto(id, data) { return apiFetch(`${BASE_URL}/photos/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deletePhoto(id) { return apiFetch(`${BASE_URL}/photos/${id}`, { method: 'DELETE' }); }

// ── Upload (Cloudinary) — from file ──
export async function uploadPhoto(file, name, category) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('name', name);
  if (category) formData.append('category', category);

  const token = localStorage.getItem('admin-token');
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }

  return res.json();
}

// ── Upload (Cloudinary) — from URL ──
export async function uploadPhotoFromUrl(url, label) {
  const token = localStorage.getItem('admin-token');
  const res = await fetch(`${BASE_URL}/upload/from-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url, label }),
  });

  if (res.status === 401) {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }

  return res.json();
}

// ── Rankings ──
export function getRankings() { return apiFetch(`${BASE_URL}/rankings`); }
export function updateRankings(data) { return apiFetch(`${BASE_URL}/rankings`, { method: 'PUT', body: JSON.stringify(data) }); }

// ── Athlete Rankings — Bulk import from Excel ──
export async function importRankingsExcel(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('admin-token');
  const res = await fetch(`${BASE_URL}/rankings/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Import failed');
  }

  return res.json();
}

// ── Team Rankings ──
export function getTeamRankings() { return apiFetch(`${BASE_URL}/team-rankings`); }
export function updateTeamRankings(data) { return apiFetch(`${BASE_URL}/team-rankings`, { method: 'PUT', body: JSON.stringify(data) }); }

// ── Team Rankings — Bulk import from Excel ──
export async function importTeamRankingsExcel(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('admin-token');
  const res = await fetch(`${BASE_URL}/team-rankings/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Import failed');
  }

  return res.json();
}

// ── Teams ──
export function getTeams() { return apiFetch(`${BASE_URL}/teams`); }
export function createTeam(data) { return apiFetch(`${BASE_URL}/teams`, { method: 'POST', body: JSON.stringify(data) }); }
export function updateTeam(slug, data) { return apiFetch(`${BASE_URL}/teams/${slug}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteTeam(slug) { return apiFetch(`${BASE_URL}/teams/${slug}`, { method: 'DELETE' }); }

// ── Main Page ──
export function getMainPage() { return apiFetch(`${BASE_URL}/main-page`); }
export function updateMainPage(data) { return apiFetch(`${BASE_URL}/main-page`, { method: 'PUT', body: JSON.stringify(data) }); }

// ── Contact Settings ──
export function getContactSettings() { return apiFetch(`${BASE_URL}/contact/settings`); }
export function updateContactSettings(data) { return apiFetch(`${BASE_URL}/contact/settings`, { method: 'PUT', body: JSON.stringify(data) }); }

// ── National Records (Data) ──
export function getNationalRecords() { return apiFetch(`${BASE_URL}/national-records`); }
export function createNationalRecord(data) { return apiFetch(`${BASE_URL}/national-records`, { method: 'POST', body: JSON.stringify(data) }); }
export function updateNationalRecord(id, data) { return apiFetch(`${BASE_URL}/national-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteNationalRecord(id) { return apiFetch(`${BASE_URL}/national-records/${id}`, { method: 'DELETE' }); }

// ── National Records (Page Settings) ──
export function getRecordsPage() { return apiFetch(`${BASE_URL}/records-page`); }
export function updateRecordsPage(data) { return apiFetch(`${BASE_URL}/records-page`, { method: 'PUT', body: JSON.stringify(data) }); }
export function createNationalRecord(data) { return apiFetch(`${BASE_URL}/national-records`, { method: 'POST', body: JSON.stringify(data) }); }
export function updateNationalRecord(id, data) { return apiFetch(`${BASE_URL}/national-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteNationalRecord(id) { return apiFetch(`${BASE_URL}/national-records/${id}`, { method: 'DELETE' }); }

// ── Page View Analytics ──
export function getPageViewStats() {
  return apiFetch(`${BASE_URL}/page-views/stats`);
}

// ── Vercel Rebuild ──
export function rebuildSite() {
  return apiFetch(`${BASE_URL}/rebuild`, { method: 'POST' });
}
