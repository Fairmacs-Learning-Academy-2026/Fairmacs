import React from 'react';
import { SITE_CONTENT } from '../../content/site';

/**
 * Injects schema.org EducationalOrganization structured data for SEO.
 */
export default function EducationalOrgJsonLd() {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://fairmacs-lms.vercel.app';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE_CONTENT.brand.name,
    legalName: SITE_CONTENT.brand.legalEntity,
    description: SITE_CONTENT.hero.subcopy,
    url: origin,
    logo: `${origin}/fairmacs-logo-square.png`,
    email: SITE_CONTENT.contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'New No. 31, Old No. 14, Moore Street, George Town',
      addressLocality: 'Chennai',
      addressRegion: 'Tamil Nadu',
      postalCode: '600001',
      addressCountry: 'IN',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
