import { useState } from 'react';
import { postBodyExcerpt } from '../../utils/communityPosts';
import VerificationBadge from './VerificationBadge';
import VoteControls from './VoteControls';
import ReportMenu from './ReportMenu';
import Poll from './Poll';
import RichText from './RichText';
import PostGallery from './PostGallery';
import PostLightbox from './PostLightbox';
import { useCommunity } from '../../hooks/CommunityContext';
import { savePost, unsavePost, deletePost } from '../../api';
import { formatPostDate } from '../../utils/communityPosts';

/**
 * PostCard — feed card for a community post. Voting/commenting are functional.
 */
export default function PostCard({ post }) {
  const { token, isGuest, openAuthPrompt, user } = useCommunity();
  const [saved, setSaved] = useState(!!post?.saved);
  const [saveBusy, setSaveBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // If the API drops the post (404 / removed), the owning card still renders
  // the shell. We keep this flag so we can hide the owner delete menu and show a
  // placeholder instead of a dangling control.
  const isDeleted =
    !post ||
    (post.removed === true) ||
    (post.deletedAt != null) ||
    (Array.isArray(post.images) && post.images.length === 0 && !post.imageUrl && post.type === 'image');

  const lightboxImages = ((post?.images && post.images.length > 0) ? post.images : post?.imageUrl ? [post.imageUrl] : []).filter(Boolean);

  if (!post) return null;
  const author = post.author || {};
  const bodyExcerpt = postBodyExcerpt(post.body || '');
  const isOwner = !!(user && author.username && user.username === author.username);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deletePost(token, post.id);
      window.location.reload();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleSave() {
    if (isGuest) {
      openAuthPrompt('Log in to save posts to your list.');
      return;
    }
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      if (saved) {
        await unsavePost(token, post.id);
        setSaved(false);
      } else {
        await savePost(token, post.id);
        setSaved(true);
      }
    } catch {
      // leave state unchanged; user can retry
    } finally {
      setSaveBusy(false);
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/community/post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  }

  return (
    <article className="community-post-card">
      <div className="community-post-card-head">
        <a href={`/community/u/${encodeURIComponent(author.username || '')}`} className="community-post-author community-post-author--head">
          {author.profileImageUrl ? (
            <img
              src={author.profileImageUrl}
              alt=""
              loading="lazy"
              className="community-avatar community-avatar--sm"
            />
          ) : (
            <span className="community-avatar community-avatar--sm community-avatar--fallback" aria-hidden="true">
              {(author.username || '?').charAt(0).toUpperCase()}
            </span>
          )}
          <span className="community-post-author-meta">
            <span className="community-post-author-username">
              @{author.username || 'unknown'}
              <VerificationBadge verification={author.verification} />
            </span>
            {author.name && <span className="community-post-author-name">{author.name}</span>}
          </span>
        </a>
        <div className="community-post-card-head-right">
          {isDeleted ? (
            <span className="community-post-date">—</span>
          ) : (
            <span className="community-post-date">{formatPostDate(post.createdAt)}</span>
          )}
          {isOwner && !isDeleted ? (
            <div className="community-post-menu">
              <button
                type="button"
                className="community-post-action community-post-menu-btn"
                aria-label={isDeleted ? 'Post unavailable' : 'Post options'}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
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
                    onClick={() => setMenuOpen(false)}
                  >
                    Edit
                  </a>
                  <button
                    role="menuitem"
                    type="button"
                    className="community-post-menu-item community-post-menu-item--danger"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete post
                  </button>
                  {confirmDelete && (
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
          ) : (
            <ReportMenu postId={post.id} marker="Post" />
          )}
        </div>
      </div>

      <a className="community-post-topic" href={`/community/feed?category=${encodeURIComponent(post.category)}`}>{post.category}</a>
      <div className="community-post-body-card">
        {isDeleted ? (
          <h3 className="community-post-title">[This post has been removed]</h3>
        ) : (
          <h3 className="community-post-title">
            <a href={`/community/post/${post.id}`}>{post.title}</a>
          </h3>
        )}
        {post.body && !isDeleted && (
            <p className={`community-post-excerpt${expanded ? ' is-expanded' : ''}`}>
            <RichText text={expanded ? post.body : bodyExcerpt.text} />
          </p>
        )}
        {post.body && bodyExcerpt.truncated && (
          <button
            type="button"
            className="community-post-see-more"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? 'See less' : 'See more'}
          </button>
        )}
      </div>        {(post.type === 'image' && ((post.images && post.images.length > 0) || post.imageUrl)) && (
          <div
            className="community-post-image-link"
            role="button"
            tabIndex={0}
            aria-label="View image full screen"
            onClick={(e) => {
              if (e.target !== e.currentTarget) return;
              setLightboxIndex(0);
              setLightboxOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setLightboxIndex(0);
                setLightboxOpen(true);
              }
            }}
          >
            <PostGallery
              images={post.images && post.images.length > 0 
                ? post.images.map(img => img.url || img) 
                : [post.imageUrl]}
              alt={post.title}
              onImageClick={(i) => {
                setLightboxIndex(i);
                setLightboxOpen(true);
              }}
            />
          </div>
        )}

      {lightboxOpen && (
        <PostLightbox
          images={lightboxImages}
          index={lightboxIndex}
          alt={post.title}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
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
          <button
            type="button"
            className={`community-post-action${saved ? ' is-saved' : ''}`}
            onClick={handleSave}
            aria-label={saved ? 'Remove from saved' : 'Save post'}
            aria-pressed={saved}
          >
            <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {saved ? 'Saved' : 'Save'}
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
            myVote={post.myVote ?? null}
          />
          <a href={`/community/post/${post.id}#comments`} className="community-post-action" aria-label="Comments">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {post.commentCount ?? 0}
          </a>
        </div>
      </div>
    </article>
  );
}
