import { useCallback, useEffect, useState } from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import { useData } from 'vike-react/useData';
import Seo from '../../../../src/components/Seo';
import PostCard from '../../../../src/components/community/PostCard';
import { useCommunity } from '../../../../src/hooks/CommunityContext';
import { getHashtag, getMyVotes, getMySaved } from '../../../../src/api';
import { FEED_PAGE_SIZE } from '../../../../src/data/communityData';
import { normalizeHashtag } from '../../../../src/utils/socialText';

export { Page };

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
  const server = useData() || {};
  const { token, isGuest, initializing } = useCommunity();

  const routeTag = normalizeHashtag(pageContext?.routeParams?.hashtag || '');

  const [hashtag, setHashtag] = useState(server.hashtag || null);
  const [posts, setPosts] = useState(server.posts || []);
  const [page, setPage] = useState(server.page || 1);
  const [hasMore, setHasMore] = useState(!!server.hasMore);
  const [total, setTotal] = useState(server.total || 0);
  const [status, setStatus] = useState((server.posts || []).length > 0 || server.hashtag ? 'ready' : 'loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);

  // When SPA-navigating between hashtags, adopt the new server payload
  // immediately (state initializers only run on the first mount).
  const [prevTag, setPrevTag] = useState(routeTag);
  if (routeTag !== prevTag) {
    setPrevTag(routeTag);
    setHashtag(server.hashtag || null);
    setPosts(server.posts || []);
    setPage(server.page || 1);
    setTotal(server.total || 0);
    setHasMore(!!server.hasMore);
    setStatus('ready');
  }

  // Merge the viewer's own vote/save state into a page of posts (best-effort).
  const withMyVotes = useCallback(async (list) => {
    if (isGuest || list.length === 0 || !token) return list;
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

  // Refresh once the stored session has validated so votes/saves are correct.
  useEffect(() => {
    if (initializing || !routeTag) return undefined;
    let active = true;
    setRefreshBusy(true);
    getHashtag(routeTag, { page: 1, limit: FEED_PAGE_SIZE })
      .then(async (data) => {
        if (!active) return;
        setHashtag(data.hashtag || hashtag);
        setPosts(await withMyVotes(data.posts || []));
        setPage(data.page || 1);
        setTotal(data.total || 0);
        setHasMore(!!data.hasMore);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('ready');
      })
      .finally(() => { if (active) setRefreshBusy(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeTag, token, isGuest, initializing]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await getHashtag(routeTag, { page: next, limit: FEED_PAGE_SIZE });
      const merged = await withMyVotes(data.posts || []);
      setPosts((prev) => [...prev, ...merged]);
      setHasMore(!!data.hasMore);
      setPage(next);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  const displayName = hashtag?.displayName || hashtag?.name || routeTag;
  const name = hashtag?.name || routeTag;
  const postCount = Math.max(total, hashtag?.postCount || 0);
  const indexable = postCount > 0;

  return (
    <>
      <Seo
        title={`#${displayName}`}
        description={`Posts tagged #${displayName} in the Climb Pakistan Community — ${postCount} ${postCount === 1 ? 'post' : 'posts'} on sport climbing in Pakistan.`}
        keywords={`${displayName}, #${displayName}, climbing Pakistan, ${displayName} posts`}
        path={`/community/hashtag/${encodeURIComponent(name)}`}
        noIndex={!indexable}
      />

      <section className="page-header page-header--enhanced community-feed-header">
        <div className="page-header-bg-grid"></div>
        <div className="page-header-glow"></div>
        <div className="container">
          <div className="hero-entrance">
            <h1 className="page-title">#{displayName}</h1>
            <p className="community-hashtag-count">
              {postCount} {postCount === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container community-hashtag-page">
          <nav className="community-post-breadcrumb" aria-label="Breadcrumb">
            <a href="/community/feed">Community</a>
            <span aria-hidden="true">›</span>
            <span>#{displayName}</span>
          </nav>

          {status === 'loading' && (
            <div className="community-post-list">
              <PostSkeleton /><PostSkeleton /><PostSkeleton />
            </div>
          )}

          {status !== 'loading' && posts.length === 0 && (
            <div className="community-empty-state">
              <h2 className="community-empty-title">No posts with #{displayName} yet</h2>
              <p className="community-empty-text">
                Nobody has used this hashtag yet. Be the first — start a post and tag it
                with #{displayName}.
              </p>
              <a href="/community/create" className="btn btn-primary community-empty-btn">
                Create Post
              </a>
            </div>
          )}

          {posts.length > 0 && (
            <>
              <div className="community-post-list" aria-busy={refreshBusy}>
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
      </section>
    </>
  );
}
