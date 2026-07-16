import { Link } from 'react-router-dom';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function NewsCard({ article }) {
  return (
    <article className="news-card">
      <Link to={`/news/${article.slug}`} className="news-card-media placeholder-photo" aria-hidden="true">
        {article.imageUrl ? (
          <img src={article.imageUrl} alt={article.title} style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: article.imagePosition || '50% 50%',
            position: 'absolute',
            inset: 0,
          }} />
        ) : (
          <span>Photo</span>
        )}
      </Link>
      <div className="news-card-body">
        <span className="tag">{article.tag}</span>
        <h3><Link to={`/news/${article.slug}`}>{article.title}</Link></h3>
        <p>{renderFormattedText(article.excerpt)}</p>
        <span className="news-card-date">{formatDate(article.date)}</span>
      </div>
    </article>
  );
}
