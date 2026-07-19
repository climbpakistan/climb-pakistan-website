const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function data() {
  const records = await fetchJSON(`${API_BASE}/national-records`).catch(() => ({}));
  return { records };
}

export { data };
