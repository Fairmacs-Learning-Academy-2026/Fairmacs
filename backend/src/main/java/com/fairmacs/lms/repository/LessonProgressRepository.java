package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

    Optional<LessonProgress> findByEnrollmentIdAndLessonId(
            Long enrollmentId,
            Long lessonId
    );

    List<LessonProgress> findByEnrollmentId(Long enrollmentId);

    boolean existsByEnrollmentIdAndLessonId(
            Long enrollmentId,
            Long lessonId
    );

    /**
     * Retrieves all qualifying completed lesson timestamps for an authenticated employee,
     * excluding revoked enrollments.
     */
    @Query("""
        SELECT lp.completedAt
        FROM LessonProgress lp
        WHERE lp.enrollment.user.id = :userId
          AND lp.completed = true
          AND lp.completedAt IS NOT NULL
          AND lp.enrollment.status <> com.fairmacs.lms.entity.EnrollmentStatus.REVOKED
        ORDER BY lp.completedAt ASC
    """)
    List<LocalDateTime> findCompletedLessonTimestampsByUserId(@Param("userId") Long userId);

    @Query("""
        SELECT lp
        FROM LessonProgress lp
        JOIN FETCH lp.enrollment e
        JOIN FETCH e.user u
        JOIN FETCH e.course c
        JOIN FETCH lp.lesson l
        WHERE e.status <> com.fairmacs.lms.entity.EnrollmentStatus.REVOKED
          AND u.status = com.fairmacs.lms.entity.UserStatus.ACTIVE
          AND c.active = true
    """)
    List<LessonProgress> findAllActiveLessonProgressWithDetails();

    /**
     * Returns the number of lessons in a module
     * that have been completed for an enrollment.
     */
    @Query("""
        SELECT COUNT(lp)
        FROM LessonProgress lp
        WHERE lp.enrollment.id = :enrollmentId
          AND lp.lesson.module.id = :moduleId
          AND lp.completed = true
    """)
    long countCompletedLessonsByEnrollmentAndModule(
            @Param("enrollmentId") Long enrollmentId,
            @Param("moduleId") Long moduleId
    );

    /**
     * Returns the total number of lessons in a module.
     */
    @Query("""
        SELECT COUNT(l)
        FROM Lesson l
        WHERE l.module.id = :moduleId
    """)
    long countLessonsByModule(
            @Param("moduleId") Long moduleId
    );

    /**
     * Returns true when every lesson in the module
     * has been completed by the employee.
     */
    @Query("""
        SELECT
            CASE
                WHEN COUNT(l) > 0
                 AND COUNT(l) = COUNT(
                    CASE
                        WHEN lp.completed = true THEN 1
                    END
                 )
                THEN true
                ELSE false
            END
        FROM Lesson l
        LEFT JOIN LessonProgress lp
            ON lp.lesson.id = l.id
           AND lp.enrollment.id = :enrollmentId
        WHERE l.module.id = :moduleId
    """)
    boolean areAllLessonsCompleted(
            @Param("enrollmentId") Long enrollmentId,
            @Param("moduleId") Long moduleId
    );

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM LessonProgress lp WHERE lp.lesson.module.course.id = :courseId OR lp.enrollment.course.id = :courseId")
    void deleteByCourseId(@Param("courseId") Long courseId);
}
