import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://www.climbpakistan.com';
const SITE_NAME = 'Climb Pakistan';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.svg`;
const TWITTER_HANDLE = '@climb_pakistan';

/**
 * Determine the fully-qualified URL for the current page.
 * Uses path from window.location if available, otherwise falls back to '/'.
 */
function currentUrl(path) {
  const p = path || (typeof window !== 'undefined' ? window.location.pathname : '/');
  return `${BASE_URL}${p}`;
}

/**
 * Seo — injects <title>, <meta>, Open Graph, Twitter Card, canonical URL,
 * and optional JSON-LD structured data into the document <head>.
 *
 * Usage:
 *   <Seo
 *     title="About — Climb Pakistan"
 *     description="Learn about our mission."
 *     ogImage="https://.../photo.jpg"
 *     jsonLd={{ "@type": "Organization", ... }}
 *   />
 */
export default function Seo({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  path,
  noIndex = false,
  jsonLd,
  children,
}) {
  // If title is explicitly set to empty string (for Layout-only structured data),
  // don't render any title at all — let child pages set their own.
  const hasTitle = title !== undefined && title !== '';
  const fullTitle = hasTitle ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Your Source for Climbing in Pakistan`;
  const desc = description || 'Pakistan\'s dedicated sport climbing magazine — news, rankings, athlete profiles and competition coverage from the community pushing the sport forward.';
  const url = currentUrl(path);
  const image = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      {/* ── Primary meta — only render <title> when explicitly provided ── */}
      {hasTitle && <title>{fullTitle}</title>}
      <meta name="description" content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />

      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* ── Open Graph ── */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />

      {/* ── Twitter Card ── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={image} />

      {/* ── JSON-LD ── */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}

      {children}
    </Helmet>
  );
}
