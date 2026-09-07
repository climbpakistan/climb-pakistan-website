// Keep the Render backend instance warm so it never sleeps and starts serving
// bare 502/504 error pages (which lack CORS headers) on the next request.
//
// Usage:
//   node scripts/keepalive.js            # ping every 5 minutes
//   KEEPALIVE_URL=https://... node scripts/keepalive.js
//
// Recommended: instead of running this on your own computer, schedule a free
// external cron (cron-job.org or UptimeRobot) to GET /api/health every 5 min.

const url = process.env.KEEPALIVE_URL || 'https://climb-pakistan-backend.onrender.com/api/health';
const intervalMs = Number(process.env.KEEPALIVE_INTERVAL_MS || 5 * 60 * 1000);

async function ping() {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    console.log(`[keepalive] ${new Date().toISOString()} -> ${res.status}`);
  } catch (err) {
    console.error(`[keepalive] ${new Date().toISOString()} FAILED:`, err.message);
  }
}

console.log(`[keepalive] pinging ${url} every ${Math.round(intervalMs / 1000)}s`);
await ping();
setInterval(ping, intervalMs);