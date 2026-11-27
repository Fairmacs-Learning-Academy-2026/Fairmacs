package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.EmploymentStatusHistoryRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class HrAdminDepartmentAnalyticsTest {

    private UserRepository userRepository;
    private EnrollmentRepository enrollmentRepository;
    private CertificateRepository certificateRepository;
    private EmploymentStatusHistoryRepository statusHistoryRepository;
    private PasswordEncoder passwordEncoder;
    private HrAdminService hrAdminService;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        enrollmentRepository = Mockito.mock(EnrollmentRepository.class);
        certificateRepository = Mockito.mock(CertificateRepository.class);
        statusHistoryRepository = Mockito.mock(EmploymentStatusHistoryRepository.class);
        passwordEncoder = Mockito.mock(PasswordEncoder.class);

        hrAdminService = new HrAdminService(
                userRepository,
                enrollmentRepository,
                certificateRepository,
                passwordEncoder
        );
    }

    private User createUser(Long id, String name, String department, UserStatus status) {
        User user = new User();
        user.setId(id);
        user.setName(name);
        user.setEmail(name.toLowerCase().replace(" ", "") + "@fairmacs.com");
        user.setDepartment(department);
        user.setStatus(status);
        user.setRole(Role.EMPLOYEE);
        return user;
    }

    private Enrollment createEnrollment(Long id, User user, EnrollmentType type, EnrollmentStatus status, Integer progress) {
        Enrollment enrollment = new Enrollment();
        enrollment.setId(id);
        enrollment.setUser(user);
        enrollment.setEnrollmentType(type);
        enrollment.setStatus(status);
        enrollment.setProgressPercent(progress);
        return enrollment;
    }

    @Test
    @DisplayName("Department analytics calculates rate from assigned courses, active employees, and learner averages")
    void testDepartmentAnalyticsCalculations() {
        // Active Operations employees
        User ops1 = createUser(1L, "Alice Ops", "Operations", UserStatus.ACTIVE);
        User ops2 = createUser(2L, "Bob Ops", "Operations", UserStatus.ACTIVE);
        User ops3 = createUser(3L, "Charlie Ops", "Operations", UserStatus.ACTIVE); // No assignments
        // Inactive Operations employee (must be excluded from total)
        User opsInactive = createUser(4L, "Dave Inactive", "Operations", UserStatus.INACTIVE);

        // Active Documentation employee (no assigned courses)
        User doc1 = createUser(5L, "Eve Doc", "Documentation", UserStatus.ACTIVE);

        when(userRepository.findAll()).thenReturn(List.of(ops1, ops2, ops3, opsInactive, doc1));

        // Enrollments:
        // Ops1: Course 1 (MANDATORY, COMPLETED, 100%), Course 2 (RECOMMENDED, IN_PROGRESS, 50%) -> avg = 75%
        Enrollment e1 = createEnrollment(101L, ops1, EnrollmentType.MANDATORY, EnrollmentStatus.COMPLETED, 100);
        Enrollment e2 = createEnrollment(102L, ops1, EnrollmentType.RECOMMENDED, EnrollmentStatus.IN_PROGRESS, 50);

        // Ops2: Course 3 (MANDATORY, IN_PROGRESS, 25%), Course 4 (SELF_SELECTED, COMPLETED, 100% - must be ignored)
        Enrollment e3 = createEnrollment(103L, ops2, EnrollmentType.MANDATORY, EnrollmentStatus.IN_PROGRESS, 25);
        Enrollment e4 = createEnrollment(104L, ops2, EnrollmentType.SELF_SELECTED, EnrollmentStatus.COMPLETED, 100);

        when(enrollmentRepository.findAll()).thenReturn(List.of(e1, e2, e3, e4));
        when(enrollmentRepository.findAllWithUserAndCourse()).thenReturn(List.of(e1, e2, e3, e4));
        when(certificateRepository.count()).thenReturn(1L);

        Map<String, Object> metrics = hrAdminService.getDashboardMetrics();
        assertNotNull(metrics);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> deptStats = (List<Map<String, Object>>) metrics.get("departmentStats");
        assertNotNull(deptStats);
        assertEquals(2, deptStats.size());

        // 1. Documentation
        Map<String, Object> docStats = deptStats.stream()
                .filter(d -> "Documentation".equals(d.get("department")))
                .findFirst()
                .orElseThrow();
        assertEquals(1L, docStats.get("total"), "Total active headcount for Documentation must be 1");
        assertEquals(0L, docStats.get("completed"), "Completed count must be 0");
        assertEquals(0.0, (Double) docStats.get("rate"), 0.01, "Rate must be 0.0 when no assignments exist");
        assertEquals(0, docStats.get("assignedCoursesCount"), "Assigned courses count must be 0");
        assertEquals(false, docStats.get("hasAssignedTraining"), "hasAssignedTraining must be false");

        // 2. Operations
        Map<String, Object> opsStats = deptStats.stream()
                .filter(d -> "Operations".equals(d.get("department")))
                .findFirst()
                .orElseThrow();
        assertEquals(3L, opsStats.get("total"), "Total active headcount for Operations must be 3 (excluding inactive)");
        assertEquals(1L, opsStats.get("completed"), "Completed count must be 1 (Alice Ops completed >=1 assigned course; Bob's self-selected doesn't count)");

        // Rate: Ops1 avg = 75%, Ops2 avg = 25% (ignoring self-selected). Dept rate = (75 + 25) / 2 = 50.0%
        // Ops3 has no assignments and must not dilute the denominator.
        assertEquals(50.0, (Double) opsStats.get("rate"), 0.01, "Rate must be 50.0% based on learner averages");
        assertEquals(3, opsStats.get("assignedCoursesCount"), "Assigned courses count must be 3 (MANDATORY + RECOMMENDED)");
        assertEquals(true, opsStats.get("hasAssignedTraining"), "hasAssignedTraining must be true");
    }
}
