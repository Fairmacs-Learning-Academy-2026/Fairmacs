package com.fairmacs.lms.controller;

import com.fairmacs.lms.service.QuizService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/quizzes")
@CrossOrigin(origins = "*")
public class QuizController {

    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    @PostMapping("/{quizId}/start/{userId}")
    public ResponseEntity<Map<String, Object>> startQuiz(
            @PathVariable Long quizId,
            @PathVariable Long userId) {

        return ResponseEntity.ok(
                quizService.startQuiz(quizId, userId)
        );
    }

    @GetMapping("/{quizId}/unlock-status/{userId}")
    public ResponseEntity<Map<String, Object>> getQuizUnlockStatus(
            @PathVariable Long quizId,
            @PathVariable Long userId) {

        return ResponseEntity.ok(
                quizService.getQuizUnlockStatus(quizId, userId)
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