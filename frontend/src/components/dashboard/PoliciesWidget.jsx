import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { policyService } from '../../services/policyService';
import PolicyPdfViewerModal from '../policies/PolicyPdfViewerModal';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function calculatePolicyUrgency(policy) {
  const isAck =
    policy.acknowledgementStatus === 'ACKNOWLEDGED' ||
    Boolean(policy.acknowledged);

  if (isAck) {
    return {
      priority: 4,
      statusKey: 'ACKNOWLEDGED',
      label: 'Acknowledged',
      badgeClass: 'green',
      icon: CheckCircle2
    };
  }

  if (!policy.dueDate) {
    return {
      priority: 3,
      statusKey: 'PENDING',
      label: 'Pending',
      badgeClass: 'blue',
      icon: Clock
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(policy.dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0 || policy.acknowledgementStatus === 'OVERDUE') {
    const overdueDays = Math.max(1, Math.abs(diffDays));
    return {
      priority: 1,
      statusKey: 'OVERDUE',
      label: `Overdue by ${overdueDays}d`,
      badgeClass: 'red',
      icon: ShieldAlert,
      diffDays
    };
  }

  if (diffDays === 0) {
    return {
      priority: 2,
      statusKey: 'DUE_TODAY',
      label: 'Due today',
      badgeClass: 'amber',
      icon: AlertCircle,
      diffDays: 0
    };
  }

  if (diffDays <= 7) {
    return {
      priority: 2,
      statusKey: 'APPROACHING',
      label: `Due in ${diffDays}d`,
      badgeClass: 'amber',
      icon: AlertCircle,
      diffDays
    };
  }

  return {
    priority: 3,
    statusKey: 'PENDING',
    label: `Due in ${diffDays}d`,
    badgeClass: 'blue',
    icon: Clock,
    diffDays
  };
}

export default function PoliciesWidget({ onViewAllPolicies }) {
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePolicy, setActivePolicy] = useState(null);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await policyService.getMyAssignments('ALL');
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Unable to load required policies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();

    const handlePolicyUpdate = () => {
      loadAssignments();
    };

    window.addEventListener('lms:policy-acknowledged', handlePolicyUpdate);
    return () => {
      window.removeEventListener('lms:policy-acknowledged', handlePolicyUpdate);
    };
  }, [loadAssignments]);

  // Sort assignments by urgency hierarchy: 1. Overdue -> 2. Approaching -> 3. Pending -> 4. Acknowledged
  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const urgA = calculatePolicyUrgency(a);
      const urgB = calculatePolicyUrgency(b);

      if (urgA.priority !== urgB.priority) {
        return urgA.priority - urgB.priority;
      }

      // Within same priority, compare dates
      if (urgA.priority === 4) {
        // Acknowledged: most recently acknowledged first
        const dateA = a.acknowledgedAt ? new Date(a.acknowledgedAt).getTime() : 0;
        const dateB = b.acknowledgedAt ? new Date(b.acknowledgedAt).getTime() : 0;
        return dateB - dateA;
      }

      // Pending/Overdue: earliest due date first
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return dueA - dueB;
    });
  }, [assignments]);

  // Counts
  const { overdueCount, pendingCount, acknowledgedCount } = useMemo(() => {
    let overdue = 0;
    let pending = 0;
    let ack = 0;

    for (const item of assignments) {
      const urg = calculatePolicyUrgency(item);
      if (urg.priority === 1) overdue++;
      else if (urg.priority === 2 || urg.priority === 3) pending++;
      else if (urg.priority === 4) ack++;
    }

    return { overdueCount: overdue, pendingCount: pending, acknowledgedCount: ack };
  }, [assignments]);

  const handleOpenPolicy = (policy) => {
    setActivePolicy(policy);
  };

  const handleNavigateAll = () => {
    if (onViewAllPolicies) {
      onViewAllPolicies();
    } else {
      navigate('/profile?tab=policies#policies');
    }
  };

  const recentList = sortedAssignments.slice(0, 3);
  const isAllCaughtUp = assignments.length > 0 && overdueCount === 0 && pendingCount === 0;

  return (
    <div className="phase5-widget-card policies-widget animate-fade-in">
      {/* Specular ambient highlight */}
      <div className={`phase5-widget-ambient ${overdueCount > 0 ? 'red' : pendingCount > 0 ? 'blue' : 'green'}`} />

      {/* Header */}
      <div className="phase5-widget-header">
        <div className="phase5-widget-title-stack">
          <div className="phase5-widget-title-row">
            <div className={`phase5-icon-pill ${overdueCount > 0 ? 'red' : pendingCount > 0 ? 'blue' : 'green'}`}>
              <ShieldCheck size={18} />
            </div>
            <h3 className="phase5-widget-title">Policies & Agreements</h3>
            {overdueCount > 0 ? (
              <span className="phase5-badge-pill red">
                {overdueCount} Overdue
              </span>
            ) : pendingCount > 0 ? (
              <span className="phase5-badge-pill amber">
                {pendingCount} Pending
              </span>
            ) : isAllCaughtUp ? (
              <span className="phase5-badge-pill green">
                Up to Date
              </span>
            ) : null}
          </div>
          <p className="phase5-widget-subtitle">
            Company compliance & mandatory acknowledgements
          </p>
        </div>

        <button
          type="button"
          className="phase5-view-all-btn"
          onClick={handleNavigateAll}
          aria-label="View all company policies"
        >
          <span>View all</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Content Body */}
      <div className="phase5-widget-body">
        {loading ? (
          <div className="phase5-skeleton-stack" aria-label="Loading policies">
            <div className="phase5-skeleton-row" />
            <div className="phase5-skeleton-row" />
          </div>
        ) : error ? (
          <div className="phase5-error-state">
            <AlertCircle size={22} className="text-red-500" />
            <p className="phase5-error-text">{error}</p>
            <button
              type="button"
              className="phase5-retry-btn"
              onClick={loadAssignments}
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          </div>
        ) : isAllCaughtUp ? (
          /* All Caught Up State - Reference Image 3 Design */
          <div className="phase5-empty-state">
            <div className="phase5-empty-icon-circle green">
              <CheckCircle2 size={26} />
            </div>
            <h4 className="phase5-empty-title">You're all caught up</h4>
            <p className="phase5-empty-desc">
              All required company policies and agreements have been reviewed and acknowledged.
            </p>
            <button
              type="button"
              className="phase5-action-btn secondary"
              onClick={handleNavigateAll}
            >
              <FileText size={14} />
              <span>View Policy Records</span>
            </button>
          </div>
        ) : assignments.length === 0 ? (
          <div className="phase5-empty-state">
            <div className="phase5-empty-icon-circle blue">
              <ShieldCheck size={26} />
            </div>
            <h4 className="phase5-empty-title">No Assigned Policies</h4>
            <p className="phase5-empty-desc">
              You do not have any pending policies or compliance agreements at this time.
            </p>
          </div>
        ) : (
          /* Prioritized Policies List */
          <div className="phase5-items-list">
            {recentList.map((item) => {
              const urgency = calculatePolicyUrgency(item);
              const UrgencyIcon = urgency.icon;
              const isAcknowledged = urgency.priority === 4;

              return (
                <div
                  key={item.id}
                  className={`phase5-item-card ${urgency.badgeClass}`}
                  onClick={() => handleOpenPolicy(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenPolicy(item);
                    }
                  }}
                  aria-label={`${item.title} - ${urgency.label}`}
                >
                  <div className="phase5-item-main">
                    <div className={`phase5-item-icon-badge ${urgency.badgeClass}`}>
                      <UrgencyIcon size={18} />
                    </div>
                    <div className="phase5-item-details">
                      <div className="phase5-item-headline">
                        <span className="phase5-item-title" title={item.title}>
                          {item.title}
                        </span>
                        {item.versionNumber && (
                          <span className="phase5-item-category-pill">
                            v{item.versionNumber}
                          </span>
                        )}
                      </div>
                      <div className="phase5-item-meta-row">
                        {item.documentCode && (
                          <span className="phase5-meta-item phase5-meta-id">
                            {item.documentCode}
                          </span>
                        )}
                        <span className={`phase5-urgency-pill ${urgency.badgeClass}`}>
                          {urgency.label}
                        </span>
                        {isAcknowledged && item.acknowledgedAt && (
                          <span className="phase5-meta-item">
                            Ack: {formatDate(item.acknowledgedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`phase5-item-action-btn ${isAcknowledged ? 'secondary' : 'primary'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPolicy(item);
                    }}
                    aria-label={isAcknowledged ? 'View policy document' : 'Review and acknowledge policy'}
                  >
                    <span className="phase5-btn-label-full">{isAcknowledged ? 'View' : 'Review & Acknowledge'}</span>
                    <span className="phase5-btn-label-short">{isAcknowledged ? 'View' : 'Review'}</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Embedded Policy PDF Viewer Modal */}
      {activePolicy && (
        <PolicyPdfViewerModal
          versionId={activePolicy.policyVersionId || activePolicy.id}
          assignmentId={activePolicy.id}
          title={activePolicy.title}
          documentCode={activePolicy.documentCode}
          versionNumber={activePolicy.versionNumber || '1.0'}
          categoryName={activePolicy.categoryName || 'General'}
          mandatory={activePolicy.mandatory !== false}
          effectiveDate={activePolicy.effectiveDate}
          dueDate={activePolicy.dueDate}
          allowDownload={activePolicy.allowDownload !== false}
          isAlreadyAcknowledged={
            activePolicy.acknowledgementStatus === 'ACKNOWLEDGED' ||
            Boolean(activePolicy.acknowledged)
          }
          acknowledgedAt={activePolicy.acknowledgedAt}
          onClose={() => setActivePolicy(null)}
          onAcknowledged={() => {
            setActivePolicy(null);
            loadAssignments();
            window.dispatchEvent(new CustomEvent('lms:policy-acknowledged'));
          }}
        />
      )}
    </div>
  );
}
