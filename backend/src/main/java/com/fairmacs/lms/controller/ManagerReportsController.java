package com.fairmacs.lms.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fairmacs.lms.dto.EmployeeTrainingTranscriptDTO;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.ManagerReportsService;

@RestController
@RequestMapping("/api/manager/reports")
public class ManagerReportsController {

    private final ManagerReportsService managerReportsService;
    private final SecurityContextUtil securityContextUtil;
    private final UserRepository userRepository;

    @Autowired
    public ManagerReportsController(
            ManagerReportsService managerReportsService,
            SecurityContextUtil securityContextUtil,
            UserRepository userRepository
    ) {
        this.managerReportsService = managerReportsService;
        this.securityContextUtil = securityContextUtil;
        this.userRepository = userRepository;
    }

    public ManagerReportsController(ManagerReportsService managerReportsService) {
        this(managerReportsService, null, null);
    }

    @GetMapping("/employee/{userId}")
    @PreAuthorize("hasAnyRole('EMPLOYEE','MANAGER','TRAINER','HR_ADMIN')")
    public ResponseEntity<EmployeeTrainingTranscriptDTO> getEmployeeTrainingTranscript(
            @PathVariable Long userId
    ) {
        if (securityContextUtil != null) {
            Long currentUserId = securityContextUtil.getCurrentUserId();
            String currentRole = securityContextUtil.getCurrentUserRole();

            if (currentUserId == null || currentRole == null) {
                throw new SecurityException("Authentication is required.");
            }

            boolean isHrOrTrainer = Role.HR_ADMIN.name().equalsIgnoreCase(currentRole)
                    || Role.TRAINER.name().equalsIgnoreCase(currentRole);
            boolean isSelf = currentUserId.equals(userId);

            if (!isHrOrTrainer && !isSelf) {
                if (Role.MANAGER.name().equalsIgnoreCase(currentRole)) {
                    User manager = securityContextUtil.getCurrentUser();
                    User target = userRepository != null
                            ? userRepository.findById(userId)
                                    .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", userId))
                            : null;
                    if (manager == null
                            || target == null
                            || manager.getDepartment() == null
                            || !departmentMatches(manager.getDepartment(), target.getDepartment())) {
                        throw new SecurityException(
                                "Managers may only view transcripts for employees in their own department."
                        );
                    }
                } else {
                    throw new SecurityException("You are not authorized to view another employee's transcript.");
                }
            }
        }

        return ResponseEntity.ok(
                managerReportsService.getEmployeeTrainingTranscript(userId)
        );
    }

    private boolean departmentMatches(String deptA, String deptB) {
        if (deptA == null || deptA.isBlank() || deptB == null || deptB.isBlank()) {
            return false;
        }
        return canonicalizeDepartment(deptA).equalsIgnoreCase(canonicalizeDepartment(deptB));
    }

    private String canonicalizeDepartment(String dept) {
        String trimmed = dept == null ? "" : dept.trim();
        if (trimmed.equalsIgnoreCase("Human Resource")
                || trimmed.equalsIgnoreCase("Human Resources")
                || trimmed.equalsIgnoreCase("People Operations")
                || trimmed.equalsIgnoreCase("HR")) {
            return "People Operations";
        }
        if (trimmed.equalsIgnoreCase("General")
                || trimmed.equalsIgnoreCase("General / Common")
                || trimmed.equalsIgnoreCase("All Departments")) {
            return "General";
        }
        return trimmed;
    }
}
