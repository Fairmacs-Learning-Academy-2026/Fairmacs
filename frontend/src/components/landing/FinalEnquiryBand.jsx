import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LogIn,
  Mail,
  Send,
} from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';
import { submitAcademyEnquiry } from '../../utils/enquiryValidation';
import { trackEvent } from '../../utils/analytics';
import { MagneticButton, Reveal } from './motionPrimitives';

const INTEREST_OPTIONS = [
  'Role Mastery Cohort Demo',
  'New Joiner Onboarding Track',
  'Freight & Operations Curriculum',
  'Zero-Discrepancy Shipping Documentation',
  'Commercial Pricing & Quotations',
  'Corporate Policies & Compliance Rollout',
  'Employee Portal Access Support',
];

export default function FinalEnquiryBand({ preselectedTopic = '', onSignInClick }) {
  const [form, setForm] = useState({
    fullName: '',
    contact: '',
    interest: preselectedTopic || INTEREST_OPTIONS[0],
    notes: '',
    companyWebsite: '', // Honeypot
  });
  const [lastSyncedTopic, setLastSyncedTopic] = useState(preselectedTopic);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  if (preselectedTopic && preselectedTopic !== lastSyncedTopic) {
    setLastSyncedTopic(preselectedTopic);
    setForm((prev) => ({ ...prev, interest: preselectedTopic }));
    setReceipt(null);
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const res = await submitAcademyEnquiry(form);
    setSubmitting(false);

    if (!res.ok) {
      setErrors(res.fieldErrors || {});
      return;
    }

    trackEvent('academy_enquiry_submitted', { interest: form.interest });
    setReceipt(res);
  };

  return (
    <section id="enquiry" aria-labelledby="fla-enquiry-heading" className="fla-section fla-wash-peach z-10">
      <div className="fla-container">
        <Reveal>
          <div className="glass glass--strong p-6 sm:p-10 lg:p-12 relative overflow-hidden">
            {/* Soft Iridescent Accent Wash Inside Card */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#BFE3FF]/60 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#CFF3E3]/60 blur-3xl"
            />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Copy Column */}
              <div className="lg:col-span-6">
                <span className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
                  <Mail size={13} aria-hidden="true" />
                  Start a Cohort or Sign In
                </span>

                <h2 id="fla-enquiry-heading" className="fla-display-h2 mt-4">
                  Ready to elevate capability across your team?
                </h2>

                <p className="mt-4 text-base sm:text-lg text-[#4A5058] leading-relaxed">
                  Request a guided Academy walkthrough, schedule a departmental training cohort, or jump straight into your employee workspace.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <MagneticButton variant="secondary" onClick={onSignInClick}>
                    <LogIn size={16} aria-hidden="true" />
                    <span>Already have credentials? Sign In</span>
                  </MagneticButton>
                </div>

                <div className="mt-7 pt-6 border-t border-black/[0.07] text-xs sm:text-sm text-[#4A5058] space-y-1">
                  <div className="font-bold text-[#1F2328]">Direct HR &amp; Academy Desk</div>
                  <div>
                    Email:{' '}
                    <a
                      href={`mailto:${SITE_CONTENT.contact.email}`}
                      className="font-semibold text-[#0B5CAB] underline underline-offset-2"
                    >
                      {SITE_CONTENT.contact.email}
                    </a>
                  </div>
                  <div>{SITE_CONTENT.contact.fullAddress}</div>
                </div>
              </div>

              {/* Right Validated Form Column */}
              <div className="lg:col-span-6">
                {receipt ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-3xl bg-[#CFF3E3]/75 border border-[#0F766E]/30 p-6 sm:p-8 text-[#1F2328]"
                  >
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0F766E] shadow-sm">
                      <CheckCircle2 size={26} aria-hidden="true" />
                    </div>
                    <h3 className="fla-display-h3 mt-4">Enquiry Received!</h3>
                    <p className="mt-2 text-sm text-[#1F2328]/90 leading-relaxed">
                      Thank you, <strong>{form.fullName}</strong>. Your request regarding{' '}
                      <strong>{form.interest}</strong> has been logged for the Fairmacs Learning Academy team.
                    </p>
                    <div className="mt-4 inline-block rounded-xl bg-white/85 px-3.5 py-2 text-xs font-bold text-[#0B5CAB] fla-tabular">
                      Reference ID: {receipt.referenceId}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setReceipt(null);
                          setForm({
                            fullName: '',
                            contact: '',
                            interest: INTEREST_OPTIONS[0],
                            notes: '',
                            companyWebsite: '',
                          });
                        }}
                        className="fla-btn-secondary text-xs sm:text-sm"
                      >
                        Submit Another Request
                      </button>
                      <button
                        type="button"
                        onClick={onSignInClick}
                        className="fla-btn-primary text-xs sm:text-sm"
                      >
                        <span>Go to Employee Sign In</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="rounded-3xl bg-white/80 border border-white/95 p-5 sm:p-7 shadow-sm space-y-4"
                  >
                    {/* Hidden Honeypot Field */}
                    <div className="sr-only" aria-hidden="true">
                      <label htmlFor="fla-company-website">Company Website</label>
                      <input
                        id="fla-company-website"
                        name="companyWebsite"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={form.companyWebsite}
                        onChange={(e) => updateField('companyWebsite', e.target.value)}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="fla-full-name"
                        className="block text-xs font-bold uppercase tracking-wider text-[#1F2328] mb-1.5"
                      >
                        Full Name *
                      </label>
                      <input
                        id="fla-full-name"
                        type="text"
                        autoComplete="name"
                        enterKeyHint="next"
                        placeholder="e.g. Priya Nair"
                        value={form.fullName}
                        onChange={(e) => updateField('fullName', e.target.value)}
                        aria-invalid={Boolean(errors.fullName)}
                        aria-describedby={errors.fullName ? 'fla-err-name' : undefined}
                        className="fla-input"
                      />
                      {errors.fullName && (
                        <p
                          id="fla-err-name"
                          role="alert"
                          className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-[#B91C1C]"
                        >
                          <AlertCircle size={13} aria-hidden="true" />
                          <span>{errors.fullName}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="fla-contact"
                        className="block text-xs font-bold uppercase tracking-wider text-[#1F2328] mb-1.5"
                      >
                        Work Email or Mobile Number *
                      </label>
                      <input
                        id="fla-contact"
                        type="text"
                        autoComplete="email"
                        autoCapitalize="none"
                        enterKeyHint="next"
                        placeholder="name@fairmacs.com or +91 98400 00000"
                        value={form.contact}
                        onChange={(e) => updateField('contact', e.target.value)}
                        aria-invalid={Boolean(errors.contact)}
                        aria-describedby={errors.contact ? 'fla-err-contact' : undefined}
                        className="fla-input"
                      />
                      {errors.contact && (
                        <p
                          id="fla-err-contact"
                          role="alert"
                          className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-[#B91C1C]"
                        >
                          <AlertCircle size={13} aria-hidden="true" />
                          <span>{errors.contact}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="fla-interest"
                        className="block text-xs font-bold uppercase tracking-wider text-[#1F2328] mb-1.5"
                      >
                        Program or Cohort Interest *
                      </label>
                      <select
                        id="fla-interest"
                        value={form.interest}
                        onChange={(e) => updateField('interest', e.target.value)}
                        aria-invalid={Boolean(errors.interest)}
                        className="fla-input"
                      >
                        {!INTEREST_OPTIONS.includes(form.interest) && form.interest && (
                          <option value={form.interest}>{form.interest}</option>
                        )}
                        {INTEREST_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="fla-notes"
                        className="block text-xs font-bold uppercase tracking-wider text-[#1F2328] mb-1.5"
                      >
                        Department / Notes (Optional)
                      </label>
                      <textarea
                        id="fla-notes"
                        rows={2}
                        enterKeyHint="send"
                        placeholder="Team size, branch location, or target start month..."
                        value={form.notes}
                        onChange={(e) => updateField('notes', e.target.value)}
                        className="fla-input resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="fla-btn-primary w-full justify-center text-sm disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                          <span>Submitting Request…</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} aria-hidden="true" />
                          <span>{SITE_CONTENT.brand.primaryCtaLabel}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
