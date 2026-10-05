package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}