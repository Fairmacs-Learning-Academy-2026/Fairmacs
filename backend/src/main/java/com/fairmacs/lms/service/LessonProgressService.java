package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.LessonProgressDTO;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.Lesson;
import com.fairmacs.lms.entity.LessonProgress;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.LessonRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LessonProgressService {

    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final SecurityContextUtil securityContextUtil;

    public LessonProgressService(
            LessonProgressRepository lessonProgressRepository,
            EnrollmentRepository enrollmentRepository,
            LessonRepository lessonRepository,
            SecurityContextUtil securityContextUtil) {

        this.lessonProgressRepository = lessonProgressRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.lessonRepository = lessonRepository;
        this.securityContextUtil = securityContextUtil;
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

        progress.setCompletionPercent(safePercent);
        progress.setWatchedSeconds(safeWatchedSeconds);
        progress.setLastPositionSeconds(safePosition);
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

        int courseProgress = 0;

        if (totalLessons > 0) {
            courseProgress = (int) Math.round(
                    (completedLessons * 100.0) / totalLessons);
        }

        courseProgress = clamp(courseProgress, 0, 100);

        enrollment.setProgressPercent(courseProgress);
        enrollment.setLastAccessed(LocalDateTime.now());

        /*
         * Do NOT mark the course COMPLETED here.
         *
         * 100% lesson completion does not yet mean the employee
         * has passed the course assessment.
         *
         * Assessment/certificate completion will be handled later.
         */

        enrollmentRepository.save(enrollment);

        return toDTO(savedProgress);
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

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}