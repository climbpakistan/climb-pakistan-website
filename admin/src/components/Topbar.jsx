import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const pageTitleMap = {
  '/': 'Dashboard',
  '/main': 'Main Page',
  '/latest-news': 'Latest News',
  '/athletes': 'Athletes',
  '/rankings': 'Rankings',
  '/competitions': 'Competitions',
  '/learn-climbing': 'Learn Climbing',
  '/about': 'About',
  '/contact': 'Contact',
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const pageTitle = pageTitleMap[location.pathname] || 'Dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-page-title">{pageTitle}</h2>
      </div>

      <div className="topbar-right">
        {/* Theme toggle */}
        <button className="topbar-btn" type="button" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* Logout */}
        <button className="topbar-btn" type="button" onClick={handleLogout} title="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>

        {/* User avatar */}
        <div className="topbar-avatar" title={user?.email}>
          {user?.name?.charAt(0) || 'A'}
        </div>
      </div>
    </header>
  );
}
