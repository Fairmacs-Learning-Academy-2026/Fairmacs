import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  FileText
} from 'lucide-react';
import CourseBuilderModal, { preloadCourseBuilderReferenceData } from './CourseBuilderModal';

const API_BASE_URL = SHARED_API_BASE_URL;

const cardStyle = {
  background: '#FFFFFF',
  borderRadius: '8px',
  border: '1px solid #E2E8F0',
  padding: '1.25rem 1.4rem',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const actionBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.45rem',
  padding: '0.52rem 0.95rem',
  borderRadius: '6px',
  fontSize: '0.84rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#0F172A',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
  whiteSpace: 'nowrap',
};

export default function HrDraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState('');
  const [draftSuccessMessage, setDraftSuccessMessage] = useState('');

  const [showCourseBuilderModal, setShowCourseBuilderModal] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState('');

  const [draftToDelete, setDraftToDelete] = useState(null);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [draftDeleteError, setDraftDeleteError] = useState('');

  const loadDrafts = useCallback(async () => {
    setDraftsLoading(true);
    setDraftsError('');
    try {
      const token = localStorage.getItem('fairmacs_token') || localStorage.getItem('token');
      const response = await authFetch(`${API_BASE_URL}/drafts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error(`Could not load drafts (${response.status})`);
      const data = await response.json();
      setDrafts(Array.isArray(data) ? data : []);
    } catch (err) {
      setDraftsError(err.message || 'Unable to load course drafts.');
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  useEffect(() => {
    preloadCourseBuilderReferenceData();
    loadDrafts();
  }, [loadDrafts]);

  const handleConfirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    const targetId = draftToDelete.courseId || draftToDelete.id;
    if (!targetId) {
      setDraftDeleteError('No draft ID available.');
      return;
    }

    setIsDeletingDraft(true);
    setDraftDeleteError('');
    try {
      const token = localStorage.getItem('fairmacs_token') || localStorage.getItem('token');
      const response = await authFetch(`${API_BASE_URL}/drafts/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        let msg = `Draft deletion failed with HTTP ${response.status}`;
        try {
          const body = await response.json();
          msg = body.message || body.error || msg;
        } catch {
          // keep fallback
        }
        throw new Error(msg);
      }

      setDraftSuccessMessage(`Draft "${draftToDelete.title || targetId}" successfully deleted.`);
      setDraftToDelete(null);
      await loadDrafts();
    } catch (err) {
      setDraftDeleteError(err.message || 'Unable to delete draft.');
    } finally {
      setIsDeletingDraft(false);
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minWidth: 0,
        color: '#14243A',
      }}
    >
      <section style={cardStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Course Drafts
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '4px',
                  background: '#FFFBEB',
                  color: '#92400E',
                  border: '1px solid #FDE68A',
                }}
              >
                {drafts.length} drafts
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0' }}>
              Continue editing and saving unpublished course drafts or permanently delete drafts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setEditingDraftId('');
                setShowCourseBuilderModal(true);
              }}
              style={{
                ...actionBtnStyle,
                background: '#0F6CBD',
                color: '#FFFFFF',
                border: '1px solid #0F6CBD',
              }}
            >
              <Plus size={15} /> Create Course Draft
            </button>
            <button
              onClick={loadDrafts}
              disabled={draftsLoading}
              style={actionBtnStyle}
              title="Refresh drafts"
            >
              <RefreshCw size={14} className={draftsLoading ? 'spin' : ''} />
              {draftsLoading ? 'Refreshing…' : 'Refresh drafts'}
            </button>
          </div>
        </div>

        {draftSuccessMessage && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 14px',
              borderRadius: '6px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#166534',
              fontSize: '0.84rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{draftSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setDraftSuccessMessage('')}
              style={{ background: 'transparent', border: 0, color: '#166534', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {draftsError && (
          <p
            role="alert"
            style={{
              color: '#991B1B',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              padding: 12,
              borderRadius: '6px',
              fontSize: '0.84rem',
            }}
          >
            {draftsError}
          </p>
        )}

        {draftsLoading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`d-skel-${idx}`}
                className="skeleton-shimmer"
                style={{ height: '140px', borderRadius: '8px' }}
              />
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <FileText size={36} style={{ margin: '0 auto 0.65rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 650, fontSize: '1rem', color: '#0F172A', margin: 0 }}>
              No course drafts found.
            </p>
            <p style={{ fontSize: '0.84rem', margin: '6px 0 1.25rem 0' }}>
              Create a new draft to begin authoring learning content.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingDraftId('');
                setShowCourseBuilderModal(true);
              }}
              style={{
                ...actionBtnStyle,
                background: '#0F6CBD',
                color: '#FFFFFF',
                border: '1px solid #0F6CBD',
              }}
            >
              <Plus size={15} /> Create Course Draft
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {drafts.map((draft) => {
              const id = draft.courseId || draft.id;
              return (
                <div
                  key={id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '1.15rem',
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
              if (typeof window !== 'undefined' && !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 650, color: '#0F172A', fontSize: '0.96rem' }}>
                          {draft.title || 'Untitled course'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
                          {id}
                          {draft.departmentName ? ` • ${draft.departmentName}` : ''}
                          {draft.createdByName ? ` • By ${draft.createdByName}` : ''}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#92400E',
                          background: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        DRAFT
                      </span>
                    </div>
                    {draft.description && (
                      <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '10px 0', lineHeight: 1.45 }}>
                        {draft.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDraftId(String(id));
                        setShowCourseBuilderModal(true);
                      }}
                      style={{
                        flex: 1,
                        border: '1px solid #0F6CBD',
                        borderRadius: '6px',
                        padding: '0.45rem 0.75rem',
                        background: '#0F6CBD',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Pencil size={14} /> Open and edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftDeleteError('');
                        setDraftToDelete(draft);
                      }}
                      style={{
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        padding: '0.45rem 0.75rem',
                        background: '#FEF2F2',
                        color: '#DC2626',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 5,
                      }}
                      title="Delete Draft Permanently"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Draft Modal */}
      {draftToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !isDeletingDraft && setDraftToDelete(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '6px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                  Permanently Delete Draft?
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Are you sure you want to permanently delete draft{' '}
              <strong style={{ color: '#0F172A' }}>
                {draftToDelete.title || 'Untitled course'}
              </strong>{' '}
              ({draftToDelete.courseId || draftToDelete.id})? All unpublished modules, lessons, and quiz questions will be deleted.
            </p>

            {draftDeleteError && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem 1rem',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  color: '#991B1B',
                  fontSize: '0.84rem',
                  marginBottom: '1rem',
                }}
              >
                {draftDeleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                disabled={isDeletingDraft}
                onClick={() => setDraftToDelete(null)}
                style={{
                  ...actionBtnStyle,
                  cursor: isDeletingDraft ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingDraft}
                onClick={handleConfirmDeleteDraft}
                style={{
                  ...actionBtnStyle,
                  background: isDeletingDraft ? '#94A3B8' : '#DC2626',
                  color: '#FFFFFF',
                  border: '1px solid #DC2626',
                  cursor: isDeletingDraft ? 'not-allowed' : 'pointer',
                }}
              >
                <Trash2 size={15} />
                {isDeletingDraft ? 'Deleting Draft…' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Builder Modal */}
      {showCourseBuilderModal && (
        <CourseBuilderModal
          key={editingDraftId || 'new-draft'}
          courseId={editingDraftId || ''}
          onClose={() => {
            setShowCourseBuilderModal(false);
            setEditingDraftId('');
            loadDrafts();
          }}
          onPublish={() => {
            setShowCourseBuilderModal(false);
            setEditingDraftId('');
            loadDrafts();
          }}
        />
      )}
    </div>
  );
}
