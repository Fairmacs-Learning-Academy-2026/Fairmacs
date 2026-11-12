package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.LearningPath;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.CourseDepartmentAssignmentRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.CourseThumbnailRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LearningPathRepository;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.LessonRepository;
import com.fairmacs.lms.repository.ModuleRepository;
import com.fairmacs.lms.repository.QuizAttemptRepository;
import com.fairmacs.lms.repository.QuizProgressRepository;
import com.fairmacs.lms.repository.QuizQuestionRepository;
import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.repository.RecommendationRuleRepository;
import com.fairmacs.lms.security.SecurityContextUtil;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class DraftService {

    private final CourseRepository courseRepository;
    private final QuizRepository quizRepository;
    private final ModuleRepository moduleRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final SecurityContextUtil securityContextUtil;

    @Autowired(required = false)
    private LessonRepository lessonRepository;

    @Autowired(required = false)
    private QuizQuestionRepository questionRepository;

    @Autowired(required = false)
    private QuizProgressRepository quizProgressRepository;

    @Autowired(required = false)
    private LessonProgressRepository lessonProgressRepository;

    @Autowired(required = false)
    private CertificateRepository certificateRepository;

    @Autowired(required = false)
    private CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository;

    @Autowired(required = false)
    private CourseThumbnailRepository thumbnailRepository;

    @Autowired(required = false)
    private RecommendationRuleRepository recommendationRuleRepository;

    @Autowired(required = false)
    private LearningPathRepository learningPathRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public DraftService(
            CourseRepository courseRepository,
            QuizRepository quizRepository,
            ModuleRepository moduleRepository,
            EnrollmentRepository enrollmentRepository,
            QuizAttemptRepository quizAttemptRepository,
            SecurityContextUtil securityContextUtil) {

        this.courseRepository = courseRepository;
        this.quizRepository = quizRepository;
        this.moduleRepository = moduleRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.securityContextUtil = securityContextUtil;
    }

    public void setLessonRepository(LessonRepository lessonRepository) {
        this.lessonRepository = lessonRepository;
    }

    public void setQuestionRepository(QuizQuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    public void setQuizProgressRepository(QuizProgressRepository quizProgressRepository) {
        this.quizProgressRepository = quizProgressRepository;
    }

    public void setLessonProgressRepository(LessonProgressRepository lessonProgressRepository) {
        this.lessonProgressRepository = lessonProgressRepository;
    }

    public void setCertificateRepository(CertificateRepository certificateRepository) {
        this.certificateRepository = certificateRepository;
    }

    public void setCourseDepartmentAssignmentRepository(CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository) {
        this.courseDepartmentAssignmentRepository = courseDepartmentAssignmentRepository;
    }

    public void setThumbnailRepository(CourseThumbnailRepository thumbnailRepository) {
        this.thumbnailRepository = thumbnailRepository;
    }

    public void setRecommendationRuleRepository(RecommendationRuleRepository recommendationRuleRepository) {
        this.recommendationRuleRepository = recommendationRuleRepository;
    }

    public void setLearningPathRepository(LearningPathRepository learningPathRepository) {
        this.learningPathRepository = learningPathRepository;
    }

    public void setEntityManager(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<Course> getMyDrafts() {
        requireAuthoringPermission();
        requireUserId();
        // Both HR_ADMIN and TRAINER have equal permissions to view all drafts across all creators and departments.
        return courseRepository.findAllDrafts();
    }

    @Transactional(readOnly = true)
    public Course getMyDraft(String courseId) {
        requireAuthoringPermission();
        requireUserId();

        Course course = resolveCourse(courseId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Draft not found: " + courseId));

        if (!Boolean.TRUE.equals(course.getDraft())) {
            throw new IllegalStateException(
                    "Published courses cannot be accessed as drafts.");
        }

        if (course.getDraftPayload() == null || course.getDraftPayload().isBlank()) {
            throw new IllegalStateException(
                    "This draft has no saved payload. "
                    + "It may have been created before draft saving was enabled.");
        }

        return course;
    }

    @Transactional
    public void deleteMyDraft(String courseId) {
        requireAuthoringPermission();
        requireUserId();

        Course course = resolveCourse(courseId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Draft not found: " + courseId));

        if (!Boolean.TRUE.equals(course.getDraft())) {
            throw new IllegalStateException(
                    "Published courses cannot be deleted through draft endpoints.");
        }

        deleteDraftSafely(course);
    }

    /**
     * Deletes all unpublished drafts that have no learning history.
     * Checks every draft before deleting any, so a blocked draft
     * cannot cause a partial cleanup.
     */
    @Transactional
    public int cleanupMyDrafts() {
        requireAuthoringPermission();
        requireUserId();

        List<Course> drafts = courseRepository.findAllDrafts();

        // Validate the whole batch first.
        for (Course draft : drafts) {
            ensureNoLearningHistory(draft);
        }

        for (Course draft : drafts) {
            deleteDraftRecords(draft);
        }

        return drafts.size();
    }

    private Optional<Course> resolveCourse(String courseId) {
        if (courseId == null || courseId.isBlank()) {
            return Optional.empty();
        }
        String trimmed = courseId.trim();
        Optional<Course> found = courseRepository.findByCourseId(trimmed);
        if (found.isPresent()) {
            return found;
        }
        Optional<Course> draftById = courseRepository.findDraftByCourseId(trimmed);
        if (draftById.isPresent()) {
            return draftById;
        }
        try {
            Long numericId = Long.parseLong(trimmed);
            return courseRepository.findById(numericId);
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }

    private void deleteDraftSafely(Course draft) {
        // Never delete a published course, even if it is inactive.
        if (!Boolean.TRUE.equals(draft.getDraft())) {
            throw new IllegalStateException(
                    "Only explicitly marked drafts can be deleted.");
        }

        ensureNoLearningHistory(draft);
        deleteDraftRecords(draft);
    }

    private void ensureNoLearningHistory(Course draft) {
        if (!Boolean.TRUE.equals(draft.getDraft())) {
            throw new IllegalStateException(
                    "Only explicitly marked drafts can be deleted.");
        }

        if (certificateRepository != null && draft.getId() != null
                && certificateRepository.existsByCourse_Id(draft.getId())) {
            throw new IllegalStateException(
                    "Draft cannot be deleted because certificates exist: "
                            + draft.getCourseId());
        }

        if (enrollmentRepository.existsByCourse_Id(draft.getId())) {
            throw new IllegalStateException(
                    "Draft cannot be deleted because enrollment records exist: "
                            + draft.getCourseId());
        }

        List<Quiz> quizzes = quizRepository.findByCourseId(draft.getId());

        for (Quiz quiz : quizzes) {
            if (quizAttemptRepository.existsByQuizId(quiz.getId())) {
                throw new IllegalStateException(
                        "Draft cannot be deleted because quiz attempts exist: "
                                + draft.getCourseId());
            }
        }
    }

    private void deleteDraftRecords(Course draft) {
        Long courseDbId = draft.getId();

        if (courseDbId != null) {
            if (entityManager != null) {
                entityManager.clear();
            }

            // 1. Remove from Learning Paths if present
            if (learningPathRepository != null) {
                try {
                    learningPathRepository.deleteItemsByCourseId(courseDbId);
                } catch (Exception ignored) {
                    List<LearningPath> paths = learningPathRepository.findAllWithItems();
                    for (LearningPath path : paths) {
                        if (path.getItems() != null) {
                            boolean modified = path.getItems().removeIf(
                                    item -> item.getCourse() != null && courseDbId.equals(item.getCourse().getId()));
                            if (modified) {
                                learningPathRepository.save(path);
                            }
                        }
                    }
                }
            }

            // 2. Remove Recommendation Rules
            if (recommendationRuleRepository != null) {
                recommendationRuleRepository.deleteByCourseId(courseDbId);
            }

            // 3. Remove Course Thumbnails
            if (thumbnailRepository != null) {
                thumbnailRepository.deleteByCourseId(courseDbId);
            }

            // 4. Remove Department Assignments
            if (courseDepartmentAssignmentRepository != null) {
                courseDepartmentAssignmentRepository.deleteByCourse_Id(courseDbId);
            }

            // 5. Remove Lesson Progress if any
            if (lessonProgressRepository != null) {
                lessonProgressRepository.deleteByCourseId(courseDbId);
            }

            // 6. Remove Quiz Progress & Quiz Questions
            if (quizProgressRepository != null) {
                quizProgressRepository.deleteByCourseId(courseDbId);
            }
            if (questionRepository != null) {
                questionRepository.deleteByCourseId(courseDbId);
            }

            // 7. Remove Quizzes
            List<Quiz> quizzes = quizRepository.findByCourseId(courseDbId);
            if (!quizzes.isEmpty()) {
                quizRepository.deleteAll(quizzes);
            }
            quizRepository.deleteByCourseId(courseDbId);

            // 8. Remove Lessons & Modules
            if (lessonRepository != null) {
                lessonRepository.deleteByCourseId(courseDbId);
            }
            if (moduleRepository != null) {
                moduleRepository.deleteByCourseId(courseDbId);
            }

            if (entityManager != null) {
                entityManager.clear();
            }
        } else {
            List<Quiz> quizzes = quizRepository.findByCourseId(draft.getId());
            quizRepository.deleteAll(quizzes);
        }

        courseRepository.delete(draft);
        if (courseDbId != null) {
            courseRepository.deleteCourseById(courseDbId);
        }
        if (entityManager != null) {
            entityManager.clear();
        }
    }

    private Long requireUserId() {
        Long userId = securityContextUtil.getCurrentUserId();

        if (userId == null) {
            throw new AccessDeniedException(
                    "Unable to identify the authenticated user.");
        }

        return userId;
    }

    private void requireAuthoringPermission() {
        String role = securityContextUtil.getCurrentUserRole();

        if (!hasRole(role, Role.HR_ADMIN.name())
                && !hasRole(role, Role.TRAINER.name())) {
            throw new AccessDeniedException(
                    "Only Trainers and HR Admins can manage drafts.");
        }
    }

    private boolean hasRole(String actualRole, String expectedRole) {
        if (actualRole == null) return false;
        String normalized = actualRole.trim();
        if (normalized.regionMatches(true, 0, "ROLE_", 0, 5)) {
            normalized = normalized.substring(5);
        }
        return expectedRole.equalsIgnoreCase(normalized);
    }
}
