export default function MedalIcon({ type, size = 22 }) {
  const medals = {
    gold: {
      gradient: ['#f9d976', '#f39c12'],
      shine: '#fde8a0',
      rim: '#c47f0b',
      ribbon: '#e74c3c',
      star: '#b37100',
    },
    silver: {
      gradient: ['#e8eaed', '#a8adb7'],
      shine: '#f2f3f5',
      rim: '#7a808d',
      ribbon: '#3b82f6',
      star: '#5a6070',
    },
    bronze: {
      gradient: ['#e8b88a', '#c7783a'],
      shine: '#f0d0b0',
      rim: '#9e5d22',
      ribbon: '#22b8a0',
      star: '#7a4515',
    },
  };

  const m = medals[type] || medals.gold;
  const s = size;

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={`medal-grad-${type}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={m.gradient[0]} />
          <stop offset="100%" stopColor={m.gradient[1]} />
        </linearGradient>
        <linearGradient id={`medal-shine-${type}`} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={m.shine} stopOpacity="0.6" />
          <stop offset="40%" stopColor={m.shine} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`medal-rim-${type}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="75%" stopColor={m.rim} stopOpacity="0" />
          <stop offset="90%" stopColor={m.rim} stopOpacity="0.3" />
          <stop offset="100%" stopColor={m.rim} stopOpacity="0.8" />
        </radialGradient>
      </defs>

      {/* Ribbon */}
      <path
        d="M7 2L12 6L17 2L15 8L12 11L9 8L7 2Z"
        fill={m.ribbon}
        opacity="0.9"
      />

      {/* Medal circle */}
      <circle cx="12" cy="15" r="7" fill={`url(#medal-grad-${type})`} />

      {/* Inner rim shadow for 3D effect */}
      <circle cx="12" cy="15" r="7" fill={`url(#medal-rim-${type})`} />

      {/* Shine overlay */}
      <circle cx="12" cy="15" r="7" fill={`url(#medal-shine-${type})`} />

      {/* Star in center */}
      <path
        d="M12 10.5L13.2 12.9L15.8 13.2L13.9 15.1L14.3 17.7L12 16.5L9.7 17.7L10.1 15.1L8.2 13.2L10.8 12.9Z"
        fill={m.star}
        opacity="0.85"
      />
    </svg>
  );
}
