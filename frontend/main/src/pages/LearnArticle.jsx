import { useParams, Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { getLearnSection } from '../api';

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

export default function LearnArticle() {
  const { slug } = useParams();
  const { data: section, loading } = useFetch(() => getLearnSection(slug), [slug]);

  if (loading) {
    return (
      <section className="section">
        <div className="container" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--cp-text-muted)' }}>Loading guide...</p>
        </div>
      </section>
    );
  }

  if (!section) {
    return (
      <section className="section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="page-title">Article not found</h1>
          <p className="page-sub" style={{ marginBottom: 'var(--sp-6)' }}>
            This guide doesn&apos;t exist yet.
          </p>
          <Link to="/learn" className="btn btn-primary">
            Back to guides
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Header */}
      <section className="page-header page-header--enhanced">
        <div className="page-header-bg-grid" />
        <div className="page-header-glow" />
        <div className="container">
          <Link to="/learn" className="learn-article-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to guides
          </Link>
          <h1 className="page-title">{section.title}</h1>
          {section.subtitle && (
            <p className="page-sub">{section.subtitle}</p>
          )}
        </div>
      </section>

      {/* Hero image */}
      <section className="section-tight" style={{ paddingTop: 'var(--sp-12)' }}>
        <div className="container">
          <div className="learn-article-media">
            {section.image ? (
              <img src={section.image} alt={section.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="learn-article-media-gradient">
                <span className="learn-card-img-label">
                  {section.title}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Body paragraphs */}
      <section className="section-tight" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="learn-article-body">
            <p className="learn-article-lead">{renderFormattedText(section.body)}</p>
            {section.details?.map((para, i) => (
              <p key={i}>{renderFormattedText(para)}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery at the bottom — only shows if there are actual images */}
      {section.gallery?.filter((item) => item.imageUrl?.trim()).length > 0 && (
        <section className="section-tight" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="learn-gallery-heading">
              <span className="eyebrow">Visual guide</span>
              <h2>Understanding the concepts</h2>
            </div>
            <div className="learn-gallery">
              {section.gallery.filter((item) => item.imageUrl?.trim()).map((item, i) => (
                <div className="learn-gallery-card" key={i}>
                  <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="learn-gallery-media" style={{ display: 'block' }}>
                    <img src={item.imageUrl} alt={item.label || item.caption || 'Gallery image'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </a>
                  {item.caption && <p className="learn-gallery-caption">{item.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Navigation back */}
      <section className="section-tight" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="learn-article-footer">
            <Link to="/learn" className="btn btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              All guides
            </Link>
            <Link to="/rankings" className="btn btn-primary">
              View rankings
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
