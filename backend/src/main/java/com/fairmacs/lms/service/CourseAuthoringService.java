package com.fairmacs.lms.service;



import com.fairmacs.lms.dto.CourseAuthoringRequest;

import com.fairmacs.lms.entity.Category;

import com.fairmacs.lms.entity.Course;

import com.fairmacs.lms.entity.Department;

import com.fairmacs.lms.entity.Lesson;

import com.fairmacs.lms.entity.Module;

import com.fairmacs.lms.entity.Quiz;

import com.fairmacs.lms.entity.QuizQuestion;

import com.fairmacs.lms.entity.QuizType;

import com.fairmacs.lms.entity.Role;

import com.fairmacs.lms.repository.CategoryRepository;

import com.fairmacs.lms.repository.CourseRepository;

import com.fairmacs.lms.repository.DepartmentRepository;

import com.fairmacs.lms.repository.LessonRepository;

import com.fairmacs.lms.repository.ModuleRepository;

import com.fairmacs.lms.repository.QuizQuestionRepository;

import com.fairmacs.lms.repository.QuizRepository;

import com.fairmacs.lms.repository.EnrollmentRepository;

import com.fairmacs.lms.repository.QuizAttemptRepository;

import com.fairmacs.lms.security.SecurityContextUtil;

import com.fairmacs.lms.entity.User;

import com.fasterxml.jackson.core.JsonProcessingException;

import com.fasterxml.jackson.databind.ObjectMapper;



import org.springframework.security.access.AccessDeniedException;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;



import java.time.LocalDate;

import java.util.ArrayList;

import java.util.HashSet;

import java.util.List;

import java.util.Locale;

import java.util.Set;

import java.util.UUID;

import java.util.stream.Collectors;



@Service

public class CourseAuthoringService {



    private final DepartmentRepository departmentRepository;

    private final EnrollmentService enrollmentService;

    private final CategoryRepository categoryRepository;

    private final CourseRepository courseRepository;

    private final ModuleRepository moduleRepository;

    private final LessonRepository lessonRepository;

    private final QuizRepository quizRepository;

    private final QuizQuestionRepository questionRepository;

    private final EnrollmentRepository enrollmentRepository;

    private final QuizAttemptRepository quizAttemptRepository;

    private final SecurityContextUtil securityContextUtil;

    private final ObjectMapper objectMapper;



    public CourseAuthoringService(

            CategoryRepository categoryRepository,

            CourseRepository courseRepository,

            ModuleRepository moduleRepository,

            LessonRepository lessonRepository,

            QuizRepository quizRepository,

            QuizQuestionRepository questionRepository,

            SecurityContextUtil securityContextUtil,

            DepartmentRepository departmentRepository,

            EnrollmentRepository enrollmentRepository,

            QuizAttemptRepository quizAttemptRepository,

            EnrollmentService enrollmentService,

            ObjectMapper objectMapper) {



        this.categoryRepository = categoryRepository;

        this.courseRepository = courseRepository;

        this.moduleRepository = moduleRepository;

        this.lessonRepository = lessonRepository;

        this.quizRepository = quizRepository;

        this.questionRepository = questionRepository;

        this.securityContextUtil = securityContextUtil;

        this.departmentRepository = departmentRepository;

        this.enrollmentRepository = enrollmentRepository;

        this.quizAttemptRepository = quizAttemptRepository;

        this.enrollmentService = enrollmentService;

        this.objectMapper = objectMapper;

    }


    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getCourseForEditing(String courseId) {
        requireAuthoringPermission();

        if (courseId == null || courseId.isBlank()) {
            throw new IllegalArgumentException("Course ID is required.");
        }

        Course course = courseRepository.findAll()
                .stream()
                .filter(c ->
                        courseId.equals(c.getCourseId())
                        || (c.getId() != null
                            && courseId.equals(String.valueOf(c.getId())))
                )
                .findFirst()
                .orElseThrow(() ->
                        new IllegalArgumentException("Course not found."));

        java.util.Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("id", course.getId());
        response.put("courseId", course.getCourseId());
        response.put("title", course.getTitle());
        response.put("level", course.getLevel());
        response.put("duration", course.getDuration());
        response.put("durationHours", course.getDurationHours());
        response.put("banner", course.getBanner());
        response.put("description", course.getDescription());
        response.put("foundation", course.getFoundation());
        response.put("draft", course.getDraft());
        response.put("active", course.getActive());

        return response;
    }




