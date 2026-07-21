import { useData } from 'vike-react/useData';
import { AnimatedSection } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';
import { aboutSchema } from '../../src/utils/jsonLd';

export { Page };

function Page() {
  const { content } = useData();

  const aboutDesc = content?.mission
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
            <p className="page-sub">The story behind Pakistan's sport climbing platform.</p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container about-container">
          <p className="about-lead">{content?.intro || ''}</p>
          <h2 className="detail-heading">Our Mission</h2>
          <p className="detail-text">{content?.mission || ''}</p>
          <p className="detail-text">{content?.closing || ''}</p>
          <a href="/contact" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Get in Touch</a>
        </div>
      </AnimatedSection>
    </>
  );
}
