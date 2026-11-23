import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  Send,
  Plus,
  History,
  Archive,
  FileText,
  Building2,
  AlertCircle,
  MoreVertical,
  BarChart3,
} from 'lucide-react';

export default function PolicyLibraryTab({
  policies = [],
  categories = [],
  departments = [],
  loading = false,
  onViewDocument,
  onPublishDocument,
  onUploadNewVersion,
  onViewVersionHistory,
  onViewComplianceReport,
  onArchiveDocument,
  onCreateNew,
}) {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL, PUBLISHED, DRAFT, ARCHIVED
  const [selectedType, setSelectedType] = useState('ALL'); // ALL, POLICY, AGREEMENT
  const [selectedMandatory, setSelectedMandatory] = useState('ALL'); // ALL, MANDATORY, OPTIONAL

  // Action Menu open state
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  // Filtered List
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

      // Department
      if (selectedDepartment !== 'ALL') {
        if (selectedDepartment === 'CORPORATE') {
          if (doc.owningDepartmentId != null) return false;
        } else if (String(doc.owningDepartmentId) !== String(selectedDepartment)) {
          return false;
        }
      }

      // Status
      if (selectedStatus !== 'ALL') {
        const status = (doc.documentStatus || 'DRAFT').toUpperCase();
        if (status !== selectedStatus) return false;
      }

      // Type (Policy vs Agreement)
      if (selectedType !== 'ALL') {
        const catName = (doc.categoryName || '').toLowerCase();
        const isAgreement = catName.includes('agreement') || catName.includes('nda');
        if (selectedType === 'AGREEMENT' && !isAgreement) return false;
        if (selectedType === 'POLICY' && isAgreement) return false;
      }

      // Mandatory / Optional
      if (selectedMandatory !== 'ALL') {
        const isMandatory = doc.currentVersion?.mandatory !== false;
        if (selectedMandatory === 'MANDATORY' && !isMandatory) return false;
        if (selectedMandatory === 'OPTIONAL' && isMandatory) return false;
      }

      return true;
    });
  }, [
    policies,
    searchTerm,
    selectedCategory,
    selectedDepartment,
    selectedStatus,
    selectedType,
    selectedMandatory,
  ]);

  const toggleActionMenu = (id, e) => {
    e.stopPropagation();
    setActionMenuOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by document title, code, or description..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
          </div>

          {/* Quick Create Button */}
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Document</span>
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.categoryName || c.name}
              </option>
            ))}
          </select>

          {/* Department */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Departments</option>
            <option value="CORPORATE">Corporate / All-Company</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Document Types</option>
            <option value="POLICY">Policies</option>
            <option value="AGREEMENT">Agreements</option>
          </select>

          {/* Mandatory */}
          <select
            value={selectedMandatory}
            onChange={(e) => setSelectedMandatory(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">Mandatory & Optional</option>
            <option value="MANDATORY">Mandatory Only</option>
            <option value="OPTIONAL">Optional Only</option>
          </select>
        </div>
      </div>

      {/* Document Library Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" onClick={() => setActionMenuOpenId(null)}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Document Title & Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Owning Dept</th>
                <th className="py-3 px-4 text-center">Version</th>
                <th className="py-3 px-4">Effective / Published</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Compliance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && policies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading policies and agreements library...
                  </td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">No documents match the active filters.</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting your search query or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((doc) => {
                  const status = (doc.documentStatus || 'DRAFT').toUpperCase();
                  const isPublished = status === 'PUBLISHED';
                  const isDraft = status === 'DRAFT';
                  const isArchived = status === 'ARCHIVED';

                  const latestVer = doc.currentVersion || doc.latestVersion;
                  const verNumber = latestVer?.versionNumber ? `v${latestVer.versionNumber}` : 'Draft';
                  const compPct = doc.compliancePercentage || 0;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Document Title & Code */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 max-w-[260px] truncate" title={doc.title}>
                          {doc.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {doc.documentCode}
                          </span>
                          {doc.description && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[180px]" title={doc.description}>
                              &bull; {doc.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {doc.categoryName || 'General'}
                        </span>
                      </td>

                      {/* Owning Department */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]" title={doc.owningDepartmentName || 'Corporate'}>
                            {doc.owningDepartmentName || 'Corporate'}
                          </span>
                        </div>
                      </td>

                      {/* Version */}
                      <td className="py-3 px-4 text-center">
                        <span
                          onClick={() => onViewVersionHistory(doc)}
                          className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer underline decoration-dotted"
                          title="View Version History"
                        >
                          {verNumber}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        <div>
                          Eff: <span className="text-slate-700">{latestVer?.effectiveDate || 'Immediate'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {doc.publishedAt ? `Pub: ${new Date(doc.publishedAt).toLocaleDateString()}` : 'Not published'}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            isPublished
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDraft
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Compliance Summary Mini-Bar */}
                      <td className="py-3 px-4 text-center">
                        {isPublished ? (
                          <div
                            onClick={() => onViewComplianceReport(doc)}
                            className="inline-flex flex-col items-center cursor-pointer group"
                            title="Click to view detailed compliance report"
                          >
                            <span className="font-bold text-slate-800 group-hover:text-blue-600 text-xs">
                              {compPct}%
                            </span>
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  compPct >= 80 ? 'bg-emerald-500' : compPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(compPct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {doc.totalAcknowledgements || 0} / {doc.totalAssignments || 0}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="relative inline-block text-left">
                          <div className="flex items-center justify-end gap-1">
                            {latestVer && (
                              <button
                                onClick={() => onViewDocument(doc)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="View PDF Document"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {isDraft && latestVer && (
                              <button
                                onClick={() => onPublishDocument(doc)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-sm transition-colors"
                                title="Publish Draft to Audience"
                              >
                                <Send className="w-3 h-3" />
                                <span>Publish</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => toggleActionMenu(doc.id, e)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="More Options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Action Menu Dropdown */}
                          {actionMenuOpenId === doc.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100 text-left text-xs"
                            >
                              {latestVer && (
                                <button
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    onViewDocument(doc);
                                  }}
                                  className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>View Document</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  onUploadNewVersion(doc);
                                }}
                                className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Upload New Version</span>
                              </button>

                              {latestVer && (
                                <button
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    onPublishDocument(doc);
                                  }}
                                  className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{isPublished ? 'Re-assign / Re-publish' : 'Publish & Assign'}</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  onViewVersionHistory(doc);
                                }}
                                className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <History className="w-3.5 h-3.5 text-slate-600" />
                                <span>Version History</span>
                              </button>

                              {isPublished && (
                                <button
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    onViewComplianceReport(doc);
                                  }}
                                  className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Compliance Report</span>
                                </button>
                              )}

                              {!isArchived && (
                                <div className="border-t border-slate-100 my-1 pt-1">
                                  <button
                                    onClick={() => {
                                      setActionMenuOpenId(null);
                                      if (window.confirm(`Are you sure you want to archive "${doc.title}"?`)) {
                                        onArchiveDocument(doc.id);
                                      }
                                    }}
                                    className="w-full px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                    <span>Archive Document</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
