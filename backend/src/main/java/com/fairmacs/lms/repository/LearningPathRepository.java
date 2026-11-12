package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.LearningPath;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LearningPathRepository extends JpaRepository<LearningPath, Long> {

    @Query("SELECT DISTINCT p FROM LearningPath p LEFT JOIN FETCH p.items i LEFT JOIN FETCH i.course ORDER BY p.id")
    List<LearningPath> findAllWithItems();

    boolean existsByPathCode(String pathCode);

    @Modifying
    @Query("DELETE FROM LearningPathItem lpi WHERE lpi.course.id = :courseId")
    void deleteItemsByCourseId(@Param("courseId") Long courseId);
}
