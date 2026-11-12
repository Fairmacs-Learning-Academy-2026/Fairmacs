import React, { useEffect, useState } from 'react';

import {
  Award,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../stores/enrollmentStore';

export default function CertificatesPage({
  onViewCertificate
}) {

  const { user } = useAuth();

  const {
    certificates,
    fetchUserCertificates,
    isLoading
  } = useEnrollmentStore();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');


  /* =========================================================
     LOAD USER CERTIFICATES
  ========================================================== */

  useEffect(() => {

    let mounted = true;

    const loadCertificates = async () => {

      if (!user?.id) {

        if (mounted) {

          setLoading(false);

          setError(
            'Unable to identify the logged-in employee.'
          );
        }

        return;
      }

      try {

        setLoading(true);
        setError('');

        await fetchUserCertificates(
          user.id
        );

      } catch (err) {

        console.error(
          'Load certificates error:',
          err
        );

        if (mounted) {

          setError(
            err?.message ||
            'Unable to load your certificates.'
          );
        }

      } finally {

        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCertificates();

    return () => {
      mounted = false;
    };

  }, [
    user?.id,
    fetchUserCertificates
  ]);


  /* =========================================================
     VIEW CERTIFICATE
     
     IMPORTANT:
     We deliberately use the existing CertificateViewer.
     It already has the working "Download / Print PDF"
     functionality.
  ========================================================== */

  const handleViewCertificate = (
    certificate
  ) => {

    if (!certificate) {
      return;
    }

    if (onViewCertificate) {

      onViewCertificate(
        certificate
      );
    }
  };


  /* =========================================================
     DOWNLOAD
     
     The existing CertificateViewer is responsible for
     printing/downloading the certificate.
     
     Therefore the Download button opens the exact selected
     certificate in the existing viewer.
  ========================================================== */

  const handleDownload = (
    certificate
  ) => {

    if (!certificate) {
      return;
    }

    if (onViewCertificate) {

      onViewCertificate(
        certificate
      );
    }
  };


  /* =========================================================
     LOADING
  ========================================================== */

  if (
    loading ||
    isLoading
  ) {

    return (
      <div
        style={{
          minHeight: '420px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >

        <div
          style={{
            textAlign: 'center',
            color: '#64748b'
          }}
        >

          <RefreshCw
            style={{
              width: 30,
              height: 30,
              margin: '0 auto 1rem',
              animation:
                'spin 1s linear infinite'
            }}
          />

          <div
            style={{
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            Loading your certificates...
          </div>

        </div>

      </div>
    );
  }


  /* =========================================================
     ERROR
  ========================================================== */

  if (error) {

    return (
      <div
        className="animate-fade-in"
        style={{
          background: 'white',
          border: '1px solid #fecaca',
          borderRadius: '16px',
          padding: '3rem',
          textAlign: 'center'
        }}
      >

        <FileText
          style={{
            width: 42,
            height: 42,
            margin: '0 auto 1rem',
            color: '#dc2626'
          }}
        />

        <h2
          style={{
            margin: '0 0 0.5rem',
            color: '#0f172a'
          }}
        >
          Unable to load certificates
        </h2>

        <p
          style={{
            margin: 0,
            color: '#64748b'
          }}
        >
          {error}
        </p>

      </div>
    );
  }


  /* =========================================================
     EMPTY STATE
  ========================================================== */

  if (
    !certificates ||
    certificates.length === 0
  ) {

    return (
      <div
        className="animate-fade-in"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >

        <div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#eff6ff',
              color: '#0369a1',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '0.75rem'
            }}
          >

            <ShieldCheck
              style={{
                width: 15,
                height: 15
              }}
            />

            Fairmacs Learning Credentials

          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 800,
              color: '#0f172a'
            }}
          >
            My Certificates
          </h1>

          <p
            style={{
              marginTop: '0.5rem',
              color: '#64748b'
            }}
          >
            Certificates you earn after successfully
            completing your courses will appear here.
          </p>

        </div>


        <div
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow:
              '0 4px 12px rgba(15, 23, 42, 0.05)'
          }}
        >

          <div
            style={{
              width: 72,
              height: 72,
              margin: '0 auto 1rem',
              borderRadius: '18px',
              background: '#fff1f2',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >

            <Award
              style={{
                width: 34,
                height: 34
              }}
            />

          </div>

          <h2
            style={{
              margin: '0 0 0.5rem',
              color: '#0f172a'
            }}
          >
            No certificates yet
          </h2>

          <p
            style={{
              margin: 0,
              color: '#64748b'
            }}
          >
            Complete your assigned courses and pass
            the required assessments to earn certificates.
          </p>

        </div>

      </div>
    );
  }


  /* =========================================================
     CERTIFICATE LIST
  ========================================================== */

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}
    >

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >

        <div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#eff6ff',
              color: '#0369a1',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '0.75rem'
            }}
          >

            <ShieldCheck
              style={{
                width: 15,
                height: 15
              }}
            />

            Fairmacs Learning Credentials

          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 800,
              color: '#0f172a'
            }}
          >
            My Certificates
          </h1>

          <p
            style={{
              marginTop: '0.5rem',
              color: '#64748b'
            }}
          >
            Your certificates earned through successful
            course completion.
          </p>

        </div>


        {/* Certificate count */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '0.65rem 1rem',
            fontWeight: 700
          }}
        >

          <Award
            style={{
              width: 18,
              height: 18
            }}
          />

          {certificates.length}{' '}

          {certificates.length === 1
            ? 'Certificate'
            : 'Certificates'}

        </div>

      </div>


      {/* =====================================================
          CERTIFICATE CARDS
      ====================================================== */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}
      >

        {certificates.map(
          (certificate) => {

            const certificateId =
              certificate.certificateId ||
              certificate.id;

            const courseTitle =
              certificate.courseTitle ||
              'Course Certificate';

            const score =
              certificate.score;

            const issuedDate =
              certificate.issuedDate ||
              (
                certificate.issuedAt
                  ? new Date(
                      certificate.issuedAt
                    ).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }
                    )
                  : 'N/A'
              );

            return (

              <div
                key={certificateId}
                className="glass-card"
                style={{
                  background: 'rgba(255, 255, 255, 0.78)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255, 255, 255, 0.85)',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 30px rgba(31, 70, 120, 0.07)'
                }}
              >

                {/* =========================================
                    CARD HEADER
                ========================================== */}

                <div
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(16, 42, 67, 0.95) 0%, rgba(18, 52, 90, 0.92) 100%)',
                    padding: '1.25rem',
                    color: 'white',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >

                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '12px',
                        background:
                          'rgba(255,255,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >

                      <Award
                        style={{
                          width: 25,
                          height: 25,
                          color: '#38bdf8'
                        }}
                      />

                    </div>


                    <div
                      style={{
                        flex: 1,
                        minWidth: 0
                      }}
                    >

                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#93c5fd',
                          fontWeight: 700,
                          textTransform:
                            'uppercase'
                        }}
                      >
                        Certificate
                      </div>

                      <div
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          marginTop: '0.15rem',
                          overflow: 'hidden',
                          textOverflow:
                            'ellipsis',
                          whiteSpace:
                            'nowrap'
                        }}
                        title={courseTitle}
                      >
                        {courseTitle}
                      </div>

                    </div>

                  </div>

                </div>


                {/* =========================================
                    CARD BODY
                ========================================== */}

                <div
                  style={{
                    padding: '1.25rem'
                  }}
                >

                  {/* Certificate ID */}

                  <div
                    style={{
                      marginBottom: '1rem'
                    }}
                  >

                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: '#94a3b8',
                        fontWeight: 700,
                        textTransform:
                          'uppercase',
                        marginBottom:
                          '0.25rem'
                      }}
                    >
                      Certificate ID
                    </div>

                    <div
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: '#334155',
                        wordBreak:
                          'break-all'
                      }}
                    >
                      {certificateId ||
                        'N/A'}
                    </div>

                  </div>


                  {/* Score + Issue Date */}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '1fr 1fr',
                      gap: '0.75rem',
                      marginBottom:
                        '1.25rem'
                    }}
                  >

                    <div
                      style={{
                        background:
                          '#f8fafc',
                        borderRadius:
                          '10px',
                        padding:
                          '0.75rem'
                      }}
                    >

                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '0.4rem',
                          color:
                            '#64748b',
                          fontSize:
                            '0.72rem',
                          fontWeight:
                            600
                        }}
                      >

                        <CheckCircle2
                          style={{
                            width: 14,
                            height: 14
                          }}
                        />

                        Score

                      </div>

                      <div
                        style={{
                          marginTop:
                            '0.3rem',
                          fontSize:
                            '1.05rem',
                          fontWeight:
                            800,
                          color:
                            '#166534'
                        }}
                      >
                        {score != null
                          ? `${score}%`
                          : 'Completed'}
                      </div>

                    </div>


                    <div
                      style={{
                        background:
                          '#f8fafc',
                        borderRadius:
                          '10px',
                        padding:
                          '0.75rem'
                      }}
                    >

                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '0.4rem',
                          color:
                            '#64748b',
                          fontSize:
                            '0.72rem',
                          fontWeight:
                            600
                        }}
                      >

                        <Calendar
                          style={{
                            width: 14,
                            height: 14
                          }}
                        />

                        Issued

                      </div>

                      <div
                        style={{
                          marginTop:
                            '0.3rem',
                          fontSize:
                            '0.85rem',
                          fontWeight:
                            700,
                          color:
                            '#334155'
                        }}
                      >
                        {issuedDate}
                      </div>

                    </div>

                  </div>


                  {/* Category */}

                  {certificate.courseCategory && (

                    <div
                      style={{
                        fontSize:
                          '0.78rem',
                        color:
                          '#64748b',
                        marginBottom:
                          '1rem'
                      }}
                    >

                      <strong>
                        Category:
                      </strong>{' '}

                      {certificate.courseCategory}

                    </div>

                  )}


                  {/* =======================================
                      ACTIONS
                  ======================================== */}

                  <div
                    style={{
                      display: 'flex',
                      gap: '0.65rem'
                    }}
                  >

                    {/* VIEW */}

                    <button
                      type="button"
                      onClick={() =>
                        handleViewCertificate(
                          certificate
                        )
                      }
                      style={{
                        flex: 1,
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        gap: '0.4rem',
                        border:
                          '1px solid #0284c7',
                        background:
                          '#0284c7',
                        color:
                          'white',
                        borderRadius:
                          '9px',
                        padding:
                          '0.65rem 0.75rem',
                        fontWeight:
                          700,
                        cursor:
                          'pointer'
                      }}
                    >

                      <Eye
                        style={{
                          width: 16,
                          height: 16
                        }}
                      />

                      View

                    </button>


                    {/* DOWNLOAD / PRINT */}

                    <button
                      type="button"
                      onClick={() =>
                        handleDownload(
                          certificate
                        )
                      }
                      style={{
                        flex: 1,
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        gap: '0.4rem',
                        border:
                          '1px solid #cbd5e1',
                        background:
                          'white',
                        color:
                          '#334155',
                        borderRadius:
                          '9px',
                        padding:
                          '0.65rem 0.75rem',
                        fontWeight:
                          700,
                        cursor:
                          'pointer'
                      }}
                    >

                      <FileText
                        style={{
                          width: 16,
                          height: 16
                        }}
                      />

                      Download

                    </button>

                  </div>

                </div>

              </div>

            );
          }
        )}

      </div>

    </div>
  );
}