import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  Users,
  BookOpen,
  CheckSquare,
  Search,
  MoreHorizontal,
  RefreshCw,
  AlertCircle,
  User,
  ShieldCheck,
  Award,
  BookMarked,
  BarChart2,
  Clock3,
} from 'lucide-react';

const API_BASE_URL = SHARED_API_BASE_URL;

function CircularProgress({ percent = 0, size = 50, strokeWidth = 3.5 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-200"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {clamped > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-sky-600 transition-all duration-500"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
      <span className="absolute text-[10px] font-bold text-slate-600">
        {clamped}%
      </span>
    </div>
  );
}

export default function DepartmentDetails() {
  const { departmentId } = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [courseTab, setCourseTab] = useState('ALL');

  const loadDepartmentDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const token =
        localStorage.getItem('fairmacs_token') ||
        localStorage.getItem('fairmacs_lms_token') ||
        '';

      const response = await authFetch(
        `${API_BASE_URL}/departments/${departmentId}/details`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unable to load department (${response.status})`);
      }

      const data = await response.json();
      setDepartment(data);
    } catch (err) {
      console.error('Department details loading failed:', err);
      setError(err.message || 'Unable to load department details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartmentDetails();
  }, [departmentId]);

  const employees = useMemo(
    () => (Array.isArray(department?.employees) ? department.employees : []),
    [department]
  );

  const courses = useMemo(
    () => (Array.isArray(department?.courses) ? department.courses : []),
    [department]
  );

  const displayedCourses = useMemo(() => {
    return courses.filter(c => {
      if (courseTab === 'ASSIGNED') return !c.owned;
      if (courseTab === 'OWNED') return c.owned;
      return true;
    });
  }, [courses, courseTab]);

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((emp) =>
      [emp.name, emp.employeeId, emp.email, emp.designation, emp.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [employees, searchTerm]);

  const employeeCount = department?.employeeCount ?? employees.length;
  const courseCount = department?.assignedCoursesCount ?? courses.length;
  const completionRate = department?.completionRate ?? 0;

  const getCourseIcon = (index) => {
    const icons = [ShieldCheck, BookOpen, Award, BookMarked];
    const IconComponent = icons[index % icons.length];
    return <IconComponent className="h-5 w-5" />;
  };

  const getCourseStatusConfig = (rate) => {
    const num = Number(rate || 0);

    if (num >= 100) {
      return {
        label: 'COMPLETED',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    }

    if (num > 0) {
      return {
        label: 'IN PROGRESS',
        className: 'border-blue-200 bg-blue-50 text-blue-700',
      };
    }

    return {
      label: 'NOT STARTED',
      className: 'border-slate-200 bg-slate-50 text-slate-600',
    };
  };

  const handleBack = () => navigate('/hr/departments');

  const handleViewCourse = (courseId) => {
    navigate(`/hr/departments/${departmentId}/courses/${courseId}`);
  };

  return (
    <div className="min-h-dvh w-full bg-[#F4F7FB] font-sans text-slate-900 antialiased">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-white blur-3xl" />
        <div className="absolute -left-40 top-[40%] h-[30rem] w-[30rem] rounded-full bg-sky-100/60 blur-3xl" />
      </div>

      {/* IMPORTANT: fixed page width/margins similar to the HR dashboard */}
      <main className="relative z-10 mx-auto w-full max-w-[1540px] px-5 py-4 sm:px-6 lg:px-8 lg:py-5">
        {/* Top row */}
        <div className="mb-4 flex h-9 items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-lg px-0.5 py-1 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Departments
          </button>

          {!loading && !error && (
            <button
              type="button"
              onClick={loadDepartmentDetails}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[70dvh] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-3 h-7 w-7 animate-spin text-sky-600" />
              <p className="text-sm font-semibold text-slate-600">
                Loading department details...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
            <h3 className="mb-2 text-lg font-bold text-slate-950">
              Error Loading Department
            </h3>
            <p className="mb-6 text-sm text-slate-500">{error}</p>
            <button
              type="button"
              onClick={loadDepartmentDetails}
              className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Department hero — same visual hierarchy as reference dashboard */}
            <section className="relative overflow-hidden rounded-[22px] bg-[#171C3B] px-7 py-6 text-white shadow-sm sm:px-9 sm:py-7">
              <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="absolute bottom-0 left-[42%] h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-400/10 text-sky-300">
                  <BarChart2 className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-400">
                    Department
                  </p>

                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-[34px]">
                    {department?.name || 'Department'}
                  </h1>

                  {department?.description && (
                    <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-300">
                      {department.description}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Statistics */}
            <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
              <div className="flex min-h-[96px] items-center rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <Users className="h-5 w-5" />
                </div>
                <div className="ml-4 min-w-0">
                  <p className="text-xl font-extrabold leading-none text-slate-900">
                    {employeeCount}
                  </p>
                  <p className="mt-1.5 truncate text-xs font-semibold text-slate-500">
                    Employees
                  </p>
                </div>
              </div>

              <div className="flex min-h-[96px] items-center rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="ml-4 min-w-0">
                  <p className="text-xl font-extrabold leading-none text-slate-900">
                    {department?.ownedCoursesCount ?? 0}
                  </p>
                  <p className="mt-1.5 truncate text-xs font-semibold text-slate-500">
                    Owned Courses
                  </p>
                </div>
              </div>

              <div className="flex min-h-[96px] items-center rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="ml-4 min-w-0">
                  <p className="text-xl font-extrabold leading-none text-slate-900">
                    {department?.assignedCoursesCount ?? courses.length}
                  </p>
                  <p className="mt-1.5 truncate text-xs font-semibold text-slate-500">
                    Assigned Courses
                  </p>
                </div>
              </div>

              <div className="flex min-h-[96px] items-center rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div className="ml-4 min-w-0">
                  <p className="text-xl font-extrabold leading-none text-slate-900">
                    {completionRate}%
                  </p>
                  <p className="mt-1.5 truncate text-xs font-semibold text-slate-500">
                    Completion Rate
                  </p>
                </div>
              </div>

              <div className="flex min-h-[96px] items-center rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div className="ml-4 min-w-0">
                  <p className="text-xl font-extrabold leading-none text-rose-600">
                    {department?.overdueAssignmentsCount ?? 0}
                  </p>
                  <p className="mt-1.5 truncate text-xs font-semibold text-slate-500">
                    Overdue
                  </p>
                </div>
              </div>

              <div className="flex min-h-[96px] items-center rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Award className="h-5 w-5" />
                </div>
                <div className="ml-4 min-w-0">
                  <p className="text-xl font-extrabold leading-none text-slate-900">
                    {department?.averageAssessmentScore ?? 0}%
                  </p>
                  <p className="mt-1.5 truncate text-xs font-semibold text-slate-500">
                    Avg Score
                  </p>
                </div>
              </div>
            </section>

            {/* Content columns */}
            <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              {/* Employees card */}
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                        <Users className="h-4 w-4" />
                      </div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">
                        Department Employees
                      </h2>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-500">
                      Employees currently belonging to this department.
                    </p>
                  </div>

                  <div className="relative w-full lg:w-[270px]">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search employees"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                     enterKeyHint="search" />
                  </div>
                </div>

                {filteredEmployees.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
                    {employees.length === 0
                      ? 'No employees registered in this department.'
                      : 'No employees match your search.'}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] table-fixed text-left">
                        <colgroup>
                          <col className="w-[36%]" />
                          <col className="w-[19%]" />
                          <col className="w-[25%]" />
                          <col className="w-[15%]" />
                          <col className="w-[5%]" />
                        </colgroup>

                        <thead className="bg-slate-50">
                          <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            <th className="px-4 py-3">Employee</th>
                            <th className="px-4 py-3">Employee ID</th>
                            <th className="px-4 py-3">Designation</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-2 py-3" />
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredEmployees.map((emp) => (
                            <tr
                              key={emp.id || emp.employeeId}
                              className="transition-colors hover:bg-sky-50/50"
                            >
                              <td className="px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                                    <User className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-900">
                                      {emp.name || 'Unknown'}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-slate-400">
                                      {emp.email || '—'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">
                                {emp.employeeId || '—'}
                              </td>

                              <td className="truncate px-4 py-3 text-slate-600">
                                {emp.designation || 'Executive'}
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                    String(emp.status || 'ACTIVE').toUpperCase() ===
                                    'ACTIVE'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-200 bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  {emp.status || 'ACTIVE'}
                                </span>
                              </td>

                              <td className="px-2 py-3 text-right">
                                <button
                                  type="button"
                                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                  title="Actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Courses card */}
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">
                        Department Courses
                      </h2>
                    </div>

                    {/* Filter tabs */}
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setCourseTab('ALL')}
                        className={`px-2.5 py-1 rounded-md transition-colors ${courseTab === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        All ({courses.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseTab('ASSIGNED')}
                        className={`px-2.5 py-1 rounded-md transition-colors ${courseTab === 'ASSIGNED' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        Assigned ({department?.assignedCoursesCount ?? courses.filter(c => !c.owned).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseTab('OWNED')}
                        className={`px-2.5 py-1 rounded-md transition-colors ${courseTab === 'OWNED' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        Owned ({department?.ownedCoursesCount ?? courses.filter(c => c.owned).length})
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Courses owned by or assigned to this department with real-time performance breakdown.
                  </p>
                </div>

                {displayedCourses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
                    {courseTab === 'OWNED'
                      ? 'No courses owned by this department yet.'
                      : courseTab === 'ASSIGNED'
                      ? 'No courses assigned to this department yet.'
                      : 'No courses found for this department.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedCourses.map((course, idx) => {
                      const cfg = getCourseStatusConfig(course.completionRate);

                      return (
                        <button
                          key={course.courseId || idx}
                          type="button"
                          onClick={() => handleViewCourse(course.courseId)}
                          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:border-sky-200 hover:bg-sky-50/30 hover:shadow-sm"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 group-hover:bg-sky-50 group-hover:text-sky-600">
                              {getCourseIcon(idx)}
                            </span>

                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-slate-900">
                                {course.title}
                              </span>

                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                {course.owned ? (
                                  <span className="inline-flex rounded border border-purple-200 bg-purple-50 px-1.5 py-0.2 text-[9px] font-bold text-purple-700">
                                    OWNED
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded border border-sky-200 bg-sky-50 px-1.5 py-0.2 text-[9px] font-bold text-sky-700">
                                    ASSIGNED
                                  </span>
                                )}

                                {course.mandatoryCount > 0 ? (
                                  <span className="inline-flex rounded border border-rose-200 bg-rose-50 px-1.5 py-0.2 text-[9px] font-bold text-rose-700">
                                    MANDATORY
                                  </span>
                                ) : course.recommendedCount > 0 ? (
                                  <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700">
                                    RECOMMENDED
                                  </span>
                                ) : null}

                                <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide ${cfg.className}`}>
                                  {cfg.label}
                                </span>
                              </div>

                              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                                <span>Done: <strong className="text-slate-800">{course.completedCount ?? 0}</strong></span>
                                {course.overdueCount > 0 && <span className="text-rose-600 font-bold">Overdue: {course.overdueCount}</span>}
                                {course.averageScore != null && <span>Avg: <strong className="text-slate-800">{course.averageScore}%</strong></span>}
                              </div>
                            </span>
                          </span>

                          <CircularProgress
                            percent={course.completionRate || 0}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
