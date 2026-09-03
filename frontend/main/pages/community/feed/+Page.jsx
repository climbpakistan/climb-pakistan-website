import { useCallback, useEffect, useState } from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import Seo from '../../../src/components/Seo';
import PostCard from '../../../src/components/community/PostCard';
import { useCommunity } from '../../../src/hooks/CommunityContext';
import { communityTopics, feedSortTabs, topTimeFilters, communityCopy, FEED_PAGE_SIZE } from '../../../src/data/communityData';
import { getPosts, getMyVotes } from '../../../src/api';

export { Page };

function FeedShell({ children }) {
  return (
    <div className="container community-feed-layout">
      {children}
    </div>
  );
}

function TopicsSidebar() {
  return (
    <aside className="community-topics-sidebar">
      <h2 className="community-topics-sidebar-title">Topics</h2>
      <ul className="community-topics-sidebar-list">
        {communityTopics.map((topic) => (
          <li key={topic} className="community-topics-sidebar-item">
            <a href={`/community/feed?category=${encodeURIComponent(topic)}`} className="community-topics-sidebar-link">
              {topic}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function CommunityAboutCard() {
  return (
    <aside className="community-about-card">
      <h2 className="community-about-title">About this community</h2>
      <p className="community-about-text">{communityCopy.tagline}</p>
      <div className="community-about-topics">
        {communityTopics.slice(0, 5).map((topic) => (
          <span key={topic} className="tag">{topic}</span>
        ))}
      </div>
      <a href="/community" className="btn btn-outline community-about-btn">About the Community</a>
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

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getPosts(token, { view: activeView, time: activeTime, page: 1, limit: FEED_PAGE_SIZE })
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
  }, [activeView, activeTime, token, isGuest, withMyVotes]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await getPosts(token, { view: activeView, time: activeTime, page: next, limit: FEED_PAGE_SIZE });
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

      <section className="section-tight community-feed-body">
        <FeedShell>
          <TopicsSidebar />
          <div className="community-feed-main">
            {status === 'loading' && (
              <div className="community-post-list">
                <PostSkeleton /><PostSkeleton /><PostSkeleton />
              </div>
            )}

            {status === 'error' && (
              <div className="community-empty-state">
                <h2 className="community-empty-title">Couldn&rsquo;t load the feed</h2>
                <p className="community-empty-text">{errorMsg}</p>
                <button type="button" className="btn btn-primary community-empty-btn" onClick={() => window.location.reload()}>
                  Try again
                </button>
              </div>
            )}

            {status === 'ready' && posts.length === 0 && (
              <div className="community-empty-state">
                <span className="community-empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </span>
                <h2 className="community-empty-title">Welcome to the Climb Pakistan Community</h2>
                <p className="community-empty-text">Be the first to start a discussion.</p>
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

          <CommunityAboutCard />
        </FeedShell>
      </section>
    </>
  );
}