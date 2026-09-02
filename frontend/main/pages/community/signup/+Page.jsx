import { useRef, useState } from 'react';
import { navigate } from 'vike/client/router';
import { AnimatedPageHeader } from '../../../src/hooks/animations';
import Seo from '../../../src/components/Seo';
import { communityRegister } from '../../../src/api';
import { useCommunity } from '../../../src/hooks/CommunityContext';

export { Page };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // match backend limit (5 MB)
const MAX_IMAGE_DIMENSION = 4000;

const RESERVED = ['admin', 'administrator', 'mod', 'moderator', 'support', 'climbpakistan', 'team', 'official', 'staff', 'system', 'root'];

const USERNAME_HINT = '3–20 characters: letters, numbers, underscores — must start with a letter.';

function readImageMeta(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) return resolve({ valid: false, error: 'Please choose an image file.' });
    if (file.size > MAX_IMAGE_BYTES) return resolve({ valid: false, error: 'Image must be smaller than 5 MB.' });

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: 'Image dimensions are too large. Please use an image under 4000px.' });
      } else {
        resolve({ valid: true, url });
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ valid: false, error: 'That file could not be read as an image.' }); };
    img.src = url;
  });
}

function Page() {
  const { signIn } = useCommunity();
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const urlRef = useRef(null);

  function validate() {
    const next = {};
    const u = username.trim().replace(/^@/, '').toLowerCase();
    if (!u) next.username = 'Username is required.';
    else if (u.length < 3 || u.length > 20) next.username = 'Username must be between 3 and 20 characters.';
    else if (!/^[a-z][a-z0-9_]{2,19}$/.test(u)) next.username = 'Usernames can only contain letters, numbers, and underscores, and must start with a letter.';
    else if (RESERVED.includes(u)) next.username = 'That username is reserved and cannot be used.';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Please enter a valid email address.';

    if (!password) next.password = 'Password is required.';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) next.password = 'Password must contain at least one letter and one number.';

    if (confirm !== password) next.confirm = 'Passwords do not match.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setAvatar(null);
      setAvatarPreview(null);
      return;
    }
    const meta = await readImageMeta(file);
    if (!meta.valid) {
      setAvatar(null);
      setAvatarPreview(null);
      setErrors((prev) => ({ ...prev, avatar: meta.error }));
      e.target.value = '';
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = meta.url;
    setAvatar(file);
    setAvatarPreview(meta.url);
    setErrors((prev) => ({ ...prev, avatar: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { user, token } = await communityRegister({ username, email, password, avatar });
      signIn(token, user);
      await navigate('/community/feed');
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Create a Community Account"
        description="Sign up for a Climb Pakistan community account to create posts, comment, vote and save content."
        keywords="Climb Pakistan community signup, create community account, Pakistani climbing community register, climbing forum sign up Pakistan"
        path="/community/signup"
        noIndex
      />

      <AnimatedPageHeader>
        <span className="eyebrow">Community</span>
        <h1 className="page-title">Create your account</h1>
        <p className="page-sub" style={{ marginInline: 'auto', textAlign: 'center' }}>
          Join the Climb Pakistan Community to start discussions, comment, and vote on posts.
        </p>
      </AnimatedPageHeader>

      <section className="section-tight">
        <div className="container community-form-wrap">
          <form className="community-form" onSubmit={handleSubmit} noValidate>
            {/* Profile image */}
            <div className="form-row community-avatar-field">
              <label>Profile image <span className="form-optional">(optional)</span></label>
              <div className="community-avatar-input">
                <div className="community-avatar-preview">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" />
                  ) : (
                    <span className="community-avatar-fallback">{username.trim() ? username.trim()[0].toUpperCase() : '?'}</span>
                  )}
                </div>
                <div className="community-avatar-controls">
                  <input
                    type="file"
                    id="avatar"
                    name="avatar"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <p className="form-hint">PNG/JPG, up to 5&nbsp;MB. Leave blank to use a default avatar.</p>
                </div>
              </div>
              {errors.avatar && <p className="form-error">{errors.avatar}</p>}
            </div>

            <div className="form-row">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. cliff_runner"
              />
              {errors.username ? (
                <p className="form-error">{errors.username}</p>
              ) : (
                <p className="form-hint">{USERNAME_HINT}</p>
              )}
            </div>

            <div className="form-row">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div className="form-row">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters, with a letter and a number"
              />
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            <div className="form-row">
              <label htmlFor="confirm">Confirm password</label>
              <input
                type="password"
                id="confirm"
                name="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
              />
              {errors.confirm && <p className="form-error">{errors.confirm}</p>}
            </div>

            {formError && <p className="form-status form-status--error" role="alert">{formError}</p>}

            <div className="community-form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating Account…' : 'Create Account'}
              </button>
              <a href="/community/login" className="btn btn-ghost">Log in instead</a>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}