    @Transactional

    public String createCourse(CourseAuthoringRequest request) {



        requireAuthoringPermission();

        validateRequest(request);



        String courseId = request.getCourseId();



        if (courseId == null || courseId.isBlank()) {

            courseId = "C-" + UUID.randomUUID()

                    .toString()

                    .substring(0, 8)

                    .toUpperCase(Locale.ROOT);

        }



        if (courseRepository.existsByCourseId(courseId)) {

            throw new IllegalArgumentException(

                    "A course with ID " + courseId + " already exists.");

        }



        // Category is optional. Keep the legacy non-null category column populated
        // for compatibility with existing database records and queries.
        Category category = null;
        String categorySlug = request.getCategorySlug();

        if (categorySlug != null && !categorySlug.isBlank()) {
            category = categoryRepository.findBySlug(categorySlug.trim())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown category slug: " + categorySlug.trim()));
        }

        Course course = new Course();
        User currentUser = securityContextUtil.getCurrentUser();

        if (currentUser == null || currentUser.getId() == null) {
            throw new org.springframework.security.access.AccessDeniedException(
                "An authenticated user is required to create a course."
            );
        }

        course.setCreatedBy(currentUser);
        course.setDraft(!Boolean.TRUE.equals(request.getPublish()));
        course.setCourseId(courseId);
        course.setTitle(request.getTitle().trim());
        course.setCategory(category == null ? "Uncategorized" : category.getName());
        course.setCatalogCategory(category);

        course.setLevel(request.getLevel());

        course.setDuration(request.getDuration());

        course.setDurationHours(

                request.getDurationHours() == null

                        ? 1.0

                        : request.getDurationHours().doubleValue());

        course.setBanner(request.getBanner());

        course.setDescription(request.getDescription());

        course.setPassingScore(

                request.getPassingScore() == null

                        ? 70

                        : request.getPassingScore());

        course.setFoundation(Boolean.TRUE.equals(request.getFoundation()));

        course.setRating(0.0);

        course.setEnrolledCount(0);



        // Draft courses remain inactive and are not assigned.

        course.setActive(Boolean.TRUE.equals(request.getPublish()));

        if (!Boolean.TRUE.equals(request.getPublish())) {
            try {
                course.setDraftPayload(objectMapper.writeValueAsString(request));
            } catch (JsonProcessingException e) {
                throw new IllegalArgumentException(
                        "Failed to save course draft data.", e);
            }
        } else {
            course.setDraftPayload(null);
        }

        course = courseRepository.saveAndFlush(course);



        List<CourseAuthoringRequest.ModuleInput> moduleInputs =

                request.getModules() == null

                        ? List.of()

                        : request.getModules();



        for (int i = 0; i < moduleInputs.size(); i++) {

            saveModule(course, moduleInputs.get(i), i + 1);

        }



        if (request.getFinalQuiz() != null) {

            saveQuiz(

                    course,

                    null,

                    request.getFinalQuiz(),

                    QuizType.FINAL,

                    "FINAL");

        } else if (Boolean.TRUE.equals(request.getPublish())) {

            throw new IllegalArgumentException(

                    "A final quiz is required before publishing a course.");

        }



        // Assignments and notifications are created only for published courses.

        if (Boolean.TRUE.equals(request.getPublish())) {

            assignPublishedCourse(course, request);

        }



        return courseId;

    }

