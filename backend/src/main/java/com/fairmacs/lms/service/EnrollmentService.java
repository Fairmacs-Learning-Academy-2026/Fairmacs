
package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.EnrollRequest;
import com.fairmacs.lms.entity.Certificate;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.CourseDepartmentAssignment;
import com.fairmacs.lms.entity.Department;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.entity.NotificationPriority;
import com.fairmacs.lms.entity.NotificationType;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizProgress;
import com.fairmacs.lms.entity.QuizType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.CourseDepartmentAssignmentRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.DepartmentRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.ModuleRepository;
import com.fairmacs.lms.repository.QuizProgressRepository;
import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.Objects;
import java.util.Map;

@Service
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final CertificateService certificateService;
    private final SecurityContextUtil securityContextUtil;
    private final CourseMapper courseMapper;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final DepartmentRepository departmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final ModuleRepository moduleRepository;
    private final QuizRepository quizRepository;
    private final QuizProgressRepository quizProgressRepository;
    private CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository;

    public EnrollmentService(
            EnrollmentRepository enrollmentRepository,
            CourseRepository courseRepository,
            CertificateService certificateService,
            SecurityContextUtil securityContextUtil,
            CourseMapper courseMapper,
            UserRepository userRepository,
            NotificationService notificationService,
            DepartmentRepository departmentRepository,
            LessonProgressRepository lessonProgressRepository,
            ModuleRepository moduleRepository,
            QuizRepository quizRepository,
            QuizProgressRepository quizProgressRepository) {
        this(
                enrollmentRepository,
                courseRepository,
                certificateService,
                securityContextUtil,
                courseMapper,
                userRepository,
                notificationService,
                departmentRepository,
                lessonProgressRepository,
                moduleRepository,
                quizRepository,
                quizProgressRepository,
                null
        );
    }

    @Autowired
    public EnrollmentService(
            EnrollmentRepository enrollmentRepository,
            CourseRepository courseRepository,
            CertificateService certificateService,
            SecurityContextUtil securityContextUtil,
            CourseMapper courseMapper,
            UserRepository userRepository,
            NotificationService notificationService,
            DepartmentRepository departmentRepository,
            LessonProgressRepository lessonProgressRepository,
            ModuleRepository moduleRepository,
            QuizRepository quizRepository,
            QuizProgressRepository quizProgressRepository,
            @Autowired(required = false) CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository) {

        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.certificateService = certificateService;
        this.securityContextUtil = securityContextUtil;
        this.courseMapper = courseMapper;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.departmentRepository = departmentRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.moduleRepository = moduleRepository;
        this.quizRepository = quizRepository;
        this.quizProgressRepository = quizProgressRepository;
        this.courseDepartmentAssignmentRepository = courseDepartmentAssignmentRepository;
    }

    @Autowired(required = false)
    public void setCourseDepartmentAssignmentRepository(
            CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository) {
        this.courseDepartmentAssignmentRepository = courseDepartmentAssignmentRepository;
    }

    // ---------------------------------------------------------
    // EMPLOYEE SELF-ENROLLMENT
    // ---------------------------------------------------------

    @Transactional
    public CourseDTO enrollSelf(EnrollRequest request) {

        User user = securityContextUtil.getCurrentUser();

        Course course = resolveCourse(
                request.getCourseId(),
                request.getCourseCode()
        );

        validateCourseLevel(user, course);

        Enrollment enrollment = enrollmentRepository
                .findByUserIdAndCourseId(user.getId(), course.getId())
                .orElse(null);

        if (enrollment == null) {

            enrollment = new Enrollment();
            enrollment.setUser(user);
            enrollment.setCourse(course);

            enrollment.setEnrollmentType(
                    Boolean.TRUE.equals(course.getFoundation())
                            ? EnrollmentType.MANDATORY
                            : EnrollmentType.SELF_SELECTED
            );

            enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
            enrollment.setProgressPercent(0);
            enrollment.setLastAccessed(LocalDateTime.now());

            if (enrollment.getEnrollmentType()
                    == EnrollmentType.MANDATORY) {
                enrollment.setDueDate(LocalDate.now().plusDays(30));
            }

            enrollment = enrollmentRepository.save(enrollment);

            course.setEnrolledCount(
                    (course.getEnrolledCount() == null
                            ? 0 : course.getEnrolledCount()) + 1
            );

            courseRepository.save(course);

        } else if (enrollment.getStatus() == EnrollmentStatus.REVOKED
                || enrollment.getStatus() == EnrollmentStatus.NOT_STARTED) {

            enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
            enrollment.setLastAccessed(LocalDateTime.now());
            enrollment = enrollmentRepository.save(enrollment);
        }

        String type = enrollment.getEnrollmentType()
                == EnrollmentType.MANDATORY
                ? "MANDATORY"
                : "OPTIONAL";

        return courseMapper.toSummary(course, enrollment, type);
    }

    // ---------------------------------------------------------
    // MANDATORY DEPARTMENT ASSIGNMENT
    // ---------------------------------------------------------

    /**
     * Assigns mandatory training to eligible employees in the
     * selected department and all its nested sub-departments.
     *
     * Selecting General / Common assigns the course to eligible
     * employees across all departments.
     */
    @Transactional
    public int assignCourseToDepartment(
        String department,
        Long courseId,
        String courseCode,
        LocalDate dueDate,
        String trainingType,
        String targetLevel) {

    if (department == null || department.isBlank()) {
        throw new IllegalArgumentException("Department is required.");
    }

    Course course = resolveCourse(courseId, courseCode);

    String requiredLevel = null;
    if (targetLevel != null && !targetLevel.isBlank()) {
        requiredLevel = normalizeLevel(targetLevel);
        if (requiredLevel != null && course.getLevel() != null && !requiredLevel.equals(normalizeLevel(course.getLevel()))) {
            throw new IllegalArgumentException("The selected position must match the course position.");
        }
    }

    List<User> targetUsers = getUsersForDepartmentHierarchy(department.trim());

    final String finalRequiredLevel = requiredLevel;
    List<User> eligibleUsers = targetUsers.stream()
            .filter(Objects::nonNull)
            .filter(user -> user.getRole() == Role.EMPLOYEE)
            .filter(user -> user.getStatus() == UserStatus.ACTIVE)
            .filter(user -> finalRequiredLevel == null || finalRequiredLevel.equals(normalizeLevel(user.getLevel())))
            .toList();

    EnrollmentType type = "RECOMMENDED".equalsIgnoreCase(trainingType)
            ? EnrollmentType.RECOMMENDED
            : EnrollmentType.MANDATORY;

    Department rootDept = findDepartmentByNameOrAlias(department.trim(), departmentRepository.findAll());
    if (rootDept != null) {
        upsertDepartmentAssignmentRecord(course, rootDept, type, dueDate);
    }

    return createAssignments(
            eligibleUsers,
            course,
            dueDate,
            type);
    }

    // ---------------------------------------------------------
    // AUTOMATED EMPLOYEE ONBOARDING ENROLLMENT
    // ---------------------------------------------------------

    /**
     * Automatically enrolls a newly created or imported active EMPLOYEE into all
     * published MANDATORY courses assigned to the employee's department (including
     * ancestor departments and General / General / Common) that match the employee's
     * position band (P0-P4).
     *
     * Rules enforced:
     * - Inactive / non-EMPLOYEE users are never auto-enrolled.
     * - RECOMMENDED course assignments are never auto-enrolled.
     * - P0-P4 eligibility is strictly matched against course level.
     * - Duplicate enrollments are prevented; existing enrollments are never modified.
     * - Course/assignment due dates are preserved on newly created enrollments.
     */
    @Transactional
    public int enrollEmployeeInMandatoryCourses(User user) {
        if (user == null || user.getId() == null) {
            return 0;
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            return 0;
        }
        if (user.getRole() != Role.EMPLOYEE) {
            return 0;
        }

        String empDept = user.getDepartment() != null ? user.getDepartment().trim() : "";
        if (empDept.isEmpty()) {
            return 0;
        }

        String empLevel = normalizeLevel(user.getLevel());
        if (empLevel == null) {
            return 0;
        }

        List<Department> allDepartments = departmentRepository != null
                ? departmentRepository.findAll()
                : List.of();

        Set<String> applicableDeptNames = resolveApplicableDepartmentNamesForEmployee(empDept, allDepartments);

        // Collect all candidate CourseDepartmentAssignment records from repository and Course entities
        List<CourseDepartmentAssignment> allAssignments = new ArrayList<>();
        if (courseDepartmentAssignmentRepository != null) {
            List<CourseDepartmentAssignment> repoAssignments = courseDepartmentAssignmentRepository.findAll();
            if (repoAssignments != null) {
                allAssignments.addAll(repoAssignments);
            }
        }
        if (courseRepository != null) {
            List<Course> allCourses = courseRepository.findAll();
            if (allCourses != null) {
                for (Course c : allCourses) {
                    if (c != null && c.getDepartmentAssignments() != null) {
                        allAssignments.addAll(c.getDepartmentAssignments());
                    }
                }
            }
        }

        // Deduplicate eligible mandatory courses by course ID, preferring specific department dueDate over General dueDate
        Map<Long, Course> eligibleCoursesById = new LinkedHashMap<>();
        Map<Long, LocalDate> dueDateByCourseId = new LinkedHashMap<>();
        Map<Long, Boolean> matchedSpecificDeptByCourseId = new LinkedHashMap<>();

        for (CourseDepartmentAssignment cda : allAssignments) {
            if (cda == null || cda.getAssignmentType() != EnrollmentType.MANDATORY) {
                continue;
            }
            Course course = cda.getCourse();
            Department assignedDept = cda.getDepartment();
            if (course == null || course.getId() == null || assignedDept == null || assignedDept.getName() == null) {
                continue;
            }
            // Only published and active courses are eligible for onboarding auto-enrollment
            if (!Boolean.TRUE.equals(course.getActive()) || Boolean.TRUE.equals(course.getDraft())) {
                continue;
            }

            String assignedDeptName = assignedDept.getName().trim();
            if (!isDepartmentInApplicableSet(assignedDeptName, applicableDeptNames)) {
                continue;
            }

            // Check P0-P4 eligibility
            String rawCourseLevel = course.getLevel();
            String courseLevel = normalizeLevel(rawCourseLevel);
            if (rawCourseLevel != null && !rawCourseLevel.isBlank()) {
                if (courseLevel == null || !empLevel.equals(courseLevel)) {
                    continue;
                }
            } else if (!Boolean.TRUE.equals(course.getFoundation())) {
                // Non-foundation courses require a matching P0-P4 level
                continue;
            }

            Long cId = course.getId();
            boolean isGeneral = isGeneralDepartmentName(assignedDeptName);
            boolean isSpecificDept = !isGeneral;
            LocalDate assignmentDueDate = cda.getDueDate();

            if (!eligibleCoursesById.containsKey(cId)) {
                eligibleCoursesById.put(cId, course);
                dueDateByCourseId.put(cId, assignmentDueDate);
                matchedSpecificDeptByCourseId.put(cId, isSpecificDept);
            } else {
                boolean prevWasSpecific = Boolean.TRUE.equals(matchedSpecificDeptByCourseId.get(cId));
                LocalDate prevDueDate = dueDateByCourseId.get(cId);
                if (isSpecificDept && !prevWasSpecific) {
                    matchedSpecificDeptByCourseId.put(cId, true);
                    if (assignmentDueDate != null) {
                        dueDateByCourseId.put(cId, assignmentDueDate);
                    }
                } else if (prevDueDate == null && assignmentDueDate != null) {
                    dueDateByCourseId.put(cId, assignmentDueDate);
                }
            }
        }

        int enrolledCount = 0;
        for (Map.Entry<Long, Course> entry : eligibleCoursesById.entrySet()) {
            Long courseId = entry.getKey();
            Course course = entry.getValue();
            LocalDate effectiveDueDate = dueDateByCourseId.get(courseId);

            // Prevent duplicate enrollments and never overwrite existing enrollments
            Enrollment existing = enrollmentRepository
                    .findByUserIdAndCourseId(user.getId(), courseId)
                    .orElse(null);
            if (existing != null) {
                continue;
            }

            Enrollment enrollment = new Enrollment();
            enrollment.setUser(user);
            enrollment.setCourse(course);
            enrollment.setEnrollmentType(EnrollmentType.MANDATORY);
            enrollment.setStatus(EnrollmentStatus.NOT_STARTED);
            enrollment.setProgressPercent(0);
            enrollment.setDueDate(effectiveDueDate);
            enrollment.setLastAccessed(null);

            enrollmentRepository.save(enrollment);

            course.setEnrolledCount(
                    (course.getEnrolledCount() == null ? 0 : course.getEnrolledCount()) + 1
            );
            courseRepository.save(course);

            if (notificationService != null) {
                String courseActionUrl = "/courses/" + course.getCourseId() + "/learn";
                String dedupKey = String.format(
                        "COURSE_ASSIGNED:USER:%d:COURSE:%d",
                        user.getId(),
                        course.getId()
                );
                notificationService.createNotificationSafely(
                        user.getId(),
                        "New Mandatory Course Assigned: " + course.getTitle(),
                        String.format(
                                "You have been assigned the mandatory course \"%s\" (%s). %s",
                                course.getTitle(),
                                course.getCourseId(),
                                effectiveDueDate != null
                                        ? "Please complete it by " + effectiveDueDate + "."
                                        : "You can start learning right away."
                        ),
                        NotificationType.COURSE_ASSIGNED,
                        NotificationPriority.HIGH,
                        "COURSE_CODE",
                        course.getCourseId(),
                        courseActionUrl,
                        dedupKey,
                        Map.of(
                                "courseId", course.getCourseId(),
                                "courseTitle", course.getTitle(),
                                "assignmentType", "Mandatory",
                                "dueDate", effectiveDueDate != null ? effectiveDueDate.toString() : ""
                        )
                );
            }

            enrolledCount++;
        }

        return enrolledCount;
    }

    private void upsertDepartmentAssignmentRecord(
            Course course,
            Department department,
            EnrollmentType type,
            LocalDate dueDate) {
        if (course == null || department == null) {
            return;
        }
        List<CourseDepartmentAssignment> assignments = course.getDepartmentAssignments();
        if (assignments == null) {
            assignments = new ArrayList<>();
            course.setDepartmentAssignments(assignments);
        }
        CourseDepartmentAssignment existing = assignments.stream()
                .filter(a -> a != null && a.getDepartment() != null
                        && ((department.getId() != null && Objects.equals(a.getDepartment().getId(), department.getId()))
                            || (department.getName() != null && matchesDepartmentNameOrAlias(department.getName(), a.getDepartment().getName()))))
                .findFirst()
                .orElse(null);

        if (existing == null && courseDepartmentAssignmentRepository != null && course.getId() != null) {
            List<CourseDepartmentAssignment> persisted = courseDepartmentAssignmentRepository.findByCourse_Id(course.getId());
            if (persisted != null) {
                existing = persisted.stream()
                        .filter(a -> a != null && a.getDepartment() != null
                                && ((department.getId() != null && Objects.equals(a.getDepartment().getId(), department.getId()))
                                    || (department.getName() != null && matchesDepartmentNameOrAlias(department.getName(), a.getDepartment().getName()))))
                        .findFirst()
                        .orElse(null);
            }
        }

        if (existing != null) {
            existing.setAssignmentType(type);
            if (dueDate != null) {
                existing.setDueDate(dueDate);
            }
            if (courseDepartmentAssignmentRepository != null) {
                courseDepartmentAssignmentRepository.save(existing);
            }
            if (!assignments.contains(existing)) {
                assignments.add(existing);
            }
        } else {
            CourseDepartmentAssignment created = new CourseDepartmentAssignment(course, department, type, dueDate);
            if (courseDepartmentAssignmentRepository != null) {
                CourseDepartmentAssignment saved = courseDepartmentAssignmentRepository.save(created);
                if (saved != null) {
                    created = saved;
                }
            }
            assignments.add(created);
        }
    }

    private Set<String> resolveApplicableDepartmentNamesForEmployee(
            String employeeDepartment,
            List<Department> allDepartments) {
        Set<String> names = new LinkedHashSet<>();
        addDepartmentAndAliases(names, employeeDepartment);
        addDepartmentAndAliases(names, "General");
        addDepartmentAndAliases(names, "General / Common");

        if (allDepartments != null && !allDepartments.isEmpty()) {
            Department matched = findDepartmentByNameOrAlias(employeeDepartment, allDepartments);
            Set<Long> visitedIds = new HashSet<>();
            Department cursor = matched;
            while (cursor != null) {
                if (cursor.getId() != null && !visitedIds.add(cursor.getId())) {
                    break;
                }
                if (cursor.getName() != null) {
                    addDepartmentAndAliases(names, cursor.getName());
                }
                cursor = cursor.getParentDepartment();
            }
        }
        return names;
    }

    private boolean isDepartmentInApplicableSet(String deptName, Set<String> applicableDeptNames) {
        if (deptName == null || applicableDeptNames == null) {
            return false;
        }
        String trimmed = deptName.trim().toLowerCase(Locale.ROOT);
        if (applicableDeptNames.contains(trimmed)) {
            return true;
        }
        for (String candidate : applicableDeptNames) {
            if (matchesDepartmentNameOrAlias(trimmed, candidate)) {
                return true;
            }
        }
        return false;
    }

    private void addDepartmentAndAliases(Set<String> target, String deptName) {
        if (deptName == null || deptName.isBlank()) {
            return;
        }
        String clean = deptName.trim().toLowerCase(Locale.ROOT);
        target.add(clean);
        if (isGeneralDepartmentName(clean)) {
            target.add("general");
            target.add("general / common");
        } else if (isPeopleOpsDepartmentName(clean)) {
            target.add("people operations");
            target.add("human resource");
            target.add("human resources");
        } else if (isItDepartmentName(clean)) {
            target.add("information technology");
            target.add("it & technology");
        }
    }

    private boolean isGeneralDepartmentName(String name) {
        if (name == null) return false;
        String clean = name.trim().toLowerCase(Locale.ROOT);
        return clean.equals("general") || clean.equals("general / common");
    }

    private boolean isPeopleOpsDepartmentName(String name) {
        if (name == null) return false;
        String clean = name.trim().toLowerCase(Locale.ROOT);
        return clean.equals("people operations")
                || clean.equals("human resource")
                || clean.equals("human resources");
    }

    private boolean isItDepartmentName(String name) {
        if (name == null) return false;
        String clean = name.trim().toLowerCase(Locale.ROOT);
        return clean.equals("information technology")
                || clean.equals("it & technology");
    }

    private boolean matchesDepartmentNameOrAlias(String deptA, String deptB) {
        if (deptA == null || deptB == null) {
            return false;
        }
        String a = deptA.trim();
        String b = deptB.trim();
        if (a.equalsIgnoreCase(b)) {
            return true;
        }
        if (isGeneralDepartmentName(a) && isGeneralDepartmentName(b)) {
            return true;
        }
        if (isPeopleOpsDepartmentName(a) && isPeopleOpsDepartmentName(b)) {
            return true;
        }
        if (isItDepartmentName(a) && isItDepartmentName(b)) {
            return true;
        }
        return false;
    }

    private Department findDepartmentByNameOrAlias(String selectedDepartment, List<Department> departments) {
        if (selectedDepartment == null || departments == null) {
            return null;
        }
        for (Department d : departments) {
            if (d != null && d.getName() != null && d.getName().equalsIgnoreCase(selectedDepartment)) {
                return d;
            }
        }
        for (Department d : departments) {
            if (d != null && d.getName() != null && matchesDepartmentNameOrAlias(d.getName(), selectedDepartment)) {
                return d;
            }
        }
        return null;
    }

    // ---------------------------------------------------------
    // MANUAL RECOMMENDED ASSIGNMENT
    // ---------------------------------------------------------

    /**
     * Assigns recommended training only to the explicitly selected
     * employee IDs.
     */
    @Transactional
    public int assignCourseToEmployees(
            List<Long> employeeIds,
            Long courseId,
            String courseCode,
            LocalDate dueDate,
            String assignmentType) {

        if (employeeIds == null || employeeIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "Select at least one employee for training assignment."
            );
        }

        Course course = resolveCourse(courseId, courseCode);

        Set<Long> uniqueIds = new LinkedHashSet<>(employeeIds);
        List<User> selectedUsers = new ArrayList<>();

        for (Long employeeId : uniqueIds) {
            if (employeeId == null) {
                continue;
            }
            User user = userRepository.findById(employeeId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "User", "id", employeeId
                    ));
            selectedUsers.add(user);
        }

        EnrollmentType type = "MANDATORY".equalsIgnoreCase(assignmentType)
                ? EnrollmentType.MANDATORY
                : EnrollmentType.RECOMMENDED;

        return createAssignments(
                selectedUsers,
                course,
                dueDate,
                type
        );
    }

    @Transactional
    public int assignCourseToEmployees(
            List<Long> employeeIds,
            Long courseId,
            String courseCode,
            LocalDate dueDate) {
        return assignCourseToEmployees(employeeIds, courseId, courseCode, dueDate, "RECOMMENDED");
    }

    // ---------------------------------------------------------
    // ASSIGNMENT HELPERS
    // ---------------------------------------------------------

    private List<User> getUsersForDepartmentHierarchy(
            String selectedDepartment) {

        List<Department> departments = departmentRepository.findAll();

        Department root = findDepartmentByNameOrAlias(selectedDepartment, departments);
        if (root == null) {
            throw new ResourceNotFoundException(
                    "Department", "name", selectedDepartment
            );
        }

        Set<String> departmentNames = new HashSet<>();

        // General / Common (or General) is intended for all departments.
        if (isGeneralDepartmentName(root.getName())) {
            return userRepository.findAll();
        }

        collectDepartmentNames(root, departments, departmentNames);

        List<User> result = new ArrayList<>();

        for (String departmentName : departmentNames) {
            result.addAll(
                    userRepository.findByDepartmentIgnoreCase(
                            departmentName
                    )
            );
        }

        return result;
    }

    private void collectDepartmentNames(
            Department current,
            List<Department> allDepartments,
            Set<String> names) {

        if (current.getName() == null) {
            return;
        }

        names.add(current.getName().trim());

        for (Department child : allDepartments) {

            Department parent = child.getParentDepartment();

            if (parent != null
                    && Objects.equals(parent.getId(), current.getId())) {

                collectDepartmentNames(
                        child,
                        allDepartments,
                        names
                );
            }
        }
    }

    private int createAssignments(
            List<User> users,
            Course course,
            LocalDate dueDate,
            EnrollmentType enrollmentType) {

        int assignedCount = 0;

        Set<Long> processedUserIds = new HashSet<>();

        for (User user : users) {

            if (user == null || user.getId() == null) {
                continue;
            }

            // Prevent duplicate processing if a user appears more
            // than once in the department query results.
            if (!processedUserIds.add(user.getId())) {
                continue;
            }

            if (user.getStatus() != UserStatus.ACTIVE) {
                continue;
            }

            if (user.getRole() != Role.EMPLOYEE) {
                continue;
            }

            Enrollment existing = enrollmentRepository
                    .findByUserIdAndCourseId(user.getId(), course.getId())
                    .orElse(null);

            boolean isMandatory = enrollmentType == EnrollmentType.MANDATORY;
            String assignmentLabel = isMandatory ? "Mandatory" : "Recommended";
            String priority = isMandatory ? NotificationPriority.HIGH : NotificationPriority.NORMAL;
            String courseActionUrl = "/courses/" + course.getCourseId() + "/learn";

            if (existing != null && existing.getStatus() != EnrollmentStatus.REVOKED) {
                // If existing enrollment was RECOMMENDED or SELF_SELECTED and incoming assignment is MANDATORY, upgrade it
                if (isMandatory && existing.getEnrollmentType() != EnrollmentType.MANDATORY) {
                    existing.setEnrollmentType(EnrollmentType.MANDATORY);
                    enrollmentRepository.save(existing);
                }
                // If an active non-completed enrollment has its deadline changed, update and notify learner
                if (dueDate != null
                        && existing.getStatus() != EnrollmentStatus.COMPLETED
                        && !Objects.equals(existing.getDueDate(), dueDate)) {
                    LocalDate previousDue = existing.getDueDate();
                    existing.setDueDate(dueDate);
                    // Reset overdue status if the new due date is in the future
                    if (existing.getStatus() == EnrollmentStatus.OVERDUE && dueDate.isAfter(LocalDate.now())) {
                        existing.setStatus(existing.getProgressPercent() != null && existing.getProgressPercent() > 0
                                ? EnrollmentStatus.IN_PROGRESS
                                : EnrollmentStatus.NOT_STARTED);
                    }
                    enrollmentRepository.save(existing);

                    if (notificationService != null) {
                        notificationService.createNotificationSafely(
                                user.getId(),
                                "Course Deadline Updated: " + course.getTitle(),
                                String.format(
                                        "The due date for your %s course \"%s\" (%s) has been updated%s to %s.",
                                        assignmentLabel.toLowerCase(),
                                        course.getTitle(),
                                        course.getCourseId(),
                                        previousDue != null ? " from " + previousDue : "",
                                        dueDate
                                ),
                                NotificationType.DEADLINE_CHANGED,
                                priority,
                                "COURSE_CODE",
                                course.getCourseId(),
                                courseActionUrl,
                                String.format("DEADLINE_CHANGED:ENR:%d:DUE:%s", existing.getId(), dueDate),
                                Map.of(
                                        "courseId", course.getCourseId(),
                                        "courseTitle", course.getTitle(),
                                        "newDueDate", dueDate.toString()
                                )
                        );
                    }
                }
                continue;
            }

            if (existing != null) {
                // Reassignment reuses the same row so lesson_progress foreign keys remain valid.
                existing.setEnrollmentType(enrollmentType);
                existing.setDueDate(dueDate);
                existing.setStatus(existing.getProgressPercent() != null && existing.getProgressPercent() > 0
                        ? EnrollmentStatus.IN_PROGRESS : EnrollmentStatus.NOT_STARTED);
                enrollmentRepository.save(existing);
                course.setEnrolledCount((course.getEnrolledCount() == null ? 0 : course.getEnrolledCount()) + 1);
                if (notificationService != null) {
                    notificationService.createNotificationSafely(
                            user.getId(),
                            "New " + assignmentLabel + " Course Assigned: " + course.getTitle(),
                            String.format(
                                    "Your access to the %s course \"%s\" (%s) has been restored.%s",
                                    assignmentLabel.toLowerCase(),
                                    course.getTitle(),
                                    course.getCourseId(),
                                    dueDate != null ? " Due date: " + dueDate + "." : ""
                            ),
                            NotificationType.COURSE_ASSIGNED,
                            priority,
                            "COURSE_CODE",
                            course.getCourseId(),
                            courseActionUrl,
                            null,
                            Map.of(
                                    "courseId", course.getCourseId(),
                                    "courseTitle", course.getTitle(),
                                    "assignmentType", assignmentLabel,
                                    "dueDate", dueDate != null ? dueDate.toString() : ""
                            )
                    );
                }
                assignedCount++;
                continue;
            }

            Enrollment enrollment = new Enrollment();

            enrollment.setUser(user);
            enrollment.setCourse(course);
            enrollment.setEnrollmentType(enrollmentType);
            enrollment.setStatus(EnrollmentStatus.NOT_STARTED);
            enrollment.setProgressPercent(0);
            enrollment.setDueDate(dueDate);
            enrollment.setLastAccessed(null);

            enrollmentRepository.save(enrollment);

            course.setEnrolledCount(
                    (course.getEnrolledCount() == null
                            ? 0 : course.getEnrolledCount()) + 1
            );

            String dedupKey = String.format(
                    "COURSE_ASSIGNED:USER:%d:COURSE:%d",
                    user.getId(),
                    course.getId()
            );

            if (notificationService != null) {
                notificationService.createNotificationSafely(
                        user.getId(),
                        "New " + assignmentLabel + " Course Assigned: " + course.getTitle(),
                        String.format(
                                "You have been assigned the %s course \"%s\" (%s). %s",
                                assignmentLabel.toLowerCase(),
                                course.getTitle(),
                                course.getCourseId(),
                                dueDate != null
                                        ? "Please complete it by " + dueDate + "."
                                        : "You can start learning right away."
                        ),
                        NotificationType.COURSE_ASSIGNED,
                        priority,
                        "COURSE_CODE",
                        course.getCourseId(),
                        courseActionUrl,
                        dedupKey,
                        Map.of(
                                "courseId", course.getCourseId(),
                                "courseTitle", course.getTitle(),
                                "assignmentType", assignmentLabel,
                                "dueDate", dueDate != null ? dueDate.toString() : ""
                        )
                );
            }

            assignedCount++;
        }

        courseRepository.save(course);

        return assignedCount;
    }

    // ---------------------------------------------------------
    // CURRENT USER ENROLLMENTS
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<CourseDTO> myEnrollments() {

        User user = securityContextUtil.getCurrentUser();

        return enrollmentRepository
                .findByUserIdWithCourse(user.getId())
                .stream()
                .filter(e -> e.getStatus() != EnrollmentStatus.REVOKED)
                .map(e -> courseMapper.toSummary(
                        e.getCourse(),
                        e,
                        e.getEnrollmentType() == EnrollmentType.MANDATORY
                                ? "MANDATORY"
                                : "OPTIONAL"
                ))
                .toList();
    }

    // ---------------------------------------------------------
    // COMPLETE COURSE / GENERATE CERTIFICATE
    // ---------------------------------------------------------

    @Transactional
    public CertificateDTO completeCourse(
            CompleteCourseRequest request) {

        Long enrollmentId = request.getEnrollmentId();
        Long courseId = request.getCourseId();
        Integer score = request.getScore();

        Enrollment enrollment = null;

        if (enrollmentId != null) {
            enrollment = enrollmentRepository
                    .findByIdWithUserAndCourse(enrollmentId)
                    .orElse(null);
        }

        Long userId = securityContextUtil.getCurrentUserId();

        if (enrollment == null && courseId != null) {
            enrollment = enrollmentRepository
                    .findByUserIdAndCourseId(userId, courseId)
                    .orElse(null);
        }

        if (enrollment == null
                && request.getCourseCode() != null
                && !request.getCourseCode().isBlank()) {

            enrollment = enrollmentRepository
                    .findByUserIdAndCourseCode(
                            userId,
                            request.getCourseCode()
                    )
                    .orElse(null);
        }

        if (enrollment == null) {
            throw new ResourceNotFoundException(
                    "Enrollment",
                    enrollmentId != null ? "id" : "userId+courseId",
                    enrollmentId != null
                            ? enrollmentId.toString()
                            : String.valueOf(courseId)
            );
        }

        if (enrollment.getStatus() == EnrollmentStatus.REVOKED) {
            throw new SecurityException("This course assignment has been revoked.");
        }

        Long currentUserId = securityContextUtil.getCurrentUserId();
        String currentRole = securityContextUtil.getCurrentUserRole();

        boolean isOwner = enrollment.getUser()
                .getId()
                .equals(currentUserId);

        boolean isHr = Role.HR_ADMIN.name()
                .equalsIgnoreCase(currentRole);

        if (!isOwner && !isHr) {
            throw new SecurityException(
                    "Only the enrolled employee or HR Admin can complete a course."
            );
        }

        if (request.getQuizId() != null) {
            Quiz requestedQuiz = quizRepository.findById(request.getQuizId()).orElse(null);
            if (requestedQuiz != null && requestedQuiz.getType() != QuizType.FINAL) {
                throw new IllegalStateException("Module quizzes cannot complete a course or generate certificates. Only passing the final assessment completes the course.");
            }
        }

        Course course = enrollment.getCourse();
        if (Boolean.TRUE.equals(course.getFoundation())) {
            throw new IllegalStateException("Foundation courses do not issue certificates or require final assessment completion.");
        }
        Long enrolledUserId = enrollment.getUser().getId();
        Long enrolledCourseId = course.getId();

        // Idempotency: if already completed and certificate already generated, return existing certificate without re-creating
        if (enrollment.getStatus() == EnrollmentStatus.COMPLETED) {
            Certificate existingCert = certificateService.getCertificateByUserIdAndCourseId(enrolledUserId, enrolledCourseId)
                    .orElse(null);
            if (existingCert != null) {
                return certificateService.toDTO(existingCert);
            }
        }

        // A passed FINAL quiz record is required; a score in the request alone is insufficient.
        List<Quiz> finalQuizzes = quizRepository.findByCourseIdAndType(
                enrolledCourseId, QuizType.FINAL);

        if (finalQuizzes == null || finalQuizzes.isEmpty()) {
            throw new IllegalStateException(
                    "This course does not have a final assessment configured."
            );
        }

        QuizProgress passedFinalProgress = null;
        for (Quiz finalQuiz : finalQuizzes) {
            QuizProgress qp = quizProgressRepository.findByQuizIdAndUserId(finalQuiz.getId(), enrolledUserId)
                    .orElse(null);
            if (qp != null && Boolean.TRUE.equals(qp.getPassed())) {
                passedFinalProgress = qp;
                break;
            }
        }

        if (passedFinalProgress == null) {
            throw new IllegalStateException(
                    "Pass the final assessment before completing this course."
            );
        }

        // Enforce the server-verified passing score from the database
        Integer verifiedScore = passedFinalProgress.getBestScore();
        int passingThreshold = course.getPassingScore() != null ? course.getPassingScore() : 70;
        if (verifiedScore == null || verifiedScore < passingThreshold) {
            throw new IllegalStateException(
                    "The final assessment passing score has not been achieved."
            );
        }
        score = verifiedScore;

        // Require all lessons and each configured module quiz to be completed/passed.
        List<Module> modules = moduleRepository
                .findByCourseIdOrderByOrderIndexAsc(enrolledCourseId);

        for (Module module : modules) {
            if (!lessonProgressRepository.areAllLessonsCompleted(
                    enrollment.getId(), module.getId())) {
                throw new IllegalStateException(
                        "Complete all lessons in every module before completing this course."
                );
            }

            Quiz moduleQuiz = quizRepository.findByModuleId(module.getId())
                    .orElse(null);

            if (moduleQuiz != null
                    && !quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(
                            moduleQuiz.getId(), enrolledUserId)) {
                throw new IllegalStateException(
                        "Pass every required module quiz before completing this course."
                );
            }
        }

        // A certificate is created when certificate eligibility is true or course has final quiz
        enrollment.setStatus(EnrollmentStatus.COMPLETED);
        enrollment.setProgressPercent(100);
        enrollment.setScore(score);
        if (enrollment.getCompletedDate() == null) {
            enrollment.setCompletedDate(LocalDateTime.now());
        }

        Certificate createdCertificate = null;
        if (Boolean.TRUE.equals(course.getCertificateEligible()) || course.getCertificateEligible() == null) {
            createdCertificate = certificateService.createCertificate(
                    enrolledUserId,
                    enrolledCourseId,
                    score
            );
            if (createdCertificate != null) {
                enrollment.setCertificateId(createdCertificate.getCertificateId());
            }
        }

        enrollmentRepository.save(enrollment);

        boolean certGenerated = createdCertificate != null;
        if (notificationService != null) {
            notificationService.createNotificationSafely(
                enrolledUserId,
                "Course Completed: " + course.getTitle(),
                String.format(
                        "Congratulations! You have completed \"%s\" (%s) with a final score of %d%%.%s",
                        course.getTitle(),
                        course.getCourseId(),
                        score != null ? score : 100,
                        certGenerated
                                ? " Your completion certificate (" + createdCertificate.getCertificateId() + ") is now ready to view and download."
                                : " Your learning progress record has been updated."
                ),
                NotificationType.COURSE_COMPLETED,
                NotificationPriority.NORMAL,
                "COURSE_CODE",
                course.getCourseId(),
                certGenerated ? "/certificates" : "/progress",
                "COURSE_COMPLETED:ENR:" + enrollment.getId(),
                Map.of(
                        "courseId", course.getCourseId(),
                        "courseTitle", course.getTitle(),
                        "score", score != null ? score : 100,
                        "certificateIssued", certGenerated
                )
            );
        }

        User enrolledUser = enrollment.getUser();
        if (notificationService != null
                && enrollment.getEnrollmentType() == EnrollmentType.MANDATORY
                && enrolledUser != null
                && enrolledUser.getDepartment() != null) {
            notificationService.notifyDepartmentManagers(
                    enrolledUser.getDepartment(),
                    "Mandatory Course Completed: " + enrolledUser.getName(),
                    String.format(
                            "Team member %s (%s) completed mandatory course \"%s\" (%s) with a score of %d%%.",
                            enrolledUser.getName(),
                            enrolledUser.getEmployeeId(),
                            course.getTitle(),
                            course.getCourseId(),
                            score != null ? score : 100
                    ),
                    NotificationType.TEAM_COMPLIANCE,
                    NotificationPriority.NORMAL,
                    "COURSE_CODE",
                    course.getCourseId(),
                    "/manager",
                    "MGR_COURSE_COMPLETED:ENR:" + enrollment.getId(),
                    Map.of(
                            "employeeId", enrolledUser.getEmployeeId(),
                            "employeeName", enrolledUser.getName(),
                            "courseId", course.getCourseId(),
                            "score", score != null ? score : 100
                    )
            );
        }

        if (createdCertificate == null) {
            return null;
        }

        return certificateService.verifyCertificate(
                createdCertificate.getCertificateId()
        );
    }

    // ---------------------------------------------------------
    // RESOLVE COURSE
    // ---------------------------------------------------------

    private Course resolveCourse(Long dbId, String courseCode) {

        if (dbId != null) {
            return courseRepository.findById(dbId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Course", "id", dbId
                    ));
        }

        if (courseCode != null && !courseCode.isBlank()) {
            return courseRepository.findByCourseId(courseCode)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Course", "courseId", courseCode
                    ));
        }

        throw new ResourceNotFoundException(
                "Course", "id", "missing"
        );
    }

    private static final Map<String, Integer> LEVEL_RANK = Map.of(
            "P0", 0,
            "P1", 1,
            "P2", 2,
            "P3", 3,
            "P4", 4,
            "L0", 0,
            "L1", 1,
            "L2", 2,
            "L3", 3,
            "L4", 4
    );

    /**
     * Employees can self-enroll only in courses matching their exact position.
     * Existing enrollment means the course was explicitly assigned/enabled,
     * so cross-position access is allowed for that enrollment.
     * HR Admin and Trainers can access courses across positions.
     */
    private void validateCourseLevel(User user, Course course) {
        if (user == null || course == null) {
            throw new IllegalArgumentException("User and course are required.");
        }

        Role role = user.getRole();
        if (role == Role.HR_ADMIN || role == Role.TRAINER) {
            return;
        }

        // Existing enrollment is treated as an explicit assignment/enablement.
        Enrollment existingEnrollment = enrollmentRepository
                .findByUserIdAndCourseId(user.getId(), course.getId())
                .orElse(null);
        if (existingEnrollment != null
                && existingEnrollment.getStatus() != EnrollmentStatus.REVOKED) {
            return;
        }

        String employeeLevel = normalizeLevel(user.getLevel());
        String courseLevel = normalizeLevel(course.getLevel());

        if (employeeLevel == null) {
            throw new SecurityException(
                    "Your employee position is missing or invalid. Contact HR Admin."
            );
        }

        if (courseLevel == null) {
            throw new SecurityException(
                    "This course has no valid position configured. Contact HR Admin."
            );
        }

        if (!employeeLevel.equals(courseLevel)) {
            throw new SecurityException(
                    "This course is assigned to position " + courseLevel
                            + " only. Your assigned position is " + employeeLevel
                            + ". Contact Trainer or HR/Admin if you need access."
            );
        }
    }

    private String normalizeLevel(String level) {
        if (level == null || level.isBlank()) {
            return null;
        }

        String normalized = level.trim().toUpperCase();
        if (normalized.startsWith("L") && normalized.length() == 2 && Character.isDigit(normalized.charAt(1))) {
            normalized = "P" + normalized.charAt(1);
        }
        return (normalized.startsWith("P") && LEVEL_RANK.containsKey(normalized)) ? normalized : null;
    }

}
