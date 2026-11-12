package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.EmployeeImportAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeImportAuditLogRepository extends JpaRepository<EmployeeImportAuditLog, Long> {
    List<EmployeeImportAuditLog> findTop20ByOrderByCreatedAtDesc();
}
