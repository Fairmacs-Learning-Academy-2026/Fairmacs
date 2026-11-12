package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Repository for Quiz entities. Keep this public interface in QuizRepository.java. */
public interface QuizRepository extends JpaRepository<Quiz, Long> {

    Optional<Quiz> findByQuizId(String quizId);

    List<Quiz> findByCourseId(Long courseId);

    List<Quiz> findByCourseIdAndType(Long courseId, QuizType type);

    Optional<Quiz> findByModuleId(Long moduleId);

    Optional<Quiz> findTopByModuleIdOrderByIdDesc(Long moduleId);

    List<Quiz> findAllByModuleId(Long moduleId);

    boolean existsByQuizId(String quizId);

    boolean existsByCourse_Id(Long courseId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Quiz q WHERE q.course.id = :courseId")
    void deleteByCourseId(@org.springframework.data.repository.query.Param("courseId") Long courseId);
}
