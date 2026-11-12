package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CategoryDTO;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.entity.Category;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Lesson;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizType;
import com.fairmacs.lms.repository.ModuleRepository;
import com.fairmacs.lms.repository.LessonRepository;
import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.repository.CourseThumbnailRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Component
public class CourseMapper {

    private final ObjectMapper objectMapper;
    private final QuizRepository quizRepository;
    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final CourseThumbnailRepository courseThumbnailRepository;

    @Autowired
    public CourseMapper(
        ObjectMapper objectMapper,
        QuizRepository quizRepository,
        @Autowired(required = false) ModuleRepository moduleRepository,
        @Autowired(required = false) LessonRepository lessonRepository,
        @Autowired(required = false) CourseThumbnailRepository courseThumbnailRepository) {

        this.objectMapper = objectMapper;
        this.quizRepository = quizRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
        this.courseThumbnailRepository = courseThumbnailRepository;
    }

    public CourseMapper(
        ObjectMapper objectMapper,
        QuizRepository quizRepository) {

        this(objectMapper, quizRepository, null, null, null);
    }

    public CourseMapper(
        ObjectMapper objectMapper,
        QuizRepository quizRepository,
        ModuleRepository moduleRepository,
        LessonRepository lessonRepository) {

        this(objectMapper, quizRepository, moduleRepository, lessonRepository, null);
    }

    public CourseDTO toSummary(
            Course course,
            Enrollment enrollment,
            String assignmentType) {
        return toSummary(course, enrollment, assignmentType, null, null);
    }

