import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  AlertTriangle,
  Bell,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  Calendar,
  Loader2,
  ShieldAlert,
  Send,
  User,
  RefreshCw,
} from 'lucide-react';
import { policyService } from '../../../services/policyService';

export default function PolicyManagerPendingTab({
  departments = [],
  policies = [],
  onShowNotice,
}) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remindingId, setRemindingId] = useState(null);
  const [remindedIds, setRemindedIds] = useState(new Set());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [filterMandatoryOnly, setFilterMandatoryOnly] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('ALL');

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Query pending and overdue assignments
      const params = {};
      if (selectedDeptId !== 'ALL') params.departmentId = selectedDeptId;
      // Fetch both PENDING and OVERDUE
      const data = await policyService.getManagerReports(params);
      const pendingList = (Array.isArray(data) ? data : []).filter(
        (a) =>
          a.acknowledgementStatus === 'PENDING' ||
          a.acknowledgementStatus === 'OVERDUE'
      );
      setAssignments(pendingList);
    } catch (err) {
      console.error('Failed to load pending policy assignments:', err);
      setError(err.message || 'Unable to retrieve pending compliance records.');
    } finally {
      setLoading(false);
    }
  }, [selectedDeptId]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Client-side filtering
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (filterOverdueOnly && a.acknowledgementStatus !== 'OVERDUE') return false;
      if (filterMandatoryOnly && !a.mandatory) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchEmp =
          (a.employeeName || '').toLowerCase().includes(term) ||
          (a.employeeId || '').toLowerCase().includes(term) ||
          (a.department || '').toLowerCase().includes(term);
        const matchDoc =
          (a.title || '').toLowerCase().includes(term) ||
          (a.documentCode || '').toLowerCase().includes(term);
        if (!matchEmp && !matchDoc) return false;
      }

      return true;
    });
  }, [assignments, filterOverdueOnly, filterMandatoryOnly, searchTerm]);

  // Summary counts
  const summary = useMemo(() => {
    let overdueCount = 0;
    let mandatoryCount = 0;
    assignments.forEach((a) => {
      if (a.acknowledgementStatus === 'OVERDUE') overdueCount++;
      if (a.mandatory) mandatoryCount++;
    });
    return {
      total: assignments.length,
      overdue: overdueCount,
      mandatory: mandatoryCount,
    };
  }, [assignments]);

  // Send Reminder Handler
  const handleSendReminder = async (asg) => {
    try {
      setRemindingId(asg.id);
      await policyService.sendManagerReminder(asg.id);

      setRemindedIds((prev) => new Set(prev).add(asg.id));

      if (onShowNotice) {
        onShowNotice(
          'success',
          `In-app reminder sent to ${asg.employeeName} for "${asg.title}".`
        );
      }
    } catch (err) {
      console.error('Failed to send reminder notification:', err);
      if (onShowNotice) {
        onShowNotice('error', err.message || 'Failed to deliver reminder notification.');
      } else {
        alert(err.message || 'Failed to send reminder.');
      }
    } finally {
      setRemindingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter pending list by employee name, ID, department, or document title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPending}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="Refresh Pending List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Pills and Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setFilterOverdueOnly(false);
                setFilterMandatoryOnly(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                !filterOverdueOnly && !filterMandatoryOnly
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Pending ({summary.total})
            </button>

            <button
              onClick={() => setFilterOverdueOnly(!filterOverdueOnly)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5 ${
                filterOverdueOnly
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Past Due Only ({summary.overdue})
            </button>

            <button
              onClick={() => setFilterMandatoryOnly(!filterMandatoryOnly)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5 ${
                filterMandatoryOnly
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Mandatory Only ({summary.mandatory})
            </button>
          </div>

          {/* Department Filter */}
          {departments.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium">Department:</span>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL">All Authorized</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Pending Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-xs font-medium text-slate-500">Checking pending staff acknowledgements...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
            <p className="text-xs font-semibold">{error}</p>
            <button
              onClick={fetchPending}
              className="mt-3 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100"
            >
              Try Again
            </button>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <h4 className="text-sm font-bold text-slate-800 mb-1">All Clear! No Pending Follow-ups</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {assignments.length === 0
                ? 'All staff members in your department have fully acknowledged their assigned policies.'
                : 'No pending acknowledgements match your active filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Policy Document</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Requirement</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAssignments.map((asg) => {
                  const isOverdue = asg.acknowledgementStatus === 'OVERDUE';
                  const isReminded = remindedIds.has(asg.id);
                  const isReminding = remindingId === asg.id;

                  return (
                    <tr
                      key={asg.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isOverdue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Employee */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{asg.employeeName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {asg.employeeId || '—'}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {asg.department || '—'}
                      </td>

                      {/* Policy Document */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 line-clamp-1">
                          {asg.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {asg.categoryName || 'General Policy'}
                        </div>
                      </td>

                      {/* Version */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                        v{asg.versionNumber || '1.0'}
                      </td>

                      {/* Requirement */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {asg.mandatory ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Mandatory
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Optional</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {asg.dueDate ? (
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              isOverdue ? 'text-rose-700 font-bold' : 'text-slate-700'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {asg.dueDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Open-ended</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Past Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action - Send In-App Reminder */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleSendReminder(asg)}
                          disabled={isReminded || isReminding}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm inline-flex items-center gap-1.5 transition-all ${
                            isReminded
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                              : isOverdue
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                          title="Send In-App Notification Reminder"
                        >
                          {isReminding ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isReminded ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Bell className="w-3.5 h-3.5" />
                          )}
                          <span>{isReminded ? 'Reminder Sent' : 'Send Reminder'}</span>
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
    </div>
  );
}
