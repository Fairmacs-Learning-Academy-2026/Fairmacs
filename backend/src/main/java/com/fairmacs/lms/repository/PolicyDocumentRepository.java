package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.PolicyApprovalStatus;
import com.fairmacs.lms.entity.PolicyDocument;
import com.fairmacs.lms.entity.PolicyDocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PolicyDocumentRepository extends JpaRepository<PolicyDocument, Long> {

    Optional<PolicyDocument> findByDocumentCode(String documentCode);

    boolean existsByDocumentCode(String documentCode);

    List<PolicyDocument> findByDocumentStatusOrderByCreatedAtDesc(PolicyDocumentStatus status);

    @Query("SELECT p FROM PolicyDocument p WHERE p.owningDepartment.id = :deptId ORDER BY p.createdAt DESC")
    List<PolicyDocument> findByOwningDepartmentIdOrderByCreatedAtDesc(@Param("deptId") Long owningDepartmentId);

    List<PolicyDocument> findByOwningDepartment_IdOrderByCreatedAtDesc(Long owningDepartmentId);

    @Query("SELECT p FROM PolicyDocument p WHERE p.owningDepartment.id IN :deptIds ORDER BY p.createdAt DESC")
    List<PolicyDocument> findByOwningDepartmentIdInOrderByCreatedAtDesc(@Param("deptIds") Collection<Long> departmentIds);

    List<PolicyDocument> findByOwningDepartment_IdInOrderByCreatedAtDesc(Collection<Long> departmentIds);

    List<PolicyDocument> findByApprovalStatusOrderBySubmittedAtDesc(PolicyApprovalStatus approvalStatus);

    List<PolicyDocument> findAllByOrderByCreatedAtDesc();

    @Query("""
        SELECT p FROM PolicyDocument p
        WHERE p.documentStatus = 'PUBLISHED'
          AND (p.owningDepartment IS NULL OR p.owningDepartment.id IN :departmentIds)
        ORDER BY p.publishedAt DESC
    """)
    List<PolicyDocument> findPublishedForDepartments(@Param("departmentIds") Collection<Long> departmentIds);

    @Query("""
        SELECT p FROM PolicyDocument p
        WHERE p.documentStatus = 'PUBLISHED'
          AND p.owningDepartment IS NULL
        ORDER BY p.publishedAt DESC
    """)
    List<PolicyDocument> findPublishedCompanyWide();
}
