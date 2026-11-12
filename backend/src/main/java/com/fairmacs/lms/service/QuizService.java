package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.BulkQuestionParseResultDTO;
import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.QuizAuthoringDTO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.entity.NotificationPriority;
import com.fairmacs.lms.entity.NotificationType;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizAttempt;
import com.fairmacs.lms.entity.QuizProgress;
import com.fairmacs.lms.entity.QuizQuestion;
import com.fairmacs.lms.entity.QuizType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.LessonRepository;
import com.fairmacs.lms.repository.ModuleRepository;
import com.fairmacs.lms.repository.QuizAttemptRepository;
import com.fairmacs.lms.repository.QuizProgressRepository;
import com.fairmacs.lms.repository.QuizQuestionRepository;
import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.time.Duration;
import java.util.Optional;
import java.util.Arrays;
import java.util.Objects;
import java.util.Set;

@Service
@Transactional
public class QuizService {

    private static final Logger log = LoggerFactory.getLogger(QuizService.class);

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizProgressRepository quizProgressRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final ObjectMapper objectMapper;
    private final EnrollmentService enrollmentService;
    private final SecurityContextUtil securityContextUtil;
    private NotificationService notificationService;
    private BulkQuestionParserService bulkQuestionParserService;
    private CourseRepository courseRepository;

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
        this(
                quizRepository,
                quizQuestionRepository,
                quizAttemptRepository,
                quizProgressRepository,
                userRepository,
                enrollmentRepository,
                lessonProgressRepository,
                moduleRepository,
                null,
                objectMapper,
                enrollmentService,
                securityContextUtil,
                null
        );
    }

    @Autowired
    public QuizService(
            QuizRepository quizRepository,
            QuizQuestionRepository quizQuestionRepository,
            QuizAttemptRepository quizAttemptRepository,
            QuizProgressRepository quizProgressRepository,
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository,
            LessonProgressRepository lessonProgressRepository,
            ModuleRepository moduleRepository,
            LessonRepository lessonRepository,
            ObjectMapper objectMapper,
            EnrollmentService enrollmentService,
            SecurityContextUtil securityContextUtil,
            NotificationService notificationService
    ) {
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizProgressRepository = quizProgressRepository;
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
        this.objectMapper = objectMapper;
        this.enrollmentService = enrollmentService;
        this.securityContextUtil = securityContextUtil;
        this.notificationService = notificationService;
    }

    @Autowired(required = false)
    public void setNotificationService(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Autowired(required = false)
    public void setBulkQuestionParserService(BulkQuestionParserService bulkQuestionParserService) {
        this.bulkQuestionParserService = bulkQuestionParserService;
    }

    @Autowired(required = false)
    public void setCourseRepository(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
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

    private static final int DEFAULT_COOLDOWN_MINUTES = 5;

    public Map<String, Object> getCooldownStatus(Long quizId, Long userId) {
        Map<String, Object> result = new LinkedHashMap<>();

        Optional<QuizAttempt> latestAttempt =
                quizAttemptRepository
                        .findTopByQuiz_IdAndUser_IdAndCompletedAtIsNotNullOrderByCompletedAtDesc(
                                quizId, userId
                        );

        LocalDateTime now = LocalDateTime.now();

        Quiz quiz = quizRepository.findById(quizId).orElse(null);
        int cooldownMinutes = (quiz != null && quiz.getCooldownMinutes() != null && quiz.getCooldownMinutes() > 0)
                ? quiz.getCooldownMinutes()
                : DEFAULT_COOLDOWN_MINUTES;

        if (latestAttempt.isPresent()) {
            QuizAttempt attempt = latestAttempt.get();

            if (Boolean.FALSE.equals(attempt.getPassed())
                    && attempt.getCompletedAt() != null) {

                LocalDateTime unlockAt =
                        attempt.getCompletedAt()
                                .plusMinutes(cooldownMinutes);

                if (now.isBefore(unlockAt)) {
                    long remainingSeconds =
                            Duration.between(now, unlockAt).getSeconds();

                    result.put("cooldownActive", true);
                    result.put("retryAvailableAt", unlockAt.toString());
                    result.put("remainingSeconds", remainingSeconds);
                    result.put("cooldownMinutes", cooldownMinutes);
                    result.put(
                            "message",
                            String.format("You failed this assessment. You can retry after %d minutes.", cooldownMinutes)
                    );
                    return result;
                }
            }
        }

        result.put("cooldownActive", false);
        result.put("remainingSeconds", 0);
        result.put("retryAvailableAt", null);
        result.put("cooldownMinutes", cooldownMinutes);

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

        if (user.getStatus() != null && user.getStatus() != UserStatus.ACTIVE) {
            throw new AccessDeniedException("User account is not active.");
        }

        if (quiz.getCourse() != null && quiz.getCourse().getId() != null) {
            Enrollment activeCheck = enrollmentRepository
                    .findByUserIdAndCourseId(userId, quiz.getCourse().getId())
                    .orElse(null);
            if (activeCheck != null && activeCheck.getStatus() == EnrollmentStatus.REVOKED) {
                throw new AccessDeniedException("This course enrollment has been revoked.");
            }
        }

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

        Integer maxAttempts = quiz.getMaxAttempts();

        // If the user already completed and passed this quiz, return the passed attempt and results immediately
        if (progress != null && Boolean.TRUE.equals(progress.getPassed())) {
            Map<String, Object> passedResponse = new LinkedHashMap<>();
            passedResponse.put("alreadyPassed", true);
            passedResponse.put("quizId", quiz.getId());
            passedResponse.put("quizTitle", quiz.getTitle());
            passedResponse.put("quizType", quiz.getType() != null ? quiz.getType().name() : "MODULE");
            passedResponse.put("passingScore", quiz.getPassingScore());
            passedResponse.put("attemptsUsed", attemptsUsed);
            passedResponse.put("maxAttempts", maxAttempts);
            int score = progress.getBestScore() != null ? progress.getBestScore() : 100;
            passedResponse.put("bestScore", score);
            passedResponse.put("score", score);
            passedResponse.put("passed", true);
            passedResponse.put("totalQuestions", 0);
            passedResponse.put("correctAnswers", 0);
            passedResponse.put("wrongAnswers", 0);

            Optional<QuizAttempt> latestAttempt = quizAttemptRepository
                    .findTopByQuiz_IdAndUser_IdAndCompletedAtIsNotNullOrderByCompletedAtDesc(quizId, userId);
            if (latestAttempt.isEmpty()) {
                latestAttempt = quizAttemptRepository
                        .findTopByQuiz_IdAndUser_IdAndPassedTrueOrderByCompletedAtDesc(quizId, userId);
            }
            if (latestAttempt.isPresent()) {
                QuizAttempt attempt = latestAttempt.get();
                passedResponse.put("attemptId", attempt.getAttemptId());
                passedResponse.put("score", attempt.getScore());
                passedResponse.put("correctAnswers", attempt.getCorrectAnswers());
                passedResponse.put("wrongAnswers", attempt.getWrongAnswers());
                passedResponse.put("totalQuestions", attempt.getTotalQuestions());
                passedResponse.put("completedAt", attempt.getCompletedAt() != null ? attempt.getCompletedAt().toString() : null);
                passedResponse.put("timeTakenSeconds", attempt.getTimeTakenSeconds());
            }
            return passedResponse;
        }

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
                        quizRepository.findTopByModuleIdOrderByIdDesc(module.getId())
                                .orElseGet(() -> quizRepository.findByModuleId(module.getId()).orElse(null));
                if (previousModuleQuiz == null) {
                    throw new IllegalStateException("Module quiz is not configured for module: " + module.getTitle());
                }

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

            Enrollment enrollment = enrollmentRepository
                    .findByUserIdAndCourseId(
                            userId,
                            quiz.getCourse().getId()
                    )
                    .orElseThrow(() ->
                            new IllegalStateException(
                                    "You are not enrolled in this course."
                            )
                    );

            // Require all lessons across all modules to be completed before attempting final quiz
            List<Module> modules =
                    moduleRepository.findByCourseIdOrderByOrderIndexAsc(
                            quiz.getCourse().getId()
                    );
            for (Module module : modules) {
                if (!lessonProgressRepository.areAllLessonsCompleted(enrollment.getId(), module.getId())) {
                    throw new IllegalStateException(
                            "Complete all lessons across all modules before attempting the final assessment."
                    );
                }
            }

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
                    totalModuleQuizzes == 0
                            || passedModuleQuizzes == totalModuleQuizzes;

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

        // Hard attempt cap removed: retakes are governed solely by the 5-minute cooldown system
        // enforceFailedAttemptCooldown(quizId, userId) was already called above

        /*
         * ---------------------------------------------------------
         * RESUME INCOMPLETE / ABANDONED ATTEMPT IF ONE EXISTS
         * ---------------------------------------------------------
         */
        Optional<QuizAttempt> openAttemptOpt = quizAttemptRepository
                .findTopByQuiz_IdAndUser_IdAndCompletedAtIsNullOrderByStartedAtDesc(quizId, userId);

        if (openAttemptOpt.isPresent()) {
            QuizAttempt openAttempt = openAttemptOpt.get();
            Integer timeLimit = quiz.getTimeLimitMinutes();
            boolean isExpired = false;
            if (timeLimit != null && timeLimit > 0 && openAttempt.getStartedAt() != null) {
                LocalDateTime expiry = openAttempt.getStartedAt().plusMinutes(timeLimit);
                if (LocalDateTime.now().isAfter(expiry)) {
                    isExpired = true;
                }
            }
            if (isExpired) {
                openAttempt.setCompletedAt(openAttempt.getStartedAt().plusMinutes(timeLimit));
                openAttempt.setPassed(false);
                openAttempt.setScore(0);
                quizAttemptRepository.save(openAttempt);
                enforceFailedAttemptCooldown(quizId, userId);
            } else {
                return buildResumeQuizResponse(openAttempt, quiz);
            }
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
                (quiz.getQuestionsPerAttempt() == null || quiz.getQuestionsPerAttempt() <= 0)
                        ? questionBank.size()
                        : Math.min(quiz.getQuestionsPerAttempt(), questionBank.size());

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

        // Hard attempt cap removed: retakes are governed solely by cooldown
        int maxExistingAttempt = quizAttemptRepository.findMaxAttemptNumber(quiz.getId(), user.getId());
        int attemptNumber = Math.max(maxExistingAttempt, attemptsUsed) + 1;

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
                maxAttempts != null ? Math.max(0, maxAttempts - (attemptsUsed + 1)) : null
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
    response.put("type", quiz.getType() != null ? quiz.getType().name() : "MODULE");
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

        QuizProgress userProgress =
                quizProgressRepository
                        .findByQuiz_IdAndUser_Id(
                                quizId,
                                userId
                        )
                        .orElse(null);

        boolean alreadyPassed = userProgress != null && Boolean.TRUE.equals(userProgress.getPassed());
        response.put("alreadyPassed", alreadyPassed);
        response.put("quizPassed", alreadyPassed);

        Optional<QuizAttempt> latestAttemptOpt =
                quizAttemptRepository
                        .findTopByQuiz_IdAndUser_IdAndCompletedAtIsNotNullOrderByCompletedAtDesc(
                                quizId, userId
                        );

        if (latestAttemptOpt.isEmpty() && alreadyPassed) {
            latestAttemptOpt = quizAttemptRepository
                    .findTopByQuiz_IdAndUser_IdAndPassedTrueOrderByCompletedAtDesc(quizId, userId);
        }

        if (latestAttemptOpt.isPresent()) {
            QuizAttempt attempt = latestAttemptOpt.get();
            Map<String, Object> attemptMap = new LinkedHashMap<>();
            attemptMap.put("attemptId", attempt.getAttemptId());
            attemptMap.put("score", attempt.getScore());
            attemptMap.put("passed", attempt.getPassed());
            attemptMap.put("completedAt", attempt.getCompletedAt() != null ? attempt.getCompletedAt().toString() : null);
            attemptMap.put("correctAnswers", attempt.getCorrectAnswers());
            attemptMap.put("wrongAnswers", attempt.getWrongAnswers());
            attemptMap.put("totalQuestions", attempt.getTotalQuestions());
            attemptMap.put("timeTakenSeconds", attempt.getTimeTakenSeconds());
            attemptMap.put("passingScore", quiz.getPassingScore());
            Integer maxAttempts = quiz.getMaxAttempts();
            int used = userProgress != null && userProgress.getAttemptsUsed() != null ? userProgress.getAttemptsUsed() : 1;
            attemptMap.put("maxAttempts", maxAttempts);
            attemptMap.put("remainingAttempts", maxAttempts != null ? Math.max(0, maxAttempts - used) : null);
            response.put("latestAttempt", attemptMap);
        } else if (alreadyPassed) {
            Map<String, Object> attemptMap = new LinkedHashMap<>();
            attemptMap.put("attemptId", "ATT-PASSED");
            attemptMap.put("score", userProgress != null && userProgress.getBestScore() != null ? userProgress.getBestScore() : 100);
            attemptMap.put("passed", true);
            attemptMap.put("correctAnswers", 0);
            attemptMap.put("wrongAnswers", 0);
            attemptMap.put("totalQuestions", 0);
            attemptMap.put("passingScore", quiz.getPassingScore());
            Integer maxAttempts = quiz.getMaxAttempts();
            int used = userProgress != null && userProgress.getAttemptsUsed() != null ? userProgress.getAttemptsUsed() : 1;
            attemptMap.put("maxAttempts", maxAttempts);
            attemptMap.put("remainingAttempts", maxAttempts != null ? Math.max(0, maxAttempts - used) : null);
            response.put("latestAttempt", attemptMap);
        }

        Map<String, Object> cooldownStatus = getCooldownStatus(quizId, userId);
        response.putAll(cooldownStatus);
        boolean cooldownActive = Boolean.TRUE.equals(cooldownStatus.get("cooldownActive"));

        /*
         * ---------------------------------------------------------
         * FINAL QUIZ
         * ---------------------------------------------------------
         */

        if (quiz.getType() == QuizType.FINAL) {

            Enrollment enrollment = enrollmentRepository
                    .findByUserIdAndCourseId(userId, quiz.getCourse().getId())
                    .orElse(null);

            boolean allLessonsCompleted = true;
            if (enrollment != null) {
                List<Module> modules =
                        moduleRepository.findByCourseIdOrderByOrderIndexAsc(quiz.getCourse().getId());
                for (Module module : modules) {
                    if (!lessonProgressRepository.areAllLessonsCompleted(enrollment.getId(), module.getId())) {
                        allLessonsCompleted = false;
                        break;
                    }
                }
            } else {
                allLessonsCompleted = false;
            }

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
                    totalModuleQuizzes == 0
                            || passedModuleQuizzes == totalModuleQuizzes;

            response.put(
                    "allLessonsCompleted",
                    allLessonsCompleted
            );

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

            boolean unlocked = (allLessonsCompleted && allModuleQuizzesPassed && !cooldownActive) || alreadyPassed;
            response.put("unlocked", unlocked);

            if (alreadyPassed) {
                response.put("reason", "You have already completed and passed the final assessment.");
            } else if (cooldownActive) {
                response.put("reason", cooldownStatus.get("message"));
            } else if (!allLessonsCompleted) {
                response.put(
                        "reason",
                        "Complete all lessons across all modules before attempting the final assessment."
                );
            } else if (!allModuleQuizzesPassed) {
                response.put(
                        "reason",
                        "Pass all module quizzes before attempting the final assessment."
                );
            } else {
                response.put(
                        "reason",
                        "Final quiz is unlocked."
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
                                .findTopByModuleIdOrderByIdDesc(module.getId())
                                .orElseGet(() -> quizRepository.findByModuleId(module.getId()).orElse(null));

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
                    (allLessonsCompleted
                            && previousModulesPassed
                            && !cooldownActive)
                            || alreadyPassed;

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

            if (alreadyPassed) {

                response.put("reason", "You have already completed and passed this module quiz.");

            } else if (cooldownActive) {

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

        if (attempt.getUser().getStatus() != null && attempt.getUser().getStatus() != UserStatus.ACTIVE) {
            throw new AccessDeniedException("User account is not active.");
        }

        if (attempt.getQuiz() != null && attempt.getQuiz().getCourse() != null && attempt.getQuiz().getCourse().getId() != null) {
            Enrollment activeCheck = enrollmentRepository
                    .findByUserIdAndCourseId(currentUserId, attempt.getQuiz().getCourse().getId())
                    .orElse(null);
            if (activeCheck != null && activeCheck.getStatus() == EnrollmentStatus.REVOKED) {
                throw new AccessDeniedException("This course enrollment has been revoked.");
            }
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

            if (submittedAnswer != null && correctAnswer != null) {
                Set<String> submittedSet = Arrays.stream(submittedAnswer.split("[,;\\s]+"))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .map(String::toUpperCase)
                        .collect(Collectors.toSet());

                Set<String> correctSet = Arrays.stream(correctAnswer.split("[,;\\s]+"))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .map(String::toUpperCase)
                        .collect(Collectors.toSet());

                if (!correctSet.isEmpty() && correctSet.equals(submittedSet)) {
                    correctAnswers++;
                } else {
                    wrongAnswers++;
                }
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

        Integer maxAttemptsCount = quiz.getMaxAttempts();
        Integer remainingAttemptsCount = maxAttemptsCount != null ? Math.max(0, maxAttemptsCount - progress.getAttemptsUsed()) : null;
        emitQuizSubmissionNotifications(
                attempt,
                quiz,
                score,
                passingScore,
                passed,
                remainingAttemptsCount
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

if (passed && quiz.getType() == QuizType.MODULE && quiz.getCourse() != null) {
    Enrollment enrollment = enrollmentRepository
            .findByUserIdAndCourseId(
                    attempt.getUser().getId(),
                    quiz.getCourse().getId()
            )
            .orElse(null);

    if (enrollment != null) {
        long totalLessons = lessonRepository.countByModuleCourseId(quiz.getCourse().getId());
        long completedLessons = lessonProgressRepository.findByEnrollmentId(enrollment.getId()).stream()
                .filter(lp -> Boolean.TRUE.equals(lp.getCompleted()))
                .count();

        List<Quiz> moduleQuizzes = quizRepository.findByCourseIdAndType(quiz.getCourse().getId(), QuizType.MODULE);
        long totalModuleQuizzes = moduleQuizzes.size();
        long passedModuleQuizzes = 0;
        for (Quiz mq : moduleQuizzes) {
            if (quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(mq.getId(), attempt.getUser().getId())) {
                passedModuleQuizzes++;
            }
        }

        long totalItems = totalLessons + totalModuleQuizzes;
        long completedItems = completedLessons + passedModuleQuizzes;
        int courseProgress = 0;
        if (totalItems > 0) {
            courseProgress = (int) Math.round((completedItems * 98.0) / totalItems);
            courseProgress = Math.min(98, Math.max(0, courseProgress));
        }

        if (enrollment.getStatus() == EnrollmentStatus.COMPLETED) {
            courseProgress = 100;
        }

        if (enrollment.getProgressPercent() == null || courseProgress > enrollment.getProgressPercent()) {
            enrollment.setProgressPercent(courseProgress);
        }
        enrollment.setLastAccessed(LocalDateTime.now());
        if (enrollment.getStatus() == EnrollmentStatus.NOT_STARTED && courseProgress > 0) {
            enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        }
        enrollmentRepository.save(enrollment);
    }
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
                quiz.getMaxAttempts()
        );

        response.put(
                "remainingAttempts",
                quiz.getMaxAttempts() != null
                        ? Math.max(0, quiz.getMaxAttempts() - progress.getAttemptsUsed())
                        : null
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

    private void emitQuizSubmissionNotifications(
            QuizAttempt attempt,
            Quiz quiz,
            int score,
            int passingScore,
            boolean passed,
            Integer remainingAttempts
    ) {
        if (notificationService == null || attempt == null || quiz == null || attempt.getUser() == null) {
            return;
        }

        User user = attempt.getUser();
        Course course = quiz.getCourse();
        String courseTitle = course != null ? course.getTitle() : "Training Course";
        String courseCode = course != null && course.getCourseId() != null ? course.getCourseId() : "";
        String courseActionUrl = !courseCode.isBlank() ? "/courses/" + courseCode + "/learn" : "/progress";
        boolean isFinal = quiz.getType() == QuizType.FINAL;
        String assessmentLabel = isFinal ? "Final Assessment" : "Module Quiz";

        if (passed) {
            String nextStep = isFinal
                    ? "Your course completion record has been finalized."
                    : "You may now proceed to the next module or final assessment.";

            Map<String, Object> passedMetadata = new HashMap<>();
            passedMetadata.put("attemptId", attempt.getAttemptId() != null ? attempt.getAttemptId() : String.valueOf(attempt.getId()));
            passedMetadata.put("quizId", quiz.getQuizId() != null ? quiz.getQuizId() : String.valueOf(quiz.getId()));
            passedMetadata.put("courseId", courseCode);
            passedMetadata.put("score", score);
            passedMetadata.put("passingScore", passingScore);
            passedMetadata.put("passed", true);
            if (remainingAttempts != null) {
                passedMetadata.put("remainingAttempts", remainingAttempts);
            }

            notificationService.createNotificationSafely(
                    user.getId(),
                    assessmentLabel + " Passed: " + quiz.getTitle(),
                    String.format(
                            "You passed \"%s\" in course \"%s\" (%s) with a score of %d%% (Required: %d%%). %s",
                            quiz.getTitle(),
                            courseTitle,
                            courseCode,
                            score,
                            passingScore,
                            nextStep
                    ),
                    NotificationType.ASSESSMENT_RESULT,
                    NotificationPriority.NORMAL,
                    "COURSE_CODE",
                    courseCode,
                    courseActionUrl,
                    "ASSESSMENT_RESULT:ATTEMPT:" + attempt.getAttemptId(),
                    passedMetadata
            );

            // If this was a MODULE quiz and all module quizzes are now passed, notify learner that Final Assessment is unlocked
            if (!isFinal && course != null && course.getId() != null) {
                List<Quiz> moduleQuizzes = quizRepository.findByCourseIdAndType(course.getId(), QuizType.MODULE);
                boolean allModPassed = !moduleQuizzes.isEmpty() && moduleQuizzes.stream().allMatch(
                        mq -> quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(mq.getId(), user.getId())
                );
                if (allModPassed) {
                    List<Quiz> finalQuizzes = quizRepository.findByCourseIdAndType(course.getId(), QuizType.FINAL);
                    for (Quiz finalQuiz : finalQuizzes) {
                        notificationService.createNotificationSafely(
                                user.getId(),
                                "Final Assessment Unlocked: " + courseTitle,
                                String.format(
                                        "All module quizzes for \"%s\" (%s) are complete! The Final Assessment \"%s\" is now unlocked.",
                                        courseTitle,
                                        courseCode,
                                        finalQuiz.getTitle()
                                ),
                                NotificationType.QUIZ_AVAILABLE,
                                NotificationPriority.NORMAL,
                                "COURSE_CODE",
                                courseCode,
                                courseActionUrl,
                                String.format("QUIZ_AVAILABLE:USER:%d:QUIZ:%d", user.getId(), finalQuiz.getId()),
                                Map.of(
                                        "courseId", courseCode,
                                        "quizId", finalQuiz.getQuizId() != null ? finalQuiz.getQuizId() : String.valueOf(finalQuiz.getId()),
                                        "quizType", "FINAL"
                                )
                        );
                    }
                }
            }
        } else {
            int cooldownMin = quiz.getCooldownMinutes() != null ? quiz.getCooldownMinutes() : 5;
            String retryInfo = String.format("You can retake this assessment after the %d-minute review cooldown.", cooldownMin);

            String priority = isFinal
                    ? NotificationPriority.HIGH
                    : NotificationPriority.NORMAL;

            Map<String, Object> failedMetadata = new HashMap<>();
            failedMetadata.put("attemptId", attempt.getAttemptId() != null ? attempt.getAttemptId() : String.valueOf(attempt.getId()));
            failedMetadata.put("quizId", quiz.getQuizId() != null ? quiz.getQuizId() : String.valueOf(quiz.getId()));
            failedMetadata.put("courseId", courseCode);
            failedMetadata.put("score", score);
            failedMetadata.put("passingScore", passingScore);
            failedMetadata.put("passed", false);
            if (remainingAttempts != null) {
                failedMetadata.put("remainingAttempts", remainingAttempts);
            }

            notificationService.createNotificationSafely(
                    user.getId(),
                    assessmentLabel + " Not Passed: " + quiz.getTitle(),
                    String.format(
                            "You scored %d%% on \"%s\" in course \"%s\" (%s) (Passing score: %d%%). %s",
                            score,
                            quiz.getTitle(),
                            courseTitle,
                            courseCode,
                            passingScore,
                            retryInfo
                    ),
                    NotificationType.ASSESSMENT_FAILED,
                    priority,
                    "COURSE_CODE",
                    courseCode,
                    courseActionUrl,
                    "ASSESSMENT_FAILED:ATTEMPT:" + attempt.getAttemptId(),
                    failedMetadata
            );

            // Escalate when a learner exhausts all attempts on a mandatory course
            if (remainingAttempts != null && remainingAttempts == 0 && course != null && course.getId() != null) {
                Enrollment enrollment = enrollmentRepository
                        .findByUserIdAndCourseId(user.getId(), course.getId())
                        .orElse(null);

                if (enrollment != null && enrollment.getEnrollmentType() == EnrollmentType.MANDATORY) {
                    if (user.getDepartment() != null) {
                        notificationService.notifyDepartmentManagers(
                                user.getDepartment(),
                                "Assessment Attempts Exhausted: " + user.getName(),
                                String.format(
                                        "Team member %s (%s) has used all allowed attempts on \"%s\" in mandatory course \"%s\" (%s) (Latest score: %d%%).",
                                        user.getName(),
                                        user.getEmployeeId(),
                                        quiz.getTitle(),
                                        courseTitle,
                                        courseCode,
                                        score
                                ),
                                NotificationType.TEAM_COMPLIANCE,
                                NotificationPriority.HIGH,
                                "COURSE_CODE",
                                courseCode,
                                "/manager",
                                String.format("MGR_EXHAUSTED:USER:%d:QUIZ:%d", user.getId(), quiz.getId()),
                                Map.of(
                                        "employeeId", user.getEmployeeId(),
                                        "courseId", courseCode,
                                        "quizTitle", quiz.getTitle()
                                )
                        );
                    }
                    notificationService.notifyHrAdmins(
                            "Mandatory Assessment Attempts Exhausted: " + user.getName(),
                            String.format(
                                    "Employee %s (%s) exhausted all attempts on \"%s\" in mandatory course \"%s\" (%s).",
                                    user.getName(),
                                    user.getEmployeeId(),
                                    quiz.getTitle(),
                                    courseTitle,
                                    courseCode
                            ),
                            NotificationType.HR_ADMIN_ALERT,
                            NotificationPriority.HIGH,
                            "COURSE_CODE",
                            courseCode,
                            "/hr",
                            String.format("HR_EXHAUSTED:USER:%d:QUIZ:%d", user.getId(), quiz.getId()),
                            Map.of(
                                    "employeeId", user.getEmployeeId(),
                                    "courseId", courseCode
                            )
                    );
                }
            }
        }
    }

    /**
     * Builds the question object sent to the frontend.
     *
     * Correct answers are NEVER exposed.
     */
    private Map<String, Object> buildResumeQuizResponse(QuizAttempt attempt, Quiz quiz) {
        List<Long> questionIds = new ArrayList<>();
        Map<String, List<String>> optionOrder = new LinkedHashMap<>();

        try {
            if (attempt.getQuestionIds() != null && !attempt.getQuestionIds().isBlank()) {
                questionIds = objectMapper.readValue(
                        attempt.getQuestionIds(),
                        new com.fasterxml.jackson.core.type.TypeReference<List<Long>>() {}
                );
            }
            if (attempt.getOptionOrderJson() != null && !attempt.getOptionOrderJson().isBlank()) {
                optionOrder = objectMapper.readValue(
                        attempt.getOptionOrderJson(),
                        new com.fasterxml.jackson.core.type.TypeReference<Map<String, List<String>>>() {}
                );
            }
        } catch (Exception e) {
            log.warn("Failed to parse stored attempt questions for attemptId={}: {}", attempt.getAttemptId(), e.getMessage());
        }

        List<QuizQuestion> questionsList;
        if (!questionIds.isEmpty()) {
            Map<Long, QuizQuestion> qMap = quizQuestionRepository.findAllById(questionIds).stream()
                    .collect(Collectors.toMap(QuizQuestion::getId, q -> q));
            questionsList = questionIds.stream()
                    .map(qMap::get)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } else {
            questionsList = quizQuestionRepository.findByQuiz_Id(quiz.getId());
        }

        final Map<String, List<String>> finalOptionOrder = optionOrder;
        List<Map<String, Object>> questionResponses = questionsList.stream()
                .map(q -> {
                    List<String> order = finalOptionOrder.get(String.valueOf(q.getId()));
                    if (order == null || order.isEmpty()) {
                        order = List.of("A", "B", "C", "D");
                    }
                    return buildQuestionResponse(q, order);
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("attemptId", attempt.getAttemptId());
        response.put("attemptNumber", attempt.getAttemptNumber());
        response.put("totalQuestions", questionsList.size());
        response.put("maxAttempts", quiz.getMaxAttempts());
        response.put("attemptsUsed", attempt.getAttemptNumber());
        response.put("remainingAttempts", quiz.getMaxAttempts() != null ? Math.max(0, quiz.getMaxAttempts() - attempt.getAttemptNumber()) : null);
        response.put("passingScore", quiz.getPassingScore());
        response.put("timeLimitMinutes", quiz.getTimeLimitMinutes());
        response.put("questions", questionResponses);
        response.put("resumed", true);

        return response;
    }

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

    // =========================================================================
    // QUIZ AUTHORING & QUESTION MANAGEMENT (HR_ADMIN & TRAINER ONLY)
    // =========================================================================

    public void requireQuizAuthoringPermission() {
        if (securityContextUtil == null) return;
        String role = securityContextUtil.getCurrentUserRole();
        if (role == null || (!Role.HR_ADMIN.name().equalsIgnoreCase(role) && !Role.TRAINER.name().equalsIgnoreCase(role))) {
            throw new AccessDeniedException("Only HR Admin and Trainer roles are authorized to manage quiz questions.");
        }
    }

    @Transactional
    public Map<String, Object> createQuiz(Long courseId, Long moduleId, QuizAuthoringDTO dto) {
        requireQuizAuthoringPermission();
        if (dto == null) {
            throw new IllegalArgumentException("Quiz payload is required.");
        }

        Course course = null;
        if (courseId != null && courseRepository != null) {
            course = courseRepository.findById(courseId).orElse(null);
        }
        if (course != null && Boolean.TRUE.equals(course.getFoundation())) {
            throw new IllegalStateException("Foundation courses cannot have quizzes or final assessments.");
        }
        Module module = null;
        if (moduleId != null && moduleRepository != null) {
            module = moduleRepository.findById(moduleId).orElse(null);
        }

        Quiz quiz = new Quiz();
        quiz.setQuizId(dto.getQuizId() != null && !dto.getQuizId().isBlank()
                ? dto.getQuizId()
                : "QUIZ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
        quiz.setTitle(dto.getTitle() != null && !dto.getTitle().isBlank() ? dto.getTitle().trim() : "Assessment");

        QuizType qType = QuizType.MODULE;
        if (dto.getType() != null && "FINAL".equalsIgnoreCase(dto.getType())) {
            qType = QuizType.FINAL;
        }
        quiz.setType(qType);
        quiz.setCourse(course);
        quiz.setModule(module);
        quiz.setPassingScore(dto.getPassingScore() != null ? dto.getPassingScore() : 70);
        quiz.setTimeLimitMinutes(dto.getTimeLimitMinutes());
        quiz.setMaxAttempts(dto.getMaxAttempts());
        quiz.setQuestionsPerAttempt(dto.getQuestions() != null ? dto.getQuestions().size() : 0);
        quiz.setRandomizeQuestions(dto.getRandomizeQuestions() == null || dto.getRandomizeQuestions());
        quiz.setRandomizeOptions(dto.getRandomizeOptions() == null || dto.getRandomizeOptions());
        quiz.setActive(dto.getActive() == null || dto.getActive());

        Quiz savedQuiz = quizRepository.save(quiz);

        if (dto.getQuestions() != null && !dto.getQuestions().isEmpty()) {
            for (int i = 0; i < dto.getQuestions().size(); i++) {
                addQuestionInternal(savedQuiz, dto.getQuestions().get(i), i + 1);
            }
        }

        return getQuizDetail(savedQuiz.getId());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getQuizDetail(Long quizId) {
        requireQuizAuthoringPermission();
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found with ID: " + quizId));

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", quiz.getId());
        map.put("quizId", quiz.getQuizId());
        map.put("title", quiz.getTitle());
        map.put("type", quiz.getType() != null ? quiz.getType().name() : "MODULE");
        map.put("courseId", quiz.getCourse() != null ? quiz.getCourse().getId() : null);
        map.put("moduleId", quiz.getModule() != null ? quiz.getModule().getId() : null);
        map.put("passingScore", quiz.getPassingScore());
        map.put("timeLimitMinutes", quiz.getTimeLimitMinutes());
        map.put("maxAttempts", quiz.getMaxAttempts());
        map.put("questionsPerAttempt", quiz.getQuestionsPerAttempt());
        map.put("randomizeQuestions", quiz.getRandomizeQuestions());
        map.put("randomizeOptions", quiz.getRandomizeOptions());
        map.put("active", quiz.getActive());

        List<QuizQuestion> questions = quizQuestionRepository.findByQuiz_IdOrderByOrderIndexAsc(quiz.getId());
        List<Map<String, Object>> qList = new ArrayList<>();
        for (QuizQuestion q : questions) {
            Map<String, Object> qMap = new LinkedHashMap<>();
            qMap.put("id", q.getId());
            qMap.put("questionId", q.getQuestionId());
            qMap.put("questionText", q.getQuestionText());
            qMap.put("questionType", q.getQuestionType());
            qMap.put("optionA", q.getOptionA());
            qMap.put("optionB", q.getOptionB());
            qMap.put("optionC", q.getOptionC());
            qMap.put("optionD", q.getOptionD());
            qMap.put("correctAnswer", q.getCorrectAnswer());
            qMap.put("explanation", q.getExplanation());
            qMap.put("orderIndex", q.getOrderIndex());
            qList.add(qMap);
        }
        map.put("questions", qList);
        return map;
    }

    @Transactional
    public Map<String, Object> updateQuiz(Long quizId, QuizAuthoringDTO dto) {
        requireQuizAuthoringPermission();
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found with ID: " + quizId));

        if (dto.getTitle() != null && !dto.getTitle().isBlank()) {
            quiz.setTitle(dto.getTitle().trim());
        }
        if (dto.getPassingScore() != null) {
            quiz.setPassingScore(dto.getPassingScore());
        }
        if (dto.getTimeLimitMinutes() != null) {
            quiz.setTimeLimitMinutes(dto.getTimeLimitMinutes());
        }
        quiz.setMaxAttempts(dto.getMaxAttempts());
        if (dto.getRandomizeQuestions() != null) {
            quiz.setRandomizeQuestions(dto.getRandomizeQuestions());
        }
        if (dto.getRandomizeOptions() != null) {
            quiz.setRandomizeOptions(dto.getRandomizeOptions());
        }
        if (dto.getActive() != null) {
            quiz.setActive(dto.getActive());
        }

        quizRepository.save(quiz);
        return getQuizDetail(quiz.getId());
    }

    @Transactional
    public void deleteQuiz(Long quizId) {
        requireQuizAuthoringPermission();
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found with ID: " + quizId));

        if (quizAttemptRepository.existsByQuizId(quizId)) {
            throw new IllegalStateException("Cannot delete quiz because it already contains employee attempt records.");
        }

        quizQuestionRepository.deleteByQuizId(quizId);
        quizRepository.delete(quiz);
    }

    @Transactional
    public Map<String, Object> addQuestion(Long quizId, QuizAuthoringDTO.QuizQuestionDTO dto) {
        requireQuizAuthoringPermission();
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found with ID: " + quizId));

        int nextOrder = quizQuestionRepository.findByQuiz_Id(quizId).size() + 1;
        QuizQuestion q = addQuestionInternal(quiz, dto, nextOrder);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", q.getId());
        result.put("questionId", q.getQuestionId());
        result.put("questionText", q.getQuestionText());
        result.put("questionType", q.getQuestionType());
        result.put("correctAnswer", q.getCorrectAnswer());
        result.put("orderIndex", q.getOrderIndex());
        return result;
    }

    @Transactional
    public Map<String, Object> updateQuestion(Long questionId, QuizAuthoringDTO.QuizQuestionDTO dto) {
        requireQuizAuthoringPermission();
        QuizQuestion q = quizQuestionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found with ID: " + questionId));

        if (dto.getQuestionText() != null && !dto.getQuestionText().isBlank()) {
            q.setQuestionText(dto.getQuestionText().trim());
        }
        if (dto.getQuestionType() != null && !dto.getQuestionType().isBlank()) {
            q.setQuestionType(dto.getQuestionType().trim().toUpperCase(Locale.ROOT));
        }
        if (dto.getOptionA() != null) q.setOptionA(dto.getOptionA());
        if (dto.getOptionB() != null) q.setOptionB(dto.getOptionB());
        if (dto.getOptionC() != null) q.setOptionC(dto.getOptionC());
        if (dto.getOptionD() != null) q.setOptionD(dto.getOptionD());
        if (dto.getCorrectAnswer() != null && !dto.getCorrectAnswer().isBlank()) {
            q.setCorrectAnswer(normalizeAnswerString(dto.getCorrectAnswer()));
        }
        if (dto.getExplanation() != null) {
            q.setExplanation(dto.getExplanation());
        }
        if (dto.getOrderIndex() != null) {
            q.setOrderIndex(dto.getOrderIndex());
        }

        quizQuestionRepository.save(q);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", q.getId());
        result.put("questionId", q.getQuestionId());
        result.put("questionText", q.getQuestionText());
        result.put("questionType", q.getQuestionType());
        result.put("correctAnswer", q.getCorrectAnswer());
        return result;
    }

    @Transactional
    public void deleteQuestion(Long questionId) {
        requireQuizAuthoringPermission();
        QuizQuestion q = quizQuestionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found with ID: " + questionId));
        quizQuestionRepository.delete(q);
    }

    public BulkQuestionParseResultDTO parseBulkQuestions(MultipartFile file, String pastedText) {
        requireQuizAuthoringPermission();
        if (bulkQuestionParserService == null) {
            bulkQuestionParserService = new BulkQuestionParserService();
        }
        if (file != null && !file.isEmpty()) {
            return bulkQuestionParserService.parseUploadedFile(file);
        }
        if (pastedText != null && !pastedText.isBlank()) {
            return bulkQuestionParserService.parsePastedText(pastedText);
        }
        throw new IllegalArgumentException("Either an uploaded file or pasted text must be provided.");
    }

    private QuizQuestion addQuestionInternal(Quiz quiz, QuizAuthoringDTO.QuizQuestionDTO dto, int orderIndex) {
        if (dto.getQuestionText() == null || dto.getQuestionText().isBlank()) {
            throw new IllegalArgumentException("Question text is required.");
        }
        if (dto.getCorrectAnswer() == null || dto.getCorrectAnswer().isBlank()) {
            throw new IllegalArgumentException("Correct answer is required.");
        }

        QuizQuestion q = new QuizQuestion();
        q.setQuestionId(dto.getQuestionId() != null && !dto.getQuestionId().isBlank()
                ? dto.getQuestionId()
                : "Q-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
        q.setQuestionText(dto.getQuestionText().trim());
        String qType = dto.getQuestionType() != null && !dto.getQuestionType().isBlank()
                ? dto.getQuestionType().trim().toUpperCase(Locale.ROOT)
                : "SINGLE_CHOICE";
        q.setQuestionType(qType);
        q.setOptionA(dto.getOptionA());
        q.setOptionB(dto.getOptionB());
        q.setOptionC(dto.getOptionC());
        q.setOptionD(dto.getOptionD());
        q.setCorrectAnswer(normalizeAnswerString(dto.getCorrectAnswer()));
        q.setExplanation(dto.getExplanation());
        q.setOrderIndex(dto.getOrderIndex() != null ? dto.getOrderIndex() : orderIndex);
        q.setQuiz(quiz);

        return quizQuestionRepository.save(q);
    }

    private String normalizeAnswerString(String ans) {
        if (ans == null || ans.isBlank()) return "A";
        Set<String> valid = Set.of("A", "B", "C", "D");
        List<String> list = Arrays.stream(ans.split("[,;\\s]+"))
                .map(String::trim)
                .map(s -> s.toUpperCase(Locale.ROOT))
                .filter(valid::contains)
                .distinct()
                .sorted()
                .toList();
        return list.isEmpty() ? "A" : String.join(",", list);
    }
}