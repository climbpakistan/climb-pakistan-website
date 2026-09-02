import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCommunity } from '../../hooks/CommunityContext';
import { getComments, createComment, getMyVotes } from '../../api';
import { MAX_COMMENT_LENGTH } from '../../utils/communityPosts';
import CommentItem from './CommentItem';

/**
 * CommentSection — loads and renders the comment thread for a post, with a
 * top-level composer. Guests can read everything but are shown the existing
 * Sign Up / Log In prompt when they try to comment.
 */
export default function CommentSection({ postId, onCountChange }) {
  const { token, isGuest, openAuthPrompt } = useCommunity();

  const [flat, setFlat] = useState([]); // all comments, oldest first
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');

  const [body, setBody] = useState('');
  const [composerError, setComposerError] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getComments(postId);
      setFlat(data.comments || []);
      setStatus('ready');
      return data.comments || [];
    } catch (err) {
      setErrorMsg(err.message || 'Could not load comments.');
      setStatus('error');
      return [];
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  // Highlight the user's existing votes once comments are loaded.
  useEffect(() => {
    if (isGuest || flat.length === 0) return;
    let active = true;
    getMyVotes(token, { comments: flat.map((c) => c.id) })
      .then((data) => {
        if (!active) return;
        const mine = data.comments || {};
        setFlat((prev) => prev.map((c) => (mine[c.id] ? { ...c, myVote: mine[c.id] } : c)));
      })
      .catch(() => {
        // highlighting is best-effort
      });
    return () => { active = false; };
  }, [token, isGuest, flat.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build the comment tree: top-level comments with their replies attached.
  const tree = useMemo(() => {
    const byId = new Map();
    for (const c of flat) byId.set(c.id, { ...c, replies: [] });
    const roots = [];
    for (const c of byId.values()) {
      if (c.parentCommentId && byId.has(c.parentCommentId)) {
        byId.get(c.parentCommentId).replies.push(c);
      } else {
        roots.push(c);
      }
    }
    return roots;
  }, [flat]);

  function handleChanged({ type, comment, id }) {
    if (type === 'added') {
      setFlat((prev) => [...prev, comment]);
      onCountChange?.(+1);
    } else if (type === 'updated') {
      setFlat((prev) => prev.map((c) => (
        c.id === comment.id ? { ...comment, myVote: c.myVote } : c
      )));
    } else if (type === 'deleted') {
      // Remove the comment and all of its descendants (server deletes them).
      const doomed = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const c of flat) {
          if (c.parentCommentId && doomed.has(c.parentCommentId) && !doomed.has(c.id)) {
            doomed.add(c.id);
            changed = true;
          }
        }
      }
      const removed = flat.filter((c) => doomed.has(c.id)).length;
      setFlat((prev) => prev.filter((c) => !doomed.has(c.id)));
      onCountChange?.(-removed);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    const clean = body.trim();
    if (!clean) return setComposerError('Comments cannot be empty.');
    if (clean.length > MAX_COMMENT_LENGTH) {
      return setComposerError(`Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
    }

    setPosting(true);
    setComposerError('');
    try {
      const { comment: created } = await createComment(token, postId, { body: clean });
      setBody('');
      handleChanged({ type: 'added', comment: created });
    } catch (err) {
      setComposerError(err.message || 'Could not add your comment.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="community-comments" aria-label="Comments">
      <h3 className="community-comments-title">
        {flat.length} {flat.length === 1 ? 'Comment' : 'Comments'}
      </h3>

      {isGuest ? (
        <button
          type="button"
          className="community-comment-gate"
          onClick={() => openAuthPrompt('Log in to join the discussion.')}
        >
          Log in or sign up to join the discussion.
        </button>
      ) : (
        <form className="community-comment-form" onSubmit={submitComment}>
          <textarea
            rows={3}
            value={body}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="Add a comment…"
            onChange={(e) => setBody(e.target.value)}
          />
          {composerError && <p className="form-error" role="alert">{composerError}</p>}
          <div className="community-form-actions">
            <button type="submit" className="btn btn-primary" disabled={posting}>
              {posting ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </form>
      )}

      {status === 'loading' && <p className="profile-loading">Loading comments…</p>}

      {status === 'error' && (
        <p className="community-comments-error">
          {errorMsg}{' '}
          <button type="button" className="community-post-action" onClick={load}>
            Try again
          </button>
        </p>
      )}

      {status === 'ready' && tree.length > 0 && (
        <div className="community-comment-list">
          {tree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={comment.replies}
              onCommentChanged={handleChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}
