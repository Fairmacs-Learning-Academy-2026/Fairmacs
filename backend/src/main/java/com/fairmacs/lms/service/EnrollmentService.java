
package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.EnrollRequest;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Department;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.DepartmentRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.ModuleRepository;
import com.fairmacs.lms.repository.QuizProgressRepository;
import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
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

    if (targetLevel == null || normalizeLevel(targetLevel) == null) {
        throw new IllegalArgumentException(
                "A valid employee level (L0-L4) is required.");
    }

    if ("RECOMMENDED".equalsIgnoreCase(trainingType)) {
        throw new IllegalArgumentException(
                "Recommended training must be assigned to selected employees.");
    }

    Course course = resolveCourse(courseId, courseCode);

    String requiredLevel = normalizeLevel(targetLevel);

    if (!requiredLevel.equals(normalizeLevel(course.getLevel()))) {
        throw new IllegalArgumentException(
                "The selected level must match the course level.");
    }

    List<User> targetUsers = getUsersForDepartmentHierarchy(
            department.trim());

    // Apply the level filter before creating any enrollments.
    List<User> eligibleUsers = targetUsers.stream()
            .filter(user -> user != null)
            .filter(user -> user.getRole() == Role.EMPLOYEE)
            .filter(user -> user.getStatus() == UserStatus.ACTIVE)
            .filter(user -> requiredLevel.equals(
                    normalizeLevel(user.getLevel())))
            .toList();

    return createAssignments(
            eligibleUsers,
            course,
            dueDate,
            EnrollmentType.MANDATORY);
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
            LocalDate dueDate) {

        if (employeeIds == null || employeeIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "Select at least one employee for recommended training."
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

        return createAssignments(
                selectedUsers,
                course,
                dueDate,
                EnrollmentType.SELF_SELECTED
        );
    }

    // ---------------------------------------------------------
    // ASSIGNMENT HELPERS
    // ---------------------------------------------------------

    private List<User> getUsersForDepartmentHierarchy(
            String selectedDepartment) {

        List<Department> departments = departmentRepository.findAll();

        Department root = departments.stream()
                .filter(d -> d.getName() != null
                        && d.getName().equalsIgnoreCase(
                                selectedDepartment))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Department", "name", selectedDepartment
                ));

        Set<String> departmentNames = new HashSet<>();

        // General / Common is intended for all departments.
        if (root.getName().equalsIgnoreCase("General / Common")) {
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

            if (existing != null && existing.getStatus() != EnrollmentStatus.REVOKED) {
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
                notificationService.createNotification(
                        user.getId(),
                        "Training Access Restored",
                        "Your access to the course \"" + course.getTitle() + "\" has been restored.",
                        "COURSE_ASSIGNED",
                        "COURSE",
                        course.getCourseId()
                );
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

            notificationService.createNotification(
                    user.getId(),
                    "New Training Assigned",
                    "You have been assigned the course \""
                            + course.getTitle()
                            + "\" by HR. "
                            + (dueDate != null
                                    ? "Please complete it by "
                                            + dueDate + "."
                                    : "Please complete it as required."),
                    "COURSE_ASSIGNED",
                    "COURSE",
                    course.getCourseId()
            );

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

        Course course = enrollment.getCourse();
        Long enrolledUserId = enrollment.getUser().getId();
        Long enrolledCourseId = course.getId();

        // Completion must be validated by the backend, not trusted from the client.
        if (score == null || course.getPassingScore() == null
                || score < course.getPassingScore()) {
            throw new IllegalStateException(
                    "The final assessment passing score has not been achieved."
            );
        }

        // A passed FINAL quiz record is required; a score in the request alone is insufficient.
        List<Quiz> finalQuizzes = quizRepository.findByCourseIdAndType(
                enrolledCourseId, QuizType.FINAL);

        if (finalQuizzes == null || finalQuizzes.isEmpty()) {
            throw new IllegalStateException(
                    "This course does not have a final assessment configured."
            );
        }

        boolean passedFinalAssessment = finalQuizzes.stream().anyMatch(finalQuiz ->
                quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(
                        finalQuiz.getId(), enrolledUserId));

        if (!passedFinalAssessment) {
            throw new IllegalStateException(
                    "Pass the final assessment before completing this course."
            );
        }

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

        // General/Common courses must have certificateEligible=false in the course record.
        // A certificate is created only when an authorized admin has enabled eligibility.
        enrollment.setStatus(EnrollmentStatus.COMPLETED);
        enrollment.setProgressPercent(100);
        enrollment.setScore(score);
        enrollment.setCompletedDate(LocalDateTime.now());
        enrollment.setCertificateId(null);

        CertificateDTO certificate = null;
        if (Boolean.TRUE.equals(course.getCertificateEligible())) {
            return certificateService.verifyCertificate(certificate.getCertificateId());
        }

        enrollmentRepository.save(enrollment);

        if (certificate == null) {
            return null;
        }

        return certificateService.verifyCertificate(
                certificate.getCertificateId()
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
            "L0", 0,
            "L1", 1,
            "L2", 2,
            "L3", 3,
            "L4", 4
    );

    /**
     * Employees can self-enroll only in courses matching their exact level.
     * Existing enrollment means the course was explicitly assigned/enabled,
     * so cross-level access is allowed for that enrollment.
     * HR Admin and Trainers can access courses across levels.
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
                    "Your employee level is missing or invalid. Contact HR Admin."
            );
        }

        if (courseLevel == null) {
            throw new SecurityException(
                    "This course has no valid level configured. Contact HR Admin."
            );
        }

        if (!employeeLevel.equals(courseLevel)) {
            throw new SecurityException(
                    "This course is assigned to level " + courseLevel
                            + " only. Your assigned level is " + employeeLevel
                            + ". Contact Trainer or HR/Admin if you need access."
            );
        }
    }

    private String normalizeLevel(String level) {
        if (level == null || level.isBlank()) {
            return null;
        }

        String normalized = level.trim().toUpperCase();
        return LEVEL_RANK.containsKey(normalized) ? normalized : null;
    }

}
