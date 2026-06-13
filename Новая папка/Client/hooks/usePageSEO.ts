import { useEffect } from 'react';

interface PageSEOProps {
  title: string;
  description?: string;
  keywords?: string;
}

export function usePageSEO({ title, description, keywords }: PageSEOProps) {
  useEffect(() => {
    // Update document title
    const fullTitle = `${title} | Business Club - Financial University`;
    document.title = fullTitle;

    // Update or create meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      } else {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        metaDescription.setAttribute('content', description);
        document.head.appendChild(metaDescription);
      }
    }

    // Update or create meta keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords);
      } else {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        metaKeywords.setAttribute('content', keywords);
        document.head.appendChild(metaKeywords);
      }
    }

    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', fullTitle);
    }

    if (description) {
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', description);
      }
    }

    // Cleanup: reset to default title when component unmounts
    return () => {
      document.title = 'Business Club - Financial University | Предпринимательский Клуб Финансовый Университет';
    };
  }, [title, description, keywords]);
}
