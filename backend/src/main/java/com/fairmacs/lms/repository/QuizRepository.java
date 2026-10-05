package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizRepository extends JpaRepository<Quiz, Long> {

    Optional<Quiz> findByQuizId(String quizId);

    List<Quiz> findByCourseId(Long courseId);

    List<Quiz> findByCourseIdAndType(Long courseId, QuizType type);

    Optional<Quiz> findByModuleId(Long moduleId);

    boolean existsByQuizId(String quizId);
}