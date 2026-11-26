import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, FileText, LogIn, Mail, MapPin, ShieldCheck } from 'lucide-react';
import '../styles/landing-glass.css';
import FairmacsEmblem from './FairmacsEmblem';
import AmbientBackground from './landing/AmbientBackground';
import LightGlassFooter from './landing/LightGlassFooter';

const PRIVACY_SECTIONS = [
  {
    title: '1. Scope & Purpose',
    body: 'This Privacy Policy governs how Fairmacs Shipping & Transport Services Pvt. Ltd. ("Fairmacs", "we", "our") collects, processes, and safeguards personal and employment-related information within Fairmacs Learning Academy. Fairmacs Learning Academy is an enterprise learning and compliance platform operated for authorized employees, trainers, managers, and HR administrators.',
  },
  {
    title: '2. Information We Process',
    body: 'We process official employee profile information (Employee ID, full name, corporate email, department, designation, reporting manager), optional emergency contact information submitted in your profile, course enrollments, lesson progress, assessment responses, earned certificates, and mandatory policy acknowledgement timestamps.',
  },
  {
    title: '3. Document Security, Watermarking & Cloud Storage',
    body: 'Training manuals and corporate policy PDFs are stored in Fairmacs’ authorized enterprise Zoho WorkDrive environment using encrypted OAuth 2.0 credentials. When viewed in-browser, confidential documents dynamically display your name, Employee ID, and access timestamp as a security watermark to deter unauthorized external distribution.',
  },
  {
    title: '4. Cookies, Local Storage & Analytics',
    body: 'Fairmacs Learning Academy uses essential browser storage (JWT authentication tokens and cross-tab enrollment sync) required to keep your session secure. Optional analytics are activated only if you opt in via our cookie preference banner and are used solely to improve platform reliability and learning experience.',
  },
  {
    title: '5. Data Sharing & Retention',
    body: 'Learning and compliance records are accessible only to authorized reporting managers, trainers, and HR administrators on a strict role-based (RBAC) basis. Records are retained in accordance with Fairmacs human-resource governance, statutory audit requirements, and applicable Indian data protection laws (including the Digital Personal Data Protection Act, 2023).',
  },
  {
    title: '6. Employee Rights & Support',
    body: 'Employees may review and update personal profile details directly under My Profile or request corrections to official employment records by contacting the Fairmacs HR & Learning Administration team.',
  },
];

const TERMS_SECTIONS = [
  {
    title: '1. Authorized Access Only',
    body: 'Access to Fairmacs Learning Academy is strictly restricted to active authorized personnel of Fairmacs Group entities using assigned corporate credentials. Sharing login credentials, attempting to access another user’s account, or bypassing role-based access controls is strictly prohibited.',
  },
  {
    title: '2. Confidentiality & Intellectual Property',
    body: 'All courses, operational SOPs, freight and logistics guidelines, videos, assessments, trademarks, and watermarked policy documents hosted on Fairmacs Learning Academy are the confidential and proprietary property of Fairmacs Shipping & Transport Services Pvt. Ltd. Copying, screen-recording, redistributing, or publishing platform materials outside Fairmacs without written HR/Management authorization is prohibited.',
  },
  {
    title: '3. Academic Integrity & Policy Acknowledgements',
    body: 'Employees must complete assigned courses, quizzes, and mandatory policy acknowledgements personally and honestly. Electronic policy acknowledgements recorded in Fairmacs Learning Academy carry the same internal compliance standing as a signed physical acknowledgement.',
  },
  {
    title: '4. Acceptable Platform Conduct',
    body: 'Users must not upload malicious files, attempt unauthorized API requests, disrupt platform availability, or upload unlawful or non-business documents to employee or course storage.',
  },
  {
    title: '5. Platform Updates & Availability',
    body: 'Fairmacs reserves the right to update curricula, compliance deadlines, security controls, and these Terms of Use at any time to reflect operational or regulatory requirements.',
  },
];

export default function LegalDocumentPage({ type = 'privacy' }) {
  const navigate = useNavigate();
  const isPrivacy = type === 'privacy';
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [type]);

  return (
    <div className="fla-daylight-root flex flex-col justify-between">
      <AmbientBackground />

      <header className="sticky top-0 z-40 fla-safe-top px-3 sm:px-6">
        <div className="mx-auto max-w-[1240px] glass glass--strong rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm border border-black/5">
              <FairmacsEmblem size={21} fill="#0B5CAB" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-[#1F2328]">Fairmacs</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4A5058]">
                Learning Academy
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="fla-btn-secondary !py-2 !px-3.5 text-xs"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="fla-btn-primary !py-2 !px-4 text-xs"
            >
              <LogIn size={14} aria-hidden="true" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 py-12 sm:py-16">
        <span className="inline-flex items-center gap-2 glass-pill rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
          {isPrivacy ? <ShieldCheck size={14} /> : <FileText size={14} />}
          <span>{isPrivacy ? 'Data Protection & Governance' : 'Platform Governance'}</span>
        </span>

        <h1 className="fla-display-h1 !text-4xl sm:!text-5xl mt-4">
          {isPrivacy ? 'Privacy Policy' : 'Terms of Use'}
        </h1>

        <p className="mt-3 text-sm text-[#4A5058]">
          Effective Date: January 1, 2026 · Fairmacs Shipping &amp; Transport Services Pvt. Ltd.
        </p>

        {/* Document Switcher */}
        <div className="mt-6 inline-flex rounded-full glass-pill p-1">
          <button
            type="button"
            onClick={() => navigate('/privacy-policy')}
            className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
              isPrivacy ? 'bg-[#0B5CAB] text-white shadow-sm' : 'text-[#4A5058] hover:text-[#1F2328]'
            }`}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => navigate('/terms')}
            className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
              !isPrivacy ? 'bg-[#0B5CAB] text-white shadow-sm' : 'text-[#4A5058] hover:text-[#1F2328]'
            }`}
          >
            Terms of Use
          </button>
        </div>

        <div className="mt-10 space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="glass glass--strong p-6 sm:p-7">
              <h2 className="fla-display-h3 !text-lg sm:!text-xl">{section.title}</h2>
              <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-[#4A5058]">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <section className="mt-8 glass glass--strong p-6 sm:p-8 bg-white/80">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
            <Building2 size={16} aria-hidden="true" />
            <span>Corporate &amp; Data Governance Contact</span>
          </div>
          <h2 className="fla-display-h3 mt-2">
            Fairmacs Shipping &amp; Transport Services Pvt. Ltd.
          </h2>
          <div className="mt-4 space-y-2 text-sm text-[#4A5058]">
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[#0B5CAB]" aria-hidden="true" />
              <span>
                New No. 31, Old No. 14, Moore Street, George Town, Chennai – 600 001, Tamil Nadu, India
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail size={16} className="shrink-0 text-[#0B5CAB]" aria-hidden="true" />
              <a
                href="mailto:hr-training@fairmacs.com"
                className="font-semibold text-[#0B5CAB] underline underline-offset-4"
              >
                hr-training@fairmacs.com
              </a>
            </div>
          </div>
        </section>
      </main>

      <LightGlassFooter
        onNavigate={(path) => {
          navigate(path);
          window.scrollTo({ top: 0, behavior: 'auto' });
        }}
      />
    </div>
  );
}
