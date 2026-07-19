const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function data() {
  const [records, pageSettings] = await Promise.all([
    fetchJSON(`${API_BASE}/national-records`).catch(() => ({})),
    fetchJSON(`${API_BASE}/records-page`).catch(() => ({})),
  ]);
  return { records, pageSettings };
}

export { data };
