import { useCommunity } from '../../hooks/CommunityContext';

/**
 * RestrictionBanner — shown to suspended accounts explaining that their
 * participation is limited. Banned accounts are signed out at the auth layer
 * and never reach here.
 */
export default function RestrictionBanner() {
  const { restriction } = useCommunity();
  if (!restriction) return null;

  const isBanned = restriction.status === 'banned';
  return (
    <div className="community-restriction-banner" role="alert">
      <strong>{isBanned ? 'Account banned' : 'Account suspended'}</strong>
      <span>
        {isBanned
          ? 'You can no longer access or participate in the community.'
          : 'You cannot create posts, comment, reply, vote, report, or follow while suspended.'}
      </span>
      {restriction.reason && <span className="community-restriction-reason">Reason: {restriction.reason}</span>}
    </div>
  );
}
