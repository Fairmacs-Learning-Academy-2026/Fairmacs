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
} from 'lucide-react';

export default function PolicyOverviewTab({
  overview,
  loading,
  onRefresh,
  onViewDocument,
  onGoToApprovals,
  onGoToLibrary,
  onGoToReports,
}) {
  if (loading && !overview) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
  const pendingApprovals = stats.pendingApprovals || 0;

  return (
    <div className="space-y-6">
      {/* Pending Approvals Alert Banner */}
      {pendingApprovals > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-lg shadow-sm">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {pendingApprovals} Department Policy Submission{pendingApprovals > 1 ? 's' : ''} Awaiting Review
              </h4>
              <p className="text-xs text-amber-800">
                Department managers have submitted policies requiring HR compliance review and authorization.
              </p>
            </div>
          </div>
          <button
            onClick={onGoToApprovals}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0 flex items-center gap-1"
          >
            <span>Review Queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Published */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Published</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalPublished || 0}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats.totalPolicies || 0} policies &bull; {stats.totalAgreements || 0} agreements
            </div>
          </div>
        </div>

        {/* Total Assigned */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Total Assigned</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalAssigned || 0}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Active assignments</div>
          </div>
        </div>

        {/* Acknowledged */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Acknowledged</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{stats.totalAcknowledged || 0}</div>
            <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">Compliant employees</div>
          </div>
        </div>

        {/* Pending */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Pending</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{stats.totalPending || 0}</div>
            <div className="text-[11px] text-amber-700 mt-0.5 font-medium">Awaiting action</div>
          </div>
        </div>

        {/* Overdue */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Overdue</span>
            <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{stats.totalOverdue || 0}</div>
            <div className="text-[11px] text-red-700 mt-0.5 font-medium">Passed due date</div>
          </div>
        </div>

        {/* Completion % */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Completion</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{completionPct}%</div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(completionPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Department Breakdown & Visual Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Summary Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Department Compliance Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Real-time acknowledgement compliance tracking across corporate departments
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onRefresh}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Refresh Overview Data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onGoToReports}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View Full Report</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {(!stats.departmentBreakdowns || stats.departmentBreakdowns.length === 0) ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active department assignments recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Assigned</th>
                    <th className="py-2.5 px-3 text-center">Acknowledged</th>
                    <th className="py-2.5 px-3 text-center">Pending</th>
                    <th className="py-2.5 px-3 text-center">Overdue</th>
                    <th className="py-2.5 px-3 text-right">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.departmentBreakdowns.map((dept, idx) => {
                    const pct = dept.compliancePercentage || 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{dept.departmentName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700">{dept.totalAssigned}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-emerald-600">
                          {dept.totalAcknowledged}
                        </td>
                        <td className="py-2.5 px-3 text-center text-amber-600">{dept.totalPending}</td>
                        <td className="py-2.5 px-3 text-center text-red-600 font-semibold">{dept.totalOverdue}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-slate-800 w-9 text-right">{pct}%</span>
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Documents Requiring Attention */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span>Requires Attention</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {stats.documentsRequiringAttention?.length || 0} flagged
              </span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {(!stats.documentsRequiringAttention || stats.documentsRequiringAttention.length === 0) ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-1.5" />
                  <p>All published policies are compliant without overdue assignments.</p>
                </div>
              ) : (
                stats.documentsRequiringAttention.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-red-50/50 border border-red-200/70 rounded-lg hover:border-red-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={doc.title}>
                        {doc.title}
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {doc.documentCode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Assigned: {doc.totalAssignments || 0}</span>
                      <span className="font-semibold text-blue-600">
                        {doc.compliancePercentage || 0}% acked
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Draft Policies: <strong>{stats.totalDrafts || 0}</strong></span>
            <button
              onClick={onGoToLibrary}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <span>Library</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Third Row: Recently Published & Pending Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Published */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>Recently Published Documents</span>
            <span className="text-[11px] text-slate-400 font-normal">Latest active releases</span>
          </h3>

          <div className="divide-y divide-slate-100">
            {(!stats.recentlyPublished || stats.recentlyPublished.length === 0) ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No policies published yet.
              </div>
            ) : (
              stats.recentlyPublished.map((doc) => (
                <div key={doc.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-3">
                    <div className="font-semibold text-slate-800 truncate" title={doc.title}>
                      {doc.title}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {doc.categoryName || 'General'} &bull; {doc.owningDepartmentName || 'Corporate'}
                    </div>
                  </div>
                  <button
                    onClick={() => onViewDocument(doc)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
                    title="View Document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Submitted Department Policies */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>Pending Department Submissions</span>
            <button
              onClick={onGoToApprovals}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
            >
              View All ({pendingApprovals})
            </button>
          </h3>

          <div className="divide-y divide-slate-100">
            {(!stats.recentSubmissions || stats.recentSubmissions.length === 0) ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No manager submissions waiting in queue.
              </div>
            ) : (
              stats.recentSubmissions.map((sub) => (
                <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-3">
                    <div className="font-semibold text-slate-800 truncate" title={sub.title}>
                      {sub.title}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Dept: {sub.owningDepartmentName} &bull; Submitted by {sub.createdByName || 'Manager'}
                    </div>
                  </div>
                  <button
                    onClick={onGoToApprovals}
                    className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold rounded text-[11px] transition-colors shrink-0"
                  >
                    Review
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
