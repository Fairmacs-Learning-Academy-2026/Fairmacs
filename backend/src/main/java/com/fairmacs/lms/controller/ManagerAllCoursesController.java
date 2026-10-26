package com.fairmacs.lms.controller;

import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.ManagerAllCoursesService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/manager")
@CrossOrigin
public class ManagerAllCoursesController {
    private final ManagerAllCoursesService managerAllCoursesService;
    private final SecurityContextUtil securityContextUtil;

    public ManagerAllCoursesController(ManagerAllCoursesService managerAllCoursesService, SecurityContextUtil securityContextUtil) {
        this.managerAllCoursesService = managerAllCoursesService;
        this.securityContextUtil = securityContextUtil;
    }

    @GetMapping("/all-courses")
    public ResponseEntity<Map<String, Object>> getDepartmentCourses() {
        if (!securityContextUtil.hasRole(Role.MANAGER)) {
            throw new AccessDeniedException("Only managers can view department courses.");
        }
        return ResponseEntity.ok(managerAllCoursesService.getCoursesForCurrentManager());
    }
}
