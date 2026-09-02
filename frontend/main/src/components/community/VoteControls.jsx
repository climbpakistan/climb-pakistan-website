import { useState } from 'react';
import { useCommunity } from '../../hooks/CommunityContext';
import { vote } from '../../api';

const UP_PATH = 'M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z';

/**
 * VoteControls — shared upvote/downvote widget for posts and comments.
 *
 * Behavior (matching the community spec):
 *  - click upvote → add upvote
 *  - click upvote again → remove it
 *  - click downvote while upvoted → switch
 *  - counts update immediately (optimistic), corrected by the server response
 *  - guests get the Sign Up / Log In prompt instead of voting
 */
export default function VoteControls({ target, targetId, upvoteCount = 0, downvoteCount = 0, myVote = null }) {
  const { token, isGuest, openAuthPrompt } = useCommunity();

  const [counts, setCounts] = useState({ up: upvoteCount, down: downvoteCount });
  const [current, setCurrent] = useState(myVote);
  const [busy, setBusy] = useState(false);

  async function handleClick(nextType) {
    if (isGuest) {
      openAuthPrompt('Log in to vote on posts and comments.');
      return;
    }
    if (busy) return;

    // Determine the resulting vote + optimistic count changes.
    const resulting = current === nextType ? null : nextType;
    setBusy(true);

    const prev = { counts, current };
    setCounts((c) => {
      const next = { ...c };
      if (current === 'upvote') next.up -= 1;
      if (current === 'downvote') next.down -= 1;
      if (resulting === 'upvote') next.up += 1;
      if (resulting === 'downvote') next.down += 1;
      return next;
    });
    setCurrent(resulting);

    try {
      const data = await vote(token, { target, targetId, voteType: resulting });
      // Trust the server's authoritative counters.
      setCounts({ up: data.upvoteCount, down: data.downvoteCount });
      setCurrent(data.myVote ?? resulting);
    } catch {
      // Revert on failure.
      setCounts(prev.counts);
      setCurrent(prev.current);
    } finally {
      setBusy(false);
    }
  }

  const cls = (type) =>
    `community-vote-btn${current === type ? ` is-active community-vote-btn--${type}` : ''}`;

  return (
    <span className="community-vote-group">
      <button
        type="button"
        className={cls('upvote')}
        onClick={() => handleClick('upvote')}
        aria-label="Upvote"
        aria-pressed={current === 'upvote'}
        disabled={busy && !isGuest}
      >
        <svg viewBox="0 0 24 24" fill={current === 'upvote' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={UP_PATH} />
        </svg>
        {counts.up}
      </button>
      <button
        type="button"
        className={cls('downvote')}
        onClick={() => handleClick('downvote')}
        aria-label="Downvote"
        aria-pressed={current === 'downvote'}
        disabled={busy && !isGuest}
      >
        <svg viewBox="0 0 24 24" fill={current === 'downvote' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: 'rotate(180deg)' }}>
          <path d={UP_PATH} />
        </svg>
        {counts.down}
      </button>
    </span>
  );
}
