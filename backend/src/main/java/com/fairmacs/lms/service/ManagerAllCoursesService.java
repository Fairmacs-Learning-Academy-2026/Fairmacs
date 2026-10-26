package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Department;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.DepartmentRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ManagerAllCoursesService {
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final DepartmentRepository departmentRepository;
    private final SecurityContextUtil securityContextUtil;

    public ManagerAllCoursesService(CourseRepository courseRepository, EnrollmentRepository enrollmentRepository,
            DepartmentRepository departmentRepository, SecurityContextUtil securityContextUtil) {
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.departmentRepository = departmentRepository;
        this.securityContextUtil = securityContextUtil;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCoursesForCurrentManager() {
        User manager = securityContextUtil.getCurrentUser();
        if (manager == null || manager.getRole() != Role.MANAGER) {
            throw new AccessDeniedException("Only managers can view department courses.");
        }
        if (manager.getDepartment() == null || manager.getDepartment().isBlank()) {
            throw new IllegalStateException("Your user profile has no department configured. Contact HR Admin.");
        }

        String managerDepartment = manager.getDepartment().trim();
        Set<String> includedDepartments = resolveDepartmentHierarchy(managerDepartment, departmentRepository.findAll());

        // The existing schema stores course assignments as employee Enrollment rows.
        List<Enrollment> relevantEnrollments = enrollmentRepository.findAll().stream()
                .filter(e -> e.getUser() != null && e.getCourse() != null)
                .filter(e -> e.getStatus() != null && e.getStatus() != EnrollmentStatus.REVOKED)
                .filter(e -> e.getUser().getRole() == Role.EMPLOYEE)
                .filter(e -> e.getUser().getStatus() == UserStatus.ACTIVE)
                .filter(e -> e.getUser().getDepartment() != null
                        && includedDepartments.stream().anyMatch(d -> d.equalsIgnoreCase(e.getUser().getDepartment().trim())))
                .collect(Collectors.toList());

        Map<Long, List<Enrollment>> byCourse = relevantEnrollments.stream()
                .collect(Collectors.groupingBy(e -> e.getCourse().getId()));
        List<Course> publishedCourses = courseRepository.findActiveWithCategory();
        List<Map<String, Object>> resultCourses = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (Course course : publishedCourses) {
            List<Enrollment> rows = byCourse.get(course.getId());
            if (rows == null || rows.isEmpty()) continue;

            long mandatory = rows.stream().filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY).count();
            long recommended = rows.stream().filter(e -> e.getEnrollmentType() == EnrollmentType.SELF_SELECTED).count();
            long started = rows.stream().filter(e -> e.getStatus() == EnrollmentStatus.IN_PROGRESS
                    || (e.getProgressPercent() != null && e.getProgressPercent() > 0)).count();
            long completed = rows.stream().filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED).count();
            long overdue = rows.stream().filter(e -> e.getDueDate() != null && e.getDueDate().isBefore(today)
                    && e.getStatus() != EnrollmentStatus.COMPLETED).count();

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", course.getId());
            item.put("courseId", course.getCourseId());
            item.put("title", course.getTitle());
            item.put("description", course.getDescription());
            item.put("category", course.getCategory() == null ? null : String.valueOf(course.getCategory()));
            item.put("level", course.getLevel());
            item.put("trainingType", mandatory > 0 ? "MANDATORY" : (recommended > 0 ? "RECOMMENDED" : "ASSIGNED"));
            item.put("assignedCount", rows.size());
            item.put("startedCount", started);
            item.put("completedCount", completed);
            item.put("overdueCount", overdue);
            resultCourses.add(item);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("department", managerDepartment);
        response.put("includedDepartments", includedDepartments);
        response.put("courses", resultCourses);
        return response;
    }

    private Set<String> resolveDepartmentHierarchy(String managerDepartment, List<Department> allDepartments) {
        Department root = allDepartments.stream()
                .filter(d -> d.getName() != null && d.getName().trim().equalsIgnoreCase(managerDepartment))
                .findFirst().orElse(null);
        Set<String> names = new HashSet<>();
        if (root == null) {
            names.add(managerDepartment);
            return names;
        }
        collectDepartmentNames(root, allDepartments, names);
        return names;
    }

    private void collectDepartmentNames(Department current, List<Department> allDepartments, Set<String> names) {
        if (current.getName() == null || !names.add(current.getName().trim())) return;
        for (Department child : allDepartments) {
            Department parent = child.getParentDepartment();
            if (parent != null && Objects.equals(parent.getId(), current.getId())) {
                collectDepartmentNames(child, allDepartments, names);
            }
        }
    }
}
