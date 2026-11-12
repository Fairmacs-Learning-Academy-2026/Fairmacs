package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.PolicyAcknowledgement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PolicyAcknowledgementRepository extends JpaRepository<PolicyAcknowledgement, Long> {

    @Query("SELECT ack FROM PolicyAcknowledgement ack WHERE ack.policyVersion.id = :versionId AND ack.employeeUser.id = :userId")
    Optional<PolicyAcknowledgement> findByPolicyVersionIdAndEmployeeUserId(
            @Param("versionId") Long versionId,
            @Param("userId") Long userId
    );

    Optional<PolicyAcknowledgement> findByPolicyVersion_IdAndEmployeeUser_Id(Long policyVersionId, Long employeeUserId);

    @Query("SELECT CASE WHEN COUNT(ack) > 0 THEN true ELSE false END FROM PolicyAcknowledgement ack WHERE ack.policyVersion.id = :versionId AND ack.employeeUser.id = :userId")
    boolean existsByPolicyVersionIdAndEmployeeUserId(
            @Param("versionId") Long versionId,
            @Param("userId") Long userId
    );

    boolean existsByPolicyVersion_IdAndEmployeeUser_Id(Long policyVersionId, Long employeeUserId);

    @Query("SELECT ack FROM PolicyAcknowledgement ack WHERE ack.employeeUser.id = :userId ORDER BY ack.acceptedAt DESC")
    List<PolicyAcknowledgement> findByEmployeeUserIdOrderByAcceptedAtDesc(@Param("userId") Long userId);

    List<PolicyAcknowledgement> findByEmployeeUser_IdOrderByAcceptedAtDesc(Long employeeUserId);

    @Query("SELECT ack FROM PolicyAcknowledgement ack WHERE ack.policyDocument.id = :documentId ORDER BY ack.acceptedAt DESC")
    List<PolicyAcknowledgement> findByPolicyDocumentIdOrderByAcceptedAtDesc(@Param("documentId") Long documentId);

    List<PolicyAcknowledgement> findByPolicyDocument_IdOrderByAcceptedAtDesc(Long policyDocumentId);

    @Query("SELECT ack FROM PolicyAcknowledgement ack WHERE ack.policyVersion.id = :versionId")
    List<PolicyAcknowledgement> findByPolicyVersionId(@Param("versionId") Long versionId);

    List<PolicyAcknowledgement> findByPolicyVersion_Id(Long policyVersionId);

    @Query("SELECT COUNT(ack) FROM PolicyAcknowledgement ack WHERE ack.policyVersion.id = :versionId")
    long countByPolicyVersionId(@Param("versionId") Long versionId);

    long countByPolicyVersion_Id(Long policyVersionId);

    @Query("""
        SELECT ack FROM PolicyAcknowledgement ack
        WHERE ack.policyDocument.id = :documentId
          AND ack.employeeUser.id IN :userIds
        ORDER BY ack.acceptedAt DESC
    """)
    List<PolicyAcknowledgement> findByDocumentIdAndUserIds(
            @Param("documentId") Long documentId,
            @Param("userIds") Collection<Long> userIds
    );
}
