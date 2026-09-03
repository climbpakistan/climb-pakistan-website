// ============================================================================
// Community static data — topics, navigation, and shared copy for the
// Climb Pakistan Community. Structured so the community section can be
// extended later (Popular / New / Top views, real posts, etc.) without
// rewriting these files.
// ============================================================================

// Topics visitors can discuss in the community.
export const communityTopics = [
  'Questions',
  'News',
  'Competition',
  'Training',
  'Outdoor Climbing',
  'Climbing Gear',
];

// Top-level community navigation. This is the seam we expand later.
// `view` maps to future feed views (for now tabs are informational).
export const communityNav = [
  { label: 'Community', to: '/community' },
  { label: 'Popular', to: '/community/feed?view=popular' },
  { label: 'New', to: '/community/feed?view=new' },
  { label: 'Top', to: '/community/feed?view=top' },
];

// Feed sort tabs rendered inside the feed page header.
export const feedSortTabs = [
  { label: 'Popular', to: '?view=popular', value: 'popular' },
  { label: 'New', to: '?view=new', value: 'new' },
  { label: 'Top', to: '?view=top', value: 'top' },
];

// Copy strings reused across the entry / feed / auth-prompt.
export const communityCopy = {
  tagline:
    'A place for climbers to discuss sport climbing in Pakistan.',
  signUpBlurb:
    'Create a Climb Pakistan community account.',
  logInBlurb:
    'Already have an account? Log in to participate in the community.',
  guestBlurb:
    'Browse community posts without creating an account.',
  authPromptTitle:
    'Create an account to participate in the Climb Pakistan Community.',
  authPromptBody:
    'Sign up or log in to create posts, comment, vote, and save content. Until then you can still browse the community as a guest.',
};

// ── Posts ──
// Post types. Video uploads are NOT supported.
export const postTypes = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'link', label: 'Link' },
  { value: 'poll', label: 'Poll' },
];

// Poll duration presets (hours). null = no expiry.
export const pollDurations = [
  { value: 24, label: '1 day' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
  { value: null, label: 'No expiry' },
];
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 12;

// Top view time filters.
export const topTimeFilters = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

// Reasons users can cite when reporting content.
export const reportReasons = [
  'Spam',
  'Harassment or bullying',
  'Offensive content',
  'Dangerous climbing advice',
  'False or misleading information',
  'Unauthorized promotion or advertising',
  'Off-topic',
  'Other',
];

export const postCategories = [
  'Questions',
  'News',
  'Competition',
  'Training',
  'Outdoor Climbing',
  'Climbing Gear',
];

export const MAX_POST_TITLE_LENGTH = 300;
export const MAX_POST_BODY_LENGTH = 5000;
export const FEED_PAGE_SIZE = 20;