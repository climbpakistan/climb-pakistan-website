import { Children, cloneElement, isValidElement, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView } from '../hooks/useInView';

// Reads from VITE_WEB3FORMS_KEY env variable (set in frontend/main/.env or deployment)
const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || '5da498b7-e854-4d6f-8c62-5ce954ede436';

function ContactFormCard({ handleSubmit, status }) {
  const [ref, isVisible] = useInView({ threshold: 0.08 });

  const rows = [
    <div className="form-row" key="name">
      <label htmlFor="name">Name</label>
      <input type="text" id="name" name="name" required />
    </div>,
    <div className="form-row" key="email">
      <label htmlFor="email">Email</label>
      <input type="email" id="email" name="email" required />
    </div>,
    <div className="form-row" key="subject">
      <label htmlFor="subject">Subject</label>
      <select id="subject" name="subject" defaultValue="Story Tip">
        <option>Story Tip</option>
        <option>Athlete Submission</option>
        <option>Correction</option>
        <option>General Inquiry</option>
      </select>
    </div>,
    <div className="form-row" key="message">
      <label htmlFor="message">Message</label>
      <textarea id="message" name="message" rows="6" required></textarea>
    </div>,
  ];

  return (
    <div ref={ref} className="contact-form-wrap reveal" style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}>
      <form className="contact-form" onSubmit={handleSubmit}>
        {Children.map(rows, (child, i) =>
          isValidElement(child)
            ? cloneElement(child, {
                style: {
                  ...(child.props.style || {}),
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.45s ease ${0.08 + i * 0.06}s, transform 0.45s ease ${0.08 + i * 0.06}s`,
                },
              })
            : child
        )}

        {/* Honeypot spam protection */}
        <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

        <button type="submit" className="btn btn-primary" disabled={status.state === 'sending'}
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: `opacity 0.45s ease 0.32s, transform 0.45s ease 0.32s`,
          }}
        >
          {status.state === 'sending' ? 'Sending…' : 'Send Message'}
        </button>
        <p className="form-status" aria-live="polite">{status.state === 'error' ? status.message : ''}</p>
      </form>
    </div>
  );
}

export default function Contact() {
  const navigate = useNavigate();
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;

    // Honeypot check
    if (form.botcheck.checked) return;

    setStatus({ state: 'sending', message: 'Sending…' });

    const formData = new FormData(form);
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        navigate('/thanks');
      } else {
        setStatus({ state: 'error', message: "Something went wrong. Please try again, or email us directly." });
      }
    } catch {
      setStatus({ state: 'error', message: "Something went wrong. Please try again, or email us directly." });
    }
  }

  return (
    <>
      <section className="page-header page-header--enhanced">
        <div className="page-header-bg-grid"></div>
        <div className="page-header-glow"></div>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="hero-entrance">
            <span className="eyebrow" style={{ marginBottom: 'var(--sp-2)', justifyContent: 'center' }}>Contact</span>
            <h1 className="page-title">Get in Touch</h1>
            <p className="page-sub" style={{ marginInline: 'auto' }}>
              We'd love to hear from you. Drop us a message and we'll get back to you.
            </p>
          </div>
        </div>
      </section>

      <section className="section-tight" style={{ paddingTop: 0 }}>
        <div className="container">
          <ContactFormCard handleSubmit={handleSubmit} status={status} />
        </div>
      </section>
    </>
  );
}
