import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate } from 'vike/client/router';
import { usePageContext } from 'vike-react/usePageContext';
import Seo from '../../../src/components/Seo';
import PostCard from '../../../src/components/community/PostCard';
import VerificationBadge from '../../../src/components/community/VerificationBadge';
import { useCommunity } from '../../../src/hooks/CommunityContext';
import { communityTopics, feedSortTabs, FEED_PAGE_SIZE } from '../../../src/data/communityData';
import { getPosts, getMyVotes, getMySaved, getPostSuggestions, getTopicCounts, searchCommunityUsers, followUser, unfollowUser, getFollowStatusBatch } from '../../../src/api';

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
              {counts && <span className="community-topics-sidebar-count">{formatCount(counts.byCategory[topic] ?? 0)}</span>}
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
      const ids = list.map((p) => p.id);
      const [voteData, savedData] = await Promise.all([
        getMyVotes(token, { posts: ids }),
        getMySaved(token, ids),
      ]);
      const mine = voteData.posts || {};
      const saved = savedData.saved || {};
      return list.map((p) => ({
        ...p,
        myVote: mine[p.id] || null,
        saved: !!saved[p.id],
      }));
    } catch {
      return list; // highlighting is best-effort
    }
  }, [token, isGuest]);

  // Active sort tab from the URL (?view=...).
  const searchView = pageContext?.urlParsed?.search?.view;
  const activeView = feedSortTabs.some((t) => t.value === searchView)
    ? searchView
    : 'popular';

  // Top view time filters were replaced by the Following feed — the URL may
  // still carry ?time= from old links, but the backend ignores it now.

  // Active category filter from the URL (?category=...).
  const searchCategory = pageContext?.urlParsed?.search?.category;
  const activeCategory = searchCategory || '';

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('posts'); // 'posts' or 'users'
  const [searchResults, setSearchResults] = useState({ posts: [], users: [] });
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Autocomplete dropdown state
  const [suggestions, setSuggestions] = useState({ posts: [], users: [] });
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  // Follow state for the user suggestions in the dropdown — seeded from the
  // server so accounts already followed show "Following" instead of "Follow".
  const [suggestFollows, setSuggestFollows] = useState({});
  const [suggestFollowBusy, setSuggestFollowBusy] = useState({});

  // Flattened list of suggestions for keyboard navigation.
  const flatSuggestions = [
    ...suggestions.posts.map((p) => ({ ...p, type: 'post' })),
    ...suggestions.users.map((u) => ({ ...u, type: 'user' })),
  ];

  // Refresh follow state whenever the suggested users change.
  useEffect(() => {
    let active = true;
    const ids = suggestions.users.map((u) => u.id);
    if (isGuest || ids.length === 0) {
      setSuggestFollows({});
      return () => { active = false; };
    }
    getFollowStatusBatch(token, ids)
      .then((status) => { if (active) setSuggestFollows(status.following || {}); })
      .catch(() => { if (active) setSuggestFollows({}); });
    return () => { active = false; };
  }, [suggestions.users, token, isGuest]);

  async function toggleSuggestionFollow(u, e) {
    e.preventDefault();
    e.stopPropagation();
    if (isGuest) { openAuthPrompt('Log in to follow accounts.'); return; }
    if (suggestFollowBusy[u.id]) return;
    setSuggestFollowBusy((m) => ({ ...m, [u.id]: true }));
    try {
      if (suggestFollows[u.id]) {
        await unfollowUser(token, u.id);
        setSuggestFollows((m) => ({ ...m, [u.id]: false }));
      } else {
        await followUser(token, u.id);
        setSuggestFollows((m) => ({ ...m, [u.id]: true }));
      }
    } catch {
      // leave state unchanged; user can retry
    } finally {
      setSuggestFollowBusy((m) => ({ ...m, [u.id]: false }));
    }
  }

  // Debounced fetch of matching questions + users as the user types.
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions({ posts: [], users: [] });
      setSuggestionsOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const [postData, userData] = await Promise.all([
          getPostSuggestions(q),
          searchCommunityUsers(q),
        ]);
        const next = {
          posts: (postData.suggestions || []).slice(0, 5),
          users: (userData.users || []).slice(0, 5),
        };
        setSuggestions(next);
        setActiveSuggestion(-1);
        setSuggestionsOpen(next.posts.length > 0 || next.users.length > 0);
      } catch {
        setSuggestions({ posts: [], users: [] });
        setSuggestionsOpen(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  function selectSuggestion(s) {
    setSuggestionsOpen(false);
    setSearchQuery('');
    setHasSearched(false);
    setSearchResults({ posts: [], users: [] });
    if (s.type === 'post') {
      navigate(`/community/post/${s.id}`);
    } else {
      navigate(`/community/u/${s.username}`);
    }
  }

  function handleSearchKeyDown(e) {
    if (!suggestionsOpen || flatSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((i) => (i + 1) % flatSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((i) => (i <= 0 ? flatSuggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (activeSuggestion >= 0) {
        e.preventDefault();
        selectSuggestion(flatSuggestions[activeSuggestion]);
      }
    } else if (e.key === 'Escape') {
      setSuggestionsOpen(false);
    }
  }

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
    getPosts(token, { view: activeView, page: 1, limit: FEED_PAGE_SIZE, category: activeCategory })
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
  }, [activeView, activeCategory, token, isGuest, withMyVotes]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await getPosts(token, { view: activeView, page: next, limit: FEED_PAGE_SIZE, category: activeCategory });
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

  async function runSearch(rawQuery, filter = searchFilter) {
    setSuggestionsOpen(false);
    const q = String(rawQuery || '').trim();
    if (!q) {
      setHasSearched(false);
      setSearchResults({ posts: [], users: [] });
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      if (filter === 'posts') {
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

  async function handleSearch(e) {
    e.preventDefault();
    await runSearch(searchQuery);
  }

  function clearSearch() {
    setSearchQuery('');
    setSuggestions({ posts: [], users: [] });
    setSuggestionsOpen(false);
    setHasSearched(false);
    setSearchResults({ posts: [], users: [] });
  }

  // Deep links like /community/feed?search=training (from #hashtags) prefill
  // the search box and run the search once on load.
  const urlSearch = pageContext?.urlParsed?.search?.search;
  const initializedSearch = useRef(false);
  useEffect(() => {
    if (urlSearch && !initializedSearch.current) {
      initializedSearch.current = true;
      setSearchQuery(String(urlSearch));
      runSearch(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

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
                onFocus={() => setSuggestionsOpen(suggestions.posts.length > 0 || suggestions.users.length > 0)}
                onBlur={(e) => {
                  if (!e.currentTarget.parentElement.contains(e.relatedTarget)) {
                    setSuggestionsOpen(false);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestionsOpen}
                aria-controls="community-search-suggestions"
              />
              {searchQuery && (
                <button type="button" className="community-search-clear" onClick={clearSearch} aria-label="Clear search">
                  ✕
                </button>
              )}

              {/* Autocomplete dropdown */}
              {suggestionsOpen && (suggestions.posts.length > 0 || suggestions.users.length > 0) && (
                <div className="community-search-suggestions" id="community-search-suggestions" role="listbox">
                  <div className="community-search-suggestions-body">
                    {suggestions.posts.length > 0 && (
                      <div className="community-search-suggestions-section">
                        <p className="community-search-suggestions-title">
                          <span className="community-search-suggestions-title-label">Questions</span>
                          <span className="community-search-suggestions-title-count">{suggestions.posts.length}</span>
                        </p>
                        {suggestions.posts.map((p, i) => (
                          <button
                            key={p.id}
                            type="button"
                            role="option"
                            aria-selected={activeSuggestion === i}
                            className={`community-search-suggestion${activeSuggestion === i ? ' is-active' : ''}`}
                            onClick={() => selectSuggestion({ ...p, type: 'post' })}
                          >
                            <span className="community-search-suggestion-chip" data-category={p.category}>{p.category}</span>
                            <span className="community-search-suggestion-title">{p.title}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {suggestions.users.length > 0 && (
                      <div className="community-search-suggestions-section">
                        <p className="community-search-suggestions-title">
                          <span className="community-search-suggestions-title-label">Users</span>
                          <span className="community-search-suggestions-title-count">{suggestions.users.length}</span>
                        </p>
                        {suggestions.users.map((u, j) => {
                          const idx = suggestions.posts.length + j;
                          return (
                            <div
                              key={u.id}
                              role="option"
                              aria-selected={activeSuggestion === idx}
                              className={`community-search-suggestion${activeSuggestion === idx ? ' is-active' : ''}`}
                              onClick={() => selectSuggestion({ ...u, type: 'user' })}
                            >
                              <span className="community-search-suggestion-user-info">
                                {u.profileImageUrl ? (
                                  <img src={u.profileImageUrl} alt="" className="community-search-suggestion-avatar" />
                                ) : (
                                  <span className="community-search-suggestion-avatar community-search-suggestion-avatar--fallback">
                                    {(u.username || '?')[0].toUpperCase()}
                                  </span>
                                )}
                                <span className="community-search-suggestion-user">
                                  <span className="community-search-suggestion-username">
                                    @{u.username} <VerificationBadge verification={u.verification} size={12} />
                                  </span>
                                  {u.name && <span className="community-search-suggestion-name">{u.name}</span>}
                                </span>
                              </span>
                              {!isGuest && (
                                <button
                                  type="button"
                                  className={`community-suggestion-follow${suggestFollows[u.id] ? ' is-following' : ''}`}
                                  disabled={suggestFollowBusy[u.id]}
                                  onClick={(e) => toggleSuggestionFollow(u, e)}
                                >
                                  {suggestFollowBusy[u.id] ? '…' : suggestFollows[u.id] ? 'Following' : 'Follow'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
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
                {activeView === 'following' && isGuest ? (
                  <>
                    <h2 className="community-empty-title">Log in to see your Following feed</h2>
                    <p className="community-empty-text">
                      Posts from climbers you follow will appear here.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary community-empty-btn"
                      onClick={() => openAuthPrompt('Log in to see posts from people you follow.')}
                    >
                      Log In
                    </button>
                  </>
                ) : activeCategory ? (
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