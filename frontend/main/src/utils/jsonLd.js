const BASE_URL = 'https://www.climbpakistan.com';

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
    sport: ['Sport Climbing', 'Speed Climbing', 'Lead Climbing', 'Bouldering', 'Competition Climbing'],
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
    description: "Pakistan's source for sport climbing — news, rankings, athlete profiles, and competition coverage.",
    sport: ['Sport Climbing', 'Speed Climbing', 'Lead Climbing', 'Bouldering', 'Competition Climbing'],
    about: {
      '@type': 'Thing',
      name: 'Sport Climbing in Pakistan',
      additionalType: 'https://en.wikipedia.org/wiki/Sport_climbing',
    },
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
  const schema = {
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
  if (article.tags?.length) {
    schema.keywords = article.tags.join(', ');
  }
  return schema;
}

/**
 * Competition schema — for individual competition pages.
 */
export function competitionSchema(competition) {
  if (!competition) return null;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: competition.name,
    description: competition.overview?.replace(/<[^>]*>/g, '').slice(0, 300) || `${competition.name} — sport climbing competition in Pakistan.`,
    location: competition.location ? {
      '@type': 'Place',
      name: competition.location,
    } : undefined,
    startDate: competition.startDate || undefined,
    endDate: competition.endDate || undefined,
    url: `${BASE_URL}/competitions/${competition.slug}`,
    image: competition.imageUrl || `${BASE_URL}/og-default.png`,
  };
  if (competition.tags?.length) {
    schema.keywords = competition.tags.join(', ');
  }
  if (competition.disciplines?.length) {
    schema.sport = competition.disciplines.map((d) => d.replace(' Climbing', '') + ' Climbing');
  }
  // Clean undefined values
  Object.keys(schema).forEach((key) => {
    if (schema[key] === undefined) delete schema[key];
  });
  return schema;
}

/**
 * LearnSection schema — for individual learn articles/guides.
 */
export function learnSectionSchema(section) {
  if (!section) return null;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: section.title,
    description: section.subtitle || section.body?.slice(0, 300) || `A guide to ${section.title} for sport climbers in Pakistan.`,
    image: section.image || `${BASE_URL}/og-default.png`,
    datePublished: section.createdAt || undefined,
    dateModified: section.updatedAt || section.createdAt || undefined,
    url: `${BASE_URL}/learn/${section.slug}`,
  };
  if (section.tags?.length) {
    schema.keywords = section.tags.join(', ');
  }
  // Clean undefined values
  Object.keys(schema).forEach((key) => {
    if (schema[key] === undefined) delete schema[key];
  });
  return schema;
}

/**
 * AboutPage schema.
 */
export function aboutSchema(content) {
  if (!content) return null;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About — Climb Pakistan',
    description: content.mission?.slice(0, 300) || "The story behind Pakistan's sport climbing platform.",
  };
  if (content.tags?.length) {
    schema.keywords = content.tags.join(', ');
  }
  return schema;
}

/**
 * Rankings page schema.
 */
export function rankingsSchema(tags) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'National Rankings — Climb Pakistan',
    description: 'Senior men and senior women national rankings by discipline. Track climbing standings across speed, lead, and boulder disciplines.',
  };
  if (tags?.length) {
    schema.keywords = tags.join(', ');
  }
  return schema;
}

/**
 * Records page schema — describes national speed climbing records with
 * Schema.org SportsRecord-compatible structured data for rich search results.
 *
 * @param {{ current: Array, previous: Array, gender: string }} records
 * @param {Object} [settings] - Page settings from the admin panel
 * @param {string[]} [settings.tags]
 * @returns {Object|null} JSON-LD schema object
 */
export function recordsSchema(records, gender = 'Men', settings = {}) {
  const current = records?.[gender]?.current || [];
  const previous = records?.[gender]?.previous || [];
  const allRecords = [...current, ...previous];

  if (allRecords.length === 0) {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'National Records — Climb Pakistan',
      description: `Pakistan national speed climbing records — ${gender.toLowerCase()}'s current records and historical progression.`,
      keywords: 'Pakistan speed climbing records, national records Pakistan climbing, sport climbing records Pakistan, Pakistani climbing athletes',
    };
  }

  // Collect unique athlete names and tags
  const athleteNames = [...new Set(allRecords.map((r) => r.athleteName).filter(Boolean))];
  const recordTags = [...new Set(allRecords.flatMap((r) => r.tags || []))].filter(Boolean);

  // Build sport-specific keywords
  const genderLabel = gender.toLowerCase() === 'women' ? "women's" : "men's";
  const keywords = [
    `Pakistan ${genderLabel} speed climbing records`,
    `fastest climber Pakistan ${genderLabel}`,
    `Pakistan national record speed climbing`,
    `climbing record Pakistan ${genderLabel}`,
    ...athleteNames.map((n) => `${n} climbing record`),
    ...athleteNames.map((n) => `${n} Pakistan climber`),
    ...recordTags,
    'Pakistan sport climbing records list',
    'sport climbing Pakistan records',
    'speed climbing national record Pakistan',
  ].join(', ');

  // Build record list for schema
  const recordItems = allRecords.map((rec, i) => ({
    '@type': 'SportsRecord',
    name: rec.athleteName
      ? `${rec.athleteName} — ${rec.recordTime} seconds (${gender}’s Speed Climbing)`
      : `${rec.recordTime} seconds (${gender}’s Speed Climbing)`,
    description: rec.competition
      ? `${gender}’s speed climbing record of ${rec.recordTime} seconds set by ${rec.athleteName} at ${rec.competition}${rec.venue ? `, ${rec.venue}` : ''}.`
      : `${gender}’s speed climbing record of ${rec.recordTime} seconds set by ${rec.athleteName}.`,
    dateCreated: rec.date || undefined,
    location: rec.venue ? { '@type': 'Place', name: rec.venue } : undefined,
    recordedBy: rec.athleteName ? { '@type': 'Person', name: rec.athleteName } : undefined,
    identifier: rec._id || `record-${i}`,
  }));

  // Clean undefined values
  recordItems.forEach((item) => {
    Object.keys(item).forEach((key) => {
      if (item[key] === undefined) delete item[key];
    });
  });

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${BASE_URL}/records`,
        name: `National Records — ${gender}’s Speed Climbing — Climb Pakistan`,
        description: athleteNames.length > 0
          ? `Pakistan national speed climbing records — ${gender.toLowerCase()}’s records held by ${athleteNames.join(', ')}. Track the fastest climbing times in Pakistan.`
          : `Pakistan national speed climbing records — ${gender.toLowerCase()}’s current records and historical progression.`,
        keywords,
        about: {
          '@type': 'Thing',
          name: 'Sport Climbing Records',
          additionalType: 'https://en.wikipedia.org/wiki/Speed_climbing',
        },
      },
      {
        '@type': 'SportsOrganization',
        name: 'Climb Pakistan',
        url: 'https://www.climbpakistan.com',
        sport: ['Sport Climbing', 'Speed Climbing', 'Lead Climbing', 'Bouldering', 'Competition Climbing'],
      },
      ...recordItems,
    ],
  };

  if (settings.tags?.length) {
    schema['@graph'][0].keywords += ', ' + settings.tags.join(', ');
  }

  return schema;
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
    description: athlete.about || `${athlete.name} — competitive sport climbing athlete from Pakistan.`,
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
