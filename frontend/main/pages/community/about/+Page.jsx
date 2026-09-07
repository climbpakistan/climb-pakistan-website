import Seo from '../../../src/components/Seo';
import { communityTopics } from '../../../src/data/communityData';

export { Page };

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
              Ask questions, share beta from your latest crag, post competition results,
              swap gear advice and follow the climbers you care about — all in one place.
            </p>

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
