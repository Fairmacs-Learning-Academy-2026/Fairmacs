import React from 'react';
import { X, Printer, Award, ShieldCheck, Download, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CertificateViewer({ certificate, onClose, verificationData }) {
  const { user } = useAuth();

  const certData = certificate || {};

  const employeeName = certData.userName || certData.name || user?.name || 'Employee Name';
  const employeeId = certData.employeeId || user?.id || 'EMP0000';
  const employeeDept = certData.department || user?.department || 'Department';
  const employeeDesignation = certData.designation || user?.designation || 'Designation';

  const courseTitle = certData.courseTitle || 'Freight Forwarding Fundamentals';
  const score = certData.score ?? 92;
  const certId = certData.certId || certData.certificateId || 'FM-CERT-00000';
  const issueDate = certData.issueDate || certData.issuedDate || '20 Sep 2026';

  const handlePrint = () => {
    window.print();
  };

  const isVerified = verificationData && verificationData.verifiedBy;

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '840px', padding: 0, overflow: 'hidden' }}>
        <div style={{ background: '#0f172a', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
            <Award style={{ width: 18, height: 18, color: '#38bdf8' }} /> Fairmacs Verifiable Digital Credential
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={handlePrint} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'white', color: '#0f172a' }}>
              <Printer style={{ width: 15, height: 15 }} /> Download / Print PDF
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.4rem', borderRadius: '50%', color: 'white', cursor: 'pointer' }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        {isVerified && (
          <div style={{
            background: 'linear-gradient(90deg, #dcfce7 0%, #bbf7d0 100%)',
            padding: '0.6rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            borderBottom: '1px solid #86efac',
            color: '#14532d',
            fontWeight: 800,
            fontSize: '0.85rem'
          }}>
            <ShieldAlert style={{ width: 18, height: 18, color: '#15803d' }} />
            VERIFIED CREDENTIAL — Verified by <span style={{ color: '#065f46' }}>{verificationData.verifiedByName}</span>
            {' '}({verificationData.verifiedByRoleLabel || verificationData.verifiedByRole})
            {' '}on {verificationData.verifiedAt}
          </div>
        )}

        <div style={{ padding: '3.5rem', background: '#fffdf9', border: '14px solid #0f172a', position: 'relative', textAlign: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.04, pointerEvents: 'none' }}>
            <img src="/fairmacs-logo-transparent.png" alt="Watermark" style={{ width: 400, objectFit: 'contain' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <img src="/fairmacs-logo-transparent.png" alt="Fairmacs" style={{ height: 65, objectFit: 'contain' }} />
          </div>

          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '1.75rem' }}>
            Corporate Learning & Development Division
          </div>

          <h1 style={{ fontSize: '2.4rem', fontFamily: 'serif', color: '#0f172a', marginBottom: '0.75rem' }}>
            Certificate of Completion
          </h1>

          <p style={{ fontSize: '0.92rem', color: '#64748b', fontStyle: 'italic', marginBottom: '0.5rem' }}>
            This is to officially certify that
          </p>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0c4a6e', margin: '0.5rem 0', letterSpacing: '-0.3px' }}>
            {employeeName}
          </h2>

          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.5rem' }}>
            Employee ID: <strong>{employeeId}</strong> • Designation: <strong>{employeeDesignation}</strong> • Department: <strong>{employeeDept}</strong>
          </p>

          <p style={{ fontSize: '0.92rem', color: '#64748b', fontStyle: 'italic', marginBottom: '0.5rem' }}>
            has successfully completed the operational curriculum & assessment for
          </p>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0.75rem 0' }}>
            {courseTitle}
          </h3>

          <div style={{ display: 'inline-block', background: '#dcfce7', color: '#15803d', padding: '0.35rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '2.5rem' }}>
            Assessment Score: {score}% • Passed
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid #cbd5e1', marginTop: '1rem' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Certificate ID:</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{certId}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Completed: {issueDate}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7', fontSize: '0.78rem', fontWeight: 700 }}>
              <ShieldCheck style={{ width: 18, height: 18 }} /> Verifiable Enterprise Credential
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'cursive', fontSize: '1.3rem', color: '#0f172a', fontWeight: 700 }}>HR Admin</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', borderTop: '1px solid #94a3b8', paddingTop: '0.2rem' }}>
                Head of L&D, Fairmacs Logistics
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
