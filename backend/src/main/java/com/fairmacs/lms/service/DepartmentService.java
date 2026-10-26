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
import com.fairmacs.lms.entity.User;
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
        return departmentRepository.findAll().stream()
                .map(this::toSummary)
                .toList();
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
                .filter(e -> e.getUser().getDepartment().equalsIgnoreCase(departmentName))
                .toList();

        Map<Long, List<Enrollment>> grouped = enrollments.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getCourse().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<DepartmentCourseDTO> result = new ArrayList<>();

        for (Map.Entry<Long, List<Enrollment>> entry : grouped.entrySet()) {
            Course course = entry.getValue().get(0).getCourse();
            List<Enrollment> courseEnrollments = entry.getValue();

            double completionRate = courseEnrollments.stream()
                    .map(Enrollment::getProgressPercent)
                    .filter(Objects::nonNull)
                    .mapToInt(Integer::intValue)
                    .average()
                    .orElse(0.0);

            result.add(new DepartmentCourseDTO(
                    course.getId(),
                    course.getCourseId(),
                    course.getTitle(),
                    course.getActive(),
                    courseEnrollments.size(),
                    round(completionRate)
            ));
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

        return new DepartmentDetailsDTO(
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
                .filter(e -> e.getUser().getDepartment().equalsIgnoreCase(department.getName()))
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

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
