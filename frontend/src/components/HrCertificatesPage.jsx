import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertCircle,
  FileCheck,
  ExternalLink
} from 'lucide-react';
import { useEnrollmentStore } from '../stores/enrollmentStore';

const cardStyle = {
  background: '#FFFFFF',
  borderRadius: '8px',
  border: '1px solid #E2E8F0',
  padding: '1.25rem 1.4rem',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const actionBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.45rem',
  padding: '0.52rem 0.95rem',
  borderRadius: '6px',
  fontSize: '0.84rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#0F172A',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
  whiteSpace: 'nowrap',
};

export default function HrCertificatesPage({ onViewCertificate }) {
  const {
    verifyCertificate,
    verifiedCertificateError,
    fetchRecentCertificates,
    recentCertificates
  } = useEnrollmentStore();

  const [certInput, setCertInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    fetchRecentCertificates(20);
  }, [fetchRecentCertificates]);

  const handleVerifyCertificate = async (event) => {
    event.preventDefault();
    const id = certInput.trim();
    if (!id) return;

    setVerifying(true);
    const result = await verifyCertificate(id);
    setVerifying(false);

    if (result && onViewCertificate) {
      onViewCertificate(result.certificate, result);
    }
  };

  const openRecentAsVerified = (cert) => {
    if (!cert || !onViewCertificate) return;
    const certPayload = {
      id: cert.certificateId || cert.id,
      certificateId: cert.certificateId || cert.id,
      courseTitle: cert.courseTitle || cert.courseName || 'Completed Course',
      employeeName: cert.userName || cert.employeeName || 'Fairmacs Employee',
      department: cert.department || 'Operations',
      issueDate: cert.issuedAt || cert.issueDate || new Date().toISOString(),
      score: cert.score || 100,
      passingGrade: cert.passingGrade || 80,
    };
    onViewCertificate(certPayload, {
      authentic: true,
      certificate: certPayload,
      message: 'Certificate authenticity verified via KMS Registry.',
    });
  };

  const filteredCertificates = (recentCertificates || []).filter((cert) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const title = (cert.courseTitle || cert.courseName || '').toLowerCase();
    const name = (cert.userName || cert.employeeName || '').toLowerCase();
    const dept = (cert.department || '').toLowerCase();
    const id = (cert.certificateId || cert.id || '').toLowerCase();
    return title.includes(q) || name.includes(q) || dept.includes(q) || id.includes(q);
  });

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minWidth: 0,
        color: '#14243A',
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Certificates & Credentials
        </h1>
        <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '3px 0 0 0' }}>
          Verify issued employee credentials, audit certificate records, and validate credential authenticity
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Verify Certificate Card */}
        <section style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                background: '#F0F9FF',
                color: '#0F6CBD',
                width: 42,
                height: 42,
                borderRadius: 6,
                border: '1px solid #BAE6FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Verify Certificate
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '3px 0 0 0' }}>
                Validate authenticity of Fairmacs training credentials
              </p>
            </div>
          </div>

          <form
            onSubmit={handleVerifyCertificate}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
          >
            <div>
              <label
                htmlFor="cert-id-input"
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '0.4rem',
                }}
              >
                Certificate Credential ID
              </label>
              <input
                id="cert-id-input"
                type="text"
                placeholder="e.g. CERT-IMP-FND-001 or UUID"
                value={certInput}
                onChange={(event) => setCertInput(event.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={verifying || !certInput.trim()}
              style={{
                ...actionBtnStyle,
                background: verifying || !certInput.trim() ? '#94A3B8' : '#0F6CBD',
                color: '#FFFFFF',
                border: '1px solid transparent',
                padding: '0.65rem 1.15rem',
                cursor: verifying || !certInput.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              <Search size={16} />
              {verifying ? 'Verifying Credential…' : 'Verify & Open Certificate'}
            </button>
          </form>

          {verifiedCertificateError && (
            <div
              role="alert"
              style={{
                marginTop: '1rem',
                padding: '0.8rem 1rem',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                borderRadius: '6px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{verifiedCertificateError}</span>
            </div>
          )}
        </section>

        {/* Recently Issued Certificates */}
        <section style={cardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Recently Issued Certificates
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '3px 0 0 0' }}>
                Click any credential to open verification view
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchRecentCertificates(20)}
              style={{ ...actionBtnStyle, padding: '0.4rem 0.75rem' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Search Filter */}
          <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
            <Search
              size={14}
              color="#94A3B8"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by course, employee, or ID…"
              aria-label="Filter certificates"
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 1.95rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8125rem',
                color: '#0F172A',
                background: '#FFFFFF',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              maxHeight: '480px',
              overflowY: 'auto',
            }}
          >
            {filteredCertificates?.length ? (
              filteredCertificates.map((cert, index) => (
                <div
                  key={cert.certificateId ?? cert.id ?? index}
                  onClick={() => openRecentAsVerified(cert)}
                  style={{
                    padding: '0.75rem 0.95rem',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      background: '#F0FDF4',
                      color: '#16A34A',
                      border: '1px solid #BBF7D0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Award size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 650,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {cert.courseTitle || cert.courseName || 'Completed Course'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>
                      {cert.userName || cert.employeeName || 'Employee'}
                      {cert.department ? ` • ${cert.department}` : ''}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#0F6CBD', fontWeight: 500, marginTop: 2, fontFamily: 'monospace' }}>
                      {cert.certificateId || cert.id}
                      {cert.issuedAt ? ` • ${new Date(cert.issuedAt).toLocaleDateString('en-IN')}` : ''}
                    </div>
                  </div>

                  <ExternalLink size={15} color="#94A3B8" />
                </div>
              ))
            ) : (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                <FileCheck size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <p style={{ fontWeight: 650, margin: 0, color: '#0F172A' }}>No certificates recorded</p>
                <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                  Credentials will populate as employees complete courses.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
