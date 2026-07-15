import { Link, useParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { getNews } from '../api';
import NewsCard from '../components/NewsCard';

function renderFormattedText(text) {
  if (!text) return null;
  // Convert **text** to <strong>text</strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Handle line breaks within text
    if (part.includes('\n')) {
      const lines = part.split('\n');
      return lines.map((line, j) => (
        <span key={`${i}-${j}`}>{line}{j < lines.length - 1 && <br/>}</span>
      ));
    }
    return part;
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
