import { useEffect } from 'react';
import { navigate } from 'vike/client/router';
import { AnimatedPageHeader, AnimatedSection } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';
import { communityCopy } from '../../src/data/communityData';
import { useCommunity } from '../../src/hooks/CommunityContext';

export { Page };

function Page() {
  const { isGuest, initializing } = useCommunity();

  // If the user is already logged in, redirect to the feed
  useEffect(() => {
    if (!initializing && !isGuest) {
      navigate('/community/feed');
    }
  }, [isGuest, initializing]);

  // Show loading state while checking authentication
  if (initializing || !isGuest) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Climb Pakistan Community"
        description="A place for climbers to discuss sport climbing in Pakistan — speed climbing, lead climbing, bouldering, training, competitions, gear and more. Join the community or browse as a guest."
        keywords="Climb Pakistan community, Pakistani climbing community, sport climbing Pakistan forum, speed climbing Pakistan, lead climbing Pakistan, bouldering Pakistan, climbing training Pakistan, climbing gear, outdoor climbing Pakistan"
        path="/community"
      />

      <AnimatedPageHeader>
        <h1 className="page-title">A place for climbers to connect</h1>
        <p className="page-sub" style={{ marginInline: 'auto', textAlign: 'center' }}>
          {communityCopy.tagline}
        </p>
      </AnimatedPageHeader>

      {/* ── Join actions ── */}
      <AnimatedSection className="section-tight community-actions-section">
        <div className="container">
          <div className="community-choice-grid">
            <div className="community-action-card">
              <span className="community-action-index" aria-hidden="true">01</span>
              <h3 className="community-action-title">Sign Up</h3>
              <p className="community-action-blurb">{communityCopy.signUpBlurb}</p>
              <a href="/community/signup" className="btn btn-primary community-action-btn">
                Sign Up
              </a>
            </div>

            <div className="community-action-card">
              <span className="community-action-index" aria-hidden="true">02</span>
              <h3 className="community-action-title">Log In</h3>
              <p className="community-action-blurb">{communityCopy.logInBlurb}</p>
              <a href="/community/login" className="btn btn-outline community-action-btn">
                Log In
              </a>
            </div>

            <div className="community-action-card community-action-card--guest">
              <span className="community-action-index" aria-hidden="true">03</span>
              <h3 className="community-action-title">Continue as Guest</h3>
              <p className="community-action-blurb">{communityCopy.guestBlurb}</p>
              <a href="/community/feed" className="btn btn-ghost community-action-btn">
                Continue as Guest
              </a>
            </div>
          </div>

          <p className="community-guest-note">
            No account? No problem — guests can browse every post. Create an
            account whenever you&apos;re ready to join the conversation.
          </p>
        </div>
      </AnimatedSection>
    </>
  );
}