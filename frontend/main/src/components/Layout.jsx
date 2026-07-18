import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Seo from './Seo';
import {
  organizationSchema,
  websiteSchema,
  breadcrumbSchema,
} from '../utils/jsonLd';

const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://climb-pakistan-backend.onrender.com/api' : 'http://localhost:3001/api');

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Track page views — silently ping the backend on every route change
  useEffect(() => {
    fetch(`${API_URL}/page-views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      // Keepalive ensures the request completes even if the page navigates away
      keepalive: true,
    }).catch(() => {
      // Silently ignore — tracking should never break the page
    });
  }, [pathname]);

  return (
    <>
      {/* Structured data (Organization + WebSite + Breadcrumbs) — no default title so pages can set their own */}
      <Seo title="" jsonLd={{
        '@context': 'https://schema.org',
        '@graph': [
          organizationSchema(),
          websiteSchema(),
          breadcrumbSchema(pathname),
        ].filter(Boolean),
      }} />

      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
