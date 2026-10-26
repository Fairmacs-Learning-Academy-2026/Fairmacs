package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import com.fairmacs.lms.entity.QuizAttempt;

import java.util.List;
import java.util.Optional;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    Optional<QuizAttempt> findByAttemptId(String attemptId);

    List<QuizAttempt> findByQuizIdAndUserIdOrderByAttemptNumberAsc(
            Long quizId,
            Long userId
    );

    List<QuizAttempt> findByQuizIdOrderByStartedAtDesc(Long quizId);

    List<QuizAttempt> findByUserIdOrderByStartedAtDesc(Long userId);

    Optional<QuizAttempt> findTopByQuizIdAndUserIdOrderByAttemptNumberDesc(
            Long quizId,
            Long userId
    );

    long countByQuizIdAndUserId(Long quizId, Long userId);
    
    boolean existsByQuizId(Long quizId);

    Optional<QuizAttempt>findTopByQuiz_IdAndUser_IdAndCompletedAtIsNotNullOrderByCompletedAtDesc(
            Long quizId,
            Long userId
    );
}