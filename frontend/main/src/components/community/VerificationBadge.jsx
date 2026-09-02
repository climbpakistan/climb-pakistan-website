const LABELS = {
  national: 'Verified National Climber',
  international: 'Verified International Sport Climber',
};

/**
 * VerificationBadge — plain colored checkmark (no surrounding circle).
 * Renders nothing for `none`.
 */
export default function VerificationBadge({ verification }) {
  if (!verification || verification === 'none') return null;
  const label = LABELS[verification];
  if (!label) return null;
  return (
    <span
      className={`profile-verified profile-verified--${verification}`}
      role="img"
      aria-label={label}
      title={label}
    >
      ✓
    </span>
  );
}