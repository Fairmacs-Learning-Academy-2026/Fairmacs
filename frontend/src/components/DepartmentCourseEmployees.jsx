import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Mail,
  MoreHorizontal,
  Search,
  Users,
  XCircle,
} from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');

const getAuthHeaders = () => {
  const token =
    localStorage.getItem('fairmacs_token') ||
    localStorage.getItem('fairmacs_lms_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('jwt');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const normalizeStatus = (status) => {
  const value = String(status || '').toUpperCase();

  if (value === 'COMPLETED') return 'COMPLETED';
  if (value === 'IN_PROGRESS' || value === 'IN PROGRESS') return 'IN_PROGRESS';
  if (value === 'OVERDUE') return 'OVERDUE';

  return 'NOT_STARTED';
};

const getStatusLabel = (status) => {
  switch (normalizeStatus(status)) {
    case 'COMPLETED':
      return 'Completed';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'OVERDUE':
      return 'Overdue';
    default:
      return 'Not Started';
  }
};

const getInitials = (name = '') => {
  const value = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return value || '?';
};

const clamp = (value) =>
  Math.max(0, Math.min(100, Number(value) || 0));

function CompletionRing({ percent }) {
  const size = 74;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = clamp(percent);
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative h-[74px] w-[74px] shrink-0">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0bd39f"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>

      <span className="absolute inset-0 flex items-center justify-center text-[21px] font-extrabold text-white">
        {value}%
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  if (normalized === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f9f1] px-3 py-1.5 text-xs font-bold text-[#059669]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completed
      </span>
    );
  }

  if (normalized === 'OVERDUE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0f2] px-3 py-1.5 text-xs font-bold text-[#dc3545]">
        <XCircle className="h-3.5 w-3.5" />
        Overdue
      </span>
    );
  }

  if (normalized === 'IN_PROGRESS') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5ff] px-3 py-1.5 text-xs font-bold text-[#087ac1]">
        <Clock3 className="h-3.5 w-3.5" />
        In Progress
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f4f7] px-3 py-1.5 text-xs font-bold text-[#64748b]">
      <span className="h-3 w-3 rounded-full border-2 border-current" />
      Not Started
    </span>
  );
}

