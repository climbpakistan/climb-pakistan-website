import useFetch from '../hooks/useFetch';
import { getNews } from '../api';
import NewsCard from '../components/NewsCard';
import { AnimatedSection, StaggeredGrid } from '../hooks/animations';
import Seo from '../components/Seo';

export default function News() {
  const { data: articles, loading } = useFetch(getNews, []);

  return (
    <>
      <Seo
        title="Latest News"
        description="Competition results, athlete spotlights and everything happening in Pakistan's sport climbing community."
        path="/news"
      />

      <section className="page-header">
        <div className="container">
          <div className="hero-entrance">
            <h1 className="page-title">Latest News</h1>
            <p className="page-sub">
              Competition results, athlete spotlights and everything happening in Pakistan's sport climbing community.
            </p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container">
          {loading ? (
            <p style={{ color: 'var(--cp-text-muted)', textAlign: 'center', padding: 'var(--sp-8)' }}>Loading news...</p>
          ) : (
            <StaggeredGrid className="news-grid" baseDelay={0.04} stepDelay={0.06}>
              {articles?.length === 0 && (
                <p style={{ color: 'var(--cp-text-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--sp-8)' }}>No articles yet.</p>
              )}
              {articles?.map((article) => (
                <NewsCard article={article} key={article.slug} />
              ))}
            </StaggeredGrid>
          )}

          <nav className="pagination" aria-label="News pagination">
            <button className="page-btn" disabled aria-label="Previous page">←</button>
            <button className="page-btn is-active" aria-current="page">1</button>
            <button className="page-btn" disabled aria-label="Next page">→</button>
          </nav>
        </div>
      </AnimatedSection>
    </>
  );
}
