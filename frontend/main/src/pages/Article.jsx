import { Link, useParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { getNews } from '../api';
import NewsCard from '../components/NewsCard';

function renderFormattedText(text) {
  if (!text) return null;
  // Support ![alt](url) syntax for inline images
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    // Push text before this image
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'image', alt: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  // Push remaining text
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
    // Render formatted text (bold + line breaks)
    const textParts = part.value.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {textParts.map((tp, j) => {
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
        })}
      </span>
    );
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

  return (
    <>
      <article className="article">
        <div className="container article-container">
          <span className="tag">{article.tag}</span>
          <h1 className="article-title">{article.title}</h1>
          <p className="article-meta">{formatDate(article.date)}</p>
          {article.imageUrl ? (
            <div className="article-media">
              <img src={article.imageUrl} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div className="article-media placeholder-photo" aria-hidden="true"><span>Photo</span></div>
          )}
          <div className="article-body">
            {article.body?.map((paragraph, i) => (
              <p key={i}>{renderFormattedText(paragraph)}</p>
            ))}
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
