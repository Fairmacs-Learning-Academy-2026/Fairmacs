package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    @Query("SELECT c FROM Certificate c JOIN FETCH c.user JOIN FETCH c.course WHERE c.certificateId = :certificateId")
    Optional<Certificate> findByCertificateIdWithDetails(@Param("certificateId") String certificateId);

    Optional<Certificate> findByCertificateId(String certificateId);

    @Query("SELECT c FROM Certificate c JOIN FETCH c.course WHERE c.user.id = :userId ORDER BY c.issuedAt DESC")
    List<Certificate> findByUserIdWithCourse(@Param("userId") Long userId);

    List<Certificate> findByUserId(Long userId);

    boolean existsByCertificateId(String certificateId);

    @Query("SELECT COUNT(c) > 0 FROM Certificate c WHERE c.user.id = :userId AND c.course.id = :courseId")
    boolean existsByUserIdAndCourseId(@Param("userId") Long userId, @Param("courseId") Long courseId);

    @Query("SELECT c FROM Certificate c WHERE c.user.id = :userId AND c.course.id = :courseId")
    Optional<Certificate> findByUserIdAndCourseId(@Param("userId") Long userId, @Param("courseId") Long courseId);

    @Query("SELECT c FROM Certificate c JOIN FETCH c.user u JOIN FETCH c.course WHERE u.department = :department ORDER BY c.issuedAt DESC")
    List<Certificate> findByDepartment(@Param("department") String department);

    @Query("""
        SELECT c
        FROM Certificate c
        JOIN FETCH c.user u
        JOIN FETCH c.course crs
        WHERE c.issuedAt IS NOT NULL
          AND u.status = com.fairmacs.lms.entity.UserStatus.ACTIVE
          AND crs.active = true
        ORDER BY c.issuedAt DESC
    """)
    List<Certificate> findAllActiveCertificatesWithDetails();

    boolean existsByCourse_Id(Long courseId);

    List<Certificate> findByCourse_Id(Long courseId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Certificate c WHERE c.course.id = :courseId")
    void deleteByCourseId(@Param("courseId") Long courseId);
}
