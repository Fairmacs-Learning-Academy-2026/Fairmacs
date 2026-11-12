package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.EmployeeEmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeEmergencyContactRepository extends JpaRepository<EmployeeEmergencyContact, Long> {
    List<EmployeeEmergencyContact> findByUserIdOrderByIsPrimaryDescCreatedAtAsc(Long userId);
}
