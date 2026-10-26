import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export default function Drafts({ onOpenDraft }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDrafts() {
      try {
        const token =
          localStorage.getItem('fairmacs_token') ||
          localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/drafts`, {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load drafts (${response.status})`);
        }

        const data = await response.json();
        setDrafts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load drafts.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadDrafts();
    return () => controller.abort();
  }, []);

  async function deleteDraft(event, draft) {
    event.stopPropagation();

    const courseId = draft.courseId || draft.id;
    if (!courseId) {
      setError('This draft has no course ID.');
      return;
    }

    const confirmed = window.confirm(
      `Discard "${draft.title || 'Untitled course'}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(courseId);
    setError('');

    try {
      const token =
        localStorage.getItem('fairmacs_token') ||
        localStorage.getItem('token');

      const response = await fetch(
        `${API_BASE_URL}/drafts/${encodeURIComponent(courseId)}`,
        {
          method: 'DELETE',
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          body || `Failed to delete draft (${response.status})`
        );
      }

      setDrafts((current) =>
        current.filter(
          (item) => (item.courseId || item.id) !== courseId
        )
      );
    } catch (err) {
      setError(err.message || 'Unable to delete draft.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800">
        Course Drafts
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Continue working on your unpublished courses.
      </p>

      {loading && <p className="mt-6">Loading drafts...</p>}

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {!loading && drafts.length === 0 && !error && (
        <div className="mt-6 rounded-xl border border-slate-200 p-8 text-center">
          <h2 className="font-medium text-slate-700">
            No drafts yet
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Courses you save as drafts will appear here.
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
                role="button"
                tabIndex={0}
                onClick={() => onOpenDraft?.(draft)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    event.target === event.currentTarget
                  ) {
                    onOpenDraft?.(draft);
                  }
                }}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <h2 className="font-semibold text-slate-800">
                  {draft.title || 'Untitled course'}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {draft.description || 'No description provided.'}
                </p>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                    Draft
                  </span>

                  <span className="text-slate-500">
                    {draft.level || 'Level not set'}
                  </span>
                </div>

                <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={(event) => deleteDraft(event, draft)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    {isDeleting ? 'Discarding...' : 'Discard draft'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}