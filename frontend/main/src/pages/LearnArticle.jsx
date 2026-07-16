import { useParams, Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { getLearnSection } from '../api';

function renderInlineContent(text) {
  // Parse inline formatting: **bold**, [s1]..[/s4] font sizes, images, line breaks
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

    // Parse [s1][/s1] through [s4][/s4] and **bold** within text
    const sizeRegex = /\[s([1-4])\](.*?)\[\/s\1\]/gs;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const elements = [];
    let remaining = part.value;
    let lastIdx = 0;
    let sizeMatch;

    while ((sizeMatch = sizeRegex.exec(remaining)) !== null) {
      // Push text before this size tag (parse bold within it)
      if (sizeMatch.index > lastIdx) {
        const before = remaining.slice(lastIdx, sizeMatch.index);
        elements.push(renderInlineText(before));
      }
      // Render the sized content (also supports bold inside)
      const content = sizeMatch[2];
      const size = parseInt(sizeMatch[1]);
      elements.push(
        <span className={`font-size-${size}`} key={`s${i}-${sizeMatch.index}`}>
          {renderInlineText(content)}
        </span>
      );
      lastIdx = sizeMatch.index + sizeMatch[0].length;
    }
    // Push remaining text after last size tag
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

function renderBodyParagraphs(body, details) {
  // If there are legacy details, render old format
  if (details?.length) {
    return (
      <>
        <p className="learn-article-lead">{renderInlineContent(body)}</p>
        {details.map((para, i) => (
          <p key={i}>{renderInlineContent(para)}</p>
        ))}
      </>
    );
  }

  // New format: split body by blank lines into paragraphs
  const paragraphs = (body || '').split(/\n{2,}/).filter((p) => p.trim());
  return paragraphs.map((para, i) => (
    <p key={i}>{renderInlineContent(para.trim())}</p>
  ));
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
              <img src={section.image} alt={section.title} style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: section.imagePosition || '50% 50%',
              }} />
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

      {/* Body paragraphs — structured sections */}
      <section className="section-tight" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="learn-article-body">
            {section.sections?.length > 0 ? (
              // New section-based format
              section.sections.map((sec, i) => {
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
                          <p>{renderInlineContent(sec.text)}</p>
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
                        <p>{renderInlineContent(sec.text)}</p>
                      </div>
                    );
                  default:
                    return (
                      <div className="section-block" key={i}>
                        {sec.heading && <h3 className="section-heading">{sec.heading}</h3>}
                        <p>{renderInlineContent(sec.text)}</p>
                      </div>
                    );
                }
              })
            ) : (
              // Legacy format (body + details)
              renderBodyParagraphs(section.body, section.details)
            )}
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
