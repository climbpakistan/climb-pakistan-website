import { useData } from 'vike-react/useData';
import Seo from '../../../src/components/Seo';
import { learnSectionSchema } from '../../../src/utils/jsonLd';

export { Page };

function renderFormattedText(text) {
  if (!text) return null;
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    parts.push({ type: 'image', alt: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
  if (parts.length === 0) return null;

  return parts.map((part, i) => {
    if (part.type === 'image') {
      return (
        <div className="inline-image" key={i}>
          <img src={part.url} alt={part.alt || 'Image'} loading="lazy" />
          {part.alt && <span className="inline-image-caption">{part.alt}</span>}
        </div>
      );
    }
    const textParts = part.value.split(/(\*\*[^*]+\*\*)/g);
    return <span key={i}>{textParts.map((tp, j) => {
      if (tp.startsWith('**') && tp.endsWith('**')) return <strong key={j}>{tp.slice(2, -2)}</strong>;
      if (tp.includes('\n')) {
        return tp.split('\n').map((line, k) => <span key={`${j}-${k}`}>{line}{k < tp.split('\n').length - 1 && <br/>}</span>);
      }
      return tp;
    })}</span>;
  });
}

function Page() {
  const { section, slug } = useData();

  if (!section) {
    return (
      <section className="page-header">
        <div className="container">
          <h1 className="page-title">Guide Not Found</h1>
          <p className="page-sub">We couldn't find that guide.</p>
          <a href="/learn" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Back to Guides</a>
        </div>
      </section>
    );
  }

  return (
    <>
      <Seo
        title={section.title}
        description={section.subtitle || section.body?.slice(0, 160) || `A guide to ${section.title} for climbers in Pakistan.`}
        keywords={[section.title, 'learn climbing Pakistan', 'climbing guide Pakistan', 'sport climbing tutorial', ...(section.tags || [])].filter(Boolean).join(', ')}
        ogImage={section.image}
        ogType="article"
        path={`/learn/${slug}`}
        jsonLd={learnSectionSchema(section)}
      />

      <article className="article">
        <div className="container article-container">
          <a href="/learn" className="learn-article-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back to guides
          </a>

          {section.subtitle && <span className="learn-card-subtitle" style={{ marginBottom: 'var(--sp-2)' }}>{section.subtitle}</span>}
          <h1 className="article-title">{section.title}</h1>

          {section.image ? (
            <div className="learn-article-media">
              <img src={section.image} alt={section.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: section.imagePosition || '50% 50%' }} />
            </div>
          ) : (
            <div className="learn-article-media">
              <div className="learn-article-media-gradient">
                <span className="learn-card-img-label">{section.title}</span>
              </div>
            </div>
          )}

          <div className="learn-article-body">
            {section.lead && <p className="learn-article-lead">{section.lead}</p>}
            {section.sections?.length > 0 ? (
              section.sections.map((sec, i) => {
                switch (sec.layout) {
                  case 'image-left':
                    return (
                      <div className="section-block section-image-left" key={i}>
                        {sec.heading && <h3 className="section-heading">{sec.heading}</h3>}
                        {sec.imageUrl && <div className="section-image-wrap"><img src={sec.imageUrl} alt="" loading="lazy" /></div>}
                        <div className="section-text-wrap"><p>{renderFormattedText(sec.text)}</p></div>
                      </div>
                    );
                  case 'image-center':
                    return (
                      <div className="section-block section-image-center" key={i}>
                        {sec.heading && <h3 className="section-heading">{sec.heading}</h3>}
                        {sec.imageUrl && <div className="section-image-wrap-center"><img src={sec.imageUrl} alt="" loading="lazy" /></div>}
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
              <p>{renderFormattedText(section.body)}</p>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
