import { Link, useParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { getNews } from '../api';
import NewsCard from '../components/NewsCard';
import Seo from '../components/Seo';
import { articleSchema } from '../utils/jsonLd';

function renderFormattedText(text) {
  if (!text) return null;

  // First pass: extract images
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

    // Parse [s1][/s1] through [s4][/s4] and **bold**
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
      const size = parseInt(sizeMatch[1]);
      elements.push(
        <span className={`font-size-${size}`} key={`s${i}-${sizeMatch.index}`}>
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

// Helper: renders text with **bold** and line breaks (no size tags)
function renderInlineText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((tp, j) => {
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

export default function Article() {
  const { slug } = useParams();
  const { data: allArticles, loading } = useFetch(getNews, []);

  if (loading) {
    return (
      <section className="page-header">
        <div className="container">
          <p style={{ color: 'var(--cp-text-muted)' }}>Loading article...</p>
        </div>
      </section>
    );
  }

  const article = allArticles?.find((a) => a.slug === slug);

  if (!article) {
    return (
      <section className="page-header">
        <div className="container">
          <h1 className="page-title">Story Not Found</h1>
          <p className="page-sub">We couldn't find that article.</p>
          <Link to="/news" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Back to News</Link>
        </div>
      </section>
    );
  }

  const related = allArticles?.filter((a) => a.slug !== article.slug).slice(0, 3) || [];

  const articleDesc = article.body?.[0]
    ? article.body[0].replace(/<[^>]*>/g, '').slice(0, 160)
    : article.sections?.[0]?.text?.replace(/<[^>]*>/g, '').slice(0, 160) || '';

  return (
    <>
      <Seo
        title={article.title}
        description={articleDesc}
        ogImage={article.imageUrl}
        ogType="article"
        path={`/news/${slug}`}
        jsonLd={articleSchema(article)}
      />

      <article className="article">
        <div className="container article-container">
          <span className="tag">{article.tag}</span>
          <h1 className="article-title">{article.title}</h1>
          <p className="article-meta">{formatDate(article.date)}</p>
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
              // New section-based format
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
              // Legacy format: body array of paragraphs
              article.body?.map((paragraph, i) => (
                <p key={i}>{renderFormattedText(paragraph)}</p>
              ))
            )}
          </div>
        </div>
      </article>

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
    </>
  );
}
