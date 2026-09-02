import { useState } from 'react';
import { useCommunity } from '../../hooks/CommunityContext';
import { votePoll } from '../../api';

/**
 * Poll — rendered inside post cards and the post page. Shows poll options,
 * tallies votes/results, and lets authenticated users vote (once, changeable
 * while open). Results are hidden until the viewer votes or the poll closes.
 */
export default function Poll({ postId, initialPoll }) {
  const { token, isGuest, openAuthPrompt } = useCommunity();
  const [poll, setPoll] = useState(initialPoll);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!poll) return null;

  const { options = [], open, myVote, totalVotes, closesAt } = poll;
  // Results are shown only when we have counts (undefined before voting/closing).
  const showResults = options.some((o) => o.voteCount !== undefined);

  async function handleVote(optionKey) {
    if (isGuest) {
      openAuthPrompt('Log in to vote on this poll.');
      return;
    }
    if (busy || !open) return;
    setBusy(true);
    setError('');
    try {
      const data = await votePoll(token, postId, optionKey);
      setPoll(data.poll);
    } catch (err) {
      setError(err.message || 'Could not record your vote.');
    } finally {
      setBusy(false);
    }
  }

  function formatClose() {
    if (!closesAt) return 'No expiry';
    const d = new Date(closesAt);
    if (Number.isNaN(d.getTime())) return '';
    const diff = d.getTime() - Date.now();
    if (diff <= 0) return 'Poll closed';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `Closes in ${days}d ${hours}h`;
    return `Closes in ${hours}h`;
  }

  return (
    <div className="community-poll">
      <div className="community-poll-options">
        {options.map((option) => {
          const selected = option.key === myVote;
          const pct = showResults ? (option.percent ?? 0) : 0;
          const count = showResults ? (option.voteCount ?? 0) : 0;
          return (
            <button
              key={option.key}
              type="button"
              className={`community-poll-option${selected ? ' is-selected' : ''}`}
              onClick={() => handleVote(option.key)}
              disabled={isGuest || busy || !open}
              aria-pressed={selected}
            >
              <span className="community-poll-option-rank" aria-hidden="true">
                {showResults ? `${pct}%` : '•'}
              </span>
              <span className="community-poll-option-text">
                {option.text}
                {showResults && <span className="community-poll-option-count">{count}</span>}
              </span>
              {showResults && (
                <span
                  className="community-poll-bar"
                  style={{ width: `${Math.min(100, pct)}%` }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="community-poll-foot">
        <span className="community-poll-meta">
          {showResults && totalVotes !== undefined
            ? `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}`
            : (myVote ? 'You voted — change your vote anytime' : 'Vote to see results')}
        </span>
        <span className={`community-poll-status${!open ? ' is-closed' : ''}`}>
          {open ? formatClose() : 'Poll closed'}
        </span>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
