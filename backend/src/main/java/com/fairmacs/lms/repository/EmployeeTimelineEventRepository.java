package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.EmployeeTimelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeTimelineEventRepository extends JpaRepository<EmployeeTimelineEvent, Long> {
    List<EmployeeTimelineEvent> findByUserIdOrderByEventDateDescCreatedAtDesc(Long userId);
    List<EmployeeTimelineEvent> findByEmployeeIdOrderByEventDateDescCreatedAtDesc(String employeeId);
}
