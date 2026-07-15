import { useState, useEffect } from 'react';
import { getAthletes, getNews, getCompetitions } from '../api';

export default function Dashboard() {
  const [athleteCount, setAthleteCount] = useState(null);
  const [newsCount, setNewsCount] = useState(null);
  const [activeCompCount, setActiveCompCount] = useState(null);

  useEffect(() => {
    getAthletes().then((a) => setAthleteCount(a.length)).catch(() => setAthleteCount('—'));
    getNews().then((n) => setNewsCount(n.length)).catch(() => setNewsCount('—'));
    getCompetitions().then((c) => {
      setActiveCompCount(c.filter((comp) => comp.status !== 'Completed').length);
    }).catch(() => setActiveCompCount('—'));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your Climb Pakistan platform.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Athletes</div>
          <div className="stat-value">{athleteCount ?? '...'}</div>
          <div className="stat-change positive">Live data</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">News Articles</div>
          <div className="stat-value">{newsCount ?? '...'}</div>
          <div className="stat-change positive">Live data</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Competitions</div>
          <div className="stat-value">{activeCompCount ?? '...'}</div>
          <div className="stat-change positive">{activeCompCount === 1 ? 'Upcoming' : 'Live data'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Page Views</div>
          <div className="stat-value">—</div>
          <div className="stat-change">Requires analytics setup</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Links</h3>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <a href="/athletes" className="btn btn-outline" style={{ fontSize: 'var(--fs-sm)' }}>Manage Athletes</a>
          <a href="/latest-news" className="btn btn-outline" style={{ fontSize: 'var(--fs-sm)' }}>Manage News</a>
          <a href="/competitions" className="btn btn-outline" style={{ fontSize: 'var(--fs-sm)' }}>Manage Competitions</a>
          <a href="/rankings" className="btn btn-outline" style={{ fontSize: 'var(--fs-sm)' }}>Manage Rankings</a>
          <a href="/photos" className="btn btn-outline" style={{ fontSize: 'var(--fs-sm)' }}>Photos Library</a>
        </div>
      </div>
    </>
  );
}
