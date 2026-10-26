package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CategoryDTO;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.entity.Category;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.Lesson;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizType;
import com.fairmacs.lms.repository.QuizRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Component
public class CourseMapper {

    private final ObjectMapper objectMapper;
    private final QuizRepository quizRepository;

    public CourseMapper(
        ObjectMapper objectMapper,
        QuizRepository quizRepository) {

    this.objectMapper = objectMapper;
    this.quizRepository = quizRepository;
}

    public CourseDTO toSummary(
            Course course,
            Enrollment enrollment,
            String assignmentType) {

        CourseDTO dto = new CourseDTO();

        dto.setDbId(course.getId());
        dto.setId(course.getCourseId());
        dto.setTitle(course.getTitle());
        dto.setCategory(course.getCategory());

        if (course.getCatalogCategory() != null) {
            dto.setCategorySlug(
                    course.getCatalogCategory().getSlug()
            );

            dto.setCategory(
                    course.getCatalogCategory().getName()
            );
        }

        dto.setLevel(course.getLevel());
        dto.setDuration(course.getDuration());
        dto.setDurationHours(course.getDurationHours());
        dto.setRating(course.getRating());
        dto.setEnrolledCount(course.getEnrolledCount());
        dto.setBanner(course.getBanner());
        dto.setDescription(course.getDescription());
        dto.setPassingScore(course.getPassingScore());
        dto.setFoundation(
                Boolean.TRUE.equals(course.getFoundation())
        );
        dto.setAssignmentType(assignmentType);

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

            dto.setProgressPercent(
                    enrollment.getProgressPercent()
            );

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

        return dto;
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