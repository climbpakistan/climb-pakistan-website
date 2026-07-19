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
      { label: 'National Records', to: '/records' },
    ],
  },
  { label: 'Competitions', to: '/competitions' },
  { label: 'Learn Climbing', to: '/learn' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export const footerLinks = {
  explore: [
    { label: 'Latest News', to: '/news' },
    { label: 'Athletes', to: '/athletes' },
    { label: 'Rankings', to: '/rankings' },
    { label: 'Competitions', to: '/competitions' },
  ],
  more: [
    { label: 'Learn Climbing', to: '/learn' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ],
};
