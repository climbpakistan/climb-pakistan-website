import User from '../models/User.js';

/**
 * Loads the current user's full document (fresh from the DB) and returns
 * { user, restriction } where `restriction` is null when the account is
 * active, or { status, reason } when it is suspended/banned.
 *
 * Used by participation routes (posts, comments, votes, reports, poll votes,
 * follows) so restricted accounts are blocked server-side — the JWT alone is
 * not enough because a restriction may be applied after the token was issued.
 */
export async function loadUserAndRestriction(userId) {
  const user = await User.findById(userId);
  if (!user) return { user: null, restriction: null };
  if (user.accountStatus !== 'active') {
    return {
      user,
      restriction: {
        status: user.accountStatus,
        reason: user.restrictionReason || '',
      },
    };
  }
  return { user, restriction: null };
}

/** Error message shown to suspended/banned users. */
export function restrictionError(restriction) {
  if (restriction.status === 'banned') {
    return 'Your account has been banned and you can no longer participate in the community.';
  }
  return 'Your account is suspended and you cannot currently participate in the community. Contact support if you believe this is a mistake.';
}
