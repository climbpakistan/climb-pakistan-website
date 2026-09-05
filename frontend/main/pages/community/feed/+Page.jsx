import { useCallback, useEffect, useState } from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import Seo from '../../../src/components/Seo';
import PostCard from '../../../src/components/community/PostCard';
import VerificationBadge from '../../../src/components/community/VerificationBadge';
import { useCommunity } from '../../../src/hooks/CommunityContext';
import { communityTopics, feedSortTabs, topTimeFilters, FEED_PAGE_SIZE } from '../../../src/data/communityData';
import { getPosts, getMyVotes, getTopicCounts, searchCommunityUsers } from '../../../src/api';

export { Page };

function FeedShell({ children }) {
  return (
    <div className="container community-feed-layout">
      {children}
    </div>
  );
}

// Display cap for topic counts: show the real number up to 100, then 100+.
function formatCount(n) {
  if (n == null) return '';
  return n > 100 ? '100+' : String(n);
}

function TopicsSidebar({ activeCategory, counts }) {
  return (
    <aside className="community-topics-sidebar">
      <h2 className="community-topics-sidebar-title">Topics</h2>
      <ul className="community-topics-sidebar-list">
        <li className="community-topics-sidebar-item">
          <a href="/community/feed" className={`community-topics-sidebar-link${!activeCategory ? ' is-active' : ''}`}>
            <span>All Topics</span>
            {counts && <span className="community-topics-sidebar-count">{formatCount(counts.total)}</span>}
          </a>
        </li>
        {communityTopics.map((topic) => (
          <li key={topic} className="community-topics-sidebar-item">
            <a href={`/community/feed?category=${encodeURIComponent(topic)}`} className={`community-topics-sidebar-link${activeCategory === topic ? ' is-active' : ''}`}>
              <span>{topic}</span>
              {counts && <span className="community-topics-sidebar-count">{formatCount(counts.byCategory[topic])}</span>}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function PostSkeleton() {
  return (
    <div className="community-post-card" aria-hidden="true">
      <div className="community-post-skeleton-title"></div>
      <div className="community-post-skeleton-line"></div>
      <div className="community-post-skeleton-meta"></div>
    </div>
  );
}

function Page() {
  const pageContext = usePageContext();
  const { token, isGuest, openAuthPrompt } = useCommunity();

  // Merge the current user's votes into a list of posts so vote buttons
  // highlight correctly (batched — one request for the whole page).
  const withMyVotes = useCallback(async (list) => {
    if (isGuest || list.length === 0) return list;
    try {
      const data = await getMyVotes(token, { posts: list.map((p) => p.id) });
      const mine = data.posts || {};
      return list.map((p) => (mine[p.id] ? { ...p, myVote: mine[p.id] } : p));
    } catch {
      return list; // highlighting is best-effort
    }
  }, [token, isGuest]);

  // Active sort tab from the URL (?view=...).
  const searchView = pageContext?.urlParsed?.search?.view;
  const activeView = feedSortTabs.some((t) => t.value === searchView)
    ? searchView
    : 'popular';

  // Active Top time filter from the URL (?time=...). Only applies to Top.
  const searchTime = pageContext?.urlParsed?.search?.time;
  const activeTime = topTimeFilters.some((t) => t.value === searchTime)
    ? searchTime
    : 'all';

  // Active category filter from the URL (?category=...).
  const searchCategory = pageContext?.urlParsed?.search?.category;
  const activeCategory = searchCategory || '';

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('posts'); // 'posts' or 'users'
  const [searchResults, setSearchResults] = useState({ posts: [], users: [] });
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  // Post counts per topic for the sidebar ({ total, byCategory }).
  const [topicCounts, setTopicCounts] = useState(null);

  useEffect(() => {
    let active = true;
    getTopicCounts()
      .then((data) => {
        if (!active) return;
        const byCategory = {};
        for (const c of data.categories || []) byCategory[c.category] = c.count;
        setTopicCounts({ total: data.total || 0, byCategory });
      })
      .catch(() => { if (active) setTopicCounts(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getPosts(token, { view: activeView, time: activeTime, page: 1, limit: FEED_PAGE_SIZE, category: activeCategory })
      .then(async (data) => {
        if (!active) return;
        setPosts(await withMyVotes(data.posts || []));
        setHasMore(!!data.hasMore);
        setPage(1);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(err.message || 'Could not load posts.');
        setStatus('error');
      });
    return () => { active = false; };
  }, [activeView, activeTime, activeCategory, token, isGuest, withMyVotes]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await getPosts(token, { view: activeView, time: activeTime, page: next, limit: FEED_PAGE_SIZE, category: activeCategory });
      const merged = await withMyVotes(data.posts || []);
      setPosts((prev) => [...prev, ...merged]);
      setHasMore(!!data.hasMore);
      setPage(next);
    } catch {
      // keep the already-loaded posts; quietly stop
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleCreatePost() {
    if (isGuest) {
      openAuthPrompt('You need an account to create a post.');
      return;
    }
    window.location.href = '/community/create';
  }

  async function handleSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setHasSearched(false);
      setSearchResults({ posts: [], users: [] });
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      if (searchFilter === 'posts') {
        const data = await getPosts(token, { view: 'new', page: 1, limit: 20, search: q, category: activeCategory });
        setSearchResults({ posts: data.posts || [], users: [] });
      } else {
        const data = await searchCommunityUsers(q);
        setSearchResults({ posts: [], users: data.users || [] });
      }
    } catch {
      setSearchResults({ posts: [], users: [] });
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery('');
    setHasSearched(false);
    setSearchResults({ posts: [], users: [] });
  }

  return (
    <>
      <Seo
        title="Community Feed"
        description="Browse the Climb Pakistan Community feed — discussions on sport climbing in Pakistan."
        keywords="Climb Pakistan community feed, Pakistani climbing discussion, sport climbing forum Pakistan, climbing community posts"
        path="/community/feed"
        noIndex
      />

      <section className="page-header page-header--enhanced community-feed-header">
        <div className="page-header-bg-grid"></div>
        <div className="page-header-glow"></div>
        <div className="container">
          <div className="community-feed-headrow">
            <div className="hero-entrance">
              <h1 className="page-title">Climb Pakistan Community</h1>
            </div>
            <div className="community-feed-sort" role="tablist" aria-label="Feed view">
              {feedSortTabs.map((tab) => {
                const isActive = tab.value === activeView;
                return (
                  <a
                    key={tab.value}
                    href={tab.to}
                    role="tab"
                    aria-selected={isActive}
                    className={`community-sort-tab${isActive ? ' is-active' : ''}`}
                  >
                    {tab.label}
                  </a>
                );
              })}
            </div>
          </div>
          {activeView === 'top' && (
            <div className="community-time-filter" role="tablist" aria-label="Top time period">
              {topTimeFilters.map((t) => {
                const isActive = t.value === activeTime;
                return (
                  <a
                    key={t.value}
                    href={`?view=top&time=${t.value}`}
                    role="tab"
                    aria-selected={isActive}
                    className={`community-time-tab${isActive ? ' is-active' : ''}`}
                  >
                    {t.label}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Search bar */}
      <section className="section-tight community-search-section">
        <div className="container">
          <form className="community-search-bar" onSubmit={handleSearch}>
            <div className="community-search-filters" role="tablist" aria-label="Search filter">
              <button
                type="button"
                role="tab"
                aria-selected={searchFilter === 'posts'}
                className={`community-search-filter${searchFilter === 'posts' ? ' is-active' : ''}`}
                onClick={() => setSearchFilter('posts')}
              >
                Questions
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={searchFilter === 'users'}
                className={`community-search-filter${searchFilter === 'users' ? ' is-active' : ''}`}
                onClick={() => setSearchFilter('users')}
              >
                Users
              </button>
            </div>
            <div className="community-search-input-wrap">
              <input
                type="text"
                className="community-search-input"
                placeholder={searchFilter === 'posts' ? 'Search questions...' : 'Search users...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="community-search-clear" onClick={clearSearch} aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary community-search-btn" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>
      </section>

      <section className="section-tight community-feed-body">
        <FeedShell>
          <TopicsSidebar activeCategory={activeCategory} counts={topicCounts} />
          <div className="community-feed-main">
            {/* Search results */}
            {hasSearched && (
              <div className="community-search-results">
                <div className="community-search-results-header">
                  <h2 className="community-search-results-title">
                    {searchFilter === 'posts' ? 'Search Results' : 'Users'}
                  </h2>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearSearch}>
                    Clear search
                  </button>
                </div>

                {searchFilter === 'users' && (
                  <>
                    {searchResults.users.length === 0 ? (
                      <div className="community-empty-state">
                        <p className="community-empty-text">No users found for &ldquo;{searchQuery}&rdquo;</p>
                      </div>
                    ) : (
                      <div className="community-search-user-list">
                        {searchResults.users.map((u) => (
                          <a key={u.id} href={`/community/u/${u.username}`} className="community-search-user-card">
                            {u.profileImageUrl ? (
                              <img src={u.profileImageUrl} alt="" className="community-avatar community-avatar--md" />
                            ) : (
                              <span className="community-avatar community-avatar--md community-avatar--fallback">
                                {(u.username || '?')[0].toUpperCase()}
                              </span>
                            )}
                            <div className="community-search-user-info">
                              <span className="community-search-user-name">@{u.username} <VerificationBadge verification={u.verification} /></span>
                              {u.name && <span className="community-search-user-display">{u.name}</span>}
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {searchFilter === 'posts' && (
                  <>
                    {searchResults.posts.length === 0 ? (
                      <div className="community-empty-state">
                        <p className="community-empty-text">No questions found for &ldquo;{searchQuery}&rdquo;</p>
                      </div>
                    ) : (
                      <div className="community-post-list">
                        {searchResults.posts.map((post) => (
                          <PostCard key={post.id} post={post} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Regular feed (hidden when searching) */}
            {!hasSearched && status === 'loading' && (
              <div className="community-post-list">
                <PostSkeleton /><PostSkeleton /><PostSkeleton />
              </div>
            )}

            {!hasSearched && status === 'error' && (
              <div className="community-empty-state">
                <h2 className="community-empty-title">Couldn&rsquo;t load the feed</h2>
                <p className="community-empty-text">{errorMsg}</p>
                <button type="button" className="btn btn-primary community-empty-btn" onClick={() => window.location.reload()}>
                  Try again
                </button>
              </div>
            )}

            {!hasSearched && status === 'ready' && posts.length === 0 && (
              <div className="community-empty-state">
                <span className="community-empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </span>
                {activeCategory ? (
                  <>
                    <h2 className="community-empty-title">No posts in {activeCategory}</h2>
                    <p className="community-empty-text">There are no posts in this topic yet. Be the first to start a discussion!</p>
                  </>
                ) : (
                  <>
                    <h2 className="community-empty-title">Welcome to the Climb Pakistan Community</h2>
                    <p className="community-empty-text">Be the first to start a discussion.</p>
                  </>
                )}
                {isGuest && (
                  <p className="community-empty-guest">
                    Guests can browse freely. Create an account when you&apos;re
                    ready to start a discussion of your own.
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-primary community-empty-btn"
                  onClick={handleCreatePost}
                >
                  Create Post
                </button>
              </div>
            )}

            {status === 'ready' && posts.length > 0 && (
              <>
                <div className="community-post-list">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>

                {hasMore && (
                  <button
                    type="button"
                    className="btn btn-outline community-load-more"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load More'}
                  </button>
                )}
              </>
            )}
          </div>


        </FeedShell>
      </section>
    </>
  );
}