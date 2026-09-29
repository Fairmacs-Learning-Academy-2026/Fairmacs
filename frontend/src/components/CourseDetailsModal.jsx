import React, { useState } from 'react';
import {
  X,
  Clock,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  FileText,
  ArrowRight
} from 'lucide-react';

export default function CourseDetailsModal({
  course,
  onClose,
  onStartLearning
}) {
  const [expandedModules, setExpandedModules] = useState({});

  if (!course) return null;

  const modules = Array.isArray(course.modules)
    ? course.modules
    : [];

  const totalLessons = modules.reduce(
    (acc, module) =>
      acc +
      (Array.isArray(module.lessons)
        ? module.lessons.length
        : 0),
    0
  );

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '840px',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Course Banner */}
        <div
          style={{
            position: 'relative',
            height: '220px',
            overflow: 'hidden'
          }}
        >
          <img
            src={course.banner}
            alt={course.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(15,23,42,0.92) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.5rem',
              color: 'white'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span
                className="course-category-badge"
                style={{
                  background: '#0284c7',
                  color: 'white'
                }}
              >
                {course.category}
              </span>

              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '0.4rem',
                  borderRadius: '50%',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#38bdf8',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                Course Code: {course.id}
              </div>

              <h1
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  marginTop: '0.2rem',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                {course.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.75rem',
            maxHeight: '65vh',
            overflowY: 'auto'
          }}
        >
          {/* Metadata */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              background: '#f8fafc',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.5rem'
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
                  background: '#e0f2fe',
                  color: '#0284c7',
                  padding: '0.5rem',
                  borderRadius: '8px'
                }}
              >
                <Clock style={{ width: 20, height: 20 }} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#64748b',
                    fontWeight: 600
                  }}
                >
                  Duration
                </div>

                <div
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                >
                  {course.duration || 'N/A'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div
                style={{
                  background: '#fef3c7',
                  color: '#d97706',
                  padding: '0.5rem',
                  borderRadius: '8px'
                }}
              >
                <BookOpen style={{ width: 20, height: 20 }} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#64748b',
                    fontWeight: 600
                  }}
                >
                  Level
                </div>

                <div
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                >
                  {course.level || 'Beginner'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div
                style={{
                  background: '#dcfce7',
                  color: '#16a34a',
                  padding: '0.5rem',
                  borderRadius: '8px'
                }}
              >
                <Award style={{ width: 20, height: 20 }} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#64748b',
                    fontWeight: 600
                  }}
                >
                  Modules
                </div>

                <div
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                >
                  {modules.length} Modules ({totalLessons} Lessons)
                </div>
              </div>
            </div>
          </div>

          {/* Launch Button */}
          <div style={{ marginBottom: '1.75rem' }}>
            <button
              className="btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '1rem',
                justifyContent: 'center',
                background:
                  'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                boxShadow:
                  '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}
              onClick={() => onStartLearning(course)}
            >
              <PlayCircle
                style={{
                  width: 20,
                  height: 20
                }}
              />

              Continue / Launch Learning Player

              <ArrowRight
                style={{
                  width: 18,
                  height: 18
                }}
              />
            </button>
          </div>

          {/* Course Overview */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '0.5rem'
              }}
            >
              Course Overview
            </h3>

            <p
              style={{
                color: '#475569',
                fontSize: '0.92rem',
                lineHeight: 1.6
              }}
            >
              {course.description ||
                'This course provides structured Fairmacs training content.'}
            </p>
          </div>

          {/* What You'll Learn */}
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              padding: '1.25rem',
              borderRadius: '12px',
              marginBottom: '1.75rem'
            }}
          >
            <h3
              style={{
                fontSize: '0.98rem',
                fontWeight: 800,
                color: '#0369a1',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <CheckCircle2
                style={{
                  width: 18,
                  height: 18
                }}
              />

              What You'll Learn
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem'
              }}
            >
              {(course.outlines || [
                'Freight forwarding fundamentals & global logistics',
                'Shipment lifecycle from origin to destination',
                'Key documentation and operational procedures',
                'Transportation modes and logistics operations'
              ]).map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    fontSize: '0.88rem',
                    color: '#0c4a6e'
                  }}
                >
                  <span
                    style={{
                      color: '#0284c7',
                      fontWeight: 800
                    }}
                  >
                    ✓
                  </span>

                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Curriculum */}
          <div>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '1rem'
              }}
            >
              Course Content Curriculum
            </h3>

            {modules.length === 0 ? (
              <div
                style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  color: '#64748b',
                  textAlign: 'center'
                }}
              >
                Course modules will be loaded when you launch the course.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                {modules.map((module, index) => {
                  const moduleId =
                    module.id || module.moduleId || index;

                  const lessons = Array.isArray(module.lessons)
                    ? module.lessons
                    : [];

                  const isOpen =
                    expandedModules[moduleId] ?? true;

                  return (
                    <div
                      key={moduleId}
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        overflow: 'hidden'
                      }}
                    >
                      <button
                        onClick={() =>
                          toggleModule(moduleId)
                        }
                        style={{
                          width: '100%',
                          padding: '0.85rem 1.1rem',
                          background: '#f8fafc',
                          border: 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: '#0f172a',
                          cursor: 'pointer'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <span>{module.title}</span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.8rem',
                            color: '#64748b'
                          }}
                        >
                          <span>
                            {lessons.length} Lessons
                          </span>

                          {isOpen ? (
                            <ChevronUp
                              style={{
                                width: 16,
                                height: 16
                              }}
                            />
                          ) : (
                            <ChevronDown
                              style={{
                                width: 16,
                                height: 16
                              }}
                            />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem'
                          }}
                        >
                          {lessons.map((lesson, lessonIndex) => (
                            <div
                              key={
                                lesson.id ||
                                lesson.lessonId ||
                                lessonIndex
                              }
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.5rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#334155'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.6rem'
                                }}
                              >
                                {lesson.type === 'video' ? (
                                  <PlayCircle
                                    style={{
                                      width: 15,
                                      height: 15,
                                      color: '#0284c7'
                                    }}
                                  />
                                ) : (
                                  <FileText
                                    style={{
                                      width: 15,
                                      height: 15,
                                      color: '#16a34a'
                                    }}
                                  />
                                )}

                                <span>{lesson.title}</span>
                              </div>

                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#64748b'
                                }}
                              >
                                {lesson.duration}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}