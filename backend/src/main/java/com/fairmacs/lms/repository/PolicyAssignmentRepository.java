package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.PolicyAssignment;
import com.fairmacs.lms.entity.PolicyAssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PolicyAssignmentRepository extends JpaRepository<PolicyAssignment, Long> {

    @Query("SELECT a FROM PolicyAssignment a WHERE a.employeeUser.id = :userId AND a.assignmentStatus = :status")
    List<PolicyAssignment> findByEmployeeUserIdAndAssignmentStatus(
            @Param("userId") Long employeeUserId,
            @Param("status") PolicyAssignmentStatus assignmentStatus
    );

    List<PolicyAssignment> findByEmployeeUser_IdAndAssignmentStatus(Long employeeUserId, PolicyAssignmentStatus assignmentStatus);

    @Query("SELECT a FROM PolicyAssignment a WHERE a.employeeUser.id = :userId")
    List<PolicyAssignment> findByEmployeeUserId(@Param("userId") Long employeeUserId);

    List<PolicyAssignment> findByEmployeeUser_Id(Long employeeUserId);

    @Query("SELECT a FROM PolicyAssignment a WHERE a.policyDocument.id = :documentId")
    List<PolicyAssignment> findByPolicyDocumentId(@Param("documentId") Long policyDocumentId);

    List<PolicyAssignment> findByPolicyDocument_Id(Long policyDocumentId);

    @Query("SELECT a FROM PolicyAssignment a WHERE a.policyVersion.id = :versionId")
    List<PolicyAssignment> findByPolicyVersionId(@Param("versionId") Long policyVersionId);

    List<PolicyAssignment> findByPolicyVersion_Id(Long policyVersionId);

    @Query("SELECT a FROM PolicyAssignment a WHERE a.policyVersion.id = :versionId AND a.employeeUser.id = :userId")
    Optional<PolicyAssignment> findByPolicyVersionIdAndEmployeeUserId(
            @Param("versionId") Long policyVersionId,
            @Param("userId") Long employeeUserId
    );

    Optional<PolicyAssignment> findByPolicyVersion_IdAndEmployeeUser_Id(Long policyVersionId, Long employeeUserId);

    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM PolicyAssignment a WHERE a.policyVersion.id = :versionId AND a.employeeUser.id = :userId")
    boolean existsByPolicyVersionIdAndEmployeeUserId(
            @Param("versionId") Long policyVersionId,
            @Param("userId") Long employeeUserId
    );

    boolean existsByPolicyVersion_IdAndEmployeeUser_Id(Long policyVersionId, Long employeeUserId);

    @Query("""
        SELECT a FROM PolicyAssignment a
        WHERE a.assignmentStatus = 'ACTIVE'
          AND a.dueDate IS NOT NULL
          AND a.dueDate = :targetDate
    """)
    List<PolicyAssignment> findActiveAssignmentsDueOn(@Param("targetDate") LocalDate targetDate);

    @Query("""
        SELECT a FROM PolicyAssignment a
        WHERE a.assignmentStatus = 'ACTIVE'
          AND a.dueDate IS NOT NULL
          AND a.dueDate < :currentDate
    """)
    List<PolicyAssignment> findActiveOverdueAssignments(@Param("currentDate") LocalDate currentDate);

    @Query("""
        SELECT a FROM PolicyAssignment a
        WHERE a.policyDocument.id = :documentId
          AND a.departmentIdSnapshot IN :departmentIds
    """)
    List<PolicyAssignment> findByPolicyDocumentIdAndDepartmentIds(
            @Param("documentId") Long documentId,
            @Param("departmentIds") Collection<Long> departmentIds
    );

    @Query("""
        SELECT a FROM PolicyAssignment a
        WHERE a.departmentIdSnapshot IN :departmentIds
          AND a.assignmentStatus = 'ACTIVE'
    """)
    List<PolicyAssignment> findActiveByDepartmentIds(@Param("departmentIds") Collection<Long> departmentIds);
}
