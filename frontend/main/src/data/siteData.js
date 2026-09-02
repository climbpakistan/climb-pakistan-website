// ============================================================================
// Static navigation and footer data — still used directly by Header / Footer.
// All dynamic content (athletes, news, competitions, etc.) now comes from
// the backend API via the hooks in ../hooks/useFetch.js.
// ============================================================================

export const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Latest News', to: '/news' },
  { label: 'Athletes', to: '/athletes' },
  {
    label: 'Rankings', to: '/rankings',
    children: [
      { label: 'Rankings', to: '/rankings' },
      { label: 'National Championship Results', to: '/results' },
      { label: 'National Records', to: '/records', badge: 'NEW' },
    ],
  },
  { label: 'Competitions', to: '/competitions' },
  { label: 'Learn Climbing', to: '/learn' },
];

export const footerLinks = {
  explore: [
    { label: 'Latest News', to: '/news' },
    { label: 'Athletes', to: '/athletes' },
    { label: 'Community', to: '/community' },
  ],
  rankings: [
    { label: 'Rankings', to: '/rankings' },
    { label: 'National Records', to: '/records' },
    { label: 'National Championship Results', to: '/results' },
    { label: 'Competitions', to: '/competitions' },
  ],
  about: [
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ],
};
