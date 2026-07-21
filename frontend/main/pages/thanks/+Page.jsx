import Seo from '../../src/components/Seo';

export { Page };

function Page() {
  return (
    <>
      <Seo title="Thank You" description="Your message has been received. We'll get back to you soon." keywords="Climb Pakistan contact, climbing Pakistan message sent, Pakistan climbing inquiry, sport climbing Pakistan" noIndex />
      <section className="thanks-hero">
        <div className="container thanks-hero-inner">
          <div className="thanks-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/>
            </svg>
          </div>
          <h1 className="page-title" style={{ marginBottom: 'var(--sp-4)' }}>Thank You!</h1>
          <p className="thanks-sub">We've received your message and will get back to you as soon as possible.</p>
          <div className="thanks-actions">
            <a href="/" className="btn btn-primary">Back to Home</a>
            <a href="/contact" className="btn btn-outline">Send Another Message</a>
          </div>
        </div>
      </section>
    </>
  );
}
