import { useState, useEffect } from 'react';
import { getAthletes, getNews, getCompetitions, getPageViewStats } from '../api';

export default function Dashboard() {
  const [athleteCount, setAthleteCount] = useState(null);
  const [newsCount, setNewsCount] = useState(null);
  const [activeCompCount, setActiveCompCount] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    let interval;

    const fetchData = async () => {
      getAthletes().then((a) => setAthleteCount(a.length)).catch(() => setAthleteCount('—'));
      getNews().then((n) => setNewsCount(n.length)).catch(() => setNewsCount('—'));
      getCompetitions().then((c) => {
        setActiveCompCount(c.filter((comp) => comp.status !== 'Completed').length);
      }).catch(() => setActiveCompCount('—'));

      try {
        const stats = await getPageViewStats();
        setAnalytics(stats);
        if (stats.recent?.length) {
          const mins = Math.round((Date.now() - new Date(stats.recent[0].timestamp).getTime()) / 60000);
          setTimeAgo(mins <= 1 ? 'Just now' : `${mins} min ago`);
        }
      } catch {
        // keep existing analytics if fetch fails
      }
    };

    fetchData();
    // Auto-refresh analytics every 30 seconds
    interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format a date relative to now
  const formatRelativeTime = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Format a date label for the chart
  const formatDayLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Find the max count for chart scaling
  const dailyCounts = analytics?.daily?.map(d => d.count) || [];
  const maxDaily = Math.max(...dailyCounts, 1);

  // Format a path for display (clean up)
  const formatPath = (path) => {
    if (path === '/') return 'Home';
    return path.replace(/^\//, '').replace(/\//g, ' › ').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your Climb Pakistan platform.</p>
      </div>

      {/* ── Content Stats Grid ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Athletes</div>
          <div className="stat-value">{athleteCount ?? '...'}</div>
          <div className="stat-change positive">Profiles</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">News Articles</div>
          <div className="stat-value">{newsCount ?? '...'}</div>
          <div className="stat-change positive">Published</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Competitions</div>
          <div className="stat-value">{activeCompCount ?? '...'}</div>
          <div className="stat-change positive">{activeCompCount === 1 ? 'Upcoming' : 'Active'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Page Views</div>
          <div className="stat-value">
            {analytics?.total !== undefined
              ? analytics.total.toLocaleString()
              : analytics === null ? '...' : '—'}
          </div>
          <div className="stat-change positive">All time</div>
        </div>
      </div>

      {/* ── Traffic Stats Grid ── */}
      <div className="stats-grid">
        <div className="stat-card stat-card--live">
          <div className="stat-label">
            <span className="live-dot" />
            Active Now
          </div>
          <div className="stat-value">{analytics?.activeVisitors ?? '...'}</div>
          <div className="stat-change positive">{timeAgo ? `Updated ${timeAgo}` : 'Realtime'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today</div>
          <div className="stat-value">
            {analytics?.today !== undefined
              ? analytics.today.toLocaleString()
              : analytics === null ? '...' : '—'}
          </div>
          <div className="stat-change positive">
            {analytics?.today !== undefined
              ? `${analytics.today > 0 ? '+' : ''}${analytics.today === 0 ? 'No views yet' : `Today's traffic`}`
              : 'Views'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Week</div>
          <div className="stat-value">
            {dailyCounts.length > 0
              ? dailyCounts.reduce((a, b) => a + b, 0).toLocaleString()
              : analytics === null ? '...' : '—'}
          </div>
          <div className="stat-change positive">
            {dailyCounts.length > 0
              ? `${dailyCounts.filter(c => c > 0).length} active day${dailyCounts.filter(c => c > 0).length !== 1 ? 's' : ''}`
              : '7-day'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unique Pages Today</div>
          <div className="stat-value">
            {analytics?.uniquePagesToday !== undefined
              ? analytics.uniquePagesToday.toLocaleString()
              : analytics === null ? '...' : '—'}
          </div>
          <div className="stat-change positive">Pages visited</div>
        </div>
      </div>

      {/* ── Two-column layout: Traffic Chart + Top Pages ── */}
      <div className="dashboard-grid">
        {/* ── Daily Traffic Chart ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Traffic (Last 7 Days)
            </h3>
          </div>
          <div className="chart-container">
            {analytics?.daily && analytics.daily.length > 0 ? (
              <div className="bar-chart">
                {analytics.daily.map((day) => {
                  const heightPct = (day.count / maxDaily) * 100;
                  return (
                    <div key={day.date} className="bar-column">
                      <div className="bar-value">{day.count}</div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ height: `${Math.max(heightPct, 2)}%` }}
                          title={`${formatDayLabel(day.date)}: ${day.count} views`}
                        />
                      </div>
                      <div className="bar-label">{formatDayLabel(day.date)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="chart-empty">
                <div className="chart-empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <p>No traffic data yet</p>
                <span>Data will appear once visitors start browsing</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Top Pages ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Top Pages (7 Days)
            </h3>
          </div>
          <div className="top-pages-list">
            {analytics?.topPages && analytics.topPages.length > 0 ? (
              analytics.topPages.map((page, i) => {
                const maxCount = analytics.topPages[0].count;
                const barWidth = (page.count / maxCount) * 100;
                return (
                  <div key={page.path} className="top-page-row">
                    <span className="top-page-rank">{i + 1}</span>
                    <div className="top-page-info">
                      <span className="top-page-name">{formatPath(page.path)}</span>
                      <div className="top-page-bar-track">
                        <div
                          className="top-page-bar-fill"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <span className="top-page-count">{page.count}</span>
                  </div>
                );
              })
            ) : (
              <div className="chart-empty">
                <div className="chart-empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p>No page data yet</p>
                <span>Popular pages will appear here</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="card" style={{ marginTop: 'var(--sp-6)' }}>
        <div className="card-header">
          <h3 className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Recent Activity
          </h3>
          <span className="activity-count">
            {analytics?.recent ? `${analytics.recent.length} events` : ''}
          </span>
        </div>
        <div className="activity-list">
          {analytics?.recent && analytics.recent.length > 0 ? (
            analytics.recent.map((view, i) => (
              <div key={`${view.timestamp}-${i}`} className="activity-row">
                <div className="activity-dot" />
                <div className="activity-info">
                  <span className="activity-path">{formatPath(view.path)}</span>
                  <span className="activity-time">{formatRelativeTime(view.timestamp)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="chart-empty" style={{ padding: 'var(--sp-8)' }}>
              <div className="chart-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p>No activity yet</p>
              <span>Recent page visits will show here in real-time</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div className="card" style={{ marginTop: 'var(--sp-6)' }}>
        <div className="card-header">
          <h3 className="card-title">Quick Links</h3>
        </div>
        <div className="quick-links">
          <a href="/athletes" className="quick-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            Athletes
          </a>
          <a href="/latest-news" className="quick-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0V6" /><path d="M12 6h4" /><path d="M12 10h4" /><path d="M12 14h2" /></svg>
            News
          </a>
          <a href="/competitions" className="quick-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>
            Competitions
          </a>
          <a href="/rankings" className="quick-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
            Rankings
          </a>
          <a href="/photos" className="quick-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            Photos
          </a>
        </div>
      </div>
    </>
  );
}