    @Transactional
    public String updateDraft(String courseId, CourseAuthoringRequest request) {

        requireAuthoringPermission();
        validateRequest(request);

        User currentUser = securityContextUtil.getCurrentUser();

        if (currentUser == null || currentUser.getId() == null) {
            throw new AccessDeniedException("Authentication is required.");
        }

        if (request.getCourseId() != null
                && !request.getCourseId().isBlank()
                && !courseId.equals(request.getCourseId())) {
            throw new IllegalArgumentException("Course ID cannot be changed.");
        }

        Course course = courseRepository
                .findOwnedDraft(courseId, currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Draft not found or you do not own this draft."));

        // Never modify a course that has learning history.
        if (enrollmentRepository.existsByCourse_Id(course.getId())) {
            throw new IllegalStateException(
                    "This draft has enrollment records and cannot be replaced.");
        }

        List<Quiz> existingQuizzes =
                quizRepository.findByCourseId(course.getId());

        for (Quiz quiz : existingQuizzes) {
            if (quizAttemptRepository.existsByQuizId(quiz.getId())) {
                throw new IllegalStateException(
                        "This draft has quiz attempts and cannot be replaced.");
            }
        }

        Category category = null;
        String categorySlug = request.getCategorySlug();

        if (categorySlug != null && !categorySlug.isBlank()) {
            category = categoryRepository.findBySlug(categorySlug.trim())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown category slug: " + categorySlug.trim()));
        }

        boolean publish = Boolean.TRUE.equals(request.getPublish());

        course.setTitle(request.getTitle().trim());
        course.setCategory(category == null ? "Uncategorized" : category.getName());
        course.setCatalogCategory(category);
        course.setLevel(request.getLevel());
        course.setDuration(request.getDuration());
        course.setDurationHours(request.getDurationHours() == null
                ? 1.0 : request.getDurationHours().doubleValue());
        course.setBanner(request.getBanner());
        course.setDescription(request.getDescription());
        course.setPassingScore(request.getPassingScore() == null
                ? 70 : request.getPassingScore());
        course.setFoundation(Boolean.TRUE.equals(request.getFoundation()));

        course.setDraft(!publish);
        course.setActive(publish);

        if (publish) {
            course.setDraftPayload(null);
        } else {
            try {
                course.setDraftPayload(objectMapper.writeValueAsString(request));
            } catch (JsonProcessingException e) {
                throw new IllegalArgumentException(
                        "Failed to save course draft data.", e);
            }
        }

        courseRepository.saveAndFlush(course);

        // Delete old quizzes first; quiz questions use cascade deletion.
        quizRepository.deleteAll(existingQuizzes);
        quizRepository.flush();

        // Module -> Lesson uses CascadeType.ALL.
        List<Module> existingModules =
                moduleRepository.findByCourseIdOrderByOrderIndexAsc(course.getId());

        moduleRepository.deleteAll(existingModules);
        moduleRepository.flush();

        List<CourseAuthoringRequest.ModuleInput> moduleInputs =
                request.getModules() == null ? List.of() : request.getModules();

        for (int i = 0; i < moduleInputs.size(); i++) {
            saveModule(course, moduleInputs.get(i), i + 1);
        }

        if (request.getFinalQuiz() != null) {
            saveQuiz(
                    course,
                    null,
                    request.getFinalQuiz(),
                    QuizType.FINAL,
                    "FINAL");
        } else if (publish) {
            throw new IllegalArgumentException(
                    "A final quiz is required before publishing a course.");
        }

        if (publish) {
            assignPublishedCourse(course, request);
        }

        return courseId;
    }



    private void assignPublishedCourse(

            Course course,

            CourseAuthoringRequest request) {



        List<String> targetDepartments =

            request.getTargetDepartments();



        List<Long> targetEmployeeIds =

            request.getTargetEmployeeIds();



        boolean hasMandatoryDepartments =

            targetDepartments != null

                    && targetDepartments.stream()

                    .anyMatch(name ->

                            name != null && !name.isBlank());



        boolean hasRecommendedEmployees =

            targetEmployeeIds != null

                    && targetEmployeeIds.stream()

                    .anyMatch(id -> id != null);



        if (!hasMandatoryDepartments && !hasRecommendedEmployees) {

            throw new IllegalArgumentException(

                "Select at least one mandatory department "

                + "or recommended employee before publishing."

            );

        }



    // Assign mandatory training first.

    // This ensures mandatory enrollment wins when the same

    // employee is also selected for recommended training.

        if (hasMandatoryDepartments) {

            assignMandatoryCourse(course, request);

        }



    // Recommended training can be assigned at the same time.

    // Existing enrollments are skipped by EnrollmentService,

    // preserving mandatory enrollment for overlapping employees.

        if (hasRecommendedEmployees) {

            assignRecommendedCourse(course, request);

        }

    }





    private void assignMandatoryCourse(

            Course course,

            CourseAuthoringRequest request) {



        Set<String> selectedDepartments =

                request.getTargetDepartments() == null

                        ? new HashSet<>()

                        : request.getTargetDepartments().stream()

                                .filter(name -> name != null && !name.isBlank())

                                .map(name -> name.trim().toLowerCase(Locale.ROOT))

                                .collect(Collectors.toSet());



        if (selectedDepartments.isEmpty()) {

            throw new IllegalArgumentException(

                    "Select at least one department for mandatory training.");

        }



        List<Department> departments = departmentRepository.findAll();



        Set<String> validDepartments = departments.stream()

                .map(department ->

                        department.getName().trim().toLowerCase(Locale.ROOT))

                .collect(Collectors.toSet());



        if (!validDepartments.containsAll(selectedDepartments)) {

            throw new IllegalArgumentException(

                    "One or more selected departments are invalid.");

        }



        // Only selected departments receive mandatory training.

        // EnrollmentService handles descendants and prevents duplicate enrollments.

        for (Department department : departments) {

            String normalizedName =

                    department.getName().trim().toLowerCase(Locale.ROOT);



            if (selectedDepartments.contains(normalizedName)) {

                enrollmentService.assignCourseToDepartment(

                        department.getName(),

                        course.getId(),

                        course.getCourseId(),

                        request.getDueDate(),

                        "MANDATORY",
                        
                        course.getLevel());

            }

        }

    }



    private void assignRecommendedCourse(

            Course course,

            CourseAuthoringRequest request) {



        List<Long> targetEmployeeIds = request.getTargetEmployeeIds();



        if (targetEmployeeIds == null || targetEmployeeIds.isEmpty()) {

            throw new IllegalArgumentException(

                    "Select at least one employee for recommended training.");

        }



        // Recommended training is assigned only to the employees selected by HR

        // or the trainer. No department-wide assignments are created here.

        enrollmentService.assignCourseToEmployees(

                targetEmployeeIds,

                course.getId(),

                course.getCourseId(),

                request.getDueDate());

    }



    private void saveModule(

            Course course,

            CourseAuthoringRequest.ModuleInput input,

            int position) {



        if (input.getTitle() == null || input.getTitle().isBlank()) {

            throw new IllegalArgumentException(

                    "Every module must have a title.");

        }



        Module module = new Module();

        module.setModuleId(

                uniqueId("MOD", course.getCourseId(), position));

        module.setTitle(input.getTitle().trim());

        module.setOrderIndex(

                input.getOrderIndex() == null

                        ? position

                        : input.getOrderIndex());

        module.setCourse(course);



        module = moduleRepository.saveAndFlush(module);



        List<CourseAuthoringRequest.LessonInput> lessons =

                input.getLessons() == null

                        ? List.of()

                        : input.getLessons();



        for (int i = 0; i < lessons.size(); i++) {

            saveLesson(module, lessons.get(i), i + 1);

        }



        if (input.getQuiz() != null) {

            saveQuiz(

                    course,

                    module,

                    input.getQuiz(),

                    QuizType.MODULE,

                    "MOD" + position);

        }

    }



    private void saveLesson(

            Module module,

            CourseAuthoringRequest.LessonInput input,

            int position) {



        if (input.getTitle() == null || input.getTitle().isBlank()) {

            throw new IllegalArgumentException(

                    "Every lesson must have a title.");

        }



        Lesson lesson = new Lesson();

        lesson.setLessonId(

                uniqueId("LES", module.getModuleId(), position));

        lesson.setTitle(input.getTitle().trim());

        lesson.setType(

                input.getType() == null || input.getType().isBlank()

                        ? "VIDEO"

                        : input.getType().trim().toUpperCase(Locale.ROOT));

        lesson.setContentUrl(input.getContentUrl());

        lesson.setDuration(input.getDuration());

        lesson.setOrderIndex(

                input.getOrderIndex() == null

                        ? position

                        : input.getOrderIndex());

        lesson.setModule(module);

        lesson.setWorkdriveFileId(input.getWorkdriveFileId());

        lessonRepository.save(lesson);

    }



    private void saveQuiz(

            Course course,

            Module module,

            CourseAuthoringRequest.QuizInput input,

            QuizType type,

            String suffix) {



        List<CourseAuthoringRequest.QuestionInput> questions =

                input.getQuestions() == null

                        ? List.of()

                        : input.getQuestions();



        if (questions.isEmpty()) {

            throw new IllegalArgumentException(

                    "The " + suffix + " quiz must contain at least one question.");

        }



        Quiz quiz = new Quiz();

        quiz.setQuizId(uniqueId("QUIZ", course.getCourseId(), suffix));

        quiz.setTitle(

                input.getTitle() == null || input.getTitle().isBlank()

                        ? course.getTitle() + " Assessment"

                        : input.getTitle().trim());

        quiz.setType(type);

        quiz.setCourse(course);

        quiz.setModule(module);

        quiz.setPassingScore(

                input.getPassingScore() == null

                        ? 70

                        : input.getPassingScore());

        quiz.setTimeLimitMinutes(input.getTimeLimitMinutes());

        quiz.setMaxAttempts(

                input.getMaxAttempts() == null

                        ? 3

                        : input.getMaxAttempts());

        quiz.setQuestionsPerAttempt(

                input.getQuestionsPerAttempt() == null

                        ? questions.size()

                        : Math.max(

                                1,

                                Math.min(

                                        input.getQuestionsPerAttempt(),

                                        questions.size())));

        quiz.setRandomizeQuestions(

                input.getRandomizeQuestions() == null

                        || input.getRandomizeQuestions());

        quiz.setRandomizeOptions(

                input.getRandomizeOptions() == null

                        || input.getRandomizeOptions());

        quiz.setActive(true);



        quiz = quizRepository.saveAndFlush(quiz);



        List<QuizQuestion> savedQuestions = new ArrayList<>();



        for (int i = 0; i < questions.size(); i++) {

            CourseAuthoringRequest.QuestionInput inputQuestion =

                    questions.get(i);



            if (inputQuestion.getQuestionText() == null

                    || inputQuestion.getQuestionText().isBlank()) {

                throw new IllegalArgumentException(

                        "Every quiz question must contain question text.");

            }



            if (inputQuestion.getCorrectAnswer() == null

                    || inputQuestion.getCorrectAnswer().isBlank()) {

                throw new IllegalArgumentException(

                        "Every quiz question must have a correct answer.");

            }



            QuizQuestion question = new QuizQuestion();

            question.setQuestionId(

                    uniqueId("Q", quiz.getQuizId(), i + 1));

            question.setQuestionText(

                    inputQuestion.getQuestionText().trim());

            question.setQuestionType(

                    inputQuestion.getQuestionType() == null

                            ? "SINGLE_CHOICE"

                            : inputQuestion.getQuestionType());

            question.setOptionA(inputQuestion.getOptionA());

            question.setOptionB(inputQuestion.getOptionB());

            question.setOptionC(inputQuestion.getOptionC());

            question.setOptionD(inputQuestion.getOptionD());

            question.setCorrectAnswer(

                    inputQuestion.getCorrectAnswer().trim());

            question.setExplanation(inputQuestion.getExplanation());

            question.setOrderIndex(

                    inputQuestion.getOrderIndex() == null

                            ? i + 1

                            : inputQuestion.getOrderIndex());

            question.setQuiz(quiz);



            savedQuestions.add(question);

        }



        questionRepository.saveAll(savedQuestions);

    }



    private void validateRequest(CourseAuthoringRequest request) {



        if (request == null) {

            throw new IllegalArgumentException(

                    "Course request cannot be empty.");

        }



        if (request.getTitle() == null || request.getTitle().isBlank()) {

            throw new IllegalArgumentException(

                    "Course title is required.");

        }



        Integer passingScore = request.getPassingScore();



        if (passingScore != null

                && (passingScore < 0 || passingScore > 100)) {

            throw new IllegalArgumentException(

                    "Passing score must be between 0 and 100.");

        }



        if (Boolean.TRUE.equals(request.getPublish())

                && (request.getModules() == null

                || request.getModules().isEmpty())) {

            throw new IllegalArgumentException(

                    "Add at least one module before publishing.");

        }



        if (Boolean.TRUE.equals(request.getPublish())

                && request.getDueDate() != null

                && request.getDueDate().isBefore(LocalDate.now())) {

            throw new IllegalArgumentException(

                    "The course due date cannot be in the past.");

        }

    }



    private void requireAuthoringPermission() {



        String role = securityContextUtil.getCurrentUserRole();



        if (!Role.HR_ADMIN.name().equalsIgnoreCase(role)

                && !Role.TRAINER.name().equalsIgnoreCase(role)) {

            throw new AccessDeniedException(

                    "Only authorized Trainers or HR Admins can create courses.");

        }

    }



    private String uniqueId(

            String prefix,

            String parentId,

            int position) {



        return uniqueId(prefix, parentId, String.valueOf(position));

    }



    private String uniqueId(

            String prefix,

            String parentId,

            String suffix) {



        String normalizedParent = parentId == null

                ? "NEW"

                : parentId.replaceAll("[^A-Za-z0-9-]", "-");



        return (prefix + "-" + normalizedParent + "-" + suffix + "-"

                + UUID.randomUUID().toString().substring(0, 6))

                .toUpperCase(Locale.ROOT);

    }

}