import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  AlertCircle,
  Loader2,
  FileText,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  Calendar,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { policyService } from '../../services/policyService';
import { generateSafeWatermarkSvg } from '../../utils/watermarkUtil';
import { useAuth } from '../../context/AuthContext';

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export default function PolicyPdfViewerModal({
  versionId,
  assignmentId = null,
  title = '',
  documentCode = '',
  versionNumber = '1.0',
  categoryName = 'General',
  mandatory = true,
  effectiveDate = '',
  dueDate = '',
  allowDownload = true,
  isAlreadyAcknowledged = false,
  acknowledgedAt = null,
  onClose,
  onAcknowledged,
}) {
  const { user } = useAuth();

  // Document Blob & Raw Data State
  const [blobUrl, setBlobUrl] = useState(null);
  const [arrayBufferData, setArrayBufferData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  // PDF.js Canvas Navigation & Zoom State
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomScale, setZoomScale] = useState(1.0); // 0.75, 1.0, 1.25, 1.5, 2.0
  const [renderingPages, setRenderingPages] = useState(false);
  const canvasContainerRef = useRef(null);
  const pdfDocRef = useRef(null);

  // Acknowledgement Workflow State (Strictly Stage 6)
  const [confirmed, setConfirmed] = useState(false);
  const [acknowledgementComments, setAcknowledgementComments] = useState('');
  const [submittingAck, setSubmittingAck] = useState(false);
  const [ackError, setAckError] = useState(null);
  const [ackSuccess, setAckSuccess] = useState(isAlreadyAcknowledged);

  // Authenticated Watermark Metadata (Derived securely from authenticated session)
  const employeeName = user?.fullName || user?.name || user?.email || 'Authorized Employee';
  const employeeId = user?.employeeId || (user?.id ? `EMP${user.id}` : 'EMP-001');

  // Unified Viewing-Time Formatter: DD/MM/YYYY HH:mm:ss
  const localViewingTime = useMemo(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }, []);

  // Complete Unified Watermark String: CONFIDENTIAL – PROPERTY OF FAIRMACS | Name | EmployeeID | Fairmacs Learning Academy | Timestamp
  const watermarkString = useMemo(() => {
    return `CONFIDENTIAL \u2013 PROPERTY OF FAIRMACS | ${employeeName} | ${employeeId} | Fairmacs Learning Academy | ${localViewingTime}`;
  }, [employeeName, employeeId, localViewingTime]);

  // Unified SVG Watermark Tile Pattern
  // Single continuous diagonal line centered in tile to prevent clipping, wrapping, or fragmentation
  const watermarkSvgUrl = useMemo(() => {
    const escapedText = watermarkString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="260" viewBox="0 0 520 260">
      <text 
        x="260" 
        y="130" 
        text-anchor="middle" 
        dominant-baseline="central" 
        transform="rotate(-25 260 130)" 
        fill="rgba(15, 23, 42, 0.28)" 
        font-size="12" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
        font-weight="600" 
        letter-spacing="0.5"
        xml:space="preserve"
      >${escapedText}</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [watermarkString]);

  // 1. Fetch authenticated PDF blob from backend
  const loadPdfDocument = useCallback(async () => {
    if (!versionId) {
      setError('No document version selected for preview.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setUseIframeFallback(false);

    try {
      const blob = await policyService.fetchPdfBlob(versionId);
      const url = window.URL.createObjectURL(blob);
      setBlobUrl(url);

      const buffer = await blob.arrayBuffer();
      setArrayBufferData(buffer);

      // Attempt PDF.js parsing
      try {
        const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
        const pdfDoc = await loadingTask.promise;
        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages || 1);
        setCurrentPage(1);
      } catch (pdfErr) {
        console.warn('PDF.js parsing failed, falling back to embedded viewer:', pdfErr);
        setUseIframeFallback(true);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load authenticated policy PDF:', err);
      setError(err.message || 'Unable to load PDF document.');
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    loadPdfDocument();

    return () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [loadPdfDocument]);

  // 2. Render PDF Pages on Canvas when arrayBufferData or zoomScale changes
  useEffect(() => {
    let cancelled = false;

    async function renderAllPages() {
      if (!pdfDocRef.current || useIframeFallback || !canvasContainerRef.current) {
        return;
      }

      setRenderingPages(true);
      const pdf = pdfDocRef.current;
      const container = canvasContainerRef.current;
      const totalPages = pdf.numPages || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const containerWidth = Math.max(320, (container.clientWidth || 760) - 48);

      const fragment = document.createDocumentFragment();

      try {
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          if (cancelled) return;

          const unscaledViewport = page.getViewport({ scale: 1 });
          const baseScale = unscaledViewport.width > 0 ? containerWidth / unscaledViewport.width : 1;
          const effectiveScale = baseScale * zoomScale;
          const viewport = page.getViewport({ scale: effectiveScale });

          const pageWrapper = document.createElement('div');
          pageWrapper.id = `policy-pdf-page-${pageNum}`;
          pageWrapper.className = 'policy-pdf-page-wrapper';
          Object.assign(pageWrapper.style, {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: pageNum < totalPages ? '28px' : '0',
            position: 'relative',
          });

          // Dedicated container enclosing canvas and per-page watermark layer
          const pageCanvasBox = document.createElement('div');
          pageCanvasBox.className = 'policy-pdf-canvas-box';
          Object.assign(pageCanvasBox.style, {
            position: 'relative',
            width: `${Math.floor(viewport.width)}px`,
            height: `${Math.floor(viewport.height)}px`,
            borderRadius: '6px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden', // Contain watermark strictly within page edges
            background: '#ffffff',
          });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          Object.assign(canvas.style, {
            width: '100%',
            height: '100%',
            display: 'block',
            position: 'relative',
            zIndex: '1',
          });

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
            await page.render({
              canvasContext: ctx,
              viewport,
            }).promise;
          }

          // Per-page safe non-clipping watermark overlay layer applied across the full page area
          const watermarkOverlay = document.createElement('div');
          watermarkOverlay.className = 'policy-pdf-page-watermark';
          watermarkOverlay.setAttribute('aria-hidden', 'true');
          Object.assign(watermarkOverlay.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            zIndex: '10',
            pointerEvents: 'none',
            userSelect: 'none',
            overflow: 'hidden',
            mixBlendMode: 'multiply',
          });
          watermarkOverlay.innerHTML = generateSafeWatermarkSvg(viewport.width, viewport.height, watermarkString, 45);

          pageCanvasBox.appendChild(canvas);
          pageCanvasBox.appendChild(watermarkOverlay);

          // Page Number Indicator label under canvas
          const pageLabel = document.createElement('div');
          pageLabel.innerText = `Page ${pageNum} of ${totalPages}`;
          Object.assign(pageLabel.style, {
            fontSize: '11px',
            color: '#64748b',
            marginTop: '8px',
            fontWeight: '500',
            userSelect: 'none',
          });

          pageWrapper.appendChild(pageCanvasBox);
          pageWrapper.appendChild(pageLabel);
          fragment.appendChild(pageWrapper);
        }

        if (!cancelled && container) {
          container.replaceChildren(fragment);
        }
      } catch (renderErr) {
        console.error('Canvas render error, falling back to iframe:', renderErr);
        if (!cancelled) {
          setUseIframeFallback(true);
        }
      } finally {
        if (!cancelled) {
          setRenderingPages(false);
        }
      }
    }

    renderAllPages();

    return () => {
      cancelled = true;
    };
  }, [arrayBufferData, zoomScale, useIframeFallback, numPages, watermarkSvgUrl]);

  // 3. Zoom handlers
  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(2.5, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.5, +(prev - 0.25).toFixed(2)));
  };

  const handleResetZoom = () => {
    setZoomScale(1.0);
  };

  // 4. Download handler (respects allowDownload flag and backend authorization)
  const handleDownload = async () => {
    if (!allowDownload) return;
    try {
      setDownloading(true);
      const safeFilename = `${(title || 'Policy').replace(/[^a-zA-Z0-9_-]/g, '_')}_v${versionNumber || '1.0'}.pdf`;
      await policyService.downloadPdf(versionId, safeFilename);
    } catch (err) {
      alert(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  // 5. Submit Acknowledgement to Backend
  const handleAcknowledge = async () => {
    if (!confirmed || submittingAck || !assignmentId) {
      return;
    }

    setSubmittingAck(true);
    setAckError(null);

    try {
      const result = await policyService.acknowledgePolicy(assignmentId, {
        confirmed: true,
        comments: acknowledgementComments.trim() || undefined,
      });

      setAckSuccess(true);
      if (typeof onAcknowledged === 'function') {
        onAcknowledged(result);
      }
    } catch (err) {
      console.error('Failed to acknowledge policy:', err);
      setAckError(err.message || 'Unable to record acknowledgement. Please try again.');
    } finally {
      setSubmittingAck(false);
    }
  };

  const modalContent = (
    <div 
      id="policy-pdf-viewer-portal"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200"
      style={{ zIndex: 99999 }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[92vh] max-h-[92vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10">
        
        {/* ========================================================= */}
        {/* 1. COMPREHENSIVE HEADER & METADATA BAR                     */}
        {/* ========================================================= */}
        <div className="relative z-30 px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold truncate text-white max-w-md">
                  {title || 'Policy Document Preview'}
                </h3>
                {documentCode && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                    {documentCode}
                  </span>
                )}
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-blue-950 text-blue-300 rounded border border-blue-800">
                  v{versionNumber || '1.0'}
                </span>
                {mandatory ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    Mandatory
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    Optional
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                <span>Category: <strong className="text-slate-200">{categoryName}</strong></span>
                {effectiveDate && <span>Effective: <strong className="text-slate-200">{effectiveDate}</strong></span>}
                {dueDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Due: <strong className="text-slate-200">{dueDate}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation & Zoom Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!useIframeFallback && numPages > 0 && (
              <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 0.5}
                  className="p-1 hover:text-white disabled:opacity-30 rounded transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-0.5 font-mono text-[11px] hover:text-white transition"
                  title="Reset Zoom"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomScale >= 2.5}
                  className="p-1 hover:text-white disabled:opacity-30 rounded transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {allowDownload && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                title="Download PDF Document"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. VIEWER VIEWPORT & CANVAS SCROLL AREA                   */}
        {/* ========================================================= */}
        <div className="relative z-10 flex-1 min-h-0 w-full bg-slate-200/90 dark:bg-slate-950 overflow-y-auto overflow-x-auto flex flex-col items-center p-4 sm:p-6">
          
          {/* Loading State */}
          {loading && (
            <div className="m-auto flex flex-col items-center gap-3 text-slate-600 dark:text-slate-400 py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-sm font-semibold">Loading...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="m-auto max-w-md p-6 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-red-200 dark:border-red-900/60 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Document Load Failed
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={loadPdfDocument}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          )}

          {/* Canvas Rendering Container */}
          {!loading && !error && !useIframeFallback && (
            <div className="w-full flex flex-col items-center relative z-10">
              {renderingPages && (
                <div className="absolute top-2 right-2 z-30 bg-slate-900/80 text-white px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5 shadow-md">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                  <span>Rendering pages...</span>
                </div>
              )}
              <div
                ref={canvasContainerRef}
                className="w-full flex flex-col items-center"
              />
            </div>
          )}

          {/* Iframe Fallback Container */}
          {!loading && !error && useIframeFallback && blobUrl && (
            <div className="w-full h-full relative z-10 flex flex-col">
              <iframe
                src={blobUrl}
                title={title || 'Policy Document Preview'}
                className="w-full h-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white"
              />
              <div
                className="absolute inset-0 pointer-events-none select-none z-20"
                style={{
                  backgroundImage: `url("${watermarkSvgUrl}")`,
                  backgroundRepeat: 'repeat',
                }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 3. STAGE 6 FORMAL ACKNOWLEDGEMENT WORKFLOW FOOTER          */}
        {/* ========================================================= */}
        {assignmentId && !isAlreadyAcknowledged && (
          <div className="relative z-30 p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 shadow-lg">
            {ackSuccess ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold">Policy Successfully Acknowledged</h5>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Your explicit acknowledgement has been recorded in the compliance ledger.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {ackError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{ackError}</span>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Explicit Confirmation Checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      id="policy-ack-checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      disabled={submittingAck}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                    />
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        I confirm that I have read and understood this policy/agreement and acknowledge its contents.
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Your acknowledgement will be recorded with timestamp and employee ID ({employeeId}).
                      </p>
                    </div>
                  </label>

                  {/* Submission Actions */}
                  <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submittingAck}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      id="policy-accept-continue-btn"
                      onClick={handleAcknowledge}
                      disabled={!confirmed || submittingAck}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submittingAck ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Acknowledge &amp; Continue</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. ALREADY ACKNOWLEDGED / REVISIT FOOTER                   */}
        {/* ========================================================= */}
        {(isAlreadyAcknowledged || (!assignmentId && !ackSuccess)) && (
          <div className="relative z-30 px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              {isAlreadyAcknowledged ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Acknowledged on <strong className="text-slate-800 dark:text-slate-200">{acknowledgedAt ? new Date(acknowledgedAt).toLocaleString() : 'Record'}</strong> (v{versionNumber}).
                  </span>
                </>
              ) : (
                <span className="text-slate-500">
                  View mode
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
            >
              Close Viewer
            </button>
          </div>
        )}

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
