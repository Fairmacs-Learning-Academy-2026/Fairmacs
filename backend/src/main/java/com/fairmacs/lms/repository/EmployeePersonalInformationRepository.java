package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.EmployeePersonalInformation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeePersonalInformationRepository extends JpaRepository<EmployeePersonalInformation, Long> {
    Optional<EmployeePersonalInformation> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
}
