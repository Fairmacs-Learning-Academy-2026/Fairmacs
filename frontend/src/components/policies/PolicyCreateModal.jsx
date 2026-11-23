import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';
import { policyService } from '../../services/policyService';

export default function PolicyCreateModal({
  existingPolicy = null, // If provided, mode is "Upload New Version"
  categories = [],
  departments = [],
  onClose,
  onSuccess,
}) {
  const isNewVersionMode = Boolean(existingPolicy?.id);

  // Form State
  const [title, setTitle] = useState(existingPolicy?.title || '');
  const [description, setDescription] = useState(existingPolicy?.description || '');
  const [categoryId, setCategoryId] = useState(existingPolicy?.categoryId || '');
  const [owningDepartmentId, setOwningDepartmentId] = useState(existingPolicy?.owningDepartmentId || '');

  // Version State
  const [versionNumber, setVersionNumber] = useState('');
  const [versionType, setVersionType] = useState('MAJOR');
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [allowDownload, setAllowDownload] = useState(true);
  const [versionNotes, setVersionNotes] = useState('');

  // File Upload State
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Submission State
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generalError, setGeneralError] = useState(null);

  const fileInputRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !uploading && !savingDraft) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, uploading, savingDraft]);

  // Default category if none selected
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // File Selection & Validation (25 MB max, PDF only)
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    validateAndSetFile(selected);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    validateAndSetFile(dropped);
  };

  const validateAndSetFile = (selected) => {
    setFileError(null);
    if (!selected) return;

    // Validate MIME / extension
    const isPdf =
      selected.type === 'application/pdf' ||
      selected.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setFileError('Invalid file format. Only PDF (.pdf) documents are permitted.');
      setFile(null);
      return;
    }

    // Validate 25 MB size ceiling
    const maxSizeBytes = 25 * 1024 * 1024;
    if (selected.size > maxSizeBytes) {
      const sizeMb = (selected.size / (1024 * 1024)).toFixed(1);
      setFileError(`File size (${sizeMb} MB) exceeds maximum 25 MB limit.`);
      setFile(null);
      return;
    }

    setFile(selected);
  };

  // 1. Save as Draft (without uploading PDF)
  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setGeneralError('Document title is required.');
      return;
    }
    if (!categoryId) {
      setGeneralError('Category is required.');
      return;
    }

    setSavingDraft(true);
    setGeneralError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        owningDepartmentId: owningDepartmentId ? Number(owningDepartmentId) : null,
      };

      let savedDoc;
      if (isNewVersionMode) {
        savedDoc = await policyService.updatePolicy(existingPolicy.id, payload);
      } else {
        savedDoc = await policyService.createPolicy(payload);
      }

      onSuccess(savedDoc, false); // false = do not open publish modal
      onClose();
    } catch (err) {
      console.error('Failed to save draft:', err);
      setGeneralError(err.message || 'Unable to save policy draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  // 2. Upload Version & Prepare for Publishing
  const handleUploadAndPublish = async () => {
    if (!title.trim()) {
      setGeneralError('Document title is required.');
      return;
    }
    if (!categoryId) {
      setGeneralError('Category is required.');
      return;
    }
    if (!file) {
      setGeneralError('Please select a PDF document to upload.');
      return;
    }

    setUploading(true);
    setGeneralError(null);
    setUploadProgress(15);

    try {
      let targetDoc = existingPolicy;

      // If creating new document, create master record first
      if (!isNewVersionMode) {
        setUploadProgress(30);
        targetDoc = await policyService.createPolicy({
          title: title.trim(),
          description: description.trim(),
          categoryId: Number(categoryId),
          owningDepartmentId: owningDepartmentId ? Number(owningDepartmentId) : null,
        });
      }

      setUploadProgress(60);

      // Prepare FormData for WorkDrive PDF upload
      const formData = new FormData();
      formData.append('file', file);
      if (versionNumber.trim()) {
        formData.append('versionNumber', versionNumber.trim());
      }
      formData.append('versionType', versionType);
      formData.append('effectiveDate', effectiveDate);
      formData.append('allowDownload', String(allowDownload));
      if (versionNotes.trim()) {
        formData.append('versionNotes', versionNotes.trim());
      }

      const uploadedVersion = await policyService.uploadVersion(targetDoc.id, formData);
      setUploadProgress(100);

      // Refresh targetDoc with latest version
      targetDoc.currentVersion = uploadedVersion;
      targetDoc.latestVersion = uploadedVersion;

      // Advise parent to open publish modal
      onSuccess(targetDoc, true); // true = proceed to publish modal
      onClose();
    } catch (err) {
      console.error('Upload failed:', err);
      setGeneralError(err.message || 'Failed to upload document version to Zoho WorkDrive.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const modalContent = (
    <div
      id="policy-create-modal-portal"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading && !savingDraft) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl sm:max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                {isNewVersionMode
                  ? `Upload New Version: ${existingPolicy.title}`
                  : 'Create Policy or Agreement'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isNewVersionMode
                  ? 'Add an updated release to this document'
                  : 'Enter document metadata and upload authenticated PDF'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-5 overscroll-contain">
          {generalError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center gap-2.5 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Document Title (Full Width) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fairmacs Workplace Safety & Ethics Policy"
              className="w-full h-10 px-3.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 transition-colors disabled:opacity-60"
              disabled={isNewVersionMode}
            />
          </div>

          {/* Category & Owning Department (Balanced 2-Column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 transition-colors disabled:opacity-60 cursor-pointer"
                disabled={isNewVersionMode}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.categoryName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Owning Department
              </label>
              <select
                value={owningDepartmentId}
                onChange={(e) => setOwningDepartmentId(e.target.value)}
                className="w-full h-10 px-3.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 transition-colors disabled:opacity-60 cursor-pointer"
                disabled={isNewVersionMode}
              >
                <option value="">All Company / Corporate</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description / Scope Summary (Full Width) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Description / Scope Summary
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Briefly summarize the purpose and organizational applicability of this document..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 resize-none transition-colors disabled:opacity-60"
              disabled={isNewVersionMode}
            />
          </div>

          {/* PDF File Upload Dropzone (Full Width) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Document PDF File {!isNewVersionMode && <span className="text-slate-400 font-normal normal-case">(Optional for Draft)</span>}
              {isNewVersionMode && <span className="text-red-500">*</span>}
            </label>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                file
                  ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : fileError
                  ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{file.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for WorkDrive upload
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-1">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Click to browse or drag and drop PDF file
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    PDF files only &bull; Up to 25 MB max limit &bull; Original filename preserved
                  </div>
                </div>
              )}
            </div>

            {fileError && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fileError}</span>
              </p>
            )}
          </div>

          {/* Version Details Accordion */}
          {file && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-150">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Version & Governance Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Version Number
                  </label>
                  <input
                    type="text"
                    value={versionNumber}
                    onChange={(e) => setVersionNumber(e.target.value)}
                    placeholder="Auto (e.g. 1.0)"
                    className="w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Version Type
                  </label>
                  <select
                    value={versionType}
                    onChange={(e) => setVersionType(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 cursor-pointer"
                  >
                    <option value="MAJOR">MAJOR (Material / Re-ack required)</option>
                    <option value="MINOR">MINOR (Clarification / Carried forward)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                    Allow Employee Download
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    If disabled, employees can view in-app only (no local save). HR Admin retains download access.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Version Release Notes
                </label>
                <input
                  type="text"
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  placeholder="e.g. Annual revision, amended section 4.2 compliance..."
                  className="w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700"
                />
              </div>
            </div>
          )}

          {/* Progress Bar when uploading */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-blue-700 dark:text-blue-400">
                <span>Uploading & encrypting to Zoho WorkDrive...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {!isNewVersionMode && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft || uploading}
                className="h-10 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingDraft && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Draft</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleUploadAndPublish}
              disabled={savingDraft || uploading || (!file && isNewVersionMode)}
              className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{file ? 'Upload & Continue to Publish' : 'Upload PDF & Publish'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
