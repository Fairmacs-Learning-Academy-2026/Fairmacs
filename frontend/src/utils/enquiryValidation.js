import { API_BASE_URL } from './apiConfig';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+0-9\s()-]{8,20}$/;

export function validateEnquiryForm(values = {}) {
  const errors = {};
  const fullName = String(values.fullName || '').trim();
  const contact = String(values.contact || '').trim();
  const interest = String(values.interest || '').trim();
  const notes = String(values.notes || '').trim();

  if (fullName.length < 2) {
    errors.fullName = 'Please enter your full name (at least 2 characters).';
  } else if (fullName.length > 80) {
    errors.fullName = 'Name must be 80 characters or fewer.';
  }

  if (!contact || (!EMAIL_RE.test(contact) && !PHONE_RE.test(contact))) {
    errors.contact = 'Please enter a valid work email address or phone number.';
  }

  if (interest.length < 2) {
    errors.interest = 'Please select a learning track or enquiry topic.';
  }

  if (notes.length > 500) {
    errors.notes = 'Notes must be 500 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleanData: { fullName, contact, interest, notes },
  };
}

export async function submitAcademyEnquiry(rawValues = {}) {
  // Silent anti-spam honeypot check
  if (rawValues.companyWebsite && String(rawValues.companyWebsite).trim().length > 0) {
    return {
      ok: true,
      referenceId: 'FLA-ACK',
      submittedAt: new Date().toISOString(),
    };
  }

  const { valid, errors, cleanData } = validateEnquiryForm(rawValues);
  if (!valid) {
    return {
      ok: false,
      fieldErrors: errors,
      message: 'Please review the highlighted fields.',
    };
  }

  const referenceId = `FLA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const submittedAt = new Date().toISOString();
  const payload = {
    ...cleanData,
    referenceId,
    submittedAt,
    source: 'fairmacs_learning_academy_home',
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3200);
    await fetch(`${API_BASE_URL}/public/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timer);
  } catch {
    // Graceful standalone mode fallback
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const existing = JSON.parse(localStorage.getItem('fairmacs_academy_enquiries') || '[]');
      existing.unshift(payload);
      localStorage.setItem('fairmacs_academy_enquiries', JSON.stringify(existing.slice(0, 20)));
    } catch {
      // Ignore storage quota limits
    }
  }

  return {
    ok: true,
    referenceId,
    submittedAt,
  };
}
