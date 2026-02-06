import { useEffect } from 'react';
import { useBrandConfig } from '@/hooks/useBrandConfig';

interface SEOProps {
  title?: string;
  description?: string;
}

/**
 * Dynamic SEO component that updates document metadata based on platform settings.
 * Uses useBrandConfig to fetch app name and tagline from the database.
 */
export function SEO({ title, description }: SEOProps) {
  const { appName, tagline } = useBrandConfig();

  useEffect(() => {
    // Update document title
    const pageTitle = title 
      ? `${title} | ${appName}`
      : `${appName} - ${tagline}`;
    document.title = pageTitle;

    // Update meta description
    const metaDescription = description || `${tagline}. Find qualified leads instantly with AI-powered prospecting.`;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute('content', metaDescription);
    }

    // Update OpenGraph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title ? `${title} | ${appName}` : `${appName} - ${tagline}`);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', metaDescription);
    }

    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName) {
      ogSiteName.setAttribute('content', appName);
    }

    // Update Twitter tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', title ? `${title} | ${appName}` : `${appName} - ${tagline}`);
    }

    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', metaDescription);
    }
  }, [appName, tagline, title, description]);

  return null; // This component doesn't render anything visible
}

export default SEO;
