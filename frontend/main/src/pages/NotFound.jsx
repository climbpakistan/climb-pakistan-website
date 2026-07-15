import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="page-header" style={{ textAlign: 'center' }}>
      <div className="container">
        <span className="eyebrow" style={{ justifyContent: 'center' }}>404</span>
        <h1 className="page-title">Page Not Found</h1>
        <p className="page-sub" style={{ marginInline: 'auto' }}>
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Back to Home</Link>
      </div>
    </section>
  );
}
