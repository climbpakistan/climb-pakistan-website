import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import { navigate } from 'vike/client/router';
import { navLinks } from '../data/siteData';
import useFetch from '../hooks/useFetch';
import { getAthletes, getNews, getNotifications, getUnreadNotificationCount, markNotificationsRead } from '../api';
import { useTheme } from '../hooks/ThemeContext';
import { useCommunity } from '../hooks/CommunityContext';

// Compact relative time for the notification list.
function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function NotificationText({ n }) {
  const actor = n.actor ? `@${n.actor.username}` : 'Someone';
  switch (n.type) {
    case 'like':
      return <>{actor} liked your {n.postId ? 'post' : 'comment'}</>;
    case 'comment':
      return <>{actor} commented on your post</>;
    case 'reply':
      return <>{actor} replied to your comment</>;
    case 'follow':
      return <>{actor} started following you</>;
    case 'mention':
      return <>{actor} mentioned you in a {n.commentId ? 'comment' : 'post'}</>;
    default:
      return <>{actor} interacted with you</>;
  }
}

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, token, initializing, signOut } = useCommunity();
  const pageContext = usePageContext();
  const currentPath = pageContext?.urlPathname || '';
  const { data: athletes } = useFetch(getAthletes, []);
  const { data: newsArticles } = useFetch(getNews, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileMenuClosing, setProfileMenuClosing] = useState(false);
  const profileMenuTimerRef = useRef(null);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notifRef = useRef(null);

  // ── Notifications ──
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifBusy, setNotifBusy] = useState(false);

  // Close the notifications dropdown on outside click.
  useEffect(() => {
    function onClick(e) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [notifOpen]);

  // Poll the unread badge while logged in (every 30s).
  useEffect(() => {
    if (!user || !token) { setUnreadCount(0); return undefined; }
    let active = true;
    const fetchCount = () => {
      getUnreadNotificationCount(token)
        .then((d) => { if (active) setUnreadCount(d.count ?? 0); })
        .catch(() => {});
    };
    fetchCount();
    const timer = setInterval(fetchCount, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [user, token]);

  async function toggleNotif() {
    if (!notifOpen) {
      setNotifOpen(true);
      setNotifBusy(true);
      try {
        const [list] = await Promise.all([
          getNotifications(token, { limit: 20 }),
          markNotificationsRead(token),
        ]);
        setNotifications(list.notifications || []);
        setUnreadCount(0);
      } catch {
        // leave as-is; user can retry by reopening
      } finally {
        setNotifBusy(false);
      }
    } else {
      setNotifOpen(false);
    }
  }

  // Animate profile dropdown close
  const closeProfileMenu = useCallback(() => {
    if (!profileMenuOpen) return;
    setProfileMenuClosing(true);
    profileMenuTimerRef.current = setTimeout(() => {
      setProfileMenuOpen(false);
      setProfileMenuClosing(false);
    }, 160); // matches CSS duration
  }, [profileMenuOpen]);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(profileMenuTimerRef.current), []);

  // Close the search dropdown on outside click.
  useEffect(() => {
    function onClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Close dropdown on outside click.
  useEffect(() => {
    function onClick(e) {
      if (openDropdown === null) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [openDropdown]);

  // Close profile menu on outside click.
  useEffect(() => {
    function onClick(e) {
      if (!profileMenuOpen || profileMenuClosing) return;
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        closeProfileMenu();
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [profileMenuOpen, profileMenuClosing, closeProfileMenu]);



  // Close mobile menu on route change would need location; simplest is to
  // close it whenever a link inside it is clicked (handled inline below).

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !athletes || !newsArticles) return { athletes: [], news: [] };
    return {
      athletes: athletes.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 4),
      news: newsArticles.filter((n) => n.title.toLowerCase().includes(q)).slice(0, 4),
    };
  }, [query, athletes, newsArticles]);

  const hasResults = results.athletes.length > 0 || results.news.length > 0;

  function goTo(path) {
    setSearchOpen(false);
    setQuery('');
    setMenuOpen(false);
    closeProfileMenu();
    navigate(path);
  }

  return (
    <header className="site-header">
      <nav className="nav container">
        <a href="/" className="nav-logo" onClick={() => setMenuOpen(false)}>
          <span className="logo-climb">Climb</span>&nbsp;<span className="logo-pakistan">Pakistan</span>
        </a>

        <ul className={`nav-links${menuOpen ? ' is-open' : ''}`} id="navLinks">
          {navLinks.map((link) => {
            const isActive = link.to === '/' ? currentPath === '/' : currentPath.startsWith(link.to + '/') || currentPath === link.to;
            const hasChildren = link.children && link.children.length > 0;
            const isDropdownOpen = openDropdown === link.to;
            return (
              <li
                key={link.to}
                className={hasChildren ? 'nav-item--with-dropdown' : ''}
                onMouseEnter={() => hasChildren && setOpenDropdown(link.to)}
                onMouseLeave={() => hasChildren && setOpenDropdown(null)}
                ref={hasChildren ? dropdownRef : undefined}
              >
                <a
                  href={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`${isActive ? 'active' : ''}${hasChildren ? ' nav-link--has-children' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-haspopup={hasChildren ? 'true' : undefined}
                  aria-expanded={hasChildren ? isDropdownOpen : undefined}
                >
                  {link.label}
                  {hasChildren && (
                    <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  )}
                </a>
                {hasChildren && isDropdownOpen && (
                  <div className="nav-dropdown">
                    {link.children.map((child) => {
                      const isChildActive = child.to === '/' ? currentPath === '/' : currentPath.startsWith(child.to + '/') || currentPath === child.to;
                      return (
                        <a
                          key={child.to}
                          href={child.to}
                          className={`nav-dropdown-item${isChildActive ? ' active' : ''}`}
                          onClick={() => { setMenuOpen(false); setOpenDropdown(null); }}
                        >
                          {child.label}
                          {child.badge && (
                            <span className="nav-dropdown-badge">{child.badge}</span>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}

          <li className="nav-item--community">
            <a
              href="/community"
              className={`btn btn-primary nav-auth-btn nav-community-btn${currentPath.startsWith('/community') ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Community
            </a>
          </li>
        </ul>

        <div className="nav-actions">
          {/* Notification bell — hides while the stored session validates */}
          {!initializing && user && (
            <div className="nav-notif" ref={notifRef}>
              <button
                className="nav-notif-btn"
                type="button"
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                aria-expanded={notifOpen}
                onClick={toggleNotif}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="nav-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <div className="nav-notif-dropdown">
                  <div className="nav-notif-head">
                    <span className="nav-notif-title">Notifications</span>
                  </div>
                  <div className="nav-notif-list">
                    {notifBusy ? (
                      <p className="nav-notif-empty">Loading…</p>
                    ) : notifications.length === 0 ? (
                      <p className="nav-notif-empty">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => {
                        const href = n.postId
                          ? `/community/post/${n.postId}`
                          : (n.actor ? `/community/u/${n.actor.username}` : '#');
                        return (
                          <a
                            key={n.id}
                            href={href}
                            className="nav-notif-item"
                            onClick={() => setNotifOpen(false)}
                          >
                            {n.actor?.profileImageUrl ? (
                              <img src={n.actor.profileImageUrl} alt="" className="nav-notif-avatar" />
                            ) : (
                              <span className="nav-notif-avatar nav-notif-avatar--fallback">
                                {(n.actor?.username || '?')[0].toUpperCase()}
                              </span>
                            )}
                            <span className="nav-notif-body">
                              <span className="nav-notif-text"><NotificationText n={n} /></span>
                              <span className="nav-notif-time">{timeAgo(n.createdAt)}</span>
                            </span>
                          </a>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Community account menu — hides while the stored session validates */}
          {!initializing && user && (
            <div className="nav-auth" ref={profileMenuRef}>
              <button
                className="nav-auth-profile-btn"
                type="button"
                onClick={() => (profileMenuOpen ? closeProfileMenu() : setProfileMenuOpen(true))}
                aria-label="User menu"
                aria-expanded={profileMenuOpen}
              >
                {user.profileImageUrl ? (
                  <img className="nav-auth-avatar" src={user.profileImageUrl} alt="" />
                ) : (
                  <span className="nav-auth-avatar nav-auth-avatar--fallback">
                    {(user.username || user.name || '?')[0].toUpperCase()}
                  </span>
                )}
              </button>
              {profileMenuOpen && (
                <div className={`nav-profile-dropdown${profileMenuClosing ? ' nav-profile-dropdown--closing' : ''}`}>
                  <a
                    href={`/community/u/${user.username || user.name}`}
                    className="nav-profile-dropdown-item"
                    onClick={() => { setProfileMenuOpen(false); setProfileMenuClosing(false); setMenuOpen(false); }}
                  >
                    Your Profile
                  </a>
                  <button
                    type="button"
                    className="nav-profile-dropdown-item nav-profile-dropdown-item--danger"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setProfileMenuClosing(false);
                      signOut();
                      setMenuOpen(false);
                      navigate('/community/feed');
                    }}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle light and dark mode"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>

          <div className="nav-search" ref={searchRef}>
            <button
              className="search-toggle"
              aria-label="Search athletes and news"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
            {searchOpen && (
              <div className="search-dropdown" id="searchDropdown">
                <div className="search-input-wrap">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search athletes, news…"
                    autoComplete="off"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="search-results">
                  {query.trim() === '' && (
                    <p className="search-empty">Start typing to search athletes and news.</p>
                  )}
                  {query.trim() !== '' && !hasResults && (
                    <p className="search-empty">No results for "{query}".</p>
                  )}
                  {results.athletes.length > 0 && (
                    <div className="search-group">
                      <span className="search-group-label">Athletes</span>
                      {results.athletes.map((a) => (
                        <button key={a.slug} className="search-result" onClick={() => goTo(`/athletes/${a.slug}`)}>
                          {a.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {results.news.length > 0 && (
                    <div className="search-group">
                      <span className="search-group-label">News</span>
                      {results.news.map((n) => (
                        <button key={n.slug} className="search-result" onClick={() => goTo(`/news/${n.slug}`)}>
                          {n.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="navLinks"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>
    </header>
  );
}
