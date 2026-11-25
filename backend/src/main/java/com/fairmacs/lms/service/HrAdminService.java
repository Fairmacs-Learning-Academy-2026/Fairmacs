package com.fairmacs.lms.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fairmacs.lms.entity.EmploymentStatusHistory;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.EmploymentStatusHistoryRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.PasswordSecurityUtil;

@Service
@Transactional
public class HrAdminService {

    private static final Logger log = LoggerFactory.getLogger(HrAdminService.class);

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CertificateRepository certificateRepository;
    private final PasswordEncoder passwordEncoder;
    private EnrollmentService enrollmentService;
    private EmploymentStatusHistoryRepository statusHistoryRepository;

    public HrAdminService(
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository,
            CertificateRepository certificateRepository,
            PasswordEncoder passwordEncoder
    ) {
        this(userRepository, enrollmentRepository, certificateRepository, passwordEncoder, null);
    }

    @Autowired
    public HrAdminService(
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository,
            CertificateRepository certificateRepository,
            PasswordEncoder passwordEncoder,
            @Autowired(required = false) EnrollmentService enrollmentService
    ) {
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.certificateRepository = certificateRepository;
        this.passwordEncoder = passwordEncoder;
        this.enrollmentService = enrollmentService;
    }

    @Autowired(required = false)
    public void setEnrollmentService(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @Autowired(required = false)
    public void setStatusHistoryRepository(EmploymentStatusHistoryRepository statusHistoryRepository) {
        this.statusHistoryRepository = statusHistoryRepository;
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
                                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)
                        )
                )
                .map(this::toEmployeeResponse)
                .toList();
    }

    // =========================================================
    // CREATE EMPLOYEE
    // =========================================================

    public Map<String, Object> createEmployee(Map<String, Object> request) {
        String employeeId = text(request.get("id"));
        String name = text(request.get("name"));
        String email = text(request.get("email"));

        if (employeeId == null || employeeId.isBlank()) {
            employeeId = generateEmployeeId();
        }

        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Employee name is required.");
        }

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Employee email is required.");
        }

        if (userRepository.existsByEmployeeId(employeeId)) {
            throw new IllegalArgumentException("Employee ID already exists.");
        }

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists.");
        }

        String suppliedPassword = text(request.get("password"));
        String initialPassword;
        if (suppliedPassword != null && !suppliedPassword.isBlank()) {
            PasswordSecurityUtil.validatePasswordStrength(suppliedPassword);
            initialPassword = suppliedPassword;
        } else {
            initialPassword = PasswordSecurityUtil.generateSecureTemporaryPassword();
        }

        User user = new User();
        user.setEmployeeId(employeeId.trim());
        user.setName(name.trim());
        user.setEmail(email.trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(initialPassword));
        user.setMustChangePassword(true);
        user.setPasswordChangedAt(LocalDateTime.now());

        String roleValue = defaultText(request.get("role"), "EMPLOYEE").toUpperCase();
        Role selectedRole;
        try {
            selectedRole = Role.valueOf(roleValue);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid role. Allowed roles: EMPLOYEE, TRAINER, MANAGER, HR_ADMIN."
            );
        }

        user.setRole(selectedRole);
        user.setRoleLabel(roleLabel(user.getRole()));

        if (selectedRole == Role.TRAINER) {
            user.setLevel(null);
        } else {
            String positionOrLevel = text(request.get("position"));
            if (positionOrLevel == null || positionOrLevel.isBlank()) {
                positionOrLevel = text(request.get("level"));
            }
            if (positionOrLevel == null || positionOrLevel.isBlank()) {
                throw new IllegalArgumentException(
                        "Position is required for Employee, Manager and HR/Admin."
                );
            }
            positionOrLevel = positionOrLevel.trim().toUpperCase();
            if (positionOrLevel.startsWith("L") && positionOrLevel.length() == 2 && Character.isDigit(positionOrLevel.charAt(1))) {
                positionOrLevel = "P" + positionOrLevel.charAt(1);
            }
            if (!Set.of("P0", "P1", "P2", "P3", "P4").contains(positionOrLevel)) {
                throw new IllegalArgumentException(
                        "Invalid position. Allowed positions: P0, P1, P2, P3, P4."
                );
            }
            user.setLevel(positionOrLevel);
        }

        user.setDesignation(defaultText(request.get("designation"), "Executive"));
        user.setDepartment(defaultText(request.get("department"), "Operations"));
        user.setBranch(defaultText(request.get("branch"), "Corporate HQ"));
        user.setJoiningDate(defaultText(request.get("joiningDate"), LocalDate.now().toString()));

        String statusValue = defaultText(request.get("status"), "ACTIVE");
        user.setStatus(parseStatus(statusValue));

        user.setAvatar(
                defaultText(
                        request.get("avatar"),
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"
                )
        );

        User saved = userRepository.save(user);
        log.info("Created employee account '{}' with mandatory first-login password change.", saved.getEmployeeId());

        if (enrollmentService != null) {
            enrollmentService.enrollEmployeeInMandatoryCourses(saved);
        }

        return toEmployeeResponse(saved);
    }

    // =========================================================
    // UPDATE EMPLOYEE
    // =========================================================

    public Map<String, Object> updateEmployee(String employeeId, Map<String, Object> request) {
        User user = userRepository
                .findByEmployeeId(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "employeeId", employeeId));

        if (request == null) {
            throw new IllegalArgumentException("Update payload is required.");
        }

        String name = text(request.get("name"));
        if (name != null && !name.isBlank()) {
            user.setName(name.trim());
        }

        String email = text(request.get("email"));
        if (email != null && !email.isBlank()) {
            String normalizedEmail = email.trim().toLowerCase();
            if (!normalizedEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(normalizedEmail)) {
                throw new IllegalArgumentException("Email already exists.");
            }
            user.setEmail(normalizedEmail);
        }

        String roleValue = text(request.get("role"));
        if (roleValue != null && !roleValue.isBlank()) {
            try {
                Role selectedRole = Role.valueOf(roleValue.trim().toUpperCase());
                user.setRole(selectedRole);
                user.setRoleLabel(roleLabel(selectedRole));
                if (selectedRole == Role.TRAINER) {
                    user.setLevel(null);
                }
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException(
                        "Invalid role. Allowed roles: EMPLOYEE, TRAINER, MANAGER, HR_ADMIN."
                );
            }
        }

        if (user.getRole() != Role.TRAINER) {
            String positionOrLevel = text(request.get("position"));
            if (positionOrLevel == null || positionOrLevel.isBlank()) {
                positionOrLevel = text(request.get("level"));
            }
            if (positionOrLevel != null && !positionOrLevel.isBlank()) {
                String normalized = positionOrLevel.trim().toUpperCase();
                if (normalized.startsWith("L") && normalized.length() == 2 && Character.isDigit(normalized.charAt(1))) {
                    normalized = "P" + normalized.charAt(1);
                }
                if (!Set.of("P0", "P1", "P2", "P3", "P4").contains(normalized)) {
                    throw new IllegalArgumentException("Invalid position. Allowed positions: P0, P1, P2, P3, P4.");
                }
                user.setLevel(normalized);
            }
        }

        String designation = text(request.get("designation"));
        if (designation != null && !designation.isBlank()) {
            user.setDesignation(designation.trim());
        }

        String department = text(request.get("department"));
        if (department != null && !department.isBlank()) {
            user.setDepartment(department.trim());
        }

        String branch = text(request.get("branch"));
        if (branch != null && !branch.isBlank()) {
            user.setBranch(branch.trim());
        }

        String joiningDate = text(request.get("joiningDate"));
        if (joiningDate != null && !joiningDate.isBlank()) {
            user.setJoiningDate(joiningDate.trim());
        }

        String statusValue = text(request.get("status"));
        if (statusValue != null && !statusValue.isBlank()) {
            user.setStatus(parseStatus(statusValue));
        }

        User saved = userRepository.save(user);
        return toEmployeeResponse(saved);
    }

    // =========================================================
    // CHANGE EMPLOYEE LIFECYCLE STATUS
    // =========================================================

    public Map<String, Object> changeEmployeeStatus(
            String employeeId,
            String status
    ) {
        return changeEmployeeStatus(employeeId, status, "HR administrative update");
    }

    public Map<String, Object> changeEmployeeStatus(
            String employeeId,
            String status,
            String reason
    ) {
        User user = userRepository
                .findByEmployeeId(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "employeeId", employeeId));

        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Employee status is required.");
        }

        UserStatus newStatus;
        try {
            newStatus = UserStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid employee status. Allowed values: ACTIVE, INACTIVE, ON_LEAVE, TERMINATED."
            );
        }

        if (user.getStatus() == newStatus) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("message", "Employee status is already " + formatStatus(newStatus));
            response.put("employeeId", user.getEmployeeId());
            response.put("statusCode", newStatus.name());
            response.put("status", formatStatus(newStatus));
            return response;
        }

        String prevStatus = user.getStatus() != null ? user.getStatus().name() : "ACTIVE";
        user.setStatus(newStatus);
        User savedUser = userRepository.save(user);

        if (statusHistoryRepository != null) {
            EmploymentStatusHistory history = new EmploymentStatusHistory();
            history.setUserId(savedUser.getId());
            history.setEmployeeId(savedUser.getEmployeeId());
            history.setPreviousStatus(prevStatus);
            history.setNewStatus(newStatus.name());
            history.setEffectiveDate(LocalDate.now());
            history.setReason(reason != null && !reason.isBlank() ? reason : "HR administrative update");
            statusHistoryRepository.save(history);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "Employee status changed successfully.");
        response.put("employeeId", savedUser.getEmployeeId());
        response.put("name", savedUser.getName());
        response.put("statusCode", savedUser.getStatus().name());
        response.put("status", formatStatus(savedUser.getStatus()));

        return response;
    }

    public List<EmploymentStatusHistory> getEmployeeStatusHistory(String employeeId) {
        if (statusHistoryRepository == null) {
            return List.of();
        }
        return statusHistoryRepository.findByEmployeeIdOrderByEffectiveDateDescCreatedAtDesc(employeeId);
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
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "employeeId", employeeId));

        String temporaryPassword;
        if (newPassword != null && !newPassword.isBlank()) {
            PasswordSecurityUtil.validatePasswordStrength(newPassword);
            temporaryPassword = newPassword;
        } else {
            temporaryPassword = PasswordSecurityUtil.generateSecureTemporaryPassword();
        }

        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);

        LocalDateTime now = LocalDateTime.now();
        if (user.getPasswordChangedAt() != null && !now.isAfter(user.getPasswordChangedAt())) {
            now = user.getPasswordChangedAt().plusNanos(1_000_000);
        }
        user.setPasswordChangedAt(now);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);

        userRepository.save(user);
        log.info("Password reset executed for employee '{}'; mandatory password change required on next login.",
                user.getEmployeeId());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("employeeId", user.getEmployeeId());
        response.put("temporaryPasswordSet", true);
        response.put("mustChangePassword", true);

        return response;
    }

    // =========================================================
    // HR DASHBOARD METRICS
    // =========================================================

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardMetrics() {
        List<User> employees = userRepository.findAll();
        List<Enrollment> enrollments = enrollmentRepository.findAll();

        long totalEmployees = employees.size();

        long activeEmployees = employees.stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .count();

        long activeLearners = enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.IN_PROGRESS)
                .map(e -> e.getUser().getId())
                .distinct()
                .count();

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
                overallCompletionRate = totalProgress / progressCount;
            }
        }

        double avgTrainingHours = 0;
        List<Double> trainingHours = enrollments.stream()
                .filter(e -> e.getCourse() != null)
                .map(e -> e.getCourse().getDurationHours())
                .filter(value -> value != null)
                .toList();

        if (!trainingHours.isEmpty()) {
            avgTrainingHours = trainingHours.stream()
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0);
        }

        long certificatesIssued = certificateRepository.count();

        List<Enrollment> mandatoryEnrollments = enrollments.stream()
                .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY)
                .toList();

        long mandatoryCompleted = mandatoryEnrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED)
                .count();

        double mandatoryComplianceRate = 0;
        if (!mandatoryEnrollments.isEmpty()) {
            mandatoryComplianceRate = (mandatoryCompleted * 100.0) / mandatoryEnrollments.size();
        }

        List<User> activeEmployeesList = employees.stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .toList();

        List<Map<String, Object>> departmentStats = buildDepartmentStats(activeEmployeesList, enrollments);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalEmployees", totalEmployees);
        response.put("activeEmployees", activeEmployees);
        response.put("activeLearners", activeLearners);
        response.put("overallCompletionRate", round(overallCompletionRate));
        response.put("avgTrainingHours", round(avgTrainingHours));
        response.put("certificatesIssued", certificatesIssued);
        response.put("mandatoryComplianceRate", round(mandatoryComplianceRate));
        response.put("departmentStats", departmentStats);

        return response;
    }

    private List<Map<String, Object>> buildDepartmentStats(
            List<User> activeEmployees,
            List<Enrollment> enrollments
    ) {
        return activeEmployees.stream()
                .map(User::getDepartment)
                .filter(department -> department != null && !department.isBlank())
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .map(department -> {
                    List<User> departmentEmployees = activeEmployees.stream()
                            .filter(user -> department.equalsIgnoreCase(user.getDepartment()))
                            .toList();

                    long total = departmentEmployees.size();
                    long completed = 0;
                    int totalAssignedCourses = 0;
                    List<Double> learnerProgressList = new ArrayList<>();

                    for (User employee : departmentEmployees) {
                        List<Enrollment> assignedEnrollments = enrollments.stream()
                                .filter(e -> e.getUser() != null && employee.getId().equals(e.getUser().getId()))
                                .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY
                                        || e.getEnrollmentType() == EnrollmentType.RECOMMENDED)
                                .toList();

                        if (!assignedEnrollments.isEmpty()) {
                            totalAssignedCourses += assignedEnrollments.size();

                            boolean hasCompletedAssignedCourse = assignedEnrollments.stream()
                                    .anyMatch(e -> e.getStatus() == EnrollmentStatus.COMPLETED);
                            if (hasCompletedAssignedCourse) {
                                completed++;
                            }

                            double employeeAvgProgress = assignedEnrollments.stream()
                                    .mapToInt(e -> (e.getStatus() == EnrollmentStatus.COMPLETED)
                                            ? 100
                                            : (e.getProgressPercent() != null ? e.getProgressPercent() : 0))
                                    .average()
                                    .orElse(0.0);
                            learnerProgressList.add(employeeAvgProgress);
                        }
                    }

                    double rate = learnerProgressList.isEmpty()
                            ? 0.0
                            : learnerProgressList.stream()
                                    .mapToDouble(Double::doubleValue)
                                    .average()
                                    .orElse(0.0);

                    boolean hasAssignedTraining = totalAssignedCourses > 0;

                    Map<String, Object> stat = new LinkedHashMap<>();
                    stat.put("department", department);
                    stat.put("total", total);
                    stat.put("completed", completed);
                    stat.put("rate", round(rate));
                    stat.put("assignedCoursesCount", totalAssignedCourses);
                    stat.put("hasAssignedTraining", hasAssignedTraining);

                    return stat;
                })
                .toList();
    }

    private Map<String, Object> toEmployeeResponse(User user) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", user.getEmployeeId());
        response.put("employeeId", user.getEmployeeId());
        response.put("userId", user.getId());
        response.put("name", user.getName());
        response.put("level", user.getLevel());
        response.put("position", user.getLevel());
        response.put("email", user.getEmail());
        response.put("role", user.getRole() != null ? user.getRole().name() : "EMPLOYEE");
        response.put("roleLabel", user.getRoleLabel());
        response.put("designation", user.getDesignation());
        response.put("department", user.getDepartment());
        response.put("branch", user.getBranch());
        response.put("joiningDate", user.getJoiningDate());
        response.put("status", formatStatus(user.getStatus()));
        response.put("statusCode", user.getStatus() != null ? user.getStatus().name() : UserStatus.ACTIVE.name());
        response.put("avatar", user.getAvatar());
        response.put("mustChangePassword", Boolean.TRUE.equals(user.getMustChangePassword()));
        return response;
    }

    private UserStatus parseStatus(String value) {
        if (value == null || value.isBlank()) {
            return UserStatus.ACTIVE;
        }

        String normalized = value.trim()
                .toUpperCase()
                .replace('-', '_')
                .replace(' ', '_');

        if ("DISABLED".equals(normalized)) {
            return UserStatus.INACTIVE;
        }

        try {
            return UserStatus.valueOf(normalized);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(
                    "Invalid employee status. Allowed values: ACTIVE, INACTIVE, ON_LEAVE, TERMINATED."
            );
        }
    }

    private String formatStatus(UserStatus status) {
        if (status == null) {
            return "Active";
        }
        return switch (status) {
            case ACTIVE -> "Active";
            case INACTIVE -> "Inactive";
            case ON_LEAVE -> "On Leave";
            case TERMINATED -> "Terminated";
        };
    }

    private String roleLabel(Role role) {
        if (role == null) {
            return "Employee";
        }
        if (role == Role.HR_ADMIN) {
            return "HR / Admin";
        }
        String value = role.name().replace('_', ' ').toLowerCase();
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    private String generateEmployeeId() {
        int nextNumber = 1001;
        String candidate;
        do {
            candidate = "EMP" + nextNumber++;
        } while (userRepository.existsByEmployeeId(candidate));
        return candidate;
    }

    private String text(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }

    private String defaultText(Object value, String fallback) {
        String valueText = text(value);
        return valueText == null || valueText.isBlank() ? fallback : valueText;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
