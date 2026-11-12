package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.EmploymentStatusRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmploymentStatusRequestRepository extends JpaRepository<EmploymentStatusRequest, Long> {
    List<EmploymentStatusRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<EmploymentStatusRequest> findByEmployeeIdOrderByCreatedAtDesc(String employeeId);
    List<EmploymentStatusRequest> findByRequestStatusOrderByCreatedAtDesc(String requestStatus);
    List<EmploymentStatusRequest> findAllByOrderByCreatedAtDesc();
}
