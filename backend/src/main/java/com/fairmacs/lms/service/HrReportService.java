package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class HrReportService {

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;

    public HrReportService(
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository
    ) {
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    // =========================================================
    // HR TRAINING REPORT
    // =========================================================

    public Map<String, Object> getHrTrainingReport() {

        // -----------------------------------------------------
        // Only actual employees
        // -----------------------------------------------------

        List<User> employees =
                userRepository.findAll()
                        .stream()
                        .filter(user -> user.getRole() == Role.EMPLOYEE)
                        .toList();

        List<Enrollment> enrollments =
                enrollmentRepository.findAll()
                        .stream()
                        .filter(e ->
                                e.getUser() != null &&
                                e.getUser().getRole() == Role.EMPLOYEE
                        )
                        .toList();

        // -----------------------------------------------------
        // Summary
        // -----------------------------------------------------

        long totalEmployees = employees.size();

        long activeEmployees =
                employees.stream()
                        .filter(user ->
                                user.getStatus() != null &&
                                user.getStatus().name().equals("ACTIVE")
                        )
                        .count();

        long totalAssignments = enrollments.size();

        long completedAssignments =
                enrollments.stream()
                        .filter(e ->
                                e.getStatus() == EnrollmentStatus.COMPLETED
                        )
                        .count();

        long inProgressAssignments =
                enrollments.stream()
                        .filter(e ->
                                e.getStatus() == EnrollmentStatus.IN_PROGRESS
                        )
                        .count();

        long notStartedAssignments =
                enrollments.stream()
                        .filter(e ->
                                e.getStatus() == EnrollmentStatus.NOT_STARTED
                        )
                        .count();

        long overdueAssignments =
                enrollments.stream()
                        .filter(this::isOverdue)
                        .count();

        long mandatoryAssignments =
                enrollments.stream()
                        .filter(e ->
                                e.getEnrollmentType() == EnrollmentType.MANDATORY
                        )
                        .count();

        long mandatoryCompleted =
                enrollments.stream()
                        .filter(e ->
                                e.getEnrollmentType() == EnrollmentType.MANDATORY &&
                                e.getStatus() == EnrollmentStatus.COMPLETED
                        )
                        .count();

        long certificatesIssued =
                enrollments.stream()
                        .filter(e ->
                                e.getCertificateId() != null &&
                                !e.getCertificateId().isBlank()
                        )
                        .count();

        double averageProgress =
                enrollments.stream()
                        .map(Enrollment::getProgressPercent)
                        .filter(value -> value != null)
                        .mapToDouble(Integer::doubleValue)
                        .average()
                        .orElse(0);

        double averageScore =
                enrollments.stream()
                        .map(Enrollment::getScore)
                        .filter(value -> value != null)
                        .mapToDouble(Integer::doubleValue)
                        .average()
                        .orElse(0);

        double mandatoryCompliance =
                mandatoryAssignments == 0
                        ? 0
                        : (mandatoryCompleted * 100.0)
                        / mandatoryAssignments;

        // -----------------------------------------------------
        // Employee-wise report
        // -----------------------------------------------------

        List<Map<String, Object>> employeeReports =
                buildEmployeeReports(employees, enrollments);

        // -----------------------------------------------------
        // Department-wise report
        // -----------------------------------------------------

        List<Map<String, Object>> departmentReports =
                buildDepartmentReports(employees, enrollments);

        // -----------------------------------------------------
        // Response
        // -----------------------------------------------------

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put("totalEmployees", totalEmployees);
        response.put("activeEmployees", activeEmployees);

        response.put("totalAssignments", totalAssignments);
        response.put("completedAssignments", completedAssignments);
        response.put("inProgressAssignments", inProgressAssignments);
        response.put("notStartedAssignments", notStartedAssignments);
        response.put("overdueAssignments", overdueAssignments);

        response.put("mandatoryAssignments", mandatoryAssignments);
        response.put("mandatoryCompleted", mandatoryCompleted);
        response.put(
                "mandatoryComplianceRate",
                round(mandatoryCompliance)
        );

        response.put(
                "averageProgress",
                round(averageProgress)
        );

        response.put(
                "averageScore",
                round(averageScore)
        );

        response.put("certificatesIssued", certificatesIssued);

        response.put("employeeReports", employeeReports);
        response.put("departmentReports", departmentReports);

        return response;
    }

    // =========================================================
    // EMPLOYEE REPORTS
    // =========================================================

    private List<Map<String, Object>> buildEmployeeReports(
            List<User> employees,
            List<Enrollment> enrollments
    ) {

        List<Map<String, Object>> reports =
                new ArrayList<>();

        for (User employee : employees) {

            List<Enrollment> employeeEnrollments =
                    enrollments.stream()
                            .filter(e ->
                                    e.getUser() != null &&
                                    employee.getId()
                                            .equals(e.getUser().getId())
                            )
                            .toList();

            int assigned = employeeEnrollments.size();

            long completed =
                    employeeEnrollments.stream()
                            .filter(e ->
                                    e.getStatus() ==
                                            EnrollmentStatus.COMPLETED
                            )
                            .count();

            long inProgress =
                    employeeEnrollments.stream()
                            .filter(e ->
                                    e.getStatus() ==
                                            EnrollmentStatus.IN_PROGRESS
                            )
                            .count();

            long notStarted =
                    employeeEnrollments.stream()
                            .filter(e ->
                                    e.getStatus() ==
                                            EnrollmentStatus.NOT_STARTED
                            )
                            .count();

            long overdue =
                    employeeEnrollments.stream()
                            .filter(this::isOverdue)
                            .count();

            double progress =
                    employeeEnrollments.stream()
                            .map(Enrollment::getProgressPercent)
                            .filter(value -> value != null)
                            .mapToDouble(Integer::doubleValue)
                            .average()
                            .orElse(0);

            double score =
                    employeeEnrollments.stream()
                            .map(Enrollment::getScore)
                            .filter(value -> value != null)
                            .mapToDouble(Integer::doubleValue)
                            .average()
                            .orElse(0);

            long mandatory =
                    employeeEnrollments.stream()
                            .filter(e ->
                                    e.getEnrollmentType() ==
                                            EnrollmentType.MANDATORY
                            )
                            .count();

            long mandatoryCompleted =
                    employeeEnrollments.stream()
                            .filter(e ->
                                    e.getEnrollmentType() ==
                                            EnrollmentType.MANDATORY &&
                                    e.getStatus() ==
                                            EnrollmentStatus.COMPLETED
                            )
                            .count();

            Map<String, Object> report =
                    new LinkedHashMap<>();

            report.put("userId", employee.getId());
            report.put("employeeId", employee.getEmployeeId());
            report.put("name", employee.getName());
            report.put("email", employee.getEmail());
            report.put("designation", employee.getDesignation());
            report.put("department", employee.getDepartment());
            report.put("status",
                    employee.getStatus() != null
                            ? employee.getStatus().name()
                            : null);

            report.put("assignedCourses", assigned);
            report.put("completedCourses", completed);
            report.put("inProgressCourses", inProgress);
            report.put("notStartedCourses", notStarted);
            report.put("overdueCourses", overdue);

            report.put("averageProgress", round(progress));
            report.put("averageScore", round(score));

            report.put("mandatoryCourses", mandatory);
            report.put(
                    "mandatoryCompleted",
                    mandatoryCompleted
            );

            reports.add(report);
        }

        return reports;
    }

    // =========================================================
    // DEPARTMENT REPORTS
    // =========================================================

    private List<Map<String, Object>> buildDepartmentReports(
            List<User> employees,
            List<Enrollment> enrollments
    ) {

        List<String> departments =
                employees.stream()
                        .map(User::getDepartment)
                        .filter(department ->
                                department != null &&
                                !department.isBlank()
                        )
                        .distinct()
                        .sorted(String.CASE_INSENSITIVE_ORDER)
                        .toList();

        List<Map<String, Object>> reports =
                new ArrayList<>();

        for (String department : departments) {

            List<User> departmentEmployees =
                    employees.stream()
                            .filter(user ->
                                    department.equalsIgnoreCase(
                                            user.getDepartment()
                                    )
                            )
                            .toList();

            List<Enrollment> departmentEnrollments =
                    enrollments.stream()
                            .filter(e ->
                                    e.getUser() != null &&
                                    e.getUser().getDepartment() != null &&
                                    department.equalsIgnoreCase(
                                            e.getUser().getDepartment()
                                    )
                            )
                            .toList();

            long completed =
                    departmentEnrollments.stream()
                            .filter(e ->
                                    e.getStatus() ==
                                            EnrollmentStatus.COMPLETED
                            )
                            .count();

            long total =
                    departmentEnrollments.size();

            double completionRate =
                    total == 0
                            ? 0
                            : completed * 100.0 / total;

            long overdue =
                    departmentEnrollments.stream()
                            .filter(this::isOverdue)
                            .count();

            long mandatory =
                    departmentEnrollments.stream()
                            .filter(e ->
                                    e.getEnrollmentType() ==
                                            EnrollmentType.MANDATORY
                            )
                            .count();

            long mandatoryCompleted =
                    departmentEnrollments.stream()
                            .filter(e ->
                                    e.getEnrollmentType() ==
                                            EnrollmentType.MANDATORY &&
                                    e.getStatus() ==
                                            EnrollmentStatus.COMPLETED
                            )
                            .count();

            double mandatoryRate =
                    mandatory == 0
                            ? 0
                            : mandatoryCompleted * 100.0 / mandatory;

            Map<String, Object> report =
                    new LinkedHashMap<>();

            report.put("department", department);
            report.put(
                    "employeeCount",
                    departmentEmployees.size()
            );

            report.put("totalAssignments", total);
            report.put("completedAssignments", completed);
            report.put(
                    "completionRate",
                    round(completionRate)
            );

            report.put("overdueAssignments", overdue);

            report.put("mandatoryAssignments", mandatory);
            report.put(
                    "mandatoryCompleted",
                    mandatoryCompleted
            );

            report.put(
                    "mandatoryComplianceRate",
                    round(mandatoryRate)
            );

            reports.add(report);
        }

        return reports;
    }

    // =========================================================
    // OVERDUE CHECK
    // =========================================================

    private boolean isOverdue(Enrollment enrollment) {

        if (enrollment.getDueDate() == null) {
            return false;
        }

        if (enrollment.getStatus() ==
                EnrollmentStatus.COMPLETED) {
            return false;
        }

        return enrollment.getDueDate()
                .isBefore(LocalDate.now());
    }

    // =========================================================
    // ROUNDING
    // =========================================================

    private double round(double value) {

        return Math.round(value * 100.0) / 100.0;
    }
}