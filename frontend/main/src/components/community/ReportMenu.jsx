import { useState } from 'react';
import { useCommunity } from '../../hooks/CommunityContext';
import { submitReport } from '../../api';
import { reportReasons } from '../../data/communityData';

/**
 * ReportMenu — the `⋯` menu with a Report option, available on any post or
 * comment. Logged-in users can report with a reason (and optional details).
 * Duplicate reports are rejected server-side.
 */
export default function ReportMenu({ postId, commentId, marker = 'More' }) {
  const { token, isGuest, openAuthPrompt } = useCommunity();

  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleOpen() {
    if (isGuest) {
      openAuthPrompt('Log in to report content.');
      return;
    }
    setOpen((v) => !v);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!reason) return setError('Please choose a reason.');
    if (reason === 'Other' && !details.trim()) {
      return setError('Please provide additional details.');
    }
    setReporting(true);
    try {
      await submitReport(token, {
        ...(postId ? { postId } : {}),
        ...(commentId ? { commentId } : {}),
        reason,
        details,
      });
      setSuccess(true);
      setReporting(false);
    } catch (err) {
      setError(err.message || 'Could not submit your report.');
      setReporting(false);
    }
  }

  return (
    <div className="community-post-menu">
      <button
        type="button"
        className="community-post-action community-post-menu-btn"
        aria-label={`${marker} menu`}
        aria-expanded={open}
        onClick={handleOpen}
      >
        ⋯
      </button>

      {open && (
        <div className="community-report-panel">
          {success ? (
            <p className="community-report-success">
              Thank you. Your report has been submitted and our moderators will review it.
              <button type="button" className="community-post-menu-item" onClick={() => { setOpen(false); setSuccess(false); setReason(''); setDetails(''); }}>
                Done
              </button>
            </p>
          ) : (
            <form className="community-report-form" onSubmit={handleSubmit}>
              <div className="community-report-title">Report this {postId ? 'post' : 'comment'}</div>
              <div className="community-report-reasons">
                {reportReasons.map((r) => (
                  <label key={r} className="community-report-reason">
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={reason === r}
                      onChange={(e) => { setReason(e.target.value); setError(''); }}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
              {reason === 'Other' && (
                <textarea
                  className="community-report-details"
                  rows={2}
                  maxLength={2000}
                  placeholder="Additional details…"
                  value={details}
                  onChange={(e) => { setDetails(e.target.value); setError(''); }}
                />
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="community-report-actions">
                <button type="submit" className="btn btn-primary" disabled={reporting}>
                  {reporting ? 'Submitting…' : 'Submit Report'}
                </button>
                <button type="button" className="community-post-menu-item" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
