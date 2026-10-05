package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {

    Optional<QuizQuestion> findByQuestionId(String questionId);

    List<QuizQuestion> findByQuizIdOrderByOrderIndexAsc(Long quizId);

    List<QuizQuestion> findByQuiz_Id(Long quizId);

    boolean existsByQuestionId(String questionId);
}