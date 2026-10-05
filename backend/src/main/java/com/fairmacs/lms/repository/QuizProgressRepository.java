package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.QuizProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizProgressRepository extends JpaRepository<QuizProgress, Long> {

    Optional<QuizProgress> findByQuizIdAndUserId(
            Long quizId,
            Long userId
    );

    List<QuizProgress> findByUserId(Long userId);

    List<QuizProgress> findByQuizId(Long quizId);

    boolean existsByQuizIdAndUserId(
            Long quizId,
            Long userId
    );

    /**
     * Checks whether the employee has passed a specific quiz.
     */
    boolean existsByQuizIdAndUserIdAndPassedTrue(
            Long quizId,
            Long userId
    );
}