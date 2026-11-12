package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {

    Optional<QuizQuestion> findByQuestionId(String questionId);

    List<QuizQuestion> findByQuiz_IdOrderByOrderIndexAsc(Long quizId);

    List<QuizQuestion> findByQuiz_Id(Long quizId);

    boolean existsByQuestionId(String questionId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM QuizQuestion qq WHERE qq.quiz.id = :quizId")
    void deleteByQuizId(@org.springframework.data.repository.query.Param("quizId") Long quizId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM QuizQuestion qq WHERE qq.quiz.course.id = :courseId")
    void deleteByCourseId(@org.springframework.data.repository.query.Param("courseId") Long courseId);
}