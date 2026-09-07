import Seo from '../../../src/components/Seo';
import { communityTopics } from '../../../src/data/communityData';

export { Page };

// Community guidelines — kept short and scannable. Rendered as a checklist.
const guidelines = [
  { icon: '🤝', text: 'Respect other climbers' },
  { icon: '🧗', text: 'Keep discussions climbing-related' },
  { icon: '✅', text: 'Share accurate information' },
  { icon: '🚫', text: 'No spam or harassment' },
];

// Static "About the Community" page — linked from the feed's right sidebar
// card (/community/about). Public, no data fetching.
function Page() {
  return (
    <>
      <Seo
        title="About the Community"
        description="A space for Pakistan's sport climbing community to connect, discuss, share and learn."
        keywords="Climb Pakistan community, Pakistani climbing community, sport climbing Pakistan forum, climbing discussion Pakistan"
        path="/community/about"
        noIndex
      />

      <section className="page-header page-header--enhanced community-feed-header">
        <div className="page-header-bg-grid"></div>
        <div className="page-header-glow"></div>
        <div className="container">
          <div className="community-feed-headrow">
            <div className="hero-entrance">
              <h1 className="page-title">About the Community</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight community-feed-body">
        <div className="container community-about-page">
          <div className="community-about-card-page">
            <p className="community-about-lead">
              A space for Pakistan&rsquo;s sport climbing community to connect, discuss,
              share and learn.
            </p>
            <p className="community-about-body">
              The Climb Pakistan Community is where the country&rsquo;s sport climbers
              come together — from first-time gym visitors to national team athletes.
              Ask questions about training or technique, share beta from the crags
              you&rsquo;ve explored, post competition results, swap gear advice, and
              follow the climbers and organizations shaping the sport in Pakistan.
            </p>
            <p className="community-about-body">
              Every post is organized by topic, so whether you&rsquo;re chasing your
              first lead climb or following the national competition circuit, the
              discussions you care about are easy to find. Verified athlete and
              organization profiles keep the conversation grounded in real
              experience, and moderators keep the space welcoming for everyone.
            </p>

            <h2 className="community-about-subtitle">Community Guidelines 📋</h2>
            <ul className="community-about-guidelines">
              {guidelines.map((g) => (
                <li key={g.text} className="community-about-guideline">
                  <span className="community-about-guideline-icon" aria-hidden="true">{g.icon}</span>
                  <span>{g.text}</span>
                </li>
              ))}
            </ul>

            <h2 className="community-about-subtitle">Topics you can discuss</h2>
            <div className="community-about-topics">
              {communityTopics.map((topic) => (
                <a
                  key={topic}
                  href={`/community/feed?category=${encodeURIComponent(topic)}`}
                  className="community-about-topic"
                >
                  {topic}
                </a>
              ))}
            </div>

            <div className="community-about-actions">
              <a href="/community/feed" className="btn btn-primary">Browse the feed</a>
              <a href="/community/create" className="btn btn-outline">Create a post</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
