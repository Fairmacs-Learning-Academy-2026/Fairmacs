package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizAttempt;
import com.fairmacs.lms.entity.QuizProgress;
import com.fairmacs.lms.entity.QuizQuestion;
import com.fairmacs.lms.entity.QuizType;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.ModuleRepository;
import com.fairmacs.lms.repository.QuizAttemptRepository;
import com.fairmacs.lms.repository.QuizProgressRepository;
import com.fairmacs.lms.repository.QuizQuestionRepository;
import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.time.Duration;
import java.util.Optional;

@Service
@Transactional
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizProgressRepository quizProgressRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final ModuleRepository moduleRepository;
    private final ObjectMapper objectMapper;
    private final EnrollmentService enrollmentService;
    private final SecurityContextUtil securityContextUtil;

    public QuizService(
            QuizRepository quizRepository,
            QuizQuestionRepository quizQuestionRepository,
            QuizAttemptRepository quizAttemptRepository,
            QuizProgressRepository quizProgressRepository,
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository,
            LessonProgressRepository lessonProgressRepository,
            ModuleRepository moduleRepository,
            ObjectMapper objectMapper,
            EnrollmentService enrollmentService,
            SecurityContextUtil securityContextUtil
    ) {
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizProgressRepository = quizProgressRepository;
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.moduleRepository = moduleRepository;
        this.objectMapper = objectMapper;
        this.enrollmentService = enrollmentService;
        this.securityContextUtil = securityContextUtil;
    }

    /**
     * Starts a new quiz attempt.
     *
     * Module quiz rules:
     * 1. Employee must be enrolled.
     * 2. All lessons in current module must be completed.
     * 3. Previous module quizzes must be passed.
     *
     * Final quiz rules:
     * 1. All module quizzes in the course must be passed.
     */

    private static final long FAILED_ATTEMPT_COOLDOWN_HOURS = 12;

    private Map<String, Object> getCooldownStatus(Long quizId, Long userId) {
        Map<String, Object> result = new LinkedHashMap<>();

    Optional<QuizAttempt> latestAttempt =
            quizAttemptRepository
                    .findTopByQuiz_IdAndUser_IdAndCompletedAtIsNotNullOrderByCompletedAtDesc(
                            quizId, userId
                    );

    LocalDateTime now = LocalDateTime.now();

    if (latestAttempt.isPresent()) {
        QuizAttempt attempt = latestAttempt.get();

        if (Boolean.FALSE.equals(attempt.getPassed())
                && attempt.getCompletedAt() != null) {

            LocalDateTime unlockAt =
                    attempt.getCompletedAt()
                            .plusHours(FAILED_ATTEMPT_COOLDOWN_HOURS);

            if (now.isBefore(unlockAt)) {
                long remainingSeconds =
                        Duration.between(now, unlockAt).getSeconds();

                result.put("cooldownActive", true);
                result.put("retryAvailableAt", unlockAt.toString());
                result.put("remainingSeconds", remainingSeconds);
                result.put(
                        "message",
                        "You failed this assessment. You can retry after 12 hours."
                );
                return result;
            }
        }
    }

    result.put("cooldownActive", false);
    result.put("remainingSeconds", 0);
    result.put("retryAvailableAt", null);

    return result;
}

    private void enforceFailedAttemptCooldown(Long quizId, Long userId) {
        Map<String, Object> status = getCooldownStatus(quizId, userId);

    if (Boolean.TRUE.equals(status.get("cooldownActive"))) {
        throw new IllegalStateException(
                String.valueOf(status.get("message"))
                        + " Retry available at "
                        + status.get("retryAvailableAt")
                        + "."
        );
    }
}
    public Map<String, Object> startQuiz(
            Long quizId
    ) {

        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new AccessDeniedException("Unable to identify the authenticated employee.");
        }

        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Quiz not found.")
                );

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found.")
                );

        enforceFailedAttemptCooldown(quizId, userId);

        if (!Boolean.TRUE.equals(quiz.getActive())) {
            throw new IllegalStateException(
                    "This quiz is currently inactive."
            );
        }

        /*
         * ---------------------------------------------------------
         * MODULE QUIZ UNLOCK CHECK
         * ---------------------------------------------------------
         */
        if (quiz.getType() == QuizType.MODULE) {

            if (quiz.getModule() == null) {
                throw new IllegalStateException(
                        "This module quiz is not linked to a module."
                );
            }

            Enrollment enrollment =
                    enrollmentRepository
                            .findByUserIdAndCourseId(
                                    userId,
                                    quiz.getCourse().getId()
                            )
                            .orElseThrow(() ->
                                    new IllegalStateException(
                                            "You are not enrolled in this course."
                                    )
                            );

            Module currentModule = quiz.getModule();

            /*
             * Rule 1:
             * All lessons in current module must be completed.
             */
            boolean allLessonsCompleted =
                    lessonProgressRepository.areAllLessonsCompleted(
                            enrollment.getId(),
                            currentModule.getId()
                    );

            if (!allLessonsCompleted) {
                throw new IllegalStateException(
                        "Complete all lessons in this module before attempting the quiz."
                );
            }

            /*
             * Rule 2:
             * All previous module quizzes must be passed.
             */
            List<Module> modules =
                    moduleRepository.findByCourseIdOrderByOrderIndexAsc(
                            quiz.getCourse().getId()
                    );

            for (Module module : modules) {

                if (module.getId().equals(currentModule.getId())) {
                    break;
                }

                Quiz previousModuleQuiz =
                        quizRepository.findByModuleId(module.getId())
                                .orElseThrow(() ->
                                        new IllegalStateException(
                                                "Module quiz is not configured for module: "
                                                        + module.getTitle()
                                        )
                                );

                boolean previousQuizPassed =
                        quizProgressRepository
                                .existsByQuiz_IdAndUser_IdAndPassedTrue(
                                        previousModuleQuiz.getId(),
                                        userId
                                );

                if (!previousQuizPassed) {
                    throw new IllegalStateException(
                            "Pass the previous module quiz before proceeding to this module."
                    );
                }
            }
        }

        /*
         * ---------------------------------------------------------
         * FINAL QUIZ UNLOCK CHECK
         * ---------------------------------------------------------
         */
        if (quiz.getType() == QuizType.FINAL) {

            enrollmentRepository
                    .findByUserIdAndCourseId(
                            userId,
                            quiz.getCourse().getId()
                    )
                    .orElseThrow(() ->
                            new IllegalStateException(
                                    "You are not enrolled in this course."
                            )
                    );

            List<Quiz> moduleQuizzes =
                    quizRepository.findByCourseIdAndType(
                            quiz.getCourse().getId(),
                            QuizType.MODULE
                    );

            int totalModuleQuizzes = moduleQuizzes.size();
            int passedModuleQuizzes = 0;

            for (Quiz moduleQuiz : moduleQuizzes) {

                boolean passed =
                        quizProgressRepository
                                .existsByQuiz_IdAndUser_IdAndPassedTrue(
                                        moduleQuiz.getId(),
                                        userId
                                );

                if (passed) {
                    passedModuleQuizzes++;
                }
            }

            boolean allModuleQuizzesPassed =
                    totalModuleQuizzes > 0
                            && passedModuleQuizzes == totalModuleQuizzes;

            if (!allModuleQuizzesPassed) {
                throw new IllegalStateException(
                        "Pass all module quizzes before attempting the final quiz."
                );
            }
        }

        /*
         * ---------------------------------------------------------
         * EXISTING QUIZ ATTEMPT LOGIC
         * ---------------------------------------------------------
         */

        QuizProgress progress =
                quizProgressRepository
                        .findByQuiz_IdAndUser_Id(
                                quizId,
                                userId
                        )
                        .orElse(null);

        int attemptsUsed =
                progress == null || progress.getAttemptsUsed() == null
                        ? 0
                        : progress.getAttemptsUsed();

        int maxAttempts =
                quiz.getMaxAttempts() == null
                        ? 3
                        : quiz.getMaxAttempts();

        if (progress != null &&
                Boolean.TRUE.equals(progress.getPassed())) {

            throw new IllegalStateException(
                    "You have already passed this quiz."
            );
        }

        if (attemptsUsed >= maxAttempts) {
            throw new IllegalStateException(
                    "Maximum quiz attempts reached."
            );
        }

        /*
         * ---------------------------------------------------------
         * LOAD QUESTION BANK
         * ---------------------------------------------------------
         */

        List<QuizQuestion> questionBank =
                quizQuestionRepository.findByQuiz_Id(quizId);

        if (questionBank.isEmpty()) {
            throw new IllegalStateException(
                    "This quiz does not contain any questions."
            );
        }

        int questionsPerAttempt =
                quiz.getQuestionsPerAttempt() == null
                        ? 10
                        : quiz.getQuestionsPerAttempt();

        if (questionsPerAttempt <= 0) {
            throw new IllegalStateException(
                    "Questions per attempt must be greater than zero."
            );
        }

        if (questionBank.size() < questionsPerAttempt) {
            throw new IllegalStateException(
                    "The question bank contains only "
                            + questionBank.size()
                            + " questions, but "
                            + questionsPerAttempt
                            + " questions are required per attempt."
            );
        }

        /*
         * ---------------------------------------------------------
         * RANDOMIZE QUESTIONS
         * ---------------------------------------------------------
         */

        List<QuizQuestion> shuffledQuestions =
                new ArrayList<>(questionBank);

        if (Boolean.TRUE.equals(
                quiz.getRandomizeQuestions()
        )) {
            Collections.shuffle(shuffledQuestions);
        }

        List<QuizQuestion> selectedQuestions =
                new ArrayList<>(
                        shuffledQuestions.subList(
                                0,
                                questionsPerAttempt
                        )
                );

        Collections.shuffle(selectedQuestions);

        /*
         * ---------------------------------------------------------
         * STORE QUESTION IDS
         * ---------------------------------------------------------
         */

        List<Long> questionIds =
                selectedQuestions.stream()
                        .map(QuizQuestion::getId)
                        .collect(Collectors.toList());

        /*
         * ---------------------------------------------------------
         * RANDOMIZE OPTIONS
         * ---------------------------------------------------------
         */

        Map<String, List<String>> optionOrder =
                new LinkedHashMap<>();

        for (QuizQuestion question : selectedQuestions) {

            List<String> options =
                    new ArrayList<>(
                            List.of("A", "B", "C", "D")
                    );

            if (Boolean.TRUE.equals(
                    quiz.getRandomizeOptions()
            )) {
                Collections.shuffle(options);
            }

            optionOrder.put(
                    String.valueOf(question.getId()),
                    options
            );
        }

        /*
         * CREATE / LOAD QUIZ PROGRESS BEFORE CREATING THE ATTEMPT.
         * This ensures a new attempt is not saved without its progress row.
         */
        if (progress == null) {
    progress = quizProgressRepository
            .findByQuiz_IdAndUser_Id(quiz.getId(), user.getId())
            .orElseGet(() -> {
                QuizProgress newProgress = new QuizProgress();
                newProgress.setQuiz(quiz);
                newProgress.setUser(user);
                newProgress.setAttemptsUsed(0);
                newProgress.setBestScore(0);
                newProgress.setPassed(false);
                return newProgress;
            });

    progress = quizProgressRepository.saveAndFlush(progress);
}

        // Read the latest count from the persisted progress row.
        attemptsUsed = progress.getAttemptsUsed() == null
                ? 0
                : progress.getAttemptsUsed();

        if (Boolean.TRUE.equals(progress.getPassed())) {
            throw new IllegalStateException("You have already passed this quiz.");
        }

        if (attemptsUsed >= maxAttempts) {
            throw new IllegalStateException("Maximum quiz attempts reached.");
        }

        int attemptNumber = attemptsUsed + 1;

        /* CREATE ATTEMPT */
        QuizAttempt attempt = new QuizAttempt();
        attempt.setAttemptId("ATT-" + UUID.randomUUID());
        attempt.setQuiz(quiz);
        attempt.setUser(user);
        attempt.setAttemptNumber(attemptNumber);
        attempt.setTotalQuestions(selectedQuestions.size());
        attempt.setCorrectAnswers(0);
        attempt.setWrongAnswers(0);
        attempt.setScore(0);
        attempt.setPassed(false);

        try {
            attempt.setQuestionIds(objectMapper.writeValueAsString(questionIds));
            attempt.setOptionOrderJson(objectMapper.writeValueAsString(optionOrder));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to prepare quiz attempt data.", e);
        }

        QuizAttempt savedAttempt = quizAttemptRepository.save(attempt);

        // Increment progress only after the attempt has been created successfully.
        progress.setAttemptsUsed(attemptNumber);
        quizProgressRepository.save(progress);

        /*
         * ---------------------------------------------------------
         * BUILD SAFE QUESTION RESPONSE
         * ---------------------------------------------------------
         */

        List<Map<String, Object>> questions =
                selectedQuestions.stream()
                        .map(question ->
                                buildQuestionResponse(
                                        question,
                                        optionOrder.get(
                                                String.valueOf(
                                                        question.getId()
                                                )
                                        )
                                )
                        )
                        .collect(Collectors.toList());

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "attemptId",
                savedAttempt.getAttemptId()
        );

        response.put(
                "attemptNumber",
                attemptNumber
        );

        response.put(
                "totalQuestions",
                selectedQuestions.size()
        );

        response.put(
                "maxAttempts",
                maxAttempts
        );

        response.put(
                "attemptsUsed",
                attemptsUsed + 1
        );

        response.put(
                "remainingAttempts",
                maxAttempts - (attemptsUsed + 1)
        );

        response.put(
                "passingScore",
                quiz.getPassingScore()
        );

        response.put(
                "timeLimitMinutes",
                quiz.getTimeLimitMinutes()
        );

        response.put(
                "questions",
                questions
        );

        return response;
    }


    /**
     * HR/Admin-only quiz preview.
     * This method is read-only: it does not create QuizAttempt records,
     * update QuizProgress, or change lesson/enrollment progress.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> previewQuiz(Long quizId) {

        Long userId = securityContextUtil.getCurrentUserId();

    if (userId == null) {
        throw new AccessDeniedException(
                "Unable to identify the authenticated user."
        );
    }

    Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() ->
                    new IllegalArgumentException("Quiz not found.")
            );

    List<QuizQuestion> questionBank =
            quizQuestionRepository.findByQuiz_Id(quizId);

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("quizId", quiz.getId());
    response.put("quizCode", quiz.getQuizId());
    response.put("title", quiz.getTitle());
    response.put("type", quiz.getType().name());
    response.put("courseId", quiz.getCourse().getId());
    response.put(
            "moduleId",
            quiz.getModule() == null ? null : quiz.getModule().getId()
    );
    response.put("passingScore", quiz.getPassingScore());
    response.put("timeLimitMinutes", quiz.getTimeLimitMinutes());
    response.put("maxAttempts", quiz.getMaxAttempts());
    response.put("totalQuestions", questionBank.size());
    response.put("previewMode", true);

    List<Map<String, Object>> questions = questionBank.stream()
            .map(question -> {
                Map<String, Object> item = new LinkedHashMap<>();

                item.put("id", question.getId());
                item.put("questionId", question.getQuestionId());
                item.put("question", question.getQuestionText());
                item.put("questionType", question.getQuestionType());
                item.put("orderIndex", question.getOrderIndex());

                Map<String, String> options = new LinkedHashMap<>();
                options.put("A", question.getOptionA());
                options.put("B", question.getOptionB());
                options.put("C", question.getOptionC());
                options.put("D", question.getOptionD());

                item.put("options", options);
                item.put("correctAnswer", question.getCorrectAnswer());

                return item;
            })
            .collect(Collectors.toList());

        response.put("questions", questions);

        return response;
    }

    /**
     * Returns whether a quiz is currently unlocked for a user.
     */
    public Map<String, Object> getQuizUnlockStatus(
            Long quizId
    ) {

        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new AccessDeniedException("Unable to identify the authenticated employee.");
        }

        Quiz quiz =
                quizRepository.findById(quizId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Quiz not found."
                                )
                        );

        userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "User not found."
                        )
                );

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "quizId",
                quiz.getId()
        );

        response.put(
                "quizTitle",
                quiz.getTitle()
        );

        response.put(
                "quizType",
                quiz.getType()
        );

        Map<String, Object> cooldownStatus = getCooldownStatus(quizId, userId);
        response.putAll(cooldownStatus);
        boolean cooldownActive = Boolean.TRUE.equals(cooldownStatus.get("cooldownActive"));

        /*
         * ---------------------------------------------------------
         * FINAL QUIZ
         * ---------------------------------------------------------
         */

        if (quiz.getType() == QuizType.FINAL) {

            List<Quiz> moduleQuizzes =
                    quizRepository.findByCourseIdAndType(
                            quiz.getCourse().getId(),
                            QuizType.MODULE
                    );

            int totalModuleQuizzes =
                    moduleQuizzes.size();

            int passedModuleQuizzes = 0;

            for (Quiz moduleQuiz : moduleQuizzes) {

                boolean passed =
                        quizProgressRepository
                                .existsByQuiz_IdAndUser_IdAndPassedTrue(
                                        moduleQuiz.getId(),
                                        userId
                                );

                if (passed) {
                    passedModuleQuizzes++;
                }
            }

            boolean allModuleQuizzesPassed =
                    totalModuleQuizzes > 0
                            && passedModuleQuizzes
                            == totalModuleQuizzes;

            response.put(
                    "totalModuleQuizzes",
                    totalModuleQuizzes
            );

            response.put(
                    "passedModuleQuizzes",
                    passedModuleQuizzes
            );

            response.put(
                    "allModuleQuizzesPassed",
                    allModuleQuizzesPassed
            );

            boolean unlocked = allModuleQuizzesPassed && !cooldownActive;
            response.put("unlocked", unlocked);

            if (cooldownActive) {
                response.put("reason", cooldownStatus.get("message"));
            } else if (allModuleQuizzesPassed) {

                response.put(
                        "reason",
                        "Final quiz is unlocked."
                );

            } else {

                response.put(
                        "reason",
                        "Pass all module quizzes before attempting the final quiz."
                );
            }

            return response;
        }

        /*
         * ---------------------------------------------------------
         * MODULE QUIZ
         * ---------------------------------------------------------
         */

        if (quiz.getType() == QuizType.MODULE) {

            if (quiz.getModule() == null) {

                response.put(
                        "unlocked",
                        false
                );

                response.put(
                        "reason",
                        "This module quiz is not linked to a module."
                );

                return response;
            }

            Enrollment enrollment =
                    enrollmentRepository
                            .findByUserIdAndCourseId(
                                    userId,
                                    quiz.getCourse().getId()
                            )
                            .orElseThrow(() ->
                                    new IllegalStateException(
                                            "You are not enrolled in this course."
                                    )
                            );

            Module currentModule =
                    quiz.getModule();

            boolean allLessonsCompleted =
                    lessonProgressRepository
                            .areAllLessonsCompleted(
                                    enrollment.getId(),
                                    currentModule.getId()
                            );

            boolean previousModulesPassed = true;

            List<Module> modules =
                    moduleRepository
                            .findByCourseIdOrderByOrderIndexAsc(
                                    quiz.getCourse().getId()
                            );

            for (Module module : modules) {

                if (module.getId().equals(
                        currentModule.getId()
                )) {
                    break;
                }

                Quiz previousQuiz =
                        quizRepository
                                .findByModuleId(module.getId())
                                .orElse(null);

                if (previousQuiz == null) {

                    previousModulesPassed = false;
                    break;
                }

                boolean passed =
                        quizProgressRepository
                                .existsByQuiz_IdAndUser_IdAndPassedTrue(
                                        previousQuiz.getId(),
                                        userId
                                );

                if (!passed) {

                    previousModulesPassed = false;
                    break;
                }
            }

            boolean unlocked =
                    allLessonsCompleted
                            && previousModulesPassed
                            && !cooldownActive;

            response.put(
                    "moduleId",
                    currentModule.getId()
            );

            response.put(
                    "moduleTitle",
                    currentModule.getTitle()
            );

            response.put(
                    "allLessonsCompleted",
                    allLessonsCompleted
            );

            response.put(
                    "previousModulesPassed",
                    previousModulesPassed
            );

            response.put(
                    "unlocked",
                    unlocked
            );

            if (cooldownActive) {

                response.put("reason", cooldownStatus.get("message"));

            } else if (unlocked) {

                response.put(
                        "reason",
                        "Module quiz is unlocked."
                );

            } else if (!allLessonsCompleted) {

                response.put(
                        "reason",
                        "Complete all lessons in this module before attempting the quiz."
                );

            } else {

                response.put(
                        "reason",
                        "Pass the previous module quiz before proceeding."
                );
            }

            return response;
        }

        response.put(
                "unlocked",
                true
        );

        response.put(
                "reason",
                "Quiz is available."
        );

        return response;
    }

    /**
     * Submits a quiz attempt and calculates the score.
     *
     * If the submitted quiz is a FINAL quiz and the employee
     * passes it, the course is automatically completed and
     * the certificate is generated through EnrollmentService.
     */
    public Map<String, Object> submitQuiz(
            String attemptId,
            Map<String, String> answers,
            Integer timeTakenSeconds
    ) {

        QuizAttempt attempt =
                quizAttemptRepository
                        .findByAttemptId(attemptId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Quiz attempt not found."
                                )
                        );

        Long currentUserId = securityContextUtil.getCurrentUserId();
        if (currentUserId == null
                || attempt.getUser() == null
                || !currentUserId.equals(attempt.getUser().getId())) {
            throw new AccessDeniedException("You are not authorized to submit this quiz attempt.");
        }

        if (attempt.getCompletedAt() != null) {

            throw new IllegalStateException(
                    "This quiz attempt has already been submitted."
            );
        }

        Quiz quiz = attempt.getQuiz();

        List<Long> questionIds;

        try {

            questionIds =
                    objectMapper.readValue(
                            attempt.getQuestionIds(),
                            new TypeReference<List<Long>>() {}
                    );

        } catch (JsonProcessingException e) {

            throw new IllegalStateException(
                    "Unable to read quiz questions.",
                    e
            );
        }

        if (questionIds == null ||
                questionIds.isEmpty()) {

            throw new IllegalStateException(
                    "No questions were recorded for this attempt."
            );
        }

        List<QuizQuestion> questions =
                quizQuestionRepository.findAllById(
                        questionIds
                );

        Map<Long, QuizQuestion> questionMap =
                questions.stream()
                        .collect(
                                Collectors.toMap(
                                        QuizQuestion::getId,
                                        question -> question
                                )
                        );

        int correctAnswers = 0;
        int wrongAnswers = 0;

        Map<String, String> submittedAnswers =
                answers == null
                        ? new LinkedHashMap<>()
                        : new LinkedHashMap<>(answers);

        /*
         * ---------------------------------------------------------
         * SCORE THE ATTEMPT
         * ---------------------------------------------------------
         */

        for (Long questionId : questionIds) {

            QuizQuestion question =
                    questionMap.get(questionId);

            if (question == null) {
                continue;
            }

            String submittedAnswer =
                    submittedAnswers.get(
                            String.valueOf(questionId)
                    );

            String correctAnswer =
                    question.getCorrectAnswer();

            if (submittedAnswer != null &&
                    correctAnswer != null &&
                    submittedAnswer.equalsIgnoreCase(
                            correctAnswer
                    )) {

                correctAnswers++;

            } else {

                wrongAnswers++;
            }
        }

        int totalQuestions =
                questionIds.size();

        int score =
                totalQuestions == 0
                        ? 0
                        : Math.round(
                                (correctAnswers * 100.0f)
                                        / totalQuestions
                        );

        int passingScore =
                quiz.getPassingScore() == null
                        ? 70
                        : quiz.getPassingScore();

        boolean passed =
                score >= passingScore;

        /*
         * ---------------------------------------------------------
         * UPDATE ATTEMPT
         * ---------------------------------------------------------
         */

        attempt.setCorrectAnswers(
                correctAnswers
        );

        attempt.setWrongAnswers(
                wrongAnswers
        );

        attempt.setScore(
                score
        );

        attempt.setPassed(
                passed
        );

        attempt.setTimeTakenSeconds(
                timeTakenSeconds
        );

        try {

            attempt.setAnswersJson(
                    objectMapper.writeValueAsString(
                            submittedAnswers
                    )
            );

        } catch (JsonProcessingException e) {

            throw new IllegalStateException(
                    "Unable to save submitted answers.",
                    e
            );
        }

        attempt.setCompletedAt(
                LocalDateTime.now()
        );

        quizAttemptRepository.save(
                attempt
        );

        /*
         * ---------------------------------------------------------
         * UPDATE QUIZ PROGRESS
         * ---------------------------------------------------------
         */

        QuizProgress progress =
                quizProgressRepository
                        .findByQuiz_IdAndUser_Id(
                                quiz.getId(),
                                attempt.getUser().getId()
                        )
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Quiz progress not found."
                                )
                        );

        Integer bestScore =
                progress.getBestScore() == null
                        ? 0
                        : progress.getBestScore();

        if (score > bestScore) {

            progress.setBestScore(
                    score
            );
        }

        if (passed) {

            progress.setPassed(
                    true
            );

            progress.setPassingAttemptNumber(
                    attempt.getAttemptNumber()
            );

            progress.setPassedAt(
                    LocalDateTime.now()
            );
        }

        quizProgressRepository.save(
                progress
        );

        /*
         * ---------------------------------------------------------
         * FINAL QUIZ → COURSE COMPLETION
         * ---------------------------------------------------------
         *
         * Only a PASSED final quiz completes the course.
         */
        /*
 * ---------------------------------------------------------
 * FINAL QUIZ → COURSE COMPLETION
 * ---------------------------------------------------------
 *
 * Only a PASSED final quiz completes the course.
 */

