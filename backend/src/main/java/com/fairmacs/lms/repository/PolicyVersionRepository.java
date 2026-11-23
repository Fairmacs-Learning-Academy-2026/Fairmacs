package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.PolicyVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PolicyVersionRepository extends JpaRepository<PolicyVersion, Long> {

    @Query("SELECT v FROM PolicyVersion v WHERE v.policyDocument.id = :documentId ORDER BY v.createdAt DESC")
    List<PolicyVersion> findByPolicyDocumentIdOrderByCreatedAtDesc(@Param("documentId") Long policyDocumentId);

    List<PolicyVersion> findByPolicyDocument_IdOrderByCreatedAtDesc(Long policyDocumentId);

    @Query("SELECT v FROM PolicyVersion v WHERE v.policyDocument.id = :documentId ORDER BY v.createdAt ASC")
    List<PolicyVersion> findByPolicyDocumentIdOrderByCreatedAtAsc(@Param("documentId") Long policyDocumentId);

    List<PolicyVersion> findByPolicyDocument_IdOrderByCreatedAtAsc(Long policyDocumentId);

    @Query("SELECT v FROM PolicyVersion v WHERE v.policyDocument.id = :documentId AND v.versionNumber = :versionNumber")
    Optional<PolicyVersion> findByPolicyDocumentIdAndVersionNumber(
            @Param("documentId") Long policyDocumentId,
            @Param("versionNumber") String versionNumber
    );

    Optional<PolicyVersion> findByPolicyDocument_IdAndVersionNumber(Long policyDocumentId, String versionNumber);

    @Query("SELECT v FROM PolicyVersion v WHERE v.policyDocument.id = :documentId ORDER BY v.createdAt DESC LIMIT 1")
    Optional<PolicyVersion> findFirstByPolicyDocumentIdOrderByCreatedAtDesc(@Param("documentId") Long policyDocumentId);

    Optional<PolicyVersion> findFirstByPolicyDocument_IdOrderByCreatedAtDesc(Long policyDocumentId);

    @Query("SELECT CASE WHEN COUNT(v) > 0 THEN true ELSE false END FROM PolicyVersion v WHERE v.policyDocument.id = :documentId AND v.versionNumber = :versionNumber")
    boolean existsByPolicyDocumentIdAndVersionNumber(
            @Param("documentId") Long policyDocumentId,
            @Param("versionNumber") String versionNumber
    );

    boolean existsByPolicyDocument_IdAndVersionNumber(Long policyDocumentId, String versionNumber);
}
