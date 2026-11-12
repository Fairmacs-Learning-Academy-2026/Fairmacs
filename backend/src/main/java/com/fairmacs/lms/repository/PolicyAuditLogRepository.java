package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.PolicyAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PolicyAuditLogRepository extends JpaRepository<PolicyAuditLog, Long> {

    @Query("SELECT l FROM PolicyAuditLog l WHERE l.policyDocument.id = :documentId ORDER BY l.createdAt DESC")
    List<PolicyAuditLog> findByPolicyDocumentIdOrderByCreatedAtDesc(@Param("documentId") Long policyDocumentId);

    List<PolicyAuditLog> findByPolicyDocument_IdOrderByCreatedAtDesc(Long policyDocumentId);
}
