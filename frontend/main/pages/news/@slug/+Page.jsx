import { useData } from 'vike-react/useData';
import NewsCard from '../../../src/components/NewsCard';
import RecommendationCard from '../../../src/components/RecommendationCard';
import Seo from '../../../src/components/Seo';
import { articleSchema, articleDescription } from '../../../src/utils/jsonLd';

export { Page };

function renderFormattedText(text) {
  if (!text) return null;
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'image', alt: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  if (parts.length === 0) return null;

  return parts.map((part, i) => {
    if (part.type === 'image') {
      return (
        <div className="inline-image" key={i}>
          <img src={part.url} alt={part.alt || 'Article image'} loading="lazy" />
          {part.alt && <span className="inline-image-caption">{part.alt}</span>}
        </div>
      );
    }

    const elements = [];
    const sizeRegex = /\[s([1-4])\](.*?)\[\/s\1\]/gs;
    let remaining = part.value;
    let lastIdx = 0;
    let sizeMatch;

    while ((sizeMatch = sizeRegex.exec(remaining)) !== null) {
      if (sizeMatch.index > lastIdx) {
        elements.push(renderInlineText(remaining.slice(lastIdx, sizeMatch.index)));
      }
      const content = sizeMatch[2];
      elements.push(
        <span className={`font-size-${parseInt(sizeMatch[1])}`} key={`s${i}-${sizeMatch.index}`}>
          {renderInlineText(content)}
        </span>
      );
      lastIdx = sizeMatch.index + sizeMatch[0].length;
    }
    if (lastIdx < remaining.length) {
      elements.push(renderInlineText(remaining.slice(lastIdx)));
    }

    return <span key={i}>{elements}</span>;
  });
}

function renderLink(url, label, key) {
  const external = /^https?:\/\//i.test(url);
  return external ? (
    <a key={key} href={url} target="_blank" rel="noopener noreferrer">{label}</a>
  ) : (
    <a key={key} href={url}>{label}</a>
  );
}

