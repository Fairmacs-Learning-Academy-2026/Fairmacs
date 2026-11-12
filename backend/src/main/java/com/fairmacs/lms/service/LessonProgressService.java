package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.LessonProgressDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.LessonRepository;
import com.fairmacs.lms.repository.ModuleRepository;
import com.fairmacs.lms.repository.QuizProgressRepository;
import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class LessonProgressService {

    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final SecurityContextUtil securityContextUtil;
    private final QuizRepository quizRepository;
    private final QuizProgressRepository quizProgressRepository;
    private final NotificationService notificationService;
    private final ModuleRepository moduleRepository;

    public LessonProgressService(
            LessonProgressRepository lessonProgressRepository,
            EnrollmentRepository enrollmentRepository,
            LessonRepository lessonRepository,
            SecurityContextUtil securityContextUtil) {
        this(lessonProgressRepository, enrollmentRepository, lessonRepository, securityContextUtil, null, null, null, null);
    }

    public LessonProgressService(
            LessonProgressRepository lessonProgressRepository,
            EnrollmentRepository enrollmentRepository,
            LessonRepository lessonRepository,
            SecurityContextUtil securityContextUtil,
            QuizRepository quizRepository,
            QuizProgressRepository quizProgressRepository,
            NotificationService notificationService) {
        this(lessonProgressRepository, enrollmentRepository, lessonRepository, securityContextUtil, quizRepository, quizProgressRepository, notificationService, null);
    }

    @Autowired
    public LessonProgressService(
            LessonProgressRepository lessonProgressRepository,
            EnrollmentRepository enrollmentRepository,
            LessonRepository lessonRepository,
            SecurityContextUtil securityContextUtil,
            QuizRepository quizRepository,
            QuizProgressRepository quizProgressRepository,
            NotificationService notificationService,
            ModuleRepository moduleRepository) {

        this.lessonProgressRepository = lessonProgressRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.lessonRepository = lessonRepository;
        this.securityContextUtil = securityContextUtil;
        this.quizRepository = quizRepository;
        this.quizProgressRepository = quizProgressRepository;
        this.notificationService = notificationService;
        this.moduleRepository = moduleRepository;
    }

    @Transactional
    public LessonProgressDTO updateProgress(
            Long enrollmentId,
            Long lessonId,
            Integer completionPercent,
            Integer watchedSeconds,
            Integer lastPositionSeconds) {

        Long currentUserId = securityContextUtil.getCurrentUserId();

        Enrollment enrollment = enrollmentRepository
                .findByIdWithUserAndCourse(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Enrollment",
                        "id",
                        enrollmentId));

        if (!enrollment.getUser().getId().equals(currentUserId)) {
            throw new SecurityException(
                    "You are not authorized to update this lesson progress.");
        }

        if (enrollment.getStatus() == EnrollmentStatus.REVOKED) {
            throw new SecurityException("This course enrollment has been revoked.");
        }

        User user = enrollment.getUser();
        if (user.getStatus() != null && user.getStatus() != UserStatus.ACTIVE) {
            throw new SecurityException("Your user account is not active.");
        }

        Course course = enrollment.getCourse();
        if (user.getRole() == Role.EMPLOYEE && (!Boolean.TRUE.equals(course.getActive()) || Boolean.TRUE.equals(course.getDraft()))) {
            throw new SecurityException("This course is not currently active.");
        }

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lesson",
                        "id",
                        lessonId));

        if (!lesson.getModule().getCourse().getId()
                .equals(enrollment.getCourse().getId())) {

            throw new SecurityException(
                    "This lesson does not belong to the enrolled course.");
        }

        LessonProgress progress = lessonProgressRepository
                .findByEnrollmentIdAndLessonId(
                        enrollmentId,
                        lessonId)
                .orElseGet(() -> {
                    LessonProgress newProgress = new LessonProgress();

                    newProgress.setEnrollment(enrollment);
                    newProgress.setLesson(lesson);

                    return newProgress;
                });

        boolean previouslyCompleted = Boolean.TRUE.equals(progress.getCompleted());

        // Sequential lesson unlocking validation:
        // If the lesson is not already completed, all preceding lessons (and previous module quizzes) must be completed.
        if (!previouslyCompleted) {
            validateSequentialLessonAccess(enrollment, lesson);
        }

        int safePercent = clamp(
                completionPercent == null ? 0 : completionPercent,
                0,
                100);

        int safeWatchedSeconds = Math.max(
                0,
                watchedSeconds == null ? 0 : watchedSeconds);

        int safePosition = Math.max(
                0,
                lastPositionSeconds == null
                        ? 0
                        : lastPositionSeconds);

        int existingPercent = progress.getCompletionPercent() != null ? progress.getCompletionPercent() : 0;
        int existingWatched = progress.getWatchedSeconds() != null ? progress.getWatchedSeconds() : 0;
        int existingPosition = progress.getLastPositionSeconds() != null ? progress.getLastPositionSeconds() : 0;

        boolean isStaleCheckpoint = !previouslyCompleted
                && safePercent < existingPercent
                && safeWatchedSeconds < existingWatched;

        progress.setCompletionPercent(previouslyCompleted ? 100 : Math.max(existingPercent, safePercent));
        progress.setWatchedSeconds(Math.max(existingWatched, safeWatchedSeconds));
        if (!isStaleCheckpoint && !(previouslyCompleted && safePosition == 0 && safePercent == 100 && existingPosition > 0)) {
            progress.setLastPositionSeconds(safePosition);
        }
        progress.setLastAccessedAt(LocalDateTime.now());

        if (safePercent >= 100) {
            progress.setCompleted(true);

            if (progress.getCompletedAt() == null) {
                progress.setCompletedAt(LocalDateTime.now());
            }
        }

        LessonProgress savedProgress =
                lessonProgressRepository.save(progress);

        /*
         * ---------------------------------------------------------
         * UPDATE COURSE-LEVEL ENROLLMENT PROGRESS
         * ---------------------------------------------------------
         */

        long totalLessons =
                lessonRepository.countByModuleCourseId(
                        enrollment.getCourse().getId());

        long completedLessons =
                lessonProgressRepository
                        .findByEnrollmentId(enrollmentId)
                        .stream()
                        .filter(lp -> Boolean.TRUE.equals(lp.getCompleted()))
                        .count();

        long totalModuleQuizzes = 0;
        long passedModuleQuizzes = 0;
        if (quizRepository != null && quizProgressRepository != null) {
            List<Quiz> moduleQuizzes = quizRepository.findByCourseIdAndType(enrollment.getCourse().getId(), QuizType.MODULE);
            totalModuleQuizzes = moduleQuizzes.size();
            for (Quiz mq : moduleQuizzes) {
                if (quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(mq.getId(), enrollment.getUser().getId())) {
                    passedModuleQuizzes++;
                }
            }
        }

        boolean isFoundation = Boolean.TRUE.equals(enrollment.getCourse().getFoundation());

        int courseProgress = 0;
        if (isFoundation) {
            if (totalLessons > 0) {
                if (completedLessons >= totalLessons) {
                    courseProgress = 100;
                    enrollment.setStatus(EnrollmentStatus.COMPLETED);
                    if (enrollment.getCompletedDate() == null) {
                        enrollment.setCompletedDate(LocalDateTime.now());
                    }
                } else {
                    courseProgress = (int) Math.round((completedLessons * 100.0) / totalLessons);
                    courseProgress = Math.min(99, Math.max(0, courseProgress));
                    if (enrollment.getStatus() == EnrollmentStatus.NOT_STARTED && courseProgress > 0) {
                        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
                    }
                }
            }
        } else {
            long totalItems = totalLessons + totalModuleQuizzes;
            long completedItems = completedLessons + passedModuleQuizzes;

            if (totalItems > 0) {
                // Strictly capped at 98% before passing the final assessment
                courseProgress = (int) Math.round((completedItems * 98.0) / totalItems);
                courseProgress = Math.min(98, Math.max(0, courseProgress));
            }

            // Only passing the final assessment sets 100%
            if (enrollment.getStatus() == EnrollmentStatus.COMPLETED) {
                courseProgress = 100;
            } else if (enrollment.getStatus() == EnrollmentStatus.NOT_STARTED && courseProgress > 0) {
                enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
            }
        }

        enrollment.setProgressPercent(courseProgress);
        enrollment.setLastAccessed(LocalDateTime.now());
        enrollmentRepository.save(enrollment);

        // Emit module completion and quiz availability notifications when all lessons in the module finish
        if (!previouslyCompleted
                && Boolean.TRUE.equals(savedProgress.getCompleted())
                && notificationService != null) {
            handleModuleAndQuizMilestoneNotifications(enrollment, lesson.getModule());
        }

        return toDTO(savedProgress);
    }

    private void handleModuleAndQuizMilestoneNotifications(Enrollment enrollment, Module module) {
        if (enrollment == null || module == null || module.getId() == null) {
            return;
        }
        boolean allModuleLessonsDone = lessonProgressRepository.areAllLessonsCompleted(
                enrollment.getId(),
                module.getId()
        );
        if (!allModuleLessonsDone) {
            return;
        }

        Course course = enrollment.getCourse();
        Long userId = enrollment.getUser().getId();
        String courseActionUrl = "/courses/" + course.getCourseId() + "/learn";

        Quiz moduleQuiz = (quizRepository != null)
                ? quizRepository.findByModuleId(module.getId()).orElse(null)
                : null;

        String nextStepText = moduleQuiz != null
                ? "The module quiz \"" + moduleQuiz.getTitle() + "\" is now unlocked."
                : "You can proceed to the next module.";

        notificationService.createNotificationSafely(
                userId,
                "Module Completed: " + module.getTitle(),
                String.format(
                        "You have completed all lessons in module \"%s\" of course \"%s\" (%s). %s",
                        module.getTitle(),
                        course.getTitle(),
                        course.getCourseId(),
                        nextStepText
                ),
                NotificationType.MODULE_COMPLETED,
                NotificationPriority.NORMAL,
                "COURSE_CODE",
                course.getCourseId(),
                courseActionUrl,
                String.format("MODULE_COMPLETED:ENR:%d:MOD:%d", enrollment.getId(), module.getId()),
                Map.of(
                        "courseId", course.getCourseId(),
                        "courseTitle", course.getTitle(),
                        "moduleId", module.getId(),
                        "moduleTitle", module.getTitle()
                )
        );

        if (moduleQuiz != null) {
            notificationService.createNotificationSafely(
                    userId,
                    "Quiz Available: " + moduleQuiz.getTitle(),
                    String.format(
                            "Module quiz \"%s\" for course \"%s\" (%s) is now unlocked and ready to attempt (Passing score: %d%%).",
                            moduleQuiz.getTitle(),
                            course.getTitle(),
                            course.getCourseId(),
                            moduleQuiz.getPassingScore() != null ? moduleQuiz.getPassingScore() : 70
                    ),
                    NotificationType.QUIZ_AVAILABLE,
                    NotificationPriority.NORMAL,
                    "COURSE_CODE",
                    course.getCourseId(),
                    courseActionUrl,
                    String.format("QUIZ_AVAILABLE:ENR:%d:QUIZ:%d", enrollment.getId(), moduleQuiz.getId()),
                    Map.of(
                            "courseId", course.getCourseId(),
                            "quizId", moduleQuiz.getQuizId(),
                            "quizTitle", moduleQuiz.getTitle()
                    )
            );
        }
    }

    @Transactional(readOnly = true)
    public List<LessonProgressDTO> getEnrollmentProgress(
            Long enrollmentId) {

        Long currentUserId = securityContextUtil.getCurrentUserId();

        Enrollment enrollment = enrollmentRepository
                .findByIdWithUserAndCourse(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Enrollment",
                        "id",
                        enrollmentId));

        if (!enrollment.getUser().getId().equals(currentUserId)) {
            throw new SecurityException(
                    "You are not authorized to view this progress.");
        }

        if (enrollment.getStatus() == EnrollmentStatus.REVOKED) {
            throw new SecurityException(
                    "Cannot access progress for a revoked enrollment.");
        }

        if (enrollment.getUser().getStatus() != null
                && enrollment.getUser().getStatus() != UserStatus.ACTIVE) {
            throw new SecurityException(
                    "User account is not active.");
        }

        return lessonProgressRepository
                .findByEnrollmentId(enrollmentId)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public LessonProgressDTO getLessonProgress(
            Long enrollmentId,
            Long lessonId) {

        Long currentUserId = securityContextUtil.getCurrentUserId();

        Enrollment enrollment = enrollmentRepository
                .findByIdWithUserAndCourse(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Enrollment",
                        "id",
                        enrollmentId));

        if (!enrollment.getUser().getId().equals(currentUserId)) {
            throw new SecurityException(
                    "You are not authorized to view this progress.");
        }

        if (enrollment.getStatus() == EnrollmentStatus.REVOKED) {
            throw new SecurityException(
                    "Cannot access progress for a revoked enrollment.");
        }

        if (enrollment.getUser().getStatus() != null
                && enrollment.getUser().getStatus() != UserStatus.ACTIVE) {
            throw new SecurityException(
                    "User account is not active.");
        }

        LessonProgress progress = lessonProgressRepository
                .findByEnrollmentIdAndLessonId(
                        enrollmentId,
                        lessonId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "LessonProgress",
                        "enrollmentId + lessonId",
                        enrollmentId + " + " + lessonId));

        return toDTO(progress);
    }

    private LessonProgressDTO toDTO(LessonProgress progress) {

        LessonProgressDTO dto = new LessonProgressDTO();

        dto.setId(progress.getId());

        dto.setEnrollmentId(
                progress.getEnrollment().getId());

        dto.setLessonId(
                progress.getLesson().getId());

        dto.setLessonCode(
                progress.getLesson().getLessonId());

        dto.setCompleted(
                progress.getCompleted());

        dto.setCompletionPercent(
                progress.getCompletionPercent());

        dto.setWatchedSeconds(
                progress.getWatchedSeconds());

        dto.setLastPositionSeconds(
                progress.getLastPositionSeconds());

        dto.setCompletedAt(
                progress.getCompletedAt());

        dto.setLastAccessedAt(
                progress.getLastAccessedAt());

        return dto;
    }

    public void validateSequentialLessonAccess(Enrollment enrollment, Lesson targetLesson) {
        Course course = enrollment.getCourse();
        List<Module> modules = (moduleRepository != null)
                ? moduleRepository.findByCourseIdOrderByOrderIndexAsc(course.getId())
                : (course.getModules() != null ? course.getModules() : Collections.emptyList());

        List<Module> sortedModules = new ArrayList<>(modules);
        sortedModules.sort(Comparator.comparing(Module::getOrderIndex, Comparator.nullsLast(Comparator.naturalOrder())));

        List<Lesson> orderedLessons = new ArrayList<>();
        Map<Long, Module> lessonModuleMap = new HashMap<>();

        for (Module m : sortedModules) {
            List<Lesson> mLessons = (lessonRepository != null)
                    ? lessonRepository.findByModuleIdOrderByOrderIndexAsc(m.getId())
                    : (m.getLessons() != null ? m.getLessons() : Collections.emptyList());
            List<Lesson> sortedLessons = new ArrayList<>(mLessons);
            sortedLessons.sort(Comparator.comparing(Lesson::getOrderIndex, Comparator.nullsLast(Comparator.naturalOrder())));
            for (Lesson l : sortedLessons) {
                orderedLessons.add(l);
                lessonModuleMap.put(l.getId(), m);
            }
        }

        int targetIndex = -1;
        for (int i = 0; i < orderedLessons.size(); i++) {
            if (orderedLessons.get(i).getId().equals(targetLesson.getId())) {
                targetIndex = i;
                break;
            }
        }

        if (targetIndex > 0) {
            for (int i = 0; i < targetIndex; i++) {
                Lesson prevLesson = orderedLessons.get(i);
                boolean isCompleted = lessonProgressRepository
                        .findByEnrollmentIdAndLessonId(enrollment.getId(), prevLesson.getId())
                        .map(lp -> Boolean.TRUE.equals(lp.getCompleted()))
                        .orElse(false);

                if (!isCompleted) {
                    throw new IllegalStateException(
                            "Lesson is locked. You must complete the previous lesson (\""
                                    + prevLesson.getTitle() + "\") before accessing this lesson."
                    );
                }
            }

            Module currentModule = lessonModuleMap.get(targetLesson.getId());
            if (currentModule != null && quizRepository != null && quizProgressRepository != null) {
                for (Module m : sortedModules) {
                    if (m.getId().equals(currentModule.getId())) {
                        break;
                    }
                    Optional<Quiz> mQuizOpt = quizRepository.findTopByModuleIdOrderByIdDesc(m.getId());
                    if (mQuizOpt.isEmpty()) {
                        mQuizOpt = quizRepository.findByModuleId(m.getId());
                    }
                    if (mQuizOpt.isPresent()) {
                        Quiz mQuiz = mQuizOpt.get();
                        boolean passed = quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(
                                mQuiz.getId(), enrollment.getUser().getId()
                        );
                        if (!passed) {
                            throw new IllegalStateException(
                                    "Lesson is locked. You must pass the module quiz for \""
                                            + m.getTitle() + "\" before accessing lessons in this module."
                            );
                        }
                    }
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public boolean isLessonUnlocked(Long enrollmentId, Long lessonId) {
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId).orElse(null);
        if (enrollment == null) return false;
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null) return false;

        boolean alreadyCompleted = lessonProgressRepository
                .findByEnrollmentIdAndLessonId(enrollmentId, lessonId)
                .map(lp -> Boolean.TRUE.equals(lp.getCompleted()))
                .orElse(false);
        if (alreadyCompleted) return true;

        try {
            validateSequentialLessonAccess(enrollment, lesson);
            return true;
        } catch (IllegalStateException e) {
            return false;
        }
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
