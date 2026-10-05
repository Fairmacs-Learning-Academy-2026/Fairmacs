package com.fairmacs.lms.controller;

import com.fairmacs.lms.entity.QuizProgress;
import com.fairmacs.lms.repository.QuizProgressRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quiz-progress")
@CrossOrigin(origins = "*")
public class QuizProgressController {

    private final QuizProgressRepository quizProgressRepository;

    public QuizProgressController(
            QuizProgressRepository quizProgressRepository
    ) {
        this.quizProgressRepository = quizProgressRepository;
    }

    /**
     * Get the progress of one employee for one quiz.
     *
     * Example:
     * GET /api/quiz-progress/1/5
     *
     * 1 = quiz ID
     * 5 = user ID
     */
    @GetMapping("/{quizId}/{userId}")
    public ResponseEntity<QuizProgress> getProgress(
            @PathVariable Long quizId,
            @PathVariable Long userId
    ) {

        return quizProgressRepository
                .findByQuizIdAndUserId(quizId, userId)
                .map(ResponseEntity::ok)
                .orElseGet(
                        () -> ResponseEntity.notFound().build()
                );
    }

    /**
     * Get all quiz progress records for an employee.
     *
     * Example:
     * GET /api/quiz-progress/user/5
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<QuizProgress>> getUserProgress(
            @PathVariable Long userId
    ) {

        return ResponseEntity.ok(
                quizProgressRepository.findByUserId(userId)
        );
    }
}