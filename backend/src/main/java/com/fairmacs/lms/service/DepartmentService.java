package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CourseEmployeeDTO;
import com.fairmacs.lms.dto.DepartmentCourseDTO;
import com.fairmacs.lms.dto.DepartmentCourseEmployeesDTO;
import com.fairmacs.lms.dto.DepartmentDetailsDTO;
import com.fairmacs.lms.dto.DepartmentEmployeeDTO;
import com.fairmacs.lms.dto.DepartmentSummaryDTO;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Department;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.User;
import java.time.LocalDate;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.DepartmentRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;

    public DepartmentService(
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository,
            CourseRepository courseRepository
    ) {
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
    }

    @Transactional(readOnly = true)
    public List<DepartmentSummaryDTO> getAllDepartments() {
        List<Department> departments = departmentRepository.findAll();
        if (departments.isEmpty()) {
            return List.of();
        }

        // Batch-load users and enrollments once instead of scanning per department (eliminates 2*D+1 N+1 / full-table scans)
        Map<String, Long> employeeCountByDept = userRepository.findAll().stream()
                .filter(u -> u.getDepartment() != null && !u.getDepartment().isBlank())
                .collect(Collectors.groupingBy(
                        u -> u.getDepartment().trim().toLowerCase(java.util.Locale.ROOT),
                        Collectors.counting()
                ));

        List<Enrollment> allEnrollments = enrollmentRepository.findAllWithUserAndCourse();

        List<DepartmentSummaryDTO> summaries = new ArrayList<>(departments.size());
        for (Department department : departments) {
            String deptName = department.getName();
            String deptKey = deptName == null ? "" : deptName.trim().toLowerCase(java.util.Locale.ROOT);
            int empCount = employeeCountByDept.getOrDefault(deptKey, 0L).intValue();

            Map<Long, List<Enrollment>> groupedByCourse = new LinkedHashMap<>();
            for (Enrollment e : allEnrollments) {
                if (e.getUser() == null || e.getCourse() == null || e.getUser().getDepartment() == null) {
                    continue;
                }
                if (e.getUser().getDepartment().equalsIgnoreCase(deptName)
                        || isCourseOwnedByDepartment(e.getCourse(), deptName)) {
                    groupedByCourse
                            .computeIfAbsent(e.getCourse().getId(), k -> new ArrayList<>())
                            .add(e);
                }
            }

            double avgCourseCompletion = 0.0;
            if (!groupedByCourse.isEmpty()) {
                double sumRates = 0.0;
                for (List<Enrollment> courseEnrollments : groupedByCourse.values()) {
                    double courseRate = courseEnrollments.stream()
                            .map(Enrollment::getProgressPercent)
                            .filter(Objects::nonNull)
                            .mapToInt(Integer::intValue)
                            .average()
                            .orElse(0.0);
                    sumRates += round(courseRate);
                }
                avgCourseCompletion = sumRates / groupedByCourse.size();
            }

            summaries.add(new DepartmentSummaryDTO(
                    department.getId(),
                    department.getName(),
                    department.getHeadId(),
                    department.getDescription(),
                    empCount,
                    groupedByCourse.size(),
                    round(avgCourseCompletion)
            ));
        }

        return summaries;
    }

    @Transactional(readOnly = true)
    public List<DepartmentEmployeeDTO> getEmployeesByDepartment(Long departmentId) {
        Department department = getDepartment(departmentId);

        return userRepository.findByDepartmentIgnoreCase(department.getName()).stream()
                .map(this::toEmployeeDTO)
                .sorted(Comparator.comparing(
                        DepartmentEmployeeDTO::getName,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DepartmentCourseDTO> getCoursesByDepartment(Long departmentId) {
        Department department = getDepartment(departmentId);
        String departmentName = department.getName();

        List<Enrollment> enrollments = enrollmentRepository.findAll().stream()
                .filter(e -> e.getUser() != null)
                .filter(e -> e.getCourse() != null)
                .filter(e -> e.getUser().getDepartment() != null)
                .filter(e -> e.getUser().getDepartment().equalsIgnoreCase(departmentName)
                        || isCourseOwnedByDepartment(e.getCourse(), departmentName))
                .toList();

        Map<Long, List<Enrollment>> grouped = enrollments.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getCourse().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<DepartmentCourseDTO> result = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (Map.Entry<Long, List<Enrollment>> entry : grouped.entrySet()) {
            Course course = entry.getValue().get(0).getCourse();
            List<Enrollment> courseEnrollments = entry.getValue();

            boolean isOwned = isCourseOwnedByDepartment(course, departmentName);
            String owningName = course.getOwningDepartment() != null
                    ? course.getOwningDepartment().getName()
                    : (isOwned ? departmentName : "General");

            long mandCount = courseEnrollments.stream()
                    .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY)
                    .count();
            long recCount = courseEnrollments.stream()
                    .filter(e -> e.getEnrollmentType() == EnrollmentType.RECOMMENDED || e.getEnrollmentType() == EnrollmentType.SELF_SELECTED)
                    .count();
            long compCount = courseEnrollments.stream()
                    .filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED)
                    .count();

            long overdueCount = courseEnrollments.stream()
                    .filter(e -> e.getStatus() != EnrollmentStatus.COMPLETED && e.getDueDate() != null && e.getDueDate().isBefore(today))
                    .count();

            double avgScore = courseEnrollments.stream()
                    .map(Enrollment::getScore)
                    .filter(Objects::nonNull)
                    .mapToInt(Integer::intValue)
                    .average()
                    .orElse(0.0);

            double completionRate = courseEnrollments.stream()
                    .map(Enrollment::getProgressPercent)
                    .filter(Objects::nonNull)
                    .mapToInt(Integer::intValue)
                    .average()
                    .orElse(0.0);

            DepartmentCourseDTO dto = new DepartmentCourseDTO(
                    course.getId(),
                    course.getCourseId(),
                    course.getTitle(),
                    course.getActive(),
                    courseEnrollments.size(),
                    round(completionRate)
            );
            dto.setOwned(isOwned);
            dto.setOwningDepartmentName(owningName);
            dto.setAssignmentType(mandCount > 0 ? "MANDATORY" : (recCount > 0 ? "RECOMMENDED" : (isOwned ? "OWNED_COURSE" : "MANDATORY")));
            dto.setMandatoryCount((int) mandCount);
            dto.setRecommendedCount((int) recCount);
            dto.setCompletedCount((int) compCount);
            dto.setOverdueCount((int) overdueCount);
            dto.setAverageScore(round(avgScore));
            result.add(dto);
        }

        result.sort(Comparator.comparing(
                DepartmentCourseDTO::getTitle,
                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));

        return result;
    }

    @Transactional(readOnly = true)
    public DepartmentDetailsDTO getDepartmentDetails(Long departmentId) {
        Department department = getDepartment(departmentId);
        List<DepartmentEmployeeDTO> employees = getEmployeesByDepartment(departmentId);
        List<DepartmentCourseDTO> courses = getCoursesByDepartment(departmentId);

        double completionRate = courses.stream()
                .mapToDouble(DepartmentCourseDTO::getCompletionRate)
                .average()
                .orElse(0.0);

        long ownedCount = courses.stream().filter(DepartmentCourseDTO::isOwned).count();
        long assignedCount = courses.stream().filter(c -> !c.isOwned() || c.getMandatoryCount() > 0 || c.getRecommendedCount() > 0).count();
        int totalMandatory = courses.stream().mapToInt(DepartmentCourseDTO::getMandatoryCount).sum();
        int totalRecommended = courses.stream().mapToInt(DepartmentCourseDTO::getRecommendedCount).sum();
        int totalOverdue = courses.stream().mapToInt(DepartmentCourseDTO::getOverdueCount).sum();

        double avgDeptScore = courses.stream()
                .filter(c -> c.getAverageScore() > 0)
                .mapToDouble(DepartmentCourseDTO::getAverageScore)
                .average()
                .orElse(0.0);

        DepartmentDetailsDTO details = new DepartmentDetailsDTO(
                department.getId(),
                department.getName(),
                department.getHeadId(),
                department.getDescription(),
                employees.size(),
                courses.size(),
                round(completionRate),
                employees,
                courses
        );
        details.setOwnedCoursesCount((int) ownedCount);
        details.setAssignedCoursesCount((int) (assignedCount > 0 ? assignedCount : courses.size()));
        details.setMandatoryAssignmentsCount(totalMandatory);
        details.setRecommendedAssignmentsCount(totalRecommended);
        details.setOverdueAssignmentsCount(totalOverdue);
        details.setAverageAssessmentScore(round(avgDeptScore));
        return details;
    }

    @Transactional(readOnly = true)
    public DepartmentCourseEmployeesDTO getCourseEmployees(
            Long departmentId,
            Long courseId
    ) {
        Department department = getDepartment(departmentId);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found."));

        List<CourseEmployeeDTO> employees = enrollmentRepository.findByCourseId(courseId).stream()
                .filter(e -> e.getUser() != null)
                .filter(e -> e.getUser().getDepartment() != null)
                .filter(e -> e.getUser().getDepartment().equalsIgnoreCase(department.getName())
                        || isCourseOwnedByDepartment(course, department.getName()))
                .map(this::toCourseEmployeeDTO)
                .sorted(Comparator.comparing(
                        CourseEmployeeDTO::getName,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();

        return new DepartmentCourseEmployeesDTO(
                department.getId(),
                department.getName(),
                course.getId(),
                course.getCourseId(),
                course.getTitle(),
                course.getActive(),
                employees.size(),
                employees
        );
    }

    private Department getDepartment(Long departmentId) {
        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> new IllegalArgumentException("Department not found."));
    }

    private DepartmentSummaryDTO toSummary(Department department) {
        List<User> employees = userRepository.findByDepartmentIgnoreCase(department.getName());
        List<DepartmentCourseDTO> courses = getCoursesByDepartment(department.getId());

        double completionRate = courses.stream()
                .mapToDouble(DepartmentCourseDTO::getCompletionRate)
                .average()
                .orElse(0.0);

        return new DepartmentSummaryDTO(
                department.getId(),
                department.getName(),
                department.getHeadId(),
                department.getDescription(),
                employees.size(),
                courses.size(),
                round(completionRate)
        );
    }

    private DepartmentEmployeeDTO toEmployeeDTO(User user) {
        return new DepartmentEmployeeDTO(
                user.getId(),
                user.getEmployeeId(),
                user.getName(),
                user.getEmail(),
                user.getDesignation(),
                user.getDepartment(),
                user.getStatus() == null ? null : user.getStatus().name()
        );
    }

    private CourseEmployeeDTO toCourseEmployeeDTO(Enrollment enrollment) {
        User user = enrollment.getUser();

        return new CourseEmployeeDTO(
                enrollment.getId(),
                user.getId(),
                user.getEmployeeId(),
                user.getName(),
                user.getEmail(),
                user.getDesignation(),
                user.getDepartment(),
                enrollment.getProgressPercent() == null ? 0 : enrollment.getProgressPercent(),
                enrollment.getStatus() == null ? null : enrollment.getStatus().name(),
                enrollment.getScore(),
                enrollment.getDueDate(),
                enrollment.getEnrolledAt(),
                enrollment.getCompletedDate()
        );
    }

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

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
