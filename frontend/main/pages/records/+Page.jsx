import { useState, useEffect, useMemo } from 'react';
import { useData } from 'vike-react/useData';
import { AnimatedSection } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';
import { recordsSchema } from '../../src/utils/jsonLd';

const API_BASE = import.meta.env.VITE_API_URL
  || 'https://climb-pakistan-backend.onrender.com/api';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Format a date string as "10 Mar 2024" (short month) */
function formatDateShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format a date string as "10 March 2024" (full month) */
function formatDateFull(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

/** Scroll hint that auto-hides after first scroll or 5 seconds */
function ScrollHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    const onScroll = () => setVisible(false);
    const wrap = document.querySelector('.records-table-wrap');
    if (wrap) wrap.addEventListener('scroll', onScroll, { once: true });
    return () => {
      clearTimeout(timer);
      if (wrap) wrap.removeEventListener('scroll', onScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="records-table-scroll-hint" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
      <span>Swipe to see full rows</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}

export { Page };

function Page() {
  const { records: initialRecords, pageSettings } = useData();
  const settings = pageSettings || {};
  const [gender, setGender] = useState('Men');
  const [records, setRecords] = useState(initialRecords || {});

  // Sort records by time ascending — fastest (lowest number) on top
  const sortByTime = (list) => [...list].sort((a, b) => parseFloat(a.recordTime) - parseFloat(b.recordTime));
  const currentRecords = useMemo(() => sortByTime(records?.[gender]?.current || []), [records, gender]);
  const previousRecords = useMemo(() => sortByTime(records?.[gender]?.previous || []), [records, gender]);
  const allNames = useMemo(() => {
    const names = new Set();
    [...currentRecords, ...previousRecords].forEach((r) => {
      if (r.athleteName) names.add(r.athleteName);
    });
    return [...names];
  }, [currentRecords, previousRecords]);

  const allTags = useMemo(() => {
    const tags = new Set();
    [...currentRecords, ...previousRecords].forEach((r) => {
      (r.tags || []).forEach((t) => t.trim() && tags.add(t.trim()));
    });
    return [...tags];
  }, [currentRecords, previousRecords]);

  const genderLabel = gender === 'Women' ? "women's" : "men's";
  const dynamicKeywords = [
    `Pakistan ${genderLabel} speed climbing records`,
    `fastest climber Pakistan ${genderLabel}`,
    `Pakistan national record speed climbing`,
    `climbing record Pakistan ${genderLabel}`,
    ...allNames.map((n) => `${n} climbing record`),
    ...allNames.map((n) => `${n} Pakistan climber`),
    ...allNames.map((n) => `${n} speed climbing`),
    ...allNames.map((n) => `Pakistani climber ${n}`),
    ...allTags,
    'Pakistan sport climbing records',
    'sport climbing Pakistan records',
    'speed climbing national record Pakistan',
    'Pakistan fastest climber',
  ].filter(Boolean).join(', ');

  // Re-fetch records on the client side so admin additions (previous records,
  // new records) show immediately without waiting for a Vercel rebuild.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/national-records`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setRecords(data); })
      .catch(() => { /* keep initial prerendered data */ });
    return () => { cancelled = true; };
  }, []);

  const hasAnyData = currentRecords.length > 0 || previousRecords.length > 0;

  const hasMenData = (records?.Men?.current?.length || 0) + (records?.Men?.previous?.length || 0) > 0;
  const hasWomenData = (records?.Women?.current?.length || 0) + (records?.Women?.previous?.length || 0) > 0;

  const recordsDesc = allNames.length > 0
    ? `Pakistan national speed climbing records — ${genderLabel}’s records held by ${allNames.join(', ')}. Track the fastest climbing times in Pakistan.`
    : settings.seoDescription || `Pakistan national speed climbing records — ${genderLabel}’s current records and historical progression.`;

  return (
    <>
      <Seo
        title={settings.seoTitle || `National Records — ${gender}’s Speed Climbing`}
        description={recordsDesc}
        keywords={settings.seoKeywords || dynamicKeywords}
        path="/records"
        jsonLd={recordsSchema(records, gender, settings)}
      />

      {/* ── Page Header (matches rankings style) ── */}
      <section className="page-header">
        <div className="container">
          <div className="hero-entrance">
            <h1 className="page-title">
              {settings.heroTitle || 'National'}<span style={{ color: 'var(--cp-accent)', marginLeft: '0.25em' }}>{settings.heroTitleAccent || 'Records'}</span>
            </h1>
            <p className="page-sub">
              {settings.heroSubtitle || "Pakistan's fastest speed climbing times — men's and women's national records tracked from sanctioned competitions."}
            </p>
          </div>
          <div className="records-gender-bar">
            <button
              className={`records-gender-btn${gender === 'Men' ? ' is-active' : ''}`}
              onClick={() => setGender('Men')}
              disabled={!hasMenData}
            >
              <img className="records-gender-flag" src="https://flagcdn.com/w80/pk.png" width="21" height="14" alt="" />
              Men's Records
            </button>
            <button
              className={`records-gender-btn${gender === 'Women' ? ' is-active' : ''}`}
              onClick={() => setGender('Women')}
              disabled={!hasWomenData}
            >
              <img className="records-gender-flag" src="https://flagcdn.com/w80/pk.png" width="21" height="14" alt="" />
              Women's Records
            </button>
          </div>
        </div>
      </section>

      <section className="section-tight" style={{ paddingTop: 0 }}>
        <div className="container">
          {!hasAnyData ? (
            <div className="records-empty">
              <div className="records-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 20h12" /><path d="M12 4v12" /><path d="M8 12l4 4 4-4" />
                </svg>
              </div>
              <h3>No Records Yet</h3>
            </div>
          ) : (
            <>
              <AnimatedSection>
                {currentRecords.length > 0 && (
                  <div className="records-current-section">
                    <div className="records-premium-grid">
                      {currentRecords.map((rec, i) => (
                        <article className="records-premium-card" key={rec._id || i}>
                          <div className="records-premium-media">
                            {rec.athleteImageUrl ? (
                              <img src={rec.athleteImageUrl} alt={`${rec.athleteName} — Pakistan National Record`} />
                            ) : (
                              <span className="records-premium-initials">
                                {rec.athleteName.split(' ').map(p => p[0]).slice(0, 2).join('')}
                              </span>
                            )}
                            <div className="records-premium-badge">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                              Current Record
                            </div>
                          </div>
                          <div className="records-premium-body">
                            <div className="records-premium-value">{rec.recordTime} <span className="records-premium-unit">seconds</span></div>
                            {rec.athleteSlug ? (
                              <a href={`/athletes/${rec.athleteSlug}`} className="records-premium-name-link">{rec.athleteName}</a>
                            ) : (
                              <h3 className="records-premium-name">{rec.athleteName}</h3>
                            )}
                            <hr className="records-premium-divider" role="separator" />
                            <dl className="records-premium-meta">
                              {rec.competition && (
                                <div className="records-premium-row">
                                  <svg className="records-premium-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="8" r="6" />
                                    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                                  </svg>
                                  <dt className="records-premium-label">Competition</dt>
                                  <dd className="records-premium-data">{rec.competition}</dd>
                                </div>
                              )}
                              {rec.venue && (
                                <div className="records-premium-row">
                                  <svg className="records-premium-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z" />
                                    <circle cx="12" cy="10" r="3" />
                                  </svg>
                                  <dt className="records-premium-label">Venue</dt>
                                  <dd className="records-premium-data">{rec.venue}</dd>
                                </div>
                              )}
                              {rec.date && (
                                <div className="records-premium-row">
                                  <svg className="records-premium-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="3" y="4" width="18" height="18" rx="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  <dt className="records-premium-label">Date</dt>
                                  <dd className="records-premium-data">{formatDateFull(rec.date)}</dd>
                                </div>
                              )}

                            </dl>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {previousRecords.length > 0 && (
                  <div className="records-previous-section">
                    <div className="records-section-label">
                      <span className="records-label-dot records-label-dot--prev" />
                      Previous Pakistan Speed Climbing {gender}’s Records
                    </div>
                    <div className="records-table-wrap">
                      <table className="records-table">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Athlete</th>
                            <th>Date</th>
                            <th>Competition</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previousRecords.map((rec, i) => (
                            <tr key={rec._id || i}>
                              <td className="records-table-time">{rec.recordTime}</td>
                              <td className="records-table-athlete">
                                {rec.athleteSlug ? (
                                  <a href={`/athletes/${rec.athleteSlug}`}>{rec.athleteName}</a>
                                ) : (
                                  rec.athleteName
                                )}
                              </td>
                              <td className="records-table-year">
                                {rec.date ? formatDateShort(rec.date) : '—'}
                              </td>
                              <td>{rec.competition || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <ScrollHint />
                  </div>
                )}
              </AnimatedSection>
            </>
          )}
        </div>
      </section>
    </>
  );
}
