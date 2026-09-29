package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, Long> {

    Optional<Lesson> findByLessonId(String lessonId);

    List<Lesson> findByModuleIdOrderByOrderIndexAsc(Long moduleId);

    boolean existsByLessonId(String lessonId);

    /**
     * Counts all lessons belonging to a course.
     */
    long countByModuleCourseId(Long courseId);
}