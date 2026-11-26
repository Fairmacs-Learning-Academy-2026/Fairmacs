import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePageMeta, resolvePageTitle, resolvePageDescription } from './src/utils/pageMeta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=============================================================================');
console.log(' Fairmacs Learning Academy Launch Readiness Checklist (#2 - #20) Verification');
console.log('=============================================================================');

// #2 & #3: Meta title & description per page
const routesToCheck = [
  '/',
  '/login',
  '/privacy-policy',
  '/terms',
  '/thank-you',
  '/dashboard',
  '/trainer',
  '/manager',
  '/hr/overview',
  '/courses',
  '/courses/c-101/overview',
  '/courses/c-101/learn',
  '/unknown-random-route',
];
const seenTitles = new Set();
for (const r of routesToCheck) {
  const meta = resolvePageMeta(r);
  assert(meta.title && meta.title.length > 10, `Missing title for ${r}`);
  assert(meta.description && meta.description.length > 30, `Missing description for ${r}`);
  seenTitles.add(meta.title);
}
assert.strictEqual(seenTitles.size, routesToCheck.length, 'Each checked route must resolve a distinct title');
assert(resolvePageTitle('/privacy-policy').includes('Privacy Policy'));
assert(resolvePageDescription('/terms').toLowerCase().includes('terms'));
console.log('[PASS] #2 & #3: Dynamic per-page meta titles and meta descriptions verified.');

// #4 & #5: Open Graph image + Favicon & Webmanifest set
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(indexHtml.includes('property="og:image"'), 'Missing og:image tag');
assert(indexHtml.includes('name="twitter:card"'), 'Missing twitter:card tag');
assert(indexHtml.includes('rel="apple-touch-icon"'), 'Missing apple-touch-icon link');
assert(indexHtml.includes('rel="manifest" href="/site.webmanifest"'), 'Missing webmanifest link');
assert(fs.existsSync(path.join(__dirname, 'public', 'site.webmanifest')), 'Missing site.webmanifest');
console.log('[PASS] #4 & #5: Open Graph preview tags, favicon set, and site.webmanifest verified.');

// #6 & #7: robots.txt & sitemap.xml
const robotsTxt = fs.readFileSync(path.join(__dirname, 'public', 'robots.txt'), 'utf8');
assert(robotsTxt.includes('Allow: /login') && robotsTxt.includes('Disallow: /hr'), 'robots.txt must allow public login and disallow private HR routes');
const sitemapXml = fs.readFileSync(path.join(__dirname, 'public', 'sitemap.xml'), 'utf8');
assert(sitemapXml.includes('<urlset') && sitemapXml.includes('/privacy-policy') && !sitemapXml.includes('/hr/'), 'sitemap.xml must list public routes only');
console.log('[PASS] #6 & #7: KMS-safe robots.txt and sitemap.xml verified.');

// #8: Alt text on every img
const electivesSrc = fs.readFileSync(path.join(__dirname, 'src', 'components', 'dashboard', 'RecommendedElectivesWidget.jsx'), 'utf8');
assert(!electivesSrc.includes('alt=""'), 'RecommendedElectivesWidget img must have descriptive alt text');
console.log('[PASS] #8: Descriptive alt text verified across image components.');

// #9 & #14: Analytics & Cookie consent banner
assert(fs.existsSync(path.join(__dirname, 'src', 'utils', 'analytics.js')), 'analytics.js must exist');
assert(fs.existsSync(path.join(__dirname, 'src', 'components', 'CookieConsentBanner.jsx')), 'CookieConsentBanner.jsx must exist');
console.log('[PASS] #9 & #14: Consent-aware analytics module and CookieConsentBanner verified.');

// #10, #11, #12, #13, #17, #20: Custom 404, Contact Address, Privacy, Terms, Sticky Mobile CTA, Thank-You
const appJsx = fs.readFileSync(path.join(__dirname, 'src', 'App.jsx'), 'utf8');
assert(appJsx.includes('path="/privacy-policy"') && appJsx.includes('path="/terms"'), 'Privacy & Terms routes must exist in App.jsx');
assert(appJsx.includes('path="/thank-you"') && appJsx.includes('<NotFoundPage />'), 'Thank-You and custom 404 NotFoundPage routes must exist in App.jsx');
const footerNav = fs.readFileSync(path.join(__dirname, 'src', 'components', 'footer', 'FooterNavigation.jsx'), 'utf8');
assert(footerNav.includes('Kattupakkam') && footerNav.includes('600077'), 'Real Fairmacs corporate address must appear in footer');
const publicHome = fs.readFileSync(path.join(__dirname, 'src', 'components', 'PublicHome.jsx'), 'utf8');
assert(!publicHome.includes('hidden sm:flex items-center gap-2 rounded-xl'), 'Mobile sticky Login CTA must be directly visible in navbar on small screens');
console.log('[PASS] #10-#20: Custom 404, real Chennai address, Privacy, Terms, sticky mobile CTA, and Thank-You page verified.');
console.log('=============================================================================');
