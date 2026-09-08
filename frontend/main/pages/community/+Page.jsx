import { useEffect, useState } from 'react';
import { navigate } from 'vike/client/router';
import { useData } from 'vike-react/useData';
import Seo from '../../src/components/Seo';
import PasswordInput from '../../src/components/community/PasswordInput';
import { useCommunity } from '../../src/hooks/CommunityContext';
import { communityLogin } from '../../src/api';
import { formatPostDate } from '../../src/utils/communityPosts';

export { Page };

const LANDING_SEO = (
  <Seo
    title="Climb Pakistan Community"
    description="A place for climbers to discuss sport climbing in Pakistan — speed climbing, lead climbing, bouldering, training, competitions, gear and more."
    keywords="Climb Pakistan community, Pakistani climbing community, sport climbing Pakistan forum"
    path="/community"
  />
);

// Public branding + feature highlights. Rendered during SSR (and to guests) so
// crawlers see real Community information in the initial HTML.
function LandingHero() {
  return (
    <div className="community-landing-hero">
      {/* Branding */}
      <div className="community-landing-brand">
        <h1 className="community-landing-logo">
          <span className="logo-climb">Climb</span>&nbsp;<span className="logo-pakistan">Pakistan</span>
        </h1>
        <p className="community-landing-tagline">
          A community for climbers to connect, share and grow together.
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
  );
}

// Server-rendered recent public discussions — real internal links to
// individual discussions from the indexable /community landing page.
function RecentDiscussions({ posts }) {
  if (!posts || posts.length === 0) return null;
  return (
    <section className="community-landing-recent" aria-label="Recent discussions">
      <div className="container">
        <h2 className="community-landing-recent-title">Recent Discussions</h2>
        <ul className="community-landing-recent-list">
          {posts.map((p) => (
            <li key={p.id} className="community-landing-recent-item">
              <a href={`/community/post/${p.id}`} className="community-landing-recent-link">
                {p.title}
              </a>
              <span className="community-landing-recent-meta">
                {p.category} · {formatPostDate(p.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Page() {
  const { signIn, isGuest, initializing } = useCommunity();
  const { recentPosts = [] } = useData();

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

  // While the stored session validates (which includes all of SSR), render the
  // public hero + recent discussions so crawlers see useful content — but not
  // the login form, so logged-in users never flash it before being redirected.
  if (initializing) {
    return (
      <>
        {LANDING_SEO}
        <div className="community-landing">
          <LandingHero />
        </div>
        <RecentDiscussions posts={recentPosts} />
      </>
    );
  }

  // Logged-in (post-validation): show the loading state while redirecting.
  if (!isGuest) {
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
      {LANDING_SEO}

      <div className="community-landing">
        <LandingHero />

        {/* Right side - Login/Signup */}
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
                <PasswordInput
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
      </div>

      <RecentDiscussions posts={recentPosts} />
    </>
  );
}