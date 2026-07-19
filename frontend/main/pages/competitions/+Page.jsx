import { useData } from 'vike-react/useData';
import { AnimatedSection, StaggeredGrid } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';

export { Page };

function formatRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { month: 'short', day: 'numeric' };
  if (s.getFullYear() !== e.getFullYear() || s.getMonth() !== e.getMonth()) {
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  }
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`;
}

function Page() {
  const { competitions } = useData();

  return (
    <>
      <Seo
        title="Competitions"
        description="Coverage and results from national championships and sanctioned sport climbing events in Pakistan."
        keywords="climbing competitions Pakistan, sport climbing events Pakistan, Pakistan climbing championships, national climbing competitions Pakistan, speed climbing Pakistan, lead climbing Pakistan, boulder competitions Pakistan"
        path="/competitions"
      />

      <section className="page-header">
        <div className="container">
          <div className="hero-entrance">
            <h1 className="page-title">Competitions</h1>
            <p className="page-sub">Coverage and results from national championships and sanctioned sport climbing events.</p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container">
          <StaggeredGrid className="comp-list" baseDelay={0.05} stepDelay={0.08}>
            {competitions?.length === 0 && (
              <p style={{ color: 'var(--cp-text-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--sp-8)' }}>No competitions yet.</p>
            )}
            {competitions?.map((comp) => (
              <a href={`/competitions/${comp.slug}`} className="comp-list-item" key={comp.slug}>
                {comp.imageUrl ? (
                  <div className="comp-list-media">
                    <img src={comp.imageUrl} alt={comp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div className="comp-list-media placeholder-photo" aria-hidden="true"><span>Photo</span></div>
                )}
                <div className="comp-list-body">
                  <span className={`status-pill status-${comp.status?.toLowerCase()}`}>{comp.status}</span>
                  <h3>{comp.name}</h3>
                  <p className="comp-list-meta">{comp.location}</p>
                  <p className="comp-list-meta">{formatRange(comp.startDate, comp.endDate)}</p>
                  <div className="athlete-card-tags">
                    {comp.disciplines?.map((d) => <span className="tag" key={d}>{d}</span>)}
                  </div>
                </div>
              </a>
            ))}
          </StaggeredGrid>
        </div>
      </AnimatedSection>
    </>
  );
}
