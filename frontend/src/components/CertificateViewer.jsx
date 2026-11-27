import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Printer, Award, Download, Loader2, RefreshCw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';

// Configure PDF.js worker (same setup as the policy viewer)
if (typeof window !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

const RENDER_WIDTH_PX = 1800;

function getStoredToken() {
  return (
    localStorage.getItem('fairmacs_token') ||
    localStorage.getItem('fairmacs_lms_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    ''
  );
}

/**
 * Shows the certificate exactly as the server generates it. The PDF is fetched once and drawn
 * on a canvas, so the preview, the printout and the downloaded file are always identical
 * (the layout, fonts and organisation name all come from the backend).
 */
export default function CertificateViewer({ certificate, onClose }) {
  const certData = certificate || {};
  const certId = certData.certId || certData.certificateId || '';

  const canvasRef = useRef(null);
  const pdfBlobRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchPdfBlob = useCallback(async () => {
    if (!certId) {
      throw new Error('This certificate has no certificate ID.');
    }
    const token = getStoredToken();
    const response = await authFetch(
      `${SHARED_API_BASE_URL}/certificates/${encodeURIComponent(certId)}/pdf`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? 'Certificate not found.'
          : response.status === 403
            ? 'You do not have permission to view this certificate.'
            : `Unable to load the certificate (error ${response.status}).`
      );
    }
    return response.blob();
  }, [certId]);

  // Load + draw the PDF
  useEffect(() => {
    let cancelled = false;
    let pdfDoc = null;

    (async () => {
      try {
        setLoading(true);
        setError('');

        const blob = await fetchPdfBlob();
        if (cancelled) return;
        pdfBlobRef.current = blob;

        const buffer = await blob.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
        const page = await pdfDoc.getPage(1);
        if (cancelled) return;

        const unscaled = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: RENDER_WIDTH_PX / unscaled.width });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        if (!cancelled) {
          console.error('Certificate preview failed:', err);
          setError(err.message || 'Unable to load the certificate preview.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [fetchPdfBlob, reloadKey]);

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const blob = pdfBlobRef.current || (await fetchPdfBlob());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fairmacs_Certificate_${certId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError(err.message || 'Unable to download the certificate.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const topButtonStyle = {
    padding: '0.45rem 0.85rem',
    fontSize: '0.82rem',
    background: 'rgba(255,255,255,0.12)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
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
          background: 'rgba(255, 255, 255, 0.96)', border: '1px solid rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#1F2328',
            borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, fontSize: '0.95rem' }}>
            <Award style={{ width: 20, height: 20, color: '#0B5CAB' }} />
            <span>Fairmacs - KMS • {certId}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn-primary"
              onClick={handleDownloadPdf}
              disabled={downloading || loading}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.82rem',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {downloading ? (
                <>
                  <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                  Preparing...
                </>
              ) : (
                <>
                  <Download style={{ width: 15, height: 15 }} />
                  Download PDF
                </>
              )}
            </button>

            <button className="btn-secondary" onClick={handlePrint} disabled={loading || !!error} style={topButtonStyle}>
              <Printer style={{ width: 15, height: 15 }} />
              Print
            </button>

            <button
              onClick={onClose}
              aria-label="Close certificate"
              style={{
                background: 'rgba(241, 245, 249, 0.85)',
                border: '1px solid rgba(203, 213, 225, 0.8)',
                padding: '0.45rem',
                borderRadius: '50%',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        {/* Certificate Display Area */}
        <div style={{ padding: '1rem', background: '#EFECE6' }}>
          <div
            className="certificate-print-area"
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              lineHeight: 1,
              background: '#ffffff',
              minHeight: loading || error ? '260px' : undefined,
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: 'auto',
                display: loading || error ? 'none' : 'block',
              }}
            />

            {loading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  color: '#475569',
                  fontSize: '0.9rem',
                }}
              >
                <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                Preparing your certificate...
              </div>
            )}

            {!loading && error && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.8rem',
                  padding: '1rem',
                  textAlign: 'center',
                  color: '#991b1b',
                  fontSize: '0.9rem',
                }}
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={14} /> Try again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Print stylesheet: only the certificate is printed, on a landscape page without margins */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            body * { visibility: hidden !important; }
            .certificate-print-area, .certificate-print-area * { visibility: visible !important; }
            .certificate-print-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: 100dvh !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .certificate-print-area canvas {
              width: 100% !important;
              height: 100% !important;
              object-fit: contain !important;
            }
            @page {
              size: A4 landscape;
              margin: 0;
            }
          }
        `,
          }}
        />
      </div>
    </div>
  );
}