function renderInlineText(text) {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|https?:\/\/[^\s<>()[\]]+)/g);
  return parts.map((tp, j) => {
    if (!tp) return null;
    const linkMatch = tp.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (linkMatch) {
      return renderLink(linkMatch[2], linkMatch[1], j);
    }
    if (/^https?:\/\//i.test(tp)) {
      const url = tp.replace(/[.,;:!?)\]]+$/, '');
      const trailing = tp.slice(url.length);
      if (!trailing) return renderLink(tp, tp, j);
      return (
        <span key={j}>
          {renderLink(url, url)}
          {trailing}
        </span>
      );
    }
    if (tp.startsWith('**') && tp.endsWith('**')) {
      return <strong key={j}>{tp.slice(2, -2)}</strong>;
    }
    if (tp.includes('\n')) {
      const lines = tp.split('\n');
      return lines.map((line, k) => (
        <span key={`${j}-${k}`}>{line}{k < lines.length - 1 && <br/>}</span>
      ));
    }
    return tp;
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function Page() {
  const { article, allArticles, slug } = useData();

  if (!article) {
    return (
      <section className="page-header">
        <div className="container">
          <h1 className="page-title">Story Not Found</h1>
          <p className="page-sub">We couldn't find that article.</p>
          <a href="/news" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Back to News</a>
        </div>
      </section>
    );
  }

  const related = allArticles?.filter((a) => a.slug !== article.slug).slice(0, 3) || [];

  // Meta description: explicit metaDescription → excerpt → first section text →
  // first paragraph. Always cleaned of markdown and truncated to ~155 chars.
  const articleDesc = articleDescription(article, 155);
  // Normalize to ISO-8601 (guarded — some legacy records may lack dates).
  const safeIso = (v) => {
    if (!v) return undefined;
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };
  const publishedIso = safeIso(article.date || article.createdAt);
  const modifiedIso = safeIso(article.updatedAt || article.date || article.createdAt);

  return (
    <>
      <Seo
        title={article.title}
        description={articleDesc}
        keywords={[`sport climbing ${article.tag?.toLowerCase() || 'news'} Pakistan`, ...(article.tags || [])].filter(Boolean).join(', ')}
        ogImage={article.ogImage || article.imageUrl}
        ogImageAlt={article.title}
        ogType="article"
        path={`/news/${slug}`}
        jsonLd={articleSchema(article)}
        articlePublishedTime={publishedIso}
        articleModifiedTime={modifiedIso}
        articleSection={article.tag}
        articleTags={article.tags}
      />

      <article className="article">
        <div className="container article-container">
          <span className="tag">{article.tag}</span>
          <h1 className="article-title">{article.title}</h1>
          <p className="article-meta">
            <time dateTime={article.date || article.createdAt}>
              {formatDate(article.date)}
            </time>
          </p>
          {article.imageUrl ? (
            <div className="article-media">
              <img src={article.imageUrl} alt={article.title} style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: article.imagePosition || '50% 50%',
              }} />
            </div>
          ) : (
            <div className="article-media placeholder-photo" aria-hidden="true"><span>Photo</span></div>
          )}
          <div className="article-body">
            {article.sections?.length > 0 ? (
              article.sections.map((sec, i) => {
                switch (sec.layout) {
                  case 'image-left':
                    return (
                      <div className="section-block section-image-left" key={i}>
                        {sec.heading && <h3 className="section-heading">{sec.heading}</h3>}
                        {sec.imageUrl && (
                          <div className="section-image-wrap">
                            <img src={sec.imageUrl} alt="" loading="lazy" />
                          </div>
                        )}
                        <div className="section-text-wrap">
                          <p>{renderFormattedText(sec.text)}</p>
                        </div>
                      </div>
                    );
                  case 'image-center':
                    return (
                      <div className="section-block section-image-center" key={i}>
                        {sec.heading && <h3 className="section-heading">{sec.heading}</h3>}
                        {sec.imageUrl && (
                          <div className="section-image-wrap-center">
                            <img src={sec.imageUrl} alt="" loading="lazy" />
                          </div>
                        )}
                        <p>{renderFormattedText(sec.text)}</p>
                      </div>
                    );
                  case 'table':
                    return (
                      <div className="section-block" key={i}>
                        {sec.heading && <h3 className="section-heading">{sec.heading}</h3>}
                        {sec.tableHeaders?.length > 0 && (
                          <div className="rankings-table-wrap">
                            <table className="rankings-table">
                              <thead>
                                <tr>
                                  {sec.tableHeaders.map((h, ci) => (
                                    <th key={ci}>{h || `Column ${ci + 1}`}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sec.tableRows?.map((row, ri) => (
                                  <tr key={ri}>
                                    {row.map((cell, ci) => (
                                      <td key={ci}>{cell || '—'}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  default:
                    return (
                      <div className="section-block" key={i}>
                        {sec.heading && <h3 className="section-heading">{sec.heading}</h3>}
                        <p>{renderFormattedText(sec.text)}</p>
                      </div>
                    );
                }
              })
            ) : (
              article.body?.map((paragraph, i) => (
                <p key={i}>{renderFormattedText(paragraph)}</p>
              ))
            )}
          </div>
        </div>
      </article>

      {/* ── Recommendations ── */}
      {article.recommendations?.length > 0 ? (
        <section className="section-tight recommendations">
          <div className="container">
            <div className="section-head">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-lg)', color: 'var(--cp-white)', textTransform: 'uppercase' }}>
                Recommended Reading
              </h2>
            </div>
            <div className="recommendations-grid">
              {article.recommendations.map((rec, i) => (
                <RecommendationCard recommendation={rec} key={i} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="section-tight related">
          <div className="container">
            <div className="section-head">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-lg)', color: 'var(--cp-white)', textTransform: 'uppercase' }}>
                More Stories
              </h2>
            </div>
            <div className="news-grid">
              {related.map((a) => (
                <NewsCard article={a} key={a.slug} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
