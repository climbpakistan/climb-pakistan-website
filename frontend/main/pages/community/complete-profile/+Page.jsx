import { useRef, useState, useEffect } from 'react';
import { navigate } from 'vike/client/router';
import { AnimatedPageHeader } from '../../../src/hooks/animations';
import Seo from '../../../src/components/Seo';
import { communityUpdateProfile, submitBadgeApplication, getMyBadgeApplications } from '../../../src/api';
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

function BadgeApplicationSection({ token, onUpdate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getMyBadgeApplications(token)
      .then((data) => setApplications(data.applications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleApply(badgeType) {
    setSubmitting(badgeType);
    setError('');
    setSuccess('');
    try {
      await submitBadgeApplication(token, { badgeType, message });
      const data = await getMyBadgeApplications(token);
      setApplications(data.applications || []);
      setSuccess(`Application for ${badgeType === 'national' ? 'National' : 'International'} Climber badge submitted!`);
      setMessage('');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message || 'Could not submit application.');
    } finally {
      setSubmitting(null);
    }
  }

  const pendingNational = applications.find((a) => a.badgeType === 'national' && a.status === 'pending');
  const pendingInternational = applications.find((a) => a.badgeType === 'international' && a.status === 'pending');
  const approvedNational = applications.find((a) => a.badgeType === 'national' && a.status === 'approved');
  const approvedInternational = applications.find((a) => a.badgeType === 'international' && a.status === 'approved');

  if (loading) return <p className="text-muted">Loading badge status…</p>;

  return (
    <div className="community-badge-section">
      <h3 className="community-badge-title">Apply for Verification Badges</h3>
      <p className="community-badge-subtitle">
        Verified badges are reviewed by the Climb Pakistan team. Applying does not guarantee approval.
      </p>

      {error && <p className="form-status form-status--error" role="alert">{error}</p>}
      {success && <p className="form-status form-status--success">{success}</p>}

      <div className="form-row">
        <label htmlFor="badge-message">Message to reviewers <span className="form-optional">(optional)</span></label>
        <textarea
          id="badge-message"
          rows={3}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your climbing achievements and why you're applying…"
        />
      </div>

      <div className="community-badge-actions">
        <div className="community-badge-card">
          <div className="community-badge-card-header">
            <span className="community-badge-icon community-badge-icon--national">✓</span>
            <h4>National Climber Badge</h4>
          </div>
          <p className="community-badge-card-text">For climbers recognized at the national level in Pakistan.</p>
          {approvedNational ? (
            <span className="badge badge-success">Approved</span>
          ) : pendingNational ? (
            <span className="badge badge-warning">Application Pending</span>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting === 'national'}
              onClick={() => handleApply('national')}
            >
              {submitting === 'national' ? 'Submitting…' : 'Apply for National Badge'}
            </button>
          )}
        </div>

        <div className="community-badge-card">
          <div className="community-badge-card-header">
            <span className="community-badge-icon community-badge-icon--international">✓</span>
            <h4>International Climber Badge</h4>
          </div>
          <p className="community-badge-card-text">For climbers recognized at the international level.</p>
          {approvedInternational ? (
            <span className="badge badge-success">Approved</span>
          ) : pendingInternational ? (
            <span className="badge badge-warning">Application Pending</span>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting === 'international'}
              onClick={() => handleApply('international')}
            >
              {submitting === 'international' ? 'Submitting…' : 'Apply for International Badge'}
            </button>
          )}
        </div>
      </div>
    </div>
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
    if (!isGuest && user) return; // logged in — fine
    if (!isGuest) return; // initializing
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
        <span className="eyebrow">Community</span>
        <h1 className="page-title">Complete your profile</h1>
        <p className="page-sub" style={{ marginInline: 'auto', textAlign: 'center' }}>
          Add more details to your profile. All fields are optional — you can always fill them in later.
        </p>
      </AnimatedPageHeader>

      <section className="section-tight">
        <div className="container community-form-wrap">
          <form className="community-form" onSubmit={handleSaveProfile} noValidate>
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

          {/* Badge Application Section */}
          <div className="community-form" style={{ marginTop: 'var(--sp-8)' }}>
            <BadgeApplicationSection token={token} onUpdate={() => {}} />
          </div>

          <div className="community-form-actions" style={{ marginTop: 'var(--sp-6)', justifyContent: 'center' }}>
            <a href="/community/feed" className="btn btn-primary">Go to Community Feed</a>
          </div>
        </div>
      </section>
    </>
  );
}
