import { useState } from 'react';
import { navigate } from 'vike/client/router';
import { usePageContext } from 'vike-react/usePageContext';
import { AnimatedPageHeader } from '../../../src/hooks/animations';
import Seo from '../../../src/components/Seo';
import { communityLogin } from '../../../src/api';
import { useCommunity } from '../../../src/hooks/CommunityContext';

export { Page };

const SAFE_REDIRECT = /^\/(?!\/)/; // only relative paths

function Page() {
  const { signIn } = useCommunity();
  const pageContext = usePageContext();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
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

      const nextParam = pageContext?.urlParsed?.search?.next;
      const target = nextParam && SAFE_REDIRECT.test(nextParam) ? nextParam : '/community/feed';
      await navigate(target);
    } catch (err) {
      setFormError(err.message || 'Incorrect username/email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Log In to the Community"
        description="Log in to your Climb Pakistan community account to create posts, comment, vote and save content."
        keywords="Climb Pakistan community login, community account log in, Pakistani climbing community sign in, climbing forum login Pakistan"
        path="/community/login"
        noIndex
      />

      <AnimatedPageHeader>
        <h1 className="page-title">Welcome Back</h1>
        <p className="page-sub" style={{ marginInline: 'auto', textAlign: 'center' }}>
          Log in to participate in the Climb Pakistan Community.
        </p>
      </AnimatedPageHeader>

      <section className="section-tight">
        <div className="container community-form-wrap">
          <form className="community-form" onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <label htmlFor="identifier">Username or email</label>
              <input
                type="text"
                id="identifier"
                name="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or your username"
              />
              {errors.identifier && <p className="form-error">{errors.identifier}</p>}
            </div>

            <div className="form-row">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            {formError && <p className="form-status form-status--error" role="alert">{formError}</p>}

            <div className="community-form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Logging In…' : 'Log In'}
              </button>
              <a href="/community/signup" className="btn btn-ghost">Create an account</a>
            </div>

            <a href="/community/feed" className="community-form-guest">Continue as guest instead</a>
          </form>
        </div>
      </section>
    </>
  );
}