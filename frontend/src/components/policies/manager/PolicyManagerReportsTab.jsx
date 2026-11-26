import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  FileSpreadsheet,
  Download,
  Search,
  RefreshCw,
  Loader2,
  History,
  Building2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  X,
} from 'lucide-react';
import { policyService } from '../../../services/policyService';
import PolicyEmployeeHistoryModal from '../PolicyEmployeeHistoryModal';

export default function PolicyManagerReportsTab({
  departments = [],
}) {
  // View Perspective Toggle: 'all' | 'employee' | 'document'
  const [viewMode, setViewMode] = useState('all');

  // Main Scoped Data States
  const [departmentOverview, setDepartmentOverview] = useState(null);
  const [departmentReports, setDepartmentReports] = useState([]);
  const [documentReports, setDocumentReports] = useState([]);
  const [employeeReports, setEmployeeReports] = useState([]);

  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Selected Employee for History Modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Filters for Employee Matrix
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('ALL');
  const [empStatusFilter, setEmpStatusFilter] = useState('ALL');
  const [empPage, setEmpPage] = useState(1);
  const pageSize = 10;

  // Filters for Document Table
  const [docTypeFilter, setDocTypeFilter] = useState('ALL'); // ALL, MANDATORY, OPTIONAL
  const [exportingDocId, setExportingDocId] = useState(null);
  const [exportNotification, setExportNotification] = useState(null);

  const handleExportManagerPolicyReport = async (doc) => {
    if (exportingDocId !== null) return;
    setExportingDocId(doc.documentId);
    setExportNotification(null);
    try {
      const { filename } = await policyService.exportManagerPolicyComplianceExcel(doc.documentId);
      setExportNotification({
        type: 'success',
        message: `Successfully downloaded ${filename || doc.documentCode + ' department compliance report'}.`,
      });
      setTimeout(() => setExportNotification(null), 5000);
    } catch (err) {
      console.error('Failed to export department policy report:', err);
      setExportNotification({
        type: 'error',
        message: err.message || 'Failed to export department policy compliance report.',
      });
    } finally {
      setExportingDocId(null);
    }
  };

  const loadManagerData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Fetch strictly from MANAGER-SCOPED endpoints
      const [overviewData, deptData, docData, empData] = await Promise.all([
        policyService.getManagerOverview(),
        policyService.getManagerDepartmentReports(),
        policyService.getManagerDocumentReports(),
        policyService.getManagerEmployeeReports(),
      ]);

      setDepartmentOverview(overviewData || null);
      setDepartmentReports(Array.isArray(deptData) ? deptData : []);
      setDocumentReports(Array.isArray(docData) ? docData : []);
      setEmployeeReports(Array.isArray(empData) ? empData : []);
    } catch (err) {
      console.error('Failed to load manager compliance reports:', err);
      setError(err.message || 'Failed to load department compliance reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadManagerData();
  }, [loadManagerData]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documentReports.filter((doc) => {
      if (docTypeFilter === 'MANDATORY' && !doc.mandatory) return false;
      if (docTypeFilter === 'OPTIONAL' && doc.mandatory) return false;
      return true;
    });
  }, [documentReports, docTypeFilter]);

  // Filtered & Paginated Employees
  const filteredEmployees = useMemo(() => {
    return employeeReports.filter((emp) => {
      if (empDeptFilter !== 'ALL' && String(emp.departmentId) !== String(empDeptFilter)) {
        return false;
      }
      if (empStatusFilter !== 'ALL') {
        const status = (emp.overallComplianceStatus || 'PENDING').toUpperCase();
        if (empStatusFilter === 'COMPLIANT' && status !== 'COMPLIANT') return false;
        if (empStatusFilter === 'OVERDUE' && status !== 'OVERDUE') return false;
        if (empStatusFilter === 'PENDING' && status !== 'PENDING' && status !== 'PARTIALLY_COMPLIANT') return false;
      }
      if (empSearch.trim()) {
        const query = empSearch.toLowerCase().trim();
        const nameMatch = (emp.fullName || '').toLowerCase().includes(query);
        const codeMatch = (emp.employeeCode || '').toLowerCase().includes(query);
        const deptMatch = (emp.department || '').toLowerCase().includes(query);
        if (!nameMatch && !codeMatch && !deptMatch) return false;
      }
      return true;
    });
  }, [employeeReports, empDeptFilter, empStatusFilter, empSearch]);

  const totalEmpPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (empPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, empPage]);

  // Graceful client-side CSV export fallback
  const exportCsvFallback = () => {
    let csv = 'Employee Name,Employee ID,Department,Assigned,Acknowledged,Pending,Overdue,Status\n';
    employeeReports.forEach((emp) => {
      csv += `"${emp.fullName || ''}","${emp.employeeCode || emp.employeeId || ''}","${emp.department || ''}",${emp.totalAssigned || 0},${emp.totalAcknowledged || 0},${emp.totalPending || 0},${emp.totalOverdue || 0},"${emp.overallComplianceStatus || 'PENDING'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `department_compliance_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Excel Export Handler (Calls Manager Export Endpoint with fallback)
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      if (typeof policyService.exportManagerComplianceExcel === 'function') {
        await policyService.exportManagerComplianceExcel({ type: 'ALL' });
      } else if (typeof policyService.exportManagerReportsExcel === 'function') {
        await policyService.exportManagerReportsExcel();
      }
    } catch (err) {
      console.error('Failed to export department report, executing CSV fallback:', err);
      exportCsvFallback();
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Loading Department Compliance Reports...
        </p>
        <p className="text-xs text-slate-400">Scoped strictly to your managed department hierarchy</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span>Department Acknowledgement Reports</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
              Managed Scope Only
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time compliance tracking for team members within your authorized department hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Perspective Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setViewMode('employee')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'employee'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Employees
            </button>
            <button
              type="button"
              onClick={() => setViewMode('document')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'document'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Documents
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadManagerData(true)}
            disabled={refreshing}
            className="h-9 px-3.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Unable to load reports:</span> {error}
          </div>
          <button
            type="button"
            onClick={() => loadManagerData(true)}
            className="px-3 py-1 bg-red-100 dark:bg-red-900/60 hover:bg-red-200 text-red-800 dark:text-red-200 text-xs font-semibold rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 1: DEPARTMENT OVERVIEW KPI CARDS                 */}
      {/* ========================================================= */}
      <section aria-labelledby="mgr-kpi-heading">
        <div className="flex items-center justify-between mb-3">
          <h3 id="mgr-kpi-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>Department Hierarchy Compliance Overview</span>
          </h3>
          <span className="text-[11px] text-slate-400">Authorized Department Hierarchy Only</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Team Members */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Team Members</span>
              <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {departmentOverview?.totalEmployees ?? employeeReports.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Managed Employees</div>
          </div>

          {/* Card 2: Compliance Rate */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Compliance Rate</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {departmentOverview?.completionPercentage !== undefined
                ? `${departmentOverview.completionPercentage}%`
                : '0%'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {departmentOverview?.totalAcknowledged ?? 0} of {departmentOverview?.totalAssigned ?? 0} acknowledged
            </div>
          </div>

          {/* Card 3: Pending Acknowledgements */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Pending Review</span>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {departmentOverview?.totalPending ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Awaiting acknowledgement</div>
          </div>

          {/* Card 4: Overdue Acknowledgements */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Overdue Actions</span>
              <div className="p-2 bg-red-50 dark:bg-red-950/60 text-red-600 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {departmentOverview?.totalOverdue ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Past assigned deadline</div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 2: DEPARTMENT SCOPE BREAKDOWN                    */}
      {/* ========================================================= */}
      {(viewMode === 'all') && (
        <section aria-labelledby="mgr-dept-heading" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 id="mgr-dept-heading" className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Managed Departments Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Completion rates across your direct department and sub-departments
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {departmentReports.length} Authorized Units
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-6">Department Name</th>
                  <th className="py-3 px-4 text-center">Team Members</th>
                  <th className="py-3 px-4 text-center">Assigned</th>
                  <th className="py-3 px-4 text-center">Acknowledged</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-6 text-right">Compliance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {departmentReports.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No department compliance data found for your hierarchy.
                    </td>
                  </tr>
                ) : (
                  departmentReports.map((dept) => {
                    const rate = dept.compliancePercentage ?? 0;
                    return (
                      <tr
                        key={dept.departmentId || dept.departmentName}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <Building className="w-3.5 h-3.5 text-purple-500" />
                            <span>{dept.departmentName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-300">
                          {dept.totalEligibleEmployees ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-300">
                          {dept.totalAssigned ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-emerald-600 dark:text-emerald-400">
                          {dept.totalAcknowledged ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center text-amber-600 dark:text-amber-400 font-medium">
                          {dept.totalPending ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-semibold ${
                              dept.totalOverdue > 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {dept.totalOverdue ?? 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  rate >= 80
                                    ? 'bg-emerald-500'
                                    : rate >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 min-w-[42px]">
                              {rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: APPLICABLE DOCUMENT PERFORMANCE               */}
      {/* ========================================================= */}
      {(viewMode === 'all' || viewMode === 'document') && (
        <section aria-labelledby="mgr-doc-heading" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 id="mgr-doc-heading" className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Applicable Policies & SOPs Performance</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Completion tracking for documents assigned to your department members
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
                className="h-8 px-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Policy Types</option>
                <option value="MANDATORY">Mandatory Only</option>
                <option value="OPTIONAL">Optional Only</option>
              </select>
            </div>
          </div>

          {exportNotification && (
            <div
              className={`mx-6 mb-4 p-3 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
                exportNotification.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {exportNotification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-medium">{exportNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setExportNotification(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-6">Document Code & Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Version</th>
                  <th className="py-3 px-4 text-center">Type</th>
                  <th className="py-3 px-4 text-center">Team Assigned</th>
                  <th className="py-3 px-4 text-center">Acknowledged</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-6 text-right">Compliance Rate</th>
                  <th className="py-3 px-6 text-center">Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-slate-400">
                      No documents assigned to your department.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const rate = doc.compliancePercentage ?? 0;
                    return (
                      <tr
                        key={doc.documentId}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] font-bold text-purple-600 dark:text-purple-400">
                              {doc.documentCode}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {doc.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {doc.categoryName || 'General'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-medium">
                          {doc.currentVersionNumber || '1.0'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              doc.mandatory
                                ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {doc.mandatory ? 'MANDATORY' : 'OPTIONAL'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-700 dark:text-slate-300 font-medium">
                          {doc.totalAssigned ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {doc.totalAcknowledged ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center text-amber-600 dark:text-amber-400">
                          {doc.totalPending ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-semibold ${
                              doc.totalOverdue > 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {doc.totalOverdue ?? 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  rate >= 80
                                    ? 'bg-emerald-500'
                                    : rate >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {rate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <button
                            type="button"
                            onClick={() => handleExportManagerPolicyReport(doc)}
                            disabled={exportingDocId !== null}
                            title={`Export ${doc.documentCode} department compliance report to Excel`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                              exportingDocId === doc.documentId
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-purple-400'
                            }`}
                          >
                            {exportingDocId === doc.documentId ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                                <span>Exporting...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                <span>Export Report</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* SECTION 4: TEAM EMPLOYEE COMPLIANCE MATRIX                */}
      {/* ========================================================= */}
      {(viewMode === 'all' || viewMode === 'employee') && (
        <section aria-labelledby="mgr-emp-heading" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 id="mgr-emp-heading" className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Team Compliance Matrix & Audit Drill-Down</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Staff status across your departments with individual acknowledgement history access
              </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff or ID..."
                  value={empSearch}
                  onChange={(e) => {
                    setEmpSearch(e.target.value);
                    setEmpPage(1);
                  }}
                  className="w-full h-8 pl-8 pr-3 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                 enterKeyHint="search" />
              </div>

              <select
                value={empStatusFilter}
                onChange={(e) => {
                  setEmpStatusFilter(e.target.value);
                  setEmpPage(1);
                }}
                className="h-8 px-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLIANT">Fully Compliant</option>
                <option value="PENDING">Pending Action</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-6">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Assigned</th>
                  <th className="py-3 px-4 text-center">Acknowledged</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">
                      No team members match the search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((emp) => {
                    const status = (emp.overallComplianceStatus || 'PENDING').toUpperCase();
                    return (
                      <tr
                        key={emp.employeeId}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {emp.fullName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {emp.employeeCode || `ID: ${emp.employeeId}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {emp.department || 'Department Member'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                          {emp.totalAssigned ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {emp.totalAcknowledged ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center text-amber-600 dark:text-amber-400">
                          {emp.totalPending ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-semibold ${
                              emp.totalOverdue > 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {emp.totalOverdue ?? 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              status === 'COMPLIANT'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : status === 'OVERDUE'
                                ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {status === 'COMPLIANT'
                              ? 'COMPLIANT'
                              : status === 'OVERDUE'
                              ? 'OVERDUE'
                              : 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedEmployee(emp)}
                            className="h-8 px-3 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950 hover:text-purple-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>View History</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalEmpPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {filteredEmployees.length === 0 ? 0 : (empPage - 1) * pageSize + 1} to{' '}
                {Math.min(empPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length} team members
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                  disabled={empPage === 1}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-medium">
                  Page {empPage} of {totalEmpPages}
                </span>
                <button
                  type="button"
                  onClick={() => setEmpPage((p) => Math.min(totalEmpPages, p + 1))}
                  disabled={empPage === totalEmpPages}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Employee Acknowledgement History Modal (Strictly Scoped for Manager) */}
      {selectedEmployee && (
        <PolicyEmployeeHistoryModal
          employeeId={selectedEmployee.employeeId}
          employeeName={selectedEmployee.fullName}
          isManager={true}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
