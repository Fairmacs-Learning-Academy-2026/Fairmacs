package com.fairmacs.lms.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmployeeId(String employeeId);

    Optional<User> findByEmailOrEmployeeId(String email, String employeeId);

    List<User> findByDepartment(String department);

    List<User> findByRole(Role role);

    List<User> findByRoleAndStatus(Role role, UserStatus status);

    List<User> findByDepartmentAndRole(String department, Role role);

    List<User> findByStatus(UserStatus status);

    boolean existsByEmail(String email);

    boolean existsByEmployeeId(String employeeId);
}
