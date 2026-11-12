package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.QuizAttempt;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.QuizAttemptRepository;
import com.fairmacs.lms.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class HrReportService {

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final QuizAttemptRepository quizAttemptRepository;

    public HrReportService(
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository
    ) {
        this(userRepository, enrollmentRepository, null, null);
    }

    @Autowired
    public HrReportService(
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository,
            @Autowired(required = false) CourseRepository courseRepository,
            @Autowired(required = false) QuizAttemptRepository quizAttemptRepository
    ) {
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.quizAttemptRepository = quizAttemptRepository;
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
                                e.getUser().getRole() == Role.EMPLOYEE &&
                                e.getStatus() != EnrollmentStatus.REVOKED
                        )
                        .toList();

        List<Course> courses = courseRepository != null
                ? courseRepository.findAll()
                : extractCoursesFromEnrollments(enrollments);

        List<QuizAttempt> completedAttempts = loadCompletedQuizAttempts();

        return buildScopedAnalyticsReport(
                courses,
                employees,
                enrollments,
                completedAttempts,
                true
        );
    }

    // =========================================================
    // SHARED SCOPED ANALYTICS ENGINE (HR & TRAINER)
    // =========================================================

    public Map<String, Object> buildScopedAnalyticsReport(
            List<Course> scopedCourses,
            List<User> scopedEmployees,
            List<Enrollment> scopedEnrollments,
            List<QuizAttempt> completedAttempts,
            boolean includeHrEmployeeFields
    ) {
        List<Course> safeCourses = scopedCourses != null
                ? scopedCourses.stream().filter(Objects::nonNull).toList()
                : extractCoursesFromEnrollments(scopedEnrollments);

        List<Enrollment> enrollments = scopedEnrollments != null
                ? scopedEnrollments.stream()
                        .filter(Objects::nonNull)
                        .filter(e -> e.getUser() != null && e.getUser().getRole() == Role.EMPLOYEE)
                        .filter(e -> e.getStatus() != EnrollmentStatus.REVOKED)
                        .toList()
                : List.of();

        List<User> employees = scopedEmployees != null
                ? scopedEmployees.stream()
                        .filter(Objects::nonNull)
                        .filter(u -> u.getRole() == Role.EMPLOYEE)
                        .toList()
                : extractEmployeesFromEnrollments(enrollments);

        List<QuizAttempt> attempts = completedAttempts != null
                ? completedAttempts.stream()
                        .filter(Objects::nonNull)
                        .filter(qa -> qa.getCompletedAt() != null && qa.getScore() != null)
                        .filter(qa -> qa.getUser() != null && qa.getUser().getRole() == Role.EMPLOYEE)
                        .toList()
                : List.of();

        List<Course> publishedCourses = safeCourses.stream()
                .filter(c -> Boolean.TRUE.equals(c.getActive()) || c.getPublishedAt() != null)
                .toList();

        List<Course> draftCourses = safeCourses.stream()
                .filter(c -> !Boolean.TRUE.equals(c.getActive()) && c.getPublishedAt() == null)
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

        long activeLearners =
                enrollments.stream()
                        .filter(e ->
                                e.getStatus() == EnrollmentStatus.IN_PROGRESS ||
                                e.getStatus() == EnrollmentStatus.COMPLETED
                        )
                        .map(e -> e.getUser().getId())
                        .filter(Objects::nonNull)
                        .distinct()
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
                        .filter(Objects::nonNull)
                        .mapToDouble(Integer::doubleValue)
                        .average()
                        .orElse(0);

        double averageScore = computeAverageScore(enrollments, attempts);

        double mandatoryCompliance =
                mandatoryAssignments == 0
                        ? 0
                        : (mandatoryCompleted * 100.0)
                        / mandatoryAssignments;

        int completionRateInt =
                totalAssignments > 0
                        ? (int) Math.round((completedAssignments * 100.0) / totalAssignments)
                        : 0;

        double completionRateExact =
                totalAssignments > 0
                        ? round((completedAssignments * 100.0) / totalAssignments)
                        : 0.0;

        // -----------------------------------------------------
        // Course-wise report
        // -----------------------------------------------------

        List<Course> coursesForBreakdown = !publishedCourses.isEmpty()
                ? publishedCourses
                : extractCoursesFromEnrollments(enrollments);

        List<Map<String, Object>> courseReports =
                buildCourseReports(coursesForBreakdown, enrollments, attempts);

        // -----------------------------------------------------
        // Employee-wise report
        // -----------------------------------------------------

        List<Map<String, Object>> employeeReports =
                buildEmployeeReports(employees, enrollments, attempts, includeHrEmployeeFields);

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

        response.put("publishedCourses", publishedCourses.size());
        response.put("draftCourses", draftCourses.size());
        response.put("totalCourses", safeCourses.size());

        response.put("totalEmployees", totalEmployees);
        response.put("activeEmployees", activeEmployees);
        response.put("activeLearners", (int) activeLearners);

        response.put("totalAssignments", totalAssignments);
        response.put("completedAssignments", completedAssignments);
        response.put("inProgressAssignments", inProgressAssignments);
        response.put("notStartedAssignments", notStartedAssignments);
        response.put("overdueAssignments", overdueAssignments);

        response.put("totalEnrollments", (int) totalAssignments);
        response.put("completedEnrollments", (int) completedAssignments);
        response.put("completionRate", completionRateInt);
        response.put("completionRateExact", completionRateExact);

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

        response.put("courseReports", courseReports);
        response.put("courseBreakdown", courseReports);
        response.put("employeeReports", employeeReports);
        response.put("departmentReports", departmentReports);

        return response;
    }

    // =========================================================
    // COURSE REPORTS
    // =========================================================

    private List<Map<String, Object>> buildCourseReports(
            List<Course> courses,
            List<Enrollment> enrollments,
            List<QuizAttempt> completedAttempts
    ) {
        List<Map<String, Object>> courseReports = new ArrayList<>();
        if (courses == null || courses.isEmpty()) {
            return courseReports;
        }

        Map<Long, List<Enrollment>> byCourseId = new LinkedHashMap<>();
        for (Enrollment e : enrollments) {
            if (e.getCourse() != null && e.getCourse().getId() != null) {
                byCourseId.computeIfAbsent(e.getCourse().getId(), k -> new ArrayList<>()).add(e);
            }
        }

        for (Course c : courses) {
            if (c == null) {
                continue;
            }
            List<Enrollment> cEnrollments = c.getId() != null
                    ? byCourseId.getOrDefault(c.getId(), List.of())
                    : enrollments.stream()
                            .filter(e -> e.getCourse() != null && Objects.equals(e.getCourse().getCourseId(), c.getCourseId()))
                            .toList();

            List<QuizAttempt> cAttempts = completedAttempts.stream()
                    .filter(qa -> qa.getQuiz() != null && qa.getQuiz().getCourse() != null
                            && ((c.getId() != null && Objects.equals(qa.getQuiz().getCourse().getId(), c.getId()))
                                || (c.getCourseId() != null && Objects.equals(qa.getQuiz().getCourse().getCourseId(), c.getCourseId()))))
                    .toList();

            int cTotal = cEnrollments.size();
            long cCompleted = cEnrollments.stream().filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED).count();
            long cInProgress = cEnrollments.stream().filter(e -> e.getStatus() == EnrollmentStatus.IN_PROGRESS).count();
            long cNotStarted = cEnrollments.stream().filter(e -> e.getStatus() == EnrollmentStatus.NOT_STARTED).count();
            long cOverdue = cEnrollments.stream().filter(this::isOverdue).count();
            long cMandatory = cEnrollments.stream().filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY).count();
            long cMandatoryCompleted = cEnrollments.stream()
                    .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY && e.getStatus() == EnrollmentStatus.COMPLETED)
                    .count();
            long cCertificates = cEnrollments.stream()
                    .filter(e -> e.getCertificateId() != null && !e.getCertificateId().isBlank())
                    .count();

            double cAvgProgress = cEnrollments.stream()
                    .map(Enrollment::getProgressPercent)
                    .filter(Objects::nonNull)
                    .mapToDouble(Integer::doubleValue)
                    .average()
                    .orElse(0);

            double cAvgScore = computeAverageScore(cEnrollments, cAttempts);

            int cRateInt = cTotal > 0 ? (int) Math.round((cCompleted * 100.0) / cTotal) : 0;
            double cRateExact = cTotal > 0 ? round((cCompleted * 100.0) / cTotal) : 0.0;
            double cMandatoryRate = cMandatory > 0 ? round((cMandatoryCompleted * 100.0) / cMandatory) : 0.0;

            Map<String, Object> cMap = new LinkedHashMap<>();
            cMap.put("id", c.getId());
            cMap.put("courseId", c.getCourseId());
            cMap.put("title", c.getTitle());
            cMap.put("category", resolveCourseCategory(c));
            cMap.put("department", resolveCourseDepartment(c));
            cMap.put("enrolledCount", cTotal);
            cMap.put("totalAssignments", (long) cTotal);
            cMap.put("completedCount", cCompleted);
            cMap.put("completedAssignments", cCompleted);
            cMap.put("inProgressCount", cInProgress);
            cMap.put("inProgressAssignments", cInProgress);
            cMap.put("notStartedCount", cNotStarted);
            cMap.put("notStartedAssignments", cNotStarted);
            cMap.put("overdueCount", cOverdue);
            cMap.put("overdueAssignments", cOverdue);
            cMap.put("mandatoryAssignments", cMandatory);
            cMap.put("mandatoryCompleted", cMandatoryCompleted);
            cMap.put("mandatoryComplianceRate", cMandatoryRate);
            cMap.put("certificatesIssued", cCertificates);
            cMap.put("averageProgress", round(cAvgProgress));
            cMap.put("completionRate", cRateInt);
            cMap.put("completionRateExact", cRateExact);
            cMap.put("averageScore", round(cAvgScore));
            cMap.put("publishedAt", c.getPublishedAt());
            cMap.put("createdAt", c.getCreatedAt());

            courseReports.add(cMap);
        }

        return courseReports;
    }

    // =========================================================
    // EMPLOYEE REPORTS
    // =========================================================

    private List<Map<String, Object>> buildEmployeeReports(
            List<User> employees,
            List<Enrollment> enrollments,
            List<QuizAttempt> completedAttempts,
            boolean includeHrEmployeeFields
    ) {

        List<Map<String, Object>> reports =
                new ArrayList<>();

        for (User employee : employees) {

            List<Enrollment> employeeEnrollments =
                    enrollments.stream()
                            .filter(e ->
                                    e.getUser() != null &&
                                    Objects.equals(employee.getId(), e.getUser().getId())
                            )
                            .toList();

            List<QuizAttempt> employeeAttempts =
                    completedAttempts.stream()
                            .filter(qa ->
                                    qa.getUser() != null &&
                                    Objects.equals(employee.getId(), qa.getUser().getId())
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
                            .filter(Objects::nonNull)
                            .mapToDouble(Integer::doubleValue)
                            .average()
                            .orElse(0);

            double score = computeAverageScore(employeeEnrollments, employeeAttempts);

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
            if (includeHrEmployeeFields) {
                report.put("email", employee.getEmail());
            }
            report.put("designation", employee.getDesignation());
            report.put("department", employee.getDepartment());
            if (includeHrEmployeeFields) {
                report.put("status",
                        employee.getStatus() != null
                                ? employee.getStatus().name()
                                : null);
            }

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
                            .filter(e -> matchesDepartment(e, department))
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
    // SCORE, EXTRACTION & OVERDUE HELPERS
    // =========================================================

    private double computeAverageScore(List<Enrollment> enrollments, List<QuizAttempt> completedAttempts) {
        if (completedAttempts != null && !completedAttempts.isEmpty()) {
            boolean anyEnrollmentHasDirectScore = enrollments != null && enrollments.stream()
                    .anyMatch(e -> e != null && e.getScore() != null);
            if (!anyEnrollmentHasDirectScore) {
                return completedAttempts.stream()
                        .map(QuizAttempt::getScore)
                        .filter(Objects::nonNull)
                        .mapToInt(Integer::intValue)
                        .average()
                        .orElse(0.0);
            }
        }
        if (enrollments == null || enrollments.isEmpty()) {
            return 0.0;
        }
        return enrollments.stream()
                .map(e -> resolveEnrollmentScore(e, completedAttempts))
                .filter(Objects::nonNull)
                .mapToDouble(Integer::doubleValue)
                .average()
                .orElse(0.0);
    }

    private Integer resolveEnrollmentScore(Enrollment e, List<QuizAttempt> completedAttempts) {
        if (e == null) {
            return null;
        }
        if (e.getScore() != null) {
            return e.getScore();
        }
        if (completedAttempts == null || completedAttempts.isEmpty() || e.getUser() == null || e.getCourse() == null) {
            return null;
        }
        return completedAttempts.stream()
                .filter(qa -> qa.getUser() != null && Objects.equals(qa.getUser().getId(), e.getUser().getId()))
                .filter(qa -> qa.getQuiz() != null && qa.getQuiz().getCourse() != null
                        && Objects.equals(qa.getQuiz().getCourse().getId(), e.getCourse().getId()))
                .filter(qa -> qa.getScore() != null)
                .max(Comparator.comparing(QuizAttempt::getCompletedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                .map(QuizAttempt::getScore)
                .orElse(null);
    }

    private List<Course> extractCoursesFromEnrollments(List<Enrollment> enrollments) {
        if (enrollments == null || enrollments.isEmpty()) {
            return List.of();
        }
        Map<String, Course> uniqueCourses = new LinkedHashMap<>();
        for (Enrollment e : enrollments) {
            if (e != null && e.getCourse() != null) {
                Course c = e.getCourse();
                String key = c.getId() != null ? "ID:" + c.getId() : "CID:" + c.getCourseId();
                uniqueCourses.putIfAbsent(key, c);
            }
        }
        return new ArrayList<>(uniqueCourses.values());
    }

    public List<User> extractEmployeesFromEnrollments(List<Enrollment> enrollments) {
        if (enrollments == null || enrollments.isEmpty()) {
            return List.of();
        }
        Map<String, User> uniqueUsers = new LinkedHashMap<>();
        for (Enrollment e : enrollments) {
            if (e != null && e.getUser() != null && e.getUser().getRole() == Role.EMPLOYEE) {
                User u = e.getUser();
                String key = u.getId() != null ? "ID:" + u.getId() : "EID:" + u.getEmployeeId();
                uniqueUsers.putIfAbsent(key, u);
            }
        }
        return new ArrayList<>(uniqueUsers.values());
    }

    private List<QuizAttempt> loadCompletedQuizAttempts() {
        if (quizAttemptRepository == null) {
            return List.of();
        }
        List<QuizAttempt> fetched = quizAttemptRepository.findCompletedAttemptsWithDetails();
        if (fetched != null && !fetched.isEmpty()) {
            return fetched;
        }
        List<QuizAttempt> fallback = quizAttemptRepository.findAll();
        return fallback != null ? fallback : List.of();
    }

    private String resolveCourseCategory(Course c) {
        if (c == null) {
            return "General";
        }
        if (c.getCatalogCategory() != null && c.getCatalogCategory().getName() != null && !c.getCatalogCategory().getName().isBlank()) {
            return c.getCatalogCategory().getName();
        }
        if (c.getCategory() != null && !c.getCategory().isBlank()) {
            return c.getCategory();
        }
        return "General";
    }

    private String resolveCourseDepartment(Course c) {
        if (c == null) {
            return "General";
        }
        if (c.getOwningDepartment() != null && c.getOwningDepartment().getName() != null && !c.getOwningDepartment().getName().isBlank()) {
            return c.getOwningDepartment().getName();
        }
        return resolveCourseCategory(c);
    }

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
    // ROUNDING & OWNERSHIP
    // =========================================================

    private boolean isCourseOwnedByDepartment(Course course, String departmentName) {
        if (course == null || departmentName == null || departmentName.isBlank()) {
            return false;
        }
        if (course.getOwningDepartment() != null) {
            return departmentName.equalsIgnoreCase(course.getOwningDepartment().getName());
        }
        if (course.getCatalogCategory() != null
                && !course.getCatalogCategory().getName().equalsIgnoreCase("Uncategorized")
                && course.getCatalogCategory().getName().equalsIgnoreCase(departmentName)) {
            return true;
        }
        if (course.getCategory() != null
                && !course.getCategory().isBlank()
                && !course.getCategory().equalsIgnoreCase("Uncategorized")
                && course.getCategory().equalsIgnoreCase(departmentName)) {
            return true;
        }
        if (course.getDraftPayload() != null && !course.getDraftPayload().isBlank()) {
            if (course.getDraftPayload().toLowerCase().contains("\"department\":\"" + departmentName.toLowerCase() + "\"")) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesDepartment(Enrollment e, String department) {
        if (e.getUser() == null || e.getUser().getDepartment() == null) {
            return false;
        }
        if (department.equalsIgnoreCase(e.getUser().getDepartment())) {
            return true;
        }
        return isCourseOwnedByDepartment(e.getCourse(), department) && e.getStatus() == EnrollmentStatus.COMPLETED;
    }

    private double round(double value) {

        return Math.round(value * 100.0) / 100.0;
    }
}
