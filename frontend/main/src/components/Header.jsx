import { useEffect, useMemo, useRef, useState } from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import { navigate } from 'vike/client/router';
import { navLinks } from '../data/siteData';
import useFetch from '../hooks/useFetch';
import { getAthletes, getNews } from '../api';
import { useTheme } from '../hooks/ThemeContext';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const pageContext = usePageContext();
  const currentPath = pageContext?.urlPathname || '';
  const { data: athletes } = useFetch(getAthletes, []);
  const { data: newsArticles } = useFetch(getNews, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

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
            return (
              <li key={link.to}>
                <a
                  href={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={isActive ? 'active' : ''}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="nav-actions">
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
