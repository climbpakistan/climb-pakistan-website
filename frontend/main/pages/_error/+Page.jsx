import Seo from '../../src/components/Seo';

export { Page };

function Page({ is404 }) {
  return (
    <>
      <Seo
        title={is404 ? 'Page Not Found' : 'Something Went Wrong'}
        description={is404 ? "We couldn't find that page." : 'An unexpected error occurred.'}
        noIndex
      />
      <section className="thanks-hero">
        <div className="container thanks-hero-inner">
          <h1 className="page-title" style={{ marginBottom: 'var(--sp-4)' }}>
            {is404 ? 'Page Not Found' : 'Something Went Wrong'}
          </h1>
          <p className="thanks-sub">
            {is404
              ? "We couldn't find the page you're looking for. It might have been moved or deleted."
              : 'An unexpected error occurred. Please try again.'}
          </p>
          <div className="thanks-actions">
            <a href="/" className="btn btn-primary">Back to Home</a>
            <a href="/news" className="btn btn-outline">Latest News</a>
          </div>
        </div>
      </section>
    </>
  );
}
