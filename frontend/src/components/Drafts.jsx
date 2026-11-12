import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Edit3, AlertTriangle, CheckCircle2, X, Plus, RefreshCw } from 'lucide-react';
import { preloadCourseBuilderReferenceData } from './CourseBuilderModal';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

function formatPosition(pos) {
  if (!pos) return '';
  const s = String(pos).trim().toUpperCase();
  if (s.startsWith('L') && s.length === 2 && ['0', '1', '2', '3', '4'].includes(s[1])) {
    return 'P' + s[1];
  }
  return s;
}

function extractErrorMessage(body, status) {
  if (!body) return `Request failed (${status})`;
  try {
    const parsed = JSON.parse(body);
    return parsed.message || parsed.error || body;
  } catch {
    return body;
  }
}

export default function Drafts({ onOpenDraft, onCreateDraft, refreshKey = 0 }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [draftToDelete, setDraftToDelete] = useState(null);

  const loadDrafts = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const token =
        localStorage.getItem('fairmacs_token') ||
        localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/drafts`, {
        headers: token
          ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
          : { Accept: 'application/json' },
        ...(signal ? { signal } : {}),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(extractErrorMessage(body, response.status));
      }

      const data = await response.json();
      setDrafts(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unable to load drafts.');
      }
    } finally {
      if (!signal || !signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    preloadCourseBuilderReferenceData();
    const controller = new AbortController();
    loadDrafts(controller.signal);
    return () => controller.abort();
  }, [loadDrafts, refreshKey]);

  async function handleConfirmDelete() {
    if (!draftToDelete) return;

    const courseId = draftToDelete.courseId || draftToDelete.id;
    if (!courseId) {
      setError('This draft has no valid course ID.');
      setDraftToDelete(null);
      return;
    }

    setDeletingId(courseId);
    setError('');
    setSuccessMessage('');

    try {
      const token =
        localStorage.getItem('fairmacs_token') ||
        localStorage.getItem('token');

      const response = await fetch(
        `${API_BASE_URL}/drafts/${encodeURIComponent(courseId)}`,
        {
          method: 'DELETE',
          headers: token
            ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            : { Accept: 'application/json' },
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(extractErrorMessage(body, response.status));
      }

      setDrafts((current) =>
        current.filter(
          (item) => (item.courseId || item.id) !== courseId
        )
      );
      setSuccessMessage(`Draft "${draftToDelete.title || 'Untitled course'}" was permanently deleted.`);
      setDraftToDelete(null);
    } catch (err) {
      setError(err.message || 'Unable to delete draft.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Course Drafts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Continue working on unpublished course drafts or permanently delete drafts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'}
          </span>
          <button
            type="button"
            onClick={() => loadDrafts()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {onCreateDraft && (
            <button
              type="button"
              onClick={onCreateDraft}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition"
            >
              <Plus size={14} />
              New Course Draft
            </button>
          )}
        </div>
      </div>

      {loading && <p className="mt-6 text-slate-500">Loading drafts...</p>}

      {successMessage && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-600 hover:text-red-800"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!loading && drafts.length === 0 && !error && (
        <div className="mt-6 rounded-xl border border-slate-200 p-8 text-center bg-white">
          <h2 className="font-medium text-slate-700">
            No drafts yet
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Courses saved as drafts by Trainers or HR Admins will appear here.
          </p>
        </div>
      )}

      {!loading && drafts.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {drafts.map((draft) => {
            const courseId = draft.courseId || draft.id;
            const isDeleting = deletingId === courseId;

            return (
              <article
                key={courseId}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                      Draft
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatPosition(draft.position || draft.level) || 'Position not set'}
                    </span>
                  </div>

                  <h2 className="mt-3 font-semibold text-slate-800 text-base">
                    {draft.title || 'Untitled course'}
                  </h2>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{courseId}</span>
                    {draft.departmentName && (
                      <span>• {draft.departmentName}</span>
                    )}
                    {draft.createdByName && (
                      <span>• By {draft.createdByName}</span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                    {draft.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => onOpenDraft?.(draft)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                  >
                    <Edit3 size={14} />
                    Open and Edit
                  </button>

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDraftToDelete(draft)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Delete Draft
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Permanent Deletion Confirmation Modal */}
      {draftToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="rounded-full bg-red-100 p-2.5">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Permanently Delete Draft?
              </h3>
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800">"{draftToDelete.title || 'Untitled course'}"</strong> ({draftToDelete.courseId || draftToDelete.id})?
              This action is permanent and cannot be undone. All unpublished modules, lessons, and quiz questions will be deleted.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDraftToDelete(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                <Trash2 size={15} />
                {deletingId ? 'Deleting...' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
