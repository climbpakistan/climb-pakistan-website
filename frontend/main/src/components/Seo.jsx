import { Head } from 'vike-react/Head';

const BASE_URL = 'https://www.climbpakistan.com';
const SITE_NAME = 'Climb Pakistan';
// Note: must be a raster format (PNG/JPG) — WhatsApp & most social platforms
// ignore SVG og:image files and will show no link preview thumbnail.
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;
const TWITTER_HANDLE = '@climb_pakistan';

/**
 * Make an image URL fully-qualified. Search engines and social platforms
 * ignore relative og:image paths, so bake in the site origin.
 */
function absoluteUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

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
 * Uses vike-react/Head for proper Vike SSG support.
 *
 * Usage:
 *   <Seo
 *     title="About — Climb Pakistan"
 *     description="Learn about our mission."
 *     ogImage="https://.../photo.jpg"
 *     jsonLd={{ "@type": "Organization", ... }}
 *   />
 *
 * `structuredDataOnly` renders ONLY the JSON-LD + children (no title/meta/
 * canonical/OG). The Layout uses this so its global structured data never
 * collides with page-level metadata.
 */
export default function Seo({
  title,
  description,
  keywords,
  ogImage,
  ogImageAlt,
  ogType = 'website',
  path,
  noIndex = false,
  jsonLd,
  structuredDataOnly = false,
  articleSection,
  articleTags,
  articlePublishedTime,
  articleModifiedTime,
  children,
}) {
  if (structuredDataOnly) {
    return (
      <Head>
        {jsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
        {children}
      </Head>
    );
  }

  // If title is explicitly set to empty string, don't render any title at all —
  // let child pages set their own.
  const hasTitle = title !== undefined && title !== '';
  const fullTitle = hasTitle ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Your Source for Sport Climbing in Pakistan`;
  const desc = description || 'Pakistan\'s #1 dedicated sport climbing platform — competition results, national rankings, athlete profiles, speed climbing records, climbing gyms, and comprehensive coverage of the growing sport climbing community in Pakistan.';
  const url = currentUrl(path);
  const image = absoluteUrl(ogImage || DEFAULT_OG_IMAGE);

  return (
    <Head>
      {/* ── Primary meta — only render <title> when explicitly provided ── */}
      {hasTitle && <title>{fullTitle}</title>}
      <meta name="description" content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow,max-image-preview:large" />
      )}
      <link rel="canonical" href={url} />

      {/* ── Open Graph ── */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {ogImageAlt && <meta property="og:image:alt" content={ogImageAlt} />}
      <meta property="og:locale" content="en_US" />

      {/* ── Article-specific OG tags ── */}
      {ogType === 'article' && articlePublishedTime && (
        <meta property="article:published_time" content={articlePublishedTime} />
      )}
      {ogType === 'article' && articleModifiedTime && (
        <meta property="article:modified_time" content={articleModifiedTime} />
      )}
      {ogType === 'article' && articleSection && (
        <meta property="article:section" content={articleSection} />
      )}
      {ogType === 'article' && articleTags?.map((t) => (
        <meta property="article:tag" content={t} key={t} />
      ))}

      {/* ── Twitter Card ── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={image} />
      {ogImageAlt && <meta name="twitter:image:alt" content={ogImageAlt} />}

      {/* ── JSON-LD ── */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}

      {children}
    </Head>
  );
}
