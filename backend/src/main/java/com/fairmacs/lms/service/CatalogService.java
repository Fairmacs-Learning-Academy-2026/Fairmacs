package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CategoryDTO;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.LearningDashboardDTO;
import com.fairmacs.lms.dto.LearningPathDTO;
import com.fairmacs.lms.entity.Category;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.LearningPath;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.CategoryRepository;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LearningPathRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CatalogService {

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

    private final CategoryRepository categoryRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LearningPathRepository learningPathRepository;
    private final CertificateRepository certificateRepository;
    private final CourseMapper courseMapper;
    private final RecommendationService recommendationService;
    private final SecurityContextUtil securityContextUtil;

    public CatalogService(
            CategoryRepository categoryRepository,
            CourseRepository courseRepository,
            EnrollmentRepository enrollmentRepository,
            LearningPathRepository learningPathRepository,
            CertificateRepository certificateRepository,
            CourseMapper courseMapper,
            RecommendationService recommendationService,
            SecurityContextUtil securityContextUtil) {
        this.categoryRepository = categoryRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.learningPathRepository = learningPathRepository;
        this.certificateRepository = certificateRepository;
        this.courseMapper = courseMapper;
        this.recommendationService = recommendationService;
        this.securityContextUtil = securityContextUtil;
    }

    @Transactional(readOnly = true)
    public List<CategoryDTO> listCategories() {
        Map<String, Long> counts = courseRepository.findActiveWithCategory().stream()
                .filter(c -> c.getCatalogCategory() != null)
                .collect(Collectors.groupingBy(
                        c -> c.getCatalogCategory().getSlug(),
                        Collectors.counting()));

        return categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(cat -> courseMapper.toCategory(
                        cat,
                        counts.getOrDefault(cat.getSlug(), 0L).intValue()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CourseDTO> listCourses(String search, String categorySlug) {
        User user = securityContextUtil.getCurrentUser();

        List<Enrollment> enrollments = user == null
                ? List.of()
                : enrollmentRepository.findByUserIdWithCourse(user.getId()).stream()
                        .filter(e -> e.getStatus() != EnrollmentStatus.REVOKED)
                        .toList();

        Map<Long, Enrollment> byCourse = enrollments.stream()
                .collect(Collectors.toMap(
                        e -> e.getCourse().getId(),
                        Function.identity(),
                        (a, b) -> a));

        Set<Long> enrolledIds = new HashSet<>(byCourse.keySet());

        Set<Long> recommendedIds = user == null
                ? Set.of()
                : recommendationService.recommendFor(user, enrolledIds).stream()
                        .map(Course::getId)
                        .collect(Collectors.toSet());

        String slug = (categorySlug == null
                || categorySlug.isBlank()
                || "all".equalsIgnoreCase(categorySlug))
                ? null
                : categorySlug;

        List<Course> filteredCourses = courseRepository.searchCatalog(search, slug).stream()
                // Existing enrollments remain visible so employees can continue training.
                .filter(course -> isCourseVisibleToUser(user, course, byCourse.containsKey(course.getId())))
                .sorted(Comparator.comparing((Course c) -> !Boolean.TRUE.equals(c.getFoundation()))
                        .thenComparing(Course::getTitle))
                .toList();

        CourseMapper.SummaryBatchContext batchContext = courseMapper.preloadSummaryContext(filteredCourses);

        return filteredCourses.stream()
                .map(course -> {
                    Enrollment enrollment = byCourse.get(course.getId());
                    boolean targetDeptMandatory = user != null && user.getDepartment() != null
                            && course.getDepartmentAssignments() != null
                            && course.getDepartmentAssignments().stream().anyMatch(a ->
                                    a.getDepartment() != null
                                    && a.getDepartment().getName().equalsIgnoreCase(user.getDepartment())
                                    && a.getAssignmentType() == EnrollmentType.MANDATORY);
                    boolean mandatory = (enrollment != null
                            && enrollment.getEnrollmentType() == EnrollmentType.MANDATORY)
                            || Boolean.TRUE.equals(course.getFoundation())
                            || targetDeptMandatory;
                    boolean recommended = recommendedIds.contains(course.getId())
                            || (user != null && user.getDepartment() != null
                                    && course.getDepartmentAssignments() != null
                                    && course.getDepartmentAssignments().stream().anyMatch(a ->
                                            a.getDepartment() != null
                                            && a.getDepartment().getName().equalsIgnoreCase(user.getDepartment())
                                            && a.getAssignmentType() == EnrollmentType.RECOMMENDED));
                    String type = mandatory ? "MANDATORY"
                            : (recommended ? "RECOMMENDED" : "OPTIONAL");
                    return courseMapper.toSummary(course, enrollment, type, batchContext);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CourseDTO getCourse(String courseCode) {
        User user = securityContextUtil.getCurrentUser();

        Course course = courseRepository.findDetailByCourseId(courseCode)
                .or(() -> {
                    try {
                        Long id = Long.parseLong(courseCode);
                        return courseRepository.findDetailById(id);
                    } catch (NumberFormatException e) {
                        return Optional.empty();
                    }
                })
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Course", "courseId", courseCode));

        Enrollment currentEnrollment = user == null ? null
                : enrollmentRepository.findByUserIdAndCourseId(user.getId(), course.getId())
                        .filter(e -> e.getStatus() != EnrollmentStatus.REVOKED)
                        .orElse(null);
        boolean alreadyEnrolled = currentEnrollment != null;

        if (!isCourseVisibleToUser(user, course, alreadyEnrolled)) {
            throw new SecurityException(
                    "This course is not available for your employee position.");
        }

        Enrollment enrollment = currentEnrollment;

        String type = assignmentType(course, enrollment, user);
        return courseMapper.toDetail(course, enrollment, type);
    }

    /**
     * Employees see courses matching their exact level by default.
     * Explicit enrollment/assignment is the exception and keeps that course visible.
     * HR Admin and Trainers can see courses across levels.
     */
    private boolean isCourseVisibleToUser(User user, Course course, boolean explicitlyAssigned) {
        if (user == null) {
            return true;
        }

        if (user.getRole() != null
                && (user.getRole().name().equals("HR_ADMIN")
                || user.getRole().name().equals("TRAINER"))) {
            return true;
        }

        if (explicitlyAssigned) {
            return true;
        }

        String employeeLevel = normalizeLevel(user.getLevel());
        String courseLevel = normalizeLevel(course.getLevel());

        // Unconfigured or invalid levels are not available by default to employees.
        return employeeLevel != null && courseLevel != null
                && employeeLevel.equals(courseLevel);
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

    @Transactional(readOnly = true)
    public List<LearningPathDTO> listLearningPaths() {
        User user = securityContextUtil.getCurrentUser();

        Map<Long, Enrollment> byCourse = Map.of();
        if (user != null) {
            byCourse = enrollmentRepository.findByUserIdWithCourse(user.getId()).stream()
                    .filter(e -> e.getStatus() != EnrollmentStatus.REVOKED)
                    .collect(Collectors.toMap(
                            e -> e.getCourse().getId(),
                            Function.identity(),
                            (a, b) -> a));
        }

        Map<Long, Enrollment> enrollments = byCourse;
        return learningPathRepository.findAllWithItems().stream()
                .map(path -> toPathDto(path, enrollments, user))
                .toList();
    }

    @Transactional(readOnly = true)
    public LearningDashboardDTO getDashboard() {
        User user = securityContextUtil.getCurrentUser();
        if (user == null) {
            throw new ResourceNotFoundException("User", "session", "current");
        }

        List<Enrollment> enrollments = enrollmentRepository.findByUserIdWithCourse(user.getId()).stream()
                .filter(e -> e.getStatus() != EnrollmentStatus.REVOKED)
                .toList();
        Map<Long, Enrollment> byCourse = enrollments.stream()
                .collect(Collectors.toMap(
                        e -> e.getCourse().getId(),
                        Function.identity(),
                        (a, b) -> a));
        Set<Long> enrolledIds = new HashSet<>(byCourse.keySet());

        List<Course> recommended = recommendationService.recommendFor(user, enrolledIds).stream()
                .filter(course -> isCourseVisibleToUser(user, course, false))
                .limit(6)
                .toList();

        java.util.List<Course> allDashboardCourses = new java.util.ArrayList<>(enrollments.size() + recommended.size());
        for (Enrollment e : enrollments) {
            if (e.getCourse() != null) allDashboardCourses.add(e.getCourse());
        }
        allDashboardCourses.addAll(recommended);
        CourseMapper.SummaryBatchContext batchContext = courseMapper.preloadSummaryContext(allDashboardCourses);

        LearningDashboardDTO dto = new LearningDashboardDTO();
        dto.setName(user.getName());
        dto.setDepartment(user.getDepartment());
        dto.setDesignation(user.getDesignation());
        dto.setBranch(user.getBranch());

        List<Enrollment> mandatory = enrollments.stream()
                .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY)
                .toList();

        long mandatoryDone = mandatory.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED)
                .count();

        dto.setMandatoryPercent(mandatory.isEmpty()
                ? 100
                : (int) Math.round((mandatoryDone * 100.0) / mandatory.size()));

        dto.setCompletedCourses((int) enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED)
                .count());

        dto.setInProgress((int) enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.IN_PROGRESS)
                .count());

        dto.setCertificates(certificateRepository.findByUserId(user.getId()).size());

        double hours = enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED
                        || e.getStatus() == EnrollmentStatus.IN_PROGRESS)
                .mapToDouble(e -> {
                    Double h = e.getCourse().getDurationHours();
                    int pct = e.getProgressPercent() == null ? 0 : e.getProgressPercent();
                    return (h == null ? 1.0 : h) * (pct / 100.0);
                })
                .sum();

        int totalMinutes = (int) Math.round(hours * 60);
        dto.setLearningHours((totalMinutes / 60) + "h " + (totalMinutes % 60) + "m");

        // Map each enrollment once and reuse DTOs across enrolled, mandatory, and continueLearning
        Map<Long, CourseDTO> mappedByEnrollmentId = new java.util.LinkedHashMap<>();
        List<CourseDTO> enrolledDtos = new java.util.ArrayList<>(enrollments.size());
        List<CourseDTO> mandatoryDtos = new java.util.ArrayList<>(mandatory.size());
        for (Enrollment e : enrollments) {
            String typeLabel = e.getEnrollmentType() == EnrollmentType.MANDATORY ? "MANDATORY" : "OPTIONAL";
            CourseDTO mapped = courseMapper.toSummary(e.getCourse(), e, typeLabel, batchContext);
            enrolledDtos.add(mapped);
            if (e.getId() != null) {
                mappedByEnrollmentId.put(e.getId(), mapped);
            }
            if (e.getEnrollmentType() == EnrollmentType.MANDATORY) {
                mandatoryDtos.add(mapped);
            }
        }

        dto.setMandatory(mandatoryDtos);
        dto.setEnrolled(enrolledDtos);

        dto.setRecommended(recommended.stream()
                .map(c -> courseMapper.toSummary(c, null, "RECOMMENDED", batchContext))
                .toList());

        dto.setCategories(listCategories().stream()
                .filter(c -> !Boolean.TRUE.equals(c.getFoundationTrack()))
                .toList());

        enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.IN_PROGRESS)
                .max(Comparator.comparing(
                        e -> e.getProgressPercent() == null ? 0 : e.getProgressPercent()))
                .ifPresent(e -> dto.setContinueLearning(
                        e.getId() != null && mappedByEnrollmentId.containsKey(e.getId())
                                ? mappedByEnrollmentId.get(e.getId())
                                : courseMapper.toSummary(
                                        e.getCourse(), e,
                                        e.getEnrollmentType() == EnrollmentType.MANDATORY ? "MANDATORY" : "OPTIONAL",
                                        batchContext)));

        if (dto.getContinueLearning() == null) {
            mandatory.stream()
                    .filter(e -> e.getStatus() != EnrollmentStatus.COMPLETED)
                    .findFirst()
                    .ifPresent(e -> dto.setContinueLearning(
                            e.getId() != null && mappedByEnrollmentId.containsKey(e.getId())
                                    ? mappedByEnrollmentId.get(e.getId())
                                    : courseMapper.toSummary(e.getCourse(), e, "MANDATORY", batchContext)));
        }

        return dto;
    }

    private LearningPathDTO toPathDto(
            LearningPath path,
            Map<Long, Enrollment> enrollments,
            User user) {
        LearningPathDTO dto = new LearningPathDTO();
        dto.setId(path.getPathCode());
        dto.setTitle(path.getTitle());
        dto.setDescription(path.getDescription());
        dto.setSuggested(Boolean.TRUE.equals(path.getSuggested()));
        dto.setCourses(path.getItems().stream()
                .sorted(Comparator.comparing(
                        i -> i.getOrderIndex() == null ? 0 : i.getOrderIndex()))
                .map(item -> {
                    Course course = item.getCourse();
                    Enrollment enrollment = enrollments.get(course.getId());
                    if (!isCourseVisibleToUser(user, course, enrollment != null)) {
                        return null;
                    }
                    return courseMapper.toSummary(
                            course, enrollment, assignmentType(course, enrollment, user));
                })
                .filter(java.util.Objects::nonNull)
                .toList());
        dto.setCourseCount(dto.getCourses().size());
        return dto;
    }

    private String assignmentType(Course course, Enrollment enrollment, User user) {
        if (enrollment != null && enrollment.getEnrollmentType() == EnrollmentType.MANDATORY) {
            return "MANDATORY";
        }
        if (Boolean.TRUE.equals(course.getFoundation())) {
            return "MANDATORY";
        }
        if (user != null && user.getDepartment() != null && course.getDepartmentAssignments() != null) {
            boolean hasMandatory = course.getDepartmentAssignments().stream()
                    .anyMatch(a -> a.getDepartment() != null
                            && a.getDepartment().getName().equalsIgnoreCase(user.getDepartment())
                            && a.getAssignmentType() == EnrollmentType.MANDATORY);
            if (hasMandatory) {
                return "MANDATORY";
            }
            boolean hasRecommended = course.getDepartmentAssignments().stream()
                    .anyMatch(a -> a.getDepartment() != null
                            && a.getDepartment().getName().equalsIgnoreCase(user.getDepartment())
                            && a.getAssignmentType() == EnrollmentType.RECOMMENDED);
            if (hasRecommended) {
                return "RECOMMENDED";
            }
        }
        if (user != null) {
            boolean recommended = recommendationService.recommendFor(user, Set.of()).stream()
                    .anyMatch(c -> c.getId().equals(course.getId()));
            if (recommended) {
                return "RECOMMENDED";
            }
        }
        return "OPTIONAL";
    }
}
