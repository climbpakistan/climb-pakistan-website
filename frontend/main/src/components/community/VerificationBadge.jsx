/**
 * VerificationBadge — reusable social-media-style verification badge.
 *
 * Renders an angular X-style "seal" badge (multi-edged silhouette with a
 * solid checkmark inside), visually inspired by Twitter/Clearbit verified
 * badges.
 *
 * Badge colours:
 *   athlete      → green  (#22c55e)  Verified Athlete
 *   national     → green  (legacy athlete level, shown as Verified Athlete)
 *   international→ green  (legacy athlete level, shown as Verified Athlete)
 *   organization → yellow (#eab308)  Verified Organization / Team
 *   official     → white seal with black tick (Climb Pakistan Official)
 *
 * Renders nothing for `none` or unknown types.
 *
 * Props:
 *   verification — one of 'athlete' | 'national' | 'international' | 'organization' | 'official' | 'none'
 *   size         — optional pixel size (default 14)
 */

// X/Twitter-style verified seal silhouette (viewBox 0 0 22 22).
const SEAL_PATH =
  'M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z';

// Solid checkmark drawn inside the seal.
const CHECK_PATH =
  'M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z';

const ATHLETE = {
  bg: '#22c55e',
  check: '#ffffff',
  label: 'Verified Athlete',
};

const CONFIG = {
  athlete: ATHLETE,
  national: ATHLETE,
  international: ATHLETE,
  organization: {
    bg: '#eab308',
    check: '#ffffff',
    label: 'Verified Organization / Team',
  },
  // White seal with a black tick, kept visible on light backgrounds by a
  // subtle outline. Only used for the Climb Pakistan official account.
  official: {
    bg: '#ffffff',
    check: '#000000',
    ring: 'rgba(0, 0, 0, 0.18)',
    label: 'Climb Pakistan Official',
  },
};

export default function VerificationBadge({ verification, size = 14 }) {
  if (!verification || verification === 'none') return null;

  const config = CONFIG[verification];
  if (!config) return null;

  return (
    <span
      className="v-badge"
      role="img"
      aria-label={config.label}
      title={config.label}
      style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        {/* Seal silhouette (subtle outline keeps the white official badge
            visible on light backgrounds) */}
        <path
          d={SEAL_PATH}
          fill={config.bg}
          stroke={config.ring || 'none'}
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        {/* Solid checkmark */}
        <path d={CHECK_PATH} fill={config.check} />
      </svg>
    </span>
  );
}