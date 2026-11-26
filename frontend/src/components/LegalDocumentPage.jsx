import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, FileText, LogIn, Mail, MapPin, ShieldCheck } from 'lucide-react';
import FairmacsEmblem from './FairmacsEmblem';
import FairmacsFooter from './footer/FairmacsFooter';

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
    <div className="min-h-screen bg-[#06111f] text-white flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#06111f]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-1.5 shadow">
              <FairmacsEmblem size={22} fill="#1B365D" />
            </div>
            <div>
              <div className="fairmacs-brand-wordmark text-base font-bold tracking-wide text-white">
                FAIRMACS
              </div>
              <div className="fairmacs-brand-tagline text-[9px] uppercase tracking-[0.16em] text-slate-300">
                LEARNING ACADEMY
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-200 hover:bg-white/10 transition"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              <LogIn size={15} />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-200">
          {isPrivacy ? <ShieldCheck size={14} /> : <FileText size={14} />}
          {isPrivacy ? 'Data Protection & Governance' : 'Platform Governance'}
        </div>

        <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-white">
          {isPrivacy ? 'Privacy Policy' : 'Terms of Use'}
        </h1>

        <p className="mt-3 text-sm text-slate-400">
          Effective Date: January 1, 2026 · Fairmacs Shipping &amp; Transport Services Pvt. Ltd.
        </p>

        {/* Quick Document Switcher */}
        <div className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => navigate('/privacy-policy')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
              isPrivacy ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => navigate('/terms')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
              !isPrivacy ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            Terms of Use
          </button>
        </div>

        {/* Clauses */}
        <div className="mt-10 space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-7"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                {section.title}
              </h2>
              <p className="mt-3 text-sm sm:text-base leading-7 text-slate-300">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        {/* Registered Corporate Contact Card */}
        <section className="mt-10 rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wider text-blue-300">
            <Building2 size={17} />
            Corporate &amp; Data Governance Contact
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            Fairmacs Shipping &amp; Transport Services Pvt. Ltd.
          </h2>
          <div className="mt-4 space-y-2.5 text-sm text-slate-300">
            <div className="flex items-start gap-2.5">
              <MapPin size={17} className="mt-0.5 shrink-0 text-blue-300" />
              <span>
                New No. 31, Old No. 14, Moore Street, George Town, Chennai – 600 001, Tamil Nadu, India
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail size={17} className="shrink-0 text-blue-300" />
              <a
                href="mailto:hr-training@fairmacs.com"
                className="text-blue-200 hover:text-white underline underline-offset-4"
              >
                hr-training@fairmacs.com
              </a>
            </div>
          </div>
        </section>
      </main>

      <FairmacsFooter
        variant="public"
        onNavigate={(path) => {
          navigate(path);
          window.scrollTo({ top: 0, behavior: 'auto' });
        }}
        onScrollToSection={(sectionId) => {
          navigate(`/#${sectionId}`);
        }}
      />
    </div>
  );
}
