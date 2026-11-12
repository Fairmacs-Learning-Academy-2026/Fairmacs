package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.EmploymentStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmploymentStatusHistoryRepository extends JpaRepository<EmploymentStatusHistory, Long> {
    List<EmploymentStatusHistory> findByUserIdOrderByEffectiveDateDescCreatedAtDesc(Long userId);
    List<EmploymentStatusHistory> findByEmployeeIdOrderByEffectiveDateDescCreatedAtDesc(String employeeId);
    List<EmploymentStatusHistory> findAllByOrderByEffectiveDateDescCreatedAtDesc();
}
