import { useEffect, useState } from 'react';
import { navigate } from 'vike/client/router';
import { AnimatedPageHeader, AnimatedSection } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';
import { communityCopy } from '../../src/data/communityData';
import { useCommunity } from '../../src/hooks/CommunityContext';
import { communityLogin } from '../../src/api';

export { Page };

function Page() {
  const { signIn, isGuest, initializing } = useCommunity();

  // If the user is already logged in, redirect to the feed
  useEffect(() => {
    if (!initializing && !isGuest) {
      navigate('/community/feed');
    }
  }, [isGuest, initializing]);

  // Quick login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Show loading state while checking authentication
  if (initializing || !isGuest) {
    return (
      <div className="community-landing-loading">
        <div className="community-landing-spinner"></div>
      </div>
    );
  }

  async function handleQuickLogin(e) {
    e.preventDefault();
    setFormError('');
    const next = {};
    if (!identifier.trim()) next.identifier = 'Enter your username or email.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const { user, token } = await communityLogin({ identifier, password });
      signIn(token, user);
      await navigate('/community/feed');
    } catch (err) {
      setFormError(err.message || 'Incorrect username/email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Climb Pakistan Community"
        description="A place for climbers to discuss sport climbing in Pakistan — speed climbing, lead climbing, bouldering, training, competitions, gear and more."
        keywords="Climb Pakistan community, Pakistani climbing community, sport climbing Pakistan forum"
        path="/community"
      />

      {/* ── Desktop: classic choice layout (hidden on mobile) ── */}
      <div className="community-landing-desktop-only">
        <AnimatedPageHeader>
          <h1 className="page-title">A place for climbers to connect</h1>
          <p className="page-sub" style={{ marginInline: 'auto', textAlign: 'center' }}>
            {communityCopy.tagline}
          </p>
        </AnimatedPageHeader>

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
      </div>

      {/* ── Mobile: social-media login layout (hidden on desktop) ── */}
      <div className="community-landing community-landing-mobile-only">
        {/* Branding */}
        <div className="community-landing-brand">
          <h1 className="community-landing-logo">
            <span className="logo-climb">Climb</span>&nbsp;<span className="logo-pakistan">Pakistan</span>
          </h1>
          <p className="community-landing-tagline">
            A community for climbers to connect, share and grow together.
          </p>
        </div>

        {/* Login/Signup form */}
        <div className="community-landing-form-area">
          <div className="community-landing-form-card">
            {/* Quick Login */}
            <form className="community-landing-login" onSubmit={handleQuickLogin} noValidate>
              <div className="community-landing-input-group">
                <input
                  type="text"
                  placeholder="Username or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                />
                {errors.identifier && <p className="form-error">{errors.identifier}</p>}
              </div>
              <div className="community-landing-input-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                {errors.password && <p className="form-error">{errors.password}</p>}
              </div>

              {formError && <p className="form-status form-status--error" role="alert">{formError}</p>}

              <button type="submit" className="btn btn-primary community-landing-login-btn" disabled={submitting}>
                {submitting ? 'Logging in...' : 'Log In'}
              </button>

              <a href="/community/forgot-password" className="community-landing-forgot">Forgot password?</a>
            </form>

            <div className="community-landing-divider">
              <span>or</span>
            </div>

            {/* Signup */}
            <a href="/community/signup" className="btn btn-primary community-landing-signup-btn">
              Create New Account
            </a>
          </div>

          {/* Guest link */}
          <p className="community-landing-guest">
            <a href="/community/feed">Browse as Guest</a>
          </p>
        </div>

        {/* Features */}
        <div className="community-landing-features">
          <div className="community-landing-feature">
            <span className="community-landing-feature-icon">💬</span>
            <span>Discuss climbing</span>
          </div>
          <div className="community-landing-feature">
            <span className="community-landing-feature-icon">📸</span>
            <span>Share your climbing experiences</span>
          </div>
          <div className="community-landing-feature">
            <span className="community-landing-feature-icon">🧗</span>
            <span>Discover climbing in Pakistan</span>
          </div>
          <div className="community-landing-feature">
            <span className="community-landing-feature-icon">🤝</span>
            <span>Connect with climbers</span>
          </div>
        </div>
      </div>
    </>
  );
}
