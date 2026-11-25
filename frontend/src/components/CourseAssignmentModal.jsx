import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Users, CalendarDays, CheckCircle2, AlertCircle, LoaderCircle, Trash2, ShieldCheck, BookOpen } from 'lucide-react';

const API_BASE = SHARED_API_BASE_URL;

function readToken() {
  return localStorage.getItem('fairmacs_token') || localStorage.getItem('token') || '';
}

async function apiRequest(path, options = {}) {
  const token = readToken();
  const response = await authFetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || (typeof data === 'string' ? data : '') || `Request failed (${response.status})`);
  }
  return data;
}

function formatPosition(pos) {
  if (!pos) return '';
  const s = String(pos).trim().toUpperCase();
  if (s.startsWith('L') && s.length === 2 && ['0', '1', '2', '3', '4'].includes(s[1])) {
    return 'P' + s[1];
  }
  return s;
}

export default function CourseAssignmentModal({ course, onClose, onAssigned }) {
  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [assigned, setAssigned] = useState([]);
  const [removingId, setRemovingId] = useState(null);
  const [pendingRemoval, setPendingRemoval] = useState(null);

  const courseCode = course?.courseCode || course?.courseId || course?.id || course?.code || '';
  const courseDbId = course?.dbId ?? course?.courseDbId ?? (typeof course?.id === 'number' ? course.id : null);
  const courseTitle = course?.title || course?.courseTitle || 'Selected course';
  const coursePosition = formatPosition(course?.position || course?.level) || 'Not specified';

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const result = await apiRequest('/hr/employees');
        const rows = Array.isArray(result)
          ? result
          : result?.employees ?? result?.content ?? result?.data ?? result?.results ?? [];
        if (!Array.isArray(rows)) throw new Error('Employee API returned an unexpected response.');

        const normalized = rows.map((employee) => {
          const id = employee.userId ?? employee.user?.id ?? employee.id;
          const email = employee.email ?? employee.officeEmail ?? employee.workEmail ?? employee.user?.email ?? '';
          const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ');
          return {
            id: String(employee.userId ?? employee.user?.id ?? (Number.isFinite(Number(id)) ? Number(id) : '')), 
            name: String(employee.name ?? employee.fullName ?? employee.employeeName ?? fullName ?? email ?? `Employee ${id ?? ''}`),
            email: String(email),
            department: String(employee.departmentName ?? employee.department?.name ?? employee.department ?? ''),
            position: formatPosition(employee.position ?? employee.level ?? employee.employeeLevel ?? ''),
            level: formatPosition(employee.position ?? employee.level ?? employee.employeeLevel ?? ''),
            role: String(employee.role ?? employee.userRole ?? 'EMPLOYEE'),
            status: String(employee.status ?? 'ACTIVE').toUpperCase()
          };
        }).filter((employee) => employee.id && employee.id !== 'undefined'
          && employee.status === 'ACTIVE');

        if (alive) setEmployees(normalized);
      } catch (err) {
        if (alive) setError(err.message || 'Could not load employees.');
      } finally {
        if (alive) setLoading(false);
      }
      if (alive) await loadAssigned();
    })();
    return () => { alive = false; };
  }, [courseDbId]);

  async function loadAssigned() {
    if (courseDbId == null) {
      setError('The course database ID is missing, so existing assignments cannot be loaded.');
      return;
    }
    try {
      const rows = await apiRequest(`/course-assignments/${courseDbId}`);
      setAssigned(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || 'Could not load current assignments.');
    }
  }

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((employee) =>
      [employee.name, employee.email, employee.department, employee.position, employee.level]
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [employees, search]);

  const toggleEmployee = (id) => {
    setSelectedIds((old) => old.includes(id) ? old.filter((value) => value !== id) : [...old, id]);
  };

  const selectFiltered = () => {
    const ids = filteredEmployees.map((employee) => employee.id);
    setSelectedIds((old) => [...new Set([...old, ...ids])]);
  };

  const clearSelection = () => setSelectedIds([]);

  const submit = async () => {
    setError('');
    setNotice('');
    if (!courseCode && course?.id == null) {
      setError('Course ID/code is missing. Open assignment from a course record.');
      return;
    }
    if (!selectedIds.length) {
      setError('Select at least one employee.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        courseCode: courseCode || null,
        employeeIds: selectedIds.map((id) => Number(id)),
        dueDate: dueDate || null
      };
      if (courseDbId != null) payload.courseId = Number(courseDbId);
      else if (typeof course?.id === 'number' || /^\d+$/.test(String(course?.id ?? ''))) {
        payload.courseId = Number(course.id);
      }

      const result = await apiRequest('/course-assignments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setNotice(result?.message || `Assignment request completed for ${selectedIds.length} selected employee(s).`);
      await loadAssigned();
    } catch (err) {
      setError(err.message || 'Could not assign the course.');
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = (employee) => {
    setError('');
    setNotice('');
    setPendingRemoval(employee);
  };

  const confirmRemoveAssignment = async () => {
    if (!pendingRemoval) return;
    const employee = pendingRemoval;
    setError('');
    setNotice('');
    setRemovingId(String(employee.userId));
    try {
      const result = await apiRequest(`/course-assignments/${courseDbId}/employees/${employee.userId}`, { method: 'DELETE' });
      setNotice(result?.message || `Course access removed for ${employee.name || employee.email || 'the employee'}. Learning history has been preserved.`);
      setPendingRemoval(null);
      await loadAssigned();
      onAssigned?.();
    } catch (err) {
      setError(err.message || 'Could not remove this assignment.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs transition-all">
      <section className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/10">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Manage Course Assignment</h2>
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">{courseTitle}</span> &bull; Position: <span className="capitalize">{coursePosition}</span>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            aria-label="Close" 
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          
          {/* Status Alerts */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/70 p-4 text-sm text-rose-800 shadow-xs">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" /> 
              <div className="leading-relaxed">{error}</div>
            </div>
          )}
          {notice && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-800 shadow-xs">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> 
              <div className="leading-relaxed">{notice}</div>
            </div>
          )}

          {/* Controls Grid */}
          <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Search Employees</label>
              <div className="relative mt-1.5">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  placeholder="Filter by name, email, department..." 
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 shadow-2xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10" 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Due Date</label>
              <div className="relative mt-1.5">
                <CalendarDays size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 shadow-2xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10" 
                />
              </div>
            </div>
          </div>

          {/* Inline removal confirmation (replaces browser alert) */}
          {pendingRemoval && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="alertdialog" aria-live="polite">
              <div className="flex items-start gap-3">
                <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-700" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-amber-950">Confirm course removal</h3>
                  <p className="mt-1 text-sm leading-relaxed text-amber-900">
                    Remove this course from <strong>{pendingRemoval.name || pendingRemoval.email || 'this employee'}</strong>? Their course access will be revoked while learning history is preserved.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingRemoval(null)}
                      disabled={removingId !== null}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >Cancel</button>
                    <button
                      type="button"
                      onClick={confirmRemoveAssignment}
                      disabled={removingId !== null}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {removingId !== null ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      {removingId !== null ? 'Removing...' : 'Confirm removal'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Currently Assigned Section */}
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Currently Assigned Employees</h3>
              </div>
              <span className="rounded-full bg-slate-200/75 px-2.5 py-0.5 text-xs font-bold text-slate-700">{assigned.length}</span>
            </div>
            {assigned.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500">No active enrollments found for this course.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                {assigned.map((employee) => {
                  const locked = String(employee.status).toUpperCase() === 'COMPLETED' || Boolean(employee.certificateId);
                  return (
                    <div key={employee.userId} className="flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-slate-50/50">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-900">{employee.name || employee.email}</div>
                        <div className="text-[11px] text-slate-500">{employee.email || ''} &bull; {employee.progressPercent ?? 0}% done &bull; <span className="capitalize">{employee.status || 'Assigned'}</span></div>
                      </div>
                      <button 
                        type="button" 
                        disabled={locked || removingId === String(employee.userId)} 
                        onClick={() => removeAssignment(employee)} 
                        title={locked ? 'Completed history cannot be removed' : 'Remove assignment'} 
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {removingId === String(employee.userId) ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} />} Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Employee Picker Table Section */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">
                Selected <span className="font-bold text-slate-800">{selectedIds.length}</span> of {employees.length} active employees
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={selectFiltered} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900">Select Filtered</button>
                <button type="button" onClick={clearSelection} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900">Clear Selection</button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
              {loading ? (
                <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                  <LoaderCircle size={18} className="animate-spin text-indigo-600" /> Loading active employees...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-500">No active employees match your search criteria.</div>
              ) : (
                <div className="max-h-64 overflow-auto">
                  <table className="w-full min-w-[580px] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="w-12 px-4 py-3"></th>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEmployees.map((employee) => {
                        const isSelected = selectedIds.includes(employee.id);
                        return (
                          <tr key={employee.id} onClick={() => toggleEmployee(employee.id)} className={`cursor-pointer transition ${isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/60' : 'hover:bg-slate-50/60'}`}>
                            <td className="px-4 py-3">
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => toggleEmployee(employee.id)} 
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select ${employee.name}`} 
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{employee.name}</div>
                              <div className="text-xs text-slate-500">{employee.email}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{employee.department || '-'}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{employee.position || employee.level || '-'}</span>
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

        </div>

        {/* Footer */}
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button 
            type="button" 
            onClick={() => { if (notice) onAssigned?.(); else onClose?.(); }} 
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            {notice ? 'Done' : 'Close'}
          </button>
          {!notice && (
            <button 
              type="button" 
              disabled={saving || loading || selectedIds.length === 0} 
              onClick={submit} 
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Users size={16} />}
              {saving ? 'Assigning...' : `Assign to ${selectedIds.length} employee${selectedIds.length === 1 ? '' : 's'}`}
            </button>
          )}
        </footer>

      </section>
    </div>
  );
}