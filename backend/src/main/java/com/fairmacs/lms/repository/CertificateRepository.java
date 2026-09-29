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

    @Query("SELECT c FROM Certificate c JOIN FETCH c.user u JOIN FETCH c.course WHERE u.department = :department ORDER BY c.issuedAt DESC")
    List<Certificate> findByDepartment(@Param("department") String department);
}
