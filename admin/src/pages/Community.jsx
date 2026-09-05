import { useState, useEffect } from 'react';
import {
  getCommunitySummary,
  getCommunityUsers,
  getModerationPosts,
  getModerationComments,
  getCommunityReports,
  setReportStatus,
  removeContent,
  restoreContent,
  deleteModerationPost,
  getAthletes,
  setVerification,
  setAthleteLink,
  warnUser,
  suspendUser,
  banUser,
  liftUser,
  deleteUser,
  getBadgeApplications,
  updateBadgeApplication,
} from '../api';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'posts', label: 'Posts' },
  { id: 'comments', label: 'Comments' },
  { id: 'reports', label: 'Reports' },
  { id: 'badges', label: 'Badge Apps' },
];

const POST_CATEGORIES = [
  'Questions', 'Training', 'Competition', 'Climbing Gear', 'Outdoor Climbing', 'News',
];

const POST_TYPES = ['text', 'image', 'link', 'poll'];

const VERIFICATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'official', label: 'Climb Pakistan Official' },
  { value: 'national', label: 'Verified National Climber' },
  { value: 'international', label: 'Verified International Sport Climber' },
  { value: 'organization', label: 'Verified Organization / Club' },
];

const ROLE_LABELS = {
  athlete: 'Athlete',
  coach: 'Coach',
  climbing_enthusiast: 'Climbing Enthusiast',
  gym_or_organization: 'Team & Organization',
};
const DISCIPLINE_LABELS = { speed: 'Speed', lead: 'Lead', bouldering: 'Bouldering' };
const EXPERIENCE_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', professional: 'Professional' };
const BADGE_STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

const STATUS_LABELS = { active: 'Active', suspended: 'Suspended', banned: 'Banned' };

const REPORT_BADGE = { pending: 'badge-warning', reviewed: 'badge-info', dismissed: 'badge-info', actioned: 'badge-success' };

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://climbpakistan.com';

const VERIFICATION_LABELS = {
  official: 'Climb Pakistan Official',
  national: 'Verified National Climber',
  international: 'Verified International Sport Climber',
  organization: 'Verified Organization / Club',
};

function VerificationBadge({ verification }) {
  if (!verification || verification === 'none') {
    return <span className="text-muted">None</span>;
  }
  const label = VERIFICATION_LABELS[verification] || verification;
  return (
    <span className={`verification-badge verification-${verification}`}>
      {label}
      <span className="verification-check">{'\u2713'}</span>
    </span>
  );
}

function StatusBadge({ status }) {
  const cls = status === 'active' ? 'badge-success' : status === 'suspended' ? 'badge-warning' : 'badge-danger';
  return <span className={`badge ${cls}`}>{STATUS_LABELS[status] || status}</span>;
}

function Avatar({ user, size = 34 }) {
  return user?.profileImageUrl ? (
    <img
      src={user.profileImageUrl}
      alt={user?.username || 'user'}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <span
      className="avatar-placeholder"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {user?.username?.charAt(0)?.toUpperCase() || '?'}
    </span>
  );
}

function Notice({ kind, children }) {
  if (!children) return null;
  return <div className={`notice ${kind}`}>{children}</div>;
}

function Pagination({ page, total, pageSize, onPage, loading }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <button className="btn btn-outline" type="button" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span className="pagination-info">
        Page {page} of {totalPages} · {total} total
      </span>
      <button className="btn btn-outline" type="button" disabled={page >= totalPages || loading} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}