    public CourseDTO toSummary(
            Course course,
            Enrollment enrollment,
            String assignmentType,
            Integer precalculatedModuleCount,
            Integer precalculatedLessonCount) {

        CourseDTO dto = new CourseDTO();

        dto.setDbId(course.getId());
        dto.setId(course.getCourseId());
        dto.setTitle(course.getTitle());

        // Resolve assigned departments to replace legacy category / Uncategorized
        List<String> depts = new ArrayList<>();
        List<com.fairmacs.lms.dto.CourseDepartmentAssignmentDTO> assignmentDTOs = new ArrayList<>();
        if (course.getDepartmentAssignments() != null && !course.getDepartmentAssignments().isEmpty()) {
            for (com.fairmacs.lms.entity.CourseDepartmentAssignment a : course.getDepartmentAssignments()) {
                if (a.getDepartment() != null) {
                    depts.add(a.getDepartment().getName());
                    assignmentDTOs.add(new com.fairmacs.lms.dto.CourseDepartmentAssignmentDTO(
                            a.getId(),
                            a.getDepartment().getId(),
                            a.getDepartment().getName(),
                            a.getDepartment().getShortCode(),
                            a.getAssignmentType() != null ? a.getAssignmentType().name() : "MANDATORY",
                            a.getDueDate()
                    ));
                }
            }
        }
        if (depts.isEmpty() && course.getDraftPayload() != null && !course.getDraftPayload().isBlank()) {
            try {
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(course.getDraftPayload());
                if (root.has("targetDepartments") && root.get("targetDepartments").isArray()) {
                    for (com.fasterxml.jackson.databind.JsonNode n : root.get("targetDepartments")) {
                        if (n.isTextual() && !n.asText().isBlank()) {
                            depts.add(n.asText().trim());
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        if (depts.isEmpty()) {
            if (course.getCatalogCategory() != null && !course.getCatalogCategory().getName().equalsIgnoreCase("Uncategorized")) {
                depts.add(course.getCatalogCategory().getName());
            } else if (course.getCategory() != null && !course.getCategory().isBlank() && !course.getCategory().equalsIgnoreCase("Uncategorized")) {
                depts.add(course.getCategory());
            } else {
                depts.add("General");
            }
        }
        
        String owningDeptName = course.getOwningDepartment() != null
                ? course.getOwningDepartment().getName()
                : (!depts.isEmpty() ? depts.get(0) : "General");

        if (course.getOwningDepartment() != null) {
            dto.setDepartmentId(course.getOwningDepartment().getId());
            dto.setOwningDepartmentName(course.getOwningDepartment().getName());
        }
        dto.setDepartment(owningDeptName);
        dto.setDepartments(depts);
        dto.setDepartmentAssignments(assignmentDTOs);
        String resolvedCategory = (owningDeptName != null && !owningDeptName.isBlank()) ? owningDeptName : null;
        if (resolvedCategory == null && !depts.isEmpty()) {
            resolvedCategory = depts.get(0);
        }
        if (resolvedCategory == null && course.getCategory() != null && !course.getCategory().isBlank() && !course.getCategory().equalsIgnoreCase("Uncategorized")) {
            resolvedCategory = course.getCategory();
        }
        dto.setCategory(resolvedCategory);

        if (course.getCatalogCategory() != null) {
            dto.setCategorySlug(
                    course.getCatalogCategory().getSlug()
            );
        }

        if (course.getPublishedAt() != null) {
            dto.setPublishedAt(course.getPublishedAt().toString());
        }

        // Learning outcomes
        List<String> outcomes = new ArrayList<>();
        if (course.getLearningOutcomes() != null && !course.getLearningOutcomes().isBlank()) {
            try {
                outcomes = objectMapper.readValue(course.getLearningOutcomes(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
            } catch (Exception e) {
                outcomes = new ArrayList<>(List.of(course.getLearningOutcomes().split("\\r?\\n")));
            }
        } else if (course.getDraftPayload() != null && !course.getDraftPayload().isBlank()) {
            try {
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(course.getDraftPayload());
                if (root.has("learningOutcomes") && root.get("learningOutcomes").isArray()) {
                    for (com.fasterxml.jackson.databind.JsonNode n : root.get("learningOutcomes")) {
                        if (n.isTextual() && !n.asText().isBlank()) {
                            outcomes.add(n.asText().trim());
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        dto.setLearningOutcomes(outcomes);
        dto.setCertificateEligible(course.getCertificateEligible());

        String pos = course.getLevel();
        if (pos != null && pos.trim().toUpperCase().matches("L[0-4]")) {
            pos = "P" + pos.trim().toUpperCase().charAt(1);
        }
        dto.setLevel(pos);
        dto.setPosition(pos);
        dto.setDuration(sanitizeAndFormatDuration(course.getDuration(), course.getDurationHours()));
        dto.setDurationHours(course.getDurationHours());
        dto.setRating(course.getRating());
        dto.setEnrolledCount(course.getEnrolledCount());

        // Thumbnail Resolution
        String banner = course.getBanner();
        if ((banner == null || banner.isBlank()) && courseThumbnailRepository != null && course.getId() != null) {
            try {
                banner = courseThumbnailRepository.findTopByCourseIdOrderByCreatedAtDesc(course.getId())
                        .map(t -> "/api/courses/thumbnails/" + t.getStorageId())
                        .orElse(null);
            } catch (Exception ignored) {}
        }
        if ((banner == null || banner.isBlank()) && course.getDraftPayload() != null && !course.getDraftPayload().isBlank()) {
            try {
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(course.getDraftPayload());
                if (root.has("banner") && !root.get("banner").isNull() && !root.get("banner").asText().isBlank()) {
                    banner = root.get("banner").asText().trim();
                }
            } catch (Exception ignored) {}
        }
        dto.setBanner(banner);
        dto.setThumbnailUrl(banner);
        dto.setThumbnail(banner);

        dto.setDescription(course.getDescription());
        dto.setPassingScore(course.getPassingScore());
        dto.setFoundation(
                Boolean.TRUE.equals(course.getFoundation())
        );
        String normalizedAssignmentType;
        if (enrollment != null && enrollment.getEnrollmentType() != null) {
            normalizedAssignmentType = enrollment.getEnrollmentType() == EnrollmentType.MANDATORY
                    ? "Mandatory"
                    : (enrollment.getEnrollmentType() == EnrollmentType.RECOMMENDED ? "Recommended" : "Self-Selected");
        } else {
            normalizedAssignmentType = "MANDATORY".equalsIgnoreCase(assignmentType)
                    ? "Mandatory"
                    : ("RECOMMENDED".equalsIgnoreCase(assignmentType) ? "Recommended" : "Self-Selected");
        }
        dto.setAssignmentType(normalizedAssignmentType);

        if (enrollment != null) {

            dto.setEnrollmentType(
                    enrollment.getEnrollmentType() != null
                            ? enrollment.getEnrollmentType().name()
                            : null
            );

            dto.setEnrollmentStatus(
                    enrollment.getStatus() != null
                            ? enrollment.getStatus().name()
                            : null
            );

            Integer prog = enrollment.getProgressPercent();
            if (enrollment.getStatus() != com.fairmacs.lms.entity.EnrollmentStatus.COMPLETED && prog != null && prog >= 100) {
                prog = 98;
            }
            dto.setProgressPercent(prog);

            dto.setEnrollmentDbId(
                    enrollment.getId()
            );

            if (enrollment.getDueDate() != null) {
                dto.setDueDate(
                        enrollment.getDueDate().toString()
                );
            }

        } else {

            dto.setProgressPercent(0);
        }

        // Accurate Module and Lesson Counts
        int modCount = 0;
        int lesCount = 0;

        if (precalculatedModuleCount != null && precalculatedLessonCount != null) {
            modCount = precalculatedModuleCount;
            lesCount = precalculatedLessonCount;
        } else if (course.getId() != null && moduleRepository != null && lessonRepository != null) {
            try {
                modCount = (int) moduleRepository.countByCourseId(course.getId());
                lesCount = (int) lessonRepository.countByModuleCourseId(course.getId());
            } catch (Exception ignored) {}
        } else {
            // In-memory or detached fallback (e.g. newly created unpersisted course or unit tests without repo)
            try {
                if (course.getModules() != null && !course.getModules().isEmpty()) {
                    modCount = course.getModules().size();
                    for (Module m : course.getModules()) {
                        if (m != null && m.getLessons() != null) {
                            lesCount += m.getLessons().size();
                        }
                    }
                }
            } catch (Exception ignored) {}

            if (modCount == 0 && lesCount == 0 && course.getDraftPayload() != null && !course.getDraftPayload().isBlank()) {
                try {
                    com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(course.getDraftPayload());
                    if (root.has("modules") && root.get("modules").isArray()) {
                        modCount = root.get("modules").size();
                        for (com.fasterxml.jackson.databind.JsonNode modNode : root.get("modules")) {
                            if (modNode.has("lessons") && modNode.get("lessons").isArray()) {
                                lesCount += modNode.get("lessons").size();
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        dto.setModuleCount(modCount);
        dto.setLessonCount(lesCount);

        return dto;
    }

    private String sanitizeAndFormatDuration(String rawDuration, Double durationHours) {
        if (rawDuration != null && !rawDuration.isBlank()) {
            String trimmed = rawDuration.trim();
            String lower = trimmed.toLowerCase(java.util.Locale.ROOT);
            if (lower.equals("a") || lower.equals("null") || lower.equals("undefined") || lower.equals("nan") || lower.equals("-") || lower.equals("none") || lower.equals("self-paced") || lower.matches("^[a-z]$")) {
                return "Self-paced";
            }

            // Pure integer e.g. "1", "2", "3", "30", "90"
            if (trimmed.matches("^\\d+$")) {
                try {
                    int val = Integer.parseInt(trimmed);
                    if (val <= 0) return "Self-paced";
                    if (val <= 12) {
                        return val + (val == 1 ? " hour" : " hours");
                    } else {
                        int h = val / 60;
                        int rem = val % 60;
                        if (h > 0 && rem > 0) return h + (h == 1 ? " hour " : " hours ") + rem + " min";
                        if (h > 0) return h + (h == 1 ? " hour" : " hours");
                        return rem + " min";
                    }
                } catch (Exception ignored) {}
            }

            if (trimmed.contains(":")) {
                try {
                    String[] parts = trimmed.split(":");
                    if (parts.length == 2) {
                        int m = Integer.parseInt(parts[0].trim());
                        int s = Integer.parseInt(parts[1].trim());
                        int total = m + (s > 0 ? 1 : 0);
                        int h = total / 60;
                        int rem = total % 60;
                        if (h > 0 && rem > 0) return h + (h == 1 ? " hour " : " hours ") + rem + " min";
                        if (h > 0) return h + (h == 1 ? " hour" : " hours");
                        return total + " min";
                    }
                    if (parts.length == 3) {
                        int h = Integer.parseInt(parts[0].trim());
                        int m = Integer.parseInt(parts[1].trim());
                        int s = Integer.parseInt(parts[2].trim());
                        int rem = m + (s > 0 ? 1 : 0);
                        if (h > 0 && rem > 0) return h + (h == 1 ? " hour " : " hours ") + rem + " min";
                        if (h > 0) return h + (h == 1 ? " hour" : " hours");
                        return rem + " min";
                    }
                } catch (Exception ignored) {}
            }

            java.util.regex.Matcher decMatch = java.util.regex.Pattern.compile("^([0-9]+(?:\\.[0-9]+)?)\\s*(?:hours?|hrs?|h\\b)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(trimmed);
            if (decMatch.find()) {
                try {
                    double parsedH = Double.parseDouble(decMatch.group(1));
                    int totalMins = (int) Math.round(parsedH * 60);
                    int hrs = totalMins / 60;
                    int mins = totalMins % 60;
                    if (hrs > 0 && mins > 0) return hrs + (hrs == 1 ? " hour " : " hours ") + mins + " min";
                    if (hrs > 0) return hrs + (hrs == 1 ? " hour" : " hours");
                    if (mins > 0) return mins + " min";
                } catch (Exception ignored) {}
            }

            java.util.regex.Matcher minMatch = java.util.regex.Pattern.compile("^([0-9]+)\\s*(?:mins?|minutes?|m\\b)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(trimmed);
            if (minMatch.find()) {
                try {
                    int mins = Integer.parseInt(minMatch.group(1));
                    if (mins >= 60) {
                        int h = mins / 60;
                        int rem = mins % 60;
                        if (h > 0 && rem > 0) return h + (h == 1 ? " hour " : " hours ") + rem + " min";
                        if (h > 0) return h + (h == 1 ? " hour" : " hours");
                        return rem + " min";
                    }
                    return mins + " min";
                } catch (Exception ignored) {}
            }

            if (trimmed.matches(".*\\d+.*")) {
                return trimmed;
            }
        }

        if (durationHours != null && durationHours > 0) {
            int totalMins = (int) Math.round(durationHours * 60);
            int hrs = totalMins / 60;
            int mins = totalMins % 60;
            if (hrs > 0 && mins > 0) {
                return hrs + (hrs == 1 ? " hour " : " hours ") + mins + " min";
            } else if (hrs > 0) {
                return hrs + (hrs == 1 ? " hour" : " hours");
            } else if (mins > 0) {
                return mins + " min";
            }
        }

        return "Self-paced";
    }

    public CourseDTO toDetail(
            Course course,
            Enrollment enrollment,
            String assignmentType) {

        CourseDTO dto =
                toSummary(
                        course,
                        enrollment,
                        assignmentType
                );

        if (course.getModules() != null) {

            course.getModules()
                    .stream()
                    .sorted(
                            Comparator.comparing(
                                    m -> m.getOrderIndex() == null
                                            ? 0
                                            : m.getOrderIndex()
                            )
                    )
                    .forEach(
                            module ->
                                    dto.getModules()
                                            .add(toModule(module))
                    );
        }

        if (dto.getModules() != null && !dto.getModules().isEmpty()) {
            dto.setModuleCount(dto.getModules().size());
            int detailLessonCount = 0;
            for (CourseDTO.ModuleDTO m : dto.getModules()) {
                if (m.getLessons() != null) {
                    detailLessonCount += m.getLessons().size();
                }
            }
            dto.setLessonCount(detailLessonCount);
        }

        dto.setQuiz(
                parseQuiz(course)
        );

        return dto;
    }

    public CategoryDTO toCategory(
            Category category,
            int courseCount) {

        CategoryDTO dto = new CategoryDTO();

        dto.setId(category.getId());
        dto.setSlug(category.getSlug());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        dto.setIcon(category.getIcon());
        dto.setSortOrder(category.getSortOrder());
        dto.setFoundationTrack(
                category.getFoundationTrack()
        );
        dto.setCourseCount(courseCount);

        return dto;
    }

    private CourseDTO.ModuleDTO toModule(
            Module module) {

        CourseDTO.ModuleDTO dto =
                new CourseDTO.ModuleDTO();
        
        dto.setDbId(module.getId());

        dto.setId(
                module.getModuleId()
        );

        dto.setTitle(
                module.getTitle()
        );

        if (module.getLessons() != null) {

            module.getLessons()
                    .stream()
                    .sorted(
                            Comparator.comparing(
                                    l -> l.getOrderIndex() == null
                                            ? 0
                                            : l.getOrderIndex()
                            )
                    )
                    .forEach(
                            lesson ->
                                    dto.getLessons()
                                            .add(toLesson(lesson))
                    );
        }

        return dto;
    }

    private CourseDTO.LessonDTO toLesson(
            Lesson lesson) {

        CourseDTO.LessonDTO dto =
                new CourseDTO.LessonDTO();

        /*
         * Store the actual MySQL Lesson primary key.
         *
         * This is used by lesson-progress APIs.
         */
        dto.setDbId(
                lesson.getId()
        );

        /*
         * Keep the existing lesson/business ID
         * for frontend display and navigation.
         */
        dto.setId(
                lesson.getLessonId()
        );

        dto.setTitle(
                lesson.getTitle()
        );

        dto.setType(
                lesson.getType()
        );

        dto.setDuration(
                lesson.getDuration()
        );

        dto.setSummary(
                lesson.getSummary()
        );

        dto.setAssetUrl(
                lesson.getContentUrl()
        );

        dto.setWorkdriveFileId(
                lesson.getWorkdriveFileId()
        );

        return dto;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseQuiz(Course course) {
        List<Quiz> finalQuizzes =
                quizRepository.findByCourseIdAndType(
                        course.getId(),
                        QuizType.FINAL
                );

        if (finalQuizzes == null || finalQuizzes.isEmpty()) {
            return null;
        }

        Quiz quiz = finalQuizzes.get(0);
        Map<String, Object> quizData = new java.util.HashMap<>();

        quizData.put("id", quiz.getId());
        quizData.put("quizId", quiz.getQuizId());
        quizData.put("type", quiz.getType().name());
        quizData.put("title", quiz.getTitle());

        if (quiz.getPassingScore() != null) {
            quizData.put("passingScore", quiz.getPassingScore());
        }

        if (quiz.getTimeLimitMinutes() != null) {
            quizData.put("timeLimitMinutes", quiz.getTimeLimitMinutes());
        }

        return quizData;
    }
}