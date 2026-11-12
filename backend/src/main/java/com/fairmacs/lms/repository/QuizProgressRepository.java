package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.QuizProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizProgressRepository extends JpaRepository<QuizProgress, Long> {

    Optional<QuizProgress> findByQuiz_IdAndUser_Id(Long quizId, Long userId);

    boolean existsByQuiz_IdAndUser_IdAndPassedTrue(Long quizId, Long userId);

    List<QuizProgress> findByUser_Id(Long userId);

    List<QuizProgress> findByQuiz_Id(Long quizId);

    boolean existsByQuiz_IdAndUser_Id(Long quizId, Long userId);

    default Optional<QuizProgress> findByQuizIdAndUserId(Long quizId, Long userId) {
        return findByQuiz_IdAndUser_Id(quizId, userId);
    }

    default List<QuizProgress> findByUserId(Long userId) {
        return findByUser_Id(userId);
    }

    default List<QuizProgress> findByQuizId(Long quizId) {
        return findByQuiz_Id(quizId);
    }

    default boolean existsByQuizIdAndUserId(Long quizId, Long userId) {
        return existsByQuiz_IdAndUser_Id(quizId, userId);
    }

    default boolean existsByQuizIdAndUserIdAndPassedTrue(Long quizId, Long userId) {
        return existsByQuiz_IdAndUser_IdAndPassedTrue(quizId, userId);
    }

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM QuizProgress qp WHERE qp.quiz.course.id = :courseId")
    void deleteByCourseId(@org.springframework.data.repository.query.Param("courseId") Long courseId);
}