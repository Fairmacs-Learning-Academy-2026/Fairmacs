package com.fairmacs.lms.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fairmacs.lms.entity.QuizProgress;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.QuizProgressRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;

@RestController
@RequestMapping("/api/quiz-progress")
public class QuizProgressController {

    private final QuizProgressRepository quizProgressRepository;
    private final SecurityContextUtil securityContextUtil;
    private final UserRepository userRepository;

    @Autowired
    public QuizProgressController(
            QuizProgressRepository quizProgressRepository,
            SecurityContextUtil securityContextUtil,
            UserRepository userRepository
    ) {
        this.quizProgressRepository = quizProgressRepository;
        this.securityContextUtil = securityContextUtil;
        this.userRepository = userRepository;
    }

    /**
     * Get the progress of one employee for one quiz.
     * Enforces strict ownership and department/role scoping and returns a safe DTO.
     */
    @GetMapping("/{quizId}/{userId}")
    public ResponseEntity<Map<String, Object>> getProgress(
            @PathVariable Long quizId,
            @PathVariable Long userId
    ) {
        verifyAccess(userId);

        return quizProgressRepository
                .findByQuizIdAndUserId(quizId, userId)
                .map(this::toDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Get all quiz progress records for an employee.
     * Enforces strict ownership and department/role scoping and returns safe DTOs.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Map<String, Object>>> getUserProgress(
            @PathVariable Long userId
    ) {
        verifyAccess(userId);

        List<Map<String, Object>> result = quizProgressRepository.findByUserId(userId)
                .stream()
                .map(this::toDto)
                .toList();

        return ResponseEntity.ok(result);
    }

    private void verifyAccess(Long targetUserId) {
        if (targetUserId == null) {
            throw new IllegalArgumentException("User ID is required.");
        }

        Long currentUserId = securityContextUtil != null ? securityContextUtil.getCurrentUserId() : null;
        String currentRole = securityContextUtil != null ? securityContextUtil.getCurrentUserRole() : null;

        if (currentUserId == null || currentRole == null) {
            throw new SecurityException("Authentication is required to access quiz progress.");
        }

        if (Role.HR_ADMIN.name().equalsIgnoreCase(currentRole)
                || Role.TRAINER.name().equalsIgnoreCase(currentRole)) {
            return;
        }

        if (targetUserId.equals(currentUserId)) {
            return;
        }

        if (Role.MANAGER.name().equalsIgnoreCase(currentRole)) {
            User currentUser = securityContextUtil.getCurrentUser();
            User targetUser = userRepository != null
                    ? userRepository.findById(targetUserId)
                            .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId))
                    : null;

            if (currentUser != null
                    && targetUser != null
                    && currentUser.getDepartment() != null
                    && currentUser.getDepartment().equalsIgnoreCase(targetUser.getDepartment())) {
                return;
            }
            throw new SecurityException("Managers may only view quiz progress for employees in their own department.");
        }

        throw new SecurityException("You are not authorized to view another employee's quiz progress.");
    }

    private Map<String, Object> toDto(QuizProgress progress) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", progress.getId());
        dto.put("quizId", progress.getQuiz() != null ? progress.getQuiz().getId() : null);
        dto.put("userId", progress.getUser() != null ? progress.getUser().getId() : null);
        dto.put("attemptsUsed", progress.getAttemptsUsed());
        dto.put("bestScore", progress.getBestScore());
        dto.put("passed", progress.getPassed());
        dto.put("passingAttemptNumber", progress.getPassingAttemptNumber());
        dto.put("passedAt", progress.getPassedAt());
        dto.put("updatedAt", progress.getUpdatedAt());
        return dto;
    }
}
