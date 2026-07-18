const BASE_URL = 'https://climbpakistan.com';

/**
 * Organization schema — used on every page via Layout.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Climb Pakistan',
    url: BASE_URL,
    logo: `${BASE_URL}/favicon.png`,
    description: "Pakistan's dedicated sport climbing magazine — news, rankings, athlete profiles and competition coverage.",
    sameAs: [
      'https://www.instagram.com/climb_pakistan/',
    ],
  };
}

/**
 * WebSite schema — used on every page via Layout.
 * Includes SearchAction for potential Google Sitelinks Search Box.
 */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Climb Pakistan',
    url: BASE_URL,
    description: "Your source for climbing in Pakistan.",
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * BreadcrumbList schema — generated from current path segments.
 * Example: /news/some-article → [Home, News, Some Article]
 */
export function breadcrumbSchema(pathname) {
  if (!pathname || pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [{ name: 'Home', url: BASE_URL }];

  let accumulated = '';
  segments.forEach((seg, i) => {
    accumulated += `/${seg}`;
    // Convert slug to human-readable label
    const name = seg
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({
      name: i === segments.length - 1 ? name : name,
      url: `${BASE_URL}${accumulated}`,
    });
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

/**
 * NewsArticle schema — for individual news articles.
 */
export function articleSchema(article) {
  if (!article) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.body?.[0] || article.sections?.[0]?.text || '',
    image: article.imageUrl || `${BASE_URL}/og-default.png`,
    datePublished: article.date || article.createdAt,
    dateModified: article.updatedAt || article.date || article.createdAt,
    author: {
      '@type': 'Organization',
      name: 'Climb Pakistan',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Climb Pakistan',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/favicon.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/news/${article.slug}`,
    },
  };
}

/**
 * Person schema — for athlete profiles.
 */
export function personSchema(athlete) {
  if (!athlete) return null;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: athlete.name,
    description: athlete.about || `${athlete.name} — climbing athlete from Pakistan.`,
    url: `${BASE_URL}/athletes/${athlete.slug}`,
    image: athlete.photoUrl || `${BASE_URL}/og-default.png`,
    gender: athlete.gender || undefined,
    knowsAbout: athlete.disciplines || undefined,
    affiliation: athlete.team ? {
      '@type': 'SportsTeam',
      name: athlete.team,
    } : undefined,
    award: athlete.medals?.map((m) => `${m.medal} — ${m.competition} (${m.discipline})`) || undefined,
  };

  // Clean undefined values
  Object.keys(schema).forEach((key) => {
    if (schema[key] === undefined) delete schema[key];
  });

  return schema;
}
