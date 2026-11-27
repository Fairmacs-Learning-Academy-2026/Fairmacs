package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    @Query("SELECT e FROM Enrollment e JOIN FETCH e.user JOIN FETCH e.course WHERE e.id = :id")
    Optional<Enrollment> findByIdWithUserAndCourse(@Param("id") Long id);

    @Query("SELECT e FROM Enrollment e LEFT JOIN FETCH e.user LEFT JOIN FETCH e.course")
    List<Enrollment> findAllWithUserAndCourse();

    @Query("SELECT e FROM Enrollment e WHERE e.user.id = :userId AND e.course.id = :courseId")
    Optional<Enrollment> findByUserIdAndCourseId(@Param("userId") Long userId, @Param("courseId") Long courseId);

    @Query("SELECT e FROM Enrollment e JOIN FETCH e.course c LEFT JOIN FETCH c.catalogCategory WHERE e.user.id = :userId")
    List<Enrollment> findByUserIdWithCourse(@Param("userId") Long userId);

    @Query("SELECT e FROM Enrollment e JOIN FETCH e.user JOIN FETCH e.course c WHERE e.user.id = :userId AND c.courseId = :courseCode")
    Optional<Enrollment> findByUserIdAndCourseCode(@Param("userId") Long userId, @Param("courseCode") String courseCode);

    List<Enrollment> findByUserId(Long userId);

    List<Enrollment> findByUserIdAndStatus(Long userId, EnrollmentStatus status);

    List<Enrollment> findByCourseId(Long courseId);

    boolean existsByUserIdAndCourseId(Long userId, Long courseId);

    boolean existsByCourse_Id(Long courseId);

    @Query("""
        SELECT e
        FROM Enrollment e
        JOIN FETCH e.user u
        JOIN FETCH e.course c
        WHERE LOWER(u.department) = LOWER(:department)
          AND u.role = com.fairmacs.lms.entity.Role.EMPLOYEE
          AND u.status = com.fairmacs.lms.entity.UserStatus.ACTIVE
    """)
    List<Enrollment> findActiveEmployeeEnrollmentsByDepartment(
            @Param("department") String department
    );

    @Query(
            value = """
                SELECT e
                FROM Enrollment e
                JOIN FETCH e.user u
                JOIN FETCH e.course c
                WHERE e.dueDate IS NOT NULL
                  AND e.status NOT IN (
                      com.fairmacs.lms.entity.EnrollmentStatus.COMPLETED,
                      com.fairmacs.lms.entity.EnrollmentStatus.REVOKED
                  )
                  AND u.status = com.fairmacs.lms.entity.UserStatus.ACTIVE
                  AND c.active = true
                ORDER BY e.id ASC
            """,
            countQuery = """
                SELECT COUNT(e)
                FROM Enrollment e
                JOIN e.user u
                JOIN e.course c
                WHERE e.dueDate IS NOT NULL
                  AND e.status NOT IN (
                      com.fairmacs.lms.entity.EnrollmentStatus.COMPLETED,
                      com.fairmacs.lms.entity.EnrollmentStatus.REVOKED
                  )
                  AND u.status = com.fairmacs.lms.entity.UserStatus.ACTIVE
                  AND c.active = true
            """
    )
    Page<Enrollment> findActiveEnrollmentsWithDueDate(Pageable pageable);

    @Query("""
        SELECT e
        FROM Enrollment e
        JOIN FETCH e.user u
        JOIN FETCH e.course c
        WHERE e.status NOT IN (com.fairmacs.lms.entity.EnrollmentStatus.REVOKED)
          AND u.status = com.fairmacs.lms.entity.UserStatus.ACTIVE
          AND c.active = true
    """)
    List<Enrollment> findAllActiveOrganizationEnrollments();

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Enrollment e WHERE e.course.id = :courseId")
    void deleteByCourseId(@Param("courseId") Long courseId);
}
