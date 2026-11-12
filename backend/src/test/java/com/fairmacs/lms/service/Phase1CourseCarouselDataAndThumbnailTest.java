package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Phase 1: Course Carousel Data & Thumbnail Test Suite")
class Phase1CourseCarouselDataAndThumbnailTest {

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private ModuleRepository moduleRepository;

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private CourseThumbnailRepository courseThumbnailRepository;

    private CourseMapper courseMapper;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        courseMapper = new CourseMapper(
                objectMapper,
                quizRepository,
                moduleRepository,
                lessonRepository,
                courseThumbnailRepository
        );
    }

    // 1. Course with custom thumbnail
    @Test
    @DisplayName("1. Course with custom thumbnail preserves custom URL across banner, thumbnailUrl, thumbnail")
    void testCourseWithCustomThumbnail() {
        Course course = new Course();
        course.setId(101L);
        course.setCourseId("CRS-CUSTOM");
        course.setTitle("Custom Logistics");
        course.setBanner("https://images.fairmacs.com/custom-thumb.png");

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");

        assertEquals("https://images.fairmacs.com/custom-thumb.png", dto.getBanner());
        assertEquals("https://images.fairmacs.com/custom-thumb.png", dto.getThumbnailUrl());
        assertEquals("https://images.fairmacs.com/custom-thumb.png", dto.getThumbnail());
    }

    // 2. Course without custom thumbnail
    @Test
    @DisplayName("2. Course without custom thumbnail falls back to thumbnail repository if stored, or null for default mapping")
    void testCourseWithoutCustomThumbnail() {
        Course course = new Course();
        course.setId(102L);
        course.setCourseId("CRS-NO-THUMB");
        course.setTitle("Standard Shipping");
        course.setBanner(null);

        when(courseThumbnailRepository.findTopByCourseIdOrderByCreatedAtDesc(102L)).thenReturn(Optional.empty());

        CourseDTO dto = courseMapper.toSummary(course, null, "RECOMMENDED");

        assertNull(dto.getBanner());
        assertNull(dto.getThumbnailUrl());
        assertNull(dto.getThumbnail());
    }

    // 3. Missing or unavailable thumbnail in course row but present in repository
    @Test
    @DisplayName("3. Course with missing banner in course entity but present in thumbnail repository resolves proxy path")
    void testCourseWithBannerInThumbnailRepository() {
        Course course = new Course();
        course.setId(103L);
        course.setCourseId("CRS-REPO-THUMB");
        course.setTitle("Warehouse Safety");
        course.setBanner(null);

        CourseThumbnail thumb = new CourseThumbnail();
        thumb.setStorageId("3f5a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c");
        thumb.setFilename("warehouse.png");
        when(courseThumbnailRepository.findTopByCourseIdOrderByCreatedAtDesc(103L)).thenReturn(Optional.of(thumb));

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");

        assertEquals("/api/courses/thumbnails/3f5a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c", dto.getBanner());
        assertEquals("/api/courses/thumbnails/3f5a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c", dto.getThumbnailUrl());
        assertEquals("/api/courses/thumbnails/3f5a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c", dto.getThumbnail());
    }

    // 4. Course with multiple modules
    @Test
    @DisplayName("4. Course with multiple modules returns accurate module count from repository")
    void testCourseWithMultipleModules() {
        Course course = new Course();
        course.setId(201L);
        course.setCourseId("CRS-MULTI-MOD");

        when(moduleRepository.countByCourseId(201L)).thenReturn(4L);
        when(lessonRepository.countByModuleCourseId(201L)).thenReturn(16L);

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");

        assertEquals(4, dto.getModuleCount());
        assertEquals(16, dto.getLessonCount());
    }

    // 5. Course with modules containing video lessons
    @Test
    @DisplayName("5. Course with modules containing video lessons reflects actual lesson count")
    void testCourseWithVideoLessons() {
        Course course = new Course();
        course.setId(202L);
        course.setCourseId("CRS-VIDEO-ONLY");

        when(moduleRepository.countByCourseId(202L)).thenReturn(2L);
        when(lessonRepository.countByModuleCourseId(202L)).thenReturn(8L);

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");

        assertEquals(2, dto.getModuleCount());
        assertEquals(8, dto.getLessonCount());
    }

    // 6. Course with PDF lessons
    @Test
    @DisplayName("6. Course with PDF lessons reflects actual lesson count")
    void testCourseWithPdfLessons() {
        Course course = new Course();
        course.setId(203L);
        course.setCourseId("CRS-PDF-ONLY");

        when(moduleRepository.countByCourseId(203L)).thenReturn(1L);
        when(lessonRepository.countByModuleCourseId(203L)).thenReturn(5L);

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");

        assertEquals(1, dto.getModuleCount());
        assertEquals(5, dto.getLessonCount());
    }

    // 7. Course with mixed video and PDF lessons
    @Test
    @DisplayName("7. Course with mixed video and PDF lessons counts all valid lessons across modules")
    void testCourseWithMixedVideoAndPdfLessons() {
        Course course = new Course();
        course.setId(204L);
        course.setCourseId("IMP-FND-001");

        // Module 1: 2 Video + 1 PDF = 3
        // Module 2: 1 Video + 1 PDF = 2
        // Total = 2 Modules, 5 Lessons
        when(moduleRepository.countByCourseId(204L)).thenReturn(2L);
        when(lessonRepository.countByModuleCourseId(204L)).thenReturn(5L);

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");

        assertEquals(2, dto.getModuleCount());
        assertEquals(5, dto.getLessonCount());
    }

    // 8. Course with zero modules
    @Test
    @DisplayName("8. Course with zero modules returns 0 modules and 0 lessons")
    void testCourseWithZeroModules() {
        Course course = new Course();
        course.setId(205L);
        course.setCourseId("CRS-ZERO-MOD");

        when(moduleRepository.countByCourseId(205L)).thenReturn(0L);
        when(lessonRepository.countByModuleCourseId(205L)).thenReturn(0L);

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");

        assertEquals(0, dto.getModuleCount());
        assertEquals(0, dto.getLessonCount());
    }

    // 9. Course with modules but zero lessons
    @Test
    @DisplayName("9. Course with modules but zero lessons returns actual module count and 0 lessons")
    void testCourseWithModulesButZeroLessons() {
        Course course = new Course();
        course.setId(206L);
        course.setCourseId("CRS-MODS-NO-LESSONS");

        when(moduleRepository.countByCourseId(206L)).thenReturn(3L);
        when(lessonRepository.countByModuleCourseId(206L)).thenReturn(0L);

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");

        assertEquals(3, dto.getModuleCount());
        assertEquals(0, dto.getLessonCount());
    }

    // 10. Correct duration conversion across specification table
    @Test
    @DisplayName("10. Correct duration conversion according to official specification")
    void testCorrectDurationConversion() {
        Course c1 = new Course();
        c1.setDurationHours(0.5);
        assertEquals("30 min", courseMapper.toSummary(c1, null, "MANDATORY").getDuration());

        Course c2 = new Course();
        c2.setDurationHours(1.0);
        assertEquals("1 hour", courseMapper.toSummary(c2, null, "MANDATORY").getDuration());

        Course c3 = new Course();
        c3.setDurationHours(1.5);
        assertEquals("1 hour 30 min", courseMapper.toSummary(c3, null, "MANDATORY").getDuration());

        Course c4 = new Course();
        c4.setDurationHours(2.0);
        assertEquals("2 hours", courseMapper.toSummary(c4, null, "MANDATORY").getDuration());

        Course c5 = new Course();
        c5.setDurationHours(2.5);
        assertEquals("2 hours 30 min", courseMapper.toSummary(c5, null, "MANDATORY").getDuration());

        Course c6 = new Course();
        c6.setDurationHours(3.0);
        assertEquals("3 hours", courseMapper.toSummary(c6, null, "MANDATORY").getDuration());
    }

    // 11. Null duration
    @Test
    @DisplayName("11. Null duration returns Self-paced")
    void testNullDuration() {
        Course course = new Course();
        course.setDuration(null);
        course.setDurationHours(null);

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");
        assertEquals("Self-paced", dto.getDuration());
    }

    // 12. Invalid duration strings (such as 'a', 'null', 'undefined', 'nan', '-')
    @Test
    @DisplayName("12. Malformed duration strings like 'a' are safely sanitized to Self-paced")
    void testInvalidDurationStrings() {
        Course cA = new Course();
        cA.setDuration("a");
        cA.setDurationHours(null);
        assertEquals("Self-paced", courseMapper.toSummary(cA, null, "MANDATORY").getDuration());

        Course cUpperA = new Course();
        cUpperA.setDuration("A");
        cUpperA.setDurationHours(null);
        assertEquals("Self-paced", courseMapper.toSummary(cUpperA, null, "MANDATORY").getDuration());

        Course cNullStr = new Course();
        cNullStr.setDuration("null");
        cNullStr.setDurationHours(null);
        assertEquals("Self-paced", courseMapper.toSummary(cNullStr, null, "MANDATORY").getDuration());

        Course cNan = new Course();
        cNan.setDuration("NaN");
        cNan.setDurationHours(null);
        assertEquals("Self-paced", courseMapper.toSummary(cNan, null, "MANDATORY").getDuration());

        Course cDash = new Course();
        cDash.setDuration("-");
        cDash.setDurationHours(null);
        assertEquals("Self-paced", courseMapper.toSummary(cDash, null, "MANDATORY").getDuration());
    }

    // 13. Course summary metadata consistency
    @Test
    @DisplayName("13. Course summary metadata preserves id, title, position, department, and outcomes")
    void testCourseSummaryMetadataConsistency() {
        Course course = new Course();
        course.setId(301L);
        course.setCourseId("OP008");
        course.setTitle("Customs & Border Operations");
        course.setLevel("P1");
        course.setDescription("Comprehensive operational curriculum.");
        course.setDurationHours(1.5);
        course.setBanner("https://images.fairmacs.com/custom.jpg");

        Department dept = new Department();
        dept.setId(10L);
        dept.setName("Operations");
        course.setOwningDepartment(dept);

        when(moduleRepository.countByCourseId(301L)).thenReturn(3L);
        when(lessonRepository.countByModuleCourseId(301L)).thenReturn(9L);

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");

        assertEquals(301L, dto.getDbId());
        assertEquals("OP008", dto.getId());
        assertEquals("Customs & Border Operations", dto.getTitle());
        assertEquals("Operations", dto.getDepartment());
        assertEquals("P1", dto.getPosition());
        assertEquals("1 hour 30 min", dto.getDuration());
        assertEquals(3, dto.getModuleCount());
        assertEquals(9, dto.getLessonCount());
        assertEquals("https://images.fairmacs.com/custom.jpg", dto.getBanner());
        assertEquals("https://images.fairmacs.com/custom.jpg", dto.getThumbnailUrl());
        assertEquals("https://images.fairmacs.com/custom.jpg", dto.getThumbnail());
    }

    // 14. Employee assigned-course metadata with enrollment progress and due dates
    @Test
    @DisplayName("14. Employee assigned-course metadata correctly reflects enrollment state and progress")
    void testEmployeeAssignedCourseMetadata() {
        Course course = new Course();
        course.setId(401L);
        course.setCourseId("IMP-FND-001");
        course.setTitle("Import Fundamentals");
        course.setDurationHours(0.5);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(901L);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollment.setProgressPercent(45);
        enrollment.setEnrollmentType(EnrollmentType.MANDATORY);
        enrollment.setDueDate(java.time.LocalDate.of(2026, 11, 20));

        when(moduleRepository.countByCourseId(401L)).thenReturn(2L);
        when(lessonRepository.countByModuleCourseId(401L)).thenReturn(5L);

        CourseDTO dto = courseMapper.toSummary(course, enrollment, "MANDATORY");

        assertEquals(401L, dto.getDbId());
        assertEquals("IMP-FND-001", dto.getId());
        assertEquals("IN_PROGRESS", dto.getEnrollmentStatus());
        assertEquals(45, dto.getProgressPercent());
        assertEquals("MANDATORY", dto.getEnrollmentType());
        assertEquals("2026-11-20", dto.getDueDate());
        assertEquals(2, dto.getModuleCount());
        assertEquals(5, dto.getLessonCount());
        assertEquals("30 min", dto.getDuration());
    }
}
