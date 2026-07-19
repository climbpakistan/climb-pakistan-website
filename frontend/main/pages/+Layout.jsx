import { usePageContext } from 'vike-react/usePageContext';
import { useEffect } from 'react';
import { ThemeProvider } from '../src/hooks/ThemeContext';
import { AnalyticsProvider } from '../src/hooks/useAnalytics';
import Header from '../src/components/Header';
import Footer from '../src/components/Footer';
import Seo from '../src/components/Seo';
import '../src/styles/main.css';
import {
  organizationSchema,
  websiteSchema,
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
        {/* Structured data — global for all pages */}
        <Seo
          title=""
          jsonLd={{
            '@context': 'https://schema.org',
            '@graph': [
              organizationSchema(),
              websiteSchema(),
            ].filter(Boolean),
          }}
        />
        <a href="#main" className="skip-link">Skip to content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </AnalyticsProvider>
    </ThemeProvider>
  );
}
