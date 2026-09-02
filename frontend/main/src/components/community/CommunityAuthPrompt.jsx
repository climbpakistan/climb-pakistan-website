import { communityCopy } from '../../data/communityData';
import { useCommunity } from '../../hooks/CommunityContext';

/**
 * CommunityAuthPrompt — global modal shown (via CommunityContext) when a
 * guest tries to perform an account-only action. Guests are never prevented
 * from browsing; this is a clear, dismissible prompt with Sign Up / Log In.
 */
export default function CommunityAuthPrompt() {
  const { authPrompt, closeAuthPrompt } = useCommunity();

  if (!authPrompt.open) return null;

  return (
    <div
      className="community-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-auth-prompt-title"
      onClick={closeAuthPrompt}
    >
      <div
        className="community-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="community-modal-close"
          type="button"
          aria-label="Close"
          onClick={closeAuthPrompt}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <span className="eyebrow">Climb Pakistan Community</span>
        <h2 id="community-auth-prompt-title" className="community-modal-title">
          {communityCopy.authPromptTitle}
        </h2>
        <p className="community-modal-body">{communityCopy.authPromptBody}</p>

        {authPrompt.reason && (
          <p className="community-modal-reason">{authPrompt.reason}</p>
        )}

        <div className="community-modal-actions">
          <a href="/community/signup" className="btn btn-primary">Sign Up</a>
          <a href="/community/login" className="btn btn-outline">Log In</a>
        </div>

        <button
          type="button"
          className="community-modal-stay-guest"
          onClick={closeAuthPrompt}
        >
          Continue browsing as a guest
        </button>
      </div>
    </div>
  );
}