package com.fairmacs.lms.controller;

import com.fairmacs.lms.service.QuizService;
import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.entity.Quiz;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.Map;

@RestController
@RequestMapping("/api/quizzes")
@CrossOrigin(origins = "*")
public class QuizController {

    private final QuizService quizService;
    private final QuizRepository quizRepository;

    public QuizController(QuizService quizService, QuizRepository quizRepository) {
        this.quizService = quizService;
        this.quizRepository = quizRepository;
    }

    /**
 * HR/Admin preview: includes correct answers and creates no attempt.
 */
    @GetMapping("/{quizId}/preview")
    @PreAuthorize("hasRole('HR_ADMIN')")
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