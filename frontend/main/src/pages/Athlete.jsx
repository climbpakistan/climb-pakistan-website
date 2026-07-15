import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { getAthlete } from '../api';
import { AnimatedSection } from '../hooks/animations';
import MedalIcon from '../components/MedalIcon';

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('');
}

const MEDAL_MAP = { Gold: 'gold', Silver: 'silver', Bronze: 'bronze' };

export default function Athlete() {
  const { slug } = useParams();
  const { data: athlete, loading } = useFetch(() => getAthlete(slug), [slug]);

  const [filterDiscipline, setFilterDiscipline] = useState('All');

  const medalDisciplines = useMemo(() => {
    if (!athlete) return [];
    return [...new Set(athlete.medals?.map((m) => m.discipline))];
  }, [athlete]);

  const filteredMedals = useMemo(() => {
    if (!athlete) return [];
    if (filterDiscipline === 'All') return athlete.medals || [];
    return (athlete.medals || []).filter((m) => m.discipline === filterDiscipline);
  }, [athlete, filterDiscipline]);

  const medalCounts = useMemo(() => {
    if (!athlete) return { gold: 0, silver: 0, bronze: 0 };
    const medals = athlete.medals || [];
    return {
      gold: medals.filter((m) => m.medal === 'Gold').length,
      silver: medals.filter((m) => m.medal === 'Silver').length,
      bronze: medals.filter((m) => m.medal === 'Bronze').length,
    };
  }, [athlete]);

  if (loading) {
    return (
      <section className="page-header">
        <div className="container">
          <p style={{ color: 'var(--cp-text-muted)' }}>Loading athlete...</p>
        </div>
      </section>
    );
  }

  if (!athlete) {
    return (
      <section className="page-header">
        <div className="container">
          <h1 className="page-title">Athlete Not Found</h1>
          <p className="page-sub">We couldn't find that athlete profile.</p>
          <Link to="/athletes" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Back to Athletes</Link>
        </div>
      </section>
    );
  }

  const showFilter = medalDisciplines.length > 1;

  // Main discipline = first discipline in athlete's list
  const mainDiscipline = athlete.mainDiscipline || athlete.disciplines?.[0] || '—';

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="athlete-hero">
        <div className="container">
          <div className="athlete-hero-layout">
            <div className="athlete-hero-media hero-entrance" aria-hidden="true">
              {athlete.photoUrl ? (
                <img src={athlete.photoUrl} alt={athlete.name} className="athlete-hero-photo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
              ) : (
                <>
                  <div className="athlete-hero-avatar">{initials(athlete.name)}</div>
                  <span className="athlete-hero-photo-label">Photo</span>
                </>
              )}
            </div>
            <div className="athlete-hero-info hero-entrance hero-entrance-delay-1">
              <h1 className="page-title">{athlete.name}</h1>

              <div className="athlete-hero-stats">
                <div className="hero-stat">
                  <span className="hero-stat-value">{athlete.age || '—'}</span>
                  <span className="hero-stat-label">Age</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-value">{mainDiscipline}</span>
                  <span className="hero-stat-label">Main Discipline</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-value">{athlete.startedClimbing || '—'}</span>
                  <span className="hero-stat-label">Active Since</span>
                </div>
              </div>

              {(athlete.instagram || athlete.worldClimbingUrl) && (
                <div className="athlete-hero-actions">
                  {athlete.instagram && (
                    <a
                      href={`https://instagram.com/${athlete.instagram}`}
                      className="btn-instagram"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                      </svg>
                      @{athlete.instagram}
                    </a>
                  )}
                  {athlete.worldClimbingUrl && (
                    <a
                      href={athlete.worldClimbingUrl}
                      className="btn-world-climbing"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                      World Climbing
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ MAIN CONTENT ============ */}
      <AnimatedSection className="section-tight">
        <div className="container">
          <div className="athlete-detail-grid">
            <div className="athlete-detail-main">
              {/* Discipline filter for medals */}
              {showFilter && (
                <div className="filter-bar" role="tablist" aria-label="Filter medals by discipline">
                  <button
                    className={`filter-chip${filterDiscipline === 'All' ? ' is-active' : ''}`}
                    role="tab"
                    aria-selected={filterDiscipline === 'All'}
                    onClick={() => setFilterDiscipline('All')}
                  >
                    All
                  </button>
                  {medalDisciplines.map((d) => (
                    <button
                      key={d}
                      className={`filter-chip${filterDiscipline === d ? ' is-active' : ''}`}
                      role="tab"
                      aria-selected={filterDiscipline === d}
                      onClick={() => setFilterDiscipline(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Medals */}
              <h2 className="detail-heading">National Championship Medals</h2>

              {filterDiscipline === 'All' && (athlete.medals?.length || 0) > 0 && (
                <div className="medal-summary">
                  {medalCounts.gold > 0 && (
                    <div className="medal-count">
                      <span className="medal-count-icon" aria-hidden="true"><MedalIcon type="gold" size={22} /></span>
                      <span className="medal-count-num">{medalCounts.gold}</span>
                    </div>
                  )}
                  {medalCounts.silver > 0 && (
                    <div className="medal-count">
                      <span className="medal-count-icon" aria-hidden="true"><MedalIcon type="silver" size={22} /></span>
                      <span className="medal-count-num">{medalCounts.silver}</span>
                    </div>
                  )}
                  {medalCounts.bronze > 0 && (
                    <div className="medal-count">
                      <span className="medal-count-icon" aria-hidden="true"><MedalIcon type="bronze" size={22} /></span>
                      <span className="medal-count-num">{medalCounts.bronze}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="medals-display">
                {filteredMedals.length === 0 && (
                  <p style={{ color: 'var(--cp-text-muted)' }}>No medals recorded for this discipline.</p>
                )}
                {filteredMedals.map((m, i) => (
                  <div
                    className="medal-row"
                    key={i}
                    style={{
                      opacity: 0,
                      transform: 'translateY(16px)',
                      animation: `fadeInUp 0.45s ease ${0.15 + i * 0.08}s forwards`,
                    }}
                  >
                    <span className="medal-icon" aria-hidden="true"><MedalIcon type={MEDAL_MAP[m.medal] || 'gold'} size={26} /></span>
                    <div>
                      <p className="medal-competition">{m.competition}</p>
                      <p className="medal-meta">{m.discipline} · {m.medal}</p>
                    </div>
                  </div>
                ))}
              </div>

              {athlete.about && (
                <>
                  <h2 className="detail-heading">About</h2>
                  <p className="detail-text">{athlete.about}</p>
                </>
              )}
            </div>

            <aside className="athlete-detail-side">
              <div className="info-card">
                <h3 className="info-card-title">Quick Facts</h3>
                <dl className="info-list">
                  <div><dt>Gender</dt><dd>{athlete.gender}</dd></div>
                  <div><dt>Hometown</dt><dd>{athlete.hometown || '—'}</dd></div>
                  <div><dt>Team</dt><dd>{athlete.team || '—'}</dd></div>
                  <div><dt>Disciplines</dt><dd>{athlete.disciplines?.join(', ') || '—'}</dd></div>
                  <div><dt>International Participation</dt><dd>{athlete.internationalParticipation ?? '0'}</dd></div>
                  {athlete.instagram && (
                    <div><dt>Instagram</dt><dd><a href={`https://instagram.com/${athlete.instagram}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cp-accent)' }}>@{athlete.instagram}</a></dd></div>
                  )}
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </AnimatedSection>
    </>
  );
}
