package com.fairmacs.lms.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmployeeId(String employeeId);

    /*
     * Case-insensitive login using either:
     * - Corporate Email
     * - Employee ID
     *
     * Examples:
     * EMP1001
     * emp1001
     * Emp1001
     *
     * will all find the same employee.
     */
    @Query("""
        SELECT u
        FROM User u
        WHERE LOWER(u.email) = LOWER(:loginId)
           OR LOWER(u.employeeId) = LOWER(:loginId)
    """)
    Optional<User> findByEmailOrEmployeeIdIgnoreCase(
            @Param("loginId") String loginId
    );

    List<User> findByDepartment(String department);

    List<User> findByRole(Role role);

    List<User> findByRoleAndStatus(
            Role role,
            UserStatus status
    );

    List<User> findByDepartmentAndRole(
            String department,
            Role role
    );

    List<User> findByStatus(UserStatus status);

    boolean existsByEmail(String email);

    boolean existsByEmployeeId(String employeeId);
}