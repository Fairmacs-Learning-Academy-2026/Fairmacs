package com.fairmacs.lms.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fairmacs.lms.dto.ManagerReportDTO;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.ManagerReportService;

@RestController
@RequestMapping("/api/manager/reports")
public class ManagerReportController {

    private final ManagerReportService managerReportService;
    private final SecurityContextUtil securityContextUtil;

    @Autowired
    public ManagerReportController(
            ManagerReportService managerReportService,
            SecurityContextUtil securityContextUtil
    ) {
        this.managerReportService = managerReportService;
        this.securityContextUtil = securityContextUtil;
    }

    public ManagerReportController(ManagerReportService managerReportService) {
        this(managerReportService, null);
    }

    @GetMapping("/{managerId}")
    @PreAuthorize("hasAnyRole('MANAGER','HR_ADMIN')")
    public ResponseEntity<ManagerReportDTO> getManagerReports(
            @PathVariable Long managerId
    ) {
        if (securityContextUtil != null) {
            Long currentUserId = securityContextUtil.getCurrentUserId();
            String currentRole = securityContextUtil.getCurrentUserRole();

            if (currentUserId == null || currentRole == null) {
                throw new SecurityException("Authentication is required.");
            }

            if (!Role.HR_ADMIN.name().equalsIgnoreCase(currentRole)) {
                if (!Role.MANAGER.name().equalsIgnoreCase(currentRole) || !currentUserId.equals(managerId)) {
                    throw new SecurityException("Managers may only view their own department report.");
                }
            }
        }

        return ResponseEntity.ok(
                managerReportService.getManagerReport(managerId)
        );
    }
}
