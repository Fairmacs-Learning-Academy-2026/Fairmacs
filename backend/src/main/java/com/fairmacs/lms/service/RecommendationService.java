package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.CourseDepartmentAssignment;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.RecommendationRule;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.CourseDepartmentAssignmentRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.RecommendationRuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private static final Map<String, List<String>> DEPARTMENT_CATEGORY_SLUGS = Map.ofEntries(
            Map.entry("documentation", List.of("documentation", "customs", "export", "import")),
            Map.entry("accounts", List.of("accounts", "pricing")),
            Map.entry("sales", List.of("sales", "pricing", "customer-service")),
            Map.entry("operations", List.of("import", "export", "operations", "warehouse")),
            Map.entry("it", List.of("it-security")),
            Map.entry("it & security", List.of("it-security")),
            Map.entry("human resources", List.of("customer-service", "quality")),
            Map.entry("hr", List.of("customer-service", "quality")),
            Map.entry("training", List.of("customer-service", "operations")),
            Map.entry("customer service", List.of("customer-service", "sales")));

    private final RecommendationRuleRepository recommendationRuleRepository;
    private final CourseRepository courseRepository;
    private final CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository;

    public RecommendationService(
            RecommendationRuleRepository recommendationRuleRepository,
            CourseRepository courseRepository) {
        this(recommendationRuleRepository, courseRepository, null);
    }

    @Autowired
    public RecommendationService(
            RecommendationRuleRepository recommendationRuleRepository,
            CourseRepository courseRepository,
            @Autowired(required = false) CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository) {
        this.recommendationRuleRepository = recommendationRuleRepository;
        this.courseRepository = courseRepository;
        this.courseDepartmentAssignmentRepository = courseDepartmentAssignmentRepository;
    }

    public List<Course> recommendFor(User user, Set<Long> alreadyEnrolledCourseIds) {
        LinkedHashMap<Long, Course> ordered = new LinkedHashMap<>();

        if (user == null) {
            return List.of();
        }

        // 1. Target department assignments configured with RECOMMENDED
        if (user.getDepartment() != null && courseDepartmentAssignmentRepository != null) {
            List<CourseDepartmentAssignment> assignments = courseDepartmentAssignmentRepository
                    .findByDepartment_NameIgnoreCase(user.getDepartment());
            if (assignments != null) {
                for (CourseDepartmentAssignment a : assignments) {
                    if (a.getAssignmentType() == EnrollmentType.RECOMMENDED && a.getCourse() != null) {
                        Course course = a.getCourse();
                        if (isEligibleRecommendation(course, user, alreadyEnrolledCourseIds)) {
                            ordered.put(course.getId(), course);
                        }
                    }
                }
            }
        }

        // 2. Department / designation recommendation rules
        if (user.getDepartment() != null) {
            List<RecommendationRule> rules = recommendationRuleRepository
                    .findByDepartmentIgnoreCase(user.getDepartment());
            rules.stream()
                    .filter(rule -> rule.getDesignation() == null
                            || rule.getDesignation().isBlank()
                            || rule.getDesignation().equalsIgnoreCase(user.getDesignation()))
                    .sorted((a, b) -> Integer.compare(
                            b.getPriority() == null ? 0 : b.getPriority(),
                            a.getPriority() == null ? 0 : a.getPriority()))
                    .forEach(rule -> {
                        Course course = rule.getCourse();
                        if (course != null && isEligibleRecommendation(course, user, alreadyEnrolledCourseIds)) {
                            ordered.put(course.getId(), course);
                        }
                    });
        }

        // 3. Category slugs matching employee department
        List<String> slugs = DEPARTMENT_CATEGORY_SLUGS.getOrDefault(
                user.getDepartment() == null ? "" : user.getDepartment().toLowerCase(Locale.ROOT),
                List.of());
        courseRepository.findActiveWithCategory().stream()
                .filter(c -> isEligibleRecommendation(c, user, alreadyEnrolledCourseIds))
                .filter(c -> c.getCatalogCategory() != null && slugs.contains(c.getCatalogCategory().getSlug()))
                .forEach(c -> ordered.putIfAbsent(c.getId(), c));

        return new ArrayList<>(ordered.values());
    }

    private boolean isEligibleRecommendation(Course course, User user, Set<Long> alreadyEnrolledCourseIds) {
        if (course == null) {
            return false;
        }
        if (Boolean.TRUE.equals(course.getFoundation())) {
            return false;
        }
        if (course.getActive() != null && !course.getActive()) {
            return false;
        }
        if (alreadyEnrolledCourseIds != null && alreadyEnrolledCourseIds.contains(course.getId())) {
            return false;
        }

        String userLevel = normalizeLevel(user.getLevel());
        String courseLevel = normalizeLevel(course.getLevel());
        if (userLevel != null && courseLevel != null && !userLevel.equals(courseLevel)) {
            return false;
        }

        return true;
    }

    private String normalizeLevel(String level) {
        if (level == null || level.isBlank()) {
            return null;
        }
        String normalized = level.trim().toUpperCase();
        if (normalized.startsWith("L") && normalized.length() == 2 && Character.isDigit(normalized.charAt(1))) {
            normalized = "P" + normalized.charAt(1);
        }
        return normalized.matches("P[0-4]") ? normalized : null;
    }

    public String resolveAssignmentType(Course course, EnrollmentLookup lookup) {
        if (lookup != null && lookup.mandatory) {
            return "MANDATORY";
        }
        if (Boolean.TRUE.equals(course.getFoundation())) {
            return "MANDATORY";
        }
        if (lookup != null && lookup.recommended) {
            return "RECOMMENDED";
        }
        return "OPTIONAL";
    }

    public record EnrollmentLookup(boolean mandatory, boolean recommended) {
    }
}
