package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    Optional<QuizAttempt> findByAttemptId(String attemptId);

    List<QuizAttempt> findByQuizIdOrderByAttemptNumberDesc(Long quizId);

    List<QuizAttempt> findByUserIdOrderByCompletedAtDesc(Long userId);

    /**
     * Retrieves all qualifying completed/submitted quiz timestamps for an authenticated employee.
     */
    @Query("""
        SELECT qa.completedAt
        FROM QuizAttempt qa
        WHERE qa.user.id = :userId
          AND qa.completedAt IS NOT NULL
        ORDER BY qa.completedAt ASC
    """)
    List<LocalDateTime> findCompletedQuizTimestampsByUserId(@Param("userId") Long userId);

    List<QuizAttempt> findByQuizIdOrderByStartedAtDesc(Long quizId);

    List<QuizAttempt> findByUserIdOrderByStartedAtDesc(Long userId);

    Optional<QuizAttempt> findTopByQuizIdAndUserIdOrderByAttemptNumberDesc(
            Long quizId,
            Long userId
    );

    @Query("SELECT COALESCE(MAX(qa.attemptNumber), 0) FROM QuizAttempt qa WHERE qa.quiz.id = :quizId AND qa.user.id = :userId")
    int findMaxAttemptNumber(@Param("quizId") Long quizId, @Param("userId") Long userId);

    long countByQuizIdAndUserId(Long quizId, Long userId);

    boolean existsByQuizId(Long quizId);

    Optional<QuizAttempt> findTopByQuiz_IdAndUser_IdAndCompletedAtIsNullOrderByStartedAtDesc(
            Long quizId,
            Long userId
    );

    Optional<QuizAttempt> findTopByQuiz_IdAndUser_IdAndCompletedAtIsNotNullOrderByCompletedAtDesc(
            Long quizId,
            Long userId
    );

    Optional<QuizAttempt> findTopByQuiz_IdAndUser_IdAndPassedTrueOrderByCompletedAtDesc(
            Long quizId,
            Long userId
    );

    @Query("""
        SELECT qa
        FROM QuizAttempt qa
        JOIN FETCH qa.user u
        JOIN FETCH qa.quiz q
        JOIN FETCH q.course c
        WHERE qa.completedAt IS NOT NULL
          AND u.status = com.fairmacs.lms.entity.UserStatus.ACTIVE
          AND c.active = true
        ORDER BY qa.completedAt DESC
    """)
    List<QuizAttempt> findCompletedAttemptsWithDetails();

    @Query("""
        SELECT qa
        FROM QuizAttempt qa
        JOIN FETCH qa.quiz q
        JOIN FETCH q.course c
        JOIN FETCH qa.user u
        WHERE qa.passed = false
          AND qa.completedAt IS NOT NULL
          AND qa.completedAt <= :cooldownCutoff
          AND qa.completedAt >= :windowStart
          AND u.status = com.fairmacs.lms.entity.UserStatus.ACTIVE
          AND c.active = true
    """)
    List<QuizAttempt> findFailedAttemptsReadyForRetake(
            @Param("windowStart") LocalDateTime windowStart,
            @Param("cooldownCutoff") LocalDateTime cooldownCutoff
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM QuizAttempt qa WHERE qa.quiz.course.id = :courseId")
    void deleteByCourseId(@org.springframework.data.repository.query.Param("courseId") Long courseId);
}
