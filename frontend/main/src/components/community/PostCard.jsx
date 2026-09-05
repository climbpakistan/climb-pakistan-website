import { useState } from 'react';
import VerificationBadge from './VerificationBadge';
import VoteControls from './VoteControls';
import ReportMenu from './ReportMenu';
import Poll from './Poll';
import RichText from './RichText';
import PostGallery from './PostGallery';
import { useCommunity } from '../../hooks/CommunityContext';
import { savePost, unsavePost } from '../../api';
import {
  formatPostDate,
  postExcerpt,
} from '../../utils/communityPosts';

/**
 * PostCard — feed card for a community post. Voting/commenting are functional.
 */
export default function PostCard({ post }) {
  const { token, isGuest, openAuthPrompt } = useCommunity();
  const [saved, setSaved] = useState(!!post?.saved);
  const [saveBusy, setSaveBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!post) return null;
  const author = post.author || {};

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
      <div className="community-post-card-top">
        <span className="tag">{post.category}</span>
        <div className="community-post-card-top-right">
          <span className="community-post-date">{formatPostDate(post.createdAt)}</span>
          <ReportMenu postId={post.id} marker="Post" />
        </div>
      </div>

      <h3 className="community-post-title">
        <a href={`/community/post/${post.id}`}>{post.title}</a>
      </h3>

      {(post.type === 'image' && ((post.images && post.images.length > 0) || post.imageUrl)) && (
        <a href={`/community/post/${post.id}`} className="community-post-image-link">
          <PostGallery
            images={post.images && post.images.length > 0 ? post.images : post.imageUrl}
            alt={post.title}
          />
        </a>
      )}

      {post.body && (
        <p className="community-post-excerpt"><RichText text={postExcerpt(post.body)} /></p>
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
        <a href={`/community/u/${encodeURIComponent(author.username || '')}`} className="community-post-author">
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
          <span>@{author.username || 'unknown'}</span>
          <VerificationBadge verification={author.verification} />
        </a>

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
