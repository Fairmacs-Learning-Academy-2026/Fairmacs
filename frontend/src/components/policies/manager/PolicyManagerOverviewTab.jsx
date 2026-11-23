import React from 'react';
import {
  FileText,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
  Inbox,
  RefreshCw,
  Eye,
  PlusCircle,
  FileCheck2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

export default function PolicyManagerOverviewTab({
  overview,
  loading,
  onRefresh,
  onViewDocument,
  onOpenSubmitModal,
  onGoToDocuments,
  onGoToSubmissions,
  onGoToReports,
  onGoToPending,
}) {
  if (loading && !overview) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200/60 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-slate-200/60 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-slate-200/60 rounded-xl lg:col-span-2" />
          <div className="h-72 bg-slate-200/60 rounded-xl" />
        </div>
      </div>
    );
  }

  const stats = overview || {};
  const completionPct = stats.completionPercentage || 0;
  const totalOverdue = stats.totalOverdue || 0;
  const pendingSubmissionsCount = stats.pendingSubmissionsCount || 0;
  const recentlyPublished = stats.recentlyPublished || [];
  const pendingSubmissions = stats.pendingSubmissions || [];

  return (
    <div className="space-y-6">
      {/* Department Scope Header Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-md border border-blue-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                Department Management Scope
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-500/30 text-blue-200 border border-blue-400/20">
                Manager View
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {stats.departmentName || 'Your Department Hierarchy'}
            </h2>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Compliance monitoring, department SOP submissions, and employee acknowledgement tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenSubmitModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-2 transition-all hover:shadow-lg active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Policy / SOP</span>
          </button>
        </div>
      </div>

      {/* Attention / Overdue Alert Banner */}
      {totalOverdue > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-300 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500 text-white rounded-lg shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-950">
                {totalOverdue} Mandatory Acknowledgement{totalOverdue > 1 ? 's' : ''} Past Due
              </h4>
              <p className="text-xs text-rose-800">
                Employees in your department hierarchy have overdue policy compliance deadlines requiring follow-up.
              </p>
            </div>
          </div>
          <button
            onClick={onGoToPending}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0 flex items-center gap-1"
          >
            <span>Review Overdue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Grid (6 metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Applicable */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Applicable</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.totalApplicablePolicies || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Policies & SOPs</div>
          </div>
        </div>

        {/* Mandatory */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Mandatory</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-700 tracking-tight">
              {stats.mandatoryCount || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Required compliance</div>
          </div>
        </div>

        {/* Optional */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Optional</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 tracking-tight">
              {stats.optionalCount || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Informational</div>
          </div>
        </div>

        {/* Total Assigned */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Staff Assigned</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-700 tracking-tight">
              {stats.totalAssigned || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Total assignments</div>
          </div>
        </div>

        {/* Acknowledged */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Acknowledged</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {stats.totalAcknowledged || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Completed</div>
          </div>
        </div>

        {/* Pending & Overdue */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Pending / Overdue</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-700 tracking-tight">
              {stats.totalPending || 0}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5 font-medium">
              {totalOverdue} past due
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Health Progress Card */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Department Overall Compliance Health
            </h3>
            <p className="text-xs text-slate-500">
              Ratio of completed acknowledgements to total assigned policies across your staff.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xl font-extrabold text-slate-900">
              {completionPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 ml-1">completed</span>
          </div>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              completionPct >= 80
                ? 'bg-emerald-500'
                : completionPct >= 50
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, completionPct))}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {stats.totalAcknowledged || 0} Acknowledged
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {stats.totalPending || 0} In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {stats.totalOverdue || 0} Overdue
            </span>
          </div>
          <button
            onClick={onGoToReports}
            className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
          >
            Detailed Reports <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dual Section: Submissions awaiting review & Recently Published */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Submissions Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Department Submissions Awaiting HR Review
              </h3>
            </div>
            <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
              {pendingSubmissionsCount} Pending
            </span>
          </div>

          <div className="p-4 flex-1">
            {pendingSubmissions.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">No pending submissions awaiting HR decision.</p>
                <button
                  onClick={onOpenSubmitModal}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Submit a new SOP / Policy
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSubmissions.slice(0, 5).map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200/70 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {sub.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          v{sub.versionNumber || '1.0'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {sub.categoryName || 'General'} &bull; Submitted{' '}
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'recently'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                      Under Review
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-right">
            <button
              onClick={onGoToSubmissions}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              View all submissions <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recently Published Applicable Documents */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Recently Published Applicable Documents
              </h3>
            </div>
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
              {recentlyPublished.length} Active
            </span>
          </div>

          <div className="p-4 flex-1">
            {recentlyPublished.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">No recently published documents for your department.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentlyPublished.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200/70 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {doc.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          v{doc.activeVersionNumber || doc.versionNumber || '1.0'}
                        </span>
                        {doc.mandatory && (
                          <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 text-[9px] font-semibold rounded border border-amber-200">
                            Mandatory
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {doc.categoryName || 'General'} &bull; Effective:{' '}
                        {doc.effectiveDate || 'Immediate'}
                      </p>
                    </div>
                    <button
                      onClick={() => onViewDocument(doc)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                      title="View Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-right">
            <button
              onClick={onGoToDocuments}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Browse all department documents <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
