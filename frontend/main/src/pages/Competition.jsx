import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { getCompetition, getNews, getAthletes } from '../api';
import { AnimatedSection } from '../hooks/animations';
import NewsCard from '../components/NewsCard';
import Seo from '../components/Seo';

const TABS = ['overview', 'results', 'news', 'gallery'];
const TAB_LABELS = { overview: 'Overview', news: 'News', results: 'Results', gallery: 'Gallery' };

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function renderOverview(text) {
  if (!text) return null;
  // 1. Split by double newlines into paragraphs (handles both \n and \r\n)
  const paragraphs = text.split(/\r?\n{2,}/).filter(Boolean);
  return paragraphs.map((block, i) => {
    // 2. Split single newlines within a paragraph into <br/>
    const lines = block.split(/\r?\n/).filter(Boolean);
    const elements = lines.map((line, j) => {
      // 3. Convert **text** to <strong>text</strong>
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const content = parts.map((part, k) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={k}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return <span key={j}>{content}{j < lines.length - 1 && <br/>}</span>;
    });
    return <p key={i} style={{ marginBottom: 'var(--sp-4)' }}>{elements}</p>;
  });
}

function formatRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function Competition() {
  const { slug } = useParams();
  const { data: competition, loading } = useFetch(() => getCompetition(slug), [slug]);
  const { data: allNews } = useFetch(getNews, []);
  const { data: allAthletes } = useFetch(getAthletes, []);

  const [tab, setTab] = useState('overview');
  const [resultsDiscipline, setResultsDiscipline] = useState(competition?.disciplines?.[0] || 'Speed');
  const [resultsGender, setResultsGender] = useState('Men');

  if (loading) {
    return (
      <section className="page-header">
        <div className="container">
          <p style={{ color: 'var(--cp-text-muted)' }}>Loading competition...</p>
        </div>
      </section>
    );
  }

  if (!competition) {
    return (
      <section className="page-header">
        <div className="container">
          <h1 className="page-title">Competition Not Found</h1>
          <p className="page-sub">We couldn't find that competition.</p>
          <Link to="/competitions" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Back to Competitions</Link>
        </div>
      </section>
    );
  }

  const relatedNews = allNews?.filter((n) => competition.newsSlugs?.includes(n.slug)) || [];
  const resultRows = competition.results?.[resultsDiscipline]?.[resultsGender] || [];

  const compDesc = competition.overview
    ? competition.overview.replace(/<[^>]*>/g, '').replace(/\*\*/g, '').slice(0, 160)
    : `${competition.name} — a climbing competition in ${competition.location}.`;

  return (
    <>
      <Seo
        title={competition.name}
        description={compDesc}
        ogImage={competition.imageUrl}
        ogType="article"
        path={`/competitions/${slug}`}
      />

      <section className="page-header page-header--enhanced">
        <div className="page-header-bg-grid"></div>
        <div className="page-header-glow"></div>
        <div className="container">
          <div className="hero-entrance">
            <span className={`status-pill status-${competition.status?.toLowerCase()}`}>{competition.status}</span>
            <h1 className="page-title">{competition.name}</h1>
            <p className="page-sub">{competition.location} · {formatRange(competition.startDate, competition.endDate)}</p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container">
          <div className="comp-tabs">
            {TABS.map((t) => (
              <button
                key={t}
                className={`comp-tab${tab === t ? ' is-active' : ''}`}
                onClick={() => setTab(t)}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="comp-tab-content is-active entrance-right">
              <div className="comp-overview">
                {competition.imageUrl && (
                  <img src={competition.imageUrl} alt={competition.name} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 12, marginBottom: 'var(--sp-6)' }} />
                )}
                {renderOverview(competition.overview)}
                <dl className="info-list" style={{ marginTop: 'var(--sp-6)' }}>
                  <div><dt>Location</dt><dd>{competition.location}</dd></div>
                  <div><dt>Dates</dt><dd>{formatRange(competition.startDate, competition.endDate)}</dd></div>
                  <div><dt>Disciplines</dt><dd>{competition.disciplines?.join(', ')}</dd></div>
                  <div><dt>Status</dt><dd>{competition.status}</dd></div>
                </dl>
              </div>
            </div>
          )}

          {tab === 'news' && (
            <div className="comp-tab-content is-active entrance-right">
              {relatedNews.length === 0 ? (
                <p style={{ color: 'var(--cp-text-muted)' }}>No news posted for this competition yet.</p>
              ) : (
                <div className="news-grid">
                  {relatedNews.map((n) => <NewsCard article={n} key={n.slug} />)}
                </div>
              )}
            </div>
          )}

          {tab === 'results' && (
            <div className="comp-tab-content is-active entrance-right">
              {!competition.results || Object.keys(competition.results).length === 0 ? (
                <p style={{ color: 'var(--cp-text-muted)' }}>No results available yet.</p>
              ) : (
                <>
                  <div className="comp-results-filters">
                    <div className="control-group" role="tablist" aria-label="Select gender">
                      {['Men', 'Women'].map((g) => (
                        <button
                          key={g}
                          className={`filter-chip${resultsGender === g ? ' is-active' : ''}`}
                          onClick={() => setResultsGender(g)}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-bar" role="tablist" aria-label="Select discipline">
                    {competition.disciplines?.map((d) => (
                      <button
                        key={d}
                        className={`filter-chip${resultsDiscipline === d ? ' is-active' : ''}`}
                        onClick={() => setResultsDiscipline(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  {resultRows.length === 0 ? (
                    <p style={{ color: 'var(--cp-text-muted)' }}>No results available yet for this category.</p>
                  ) : (
                    <table className="rankings-table">
                      <thead>
                        <tr><th>Rank</th><th>Athlete</th><th>Team</th><th>{resultsDiscipline === 'Speed' ? 'Time' : 'Points'}</th></tr>
                      </thead>
                      <tbody>
                        {resultRows.map((row) => (
                          <tr key={row.rank} className={row.rank === 1 ? 'is-leader' : ''}>
                            <td className="rankings-rank">{row.rank}</td>
                            <td>
                              {allAthletes?.some((a) => a.name === row.name) ? (
                                <Link to={`/athletes/${slugify(row.name)}`}>{row.name}</Link>
                              ) : (
                                row.name
                              )}
                            </td>
                            <td>{row.team}</td>
                            <td>{row.mark}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'gallery' && (
            <div className="comp-tab-content is-active entrance-right">
              {(!competition.images || competition.images.length === 0) ? (
                <p style={{ color: 'var(--cp-text-muted)' }}>No gallery images yet.</p>
              ) : (
                <div className="comp-gallery">
                  {competition.images.map((img, i) => {
                    const url = typeof img === 'string' ? img : img?.url || '';
                    const title = typeof img === 'string' ? '' : img?.title || '';
                    return (
                      <div className="comp-gallery-item" key={i}>
                        <div style={{ width: '100%', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                          <img src={url} alt={title || `${competition.name} gallery image ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        {title && (
                          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--cp-text-dim)', marginTop: 'var(--sp-2)', textAlign: 'center', lineHeight: 1.4 }}>{title}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </AnimatedSection>
    </>
  );
}
