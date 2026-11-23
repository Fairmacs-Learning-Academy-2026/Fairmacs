import React, { useState, useMemo } from 'react';
import {
  Inbox,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  PlusCircle,
  Building2,
  FileText,
  User,
  Calendar,
  MessageSquare,
  AlertCircle,
  X,
} from 'lucide-react';

export default function PolicyManagerSubmissionsTab({
  submissions = [],
  loading = false,
  onViewDocument,
  onOpenSubmitModal,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  const [detailModalItem, setDetailModalItem] = useState(null);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesTitle = (sub.title || '').toLowerCase().includes(term);
        const matchesCode = (sub.documentCode || '').toLowerCase().includes(term);
        const matchesCat = (sub.categoryName || '').toLowerCase().includes(term);
        if (!matchesTitle && !matchesCode && !matchesCat) return false;
      }

      // Status
      if (selectedStatus !== 'ALL') {
        const status = (sub.approvalStatus || 'PENDING').toUpperCase();
        if (status !== selectedStatus) return false;
      }

      return true;
    });
  }, [submissions, searchTerm, selectedStatus]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    submissions.forEach((s) => {
      const st = (s.approvalStatus || '').toUpperCase();
      if (st === 'PENDING') pending++;
      else if (st === 'APPROVED') approved++;
      else if (st === 'REJECTED') rejected++;
    });
    return { pending, approved, rejected, total: submissions.length };
  }, [submissions]);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search submissions by title, category, or document code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSubmitModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit New Policy / SOP</span>
            </button>
          </div>
        </div>

        {/* Status Pill Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              selectedStatus === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({counts.total})
          </button>
          <button
            onClick={() => setSelectedStatus('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5 ${
              selectedStatus === 'PENDING'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Under Review ({counts.pending})
          </button>
          <button
            onClick={() => setSelectedStatus('APPROVED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5 ${
              selectedStatus === 'APPROVED'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved ({counts.approved})
          </button>
          <button
            onClick={() => setSelectedStatus('REJECTED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5 ${
              selectedStatus === 'REJECTED'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Needs Revision ({counts.rejected})
          </button>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse space-y-3">
            <div className="h-6 bg-slate-200/70 rounded max-w-sm mx-auto" />
            <div className="h-4 bg-slate-100 rounded max-w-xs mx-auto" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h4 className="text-sm font-bold text-slate-800 mb-1">No Submissions Found</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {submissions.length === 0
                ? 'You have not submitted any departmental policies or SOPs for HR review yet.'
                : 'No submissions match your active filter criteria.'}
            </p>
            {onOpenSubmitModal && (
              <button
                onClick={onOpenSubmitModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Submit Department SOP
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Document Details</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Target Department</th>
                  <th className="py-3 px-4">HR Approval Status</th>
                  <th className="py-3 px-4">HR Reviewer</th>
                  <th className="py-3 px-4">Review Feedback</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSubmissions.map((sub) => {
                  const status = (sub.approvalStatus || 'PENDING').toUpperCase();
                  const versionNum =
                    sub.latestVersion?.versionNumber || sub.versionNumber || '1.0';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Document Details */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {sub.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {sub.categoryName || 'General Policy'}
                        </div>
                      </td>

                      {/* Version */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                          v{versionNum}
                        </span>
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleDateString()
                          : sub.createdAt
                          ? new Date(sub.createdAt).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Target Department */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {sub.owningDepartmentName || 'Department-wide'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved
                          </span>
                        ) : status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            Needs Revision
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Under Review
                          </span>
                        )}
                      </td>

                      {/* HR Reviewer */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {sub.approvedByUserName ? (
                          <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {sub.approvedByUserName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending Assignment</span>
                        )}
                      </td>

                      {/* Feedback */}
                      <td className="py-3 px-4 max-w-[200px]">
                        {sub.approvalComment ? (
                          <div
                            onClick={() => setDetailModalItem(sub)}
                            className="cursor-pointer text-slate-700 hover:text-blue-600 truncate flex items-center gap-1"
                            title={sub.approvalComment}
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{sub.approvalComment}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No feedback yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => setDetailModalItem(sub)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium rounded-lg transition-colors border border-slate-200"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onViewDocument(sub)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors inline-flex items-center gap-1"
                          title="View PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
      </div>

      {/* Submission Detail Modal */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Submission Review Details</h3>
                  <p className="text-xs text-slate-400">{detailModalItem.title}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs">
              {/* Status Header Block */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  detailModalItem.approvalStatus === 'APPROVED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : detailModalItem.approvalStatus === 'REJECTED'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">
                    Status: {detailModalItem.approvalStatus || 'PENDING'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {detailModalItem.approvalStatus === 'APPROVED'
                      ? 'Approved by HR and authorized for publication.'
                      : detailModalItem.approvalStatus === 'REJECTED'
                      ? 'Requires revision based on HR compliance review feedback below.'
                      : 'Under review by HR compliance administrators.'}
                  </div>
                </div>
                {detailModalItem.approvalStatus === 'APPROVED' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                ) : detailModalItem.approvalStatus === 'REJECTED' ? (
                  <XCircle className="w-7 h-7 text-rose-600" />
                ) : (
                  <Clock className="w-7 h-7 text-amber-600" />
                )}
              </div>

              {/* Reviewer and Decision Timeline */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">HR Reviewer:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {detailModalItem.approvedByUserName || 'Pending Assignment'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Review Date:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {detailModalItem.approvedAt
                      ? new Date(detailModalItem.approvedAt).toLocaleString()
                      : 'Awaiting Decision'}
                  </div>
                </div>
              </div>

              {/* Reviewer Feedback / Comments */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  HR Compliance Review Comments
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 min-h-[70px] whitespace-pre-wrap leading-relaxed">
                  {detailModalItem.approvalComment || 'No review comments provided yet.'}
                </div>
              </div>

              {/* Submission Metadata */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                <div>
                  Target Department: <strong className="text-slate-700">{detailModalItem.owningDepartmentName || 'Department-wide'}</strong>
                </div>
                <div>
                  Category: <strong className="text-slate-700">{detailModalItem.categoryName || 'General'}</strong>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  const item = detailModalItem;
                  setDetailModalItem(null);
                  onViewDocument(item);
                }}
                className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View Document PDF
              </button>
              <button
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
