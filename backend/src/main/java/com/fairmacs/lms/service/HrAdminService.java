package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class HrAdminService {

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CertificateRepository certificateRepository;
    private final PasswordEncoder passwordEncoder;

    public HrAdminService(
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository,
            CertificateRepository certificateRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.certificateRepository = certificateRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // =========================================================
    // GET ALL EMPLOYEES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getEmployees() {

        return userRepository.findAll()
                .stream()
                .sorted(
                        Comparator.comparing(
                                User::getEmployeeId,
                                Comparator.nullsLast(
                                        String.CASE_INSENSITIVE_ORDER
                                )
                        )
                )
                .map(this::toEmployeeResponse)
                .toList();
    }

    // =========================================================
    // CREATE EMPLOYEE
    // =========================================================

    public Map<String, Object> createEmployee(
            Map<String, Object> request
    ) {

        String employeeId = text(request.get("id"));
        String name = text(request.get("name"));
        String email = text(request.get("email"));

        if (employeeId == null || employeeId.isBlank()) {
            employeeId = generateEmployeeId();
        }

        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException(
                    "Employee name is required."
            );
        }

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "Employee email is required."
            );
        }

        if (userRepository.existsByEmployeeId(employeeId)) {
            throw new IllegalArgumentException(
                    "Employee ID already exists."
            );
        }

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException(
                    "Email already exists."
            );
        }

        User user = new User();

        user.setEmployeeId(employeeId.trim());

        user.setName(name.trim());

        user.setEmail(email.trim().toLowerCase());

        // Password is hashed before storing in MySQL
        user.setPassword(
                passwordEncoder.encode(
                        defaultText(
                                request.get("password"),
                                "Employee@123"
                        )
                )
        );

        String roleValue = defaultText(
                request.get("role"),
                "EMPLOYEE"
        ).toUpperCase();

        user.setRole(
                Role.valueOf(roleValue)
        );

        user.setRoleLabel(
                roleLabel(user.getRole())
        );

        user.setDesignation(
                defaultText(
                        request.get("designation"),
                        "Executive"
                )
        );

        user.setDepartment(
                defaultText(
                        request.get("department"),
                        "Operations"
                )
        );

        user.setBranch(
                defaultText(
                        request.get("branch"),
                        "Corporate HQ"
                )
        );

        user.setJoiningDate(
                defaultText(
                        request.get("joiningDate"),
                        LocalDate.now().toString()
                )
        );

        String statusValue = defaultText(
                request.get("status"),
                "Active"
        );

        user.setStatus(
                parseStatus(statusValue)
        );

        user.setAvatar(
                defaultText(
                        request.get("avatar"),
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"
                )
        );

        User saved = userRepository.save(user);

        return toEmployeeResponse(saved);
    }

    // =========================================================
    // ENABLE / DISABLE EMPLOYEE
    // =========================================================

    public Map<String, Object> toggleEmployeeStatus(
            String employeeId
    ) {

        User user = userRepository
                .findByEmployeeId(employeeId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Employee not found."
                        )
                );

        if (user.getStatus() == UserStatus.ACTIVE) {
            user.setStatus(UserStatus.DISABLED);
        } else {
            user.setStatus(UserStatus.ACTIVE);
        }

        User saved = userRepository.save(user);

        return toEmployeeResponse(saved);
    }

    // =========================================================
    // RESET EMPLOYEE PASSWORD
    // =========================================================

    public Map<String, Object> resetEmployeePassword(
        String employeeId,
        String newPassword
) {

    User user = userRepository
            .findByEmployeeId(employeeId)
            .orElseThrow(
                    () -> new IllegalArgumentException(
                            "Employee not found."
                    )
            );

    String password =
            (newPassword == null || newPassword.isBlank())
                    ? "Reset@123"
                    : newPassword;

    // Store only the BCrypt-hashed password in the database
    user.setPassword(
            passwordEncoder.encode(password)
    );

    userRepository.save(user);

    Map<String, Object> response =
            new LinkedHashMap<>();

    response.put("success", true);
    response.put("employeeId", user.getEmployeeId());

    // Do not return the plaintext password
    response.put("temporaryPasswordSet", true);

    return response;
}

    // =========================================================
    // HR DASHBOARD METRICS
    // =========================================================

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardMetrics() {

        List<User> users = userRepository.findAll();

        List<User> employees = users;

        List<Enrollment> enrollments =
                enrollmentRepository.findAll();

        // -----------------------------------------------------
        // Total Employees
        // -----------------------------------------------------

        long totalEmployees = employees.size();

        // -----------------------------------------------------
        // Active Employees
        // -----------------------------------------------------

        long activeEmployees = employees.stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .count();

        // -----------------------------------------------------
        // Active Learners
        // -----------------------------------------------------

        long activeLearners = enrollments.stream()
                .filter(e ->
                        e.getStatus() == EnrollmentStatus.IN_PROGRESS
                )
                .map(e -> e.getUser().getId())
                .distinct()
                .count();

        // -----------------------------------------------------
        // Overall Completion Rate
        // -----------------------------------------------------

        double overallCompletionRate = 0;

        if (!enrollments.isEmpty()) {

            double totalProgress = enrollments.stream()
                    .map(Enrollment::getProgressPercent)
                    .filter(value -> value != null)
                    .mapToDouble(Integer::doubleValue)
                    .sum();

            long progressCount = enrollments.stream()
                    .filter(e -> e.getProgressPercent() != null)
                    .count();

            if (progressCount > 0) {
                overallCompletionRate =
                        totalProgress / progressCount;
            }
        }

        // -----------------------------------------------------
        // Average Training Hours
        // -----------------------------------------------------

        double avgTrainingHours = 0;

        List<Double> trainingHours = enrollments.stream()
                .filter(e -> e.getCourse() != null)
                .map(e -> e.getCourse().getDurationHours())
                .filter(value -> value != null)
                .toList();

        if (!trainingHours.isEmpty()) {

            avgTrainingHours =
                    trainingHours.stream()
                            .mapToDouble(Double::doubleValue)
                            .average()
                            .orElse(0);
        }

        // -----------------------------------------------------
        // Certificates
        // -----------------------------------------------------

        long certificatesIssued =
                certificateRepository.count();

        // -----------------------------------------------------
        // Mandatory Compliance
        // -----------------------------------------------------

        List<Enrollment> mandatoryEnrollments =
                enrollments.stream()
                        .filter(e ->
                                e.getEnrollmentType()
                                        == EnrollmentType.MANDATORY
                        )
                        .toList();

        long mandatoryCompleted =
                mandatoryEnrollments.stream()
                        .filter(e ->
                                e.getStatus()
                                        == EnrollmentStatus.COMPLETED
                        )
                        .count();

        double mandatoryComplianceRate = 0;

        if (!mandatoryEnrollments.isEmpty()) {

            mandatoryComplianceRate =
                    (mandatoryCompleted * 100.0)
                            / mandatoryEnrollments.size();
        }

        // -----------------------------------------------------
        // Department Statistics
        // -----------------------------------------------------

        List<Map<String, Object>> departmentStats =
                buildDepartmentStats(employees, enrollments);

        // -----------------------------------------------------
        // Response
        // -----------------------------------------------------

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "totalEmployees",
                totalEmployees
        );

        response.put(
                "activeEmployees",
                activeEmployees
        );

        response.put(
                "activeLearners",
                activeLearners
        );

        response.put(
                "overallCompletionRate",
                round(overallCompletionRate)
        );

        response.put(
                "avgTrainingHours",
                round(avgTrainingHours)
        );

        response.put(
                "certificatesIssued",
                certificatesIssued
        );

        response.put(
                "mandatoryComplianceRate",
                round(mandatoryComplianceRate)
        );

        response.put(
                "departmentStats",
                departmentStats
        );

        return response;
    }

    // =========================================================
    // DEPARTMENT STATISTICS
    // =========================================================

    private List<Map<String, Object>> buildDepartmentStats(
            List<User> employees,
            List<Enrollment> enrollments
    ) {

        return employees.stream()
                .map(User::getDepartment)
                .filter(department ->
                        department != null &&
                        !department.isBlank()
                )
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .map(department -> {

                    List<User> departmentEmployees =
                            employees.stream()
                                    .filter(user ->
                                            department.equalsIgnoreCase(
                                                    user.getDepartment()
                                            )
                                    )
                                    .toList();

                    long total =
                            departmentEmployees.size();

                    long completed = 0;

                    for (User employee : departmentEmployees) {

                        List<Enrollment> mandatory =
                                enrollments.stream()
                                        .filter(e ->
                                                e.getUser() != null &&
                                                employee.getId()
                                                        .equals(
                                                                e.getUser().getId()
                                                        )
                                        )
                                        .filter(e ->
                                                e.getEnrollmentType()
                                                        == EnrollmentType.MANDATORY
                                        )
                                        .toList();

                        if (!mandatory.isEmpty()) {

                            boolean allCompleted =
                                    mandatory.stream()
                                            .allMatch(e ->
                                                    e.getStatus()
                                                            == EnrollmentStatus.COMPLETED
                                            );

                            if (allCompleted) {
                                completed++;
                            }
                        }
                    }

                    double rate = total == 0
                            ? 0
                            : (completed * 100.0) / total;

                    Map<String, Object> stat =
                            new LinkedHashMap<>();

                    stat.put(
                            "department",
                            department
                    );

                    stat.put(
                            "total",
                            total
                    );

                    stat.put(
                            "completed",
                            completed
                    );

                    stat.put(
                            "rate",
                            round(rate)
                    );

                    return stat;

                })
                .toList();
    }

    // =========================================================
    // EMPLOYEE RESPONSE
    // =========================================================

    private Map<String, Object> toEmployeeResponse(
            User user
    ) {

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "id",
                user.getEmployeeId()
        );

        response.put(
                "employeeId",
                user.getEmployeeId()
        );

        response.put(
                "userId",
                user.getId()
        );

        response.put(
                "name",
                user.getName()
        );

        response.put(
                "email",
                user.getEmail()
        );

        response.put(
                "role",
                user.getRole() != null
                        ? user.getRole().name()
                        : "EMPLOYEE"
        );

        response.put(
                "roleLabel",
                user.getRoleLabel()
        );

        response.put(
                "designation",
                user.getDesignation()
        );

        response.put(
                "department",
                user.getDepartment()
        );

        response.put(
                "branch",
                user.getBranch()
        );

        response.put(
                "joiningDate",
                user.getJoiningDate()
        );

        response.put(
                "status",
                user.getStatus() == UserStatus.ACTIVE
                        ? "Active"
                        : "Disabled"
        );

        response.put(
                "avatar",
                user.getAvatar()
        );

        return response;
    }

    // =========================================================
    // STATUS
    // =========================================================

    private UserStatus parseStatus(
            String value
    ) {

        if ("DISABLED".equalsIgnoreCase(value)) {
            return UserStatus.DISABLED;
        }

        return UserStatus.ACTIVE;
    }

    // =========================================================
    // ROLE LABEL
    // =========================================================

    private String roleLabel(
            Role role
    ) {

        if (role == null) {
            return "Employee";
        }

        if (role == Role.HR_ADMIN) {
            return "HR / Admin";
        }

        String value =
                role.name()
                        .replace('_', ' ')
                        .toLowerCase();

        return Character.toUpperCase(
                value.charAt(0)
        ) + value.substring(1);
    }

    // =========================================================
    // GENERATE EMPLOYEE ID
    // =========================================================

    private String generateEmployeeId() {

        int nextNumber = 1001;

        String candidate;

        do {

            candidate =
                    "EMP" + nextNumber++;

        } while (
                userRepository
                        .existsByEmployeeId(candidate)
        );

        return candidate;
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private String text(
            Object value
    ) {

        return value == null
                ? null
                : String.valueOf(value).trim();
    }

    private String defaultText(
            Object value,
            String fallback
    ) {

        String valueText =
                text(value);

        return valueText == null ||
                valueText.isBlank()
                ? fallback
                : valueText;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}