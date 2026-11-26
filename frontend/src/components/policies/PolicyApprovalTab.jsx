import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  Calendar,
  AlertTriangle,
  Loader2,
  FileText,
  ShieldAlert,
  MessageSquare,
  X,
} from 'lucide-react';
import { policyService } from '../../services/policyService';
import { useAuth } from '../../context/AuthContext';

export default function PolicyApprovalTab({
  submissions = [],
  loading = false,
  onRefresh,
  onViewDocument,
  onSuccess,
}) {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [activeDecisionSub, setActiveDecisionSub] = useState(null); // Document being decided
  const [decisionType, setDecisionType] = useState('APPROVE'); // 'APPROVE' | 'REJECT'
  const [comments, setComments] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [error, setError] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submittingDecision) {
        setActiveDecisionSub(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submittingDecision]);

  const openDecisionModal = (sub, type) => {
    setActiveDecisionSub(sub);
    setDecisionType(type);
    setComments('');
    setError(null);
  };

  const handleConfirmDecision = async () => {
    if (decisionType === 'REJECT' && !comments.trim()) {
      setError('Please provide rejection remarks explaining what needs correction.');
      return;
    }

    setSubmittingDecision(true);
    setError(null);

    try {
      await policyService.decideSubmission(activeDecisionSub.id, {
        decision: decisionType,
        comments: comments.trim(),
      });

      onSuccess(
        `Department policy "${activeDecisionSub.title}" has been ${
          decisionType === 'APPROVE' ? 'approved' : 'rejected'
        }.`
      );
      setActiveDecisionSub(null);
      onRefresh();
    } catch (err) {
      console.error('Decision submission failed:', err);
      setError(err.message || 'Failed to submit decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-600" />
            <span>Manager Policy Submission Review Queue</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Review, inspect PDF files, and authorize or reject departmental policies submitted by branch managers.
          </p>
        </div>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold self-start sm:self-auto">
          {submissions.length} Pending Approval{submissions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {loading && (
          <div className="py-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-xs font-medium">Checking pending submissions...</p>
          </div>
        )}

        {!loading && submissions.length === 0 && (
          <div className="py-14 bg-white rounded-xl border border-slate-200 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">Review Queue is Clear</h4>
            <p className="text-xs text-slate-500 mt-1">
              There are no pending manager submissions awaiting HR review.
            </p>
          </div>
        )}

        {!loading &&
          submissions.map((sub) => {
            const isSelfSubmission =
              currentUserId && sub.createdByUserId && String(currentUserId) === String(sub.createdByUserId);

            return (
              <div
                key={sub.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Metadata */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {sub.documentCode}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded border border-blue-100">
                      {sub.categoryName || 'Departmental Policy'}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded border border-amber-200">
                      Awaiting HR Review
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 truncate" title={sub.title}>
                    {sub.title}
                  </h4>

                  {sub.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">{sub.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sub.owningDepartmentName || 'Department'}</span>
                    </div>
                    <span>&bull;</span>
                    <div>
                      Submitted by: <strong className="text-slate-700">{sub.createdByName || 'Manager'}</strong>
                    </div>
                    <span>&bull;</span>
                    <div className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {/* Self-approval Warning */}
                  {isSelfSubmission && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2 font-medium">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Self-approval restriction: You submitted this policy as a department manager. Another HR
                        administrator must approve this submission.
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={() => onViewDocument(sub)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    title="View PDF Document"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview PDF</span>
                  </button>

                  <button
                    onClick={() => openDecisionModal(sub, 'REJECT')}
                    className="px-3.5 py-2 bg-white border border-red-300 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => openDecisionModal(sub, 'APPROVE')}
                    disabled={isSelfSubmission}
                    className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 ${
                      isSelfSubmission ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={
                      isSelfSubmission
                        ? 'You cannot approve your own submission'
                        : 'Approve Department Policy'
                    }
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Decision Modal */}
      {activeDecisionSub && typeof document !== 'undefined' && createPortal(
        <div
          id="policy-decision-modal-portal"
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-150"
          style={{ zIndex: 99999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingDecision) {
              setActiveDecisionSub(null);
            }
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90dvh] z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`px-6 py-4 text-white flex items-center justify-between shrink-0 ${
                decisionType === 'APPROVE' ? 'bg-emerald-700' : 'bg-red-700'
              }`}
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {decisionType === 'APPROVE' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Approve Department Policy</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    <span>Reject Department Policy</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setActiveDecisionSub(null)}
                className="p-1 hover:bg-white/20 rounded transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {activeDecisionSub.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dept: {activeDecisionSub.owningDepartmentName} &bull; Submitted by{' '}
                  {activeDecisionSub.createdByName}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {decisionType === 'APPROVE'
                    ? 'Approval Comments (Optional)'
                    : 'Rejection Remarks (Required for Manager Feedback)'}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  placeholder={
                    decisionType === 'APPROVE'
                      ? 'e.g. Reviewed and authorized for organization publication.'
                      : 'e.g. Please clarify section 3 scope regarding freight forwarding protocols...'
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 resize-none"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                {decisionType === 'APPROVE'
                  ? 'Note: Approving marks the document APPROVED. It can then be published to the intended audience from the Document Library.'
                  : 'Note: Rejecting notifies the submitting manager with your remarks so they can revise and resubmit.'}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveDecisionSub(null)}
                disabled={submittingDecision}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={submittingDecision}
                className={`px-5 py-2 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 ${
                  decisionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submittingDecision && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {decisionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
