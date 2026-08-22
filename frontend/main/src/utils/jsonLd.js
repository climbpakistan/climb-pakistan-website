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
    logo: `${BASE_URL}/logo.svg`,
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
 * Strip markdown / editor markup out of a content string so it reads as
 * plain prose for descriptions and structured data.
 *
 * Handles: ![alt](url) images, [label](url) links, **bold**, [s1]..[/s1]
 * size spans, bare links, raw HTML, repeated whitespace.
 */
export function cleanText(text) {
  if (!text) return '';
  return String(text)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')          // markdown images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')        // markdown links → label
    .replace(/\[\/?s[1-4]\]/g, ' ')                 // size-markup tags
    .replace(/\*\*([^*]+)\*\*/g, '$1')              // bold markers
    .replace(/https?:\/\/[^\s<>()[\]]+/g, ' ')      // bare URLs
    .replace(/<[^>]*>/g, ' ')                       // raw HTML tags
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncate a string to roughly `max` characters, cutting on a word boundary
 * and appending an ellipsis when truncated.
 */
export function truncate(text, max = 155) {
  const clean = cleanText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : clean.slice(0, max)).replace(/[,\s]+$/, '')}…`;
}

/**
 * Build a description for an article (meta description + structured data).
 * Priority: explicit metaDescription → excerpt → first section text → first
 * paragraph. Always cleaned and truncated.
 */
export function articleDescription(article, max = 155) {
  if (!article) return '';
  const candidates = [
    article.metaDescription,
    article.excerpt,
    article.sections?.find((s) => s.text)?.text,
    article.body?.[0],
  ];
  for (const c of candidates) {
    if (cleanText(c)) return truncate(c, max);
  }
  return '';
}

/**
 * BreadcrumbList schema — generated from current path segments.
 * Example: /news/some-article → [Home, News, Some Article]
 * Pass `lastLabel` (e.g. the article title) to override the last crumb's
 * name instead of the slug-derived fallback.
 */
export function breadcrumbSchema(pathname, lastLabel) {
  if (!pathname || pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [{ name: 'Home', url: BASE_URL }];

  let accumulated = '';
  segments.forEach((seg, i) => {
    accumulated += `/${seg}`;
    const isLast = i === segments.length - 1;
    let name;
    if (isLast && lastLabel) {
      name = lastLabel;
    } else {
      name = seg
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    crumbs.push({
      name,
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
 * Safely convert a raw date value (string or Date) to a W3C ISO-8601 string.
 * Returns undefined for invalid/empty input so structured data stays clean.
 */
function isoDate(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * NewsArticle schema — for individual news articles.
 * Follows Google's NewsArticle guidelines: proper ImageObject, keywords,
 * articleSection, dates, and accessibility/free access hints.
 */
export function articleSchema(article) {
  if (!article) return null;

  const headline = article.title;
  const desc = articleDescription(article, 300);
  const published = isoDate(article.date || article.createdAt);
  const modified = isoDate(article.updatedAt || article.date || article.createdAt);

  // Word count from all textual content (used for accurate indexing)
  let wordCount = 0;
  const textCandidates = [
    article.excerpt,
    ...(article.sections?.map((s) => `${s.heading || ''} ${s.text || ''}`) || []),
    ...(article.body || []),
  ];
  for (const t of textCandidates) {
    if (t) wordCount += cleanText(t).split(/\s+/).filter(Boolean).length;
  }

  // Helper for generating a properly-shaped image value.
  const makeImage = (url) => (url
    ? { '@type': 'ImageObject', url, width: 1200, height: 630 }
    : `${BASE_URL}/og-default.png`);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': `${BASE_URL}/news/${article.slug}`,
    headline,
    url: `${BASE_URL}/news/${article.slug}`,
    description: desc,
    image: makeImage(article.imageUrl),
    thumbnailUrl: article.imageUrl || undefined,
    datePublished: published,
    dateModified: modified,
    articleSection: article.tag || undefined,
    inLanguage: 'en',
    wordCount: wordCount || undefined,
    isAccessibleForFree: true,
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
        url: `${BASE_URL}/logo.svg`,
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

  // Clean undefined values so output stays compact and valid.
  Object.keys(schema).forEach((key) => {
    if (schema[key] === undefined) delete schema[key];
  });

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
 * FAQPage schema — for the Learn section ("New to Climbing?").
 * Generates FAQPage structured data from learn section entries,
 * enabling Google to show expandable Q&A rich results in SERP.
 *
 * @param {Array} sections - Array of learn section objects with title, subtitle, body
 * @returns {Object|null} JSON-LD FAQPage schema object
 */
export function learnFAQSchema(sections) {
  if (!sections || sections.length === 0) return null;

  // Clean markdown formatting for clean schema output
  function cleanText(text) {
    if (!text) return '';
    return String(text)
      .replace(/\*\*([^*]+)\*\*/g, '$1')     // **bold** → bold
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // ![alt](url) → alt
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) → text
      .replace(/<[^>]*>/g, '')                    // strip HTML tags
      .replace(/\s+/g, ' ')                       // collapse whitespace
      .trim();
  }

  const mainEntity = sections
    .filter((s) => s.title && (s.body || s.subtitle))
    .map((s) => {
      const answerText = cleanText(s.subtitle || s.body).slice(0, 500);
      if (!answerText) return null;
      return {
        '@type': 'Question',
        name: s.title,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answerText,
        },
      };
    })
    .filter(Boolean);

  if (mainEntity.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

/**
 * AboutPage schema.
 */
export function aboutSchema(content) {
  if (!content) return null;
  const firstParagraph =
    content.sections?.[0]?.paragraphs?.[0] ||
    content.mission ||
    "The story behind Pakistan's sport climbing platform.";
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About — Climb Pakistan',
    description: firstParagraph.slice(0, 300),
  };
  if (content.tags?.length) {
    schema.keywords = content.tags.join(', ');
  }
  return schema;
}

/**
 * Championship Results page schema.
 */
export function resultsSchema(tags) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Championship Results — Climb Pakistan',
    description: 'National sport climbing championship results — Senior Men and Senior Women across Speed, Lead, and Boulder disciplines. Complete podium and final standings from Pakistan\'s premier climbing competitions.',
  };
  if (tags?.length) {
    schema.keywords = tags.join(', ');
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
 * Includes sameAs links to Instagram and IFSC World Climbing for
 * enhanced Google rich results (Knowledge Panel-style).
 */
export function personSchema(athlete) {
  if (!athlete) return null;

  // Build sameAs array from available social / official links
  const sameAs = [];
  if (athlete.instagram) {
    sameAs.push(`https://instagram.com/${athlete.instagram}`);
  }
  if (athlete.worldClimbingUrl) {
    sameAs.push(athlete.worldClimbingUrl);
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: athlete.name,
    description: athlete.about || `${athlete.name} — competitive sport climbing athlete from Pakistan.`,
    url: `${BASE_URL}/athletes/${athlete.slug}`,
    image: athlete.photoUrl || `${BASE_URL}/og-default.png`,
    gender: athlete.gender || undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    affiliation: athlete.team ? {
      '@type': 'SportsTeam',
      name: athlete.team,
    } : undefined,
    award: athlete.medals?.map((m) => `${m.medal} — ${m.competition} (${m.discipline})`) || undefined,
    // Indicate the athlete's main sport discipline
    knowsAbout: athlete.disciplines?.map((d) => ({
      '@type': 'Thing',
      name: d,
    })) || undefined,
  };

  // Clean undefined values
  Object.keys(schema).forEach((key) => {
    if (schema[key] === undefined) delete schema[key];
  });

  return schema;
}
