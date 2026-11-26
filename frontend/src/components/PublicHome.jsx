import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import '../styles/landing-glass.css';
import { SITE_CONTENT } from '../content/site';
import { trackEvent } from '../utils/analytics';
import AmbientBackground from './landing/AmbientBackground';
import CursorLight from './landing/CursorLight';
import LandingNav from './landing/LandingNav';
import LandingHero from './landing/LandingHero';
import DivisionsMarquee from './landing/DivisionsMarquee';
import ProgramsBentoGrid from './landing/ProgramsBentoGrid';
import LearningTimeline from './landing/LearningTimeline';
import OutcomesSection from './landing/OutcomesSection';
import MethodMentorsSection from './landing/MethodMentorsSection';
import TestimonialsCarousel from './landing/TestimonialsCarousel';
import LearningFormatsSection from './landing/LearningFormatsSection';
import FaqAccordion from './landing/FaqAccordion';
import FinalEnquiryBand from './landing/FinalEnquiryBand';
import LightGlassFooter from './landing/LightGlassFooter';
import EducationalOrgJsonLd from './landing/EducationalOrgJsonLd';
import { usePrefersReducedMotion } from './landing/motionHooks';

export default function PublicHome() {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const [preselectedTopic, setPreselectedTopic] = useState('');
  const [showStickyMobileBar, setShowStickyMobileBar] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onScroll = () => {
      setShowStickyMobileBar(window.scrollY > 520);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToLogin = () => {
    trackEvent('public_login_cta_click', { location: 'landing_home' });
    navigate(SITE_CONTENT.brand.loginPath);
  };

  const scrollToEnquiry = (topic = '') => {
    if (topic) setPreselectedTopic(topic);
    trackEvent('public_demo_cta_click', { topic: topic || 'general' });
    const el = document.getElementById('enquiry');
    if (el) {
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div className="fla-daylight-root">
      <EducationalOrgJsonLd />

      {/* Skip-to-content Accessibility Link */}
      <a
        href="#fla-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 fla-btn-primary text-xs"
      >
        Skip to main content
      </a>

      {/* Ambient Breathing Blobs + Noise + Cursor Caustic Light */}
      <AmbientBackground />
      <CursorLight />

      {/* 1. Sticky Scroll-Shrink Frosted Glass Nav */}
      <LandingNav
        onLoginClick={goToLogin}
        onPrimaryCtaClick={() => scrollToEnquiry()}
      />

      <main id="fla-main-content">
        {/* 2. Kinetic Hero + Interactive Live Playground */}
        <LandingHero
          onPrimaryCtaClick={() => scrollToEnquiry()}
          onSecondaryCtaClick={goToLogin}
        />

        {/* 3. Real Operational Divisions Marquee */}
        <DivisionsMarquee />

        {/* 4. Interactive Programs Bento Grid */}
        <ProgramsBentoGrid
          onSelectTrackForEnquiry={(title) => scrollToEnquiry(title)}
          onSignInClick={goToLogin}
        />

        {/* 5. How Learning Works Scroll-Linked Timeline */}
        <LearningTimeline />

        {/* 6. Real Structural Outcomes with Animated Counters */}
        <OutcomesSection />

        {/* 7. Practitioner Mentors & Governance Method (Tilt + Glare) */}
        <MethodMentorsSection />

        {/* 8. Draggable + Keyboard Learner Voices Carousel */}
        <TestimonialsCarousel />

        {/* 9. Delivery Formats & Cohorts */}
        <LearningFormatsSection
          onChooseFormat={(formatName) => scrollToEnquiry(formatName)}
        />

        {/* 10. Accessible FAQ Accordion */}
        <FaqAccordion />

        {/* 11. Final CTA Band with Inline-Validated Enquiry Form */}
        <FinalEnquiryBand
          preselectedTopic={preselectedTopic}
          onSignInClick={goToLogin}
        />
      </main>

      {/* 12. Light Pale Glass Footer */}
      <LightGlassFooter onNavigate={handleNavigate} />

      {/* Mobile Sticky Bottom Primary CTA Bar (appears after scrolling past hero) */}
      {showStickyMobileBar && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pt-2 fla-safe-bottom bg-[#FBF8F3]/85 backdrop-blur-xl border-t border-white/90 shadow-lg">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToLogin}
              className="fla-btn-secondary flex-1 !py-2.5 text-xs"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => scrollToEnquiry()}
              className="fla-btn-primary flex-[1.4] !py-2.5 text-xs"
            >
              <span>Request Demo</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
