import { navigate } from 'vike/client/router';
import { useCommunity } from '../../../src/hooks/CommunityContext';
import { AnimatedPageHeader } from '../../../src/hooks/animations';
import Seo from '../../../src/components/Seo';

export { Page };

function Page() {
  const { user, isGuest, initializing } = useCommunity();

  // The canonical profile lives at /community/u/:username — this /community/profile
  // route just hands the visitor off there.
  if (!initializing && !isGuest && user?.username) {
    navigate(`/community/u/${user.username}`);
  }

  return (
    <>
      <Seo
        title="Your Profile"
        description="Your Climb Pakistan Community profile."
        path="/community/profile"
        noIndex
      />

      <AnimatedPageHeader>
        <span className="eyebrow">Community</span>
        <h1 className="page-title">Your Profile</h1>
      </AnimatedPageHeader>

      <section className="section-tight">
        <div className="container community-form-wrap">
          {initializing ? (
            <p className="profile-loading">Loading your profile…</p>
          ) : isGuest ? (
            <div className="profile-card profile-card--guest">
              <h2 className="profile-username">You&rsquo;re browsing as a guest</h2>
              <p className="profile-name">
                Log in or create an account to view and manage your profile.
              </p>
              <div className="community-form-actions">
                <a href="/community/login" className="btn btn-primary">Log In</a>
                <a href="/community/signup" className="btn btn-outline">Sign Up</a>
              </div>
            </div>
          ) : (
            <p className="profile-loading">Taking you to your profile…</p>
          )}
        </div>
      </section>
    </>
  );
}