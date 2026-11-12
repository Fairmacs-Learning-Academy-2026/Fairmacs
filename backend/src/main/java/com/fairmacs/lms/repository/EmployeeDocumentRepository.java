package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.EmployeeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, Long> {
    List<EmployeeDocument> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<EmployeeDocument> findByEmployeeIdOrderByCreatedAtDesc(String employeeId);
    List<EmployeeDocument> findByIsCompanyPolicyTrueOrderByCreatedAtDesc();
    Optional<EmployeeDocument> findByWorkdriveFileId(String workdriveFileId);
}
