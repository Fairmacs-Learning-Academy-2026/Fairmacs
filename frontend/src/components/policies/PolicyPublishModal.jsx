import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  Users,
  Building2,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Info,
  Search,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { policyService } from '../../services/policyService';
import { hrAdminService } from '../../services/hrAdminService';

export default function PolicyPublishModal({
  policy,
  departments = [],
  onClose,
  onPublished,
}) {
  // Step 1: Audience & Settings, Step 2: Review Screen
  const [step, setStep] = useState(1);

  // Audience State
  const [audienceType, setAudienceType] = useState('ALL_EMPLOYEES'); // 'ALL_EMPLOYEES' | 'DEPARTMENT' | 'INDIVIDUAL'
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  // Assignment Settings
  const [mandatory, setMandatory] = useState(true);
  const [dueDate, setDueDate] = useState(''); // empty = open-ended

  // Employee Selection State
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [empSearch, setEmpSearch] = useState('');

  // Submission State
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  // Load employees for individual selection
  useEffect(() => {
    let active = true;
    setLoadingEmployees(true);
    hrAdminService
      .getEmployees()
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        setEmployees(list);
        setLoadingEmployees(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load employees for audience selector:', err);
        setLoadingEmployees(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Filter employees: only ACTIVE and ON_LEAVE are eligible for selection
  const eligibleEmployees = useMemo(() => {
    return employees.filter(
      (e) =>
        String(e.status).toUpperCase() === 'ACTIVE' ||
        String(e.status).toUpperCase() === 'ON_LEAVE'
    );
  }, [employees]);

  const searchedEmployees = useMemo(() => {
    if (!empSearch.trim()) return eligibleEmployees;
    const term = empSearch.toLowerCase().trim();
    return eligibleEmployees.filter(
      (e) =>
        (e.name || e.fullName || '').toLowerCase().includes(term) ||
        (e.employeeId || '').toLowerCase().includes(term) ||
        (e.department || '').toLowerCase().includes(term)
    );
  }, [eligibleEmployees, empSearch]);

  const handleToggleDept = (deptId) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleToggleEmployee = (userId) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllSearchedEmployees = () => {
    const idsToAdd = searchedEmployees.map((e) => e.id || e.userId);
    const combined = Array.from(new Set([...selectedEmployeeIds, ...idsToAdd]));
    setSelectedEmployeeIds(combined);
  };

  const handleDeselectAllEmployees = () => {
    setSelectedEmployeeIds([]);
  };

  // Validation before going to Review Step
  const handleProceedToReview = () => {
    setError(null);
    if (audienceType === 'DEPARTMENT' && selectedDeptIds.length === 0) {
      setError('Please select at least one department.');
      return;
    }
    if (audienceType === 'INDIVIDUAL' && selectedEmployeeIds.length === 0) {
      setError('Please select at least one individual employee.');
      return;
    }
    setStep(2);
  };

  // Final Publish Submission
  const handleFinalPublish = async () => {
    setPublishing(true);
    setError(null);

    try {
      const payload = {
        audienceType: audienceType,
        departmentIds: audienceType === 'DEPARTMENT' ? selectedDeptIds : null,
        employeeUserIds: audienceType === 'INDIVIDUAL' ? selectedEmployeeIds : null,
        mandatory: mandatory,
        dueDate: dueDate ? dueDate : null, // null = open-ended
      };

      const result = await policyService.publishPolicy(policy.id, payload);
      onPublished(result);
      onClose();
    } catch (err) {
      console.error('Publish failed:', err);
      setError(err.message || 'Failed to publish policy.');
      setPublishing(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !publishing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, publishing]);

  const latestVersionNumber =
    policy?.currentVersion?.versionNumber ||
    policy?.latestVersion?.versionNumber ||
    '1.0';

  const modalContent = (
    <div
      id="policy-publish-modal-portal"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !publishing) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[92dvh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                {step === 1 ? 'Publish & Assign Policy' : 'Confirm Policy Publication'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {policy?.title} &bull; v{latestVersionNumber}
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
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-5 overscroll-contain">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Audience Selection & Settings */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Audience Type Selection Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Target Audience Distribution
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* All Employees */}
                  <div
                    onClick={() => setAudienceType('ALL_EMPLOYEES')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      audienceType === 'ALL_EMPLOYEES'
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          audienceType === 'ALL_EMPLOYEES'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">All Employees</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Company-wide broadcast to all active and on-leave staff.
                    </p>
                  </div>

                  {/* Selected Departments */}
                  <div
                    onClick={() => setAudienceType('DEPARTMENT')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      audienceType === 'DEPARTMENT'
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          audienceType === 'DEPARTMENT'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Departments</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Target specific departments with child sub-department inheritance.
                    </p>
                  </div>

                  {/* Individual Employees */}
                  <div
                    onClick={() => setAudienceType('INDIVIDUAL')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      audienceType === 'INDIVIDUAL'
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          audienceType === 'INDIVIDUAL'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Individuals</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Select specific individual employees directly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Conditional Sub-selector: DEPARTMENTS */}
              {audienceType === 'DEPARTMENT' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Select Target Departments ({selectedDeptIds.length} selected)
                    </span>
                    <span className="text-[11px] text-blue-600 font-medium">
                      Sub-departments automatically inherit assignments
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                    {departments.map((dept) => {
                      const isSelected = selectedDeptIds.includes(dept.id);
                      return (
                        <label
                          key={dept.id}
                          className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleDept(dept.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="truncate">{dept.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Conditional Sub-selector: INDIVIDUALS */}
              {audienceType === 'INDIVIDUAL' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        placeholder="Search eligible employees by name, ID or department..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                       enterKeyHint="search" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAllSearchedEmployees}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        Select All Filtered
                      </button>
                      <span className="text-slate-300">&bull;</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllEmployees}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {loadingEmployees ? (
                    <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading active employee directory...</span>
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                      {searchedEmployees.length === 0 ? (
                        <div className="py-4 text-center text-slate-400 text-xs">
                          No eligible employees found matching search.
                        </div>
                      ) : (
                        searchedEmployees.map((emp) => {
                          const empIdVal = emp.id || emp.userId;
                          const isSelected = selectedEmployeeIds.includes(empIdVal);
                          return (
                            <label
                              key={empIdVal}
                              className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors ${
                                isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleEmployee(empIdVal)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div>
                                  <div className="font-semibold text-slate-800">
                                    {emp.name || emp.fullName}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {emp.employeeId} &bull; {emp.department || 'General'}
                                  </div>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                {emp.status || 'ACTIVE'}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}

                  <div className="text-xs text-slate-500 font-medium">
                    Selected: <strong className="text-slate-900">{selectedEmployeeIds.length}</strong> employees
                  </div>
                </div>
              )}

              {/* Assignment Settings */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Compliance & Deadline Settings
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Acknowledgement Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Leave blank for open-ended policy (no overdue deadline).
                    </p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          Mandatory Compliance
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Flag as compulsory compliance requirement
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={mandatory}
                        onChange={(e) => setMandatory(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Precedence Notice */}
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <strong>Precedence Hierarchy:</strong> If an employee matches multiple criteria,{' '}
                    <code className="text-blue-900 font-semibold">INDIVIDUAL &gt; DEPARTMENT &gt; ALL_EMPLOYEES</code>{' '}
                    is enforced. Inactive and terminated employees are permanently excluded.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Review Screen */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                <h4 className="text-base font-bold text-slate-900">Ready to Publish</h4>
                <p className="text-xs text-slate-600">
                  Please review the document and target audience details before publishing.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-200 text-xs">
                  <span className="text-slate-500">Document Title:</span>
                  <span className="font-bold text-slate-800">{policy?.title}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200 text-xs">
                  <span className="text-slate-500">Document Code:</span>
                  <span className="font-mono text-slate-700">{policy?.documentCode || 'Auto-generated'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200 text-xs">
                  <span className="text-slate-500">Version to Publish:</span>
                  <span className="font-semibold text-blue-700">v{latestVersionNumber}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200 text-xs">
                  <span className="text-slate-500">Target Distribution:</span>
                  <span className="font-bold text-slate-800">
                    {audienceType === 'ALL_EMPLOYEES' && 'All Eligible Employees (Active & On-Leave)'}
                    {audienceType === 'DEPARTMENT' && `${selectedDeptIds.length} Selected Department(s)`}
                    {audienceType === 'INDIVIDUAL' && `${selectedEmployeeIds.length} Selected Employee(s)`}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200 text-xs">
                  <span className="text-slate-500">Acknowledgement Due Date:</span>
                  <span className="font-semibold text-slate-800">
                    {dueDate ? dueDate : 'Open-Ended (No Deadline)'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 text-xs">
                  <span className="text-slate-500">Compliance Requirement:</span>
                  <span className={`font-semibold ${mandatory ? 'text-red-600' : 'text-slate-700'}`}>
                    {mandatory ? 'Mandatory' : 'Optional'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <strong>Important:</strong> Publishing will immediately make this document version active
                  and dispatch in-app notifications to all targeted employees directing them to their Profile Centre.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToReview}
                className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={publishing}
                className="h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Back to Settings
              </button>
              <button
                type="button"
                onClick={handleFinalPublish}
                disabled={publishing}
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Confirm & Publish Now</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
