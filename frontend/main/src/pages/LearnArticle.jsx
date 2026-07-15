import { useParams, Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { getLearnSection } from '../api';

function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.includes('\n')) {
      const lines = part.split('\n');
      return lines.map((line, j) => (
        <span key={`${i}-${j}`}>{line}{j < lines.length - 1 && <br/>}</span>
      ));
    }
    return part;
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
