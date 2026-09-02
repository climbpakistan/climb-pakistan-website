import { Head } from 'vike-react/Head';
import { usePageContext } from 'vike-react/usePageContext';
import { useEffect } from 'react';
import { ThemeProvider } from '../src/hooks/ThemeContext';
import { AnalyticsProvider } from '../src/hooks/useAnalytics';
import { CommunityProvider } from '../src/hooks/CommunityContext';
import Header from '../src/components/Header';
import Footer from '../src/components/Footer';
import Seo from '../src/components/Seo';
import CommunityAuthPrompt from '../src/components/community/CommunityAuthPrompt';
import RestrictionBanner from '../src/components/community/RestrictionBanner';
import '../src/styles/main.css';
import {
  organizationSchema,
  websiteSchema,
  breadcrumbSchema,
} from '../src/utils/jsonLd';

const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://climb-pakistan-backend.onrender.com/api' : 'http://localhost:3001/api');

export default function Layout({ children }) {
  const pageContext = usePageContext();
  const currentPath = pageContext?.urlPathname || '/';

  // Track page views on mount and on route change
  useEffect(() => {
    fetch(`${API_URL}/page-views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath }),
      keepalive: true,
    }).catch(() => {});
  }, [currentPath]);

  return (
    <ThemeProvider>
      <AnalyticsProvider>
        <CommunityProvider>
        {/* Brand favicon — declared here so it survives Vike's pre-render
            (links in index.html are not preserved in the built head). */}
        <Head>
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="icon" type="image/png" href="/favicon.png" />
          <link rel="apple-touch-icon" href="/favicon.png" />
        </Head>
        {/* Structured data — global for all pages.
            structuredDataOnly keeps the Layout from emitting generic title/
            og tags that would collide with page-level <Seo> meta. */}
        <Seo
          structuredDataOnly
          jsonLd={{
            '@context': 'https://schema.org',
            '@graph': [
              organizationSchema(),
              websiteSchema(),
              breadcrumbSchema(
                currentPath,
                pageContext?.data?.article?.title,  // real article title → breadcrumb
              ),
            ].filter(Boolean),
          }}
        />
        <a href="#main" className="skip-link">Skip to content</a>
        <Header />
        <RestrictionBanner />
        <main id="main">{children}</main>
        <Footer />
        <CommunityAuthPrompt />
        </CommunityProvider>
      </AnalyticsProvider>
    </ThemeProvider>
  );
}
