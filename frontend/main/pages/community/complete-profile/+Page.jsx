import { useRef, useState, useEffect } from 'react';
import { navigate } from 'vike/client/router';
import { AnimatedPageHeader } from '../../../src/hooks/animations';
import Seo from '../../../src/components/Seo';
import { communityUpdateProfile } from '../../../src/api';
import { useCommunity } from '../../../src/hooks/CommunityContext';

export { Page };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4000;

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

function VerificationBadgeMini({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z"
        fill={color}
      />
      <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#fff" />
    </svg>
  );
}

function Page() {
  const { user, token, isGuest, updateUser } = useCommunity();
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || '');
  const [instagramUrl, setInstagramUrl] = useState(user?.instagramUrl || '');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.profileImageUrl || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const urlRef = useRef(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isGuest && user) return;
    if (!isGuest) return;
    navigate('/community/login');
  }, [isGuest, user]);

  if (isGuest) return null;

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) { setAvatar(null); setAvatarPreview(user?.profileImageUrl || null); return; }
    const meta = await readImageMeta(file);
    if (!meta.valid) { setError(meta.error); e.target.value = ''; return; }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = meta.url;
    setAvatar(file);
    setAvatarPreview(meta.url);
    setError('');
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { user: updated } = await communityUpdateProfile(token, { bio, avatar, city, instagramUrl });
      updateUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    navigate('/community/feed');
  }

  return (
    <>
      <Seo
        title="Complete Your Profile"
        description="Complete your Climb Pakistan community profile."
        path="/community/complete-profile"
        noIndex
      />

      <AnimatedPageHeader>
        <h1 className="page-title">Complete your profile</h1>
        <p className="page-sub" style={{ marginInline: 'auto', textAlign: 'center' }}>
          Add more details to your profile. All fields are optional — you can always fill them in later.
        </p>
      </AnimatedPageHeader>

      <section className="section-tight">
        <div className="container community-form-wrap">
          <form className="community-form" onSubmit={handleSaveProfile} noValidate>
            {/* ── Profile Photo ── */}
            <div className="form-row community-avatar-field">
              <label>Profile Photo <span className="form-optional">(optional)</span></label>
              <div className="community-avatar-input">
                <div className="community-avatar-preview">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" />
                  ) : (
                    <span className="community-avatar-fallback">{user?.username ? user.username[0].toUpperCase() : '?'}</span>
                  )}
                </div>
                <div className="community-avatar-controls">
                  <input type="file" accept="image/*" onChange={handleAvatarChange} />
                  <p className="form-hint">PNG/JPG, up to 5&nbsp;MB.</p>
                </div>
              </div>
            </div>

            {/* ── Bio ── */}
            <div className="form-row">
              <label htmlFor="bio">Bio <span className="form-optional">(optional)</span></label>
              <textarea
                id="bio"
                rows={4}
                maxLength={300}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the community a little about yourself."
              />
              <p className="form-hint">{bio.length}/300</p>
            </div>

            {/* ── City ── */}
            <div className="form-row">
              <label htmlFor="city">City / Region <span className="form-optional">(optional)</span></label>
              <input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Islamabad, Karachi"
                maxLength={100}
              />
            </div>

            {/* ── Instagram ── */}
            <div className="form-row">
              <label htmlFor="instagram">Instagram Link <span className="form-optional">(optional)</span></label>
              <input
                type="url"
                id="instagram"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://www.instagram.com/yourusername"
              />
              <p className="form-hint">Your Instagram profile URL.</p>
            </div>

            {/* ── Verification Badges Info ── */}
            <div className="community-verification-section">
              <h3 className="community-badge-title">Verification Badges</h3>
              <p className="community-badge-subtitle">
                Verified badges confirm your identity on Climb Pakistan.
              </p>

              <ol className="community-badge-steps">
                <li>Send a message from your official Instagram account to{' '}
                  <a href="https://www.instagram.com/climb_pakistan" target="_blank" rel="noopener noreferrer" className="community-badge-instagram-link">@climb_pakistan</a>.
                </li>
                <li>Send us the email address you used to create your Climb Pakistan account so we can identify your profile.</li>
                <li>Once your identity is confirmed, you&rsquo;ll receive the appropriate verification badge for your category.</li>
              </ol>

              <div className="community-badge-actions">
                <div className="community-badge-card">
                  <div className="community-badge-card-header">
                    <VerificationBadgeMini color="#22c55e" />
                    <h4>Verified Athlete</h4>
                  </div>
                  <p className="community-badge-card-text">For climbers recognized at the national or international level in Pakistan.</p>
                </div>

                <div className="community-badge-card">
                  <div className="community-badge-card-header">
                    <VerificationBadgeMini color="#eab308" />
                    <h4>Organization / Club / Team</h4>
                  </div>
                  <p className="community-badge-card-text">For official climbing organizations, clubs, and teams.</p>
                </div>
              </div>
            </div>

            {error && <p className="form-status form-status--error" role="alert">{error}</p>}
            {saved && <p className="form-status form-status--success">Profile saved successfully!</p>}

            <div className="community-form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleSkip}>
                Skip for now
              </button>
            </div>
          </form>

          <div className="community-form-actions community-form-actions--center">
            <a href="/community/feed" className="btn btn-primary">Go to Community Feed</a>
          </div>
        </div>
      </section>
    </>
  );
}
