package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.EmployeePreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeePreferenceRepository extends JpaRepository<EmployeePreference, Long> {
    Optional<EmployeePreference> findByUserId(Long userId);
}
