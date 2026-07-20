import { Fragment } from 'react';
import { useData } from 'vike-react/useData';
import { AnimatedSection, StaggeredGrid } from '../../src/hooks/animations';
import { useInView } from '../../src/hooks/useInView';
import { ChampionCard } from '../../src/components/AthleteCard';
import NewsCard from '../../src/components/NewsCard';
import Seo from '../../src/components/Seo';

export { Page };

function Page() {
  const { athletes, articles, mainPage } = useData();

  const championEntries = mainPage?.champions?.filter((c) => c.slug) || [];
  const champions =
    championEntries.length > 0
      ? championEntries
          .map((entry) => ({
            athlete: athletes?.find((a) => a.slug === entry.slug),
            title: entry.title,
            rank: entry.rank ?? 0,
            points: entry.points ?? 0,
          }))
          .filter((item) => item.athlete)
      : (mainPage?.championSlugs?.filter(Boolean) || []).length > 0
        ? mainPage.championSlugs
            .filter(Boolean)
            .map((slug) => ({
              athlete: athletes?.find((a) => a.slug === slug),
              title: '',
              rank: 0,
              points: 0,
            }))
            .filter((item) => item.athlete)
        : athletes?.filter((a) => a.isChampion).map((a) => ({ athlete: a, title: a.championTitle, rank: 0, points: 0 })) || [];

  const newsCount = mainPage?.latestNewsCount || 3;
  const latestNews = articles?.slice(0, newsCount) || [];

  const [ctaRef, ctaVisible] = useInView({ threshold: 0.15 });

  const heroTitle = mainPage?.heroTitle || 'Your Source For<br />Sport Climbing in Pakistan';
  const heroSubtitle = mainPage?.heroSubtitle || 'News, rankings, athlete stories and competition coverage from the community pushing the sport forward.';

  return (
    <>
      <Seo
        title="Home"
        description={heroSubtitle.replace(/<[^>]*>/g, '')}
        keywords="sport climbing Pakistan, competitive climbing Pakistan, Pakistan sport climbing magazine, Pakistani sport climbers, indoor climbing Pakistan, climbing competitions Pakistan, speed climbing Pakistan, lead climbing Pakistan, Pakistan climbing community"
        path="/"
      />

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-grid"></div>
        </div>
        <div className="container hero-inner">
          <h1 className="hero-title hero-entrance">
            {mainPage?.heroTitle ? mainPage.heroTitle.split('<br />').map((part, i) => (
              <span key={i} className={`hero-title-line${i === 1 ? ' hero-title-accent' : ''}`}>{part}</span>
            )) : <>
              <span className="hero-title-line">Your Source For</span>
              <span className="hero-title-line hero-title-accent">Sport Climbing in Pakistan</span>
            </>}
          </h1>
          <p className="hero-sub hero-entrance hero-entrance-delay-1">
            {mainPage?.heroSubtitle || 'News, rankings, athlete stories and competition coverage from the community pushing the sport forward.'}
          </p>
          <div className="hero-actions hero-entrance hero-entrance-delay-2">
            <a href={mainPage?.heroCtaLink || '/news'} className="btn btn-primary">{mainPage?.heroCtaText || 'Read the Latest'}</a>
            <a href={mainPage?.heroCta2Link || '/athletes'} className="btn btn-outline">{mainPage?.heroCta2Text || 'Meet the Athletes'}</a>
          </div>
        </div>
      </section>

      {/* NATIONAL CHAMPIONS */}
      <AnimatedSection className="section champions">
        <div className="container">
          <div className="section-head">
            <div><h2>Current National Champions</h2></div>
            <a href="/rankings" className="btn-ghost btn">View Full Rankings →</a>
          </div>
          <StaggeredGrid className="champion-grid" baseDelay={0.05} stepDelay={0.07}>
            {champions.length === 0 && (
              <p style={{ color: 'var(--cp-text-muted)' }}>No champions data available yet.</p>
            )}
            {champions.slice(0, 3).map((item) => (
              <ChampionCard athlete={item.athlete} disciplineTitle={item.title} rank={item.rank} points={item.points} key={item.athlete.slug} />
            ))}
          </StaggeredGrid>
        </div>
      </AnimatedSection>

      {/* LATEST NEWS */}
      <AnimatedSection className="section-tight latest-strip">
        <div className="container">
          <div className="section-head">
            <div><h2>Latest News</h2></div>
            <a href="/news" className="btn-ghost btn">All News →</a>
          </div>
          <StaggeredGrid className="news-grid" baseDelay={0.06} stepDelay={0.08}>
            {latestNews.length === 0 && (
              <p style={{ color: 'var(--cp-text-muted)' }}>No news articles available yet.</p>
            )}
            {latestNews.map((article) => (
              <NewsCard article={article} key={article.slug} />
            ))}
          </StaggeredGrid>
        </div>
      </AnimatedSection>

      {/* WHAT WE COVER */}
      <AnimatedSection className="section coverage">
        <div className="container">
          <div className="section-head">
            <div><h2>What We Cover</h2></div>
          </div>
          <StaggeredGrid className="coverage-grid" baseDelay={0.04} stepDelay={0.06}>
            {(mainPage?.coverageSections?.length >= 4 ? mainPage.coverageSections : [
              { number: 1, title: 'Rankings', description: 'National standings for senior men and senior women, by discipline and by year.', link: '/rankings' },
              { number: 2, title: 'Competitions', description: 'Results and coverage from national championships and climbing events.', link: '/competitions' },
              { number: 3, title: 'Athletes', description: 'Profiles, achievements and stats for the climbers building Pakistan\'s scene.', link: '/athletes' },
              { number: 4, title: 'Learn Climbing', description: 'Guides and explainers for anyone curious about the sport.', link: '/learn' },
            ]).map((section) => (
              <a href={section.link} className="coverage-card" key={section.number}>
                <span className="coverage-num">0{section.number}</span>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </a>
            ))}
          </StaggeredGrid>
        </div>
      </AnimatedSection>

      {/* FOLLOW CTA */}
      <section ref={ctaRef} className={`follow-cta reveal ${ctaVisible ? 'is-visible' : ''}`}>
        <div className="container follow-cta-inner">
          <div>
            <h2>Follow <span className="hero-title-accent">{mainPage?.ctaText || '#ClimbPakistan'}</span></h2>
            <p className="follow-sub">{mainPage?.ctaSubtext || 'Stories, athletes and updates from Pakistan\'s sport climbing community — every week.'}</p>
          </div>
          <a href={`https://www.instagram.com/${mainPage?.ctaInstagramHandle || 'climb_pakistan'}/`} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            @{mainPage?.ctaInstagramHandle || 'climb_pakistan'} on Instagram
          </a>
        </div>
      </section>
    </>
  );
}