CertificateDTO completionResult = null;

if (passed &&
        quiz.getType() == QuizType.FINAL) {

    Enrollment enrollment =
            enrollmentRepository
                    .findByUserIdAndCourseId(
                            attempt.getUser().getId(),
                            quiz.getCourse().getId()
                    )
                    .orElseThrow(() ->
                            new IllegalStateException(
                                    "Enrollment not found for final quiz."
                            )
                    );

    CompleteCourseRequest request =
            new CompleteCourseRequest();

    request.setEnrollmentId(enrollment.getId());
    request.setCourseId(quiz.getCourse().getId());
    request.setScore(score);
    request.setCourseCode(
            quiz.getCourse().getCourseId()
    );

    completionResult =
            enrollmentService.completeCourse(request);
}

        /*
         * ---------------------------------------------------------
         * BUILD RESPONSE
         * ---------------------------------------------------------
         */

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "attemptId",
                attempt.getAttemptId()
        );

        response.put(
                "attemptNumber",
                attempt.getAttemptNumber()
        );

        response.put(
                "totalQuestions",
                totalQuestions
        );

        response.put(
                "correctAnswers",
                correctAnswers
        );

        response.put(
                "wrongAnswers",
                wrongAnswers
        );

        response.put(
                "score",
                score
        );

        response.put(
                "passingScore",
                passingScore
        );

        response.put(
                "passed",
                passed
        );

        response.put(
                "attemptsUsed",
                progress.getAttemptsUsed()
        );

        response.put(
                "maxAttempts",
                quiz.getMaxAttempts() == null
                        ? 3
                        : quiz.getMaxAttempts()
        );

        response.put(
                "remainingAttempts",
                Math.max(
                        0,
                        (
                                quiz.getMaxAttempts() == null
                                        ? 3
                                        : quiz.getMaxAttempts()
                        )
                                - progress.getAttemptsUsed()
                )
        );

        response.put(
                "bestScore",
                progress.getBestScore()
        );

        response.put(
                "quizPassed",
                progress.getPassed()
        );

        Map<String, Object> cooldownStatus = getCooldownStatus(quiz.getId(), attempt.getUser().getId());
        response.putAll(cooldownStatus);

        /*
         * Tell frontend that the course was completed.
         */
       if (passed && quiz.getType() == QuizType.FINAL) {

    response.put("courseCompleted", true);

    response.put("certificateGenerated",
            completionResult != null);

    if (completionResult != null) {
        response.put("completion", completionResult);
    }

} else {
    response.put("courseCompleted", false);
    response.put("certificateGenerated", false);
}

        return response;
    }

    /**
     * Builds the question object sent to the frontend.
     *
     * Correct answers are NEVER exposed.
     */
    private Map<String, Object> buildQuestionResponse(
            QuizQuestion question,
            List<String> optionOrder
    ) {

        Map<String, String> optionTexts =
                new LinkedHashMap<>();

        optionTexts.put(
                "A",
                question.getOptionA()
        );

        optionTexts.put(
                "B",
                question.getOptionB()
        );

        optionTexts.put(
                "C",
                question.getOptionC()
        );

        optionTexts.put(
                "D",
                question.getOptionD()
        );

        List<Map<String, String>> options =
                optionOrder.stream()
                        .map(option -> {

                            Map<String, String> item =
                                    new LinkedHashMap<>();

                            item.put(
                                    "value",
                                    option
                            );

                            item.put(
                                    "text",
                                    optionTexts.get(option)
                            );

                            return item;
                        })
                        .collect(
                                Collectors.toList()
                        );

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "id",
                question.getId()
        );

        response.put(
                "questionId",
                question.getQuestionId()
        );

        response.put(
                "question",
                question.getQuestionText()
        );

        response.put(
                "questionType",
                question.getQuestionType()
        );

        response.put(
                "options",
                options
        );

        response.put(
                "orderIndex",
                question.getOrderIndex()
        );

        return response;
    }
}