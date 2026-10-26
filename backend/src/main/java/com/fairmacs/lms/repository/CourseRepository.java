
package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {

    Optional<Course> findByCourseId(String courseId);

    List<Course> findByActiveTrue();

    List<Course> findByCategory(String category);

    List<Course> findByFoundationTrueAndActiveTrue();

    boolean existsByCourseId(String courseId);

    @Query("""
        SELECT DISTINCT c
        FROM Course c
        LEFT JOIN FETCH c.catalogCategory
        WHERE c.active = true
          AND COALESCE(c.draft, false) = false
    """)
    List<Course> findActiveWithCategory();

    @Query("""
        SELECT DISTINCT c
        FROM Course c
        LEFT JOIN FETCH c.catalogCategory
        LEFT JOIN FETCH c.modules
        WHERE c.courseId = :courseId
    """)
    Optional<Course> findDetailByCourseId(@Param("courseId") String courseId);

    @Query("""
        SELECT DISTINCT c
        FROM Course c
        LEFT JOIN FETCH c.catalogCategory
        LEFT JOIN FETCH c.modules
        WHERE c.id = :id
    """)
    Optional<Course> findDetailById(@Param("id") Long id);

    @Query("""
        SELECT c
        FROM Course c
        WHERE c.draft = true
          AND c.createdBy.id = :userId
        ORDER BY c.updatedAt DESC
    """)
    List<Course> findDraftsByOwnerId(@Param("userId") Long userId);

    @Query("""
        SELECT c
        FROM Course c
        WHERE c.courseId = :courseId
          AND c.draft = true
          AND c.createdBy.id = :userId
    """)
    Optional<Course> findOwnedDraft(
        @Param("courseId") String courseId,
        @Param("userId") Long userId
    );

    @Query("""
        SELECT DISTINCT c
        FROM Course c
        LEFT JOIN FETCH c.catalogCategory
        WHERE c.active = true
          AND COALESCE(c.draft, false) = false
          AND (:categorySlug IS NULL OR c.catalogCategory.slug = :categorySlug)
          AND (
                :q IS NULL OR :q = ''
                OR LOWER(c.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.description) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.courseId) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.category) LIKE LOWER(CONCAT('%', :q, '%'))
              )
    """)
    List<Course> searchCatalog(
        @Param("q") String q,
        @Param("categorySlug") String categorySlug
    );
}
