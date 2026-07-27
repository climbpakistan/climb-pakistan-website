import { useEffect, useMemo, useState } from 'react';
import { useData } from 'vike-react/useData';
import { AnimatedSection } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';
import { resultsSchema } from '../../src/utils/jsonLd';

export { Page };

const CATEGORIES = ['Men', 'Women'];
const DISCIPLINES = ['Speed', 'Lead', 'Boulder'];

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('');
}

function getRankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'rank-rest';
}

function Page() {
  const { results, tags, athletes } = useData();

  const [category, setCategory] = useState('Men');
  const [discipline, setDiscipline] = useState('Speed');
  const [year, setYear] = useState('');

  // Collect available years
  const availableYears = useMemo(() => {
    if (!results) return [];
    const years = new Set();
    for (const cat of CATEGORIES) {
      for (const disc of DISCIPLINES) {
        if (results[cat]?.[disc]) {
          for (const [y, entries] of Object.entries(results[cat][disc])) {
            if (Array.isArray(entries) && entries.length > 0) years.add(y);
          }
        }
      }
    }
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [results]);

  useEffect(() => {
    if (availableYears.length > 0) {
      setYear((prev) => {
        if (!prev || !availableYears.includes(prev)) {
          const currentYear = String(new Date().getFullYear());
          return availableYears.includes(currentYear) ? currentYear : availableYears[0];
        }
        return prev;
      });
    }
  }, [availableYears]);

  const effectiveYear = year || availableYears[0] || '';
  const rawList = results?.[category]?.[discipline]?.[effectiveYear] || [];

  // Deduplicate by slug+rank or name+team+rank, then sort by rank ascending
  const list = useMemo(() => {
    const seen = new Set();
    const deduped = rawList.filter((e) => {
      const key = e.slug ? `${e.slug}|${e.rank}` : `${e.name || ''}|${e.team || ''}|${e.rank}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...deduped].sort((a, b) => (a.rank || 999) - (b.rank || 999));
  }, [rawList]);

  function resolveRowInfo(row) {
    // Slug is used only to get name + photo from athlete profile.
    // Team ALWAYS comes from the entry (Excel column), NOT from athlete profile,
    // because athletes switch teams over the years.
    if (row.slug) {
      const a = athletes?.find((x) => x.slug === row.slug);
      return {
        name: a?.name || `@${row.slug}`,
        team: row.team || '—',
        photoUrl: a?.photoUrl || '',
        slug: row.slug,
      };
    }
    return {
      name: row.name || '—',
      team: row.team || '—',
      photoUrl: '',
      slug: '',
    };
  }

  const hasData = availableYears.length > 0;

  return (
    <>
      <Seo
        title={`National Championship Results${effectiveYear ? ' ' + effectiveYear : ''}`}
        description="National sport climbing championship results — Senior Men and Senior Women across Speed, Lead, and Boulder disciplines. Complete podium and final standings from Pakistan's premier climbing competitions."
        keywords="Pakistan national championship results, sport climbing results Pakistan, national championships climbing Pakistan, Pakistan speed climbing results, Pakistan lead climbing results, Pakistan bouldering results, national champions Pakistan climbing, Pakistani climbing competition results, senior men climbing results Pakistan, senior women climbing results Pakistan"
        path="/results"
        jsonLd={resultsSchema(tags)}
      />

      <section className="page-header">
        <div className="container">
          <div className="hero-entrance">
            <h1 className="page-title">
              National Championship Results
              {hasData && effectiveYear && (
                <span style={{ color: 'var(--cp-accent)', marginLeft: '0.25em' }}>{effectiveYear}</span>
              )}
            </h1>
            <p className="page-sub">
              Final standings from national sport climbing championships — Senior Men and Senior Women across all disciplines.
            </p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container">
          <div className="rankings-top-bar">
            <div className="control-group" style={{ marginLeft: 0 }}>
              <label htmlFor="resultsYearSelect" className="year-label">Year</label>
              <select id="resultsYearSelect" className="year-select"
                value={effectiveYear}
                onChange={(e) => setYear(e.target.value)}
              >
                {availableYears.map((y, _, src) => (
                  <option value={y} key={y}>{y}{y === src[0] ? ' (latest)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {!hasData ? (
            <div style={{ textAlign: 'center', padding: 'var(--sp-16) var(--sp-6)' }}>
              <p style={{ color: 'var(--cp-text-muted)', fontSize: 'var(--fs-md)' }}>
                No championship results available yet.
              </p>
            </div>
          ) : (
            <>
              <div className="rankings-filters">
                <div className="records-gender-bar" style={{ marginBottom: 'var(--sp-4)' }}>
                  <button className={`records-gender-btn${category === 'Men' ? ' is-active' : ''}`} onClick={() => setCategory('Men')}>
                    <img className="records-gender-flag" src="https://flagcdn.com/w80/pk.png" width="21" height="14" alt="" />
                    Men's Results
                  </button>
                  <button className={`records-gender-btn${category === 'Women' ? ' is-active' : ''}`} onClick={() => setCategory('Women')}>
                    <img className="records-gender-flag" src="https://flagcdn.com/w80/pk.png" width="21" height="14" alt="" />
                    Women's Results
                  </button>
                </div>
                <div className="filter-bar" role="tablist" aria-label="Select discipline">
                  {DISCIPLINES.map((d) => (
                    <button key={d} className={`filter-chip${discipline === d ? ' is-active' : ''}`}
                      role="tab" aria-selected={discipline === d}
                      onClick={() => setDiscipline(d)}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rankings-table-wrap">
                {list.length === 0 ? (
                  <p style={{ color: 'var(--cp-text-muted)', padding: 'var(--sp-8)', textAlign: 'center' }}>
                    No results for {category} {discipline} in {effectiveYear}.
                  </p>
                ) : (
                  <table className="rankings-table">
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Athlete</th>
                        <th>Team</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row, idx) => {
                        const info = resolveRowInfo(row);
                        const linkTo = info.slug ? `/athletes/${info.slug}` : null;
                        const avatarContent = info.photoUrl ? (
                          <img src={info.photoUrl} alt={info.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : initials(info.name);
                        return (
                          <tr key={idx} className={`${row.rank === 1 && idx === 0 ? 'is-leader ' : ''}${getRankClass(row.rank)}`}>
                            <td className="rankings-rank">{row.rank}</td>
                            <td>
                              <div className="rankings-athlete-cell">
                                {linkTo ? (
                                  <a href={linkTo} className="ranking-avatar" aria-hidden="true"
                                    style={info.photoUrl ? { background: 'none', padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}>
                                    {avatarContent}
                                  </a>
                                ) : (
                                  <div className="ranking-avatar" aria-hidden="true">{avatarContent}</div>
                                )}
                                {linkTo ? <a href={linkTo}>{info.name}</a> : info.name}
                              </div>
                            </td>
                            <td>{info.team}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.result || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          <p className="leaderboard-note">
            Results from national sport climbing championships sanctioned by the Pakistan Climbing Federation.
          </p>
        </div>
      </AnimatedSection>
    </>
  );
}
