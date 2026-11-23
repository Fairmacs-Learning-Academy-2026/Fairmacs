import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  History,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Hash,
  ArrowRight,
  Info,
  Loader2,
  Building,
  User as UserIcon,
} from 'lucide-react';
import { policyService } from '../../services/policyService';

export default function PolicyEmployeeHistoryModal({
  employeeId,
  employeeName,
  isManager = false,
  onClose,
}) {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, ACKNOWLEDGED, DERIVED, PENDING

  useEffect(() => {
    if (!employeeId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchHistory = async () => {
      try {
        const data = isManager
          ? await policyService.getManagerEmployeeHistory(employeeId)
          : await policyService.getEmployeeHistory(employeeId);

        if (isMounted) {
          setHistoryData(data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load employee acknowledgement history:', err);
          setError(err.message || 'Failed to retrieve acknowledgement history');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [employeeId, isManager]);

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

  if (!employeeId) return null;

  const items = historyData?.historyItems || historyData?.items || [];
  const ackItems = items.filter((i) => (i.complianceStatus === 'ACKNOWLEDGED' || i.isAcknowledged) && !i.isDerived);
  const derivedItems = items.filter((i) => i.isDerived);
  const pendingItems = items.filter((i) => (i.complianceStatus === 'PENDING' || i.complianceStatus === 'OVERDUE' || (!i.isAcknowledged && !i.isDerived)));

  const filteredItems = items.filter((item) => {
    const isAck = (item.complianceStatus === 'ACKNOWLEDGED' || item.isAcknowledged) && !item.isDerived;
    if (activeTab === 'ACKNOWLEDGED') return isAck;
    if (activeTab === 'DERIVED') return item.isDerived;
    if (activeTab === 'PENDING') return (item.complianceStatus === 'PENDING' || item.complianceStatus === 'OVERDUE' || (!item.isAcknowledged && !item.isDerived));
    return true;
  });

  const empDisplayName = historyData?.fullName || historyData?.employeeName || employeeName || 'Employee';
  const empCodeDisplay = historyData?.employeeCode || historyData?.employeeIdNumber || (historyData?.employeeId ? `ID: ${historyData.employeeId}` : '');
  const empDeptDisplay = historyData?.department || historyData?.departmentName || 'All Company';

  const modalContent = (
    <div
      id="policy-employee-history-modal-portal"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <span>Acknowledgement History</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                  Audit Record
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {historyData
                  ? `${empDisplayName} (${empCodeDisplay}) • ${empDeptDisplay}`
                  : employeeName || 'Employee Compliance Record'}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6 overscroll-contain">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm font-medium">Loading employee acknowledgement history...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load employee history</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && historyData && (
            <>
              {/* Employee Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Employee</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {empDisplayName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Department</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {empDeptDisplay}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Compliant</div>
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {historyData.totalAcknowledged ?? historyData.compliantDocumentsCount ?? (ackItems.length + derivedItems.length)} / {historyData.totalAssigned ?? historyData.totalAssignedDocuments ?? items.length}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Compliance Rate</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {historyData.compliancePercentage !== undefined ? `${historyData.compliancePercentage}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>All Documents</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{items.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ACKNOWLEDGED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'ACKNOWLEDGED'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Explicitly Acknowledged</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{ackItems.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('DERIVED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'DERIVED'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Derived Compliance</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{derivedItems.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('PENDING')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'PENDING'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending / Overdue</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{pendingItems.length}</span>
                </button>
              </div>

              {/* Items List */}
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-medium">No records found for the selected filter.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item, idx) => {
                    const isAck = item.complianceStatus === 'ACKNOWLEDGED' && !item.isDerived;
                    const isDerived = Boolean(item.isDerived);
                    const isOverdue = item.complianceStatus === 'OVERDUE' || (item.isOverdue && item.complianceStatus !== 'ACKNOWLEDGED');

                    return (
                      <div
                        key={item.assignmentId || item.documentId || idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isAck
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                            : isDerived
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60'
                            : isOverdue
                            ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/60'
                            : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                              {item.documentCode || item.code || 'POL-DOC'}
                            </span>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {item.documentTitle || item.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                item.mandatory
                                  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {item.mandatory ? 'Mandatory' : 'Optional'}
                            </span>

                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                isAck
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                                  : isDerived
                                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                                  : isOverdue
                                  ? 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200'
                                  : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                              }`}
                            >
                              {isAck
                                ? 'Explicitly Acknowledged'
                                : isDerived
                                ? 'Derived Compliance'
                                : isOverdue
                                ? 'Overdue Acknowledgement'
                                : 'Pending Acknowledgement'}
                            </span>
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Version: <strong>{item.versionNumber || '1.0'}</strong> ({item.versionType || 'MAJOR'})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Assigned: {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No Deadline'}
                            </span>
                          </div>
                        </div>

                        {/* Explicit Acknowledgement Details */}
                        {isAck && (
                          <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 text-xs space-y-1.5 bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-lg">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                                Acknowledged: {item.acknowledgedAt ? new Date(item.acknowledgedAt).toLocaleString() : 'Yes'}
                              </span>
                              {item.ipAddress && (
                                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                  IP: {item.ipAddress}
                                </span>
                              )}
                            </div>
                            {(item.documentSha256Hash || item.checksumSha256) && (
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                                <Hash className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>SHA-256: {item.documentSha256Hash || item.checksumSha256}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Derived Compliance Details */}
                        {isDerived && (
                          <div className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/40 text-xs space-y-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-lg">
                            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
                              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span>
                                Minor Version Derived Compliance (Carried forward from version {item.derivedFromVersionNumber || '1.0'})
                              </span>
                            </div>
                            <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                              Acknowledgement carried forward per organizational governance rules for minor revisions without substantive policy changes.
                            </p>
                            {item.acknowledgedAt && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                Predecessor Acknowledged: {new Date(item.acknowledgedAt).toLocaleString()}
                              </div>
                            )}
                            {(item.documentSha256Hash || item.checksumSha256) && (
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 break-all">
                                <Hash className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>Predecessor SHA-256: {item.documentSha256Hash || item.checksumSha256}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Fairmacs KMS Compliance & Acknowledgement Tracking Module
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
