import { useData } from 'vike-react/useData';
import NewsCard from '../../src/components/NewsCard';
import { AnimatedSection, StaggeredGrid } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';

export { Page };

function Page() {
  const { articles } = useData();

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
          <StaggeredGrid className="news-grid" baseDelay={0.04} stepDelay={0.06}>
            {articles?.length === 0 && (
              <p style={{ color: 'var(--cp-text-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--sp-8)' }}>No articles yet.</p>
            )}
            {articles?.map((article) => (
              <NewsCard article={article} key={article.slug} />
            ))}
          </StaggeredGrid>
        </div>
      </AnimatedSection>
    </>
  );
}
