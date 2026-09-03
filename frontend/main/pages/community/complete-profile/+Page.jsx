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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill={color} />
      <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
                    <h4>National Climber</h4>
                  </div>
                  <p className="community-badge-card-text">For climbers recognized at the national level in Pakistan.</p>
                </div>

                <div className="community-badge-card">
                  <div className="community-badge-card-header">
                    <VerificationBadgeMini color="#3b82f6" />
                    <h4>International Climber</h4>
                  </div>
                  <p className="community-badge-card-text">For climbers recognized at the international level.</p>
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
