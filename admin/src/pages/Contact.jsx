import { useState, useEffect } from 'react';
import { getContactSettings, updateContactSettings } from '../api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getContactSettings()
      .then((data) => setEmail(data.notificationEmail || ''))
      .catch((err) => setError('Failed to load settings: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Notification email is required.');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    try {
      const result = await updateContactSettings({ notificationEmail: email.trim() });
      setSuccess(result.message || 'Settings saved successfully!');
      setEmail(result.notificationEmail);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Contact</h1>
        <p>Manage contact form settings and email notifications.</p>
      </div>

      {success && (
        <div style={{
          background: 'var(--success-bg, #d4edda)',
          color: 'var(--success-text, #155724)',
          padding: 'var(--sp-3) var(--sp-4)',
          borderRadius: 8,
          marginBottom: 'var(--sp-4)',
          fontSize: 'var(--fs-sm)',
          fontWeight: 500,
        }}>
          {success}
        </div>
      )}

      <div className="card" style={{ maxWidth: '720px', marginBottom: 'var(--sp-8)' }}>
        <div className="card-header">
          <h3 className="card-title">Contact Settings</h3>
        </div>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>
          When a visitor submits the contact form, the message will be sent to this email address. Messages are not stored on the website.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="contact-email">Notification Email *</label>
          <input
            className="form-input"
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); setSuccess(''); }}
            placeholder="contact@example.com"
            style={{ fontSize: 'var(--fs-base)' }}
          />
          {error && (
            <p style={{ color: 'var(--error)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-1)' }}>{error}</p>
          )}
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="card" style={{ maxWidth: '720px' }}>
        <div className="card-header">
          <h3 className="card-title">How It Works</h3>
        </div>
        <ol style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0, paddingLeft: 'var(--sp-5)' }}>
          <li>Visitors fill out the Contact form on the public website.</li>
          <li>The form sends their name, email, subject, and message to this backend.</li>
          <li>An email is forwarded to the Notification Email address above.</li>
          <li>Messages are <strong>not</strong> stored in the database or displayed here.</li>
        </ol>
      </div>
    </>
  );
}
