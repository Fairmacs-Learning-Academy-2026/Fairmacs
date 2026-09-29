package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.RecommendationRule;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.RecommendationRuleRepository;
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

    public RecommendationService(RecommendationRuleRepository recommendationRuleRepository,
            CourseRepository courseRepository) {
        this.recommendationRuleRepository = recommendationRuleRepository;
        this.courseRepository = courseRepository;
    }

    public List<Course> recommendFor(User user, Set<Long> alreadyEnrolledCourseIds) {
        LinkedHashMap<Long, Course> ordered = new LinkedHashMap<>();

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
                        if (course != null && !alreadyEnrolledCourseIds.contains(course.getId())) {
                            ordered.put(course.getId(), course);
                        }
                    });
        }

        List<String> slugs = DEPARTMENT_CATEGORY_SLUGS.getOrDefault(
                user.getDepartment() == null ? "" : user.getDepartment().toLowerCase(Locale.ROOT),
                List.of());
        courseRepository.findActiveWithCategory().stream()
                .filter(c -> !Boolean.TRUE.equals(c.getFoundation()))
                .filter(c -> c.getCatalogCategory() != null && slugs.contains(c.getCatalogCategory().getSlug()))
                .filter(c -> !alreadyEnrolledCourseIds.contains(c.getId()))
                .forEach(c -> ordered.putIfAbsent(c.getId(), c));

        return new ArrayList<>(ordered.values());
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
