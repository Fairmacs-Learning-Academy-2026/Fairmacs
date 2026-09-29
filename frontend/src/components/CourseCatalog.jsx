import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Clock,
  Star,
  PlayCircle,
  Eye,
  ArrowUpDown
} from 'lucide-react';

import { courseService } from '../services/courseService';
import { enrollmentService } from '../services/enrollmentService';

export default function CourseCatalog({
  onSelectCourse,
  onOpenCourseDetails
}) {
  const [courses, setCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] =
    useState('All Categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('POPULAR');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);

  /*
   * Load courses from Spring Boot / MySQL
   */
  useEffect(() => {
    let mounted = true;

    const loadCourses = async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }
        setError(null);

        const data = await courseService.getAllCourses();

        if (!mounted) return;

        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load courses:', err);

        if (mounted) {
          setError('Unable to load courses from the server.');
        }
      } finally {
        if (mounted && showLoader) {
          setLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Build category list from actual backend courses.
   * This avoids depending on mockData.js.
   */
  const courseCategories = useMemo(() => {
    const categories = courses
      .map((course) => course.category)
      .filter(Boolean);

    return [
      'All Categories',
      ...Array.from(new Set(categories))
    ];
  }, [courses]);

  /*
   * Filter + Search + Sort
   */
  const filteredCourses = useMemo(() => {
    return courses
      .filter((course) => {
        const category =
          course.category || '';

        const title =
          course.title || '';

        const description =
          course.description || '';

        const courseId =
          course.id ||
          course.courseId ||
          '';

        const matchesCategory =
          selectedCategory === 'All Categories' ||
          category === selectedCategory;

        const search =
          searchTerm.trim().toLowerCase();

        const matchesSearch =
          !search ||
          title.toLowerCase().includes(search) ||
          description.toLowerCase().includes(search) ||
          courseId.toLowerCase().includes(search) ||
          category.toLowerCase().includes(search);

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'RATING') {
          return (
            Number(b.rating || 0) -
            Number(a.rating || 0)
          );
        }

        if (sortBy === 'DURATION') {
          const durationA =
            parseFloat(
              String(a.duration || '0')
                .replace(/[^\d.]/g, '')
            ) || 0;

          const durationB =
            parseFloat(
              String(b.duration || '0')
                .replace(/[^\d.]/g, '')
            ) || 0;

          return durationA - durationB;
        }

        return (
          Number(b.enrolledCount || 0) -
          Number(a.enrolledCount || 0)
        );
      });
  }, [
    courses,
    selectedCategory,
    searchTerm,
    sortBy
  ]);

  /*
   * Enroll first, then launch.
   *
   * Before enrollment the catalog shows "Enroll Course".
   * After successful enrollment the course is refreshed from
   * the backend and shows "Launch Course".
   */
  const handleCourseAction = async (course) => {
    const courseId = course.dbId ?? course.id ?? course.courseId;
    const isEnrolled = Boolean(
      course.enrollmentDbId ||
      course.enrollmentStatus
    );

    if (isEnrolled) {
      onSelectCourse(course);
      return;
    }

    if (!courseId || enrollingCourseId === courseId) {
      return;
    }

    try {
      setEnrollingCourseId(courseId);

      const result = await enrollmentService.enrollInCourse(courseId);

      if (!result || result.success === false) {
        throw new Error(
          result?.error || 'Unable to enroll in this course.'
        );
      }

      // Refresh the catalog so the backend enrollment state
      // becomes the source of truth for the button.
      const refreshedCourses = await courseService.getAllCourses();
      const nextCourses = Array.isArray(refreshedCourses)
        ? refreshedCourses
        : [];

      setCourses(nextCourses);

      // Tell the employee dashboard to refresh its learning data.
      window.dispatchEvent(
        new CustomEvent('lms:enrollment-updated')
      );

      const refreshedCourse = nextCourses.find(
        (item) =>
          String(item.dbId ?? item.id ?? item.courseId) ===
          String(courseId)
      );

      onSelectCourse(refreshedCourse || course);
    } catch (err) {
      console.error('Enrollment error:', err);
      alert(
        err.message ||
        'Unable to enroll in this course.'
      );
    } finally {
      setEnrollingCourseId(null);
    }
  };


  /*
   * Loading
   */
  if (loading) {
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
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#0f172a'
            }}
          >
            Explore Fairmacs Course Catalog
          </h1>

          <p
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              marginTop: '0.2rem'
            }}
          >
            Browse international logistics SOPs, freight forwarding
            certifications, customs clearance manuals, and soft skills tracks.
          </p>
        </div>

        <div
          style={{
            background: 'white',
            padding: '3rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            color: '#64748b'
          }}
        >
          Loading courses...
        </div>
      </div>
    );
  }

  /*
   * Error
   */
  if (error) {
    return (
      <div
        className="animate-fade-in"
        style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #fecaca',
          padding: '3rem',
          textAlign: 'center'
        }}
      >
        <h2
          style={{
            color: '#b91c1c',
            fontSize: '1.1rem',
            fontWeight: 800
          }}
        >
          Unable to Load Courses
        </h2>

        <p
          style={{
            color: '#64748b',
            marginTop: '0.5rem'
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}
    >

      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            color: '#0f172a'
          }}
        >
          Explore Fairmacs Course Catalog
        </h1>

        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            marginTop: '0.2rem'
          }}
        >
          Browse international logistics SOPs, freight forwarding
          certifications, customs clearance manuals, and soft skills tracks.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          background: 'white',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >

          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              minWidth: '280px'
            }}
          >
            <Search
              style={{
                position: 'absolute',
                left: 12,
                top: 11,
                width: 18,
                height: 18,
                color: '#94a3b8'
              }}
            />

            <input
              type="text"
              placeholder="Search courses by name, ID, or keywords..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              style={{
                width: '100%',
                paddingLeft: '2.4rem',
                paddingRight: '1rem',
                paddingTop: '0.6rem',
                paddingBottom: '0.6rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Sorting Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <ArrowUpDown
              style={{
                width: 16,
                height: 16,
                color: '#64748b'
              }}
            />

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value)
              }
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#334155',
                fontWeight: 600,
                background: 'white'
              }}
            >
              <option value="POPULAR">
                Most Popular
              </option>

              <option value="RATING">
                Highest Rated
              </option>

              <option value="DURATION">
                Duration (Shortest first)
              </option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.2rem'
          }}
        >
          <Filter
            style={{
              width: 16,
              height: 16,
              color: '#64748b',
              flexShrink: 0
            }}
          />

          {courseCategories.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setSelectedCategory(cat)
              }
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background:
                  selectedCategory === cat
                    ? '#0f172a'
                    : '#f1f5f9',
                color:
                  selectedCategory === cat
                    ? 'white'
                    : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Course Cards Grid */}
      {filteredCourses.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {filteredCourses.map((course) => {
            const courseId =
              course.id ||
              course.courseId;

            const moduleCount =
              course.modules?.length ||
              course.moduleCount ||
              0;

            const isMandatory =
              course.assignmentType === 'MANDATORY' ||
              course.foundation === true ||
              course.mandatoryFor?.length > 0;

            return (
              <div
                key={courseId}
                className="course-card"
              >

                {/* Course Banner */}
                <div
                  style={{
                    position: 'relative'
                  }}
                >
                  <img
                    src={
                      course.banner ||
                      'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=900&q=80'
                    }
                    alt={course.title}
                    className="course-banner"
                  />

                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background:
                        'rgba(15,23,42,0.85)',
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px'
                    }}
                  >
                    {courseId}
                  </span>
                </div>

                <div className="course-card-content">

                  {/* Category + Mandatory */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                      gap: '0.5rem'
                    }}
                  >
                    <span className="course-category-badge">
                      {course.category || 'General'}
                    </span>

                    {isMandatory && (
                      <span className="badge-mandatory">
                        Mandatory
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    className="course-title"
                    style={{
                      cursor: 'pointer'
                    }}
                    onClick={() =>
                      onOpenCourseDetails(course)
                    }
                  >
                    {course.title}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: '#64748b',
                      lineHeight: 1.45,
                      marginBottom: '1.25rem'
                    }}
                  >
                    {course.description ||
                      'Fairmacs learning course.'}
                  </p>

                  {/* Course Meta */}
                  <div className="course-meta">

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Clock
                        style={{
                          width: 14,
                          height: 14
                        }}
                      />

                      {course.duration ||
                        `${course.durationHours || 0} Hours`}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: '#d97706',
                        fontWeight: 700
                      }}
                    >
                      <Star
                        style={{
                          width: 14,
                          height: 14,
                          fill: '#d97706'
                        }}
                      />

                      {course.rating || '—'}
                    </div>

                    <div
                      style={{
                        marginLeft: 'auto',
                        fontWeight: 600,
                        color: '#0f172a'
                      }}
                    >
                      {moduleCount}{' '}
                      {moduleCount === 1
                        ? 'Module'
                        : 'Modules'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      marginTop: '1rem'
                    }}
                  >
                    <button
                      className="btn-primary"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        opacity:
                          enrollingCourseId ===
                          (course.dbId ?? course.id ?? course.courseId)
                            ? 0.7
                            : 1,
                        cursor:
                          enrollingCourseId ===
                          (course.dbId ?? course.id ?? course.courseId)
                            ? 'wait'
                            : 'pointer'
                      }}
                      disabled={
                        enrollingCourseId ===
                        (course.dbId ?? course.id ?? course.courseId)
                      }
                      onClick={() =>
                        handleCourseAction(course)
                      }
                    >
                      <PlayCircle
                        style={{
                          width: 16,
                          height: 16
                        }}
                      />

                      {enrollingCourseId ===
                      (course.dbId ?? course.id ?? course.courseId)
                        ? 'Enrolling...'
                        : (
                          course.enrollmentDbId ||
                          course.enrollmentStatus
                        )
                          ? 'Launch Course'
                          : 'Enroll Course'}
                    </button>

                    <button
                      className="btn-secondary"
                      style={{
                        padding:
                          '0.5rem 0.75rem',
                        fontSize: '0.78rem'
                      }}
                      onClick={() =>
                        onOpenCourseDetails(course)
                      }
                    >
                      <Eye
                        style={{
                          width: 16,
                          height: 16
                        }}
                      />

                      Overview
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '3rem',
            textAlign: 'center',
            color: '#64748b'
          }}
        >
          <BookOpenIcon />

          <h3
            style={{
              color: '#334155',
              fontWeight: 800,
              marginTop: '0.75rem'
            }}
          >
            No courses found
          </h3>

          <p
            style={{
              fontSize: '0.85rem',
              marginTop: '0.25rem'
            }}
          >
            Try changing your search or category filter.
          </p>
        </div>
      )}
    </div>
  );
}

function BookOpenIcon() {
  return (
    <div
      style={{
        fontSize: '2rem',
        opacity: 0.5
      }}
    >
      📚
    </div>
  );
}