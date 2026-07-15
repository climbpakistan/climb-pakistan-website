import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { getLearnSections } from '../api';
import { AnimatedSection, StaggeredGrid } from '../hooks/animations';

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

export default function Learn() {
  const { data: sections, loading } = useFetch(getLearnSections, []);

  return (
    <>
      <section className="page-header page-header--enhanced">
        <div className="page-header-bg-grid" />
        <div className="page-header-glow" />
        <div className="container">
          <div className="hero-entrance">
            <h1 className="page-title">New to Climbing?</h1>
            <p className="page-sub">
              Start here. A plain-language introduction to the sport, its disciplines, how
              scoring works, and how to get on the wall yourself.
            </p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container">
          {loading ? (
            <p style={{ color: 'var(--cp-text-muted)', textAlign: 'center', padding: 'var(--sp-8)' }}>Loading guides...</p>
          ) : (
            <StaggeredGrid className="learn-card-grid" baseDelay={0.04} stepDelay={0.07}>
              {sections?.length === 0 && (
                <p style={{ color: 'var(--cp-text-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--sp-8)' }}>No guides available yet.</p>
              )}
              {sections?.map((section, i) => (
                <Link
                  to={`/learn/${section.slug}`}
                  className="learn-card"
                  key={section.slug}
                >
                  <div className="learn-card-media">
                    {section.image ? (
                      <img src={section.image} alt={section.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className="learn-card-img-gradient">
                        <span className="learn-card-img-label">
                          {section.title}
                        </span>
                      </div>
                    )}
                    <span className="learn-card-num">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="learn-card-body">
                    {section.subtitle && (
                      <span className="learn-card-subtitle">{section.subtitle}</span>
                    )}
                    <h3>{section.title}</h3>
                    <p>{renderFormattedText(section.body)}</p>
                    <span className="learn-card-read-more">
                      Read guide
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </StaggeredGrid>
          )}
        </div>
      </AnimatedSection>
    </>
  );
}
