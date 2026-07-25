import { useData } from 'vike-react/useData';
import { AnimatedSection } from '../../../../../src/hooks/animations';
import Seo from '../../../../../src/components/Seo';

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
  const { category, discipline, year, gender, list, athletes, allRankings } = useData();

  // Build link targets for switching views
  const altCategories = CATEGORIES.filter((c) => c !== gender);
  const altDisciplines = DISCIPLINES.filter((d) => d !== discipline);

  // Count entries for each category/discipline/year combo
  const comboCounts = {};
  for (const g of CATEGORIES) {
    for (const d of DISCIPLINES) {
      const years = allRankings?.[g]?.[d] || {};
      for (const y of Object.keys(years)) {
        if (Array.isArray(years[y]) && years[y].length > 0) {
          comboCounts[`${g}|${d}|${y}`] = years[y].length;
        }
      }
    }
  }

  const heading = `${gender} ${discipline} Climbing Rankings ${year}`;

  return (
    <>
      <Seo
        title={`${gender} ${discipline} Rankings ${year}`}
        description={`Senior ${gender.toLowerCase()} national ${discipline.toLowerCase()} climbing rankings for ${year}. See the top climbers, points standings, and rankings from sanctioned competitions across Pakistan.`}
        keywords={`${gender.toLowerCase()} ${discipline.toLowerCase()} climbing rankings ${year}, Pakistan ${gender.toLowerCase()} ${discipline.toLowerCase()} standings ${year}, climbing rankings Pakistan ${gender.toLowerCase()} ${discipline.toLowerCase()}, sport climbing Pakistan ${year}, Pakistani ${gender.toLowerCase()} climbers ranking ${year}, Pakistan national climbing rankings ${gender.toLowerCase()} ${discipline.toLowerCase()}`}
        path={`/rankings/${category}/${discipline.toLowerCase()}/${year}`}
      />

      <section className="page-header">
        <div className="container">
          <div className="hero-entrance">
            <h1 className="page-title">
              {gender} {discipline} Rankings
              <span style={{ color: 'var(--cp-accent)', marginLeft: '0.25em' }}>{year}</span>
            </h1>
            <p className="page-sub">
              Senior {gender.toLowerCase()} national {discipline.toLowerCase()} climbing rankings for {year}.
            </p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container">
          {/* Navigation links to other views */}
          <div className="rankings-top-bar">
            <div className="rankings-mode-group" role="tablist" aria-label="Switch category or discipline">
              {/* Switch gender */}
              {altCategories.map((cat) => {
                const hasData = comboCounts[`${cat}|${discipline}|${year}`];
                const label = cat.charAt(0).toLowerCase() + cat.slice(1);
                return (
                  <a
                    key={cat}
                    href={`/rankings/${label}/${discipline.toLowerCase()}/${year}`}
                    className={`filter-chip${hasData ? '' : ' is-disabled'}`}
                    role="tab"
                    aria-selected="false"
                    style={!hasData ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
                  >
                    Senior {cat}
                  </a>
                );
              })}
              {/* Switch discipline */}
              {altDisciplines.map((d) => {
                const hasData = comboCounts[`${gender}|${d}|${year}`];
                return (
                  <a
                    key={d}
                    href={`/rankings/${category}/${d.toLowerCase()}/${year}`}
                    className={`filter-chip${hasData ? '' : ' is-disabled'}`}
                    role="tab"
                    aria-selected="false"
                    style={!hasData ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
                  >
                    {d}
                  </a>
                );
              })}
              {/* Link back to full rankings */}
              <a href="/rankings" className="filter-chip" role="tab" style={{ marginLeft: 'auto', borderColor: 'var(--cp-accent)', color: 'var(--cp-accent)' }}>
                Full Rankings ↗
              </a>
            </div>
          </div>

          {/* Rankings table */}
          <div className="rankings-table-wrap">
            {list.length === 0 ? (
              <p style={{ color: 'var(--cp-text-muted)', padding: 'var(--sp-8)', textAlign: 'center' }}>
                No ranking data for {gender} {discipline} in {year}.
              </p>
            ) : (
              <table className="rankings-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Athlete</th>
                    <th>Team</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row, idx) => {
                    const athlete = athletes?.find((a) => a.slug === row.slug);
                    const name = athlete?.name || row.name || `@${row.slug}`;
                    const team = athlete?.team || row.team || '—';
                    const photoUrl = athlete?.photoUrl || row.photoUrl || '';
                    const avatarContent = photoUrl ? (
                      <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      initials(name)
                    );
                    return (
                      <tr key={idx} className={`${row.displayRank === 1 ? 'is-leader ' : ''}${getRankClass(row.displayRank)}`}>
                        <td className="rankings-rank">{row.displayRank}</td>
                        <td>
                          <div className="rankings-athlete-cell">
                            {athlete?.slug ? (
                              <a href={`/athletes/${athlete.slug}`} className="ranking-avatar" aria-hidden="true" style={photoUrl ? { background: 'none', padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}>{avatarContent}</a>
                            ) : (
                              <div className="ranking-avatar" aria-hidden="true">{avatarContent}</div>
                            )}
                            {athlete?.slug ? (
                              <a href={`/athletes/${athlete.slug}`}>{name}</a>
                            ) : (
                              name
                            )}
                          </div>
                        </td>
                        <td>{team}</td>
                        <td>{row.points} points</td>
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
