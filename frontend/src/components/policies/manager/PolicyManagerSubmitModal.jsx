import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Calendar,
  Building2,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { policyService } from '../../../services/policyService';

export default function PolicyManagerSubmitModal({
  isOpen,
  onClose,
  onSubmitted,
  categories = [],
  departments = [],
}) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [targetDepartmentId, setTargetDepartmentId] = useState('');
  const [description, setDescription] = useState('');
  const [versionNumber, setVersionNumber] = useState('1.0');
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [mandatory, setMandatory] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [submissionNotes, setSubmissionNotes] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  // Initialize target department if only 1 department available
  useEffect(() => {
    if (departments.length === 1 && !targetDepartmentId) {
      setTargetDepartmentId(String(departments[0].id));
    }
  }, [departments, targetDepartmentId]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  const validateAndSetFile = (file) => {
    setFileError('');
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Invalid file format. Only PDF documents are allowed.');
      setSelectedFile(null);
      return;
    }

    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
    if (file.size > MAX_SIZE) {
      setFileError('File size exceeds 25 MB limit. Please compress the PDF before uploading.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Please enter a document title.');
      return;
    }

    if (!categoryId) {
      setErrorMessage('Please select a category.');
      return;
    }

    if (!targetDepartmentId) {
      setErrorMessage('Please select your target department.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Please upload a PDF document.');
      return;
    }

    setSubmitting(true);
    setUploadProgress(25);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      formData.append('categoryId', categoryId);
      formData.append('targetDepartmentId', targetDepartmentId);
      formData.append('description', description.trim());
      formData.append('versionNumber', versionNumber.trim() || '1.0');
      formData.append('effectiveDate', effectiveDate);
      formData.append('mandatory', String(mandatory));
      if (dueDate) formData.append('dueDate', dueDate);
      formData.append('allowDownload', String(allowDownload));
      formData.append('submissionNotes', submissionNotes.trim());

      setUploadProgress(65);
      const res = await policyService.submitManagerPolicy(formData);
      setUploadProgress(100);

      if (onSubmitted) onSubmitted(res);
      onClose();
    } catch (err) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'Failed to submit department policy. Please verify department permissions.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const modalContent = (
    <div
      id="policy-manager-submit-modal-portal"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90dvh] overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
              <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Submit Department Policy / SOP</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Submit department procedures for HR/Admin compliance review</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0 overscroll-contain">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Target Department (Restricted Scope) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Target Department <span className="text-rose-500">*</span></span>
              <span className="text-[11px] text-slate-400 font-normal">Restricted to your managed hierarchy</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={targetDepartmentId}
                onChange={(e) => setTargetDepartmentId(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                <option value="">-- Select Target Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ocean Freight Export Operations Standard Operating Procedure"
              required
              maxLength={255}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* Category & Version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Version Number
              </label>
              <input
                type="text"
                value={versionNumber}
                onChange={(e) => setVersionNumber(e.target.value)}
                placeholder="1.0"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Short Description / Summary
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief summary of department procedures, scope, and objectives..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* File Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document File (PDF) <span className="text-rose-500">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    validateAndSetFile(e.target.files[0]);
                  }
                }}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-3 text-left">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">{selectedFile.name}</div>
                    <div className="text-xs text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for WorkDrive upload
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                </div>
              ) : (
                <div>
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-700">
                    Click to browse or drag and drop your PDF here
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    PDF format only • Max file size 25 MB
                  </div>
                </div>
              )}
            </div>
            {fileError && <p className="text-xs text-rose-500 mt-1.5">{fileError}</p>}
          </div>

          {/* Compliance & Due Date Settings */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3.5">
            <div className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Proposed Assignment & Compliance Settings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Mandatory Toggle */}
              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Mandatory Acknowledgement</div>
                  <div className="text-[11px] text-slate-500">Department employees must review</div>
                </div>
                <input
                  type="checkbox"
                  checked={mandatory}
                  onChange={(e) => setMandatory(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              {/* Allow Download */}
              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Allow File Download</div>
                  <div className="text-[11px] text-slate-500">Permit downloading raw PDF</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Effective Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Effective Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
                  />
                </div>
              </div>

              {/* Optional Due Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Target Due Date</span>
                  <span className="text-[10px] text-slate-400">Optional (Open-ended if blank)</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="date"
                    value={dueDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submission Notes for HR */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Review Notes for HR / Compliance Admin</span>
              <span className="text-[11px] text-slate-400 font-normal">Visible to approving admin</span>
            </label>
            <textarea
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Updated handling guidelines aligned with Q4 audit standards. Requesting expedited review."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* Workflow Disclaimer */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
            <div>
              <strong>HR Approval Workflow:</strong> Submissions enter HR review queue before distribution. Once approved by HR, policy will be published and assigned to your department employees.
            </div>
          </div>

          {/* Upload Progress Indicator */}
          {submitting && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Uploading to Zoho WorkDrive...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-10 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedFile}
              className="h-10 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 rounded-xl shadow-sm transition-all flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to HR...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Submit for HR Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
