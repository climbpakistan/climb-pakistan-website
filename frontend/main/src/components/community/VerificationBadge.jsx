/**
 * VerificationBadge — reusable social-media-style verification badge.
 *
 * Renders a small filled circle with a white checkmark SVG inside,
 * visually inspired by Instagram / Facebook verified badges.
 *
 * Badge colours:
 *   national      → green  (#22c55e)  Verified National Athlete
 *   international → blue   (#3b82f6)  Verified International Athlete
 *   organization  → yellow (#eab308)  Verified Organization / Club
 *   official      → white circle with black tick (Climb Pakistan Official)
 *
 * Renders nothing for `none` or unknown types.
 *
 * Props:
 *   verification — one of 'national' | 'international' | 'organization' | 'official' | 'none'
 *   size         — optional pixel size (default 14)
 */

const CONFIG = {
  national: {
    bg: '#22c55e',
    check: '#ffffff',
    label: 'Verified National Athlete',
  },
  international: {
    bg: '#3b82f6',
    check: '#ffffff',
    label: 'Verified International Athlete',
  },
  organization: {
    bg: '#eab308',
    check: '#ffffff',
    label: 'Verified Organization / Club',
  },
  // Twitter-style legacy badge: white circle with a black tick. A subtle ring
  // keeps the white circle visible on light backgrounds.
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
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        {/* Filled circle (with a subtle ring for the white official badge) */}
        <circle
          cx="12"
          cy="12"
          r={config.ring ? 11.5 : 12}
          fill={config.bg}
          stroke={config.ring || 'none'}
          strokeWidth="1"
        />
        {/* Checkmark */}
        <path
          d="M7 12.5l3.5 3.5 6.5-7"
          stroke={config.check}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
