import { useEffect, useRef, useState } from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import Seo from '../../../../src/components/Seo';
import VerificationBadge from '../../../../src/components/community/VerificationBadge';
import VoteControls from '../../../../src/components/community/VoteControls';
import CommentSection from '../../../../src/components/community/CommentSection';
import ReportMenu from '../../../../src/components/community/ReportMenu';
import Poll from '../../../../src/components/community/Poll';
import RichText from '../../../../src/components/community/RichText';
import { useCommunity } from '../../../../src/hooks/CommunityContext';
import { getPost, deletePost, getMyVotes } from '../../../../src/api';
import {
  formatPostDateTime,
  formatPostDate,
} from '../../../../src/utils/communityPosts';

export { Page };

function Page() {
  const pageContext = usePageContext();
  const postId = pageContext?.routeParams?.postId;
  const { user, token, isGuest, openAuthPrompt } = useCommunity();

  const [post, setPost] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [postMyVote, setPostMyVote] = useState(null);

  // Keep the latest token in a ref so the initial-load effect runs once per
  // postId (on mount) without re-fetching when the token resolves.
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getPost(tokenRef.current, postId);
        if (active) {
          setPost(data.post);
          setStatus('ready');
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Post not found.');
          setStatus('error');
        }
      }
    }
    load();
    return () => { active = false; };
  }, [postId]);

  // Only the post owner sees edit/delete — the backend enforces it too.
  const isOwner = !!(post && user && post.author?.username === user.username);

  // Sync counters + fetch the user's existing vote for highlighting.
  useEffect(() => {
    if (!post) return;
    setCommentCount(post.commentCount ?? 0);
    if (isGuest) return;
    let active = true;
    getMyVotes(token, { posts: [post.id] })
      .then((data) => { if (active) setPostMyVote(data.posts?.[post.id] ?? null); })
      .catch(() => {});
    return () => { active = false; };
  }, [post, token, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    if (isGuest) openAuthPrompt('Log in to save posts to your list.');
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deletePost(token, post.id);
      window.location.href = '/community/feed';
    } catch (err) {
      setErrorMsg(err.message || 'Could not delete your post.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <Seo
        title={post ? post.title : 'Community Post'}
        description={post ? `${post.category} — ${post.title}` : 'A post in the Climb Pakistan Community.'}
        path={`/community/post/${postId}`}
        noIndex
      />

      <section className="page-header page-header--enhanced community-feed-header">
        <div className="page-header-bg-grid"></div>
        <div className="page-header-glow"></div>
        <div className="container">
          <div className="hero-entrance">              <h1 className="page-title">{post ? post.category : 'Post'}</h1>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container community-post-page">
          {status === 'loading' && <p className="profile-loading">Loading post…</p>}

          {status === 'error' && (
            <div className="community-empty-state">
              <h2 className="community-empty-title">Post not found</h2>
              <p className="community-empty-text">{errorMsg}</p>
              <a href="/community/feed" className="btn btn-primary community-empty-btn">Back to the feed</a>
            </div>
          )}

          {status === 'ready' && post && (
            <article className="community-post-card community-post-card--full">
              <div className="community-post-card-top">
                <span className="tag">{post.category}</span>
                <div className="community-post-card-top-right">
                  <span className="community-post-date">{formatPostDate(post.createdAt)}</span>
                  <ReportMenu postId={post.id} marker="Post" />
                </div>
              </div>

              <h2 className="community-post-title community-post-title--full">{post.title}</h2>

              <div className="community-post-footer community-post-byline">
                <a href={`/community/u/${encodeURIComponent(post.author?.username || '')}`} className="community-post-author">
                  {post.author?.profileImageUrl ? (
                    <img
                      src={post.author.profileImageUrl}
                      alt=""
                      loading="lazy"
                      className="community-avatar community-avatar--md"
                    />
                  ) : (
                    <span className="community-avatar community-avatar--md community-avatar--fallback" aria-hidden="true">
                      {(post.author?.username || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>@{post.author?.username || 'unknown'}</span>
                  <VerificationBadge verification={post.author?.verification} />
                </a>
                <time className="community-post-date" dateTime={post.createdAt}>
                  {formatPostDateTime(post.createdAt)}
                </time>
              </div>

              {post.body && <p className="community-post-body"><RichText text={post.body} /></p>}

              {post.type === 'image' && post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  loading="lazy"
                  decoding="async"
                  className="community-post-image community-post-image--full"
                />
              )}

              {post.type === 'link' && post.externalUrl && (
                <a
                  href={post.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="community-post-link"
                >
                  {post.externalUrl}
                </a>
              )}

              {post.type === 'poll' && post.poll && (
                <div className="community-post-poll">
                  <Poll postId={post.id} initialPoll={post.poll} />
                </div>
              )}


              <div className="community-post-footer">
                <div className="community-post-actions">
                  <button type="button" className="community-post-action" onClick={handleSave} aria-label="Save post">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    Save
                  </button>
                  <button type="button" className="community-post-action" onClick={handleShare} aria-label="Share post">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    {copied ? 'Copied!' : 'Share'}
                  </button>
                  <VoteControls
                    target="post"
                    targetId={post.id}
                    upvoteCount={post.upvoteCount ?? 0}
                    downvoteCount={post.downvoteCount ?? 0}
                    myVote={postMyVote}
                  />
                  <span className="community-post-action community-post-action--static" id="comments" aria-label="Comments">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
                  </span>
                </div>


                {isOwner && (
                  <div className="community-post-menu">
                    <button
                      type="button"
                      className="community-post-action community-post-menu-btn"
                      aria-label="Post options"
                      aria-expanded={menuOpen}
                      onClick={() => setMenuOpen((v) => !v)}
                    >
                      ⋯
                    </button>
                    {menuOpen && (
                      <div className="community-post-menu-dropdown" role="menu">
                        <a
                          role="menuitem"
                          href={`/community/post/${post.id}/edit`}
                          className="community-post-menu-item"
                          onClick={closeMenu}
                        >
                          Edit
                        </a>
                        {!confirmDelete ? (
                          <button
                            role="menuitem"
                            type="button"
                            className="community-post-menu-item community-post-menu-item--danger"
                            onClick={() => setConfirmDelete(true)}
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="community-post-menu-confirm">
                            Delete this post?
                            <button
                              type="button"
                              className="community-post-menu-item community-post-menu-item--danger"
                              onClick={handleDelete}
                              disabled={deleting}
                            >
                              {deleting ? 'Deleting…' : 'Yes, delete'}
                            </button>
                            <button
                              type="button"
                              className="community-post-menu-item"
                              onClick={() => setConfirmDelete(false)}
                            >
                              Keep it
                            </button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          )}

          {status === 'ready' && post && (
            <CommentSection
              postId={postId}
              onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
            />
          )}
        </div>
      </section>
    </>
  );
}