export default function DepartmentCourseEmployees() {
  const { departmentId, courseId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const loadCourseEmployees = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/departments/${departmentId}/courses/${courseId}/employees`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        let message = `Unable to load course employees (${response.status}).`;

        try {
          const body = await response.json();
          message = body?.message || body?.error || message;
        } catch {
          // Keep HTTP status message.
        }

        throw new Error(message);
      }

      setData(await response.json());
    } catch (err) {
      console.error('Course employees loading failed:', err);
      setError(
        err.message || 'Unable to load employees enrolled in this course.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, courseId]);

  const employees = Array.isArray(data?.employees)
    ? data.employees
    : [];

  const stats = useMemo(() => {
    const result = {
      total: employees.length,
      completed: 0,
      inProgress: 0,
      overdue: 0,
      notStarted: 0,
    };

    employees.forEach((employee) => {
      const status = normalizeStatus(employee.status);

      if (status === 'COMPLETED') result.completed += 1;
      else if (status === 'IN_PROGRESS') result.inProgress += 1;
      else if (status === 'OVERDUE') result.overdue += 1;
      else result.notStarted += 1;
    });

    return result;
  }, [employees]);

  const averageProgress = useMemo(() => {
    if (!employees.length) return 0;

    return Math.round(
      employees.reduce(
        (total, employee) =>
          total + clamp(employee.progressPercent),
        0
      ) / employees.length
    );
  }, [employees]);

  const completionRate = employees.length
    ? Math.round((stats.completed / employees.length) * 100)
    : 0;

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return employees.filter((employee) => {
      const statusMatches =
        activeFilter === 'ALL' ||
        normalizeStatus(employee.status) === activeFilter;

      if (!statusMatches) return false;
      if (!query) return true;

      return [
        employee.name,
        employee.employeeId,
        employee.email,
        employee.designation,
        getStatusLabel(employee.status),
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [employees, searchTerm, activeFilter]);

  const handleBack = () => {
    navigate(`/hr/departments/${departmentId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[650px] items-center justify-center bg-[#f7f9fc]">
        <div className="text-sm font-semibold text-slate-500">
          Loading course employees...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[650px] bg-[#f7f9fc] p-8">
        <button
          type="button"
          onClick={handleBack}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#64758c] hover:text-[#163a62]"
        >
          <ArrowLeft className="h-4 w-4" />
          Departments
        </button>

        <div className="rounded-2xl border border-rose-200 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900">
            Unable to load course
          </h2>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={loadCourseEmployees}
            className="mt-4 rounded-xl bg-[#173b67] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102e51]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f7f9fc] px-5 pb-8 pt-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1450px]">

        {/* Breadcrumb */}
        <div className="mb-3 flex items-center gap-2 text-[14px]">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-[#64758c] transition hover:text-[#163a62]"
          >
            <ArrowLeft className="h-4 w-4" />
            Departments
          </button>

          <span className="text-[#aab6c4]">/</span>

          <button
            type="button"
            onClick={handleBack}
            className="text-[#64758c] transition hover:text-[#163a62]"
          >
            {data?.departmentName || 'Operations'}
          </button>

          <span className="text-[#aab6c4]">/</span>

          <span className="font-bold text-[#17283d]">
            {data?.title || 'Course'}
          </span>
        </div>

        {/* HERO */}
        <section className="relative overflow-hidden rounded-[18px] bg-gradient-to-r from-[#28195e] via-[#27205f] to-[#123f80] px-6 py-5 text-white shadow-[0_5px_20px_rgba(30,45,80,0.12)]">
          <div className="absolute -right-16 -top-32 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative flex min-h-[106px] items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-5">
              <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
                <BookOpen className="h-7 w-7 text-[#54dfff]" />
              </div>

              <div className="min-w-0">
                <p className="text-[12px] font-extrabold tracking-[0.15em] text-[#52dfff]">
                  COURSE MANAGEMENT
                </p>

                <h1 className="mt-1 truncate text-[30px] font-extrabold leading-none tracking-tight">
                  {data?.title || 'Course'}
                </h1>

                <p className="mt-1.5 text-[15px] text-[#d4d8e9]">
                  Who&apos;s enrolled and how far along they are.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-6">
              <div className="hidden h-[58px] w-px bg-white/15 lg:block" />

              <div className="hidden min-w-[105px] lg:block">
                <p className="text-[13px] text-[#b7bdd3]">Course Code</p>
                <p className="mt-1 text-[15px] font-bold">
                  {data?.courseCode || '—'}
                </p>
              </div>

              <div className="hidden min-w-[105px] lg:block">
                <p className="text-[13px] text-[#b7bdd3]">Department</p>
                <p className="mt-1 text-[15px] font-bold">
                  {data?.departmentName || '—'}
                </p>
              </div>

              <div className="hidden min-w-[75px] lg:block">
                <p className="text-[13px] text-[#b7bdd3]">Status</p>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#079d75] px-2.5 py-1 text-[11px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7effd3]" />
                  Active
                </span>
              </div>

              <CompletionRing percent={completionRate} />

              <div className="hidden xl:block">
                <p className="text-[14px] font-semibold">Course Completion</p>
                <p className="mt-1 text-[13px] text-[#c3c9da]">
                  {stats.completed} of {stats.total} completed
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* KPI CARDS */}
        <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[14px] border border-[#e0e6ee] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(25,50,80,0.04)]">
            <div className="flex items-center gap-4">
              <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-[#e8f5ff] text-[#078de3]">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#60748d]">
                  Enrolled Employees
                </p>
                <p className="mt-1 text-[30px] font-extrabold leading-none text-[#14263e]">
                  {stats.total}
                </p>
                <p className="mt-1 text-[12px] text-[#73859b]">
                  Total learners in this course
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e0e6ee] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(25,50,80,0.04)]">
            <div className="flex items-center gap-4">
              <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-[#e5faf1] text-[#00bd78]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#60748d]">
                  Completed
                </p>
                <p className="mt-1 text-[30px] font-extrabold leading-none text-[#14263e]">
                  {stats.completed}
                </p>
                <p className="mt-1 text-[12px] text-[#73859b]">
                  {completionRate}% of cohort
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e0e6ee] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(25,50,80,0.04)]">
            <div className="flex items-center gap-4">
              <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-[#f0e9ff] text-[#7228e8]">
                <Clock3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#60748d]">
                  In Progress
                </p>
                <p className="mt-1 text-[30px] font-extrabold leading-none text-[#14263e]">
                  {stats.inProgress}
                </p>
                <p className="mt-1 text-[12px] text-[#73859b]">
                  Currently learning
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e0e6ee] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(25,50,80,0.04)]">
            <div className="flex items-center gap-4">
              <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-[#fff6df] text-[#f29b00]">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#60748d]">
                  Average Progress
                </p>
                <p className="mt-1 text-[30px] font-extrabold leading-none text-[#14263e]">
                  {averageProgress}%
                </p>
                <p className="mt-1 text-[12px] text-[#73859b]">
                  {stats.overdue
                    ? `${stats.overdue} overdue learner${stats.overdue > 1 ? 's' : ''}`
                    : 'No overdue learners'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* EMPLOYEE SECTION */}
        <section className="mt-5 overflow-hidden rounded-[16px] border border-[#e0e6ee] bg-white shadow-[0_2px_9px_rgba(25,50,80,0.045)]">
          <div className="px-6 pb-3 pt-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Users className="h-[25px] w-[25px] text-[#078de3]" />
                  <h2 className="text-[23px] font-extrabold tracking-tight text-[#14263e]">
                    Enrolled Employees
                  </h2>
                </div>

                <p className="mt-1 text-[14px] text-[#697d96]">
                  Employee enrollment and progress from the KMS database.
                </p>
              </div>

              <div className="relative w-full lg:w-[355px]">
                <Search className="absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#7389a2]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search employee, ID or email..."
                  className="h-[42px] w-full rounded-[11px] border border-[#dce5ef] bg-white pl-10 pr-4 text-[13px] text-[#22364e] outline-none placeholder:text-[#8b9cb1] focus:border-[#73b9e7] focus:ring-4 focus:ring-[#eaf6fd]"
                />
              </div>
            </div>

            {/* FILTERS */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                {
                  id: 'ALL',
                  label: `All ${stats.total}`,
                  active: 'border-[#9dd4fa] bg-[#eef8ff] text-[#0879c9]',
                  dot: 'bg-[#168fe0]',
                },
                {
                  id: 'COMPLETED',
                  label: `Completed ${stats.completed}`,
                  active: 'border-[#c5eedc] bg-[#edfbf5] text-[#008b5c]',
                  dot: 'bg-[#0db979]',
                },
                {
                  id: 'IN_PROGRESS',
                  label: `In Progress ${stats.inProgress}`,
                  active: 'border-[#c9e6fa] bg-[#eef8ff] text-[#0879c9]',
                  dot: 'bg-[#168fe0]',
                },
                {
                  id: 'OVERDUE',
                  label: `Overdue ${stats.overdue}`,
                  active: 'border-[#ffd0d7] bg-[#fff0f2] text-[#cf4051]',
                  dot: 'bg-[#ef596b]',
                },
                {
                  id: 'NOT_STARTED',
                  label: `Not Started ${stats.notStarted}`,
                  active: 'border-[#dfe5eb] bg-[#f5f7f9] text-[#617286]',
                  dot: 'border border-[#69798c] bg-transparent',
                },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-[6px] text-[12px] font-bold transition ${
                    activeFilter === filter.id
                      ? filter.active
                      : 'border-[#e0e6ed] bg-white text-[#6a7c91] hover:bg-[#f8fafc]'
                  }`}
                >
                  <span className={`h-[8px] w-[8px] rounded-full ${filter.dot}`} />
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse">
              <thead>
                <tr className="border-y border-[#edf1f5] bg-[#fafbfd]">
                  <th className="px-6 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#60748d]">
                    Employee
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#60748d]">
                    Designation
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#60748d]">
                    Progress
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#60748d]">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#60748d]">
                    Score
                  </th>
                  <th className="px-6 py-3 text-right text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#60748d]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#edf1f5]">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <Users className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-sm font-bold text-slate-700">
                        {employees.length
                          ? 'No matching employees'
                          : 'No employees enrolled'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => {
                    const progress = clamp(employee.progressPercent);

                    return (
                      <tr
                        key={
                          employee.enrollmentId ||
                          employee.userId ||
                          employee.employeeId
                        }
                        className="h-[72px] transition-colors hover:bg-[#fbfdff]"
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d8e8ff] to-[#e9ddff] text-[13px] font-extrabold text-[#515bc7]">
                              {getInitials(employee.name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-extrabold text-[#17283e]">
                                {employee.name || 'Unknown Employee'}
                              </p>

                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#74869c]">
                                <span className="font-semibold">
                                  {employee.employeeId || '—'}
                                </span>

                                {employee.email && (
                                  <>
                                    <span className="text-[#c4ccd6]">•</span>
                                    <span className="inline-flex max-w-[260px] items-center gap-1 truncate">
                                      <Mail className="h-[12px] w-[12px]" />
                                      {employee.email}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3 text-[15px] font-medium text-[#4b5f78]">
                          {employee.designation || '—'}
                        </td>

                        <td className="px-5 py-3">
                          <div className="w-[230px]">
                            <div className="mb-1.5 text-[15px] font-extrabold text-[#17283e]">
                              {progress}%
                            </div>

                            <div className="h-[9px] overflow-hidden rounded-full bg-[#e9eef4]">
                              <div
                                className={`h-full rounded-full ${
                                  progress === 100
                                    ? 'bg-[#08c78a]'
                                    : 'bg-[#10b981]'
                                }`}
                                style={{
                                  width: `${progress}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3">
                          <StatusBadge status={employee.status} />
                        </td>

                        <td className="px-5 py-3">
                          {employee.score !== null &&
                          employee.score !== undefined ? (
                            <div className="inline-flex items-center gap-2 text-[15px] font-extrabold text-[#17283e]">
                              <Award className="h-[19px] w-[19px] text-[#f5a000]" />
                              {employee.score}%
                            </div>
                          ) : (
                            <span className="text-[14px] font-medium text-[#8291a5]">
                              Not scored
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-3 text-right">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-[#657a92] transition hover:bg-[#f1f5f9] hover:text-[#17283e]"
                            title="Employee actions"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#edf1f5] bg-[#fafbfd] px-6 py-3.5 text-[12px] text-[#71839a]">
            Showing{' '}
            <span className="font-bold text-[#344a63]">
              {filteredEmployees.length}
            </span>{' '}
            of{' '}
            <span className="font-bold text-[#344a63]">
              {employees.length}
            </span>{' '}
            employees
          </div>
        </section>
      </div>
    </div>
  );
}
