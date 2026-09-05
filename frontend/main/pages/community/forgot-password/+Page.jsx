import { useState } from 'react';
import { navigate } from 'vike/client/router';
import { AnimatedPageHeader } from '../../../src/hooks/animations';
import Seo from '../../../src/components/Seo';
import PasswordInput from '../../../src/components/community/PasswordInput';
import { forgotPassword, verifyResetCode, resetPassword } from '../../../src/api';

export { Page };

function Page() {
  const [step, setStep] = useState(1); // 1 = email, 2 = code, 3 = new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSendCode(e) {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ email: 'Please enter a valid email address.' });
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSuccess('A 6-digit reset code has been sent to your email.');
      setErrors({});
      setStep(2);
    } catch (err) {
      setFormError(err.message || 'Could not send reset code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    if (!code.trim() || code.trim().length !== 6) {
      setErrors({ code: 'Please enter the 6-digit code.' });
      return;
    }

    setSubmitting(true);
    try {
      await verifyResetCode(email.trim(), code.trim());
      setSuccess('Code verified! Now set your new password.');
      setErrors({});
      setStep(3);
    } catch (err) {
      setFormError(err.message || 'Invalid reset code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    const next = {};
    if (!newPassword) next.newPassword = 'Password is required.';
    else if (newPassword.length < 8) next.newPassword = 'Password must be at least 8 characters.';
    else if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) next.newPassword = 'Password must contain at least one letter and one number.';

    if (newPassword !== confirmPassword) next.confirmPassword = 'Passwords do not match.';

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      setSuccess('Password has been reset successfully!');
      setErrors({});
      // Redirect to login after a short delay
      setTimeout(() => navigate('/community/login'), 2000);
    } catch (err) {
      setFormError(err.message || 'Could not reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Reset Password"
        description="Reset your Climb Pakistan community account password."
        path="/community/forgot-password"
        noIndex
      />

      <AnimatedPageHeader>
        <h1 className="page-title">Reset your password</h1>
        <p className="page-sub" style={{ marginInline: 'auto', textAlign: 'center' }}>
          {step === 1 && "Enter your email and we'll send you a reset code."}
          {step === 2 && "Enter the 6-digit code sent to your email."}
          {step === 3 && "Create a new password for your account."}
        </p>
      </AnimatedPageHeader>

      <section className="section-tight">
        <div className="container community-form-wrap">
          {/* Step progress */}
          <div className="reset-steps">
            <span className={`reset-step${step >= 1 ? ' is-active' : ''}`}>1. Email</span>
            <span className="reset-step-arrow">→</span>
            <span className={`reset-step${step >= 2 ? ' is-active' : ''}`}>2. Code</span>
            <span className="reset-step-arrow">→</span>
            <span className={`reset-step${step >= 3 ? ' is-active' : ''}`}>3. New Password</span>
          </div>

          <form className="community-form" onSubmit={step === 1 ? handleSendCode : step === 2 ? handleVerifyCode : handleResetPassword} noValidate>
            {/* Step 1: Enter email */}
            {step === 1 && (
              <div className="form-row">
                <label htmlFor="reset-email">Email address</label>
                <input
                  type="email"
                  id="reset-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                />
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>
            )}

            {/* Step 2: Enter code */}
            {step === 2 && (
              <>
                <p className="form-hint" style={{ marginBottom: 'var(--sp-2)' }}>
                  Code sent to <strong>{email}</strong>
                </p>
                <div className="form-row">
                  <label htmlFor="reset-code">6-digit code</label>
                  <input
                    type="text"
                    id="reset-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    style={{ letterSpacing: '6px', textAlign: 'center', fontSize: 'var(--fs-xl)' }}
                  />
                  {errors.code && <p className="form-error">{errors.code}</p>}
                </div>
              </>
            )}

            {/* Step 3: New password */}
            {step === 3 && (
              <>
                <div className="form-row">
                  <label htmlFor="new-password">New password</label>
                  <PasswordInput
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters, with a letter and a number"
                    autoFocus
                  />
                  {errors.newPassword && <p className="form-error">{errors.newPassword}</p>}
                </div>
                <div className="form-row">
                  <label htmlFor="confirm-password">Confirm new password</label>
                  <PasswordInput
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                  />
                  {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                </div>
              </>
            )}

            {formError && <p className="form-status form-status--error" role="alert">{formError}</p>}
            {success && <p className="form-status form-status--success">{success}</p>}

            <div className="community-form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting
                  ? 'Processing…'
                  : step === 1
                    ? 'Send Reset Code'
                    : step === 2
                      ? 'Verify Code'
                      : 'Reset Password'}
              </button>
              <a href="/community/login" className="btn btn-ghost">Back to Login</a>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
