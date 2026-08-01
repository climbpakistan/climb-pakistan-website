import { useData } from 'vike-react/useData';
import { AnimatedSection } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';
import { aboutSchema } from '../../src/utils/jsonLd';

export { Page };

function Page() {
  const { content } = useData();

  const sections = content?.sections?.length ? content.sections : null;

  const aboutDesc = sections
    ? (sections[0]?.paragraphs?.[0] || '').slice(0, 160)
    : content?.mission
      ? content.mission.slice(0, 160)
      : "The story behind Pakistan's sport climbing platform — Climb Pakistan.";

  return (
    <>
      <Seo
        title="About"
        description={aboutDesc}
        keywords="about Climb Pakistan, Pakistan sport climbing platform, Pakistan climbing magazine, sport climbing community Pakistan, climbing development Pakistan, Pakistan climbing news, climbing coverage Pakistan, Pakistani sport climbers"
        path="/about"
        jsonLd={aboutSchema(content)}
      />

      <section className="page-header page-header--enhanced">
        <div className="page-header-bg-grid"></div>
        <div className="page-header-glow"></div>
        <div className="container">
          <div className="hero-entrance">
            <span className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>About</span>
            <h1 className="page-title">Climb Pakistan</h1>
            <p className="page-sub">Pakistan's sport climbing magazine and digital platform.</p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container about-container">
          {sections ? (
            sections.map((section, i) => (
              <div key={i} className="about-section">
                {section.heading ? <h2 className="detail-heading">{section.heading}</h2> : null}
                {(section.paragraphs || []).map((p, j) => (
                  <p key={j} className="detail-text">{p}</p>
                ))}
                {section.listItems?.length > 0 && (
                  <ul className="about-list">
                    {section.listItems.map((item, k) => (
                      <li key={k}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          ) : (
            <>
              <p className="about-lead">{content?.intro || ''}</p>
              <h2 className="detail-heading">Our Mission</h2>
              <p className="detail-text">{content?.mission || ''}</p>
            </>
          )}
          {content?.closing ? <p className="detail-text about-closing">{content.closing}</p> : null}
          <a href="/contact" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Get in Touch</a>
        </div>
      </AnimatedSection>
    </>
  );
}
