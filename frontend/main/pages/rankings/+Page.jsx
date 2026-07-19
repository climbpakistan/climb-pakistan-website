import { useEffect, useMemo, useState } from 'react';
import { useData } from 'vike-react/useData';
import { AnimatedSection } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';
import { rankingsSchema } from '../../src/utils/jsonLd';

export { Page };

const CATEGORIES = ['Men', 'Women'];
const DISCIPLINES = ['Speed', 'Lead', 'Boulder'];
const MODES = ['Player Rankings', 'Team Rankings'];

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('');
}

function getRankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'rank-rest';
}

function assignRanks(entries, pointsKey) {
  if (!entries || !entries.length) return [];
  const sorted = [...entries].sort((a, b) => (b[pointsKey] || 0) - (a[pointsKey] || 0));
  const result = [];
  let displayRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i][pointsKey] !== sorted[i - 1][pointsKey]) {
      displayRank = i + 1;
    }
    result.push({ ...sorted[i], displayRank });
  }
  return result;
}

function Page() {
  const { rankingsRaw, teamRankingsRaw, athletes, teams } = useData();
  const rankings = (rankingsRaw?.data !== undefined) ? rankingsRaw.data : rankingsRaw;
  const rankingsTags = rankingsRaw?.tags || [];
  const teamRankings = (teamRankingsRaw?.data !== undefined) ? teamRankingsRaw.data : teamRankingsRaw;
  const teamRankingsTags = teamRankingsRaw?.tags || [];

  const [mode, setMode] = useState('Player Rankings');
  const [category, setCategory] = useState('Men');
  const [discipline, setDiscipline] = useState('Speed');
  const [year, setYear] = useState('');
  const [teamYear, setTeamYear] = useState('');

  const rankingYears = useMemo(() => {
    if (!rankings) return [];
    const years = new Set();
    for (const cat of CATEGORIES) {
      for (const disc of DISCIPLINES) {
        if (rankings[cat]?.[disc]) {
          for (const [y, entries] of Object.entries(rankings[cat][disc])) {
            if (Array.isArray(entries) && entries.length > 0) years.add(y);
          }
        }
      }
    }
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [rankings]);

  const teamRankingYears = useMemo(() => {
    if (!teamRankings) return [];
    const years = Object.keys(teamRankings).filter(
      (y) => Array.isArray(teamRankings[y]) && teamRankings[y].length > 0
    );
    return years.sort((a, b) => Number(b) - Number(a));
  }, [teamRankings]);

  useEffect(() => {
    if (rankingYears.length > 0) {
      setYear((prev) => {
        if (!prev || !rankingYears.includes(prev)) {
          const currentYear = String(new Date().getFullYear());
          return rankingYears.includes(currentYear) ? currentYear : rankingYears[0];
        }
        return prev;
      });
    }
  }, [rankingYears]);

  useEffect(() => {
    if (teamRankingYears.length > 0) {
      setTeamYear((prev) => {
        if (!prev || !teamRankingYears.includes(prev)) {
          const currentYear = String(new Date().getFullYear());
          return teamRankingYears.includes(currentYear) ? currentYear : teamRankingYears[0];
        }
        return prev;
      });
    }
  }, [teamRankingYears]);

  const effectiveYear = year || rankingYears[0] || '';
  const effectiveTeamYear = teamYear || teamRankingYears[0] || '';
  const headingYear = mode === 'Team Rankings' ? effectiveTeamYear : effectiveYear;

  const rawList = rankings?.[category]?.[discipline]?.[effectiveYear] || [];
  const list = useMemo(() => assignRanks(rawList, 'points'), [rawList]);

  function resolveRowInfo(row) {
    if (row.slug) {
      const a = athletes?.find((x) => x.slug === row.slug);
      return { name: a?.name || `@${row.slug}`, team: a?.team || '—', photoUrl: a?.photoUrl || '', slug: row.slug };
    }
    return { name: row.name || '—', team: row.team || '—', photoUrl: row.photoUrl || '', slug: '' };
  }

  function resolveTeamInfo(entry) {
    if (entry.teamSlug) {
      const t = teams?.find((tm) => tm.slug === entry.teamSlug);
      return { name: t?.name || entry.teamName || `@${entry.teamSlug}`, logoUrl: t?.logoUrl || '' };
    }
    return { name: entry.teamName || '—', logoUrl: entry.teamLogoUrl || '' };
  }

  const allTeamData = useMemo(() => {
    if (!teamRankings) return [];
    const yearData = teamRankings[effectiveTeamYear];
    return Array.isArray(yearData) ? yearData : [];
  }, [teamRankings, effectiveTeamYear]);

  const teamList = useMemo(() => assignRanks(allTeamData, 'totalPoints'), [allTeamData]);

  const hasNoDataAtAll = rankingYears.length === 0 && teamRankingYears.length === 0;

  return (
    <>
      <Seo
        title={`National Rankings${headingYear ? ' ' + headingYear : ''}`}
        description="Senior men and senior women national rankings by discipline."
        keywords="climbers rankings Pakistan, national climbing ranking Pakistan, sport climbing rankings Pakistan, Pakistan climbing standings, national rankings Pakistan climbing, speed climbing ranking Pakistan, lead climbing ranking Pakistan"
        path="/rankings"
        jsonLd={rankingsSchema(mode === 'Team Rankings' ? teamRankingsTags : rankingsTags)}
      />

      <section className="page-header">
        <div className="container">
          <div className="hero-entrance">
            <h1 className="page-title">
              National Rankings{!hasNoDataAtAll && headingYear && (
                <span style={{ color: 'var(--cp-accent)', marginLeft: '0.25em' }}>{headingYear}</span>
              )}
            </h1>
            <p className="page-sub">Senior men and senior women, ranked by discipline. Select a year to view historical standings.</p>
            <a href="/records" className="records-nav-link">
              <svg className="records-nav-flag" width="22" height="16" viewBox="0 0 24 16" fill="none">
                <rect x="0" y="0" width="24" height="16" fill="#01411C" />
                <rect x="0" y="0" width="6" height="16" fill="white" />
                <circle cx="12" cy="8" r="3.5" fill="white" opacity="0.95" />
                <path d="M13.2 5.5 L13.8 7.2 L15.5 7.2 L14.1 8.4 L14.7 10.2 L13.2 9.1 L11.7 10.2 L12.3 8.4 L10.9 7.2 L12.6 7.2 Z" fill="#01411C" />
              </svg>
              <span>National Records</span>
            </a>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container">
          <div className="rankings-top-bar">
            <div className="rankings-mode-group" role="tablist" aria-label="Select ranking type">
              {MODES.map((m) => (
                <button key={m} className={`filter-chip${mode === m ? ' is-active' : ''}`} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>{m}</button>
              ))}
            </div>
            <div className="control-group">
              <label htmlFor="yearSelect" className="year-label">Year</label>
              <select id="yearSelect" className="year-select"
                value={mode === 'Team Rankings' ? effectiveTeamYear : effectiveYear}
                onChange={(e) => mode === 'Team Rankings' ? setTeamYear(e.target.value) : setYear(e.target.value)}
              >
                {(mode === 'Team Rankings' ? teamRankingYears : rankingYears).map((y, _, src) => (
                  <option value={y} key={y}>{y}{y === src[0] ? ' (current)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {hasNoDataAtAll ? (
            <div style={{ textAlign: 'center', padding: 'var(--sp-16) var(--sp-6)' }}>
              <p style={{ color: 'var(--cp-text-muted)', fontSize: 'var(--fs-md)' }}>No ranking data is available.</p>
            </div>
          ) : mode === 'Player Rankings' ? (
            <>
              <div className="rankings-filters">
                <div className="filter-bar" role="tablist" aria-label="Select category">
                  {CATEGORIES.map((c) => (<button key={c} className={`filter-chip${category === c ? ' is-active' : ''}`} role="tab" aria-selected={category === c} onClick={() => setCategory(c)}>Senior {c}</button>))}
                </div>
                <div className="filter-bar" role="tablist" aria-label="Select discipline">
                  {DISCIPLINES.map((d) => (<button key={d} className={`filter-chip${discipline === d ? ' is-active' : ''}`} role="tab" aria-selected={discipline === d} onClick={() => setDiscipline(d)}>{d}</button>))}
                </div>
              </div>
              <div className="rankings-table-wrap">
                {list.length === 0 ? (
                  <p style={{ color: 'var(--cp-text-muted)', padding: 'var(--sp-8)', textAlign: 'center' }}>No ranking data for {category} {discipline} in {effectiveYear}.</p>
                ) : (
                  <table className="rankings-table">
                    <thead><tr><th>Rank</th><th>Athlete</th><th>Team</th><th>Points</th></tr></thead>
                    <tbody>
                      {list.map((row, idx) => {
                        const info = resolveRowInfo(row);
                        const linkTo = info.slug ? `/athletes/${info.slug}` : null;
                        const avatarContent = info.photoUrl ? (
                          <img src={info.photoUrl} alt={info.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : initials(info.name);
                        return (
                          <tr key={idx} className={`${row.displayRank === 1 ? 'is-leader ' : ''}${getRankClass(row.displayRank)}`}>
                            <td className="rankings-rank">{row.displayRank}</td>
                            <td>
                              <div className="rankings-athlete-cell">
                                {linkTo ? (
                                  <a href={linkTo} className="ranking-avatar" aria-hidden="true" style={info.photoUrl ? { background: 'none', padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}>{avatarContent}</a>
                                ) : <div className="ranking-avatar" aria-hidden="true">{avatarContent}</div>}
                                {linkTo ? <a href={linkTo}>{info.name}</a> : info.name}
                              </div>
                            </td>
                            <td>{info.team}</td>
                            <td>{row.points} points</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="rankings-table-wrap">
              {teamList.length === 0 ? (
                <p style={{ color: 'var(--cp-text-muted)', padding: 'var(--sp-8)', textAlign: 'center' }}>No team ranking data for {effectiveTeamYear}.</p>
              ) : (
                <table className="rankings-table">
                  <thead><tr><th>Rank</th><th>Team Name</th><th>Men's Points</th><th>Women's Points</th><th>Total Points</th></tr></thead>
                  <tbody>
                    {teamList.map((team, idx) => {
                      const tInfo = resolveTeamInfo(team);
                      const logoSize = team.displayRank === 1 ? 68 : team.displayRank === 2 ? 56 : team.displayRank === 3 ? 48 : 36;
                      const svgSize = Math.round(logoSize * 0.5);
                      return (
                        <tr key={idx} className={`${team.displayRank === 1 ? 'is-leader ' : ''}${getRankClass(team.displayRank)}`}>
                          <td className="rankings-rank">{team.displayRank}</td>
                          <td style={{ fontWeight: 600, color: 'var(--cp-white)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                              <div style={{ width: logoSize, height: logoSize, flexShrink: 0, borderRadius: logoSize > 36 ? 10 : 6, overflow: 'hidden', background: tInfo.logoUrl ? 'none' : 'var(--cp-surface-2)', border: tInfo.logoUrl ? 'none' : '1px solid var(--cp-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {tInfo.logoUrl ? <img src={tInfo.logoUrl} alt={tInfo.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : (
                                  <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cp-text-muted)', opacity: 0.35 }}>
                                    <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" />
                                  </svg>
                                )}
                              </div>
                              <span style={{ fontSize: logoSize > 48 ? 'var(--fs-md)' : undefined, fontWeight: logoSize > 36 ? 700 : 600 }}>{tInfo.name}</span>
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
          )}
          <p className="leaderboard-note">Rankings reflect results from national championships and sanctioned competitions only.</p>
        </div>
      </AnimatedSection>
    </>
  );
}
