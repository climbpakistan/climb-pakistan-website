import { useData } from 'vike-react/useData';
import { AnimatedSection } from '../../../../src/hooks/animations';
import Seo from '../../../../src/components/Seo';

export { Page };

function getRankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'rank-rest';
}

function Page() {
  const { year, list, teams, allTeamRankings } = useData();

  // Collect all available team ranking years for navigation
  const availableYears = Object.keys(allTeamRankings || {})
    .filter((y) => Array.isArray(allTeamRankings[y]) && allTeamRankings[y].length > 0)
    .sort((a, b) => Number(b) - Number(a));

  const headingYear = year;
  const heading = `Team Rankings ${headingYear}`;

  return (
    <>
      <Seo
        title={`Team Rankings ${year}`}
        description={`National team climbing rankings for ${year}. See which clubs and teams lead Pakistan's sport climbing scene across men's and women's disciplines.`}
        keywords={`team climbing rankings Pakistan ${year}, Pakistan climbing team standings ${year}, sport climbing teams Pakistan ${year}, club rankings Pakistan climbing ${year}, Pakistan team climbing rankings, best climbing teams Pakistan`}
        path={`/rankings/teams/${year}`}
      />

      <section className="page-header">
        <div className="container">
          <div className="hero-entrance">
            <h1 className="page-title">
              Team Rankings
              <span style={{ color: 'var(--cp-accent)', marginLeft: '0.25em' }}>{headingYear}</span>
            </h1>
            <p className="page-sub">
              National team climbing rankings for {year} — see which clubs and teams lead Pakistan's sport climbing scene.
            </p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container">
          {/* Year navigation */}
          <div className="rankings-top-bar">
            <div className="control-group">
              <label htmlFor="yearSelect" className="year-label">Year</label>
              <select
                id="yearSelect"
                className="year-select"
                value={year}
                onChange={(e) => {
                  window.location.href = `/rankings/teams/${e.target.value}`;
                }}
              >
                {availableYears.map((y) => (
                  <option value={y} key={y}>{y}{y === availableYears[0] ? ' (current)' : ''}</option>
                ))}
              </select>
            </div>
            <a href="/rankings" className="filter-chip" style={{ borderColor: 'var(--cp-accent)', color: 'var(--cp-accent)' }}>
              All Rankings ↗
            </a>
          </div>

          {/* Team rankings table */}
          <div className="rankings-table-wrap">
            {list.length === 0 ? (
              <p style={{ color: 'var(--cp-text-muted)', padding: 'var(--sp-8)', textAlign: 'center' }}>
                No team ranking data for {year}.
              </p>
            ) : (
              <table className="rankings-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team Name</th>
                    <th>Men's Points</th>
                    <th>Women's Points</th>
                    <th>Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((team, idx) => {
                    const tInfo = teams?.find((t) => t.slug === team.teamSlug);
                    const name = tInfo?.name || team.teamName || `@${team.teamSlug}`;
                    const logoUrl = tInfo?.logoUrl || team.teamLogoUrl || '';
                    const isPodium = team.displayRank <= 3;
                    const logoSize = isPodium ? 60 : 50;
                    const svgSize = Math.round(logoSize * 0.5);
                    const logoClass = `team-ranking-logo${isPodium ? ' team-ranking-logo--podium' : ''}`;

                    return (
                      <tr key={idx} className={`${team.displayRank === 1 ? 'is-leader ' : ''}${getRankClass(team.displayRank)}`}>
                        <td className="rankings-rank">{team.displayRank}</td>
                        <td style={{ fontWeight: 600, color: 'var(--cp-white)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                            <div
                              className={logoClass}
                              style={{
                                width: logoSize, height: logoSize, flexShrink: 0,
                                borderRadius: 10, overflow: 'hidden',
                                background: logoUrl ? 'none' : 'var(--cp-surface-2)',
                                border: logoUrl ? 'none' : '1px solid var(--cp-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              {logoUrl ? (
                                <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              ) : (
                                <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cp-text-muted)', opacity: 0.35 }}>
                                  <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" />
                                </svg>
                              )}
                            </div>
                            <span style={{ fontSize: logoSize > 48 ? 'var(--fs-md)' : undefined, fontWeight: logoSize > 36 ? 700 : 600 }}>{name}</span>
                          </div>
                        </td>
                        <td>{team.menPoints}</td>
                        <td>{team.womenPoints}</td>
                        <td style={{ fontWeight: 600, color: 'var(--cp-accent)' }}>{team.totalPoints}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <p className="leaderboard-note">
            Rankings reflect results from national championships and sanctioned competitions only.
            <br />
            <a href="/rankings" style={{ color: 'var(--cp-accent)' }}>← Back to all rankings</a>
          </p>
        </div>
      </AnimatedSection>
    </>
  );
}
