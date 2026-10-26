
package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.ModuleRepository;
import com.fairmacs.lms.repository.QuizAttemptRepository;
import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.security.SecurityContextUtil;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DraftService {

    private final CourseRepository courseRepository;
    private final QuizRepository quizRepository;
    private final ModuleRepository moduleRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final SecurityContextUtil securityContextUtil;

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

    @Transactional(readOnly = true)
    public List<Course> getMyDrafts() {
        requireAuthoringPermission();
        Long userId = requireUserId();
        return courseRepository.findDraftsByOwnerId(userId);
    }

    @Transactional(readOnly = true)
    public Course getMyDraft(String courseId) {
        requireAuthoringPermission();
        Long userId = requireUserId();

        Course draft = courseRepository.findOwnedDraft(courseId, userId)
            .orElseThrow(() -> new IllegalArgumentException(
                    "Draft not found or you do not own this draft."));

        if (draft.getDraftPayload() == null || draft.getDraftPayload().isBlank()) {
            throw new IllegalStateException(
                "This draft has no saved payload. "
                + "It may have been created before draft saving was enabled.");
        }

        return draft;
    }

    @Transactional
    public void deleteMyDraft(String courseId) {
        requireAuthoringPermission();

        Long userId = requireUserId();

        Course draft = courseRepository.findOwnedDraft(courseId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Draft not found or you do not own this draft."));

        deleteDraftSafely(draft);
    }

    /**
     * Deletes only the authenticated user's drafts.
     * Checks every draft before deleting any, so a blocked draft
     * cannot cause a partial cleanup.
     */
    @Transactional
    public int cleanupMyDrafts() {
        requireAuthoringPermission();

        Long userId = requireUserId();
        List<Course> drafts = courseRepository.findDraftsByOwnerId(userId);

        // Validate the whole batch first.
        for (Course draft : drafts) {
            ensureNoLearningHistory(draft);
        }

        for (Course draft : drafts) {
            deleteDraftRecords(draft);
        }

        return drafts.size();
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
                    "Cleanup may delete only explicitly marked drafts.");
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
        
        // Delete quizzes first. Their questions use the quiz cascade.
        List<Quiz> quizzes = quizRepository.findByCourseId(draft.getId());
        quizRepository.deleteAll(quizzes);

        // Course -> Module -> Lesson uses the existing cascade.
        courseRepository.delete(draft);
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

        if (!Role.HR_ADMIN.name().equalsIgnoreCase(role)
                && !Role.TRAINER.name().equalsIgnoreCase(role)) {
            throw new AccessDeniedException(
                    "Only Trainers and HR Admins can manage drafts.");
        }
    }
}
