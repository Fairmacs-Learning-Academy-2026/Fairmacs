package com.fairmacs.lms.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.fairmacs.lms.dto.BulkQuestionParseResultDTO;
import com.fairmacs.lms.dto.QuizAuthoringDTO;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.service.QuizService;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    private final QuizService quizService;
    private final QuizRepository quizRepository;

    public QuizController(QuizService quizService, QuizRepository quizRepository) {
        this.quizService = quizService;
        this.quizRepository = quizRepository;
    }

    /**
     * HR/Admin & Trainer preview: includes correct answers and creates no attempt.
     */
    @GetMapping("/{quizId}/preview")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Map<String, Object>> previewQuiz(
            @PathVariable Long quizId) {

        return ResponseEntity.ok(quizService.previewQuiz(quizId));
    }

    /** Lightweight quiz catalog for rendering module quizzes in the course viewer. */
    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<Map<String, Object>>> getCourseQuizzes(@PathVariable Long courseId) {
        List<Map<String, Object>> result = quizRepository.findByCourseId(courseId).stream()
                .filter(q -> Boolean.TRUE.equals(q.getActive()))
                .map(q -> {
                    Map<String, Object> item = new java.util.LinkedHashMap<>();
                    item.put("id", q.getId());
                    item.put("quizId", q.getQuizId());
                    item.put("title", q.getTitle());
                    item.put("type", q.getType().name());
                    item.put("courseId", q.getCourse().getId());
                    item.put("moduleId", q.getModule() == null ? null : q.getModule().getId());
                    item.put("moduleTitle", q.getModule() == null ? null : q.getModule().getTitle());
                    item.put("passingScore", q.getPassingScore());
                    item.put("timeLimitMinutes", q.getTimeLimitMinutes());
                    item.put("maxAttempts", q.getMaxAttempts());
                    item.put("active", q.getActive());
                    return item;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{quizId}/start")
    public ResponseEntity<Map<String, Object>> startQuiz(
            @PathVariable Long quizId) {

        return ResponseEntity.ok(
                quizService.startQuiz(quizId)
        );
    }

    @GetMapping("/{quizId}/unlock-status")
    public ResponseEntity<Map<String, Object>> getQuizUnlockStatus(
            @PathVariable Long quizId) {

        return ResponseEntity.ok(
                quizService.getQuizUnlockStatus(quizId)
        );
    }

    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitQuiz(
            @RequestBody QuizSubmissionRequest request) {

        return ResponseEntity.ok(
                quizService.submitQuiz(
                        request.getAttemptId(),
                        request.getAnswers(),
                        request.getTimeTakenSeconds()
                )
        );
    }

    // =========================================================================
    // BULK QUESTION IMPORT & QUIZ AUTHORING ENDPOINTS
    // =========================================================================

    @PostMapping(value = "/bulk-import/parse", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<BulkQuestionParseResultDTO> parseBulkFile(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(quizService.parseBulkQuestions(file, null));
    }

    @PostMapping(value = "/bulk-import/parse-text", consumes = { MediaType.APPLICATION_JSON_VALUE })
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<BulkQuestionParseResultDTO> parseBulkText(
            @RequestBody Map<String, String> payload) {
        String pastedText = payload != null ? payload.get("text") : null;
        return ResponseEntity.ok(quizService.parseBulkQuestions(null, pastedText));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Map<String, Object>> createQuiz(
            @RequestBody QuizAuthoringDTO request) {
        return ResponseEntity.ok(quizService.createQuiz(request.getCourseId(), request.getModuleId(), request));
    }

    @GetMapping("/{quizId}")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Map<String, Object>> getQuiz(
            @PathVariable Long quizId) {
        return ResponseEntity.ok(quizService.getQuizDetail(quizId));
    }

    @PutMapping("/{quizId}")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Map<String, Object>> updateQuiz(
            @PathVariable Long quizId,
            @RequestBody QuizAuthoringDTO request) {
        return ResponseEntity.ok(quizService.updateQuiz(quizId, request));
    }

    @DeleteMapping("/{quizId}")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Void> deleteQuiz(
            @PathVariable Long quizId) {
        quizService.deleteQuiz(quizId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{quizId}/questions")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Map<String, Object>> addQuestion(
            @PathVariable Long quizId,
            @RequestBody QuizAuthoringDTO.QuizQuestionDTO request) {
        return ResponseEntity.ok(quizService.addQuestion(quizId, request));
    }

    @PutMapping("/questions/{questionId}")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Map<String, Object>> updateQuestion(
            @PathVariable Long questionId,
            @RequestBody QuizAuthoringDTO.QuizQuestionDTO request) {
        return ResponseEntity.ok(quizService.updateQuestion(questionId, request));
    }

    @DeleteMapping("/questions/{questionId}")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Void> deleteQuestion(
            @PathVariable Long questionId) {
        quizService.deleteQuestion(questionId);
        return ResponseEntity.noContent().build();
    }

    public static class QuizSubmissionRequest {

        private String attemptId;
        private Map<String, String> answers;
        private Integer timeTakenSeconds;

        public QuizSubmissionRequest() {
        }

        public String getAttemptId() {
            return attemptId;
        }

        public void setAttemptId(String attemptId) {
            this.attemptId = attemptId;
        }

        public Map<String, String> getAnswers() {
            return answers;
        }

        public void setAnswers(Map<String, String> answers) {
            this.answers = answers;
        }

        public Integer getTimeTakenSeconds() {
            return timeTakenSeconds;
        }

        public void setTimeTakenSeconds(Integer timeTakenSeconds) {
            this.timeTakenSeconds = timeTakenSeconds;
        }
    }
}
