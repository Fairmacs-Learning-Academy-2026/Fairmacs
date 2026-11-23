import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Eye,
  History,
  RefreshCw,
  Calendar,
  Lock,
  Info,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { policyService } from '../../../services/policyService';
import PolicyPdfViewerModal from '../PolicyPdfViewerModal';

export default function EmployeePoliciesSection({ highlighted = false }) {
  const [assignments, setAssignments] = useState([]);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sub-view: 'assigned' | 'history'
  const [activeSubView, setActiveSubView] = useState('assigned');

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, PENDING, ACKNOWLEDGED, MANDATORY, OPTIONAL, OVERDUE
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Authenticated PDF Preview & Acknowledgement Modal
  const [pdfModal, setPdfModal] = useState({
    open: false,
    versionId: null,
    assignmentId: null,
    title: '',
    documentCode: '',
    versionNumber: '',
    categoryName: '',
    mandatory: true,
    effectiveDate: '',
    dueDate: '',
    allowDownload: true,
    isAlreadyAcknowledged: false,
    acknowledgedAt: null,
  });

  const loadEmployeePolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [asgData, histData, catData] = await Promise.all([
        policyService.getMyAssignments('ALL'),
        policyService.getMyAcknowledgements().catch(() => []),
        policyService.getEmployeeCategories().catch(() => []),
      ]);
      setAssignments(Array.isArray(asgData) ? asgData : []);
      setHistory(Array.isArray(histData) ? histData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      console.error('Failed to load employee policies:', err);
      setError(err.message || 'Unable to load your assigned Policies & Agreements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployeePolicies();
  }, [loadEmployeePolicies]);

  // Real counts computed strictly from backend assignment data
  const counts = useMemo(() => {
    let pending = 0;
    let acknowledged = 0;
    let mandatory = 0;
    let optional = 0;
    let overdue = 0;

    assignments.forEach((a) => {
      const status = String(a.complianceStatus || a.acknowledgementStatus || 'PENDING').toUpperCase();
      const hasDueDate = Boolean(a.dueDate);
      const isOverdue = status === 'OVERDUE' && hasDueDate;

      if (status === 'ACKNOWLEDGED' || a.acknowledged) {
        acknowledged++;
      } else if (isOverdue) {
        overdue++;
        pending++;
      } else {
        pending++;
      }

      if (a.mandatory) {
        mandatory++;
      } else {
        optional++;
      }
    });

    return {
      all: assignments.length,
      pending,
      acknowledged,
      mandatory,
      optional,
      overdue,
    };
  }, [assignments]);

  // Available categories from API or distinct assignment categories
  const categoryOptions = useMemo(() => {
    if (categories.length > 0) return categories;
    const seen = new Map();
    assignments.forEach((a) => {
      if (a.categoryName && !seen.has(a.categoryName)) {
        seen.set(a.categoryName, {
          id: a.categoryId || a.categoryName,
          name: a.categoryName,
        });
      }
    });
    return Array.from(seen.values());
  }, [categories, assignments]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const status = String(a.complianceStatus || a.acknowledgementStatus || 'PENDING').toUpperCase();
      const isAcked = status === 'ACKNOWLEDGED' || Boolean(a.acknowledged);
      const isOverdue = !isAcked && Boolean(a.dueDate) && status === 'OVERDUE';

      // Status / Requirement filter
      if (activeFilter === 'PENDING' && isAcked) return false;
      if (activeFilter === 'ACKNOWLEDGED' && !isAcked) return false;
      if (activeFilter === 'MANDATORY' && !a.mandatory) return false;
      if (activeFilter === 'OPTIONAL' && a.mandatory) return false;
      if (activeFilter === 'OVERDUE' && !isOverdue) return false;

      // Category filter
      if (selectedCategory !== 'ALL') {
        const matchesCatId = a.categoryId != null && String(a.categoryId) === String(selectedCategory);
        const matchesCatName = (a.categoryName || '').toLowerCase() === String(selectedCategory).toLowerCase();
        if (!matchesCatId && !matchesCatName) return false;
      }

      // Search by document title / code
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const titleMatch = (a.title || a.policyTitle || '').toLowerCase().includes(term);
        const codeMatch = (a.documentCode || '').toLowerCase().includes(term);
        if (!titleMatch && !codeMatch) return false;
      }

      return true;
    });
  }, [assignments, activeFilter, selectedCategory, searchTerm]);

  const handleOpenViewer = (item) => {
    const versionId = item.policyVersionId;
    if (!versionId) return;

    const isHistoryItem = Boolean(item.acceptedAt && !item.dueDate && !item.assignmentStatus);
    const isAcked =
      isHistoryItem ||
      item.complianceStatus === 'ACKNOWLEDGED' ||
      item.acknowledgementStatus === 'ACKNOWLEDGED' ||
      Boolean(item.acknowledged) ||
      Boolean(item.acknowledgedAt);

    setPdfModal({
      open: true,
      versionId,
      assignmentId: isHistoryItem ? null : item.id,
      title: item.title || item.policyTitle || item.documentTitle || 'Policy Document',
      documentCode: item.documentCode || '',
      versionNumber: item.versionNumber || '1.0',
      categoryName: item.categoryName || 'General',
      mandatory: Boolean(item.mandatory),
      effectiveDate: item.effectiveDate || '',
      dueDate: item.dueDate || '',
      allowDownload: item.allowDownload !== false,
      isAlreadyAcknowledged: isAcked,
      acknowledgedAt: item.acceptedAt || item.acknowledgedAt || null,
    });
  };

  const handleAcknowledgementSuccess = (ackResult) => {
    // 1. Immediately update assignments state to ACKNOWLEDGED
    if (pdfModal.assignmentId) {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id === pdfModal.assignmentId) {
            return {
              ...a,
              complianceStatus: 'ACKNOWLEDGED',
              acknowledgementStatus: 'ACKNOWLEDGED',
              acknowledged: true,
              acknowledgedAt: ackResult?.acceptedAt || new Date().toISOString(),
              isExplicit: true,
            };
          }
          return a;
        })
      );
    }

    // 2. Prepend newly created acknowledgement record to history
    if (ackResult) {
      setHistory((prev) => [ackResult, ...prev]);
    }

    // 3. Background re-sync to ensure full consistency
    loadEmployeePolicies();
  };

  const filterButtons = [
    { id: 'ALL', label: 'All Documents', count: counts.all },
    { id: 'PENDING', label: 'Pending', count: counts.pending },
    { id: 'ACKNOWLEDGED', label: 'Acknowledged', count: counts.acknowledged },
    { id: 'MANDATORY', label: 'Mandatory', count: counts.mandatory },
    { id: 'OPTIONAL', label: 'Optional', count: counts.optional },
    { id: 'OVERDUE', label: 'Overdue', count: counts.overdue },
  ];

  return (
    <section
      id="policies"
      tabIndex={-1}
      className={`bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm space-y-5 transition-all outline-none ${
        highlighted
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Policies &amp; Agreements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review company policies, workplace SOPs, and agreements assigned to you.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-view Toggle: Assigned vs History */}
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setActiveSubView('assigned')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeSubView === 'assigned'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Assigned ({counts.all})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('history')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeSubView === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Acknowledgement History ({history.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadEmployeePolicies}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            title="Refresh Policies & Agreements"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stage 6 Information Banner */}
      <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-lg flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Policy Review &amp; Acknowledgement:</span> Check the confirmation checkbox and click <strong>Accept &amp; Continue</strong>.
        </div>
      </div>

      {/* Loading / Error State */}
      {loading ? (
        <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Loading your assigned Policies &amp; Agreements...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={loadEmployeePolicies}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition"
          >
            Retry
          </button>
        </div>
      ) : activeSubView === 'assigned' ? (
        /* ========================================================= */
        /* ASSIGNED POLICIES & AGREEMENTS LIST                       */
        /* ========================================================= */
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search policies and agreements by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="sm:w-56">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by Category"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL">All Categories</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Pills with Real Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {filterButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setActiveFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition inline-flex items-center gap-1.5 ${
                  activeFilter === btn.id
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <span>{btn.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeFilter === btn.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {btn.count}
                </span>
              </button>
            ))}
          </div>

          {/* Empty State vs Document List */}
          {filteredAssignments.length === 0 ? (
            <div className="py-10 px-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {assignments.length === 0
                  ? 'No Policies or Agreements Assigned'
                  : 'No Matching Policies Found'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {assignments.length === 0
                  ? 'You currently have no active company policies, SOPs, or agreements assigned to your profile.'
                  : 'Try adjusting your search keyword, category, or status filter.'}
              </p>
              {(activeFilter !== 'ALL' || selectedCategory !== 'ALL' || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('ALL');
                    setSelectedCategory('ALL');
                    setSearchTerm('');
                  }}
                  className="mt-3 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((asg) => {
                const status = String(asg.complianceStatus || asg.acknowledgementStatus || 'PENDING').toUpperCase();
                const isAcked = status === 'ACKNOWLEDGED' || Boolean(asg.acknowledged);
                const isOverdue = !isAcked && Boolean(asg.dueDate) && status === 'OVERDUE';

                return (
                  <div
                    key={asg.id}
                    className={`p-4 rounded-xl border transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isOverdue
                        ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/60'
                        : isAcked
                        ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800'
                    }`}
                  >
                    {/* Left: Title, Metadata & Dates */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {asg.title || asg.policyTitle}
                        </h3>
                        {asg.documentCode && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700">
                            {asg.documentCode}
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                          v{asg.versionNumber || '1.0'}
                        </span>
                        {asg.mandatory ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            Mandatory
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Optional
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>
                          Category: <strong className="text-slate-700 dark:text-slate-300">{asg.categoryName || 'General'}</strong>
                        </span>
                        <span>
                          Effective: <strong className="text-slate-700 dark:text-slate-300">{asg.effectiveDate || 'Immediate'}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due:{' '}
                          {asg.dueDate ? (
                            <strong className={isOverdue ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}>
                              {asg.dueDate}
                            </strong>
                          ) : (
                            <span className="italic">Open-ended</span>
                          )}
                        </span>
                      </div>

                      {/* Acknowledgement Metadata when Acknowledged */}
                      {isAcked && (
                        <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {asg.isExplicit === false && asg.derivedFromVersionNumber
                              ? `Compliant via v${asg.derivedFromVersionNumber} (Minor update)`
                              : `Acknowledged v${asg.versionNumber || '1.0'}`}
                          </span>
                          {asg.acknowledgedAt && (
                            <span className="text-slate-500 dark:text-slate-400">
                              on {new Date(asg.acknowledgedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Status Badge & Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isAcked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Acknowledged
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenViewer(asg)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800 transition inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isAcked ? 'Revisit Document' : 'View Document'}</span>
                      </button>

                      {!isAcked && (
                        <button
                          type="button"
                          onClick={() => handleOpenViewer(asg)}
                          title="Open secure viewer to review and acknowledge document"
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Review &amp; Acknowledge</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* IMMUTABLE ACKNOWLEDGEMENT HISTORY                         */
        /* ========================================================= */
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="py-10 px-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
              <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Acknowledgement History Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Your completed policy and agreement acknowledgements will appear here with version and timestamp records.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Document Title</th>
                    <th className="px-4 py-2.5">Acknowledged Version</th>
                    <th className="px-4 py-2.5">Acknowledged Date &amp; Time</th>
                    <th className="px-4 py-2.5 text-right">Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((ack) => (
                    <tr key={ack.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        <div>{ack.documentTitle}</div>
                        {ack.documentCode && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {ack.documentCode}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 font-mono text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                          v{ack.versionNumber || '1.0'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {ack.acceptedAt ? new Date(ack.acceptedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        {ack.documentSha256Hash ? `${ack.documentSha256Hash.slice(0, 14)}...` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenViewer(ack)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Authenticated In-App PDF Viewer & Acknowledgement Modal */}
      {pdfModal.open && (
        <PolicyPdfViewerModal
          versionId={pdfModal.versionId}
          assignmentId={pdfModal.assignmentId}
          title={pdfModal.title}
          documentCode={pdfModal.documentCode}
          versionNumber={pdfModal.versionNumber}
          categoryName={pdfModal.categoryName}
          mandatory={pdfModal.mandatory}
          effectiveDate={pdfModal.effectiveDate}
          dueDate={pdfModal.dueDate}
          allowDownload={pdfModal.allowDownload}
          isAlreadyAcknowledged={pdfModal.isAlreadyAcknowledged}
          acknowledgedAt={pdfModal.acknowledgedAt}
          onClose={() =>
            setPdfModal({
              open: false,
              versionId: null,
              assignmentId: null,
              title: '',
              documentCode: '',
              versionNumber: '',
              categoryName: '',
              mandatory: true,
              effectiveDate: '',
              dueDate: '',
              allowDownload: true,
              isAlreadyAcknowledged: false,
              acknowledgedAt: null,
            })
          }
          onAcknowledged={handleAcknowledgementSuccess}
        />
      )}
    </section>
  );
}
