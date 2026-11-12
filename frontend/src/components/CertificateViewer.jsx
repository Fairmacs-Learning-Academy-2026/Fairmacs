import React, { useState } from 'react';
import { X, Printer, Award, ShieldCheck, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CertificateViewer({ certificate, onClose, verificationData }) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const certData = certificate || {};

  const formatCompletionDate = (val) => {
    if (!val) return new Date().toLocaleDateString('en-GB');
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB');
      }
    } catch {
      // fallback
    }
    return String(val);
  };

  const employeeName = certData.userName || certData.name || user?.name || 'Fairmacs Professional';
  const courseTitle = certData.courseTitle || 'Freight Forwarding & Operational Excellence';
  const certId = certData.certId || certData.certificateId || 'OP001';
  const issueDate = formatCompletionDate(certData.issueDate || certData.issuedDate || certData.issuedAt);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const token =
        localStorage.getItem('fairmacs_token') ||
        localStorage.getItem('fairmacs_lms_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token') ||
        '';
      const response = await fetch(`/api/certificates/${certId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        window.print();
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fairmacs_Certificate_${certId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '960px',
          width: '95vw',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.45)',
          background: '#0a192f'
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            background: 'linear-gradient(90deg, #0a192f 0%, #0f2b48 100%)',
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'white',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, fontSize: '0.95rem' }}>
            <Award style={{ width: 20, height: 20, color: '#38bdf8' }} />
            <span>Fairmacs - KMS • {certId}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn-primary"
              onClick={handleDownloadPdf}
              disabled={downloading}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.82rem',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {downloading ? (
                <>
                  <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download style={{ width: 15, height: 15 }} />
                  Download PDF
                </>
              )}
            </button>

            <button
              className="btn-secondary"
              onClick={handlePrint}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                background: 'rgba(255,255,255,0.12)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Printer style={{ width: 15, height: 15 }} />
              Print
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                padding: '0.45rem',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        {/* Certificate Display Area */}
        <div style={{ padding: '1rem', background: '#071322' }}>
          <div
            className="certificate-print-area"
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              lineHeight: 1
            }}
          >
            {/* Background Image: User Reference Template */}
            <img
              src="/certificate-template.jpg"
              alt="Fairmacs Certificate Template"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block'
              }}
            />

            {/* Overlay: Learner Name */}
            <div
              style={{
                position: 'absolute',
                top: '44%',
                left: '26%',
                width: '48%',
                textAlign: 'center',
                background: '#ffffff',
                padding: '3px 0'
              }}
            >
              <span
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontStyle: 'italic',
                  fontWeight: 700,
                  fontSize: 'clamp(1rem, 2.7vw, 2rem)',
                  color: '#0c4a6e',
                  letterSpacing: '0.5px'
                }}
              >
                {employeeName}
              </span>
            </div>

            {/* Overlay: Course Title */}
            <div
              style={{
                position: 'absolute',
                top: '60.3%',
                left: '24%',
                width: '52%',
                textAlign: 'center',
                background: '#ffffff',
                padding: '2px 0'
              }}
            >
              <span
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(0.75rem, 1.9vw, 1.4rem)',
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {courseTitle}
              </span>
            </div>

            {/* Overlay: Certificate ID */}
            <div
              style={{
                position: 'absolute',
                top: '84.8%',
                right: '6.5%',
                width: '18%',
                textAlign: 'left',
                background: '#ffffff',
                padding: '1px 2px'
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace, monospace',
                  fontWeight: 700,
                  fontSize: 'clamp(0.65rem, 1.25vw, 0.95rem)',
                  color: '#0f172a'
                }}
              >
                {certId}
              </span>
            </div>

            {/* Overlay: Date of Completion */}
            <div
              style={{
                position: 'absolute',
                top: '90.5%',
                right: '6.5%',
                width: '18%',
                textAlign: 'left',
                background: '#ffffff',
                padding: '1px 2px'
              }}
            >
              <span
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 600,
                  fontSize: 'clamp(0.65rem, 1.2vw, 0.9rem)',
                  color: '#0f172a'
                }}
              >
                {issueDate}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            background: '#0a192f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.78rem',
            color: '#94a3b8'
          }} />
        {/* Print stylesheet to ensure landscape certificate prints cleanly without modal overlays */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden !important; }
            .certificate-print-area, .certificate-print-area * { visibility: visible !important; }
            .certificate-print-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            @page {
              size: A4 landscape;
              margin: 0;
            }
          }
        `}} />
      </div>
    </div>
  );
}
