import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  FileText,
  Building2,
  ShieldAlert,
  FileCheck2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function PolicyManagerDocumentsTab({
  policies = [],
  categories = [],
  loading = false,
  onViewDocument,
  onOpenSubmitModal,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMandatory, setSelectedMandatory] = useState('ALL'); // ALL, MANDATORY, OPTIONAL
  const [selectedCompliance, setSelectedCompliance] = useState('ALL'); // ALL, COMPLIANT, PENDING
  const [selectedDueDate, setSelectedDueDate] = useState('ALL'); // ALL, HAS_DUE_DATE, OPEN_ENDED

  const filteredPolicies = useMemo(() => {
    return policies.filter((doc) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesTitle = (doc.title || '').toLowerCase().includes(term);
        const matchesCode = (doc.documentCode || '').toLowerCase().includes(term);
        const matchesDesc = (doc.description || '').toLowerCase().includes(term);
        if (!matchesTitle && !matchesCode && !matchesDesc) return false;
      }

      // Category
      if (selectedCategory !== 'ALL' && String(doc.categoryId) !== String(selectedCategory)) {
        return false;
      }

      // Mandatory / Optional
      if (selectedMandatory !== 'ALL') {
        const isMandatory = Boolean(doc.mandatory);
        if (selectedMandatory === 'MANDATORY' && !isMandatory) return false;
        if (selectedMandatory === 'OPTIONAL' && isMandatory) return false;
      }

      // Compliance
      if (selectedCompliance !== 'ALL') {
        const pct = doc.compliancePercentage || 0;
        if (selectedCompliance === 'COMPLIANT' && pct < 100) return false;
        if (selectedCompliance === 'PENDING' && pct >= 100) return false;
      }

      // Due Date
      if (selectedDueDate !== 'ALL') {
        const hasDue = Boolean(doc.dueDate);
        if (selectedDueDate === 'HAS_DUE_DATE' && !hasDue) return false;
        if (selectedDueDate === 'OPEN_ENDED' && hasDue) return false;
      }

      return true;
    });
  }, [policies, searchTerm, selectedCategory, selectedMandatory, selectedCompliance, selectedDueDate]);

  // Summary counts for filter bar
  const summary = useMemo(() => {
    const total = filteredPolicies.length;
    let totalAssignments = 0;
    let totalAck = 0;
    filteredPolicies.forEach((p) => {
      totalAssignments += p.totalAssignments || 0;
      totalAck += p.totalAcknowledgements || 0;
    });
    const avgPct = totalAssignments > 0 ? (totalAck / totalAssignments) * 100 : 0;
    return { total, totalAssignments, totalAck, avgPct };
  }, [filteredPolicies]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search published department policies by title, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-slate-800"
             enterKeyHint="search" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
                setSelectedMandatory('ALL');
                setSelectedCompliance('ALL');
                setSelectedDueDate('ALL');
              }}
              className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 font-medium"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          {/* Category */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Compliance Requirement */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Requirement</label>
            <select
              value={selectedMandatory}
              onChange={(e) => setSelectedMandatory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Policies</option>
              <option value="MANDATORY">Mandatory Only</option>
              <option value="OPTIONAL">Optional Only</option>
            </select>
          </div>

          {/* Department Compliance Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Department Compliance</label>
            <select
              value={selectedCompliance}
              onChange={(e) => setSelectedCompliance(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Compliance Levels</option>
              <option value="COMPLIANT">100% Compliant</option>
              <option value="PENDING">Pending Compliance (&lt;100%)</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Compliance Deadline</label>
            <select
              value={selectedDueDate}
              onChange={(e) => setSelectedDueDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Deadlines</option>
              <option value="HAS_DUE_DATE">Has Fixed Due Date</option>
              <option value="OPEN_ENDED">Open-ended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Info Bar */}
      <div className="px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>
            Showing <strong className="text-slate-900">{summary.total}</strong> document{summary.total !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Staff assignments: <strong className="text-slate-900">{summary.totalAssignments}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Acknowledged: <strong className="text-emerald-700">{summary.totalAck}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Overall:</span>
          <strong className="text-slate-900 font-semibold">{summary.avgPct.toFixed(1)}%</strong>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse space-y-3">
            <div className="h-6 bg-slate-200/70 rounded max-w-sm mx-auto" />
            <div className="h-4 bg-slate-100 rounded max-w-xs mx-auto" />
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h4 className="text-sm font-bold text-slate-800 mb-1">No Documents Found</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {policies.length === 0
                ? 'There are currently no published policies or SOPs assigned to your department hierarchy.'
                : 'No documents match your active search and filter criteria.'}
            </p>
            {policies.length === 0 && onOpenSubmitModal && (
              <button
                onClick={onOpenSubmitModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
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
                  <th className="py-3 px-4">Requirement</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 min-w-[170px]">Dept Compliance</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPolicies.map((doc) => {
                  const assigned = doc.totalAssignments || 0;
                  const acked = doc.totalAcknowledgements || 0;
                  const pct = doc.compliancePercentage || (assigned > 0 ? (acked / assigned) * 100 : 0);
                  const isMandatory = Boolean(doc.mandatory);

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Document Details */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {doc.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          {doc.documentCode && (
                            <span className="font-mono text-slate-600 bg-slate-100 px-1 py-0.2 rounded text-[10px]">
                              {doc.documentCode}
                            </span>
                          )}
                          <span>{doc.categoryName || 'General Policy'}</span>
                          {doc.owningDepartmentName && (
                            <>
                              <span>&bull;</span>
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <Building2 className="w-3 h-3" />
                                {doc.owningDepartmentName}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Version */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                          v{doc.activeVersionNumber || doc.versionNumber || '1.0'}
                        </span>
                      </td>

                      {/* Requirement */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isMandatory ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            Mandatory
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Optional
                          </span>
                        )}
                      </td>

                      {/* Effective Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {doc.effectiveDate || 'Immediate'}
                      </td>

                      {/* Deadline */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {doc.dueDate ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {doc.dueDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Open-ended</span>
                        )}
                      </td>

                      {/* Dept Compliance */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-600 font-medium">
                            {acked} / {assigned}
                          </span>
                          <span
                            className={`font-bold ${
                              pct >= 100
                                ? 'text-emerald-700'
                                : pct >= 50
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 100
                                ? 'bg-emerald-500'
                                : pct >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </td>

                      {/* Action - Read-only View */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onViewDocument(doc)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors inline-flex items-center gap-1.5"
                          title="View PDF Document"
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
    </div>
  );
}
