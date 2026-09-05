import { useState } from 'react';
import VerificationBadge from './VerificationBadge';
import VoteControls from './VoteControls';
import ReportMenu from './ReportMenu';
import { useCommunity } from '../../hooks/CommunityContext';
import { createComment, updateComment, deleteComment } from '../../api';
import { formatPostDate, MAX_COMMENT_LENGTH } from '../../utils/communityPosts';
import RichText from './RichText';

/**
 * CommentItem — a single comment (or reply) with nested replies. Renders
 * itself recursively for replies; the UI keeps nesting visually flat so
 * threads stay simple.
 */
export default function CommentItem({ comment, replies = [], onCommentChanged }) {
  const { user, token, isGuest, openAuthPrompt } = useCommunity();

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const author = comment.author || {};
  const isOwner = !!(user && author.username === user.username);

  function guardGuest() {
    if (isGuest) {
      openAuthPrompt('Log in to reply, vote, and participate.');
      return true;
    }
    return false;
  }

  async function submitReply(e) {
    e.preventDefault();
    const body = replyBody.trim();
    if (!body) return setReplyError('Comments cannot be empty.');
    if (body.length > MAX_COMMENT_LENGTH) return setReplyError(`Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.`);

    setReplyBusy(true);
    setReplyError('');
    try {
      const { comment: created } = await createComment(token, comment.postId, {
        body,
        parentCommentId: comment.id,
      });
      setReplyBody('');
      setReplyOpen(false);
      onCommentChanged({ type: 'added', comment: created, parentCommentId: comment.id });
    } catch (err) {
      setReplyError(err.message || 'Could not add your reply.');
    } finally {
      setReplyBusy(false);
    }
  }

  async function submitEdit(e) {
    e.preventDefault();
    const body = editBody.trim();
    if (!body) return setEditError('Comments cannot be empty.');
    if (body.length > MAX_COMMENT_LENGTH) return setEditError(`Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.`);

    setEditBusy(true);
    setEditError('');
    try {
      const { comment: updated } = await updateComment(token, comment.id, body);
      setEditing(false);
      onCommentChanged({ type: 'updated', comment: updated });
    } catch (err) {
      setEditError(err.message || 'Could not update your comment.');
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteComment(token, comment.id);
      onCommentChanged({ type: 'deleted', id: comment.id });
    } catch {
      // Deletion failed — close the confirm state; a page refresh reconciles.
      setDeleting(false);
      setConfirmDelete(false);
      // Leave the comment visible; a reload will reconcile.
      setMenuOpen(false);
    }
  }

  return (
    <div className="community-comment">
      <div className="community-comment-head">
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
        <time className="community-post-date" dateTime={comment.createdAt} title={comment.updatedAt}>
          {formatPostDate(comment.createdAt)}
        </time>
      </div>

      {editing ? (
        <form className="community-comment-form" onSubmit={submitEdit}>
          <textarea
            rows={3}
            value={editBody}
            maxLength={MAX_COMMENT_LENGTH}
            onChange={(e) => setEditBody(e.target.value)}
            autoFocus
          />
          {editError && <p className="form-error" role="alert">{editError}</p>}
          <div className="community-form-actions">
            <button type="submit" className="btn btn-primary" disabled={editBusy}>
              {editBusy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => { setEditing(false); setEditBody(comment.body); }} disabled={editBusy}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="community-comment-body"><RichText text={comment.body} /></p>
      )}

      <div className="community-comment-actions">
        <VoteControls
          target="comment"
          targetId={comment.id}
          upvoteCount={comment.upvoteCount}
          downvoteCount={comment.downvoteCount}
          myVote={comment.myVote ?? null}
        />
        <button
          type="button"
          className="community-post-action"
          onClick={() => { if (!guardGuest()) { setReplyOpen((v) => !v); } }}
        >
          Reply
        </button>

        {isOwner && (
          <div className="community-post-menu">
            <button
              type="button"
              className="community-post-action community-post-menu-btn"
              aria-label="Comment options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="community-post-menu-dropdown" role="menu">
                {!confirmDelete ? (
                  <>
                    <button
                      role="menuitem"
                      type="button"
                      className="community-post-menu-item"
                      onClick={() => { setMenuOpen(false); setEditBody(comment.body); setEditing(true); }}
                    >
                      Edit
                    </button>
                    <button
                      role="menuitem"
                      type="button"
                      className="community-post-menu-item community-post-menu-item--danger"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <span className="community-post-menu-confirm">
                    Delete this comment?
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

        <ReportMenu commentId={comment.id} marker="Comment" />
      </div>

      {replyOpen && (
        <form className="community-comment-form" onSubmit={submitReply}>
          <textarea
            rows={3}
            value={replyBody}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder={`Reply to @${author.username || 'unknown'}…`}
            onChange={(e) => setReplyBody(e.target.value)}
            autoFocus
          />
          {replyError && <p className="form-error" role="alert">{replyError}</p>}
          <div className="community-form-actions">
            <button type="submit" className="btn btn-primary" disabled={replyBusy}>
              {replyBusy ? 'Posting…' : 'Reply'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setReplyOpen(false)} disabled={replyBusy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {replies.length > 0 && (
        <div className="community-comment-replies">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={reply.replies || []}
              onCommentChanged={onCommentChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

