/**
 * Triggers a Vercel deployment via a Deploy Hook URL.
 *
 * Set the VERCEL_DEPLOY_HOOK_URL environment variable to the URL
 * generated from Vercel Dashboard → Settings → Git → Deploy Hooks.
 *
 * This function is fire-and-forget – it never throws, so it's safe
 * to call from any route handler without blocking the response.
 */
export async function triggerVercelRebuild() {
  const url = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!url) {
    console.warn('[Rebuild] VERCEL_DEPLOY_HOOK_URL not set — skipping rebuild.');
    return;
  }

  try {
    const res = await fetch(url, { method: 'POST' });
    if (res.ok) {
      console.log('[Rebuild] ✅ Vercel deployment triggered successfully.');
    } else {
      console.warn(`[Rebuild] ⚠️ Vercel responded with ${res.status}`);
    }
  } catch (err) {
    console.warn('[Rebuild] ❌ Failed to trigger Vercel deployment:', err.message);
  }
}
