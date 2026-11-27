package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.CourseDepartmentAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseDepartmentAssignmentRepository extends JpaRepository<CourseDepartmentAssignment, Long> {

    List<CourseDepartmentAssignment> findByCourse_Id(Long courseId);

    @Query("""
        SELECT cda
        FROM CourseDepartmentAssignment cda
        JOIN FETCH cda.department
        WHERE cda.course.id = :courseId
    """)
    List<CourseDepartmentAssignment> findByCourseIdWithDepartment(@Param("courseId") Long courseId);

    @Query("""
        SELECT cda
        FROM CourseDepartmentAssignment cda
        JOIN FETCH cda.department
        WHERE cda.course.id IN :courseIds
    """)
    List<CourseDepartmentAssignment> findByCourseIdInWithDepartment(@Param("courseIds") java.util.Collection<Long> courseIds);

    List<CourseDepartmentAssignment> findByDepartment_Id(Long departmentId);

    List<CourseDepartmentAssignment> findByDepartment_NameIgnoreCase(String departmentName);

    Optional<CourseDepartmentAssignment> findByCourse_IdAndDepartment_Id(Long courseId, Long departmentId);

    boolean existsByCourse_IdAndDepartment_Id(Long courseId, Long departmentId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM CourseDepartmentAssignment cda WHERE cda.course.id = :courseId")
    void deleteByCourse_Id(@org.springframework.data.repository.query.Param("courseId") Long courseId);
}

