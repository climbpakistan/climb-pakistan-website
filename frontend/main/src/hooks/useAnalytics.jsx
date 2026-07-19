import { createContext, useContext, useEffect } from 'react';

const AnalyticsContext = createContext(null);

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * Injects the Google Analytics 4 gtag.js script into <head>.
 * Safe to call multiple times — checks if already loaded.
 */
function injectGtag() {
  if (!GA_MEASUREMENT_ID) return;
  if (document.querySelector(`script[data-ga-id="${GA_MEASUREMENT_ID}"]`)) return;

  // ── gtag.js script ──
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.dataset.gaId = GA_MEASUREMENT_ID;
  document.head.appendChild(script);

  // ── Initialization snippet ──
  const inline = document.createElement('script');
  inline.id = `ga-init-${GA_MEASUREMENT_ID}`;
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      send_page_view: false,
      anonymize_ip: true,
    });
  `;
  document.head.appendChild(inline);
}

/**
 * Send a page_view event to GA4.
 * gtag.js internally handles queueing and reliable delivery.
 */
function sendPageView(pathname) {
  if (!GA_MEASUREMENT_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: pathname,
    send_to: GA_MEASUREMENT_ID,
  });
}

// ── Provider ──────────────────────────────────────────────────────────

export function AnalyticsProvider({ children }) {
  useEffect(() => {
    injectGtag();
  }, []);

  // Track page views on route changes via popstate (back/forward navigation)
  useEffect(() => {
    function handlePopState() {
      const timer = setTimeout(() => sendPageView(window.location.pathname), 50);
      return () => clearTimeout(timer);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <AnalyticsContext.Provider value={{ GA_MEASUREMENT_ID }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────

/**
 * Returns helpers for manually tracking custom events.
 *
 * Example:
 *   const { trackEvent } = useAnalytics();
 *   trackEvent('view_item', { item_name: 'Athlete Profile', athlete: 'Saif Ali' });
 */
export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used within <AnalyticsProvider>');

  const trackEvent = (eventName, params = {}) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  };

  return { trackEvent, isReady: !!GA_MEASUREMENT_ID };
}
