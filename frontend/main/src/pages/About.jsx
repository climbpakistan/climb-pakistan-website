import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { getAboutContent } from '../api';
import { AnimatedSection } from '../hooks/animations';
import Seo from '../components/Seo';
import { aboutSchema } from '../utils/jsonLd';

export default function About() {
  const { data: content, loading } = useFetch(getAboutContent, []);

  const aboutDesc = content?.mission
    ? content.mission.slice(0, 160)
    : "The story behind Pakistan's sport climbing platform — Climb Pakistan.";

  return (
    <>
      <Seo
        title="About"
        description={aboutDesc}
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
          {loading ? (
            <p style={{ color: 'var(--cp-text-muted)' }}>Loading...</p>
          ) : (
            <>
              <p className="about-lead">{content?.intro || ''}</p>

              <h2 className="detail-heading">Our Mission</h2>
              <p className="detail-text">{content?.mission || ''}</p>

              <p className="detail-text">{content?.closing || ''}</p>
            </>
          )}

          <Link to="/contact" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Get in Touch</Link>
        </div>
      </AnimatedSection>
    </>
  );
}
