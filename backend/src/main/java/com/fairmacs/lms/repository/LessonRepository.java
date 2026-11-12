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

    @org.springframework.data.jpa.repository.Query("SELECT l.module.course.id, COUNT(l) FROM Lesson l WHERE l.module.course.id IN :courseIds GROUP BY l.module.course.id")
    List<Object[]> countByCourseIds(@org.springframework.data.repository.query.Param("courseIds") java.util.Collection<Long> courseIds);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Lesson l WHERE l.module.course.id = :courseId")
    void deleteByCourseId(@org.springframework.data.repository.query.Param("courseId") Long courseId);
}
