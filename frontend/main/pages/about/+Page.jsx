import { useData } from 'vike-react/useData';
import { AnimatedSection } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';
import { aboutSchema } from '../../src/utils/jsonLd';

export { Page };

function Page() {
  const { content } = useData();

  const stats = content?.stats?.length ? content.stats : null;

  const aboutDesc = content?.intro
    ? content.intro.slice(0, 160)
    : content?.mission
      ? content.mission.slice(0, 160)
      : "The story behind Pakistan's sport climbing platform — Climb Pakistan.";

  return (
    <>
      <Seo
        title="About Climb Pakistan"
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
            <h1 className="page-title">About Climb Pakistan</h1>
            <p className="page-sub">Pakistan's sport climbing magazine and digital platform.</p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container about-container">
          {content?.intro ? <p className="about-lead">{content.intro}</p> : null}

          {content?.mission ? (
            <>
              <h2 className="detail-heading">Our Mission</h2>
              <p className="detail-text">{content.mission}</p>
            </>
          ) : null}

          {stats && (
            <div className="about-stats">
              {stats.map((stat, i) => (
                <div key={i} className="about-stat">
                  <span className="about-stat-value">{stat.value}</span>
                  <span className="about-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          )}

          {content?.closing ? <p className="about-closing">{content.closing}</p> : null}

          <a href="/contact" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Get in Touch</a>
        </div>
      </AnimatedSection>
    </>
  );
}
