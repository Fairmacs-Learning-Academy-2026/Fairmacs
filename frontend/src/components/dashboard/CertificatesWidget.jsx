import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  ExternalLink,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { enrollmentService } from '../../services/enrollmentService';
import CertificateViewer from '../CertificateViewer';

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

export default function CertificatesWidget({
  onOpenCertificate,
  onViewAllCertificates
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);

  const loadCertificates = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    try {
      const data = await enrollmentService.getUserCertificates(user.id);
      setCertificates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Unable to load certificates.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCertificates();

    const handleEnrollmentUpdate = () => {
      loadCertificates();
    };

    window.addEventListener('lms:enrollment-updated', handleEnrollmentUpdate);
    return () => {
      window.removeEventListener('lms:enrollment-updated', handleEnrollmentUpdate);
    };
  }, [loadCertificates]);

  const handleViewCert = (cert) => {
    if (onOpenCertificate) {
      onOpenCertificate(cert);
    } else {
      setSelectedCert(cert);
    }
  };

  const handleNavigateAll = () => {
    if (onViewAllCertificates) {
      onViewAllCertificates();
    } else {
      navigate('/certificates');
    }
  };

  const recentCertificates = certificates.slice(0, 3);

  return (
    <div className="phase5-widget-card certificates-widget animate-fade-in">
      {/* Specular ambient highlight */}
      <div className="phase5-widget-ambient amber" />

      {/* Header */}
      <div className="phase5-widget-header">
        <div className="phase5-widget-title-stack">
          <div className="phase5-widget-title-row">
            <div className="phase5-icon-pill amber">
              <Award size={18} />
            </div>
            <h3 className="phase5-widget-title">Certificates</h3>
            {certificates.length > 0 && (
              <span className="phase5-badge-pill amber">
                {certificates.length} {certificates.length === 1 ? 'Earned' : 'Earned'}
              </span>
            )}
          </div>
          <p className="phase5-widget-subtitle">
            Earned credentials & verified qualifications
          </p>
        </div>

        <button
          type="button"
          className="phase5-view-all-btn"
          onClick={handleNavigateAll}
          aria-label="View all earned certificates"
        >
          <span>View all</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Content Body */}
      <div className="phase5-widget-body">
        {loading ? (
          <div className="phase5-skeleton-stack" aria-label="Loading certificates">
            <div className="phase5-skeleton-row" />
            <div className="phase5-skeleton-row" />
          </div>
        ) : error ? (
          <div className="phase5-error-state">
            <AlertCircle size={22} className="text-amber-600" />
            <p className="phase5-error-text">{error}</p>
            <button
              type="button"
              className="phase5-retry-btn"
              onClick={loadCertificates}
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          </div>
        ) : certificates.length === 0 ? (
          /* Empty State - Apple clean rounded style matching reference image 3 */
          <div className="phase5-empty-state">
            <div className="phase5-empty-icon-circle amber">
              <Award size={26} />
            </div>
            <h4 className="phase5-empty-title">No Certificates Yet</h4>
            <p className="phase5-empty-desc">
              Complete eligible certified courses and pass their final assessment to earn verified credentials.
            </p>
            <button
              type="button"
              className="phase5-action-btn primary"
              onClick={() => navigate('/courses')}
            >
              <Sparkles size={14} />
              <span>Explore Course Catalog</span>
            </button>
          </div>
        ) : (
          /* Certificates List */
          <div className="phase5-items-list">
            {recentCertificates.map((cert, index) => {
              const certId = cert.certificateId || cert.id || `CERT-${index + 1}`;
              const title = cert.courseTitle || 'Course Certificate';
              const category = cert.courseCategory || 'Certified Course';
              const issued = formatDate(cert.issuedAt);
              const score = cert.score != null ? Number(cert.score) : null;

              return (
                <div
                  key={certId}
                  className="phase5-item-card"
                  onClick={() => handleViewCert(cert)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleViewCert(cert);
                    }
                  }}
                  aria-label={`View certificate for ${title}`}
                >
                  <div className="phase5-item-main">
                    <div className="phase5-item-icon-badge amber">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="phase5-item-details">
                      <div className="phase5-item-headline">
                        <span className="phase5-item-title" title={title}>
                          {title}
                        </span>
                        <span className="phase5-item-category-pill">{category}</span>
                      </div>
                      <div className="phase5-item-meta-row">
                        {issued && (
                          <span className="phase5-meta-item">
                            <Calendar size={12} />
                            <span>Issued {issued}</span>
                          </span>
                        )}
                        <span className="phase5-meta-item phase5-meta-id">
                          ID: {certId}
                        </span>
                        {score !== null && score > 0 && (
                          <span className="phase5-meta-item phase5-meta-score">
                            Score: {score}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="phase5-item-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewCert(cert);
                    }}
                    aria-label={`Open certificate viewer for ${title}`}
                  >
                    <span>View</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Embedded Certificate Viewer Modal Fallback */}
      {selectedCert && (
        <CertificateViewer
          certificate={selectedCert}
          onClose={() => setSelectedCert(null)}
        />
      )}
    </div>
  );
}
