import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, History, Plus, Eye, Download, ShieldCheck, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { policyService } from '../../services/policyService';

export default function PolicyVersionHistoryModal({
  policy,
  onClose,
  onViewVersion,
  onUploadNewVersion,
}) {
  const [versions, setVersions] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);

  useEffect(() => {
    if (!policy?.id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      policyService.getVersions(policy.id),
      policyService.getPolicyCompliance(policy.id).catch(() => null),
    ])
      .then(([verList, comp]) => {
        setVersions(verList || []);
        setCompliance(comp);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load version history:', err);
        setError(err.message || 'Unable to retrieve version history.');
        setLoading(false);
      });
  }, [policy?.id]);

  const handleCopyHash = (hash) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modalContent = (
    <div
      id="policy-version-history-portal"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90dvh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Version History</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {policy?.title} ({policy?.documentCode || 'DOC'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onUploadNewVersion(policy)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Version</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Compliance Summary Ribbon */}
        {compliance && (
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-500 font-medium">Total Assigned</div>
              <div className="text-lg font-bold text-slate-800">{compliance.totalAssigned || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Acknowledged</div>
              <div className="text-lg font-bold text-emerald-600">{compliance.totalAcknowledged || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Pending</div>
              <div className="text-lg font-bold text-amber-600">{compliance.totalPending || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Completion Rate</div>
              <div className="text-lg font-bold text-blue-600">
                {compliance.compliancePercentage != null ? `${compliance.compliancePercentage}%` : '0%'}
              </div>
            </div>
          </div>
        )}

        {/* Content Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-medium">Loading versions...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No versions uploaded yet.</p>
            </div>
          )}

          {!loading && !error && versions.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Effective Date</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">Download</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {versions.map((ver) => {
                    const isMajor = ver.versionType === 'MAJOR';
                    return (
                      <tr key={ver.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          v{ver.versionNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              isMajor
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                            title={
                              isMajor
                                ? 'Major version requires fresh employee acknowledgement'
                                : 'Minor version carries forward prior valid acknowledgement'
                            }
                          >
                            {ver.versionType || 'MAJOR'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {ver.effectiveDate || 'Immediate'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {ver.createdAt ? new Date(ver.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 text-xs max-w-[150px] truncate" title={ver.workdriveFileName}>
                          {ver.workdriveFileName || 'document.pdf'}
                        </td>
                        <td className="py-3 px-4">
                          {ver.sha256Hash ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded max-w-[100px] truncate"
                                title={ver.sha256Hash}
                              >
                                {ver.sha256Hash.slice(0, 10)}...
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              ver.allowDownload
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {ver.allowDownload ? 'Allowed' : 'In-App Only'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onViewVersion(ver)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-xs inline-flex items-center gap-1 transition-colors"
                            title="Preview PDF"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Versioning Rules Note */}
          <div className="mt-4 p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg text-xs text-blue-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold mb-0.5">Audit & Versioning Rules:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                <li>
                  <strong>MAJOR Updates:</strong> Invalidate prior acknowledgements; all assigned employees must explicitly review and re-acknowledge.
                </li>
                <li>
                  <strong>MINOR Updates:</strong> Typographical/clarification updates dynamically derive compliance from prior acknowledgements in the same major series.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