function useAthletes() {
  const [athletes, setAthletes] = useState([]);
  useEffect(() => {
    getAthletes()
      .then((data) => setAthletes(data.athletes || data || []))
      .catch(() => setAthletes([]));
  }, []);
  return athletes;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(value) {
  if (!value) return '';
  const d = new Date(value);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Overview ────────────────────────────────────────────────
function OverviewTab({ stats }) {
  const cards = [
    { label: 'Total Users', value: stats?.totalUsers, sub: 'Community members' },
    { label: 'Total Posts', value: stats?.totalPosts, sub: 'Published posts' },
    { label: 'Total Comments', value: stats?.totalComments, sub: 'All comments' },
    { label: 'Pending Reports', value: stats?.pendingReports, sub: 'Awaiting review' },
  ];
  return (
    <div className="stats-grid">
      {cards.map((c) => (
        <div className="stat-card" key={c.label}>
          <div className="stat-label">{c.label}</div>
          <div className="stat-value">{c.value === undefined ? '...' : c.value?.toLocaleString?.() ?? c.value}</div>
          <div className="stat-change positive">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// Shared "manage a user" modal (verification, athlete link, restrictions).
function UserManageModal({ user, athletes, onRefresh, onClose }) {
  const [verification, setVerificationValue] = useState(user.verification || 'none');
  const [athleteId, setAthleteId] = useState(user.athlete ? user.athlete.id : '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    if (onRefresh) await onRefresh();
  }

  async function run(fn, successMsg, opts) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await fn(user.id, opts);
      setNotice(successMsg);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Manage @{user.username}</h3>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        </div>

        <Notice kind="error">{error}</Notice>
        <Notice kind="success">{notice}</Notice>

        <div className="modal-meta">
          <StatusBadge status={user.accountStatus || 'active'} />
          {user.createdAt && <span> · Joined {formatDate(user.createdAt)}</span>}
        </div>

        <div style={{ textAlign: 'right', marginBottom: 'var(--sp-2)' }}>
          <a className="btn btn-ghost btn-xs" href={`${FRONTEND_URL}/community/u/@${user.username}`} target="_blank" rel="noreferrer">
            View profile →
          </a>
        </div>

        <div className="form-group">
          <label className="form-label">Verification</label>
          <select className="form-input" value={verification} onChange={(e) => setVerificationValue(e.target.value)} style={{ maxWidth: 300 }}>
            {VERIFICATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="btn-row">
            <button className="btn btn-primary" type="button" disabled={saving || verification === (user.verification || 'none')} onClick={() => run((uid) => setVerification(uid, verification), 'Verification updated.')}>
              Save verification
            </button>
            {user.verification && user.verification !== 'none' && (
              <button className="btn btn-outline" type="button" disabled={saving} onClick={() => run((uid) => setVerification(uid, 'none'), 'Verification removed.')}>
                Remove verification
              </button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Connected athlete profile</label>
          <select className="form-input" value={athleteId} onChange={(e) => setAthleteId(e.target.value)} style={{ maxWidth: 300 }}>
            <option value="">— None —</option>
            {athletes.filter((a) => a && a._id).map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
          <div className="btn-row">
            <button className="btn btn-primary" type="button" disabled={saving || athleteId === (user.athlete ? user.athlete.id : '')} onClick={() => run((uid) => setAthleteLink(uid, athleteId || null), athleteId ? 'Athlete profile connected.' : 'Athlete profile disconnected.')}>
              {athleteId ? 'Connect / change athlete' : 'Disconnect athlete'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Reason for warning / suspension / ban</label>
          <textarea className="form-input" rows="2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason visible to the user / audit log..." />
          <div className="btn-row">
            <button className="btn btn-outline" type="button" disabled={saving} onClick={() => run((uid, r) => warnUser(uid, r), 'Warning recorded.', reason)}>Warn</button>
            <button className="btn btn-outline" type="button" disabled={saving} onClick={() => run((uid, r) => suspendUser(uid, r), 'User suspended.', reason)}>Suspend</button>
            <button className="btn btn-danger" type="button" disabled={saving} onClick={() => run((uid, r) => banUser(uid, r), 'User banned.', reason)}>Ban</button>
            {user.accountStatus && user.accountStatus !== 'active' && (
              <button className="btn btn-primary" type="button" disabled={saving} onClick={() => run((uid) => liftUser(uid), 'Restriction lifted.')}>Lift restriction</button>
            )}
          </div>
        </div>

        {/* Delete user section */}
        <div className="form-group" style={{ borderTop: '1px solid var(--cp-border)', paddingTop: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
          <label className="form-label" style={{ color: 'var(--cp-danger, #e5484d)' }}>Danger Zone</label>
          <p className="text-muted" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-2)' }}>
            Permanently delete this user and all their content. This action cannot be undone.
          </p>
          <button
            className="btn btn-danger"
            type="button"
            disabled={saving}
            onClick={async () => {
              const ok = window.confirm(`Are you sure you want to permanently delete @${user.username}? This will remove all their posts, comments, and account data. This action cannot be undone.`);
              if (!ok) return;
              setSaving(true);
              setError('');
              setNotice('');
              try {
                await deleteUser(user.id);
                setNotice('User deleted.');
                await refresh();
                onClose();
              } catch (err) {
                setError(err.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            Delete Account
          </button>
        </div>

        {saving && <p className="text-muted">Working...</p>}
      </div>
    </div>
  );
}

// ── Users ───────────────────────────────────────────────────
function UsersTab() {
  const [search, setSearch] = useState('');
  const [searched, setSearched] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [active, setActive] = useState(null);
  const athletes = useAthletes();

  async function load(nextPage = 1, query = searched) {
    setLoading(true);
    setError('');
    try {
      const data = await getCommunityUsers({ search: query || undefined, page: nextPage, limit: 20 });
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let activeRun = true;
    setLoading(true);
    getCommunityUsers({ page: 1, limit: 20 })
      .then((data) => {
        if (!activeRun) return;
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setLoading(false);
      })
      .catch((err) => {
        if (activeRun) { setError(err.message); setLoading(false); }
      });
    return () => { activeRun = false; };
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    setSearched(search);
    load(1, search);
  }

  async function refresh() {
    await load(page, searched);
    const data = await getCommunityUsers({ search: searched || undefined, page, limit: 20 });
    const fresh = (data.users || []).find((u) => u.id === active?.id);
    if (fresh) setActive(fresh);
  }

  return (
    <>
      <div className="filter-bar">
        <form onSubmit={handleSearch} className="filter-form">
          <input
            className="form-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, name or email..."
            style={{ maxWidth: 360 }}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>Search</button>
        </form>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Disciplines</th>
              <th>Experience</th>
              <th>Verification</th>
              <th>Joined</th>
              <th>Status</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="table-empty">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="9" className="table-empty">No users found.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="cell-user">
                    <Avatar user={u} />
                    <div>
                      <div className="cell-strong">@{u.username}</div>
                      {u.name ? <div className="cell-sub">{u.name}</div> : null}
                    </div>
                  </div>
                </td>
                <td>{u.email || '—'}</td>
                <td>{ROLE_LABELS[u.communityRole] || '—'}</td>
                <td>{u.disciplines && u.disciplines.length > 0 ? u.disciplines.map((d) => DISCIPLINE_LABELS[d] || d).join(', ') : '—'}</td>
                <td>{EXPERIENCE_LABELS[u.experienceLevel] || '—'}</td>
                <td><VerificationBadge verification={u.verification} /></td>
                <td>{formatDate(u.createdAt)}</td>
                <td><StatusBadge status={u.accountStatus} /></td>
                <td className="col-actions">
                  <div className="cell-actions">
                    <a className="btn btn-ghost btn-xs" href={`${FRONTEND_URL}/community/u/@${u.username}`} target="_blank" rel="noreferrer">
                      View
                    </a>
                    <button className="btn btn-outline btn-xs" type="button" onClick={() => { setActive(u); setError(''); setNotice(''); }}>Manage</button>
                    {u.username !== 'admin' && (
                      <button
                        className="btn btn-danger btn-xs"
                        type="button"
                        onClick={async () => {
                          const ok = window.confirm(`Delete @${u.username} and all their content? This cannot be undone.`);
                          if (!ok) return;
                          try {
                            await deleteUser(u.id);
                            setNotice(`@${u.username} deleted.`);
                            await load(page, searched);
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && total > 20 && <Pagination page={page} total={total} pageSize={20} onPage={(p) => load(p, searched)} loading={loading} />}

      <Notice kind="error">{error}</Notice>
      <Notice kind="success">{notice}</Notice>

      {active && (
        <UserManageModal
          user={active}
          athletes={athletes}
          onRefresh={refresh}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}

// ── Posts ───────────────────────────────────────────────────
function PostsTab() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [searched, setSearched] = useState('');
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function load(nextPage = 1) {
    setLoading(true);
    setError('');
    try {
      const data = await getModerationPosts({
        search: searched || undefined, category: category || undefined,
        type: type || undefined, status: status || undefined, page: nextPage, limit: 20,
      });
      setPosts(data.posts || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let activeRun = true;
    setLoading(true);
    getModerationPosts({ page: 1, limit: 20 })
      .then((data) => {
        if (!activeRun) return;
        setPosts(data.posts || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setLoading(false);
      })
      .catch((err) => {
        if (activeRun) { setError(err.message); setLoading(false); }
      });
    return () => { activeRun = false; };
  }, []);

  function applyFilters(e) {
    if (e) e.preventDefault();
    setSearched(search);
    load(1);
  }

  function changeFilter(setter, value) {
    setter(value);
    setSearched(search);
    load(1);
  }

  async function run(fn, post, successMsg) {
    setBusyId(post.id);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(successMsg);
      await load(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p) {
    const ok = window.confirm(`Remove post "${p.title}"? It will be hidden from users but kept for review.`);
    if (!ok) return;
    await run(() => removeContent('post', p.id), p, 'Post removed.');
  }
  async function restore(p) {
    await run(() => restoreContent('post', p.id), p, 'Post restored.');
  }
  async function deletePermanent(p) {
    const ok = window.confirm(`Permanently delete post "${p.title}"? This is IRREVERSIBLE and removes it, all its comments and votes.`);
    if (!ok) return;
    await run(() => deleteModerationPost(p.id), p, 'Post permanently deleted.');
  }

  return (
    <>
      <div className="filter-bar">
        <form onSubmit={applyFilters} className="filter-form">
          <input className="form-input" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or body..." style={{ maxWidth: 220 }} />
          <select className="form-input" value={category} onChange={(e) => changeFilter(setCategory, e.target.value)} style={{ maxWidth: 170 }}>
            <option value="">All categories</option>
            {POST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-input" value={type} onChange={(e) => changeFilter(setType, e.target.value)} style={{ maxWidth: 130 }}>
            <option value="">All types</option>
            {POST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="form-input" value={status} onChange={(e) => changeFilter(setStatus, e.target.value)} style={{ maxWidth: 130 }}>
            <option value="">All statuses</option>
            <option value="live">Live</option>
            <option value="removed">Removed</option>
          </select>
          <button className="btn btn-primary" type="submit" disabled={loading}>Search</button>
        </form>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Post</th>
              <th>Author</th>
              <th>Category</th>
              <th>Type</th>
              <th>Created</th>
              <th>Votes</th>
              <th>Comments</th>
              <th>Status</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="table-empty">Loading posts...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan="9" className="table-empty">No posts found.</td></tr>
            ) : posts.map((p) => (
              <tr key={p.id} className={p.removed ? 'row-removed' : undefined}>
                <td>
                  <div className="cell-strong">{p.title || '(untitled)'}</div>
                  {p.body ? <div className="cell-sub cell-truncate" style={{ maxWidth: 260 }}>{p.body}</div> : null}
                </td>
                <td>
                  <div className="cell-user">
                    <Avatar user={p.author} size={26} />
                    <div className="cell-strong">@{p.author?.username || 'unknown'}</div>
                  </div>
                </td>
                <td>{p.category}</td>
                <td><span className="badge badge-info">{p.type}</span></td>
                <td>{formatDate(p.createdAt)}</td>
                <td>▲ {p.upvoteCount} · ▼ {p.downvoteCount}</td>
                <td>{p.commentCount}</td>
                <td>{p.removed ? <span className="badge badge-danger">Removed</span> : <span className="badge badge-success">Live</span>}</td>
                <td className="col-actions">
                  <div className="cell-actions">
                    <a className="btn btn-ghost btn-xs" href={`${FRONTEND_URL}/community/post/${p.id}`} target="_blank" rel="noreferrer">View</a>
                    {!p.removed ? (
                      <button className="btn btn-outline btn-xs" type="button" disabled={busyId === p.id} onClick={() => remove(p)}>Remove</button>
                    ) : (
                      <button className="btn btn-outline btn-xs" type="button" disabled={busyId === p.id} onClick={() => restore(p)}>Restore</button>
                    )}
                    <button className="btn btn-danger btn-xs" type="button" disabled={busyId === p.id} onClick={() => deletePermanent(p)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && total > 20 && <Pagination page={page} total={total} pageSize={20} onPage={(p) => load(p)} loading={loading} />}

      <Notice kind="error">{error}</Notice>
      <Notice kind="success">{notice}</Notice>
    </>
  );
}

// ── Comments ────────────────────────────────────────────────
function CommentsTab() {
  const [search, setSearch] = useState('');
  const [searched, setSearched] = useState('');
  const [page, setPage] = useState(1);
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function load(nextPage = 1) {
    setLoading(true);
    setError('');
    try {
      const data = await getModerationComments({ search: searched || undefined, page: nextPage, limit: 20 });
      setComments(data.comments || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let activeRun = true;
    setLoading(true);
    getModerationComments({ page: 1, limit: 20 })
      .then((data) => {
        if (!activeRun) return;
        setComments(data.comments || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setLoading(false);
      })
      .catch((err) => {
        if (activeRun) { setError(err.message); setLoading(false); }
      });
    return () => { activeRun = false; };
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    setSearched(search);
    load(1);
  }

  async function run(fn, c, successMsg) {
    setBusyId(c.id);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(successMsg);
      await load(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="filter-bar">
        <form onSubmit={handleSearch} className="filter-form">
          <input className="form-input" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search comment text..." style={{ maxWidth: 360 }} />
          <button className="btn btn-primary" type="submit" disabled={loading}>Search</button>
        </form>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Comment</th>
              <th>Author</th>
              <th>Post</th>
              <th>Created</th>
              <th>Votes</th>
              <th>Status</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="table-empty">Loading comments...</td></tr>
            ) : comments.length === 0 ? (
              <tr><td colSpan="7" className="table-empty">No comments found.</td></tr>
            ) : comments.map((c) => (
              <tr key={c.id} className={c.removed ? 'row-removed' : undefined}>
                <td><div className="cell-truncate" style={{ maxWidth: 300 }}>{c.body}</div></td>
                <td>
                  <div className="cell-user">
                    <Avatar user={c.author} size={26} />
                    <div className="cell-strong">@{c.author?.username || 'unknown'}</div>
                  </div>
                </td>
                <td>
                  {c.post ? (
                    <a className="text-link cell-truncate" style={{ display: 'inline-block', maxWidth: 200 }} href={`${FRONTEND_URL}/community/post/${c.post.id}`} target="_blank" rel="noreferrer">
                      {c.post.title || '(untitled)'}
                    </a>
                  ) : '—'}
                </td>
                <td>{formatDate(c.createdAt)}</td>
                <td>▲ {c.upvoteCount} · ▼ {c.downvoteCount}</td>
                <td>{c.removed ? <span className="badge badge-danger">Removed</span> : <span className="badge badge-success">Live</span>}</td>
                <td className="col-actions">
                  <div className="cell-actions">
                    <a className="btn btn-ghost btn-xs" href={`${FRONTEND_URL}/community/post/${c.post?.id}`} target="_blank" rel="noreferrer">View</a>
                    {!c.removed ? (
                      <button className="btn btn-outline btn-xs" type="button" disabled={busyId === c.id} onClick={() => run(() => removeContent('comment', c.id), c, 'Comment removed.')}>Remove</button>
                    ) : (
                      <button className="btn btn-outline btn-xs" type="button" disabled={busyId === c.id} onClick={() => run(() => restoreContent('comment', c.id), c, 'Comment restored.')}>Restore</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && total > 20 && <Pagination page={page} total={total} pageSize={20} onPage={(p) => load(p)} loading={loading} />}

      <Notice kind="error">{error}</Notice>
      <Notice kind="success">{notice}</Notice>
    </>
  );
}

// ── Reports ─────────────────────────────────────────────────
const REPORT_STATUSES = ['pending', 'reviewed', 'dismissed', 'actioned'];

function ReportsTab() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [modUser, setModUser] = useState(null);
  const athletes = useAthletes();

  async function load(nextPage = 1, st = status) {
    setLoading(true);
    setError('');
    try {
      const data = await getCommunityReports({ status: st || undefined, page: nextPage, limit: 20 });
      setReports(data.reports || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let activeRun = true;
    setLoading(true);
    getCommunityReports({ status: 'pending', page: 1, limit: 20 })
      .then((data) => {
        if (!activeRun) return;
        setReports(data.reports || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setLoading(false);
      })
      .catch((err) => {
        if (activeRun) { setError(err.message); setLoading(false); }
      });
    return () => { activeRun = false; };
  }, []);

  async function run(fn, report, successMsg) {
    setBusyId(report ? report.id : 'all');
    setError('');
    setNotice('');
    try {
      await fn();
      if (successMsg) setNotice(successMsg);
      await load(page, status);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="filter-bar">
        <div className="filter-form" style={{ alignItems: 'center' }}>
          <select
            className="form-input"
            value={status}
            onChange={(e) => { setStatus(e.target.value); load(1, e.target.value); }}
            style={{ maxWidth: 200 }}
          >
            <option value="">All statuses</option>
            {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>{total} report{total === 1 ? '' : 's'}</span>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Loading reports...</p>
      ) : reports.length === 0 ? (
        <div className="card card-pad"><p className="text-muted">No reports to show for this filter.</p></div>
      ) : (
        reports.map((report) => {
          const removed = report.target && report.target.removed;
          const pending = report.status === 'pending';
          return (
            <div className={`card report-card ${pending ? 'report-pending' : ''}`} key={report.id}>
              <div className="card-header">
                <h3 className="card-title">
                  {report.reason || 'Report'}
                  <span className={`badge ${REPORT_BADGE[report.status] || 'badge-info'}`}>{report.status}</span>
                  {pending && <span className="badge badge-warning">Pending</span>}
                </h3>
                <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>{timeAgo(report.createdAt)}</span>
              </div>

              <div className="text-muted" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-2)' }}>
                Reported by <strong>@{report.reporter?.username}</strong>
                {report.handledBy ? ` · handled by @${report.handledBy}` : ''}
                {report.actionTaken ? ` · action: ${report.actionTaken}` : ''}
              </div>

              {report.details && (
                <div className="report-details"><strong>Details:</strong> {report.details}</div>
              )}

              <div className="report-content">
                <div className="report-content-label">
                  Reported {report.targetType === 'post' ? 'post' : 'comment'}
                  {removed ? ' (currently removed)' : ''}
                </div>
                {report.targetType === 'post' ? (
                  <>
                    <div className="report-content-title">{report.target?.title}</div>
                    {report.target?.body && <div className="report-content-body">{report.target?.body}</div>}
                  </>
                ) : (
                  <>
                    <div className="report-content-body">{report.target?.body}</div>
                    <a className="text-link" style={{ fontSize: 'var(--fs-sm)', display: 'inline-block', marginTop: 'var(--sp-1)' }} href={`${FRONTEND_URL}/community/post/${report.target?.postId}`} target="_blank" rel="noreferrer">
                      View comment's post →
                    </a>
                  </>
                )}
                {report.target?.author && (
                  <div className="report-content-author">
                    By <strong>@{report.target.author.username}</strong> <StatusBadge status={report.target.author.accountStatus} />
                    {report.target.author.verification !== 'none' ? ` (${report.target.author.verification} verified)` : ''}
                  </div>
                )}
              </div>

              <div className="btn-row">
                {report.target && !removed ? (
                  <button className="btn btn-danger" type="button" disabled={busyId === report.id} onClick={() => run(async () => {
                    await removeContent(report.targetType, report.target.id);
                    await setReportStatus(report.id, 'actioned', 'removed');
                  }, report, '')}>
                    {busyId === report.id ? 'Working...' : 'Remove content'}
                  </button>
                ) : report.target && removed ? (
                  <button className="btn btn-outline" type="button" disabled={busyId === report.id} onClick={() => run(async () => {
                    await restoreContent(report.targetType, report.target.id);
                    await setReportStatus(report.id, 'actioned', 'restored');
                  }, report, '')}>
                    Restore content
                  </button>
                ) : null}
                <button className="btn btn-outline" type="button" disabled={busyId === report.id || report.status === 'dismissed'} onClick={() => run(() => setReportStatus(report.id, 'dismissed'), report, 'Report dismissed.')}>
                  Dismiss
                </button>
                <button className="btn btn-outline" type="button" disabled={busyId === report.id || report.status === 'reviewed'} onClick={() => run(() => setReportStatus(report.id, 'reviewed'), report, 'Report marked reviewed.')}>
                  Mark reviewed
                </button>
                {report.target?.author?.id && (
                  <button className="btn btn-outline" type="button" onClick={() => { setModUser(report.target.author); setError(''); setNotice(''); }}>Moderate author</button>
                )}
              </div>
            </div>
          );
        })
      )}

      {!loading && total > 20 && <Pagination page={page} total={total} pageSize={20} onPage={(p) => load(p, status)} loading={loading} />}

      <Notice kind="error">{error}</Notice>
      <Notice kind="success">{notice}</Notice>

      {modUser && (
        <UserManageModal
          user={modUser}
          athletes={athletes}
          onRefresh={() => load(page, status)}
          onClose={() => setModUser(null)}
        />
      )}
    </>
  );
}

// ── Badge Applications ──────────────────────────────────────
function BadgeApplicationsTab() {
  const [status, setStatus] = useState('pending');
  const [badgeType, setBadgeType] = useState('');
  const [page, setPage] = useState(1);
  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [notesModal, setNotesModal] = useState(null); // { id, status }
  const [notes, setNotes] = useState('');

  async function load(nextPage = 1) {
    setLoading(true);
    setError('');
    try {
      const data = await getBadgeApplications({
        status: status || undefined,
        badgeType: badgeType || undefined,
        page: nextPage,
        limit: 20,
      });
      setApplications(data.applications || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, [status, badgeType]);

  async function handleAction(appId, actionStatus) {
    setBusyId(appId);
    setError('');
    setNotice('');
    try {
      await updateBadgeApplication(appId, { status: actionStatus, adminNotes: notes });
      setNotice(`Application ${actionStatus}.`);
      setNotesModal(null);
      setNotes('');
      await load(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="filter-bar">
        <div className="filter-form" style={{ alignItems: 'center' }}>
          <select
            className="form-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ maxWidth: 170 }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            className="form-input"
            value={badgeType}
            onChange={(e) => setBadgeType(e.target.value)}
            style={{ maxWidth: 170 }}
          >
            <option value="">All badge types</option>
            <option value="national">National</option>
            <option value="international">International</option>
          </select>
          <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>{total} application{total === 1 ? '' : 's'}</span>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Loading applications...</p>
      ) : applications.length === 0 ? (
        <div className="card card-pad"><p className="text-muted">No badge applications to show.</p></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Badge Type</th>
                <th>Message</th>
                <th>Status</th>
                <th>Applied</th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="cell-user">
                      <Avatar user={a.user} size={26} />
                      <div>
                        <div className="cell-strong">@{a.user?.username || 'unknown'}</div>
                        <div className="cell-sub">{a.user?.name || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-info">{a.badgeType}</span></td>
                  <td><div className="cell-truncate" style={{ maxWidth: 200 }}>{a.message || '—'}</div></td>
                  <td><span className={`badge ${BADGE_STATUS_LABELS[a.status] === 'Approved' ? 'badge-success' : a.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{BADGE_STATUS_LABELS[a.status] || a.status}</span></td>
                  <td>{formatDate(a.createdAt)}</td>
                  <td className="col-actions">
                    <div className="cell-actions">
                      {a.user && (
                        <a className="btn btn-ghost btn-xs" href={`${FRONTEND_URL}/community/u/@${a.user.username}`} target="_blank" rel="noreferrer">Profile</a>
                      )}
                      {a.status === 'pending' && (
                        <>
                          <button className="btn btn-primary btn-xs" type="button" disabled={busyId === a.id} onClick={() => { setNotesModal({ id: a.id, status: 'approved' }); setNotes(''); }}>Approve</button>
                          <button className="btn btn-danger btn-xs" type="button" disabled={busyId === a.id} onClick={() => { setNotesModal({ id: a.id, status: 'rejected' }); setNotes(''); }}>Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 20 && <Pagination page={page} total={total} pageSize={20} onPage={(p) => load(p)} loading={loading} />}

      <Notice kind="error">{error}</Notice>
      <Notice kind="success">{notice}</Notice>

      {notesModal && (
        <div className="modal-overlay" onClick={() => setNotesModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{notesModal.status === 'approved' ? 'Approve' : 'Reject'} Application</h3>
              <button className="btn btn-ghost" type="button" onClick={() => setNotesModal(null)}>Close</button>
            </div>
            <div className="form-group">
              <label className="form-label">Admin notes (optional)</label>
              <textarea className="form-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for approval/rejection..." />
            </div>
            <div className="btn-row">
              <button
                className={notesModal.status === 'approved' ? 'btn btn-primary' : 'btn btn-danger'}
                type="button"
                disabled={busyId === notesModal.id}
                onClick={() => handleAction(notesModal.id, notesModal.status)}
              >
                {busyId === notesModal.id ? 'Working...' : notesModal.status === 'approved' ? 'Approve' : 'Reject'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setNotesModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Page ────────────────────────────────────────────────────
export default function Community() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (tab !== 'overview') return;
    let activeRun = true;
    getCommunitySummary()
      .then((data) => { if (activeRun) setStats(data); })
      .catch(() => {});
    return () => { activeRun = false; };
  }, [tab]);

  return (
    <>
      <div className="page-header">
        <h1>Community Management</h1>
        <p>Overview of users, posts, comments, and reports across the Climb Pakistan community.</p>
      </div>

      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {tab === 'overview' && <OverviewTab stats={stats} />}
        {tab === 'users' && <UsersTab />}
        {tab === 'posts' && <PostsTab />}
        {tab === 'comments' && <CommentsTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'badges' && <BadgeApplicationsTab />}
      </div>
    </>
  );
}
