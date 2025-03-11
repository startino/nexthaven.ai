import { useEffect } from 'react';
import { GA4_CONFIG } from '../config/analytics';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (command: string, id: string, config: object) => void;
  }
}

export function GoogleAnalytics() {
  useEffect(() => {
    if (!GA4_CONFIG.ENABLED) return;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(arguments);
    }
    gtag('js', new Date());
    
    // Get initial page from URL if available
    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page') || 'home';
    
    // Configure GA4
    gtag('config', GA4_CONFIG.MEASUREMENT_ID, {
      debug_mode: GA4_CONFIG.DEBUG_MODE,
      page_path: window.location.pathname + window.location.search,
      page_title: `nexthaven.ai - ${initialPage}`,
      send_page_view: true
    });
  }, []);

  return null;
}