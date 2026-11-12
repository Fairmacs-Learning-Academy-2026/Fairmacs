package com.fairmacs.lms.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fairmacs.lms.dto.CategoryDTO;
import com.fairmacs.lms.dto.CourseAuthoringRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.LearningDashboardDTO;
import com.fairmacs.lms.dto.LearningPathDTO;
import com.fairmacs.lms.service.CatalogService;
import com.fairmacs.lms.service.CourseAuthoringService;

@RestController
@RequestMapping("/api")
public class CourseController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CourseController.class);

    private final CatalogService catalogService;
    private final CourseAuthoringService courseAuthoringService;

    public CourseController(
            CatalogService catalogService,
            CourseAuthoringService courseAuthoringService) {
        this.catalogService = catalogService;
        this.courseAuthoringService = courseAuthoringService;
    }

    @GetMapping("/courses")
    public ResponseEntity<List<CourseDTO>> getCourses(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {

        return ResponseEntity.ok(
                catalogService.listCourses(search, category)
        );
    }

    @GetMapping("/courses/{courseCode}")
    public ResponseEntity<CourseDTO> getCourseByCode(
            @PathVariable("courseCode") String courseCode) {

        return ResponseEntity.ok(
                catalogService.getCourse(courseCode)
        );
    }

    @GetMapping("/courses/{courseId}/authoring")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<?> getCourseForEditing(
            @PathVariable("courseId") String courseId) {

        return ResponseEntity.ok(
                courseAuthoringService.getCourseForEditing(courseId)
        );
    }

    @PostMapping("/courses")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Map<String, Object>> createCourse(
            @RequestBody CourseAuthoringRequest request) {

        String courseId = courseAuthoringService.createCourse(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of(
                        "message", "Course created successfully",
                        "courseId", courseId
                )
        );
    }

    @org.springframework.web.bind.annotation.PatchMapping("/courses/{courseId}/ownership")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateCourseOwnership(
            @PathVariable("courseId") String courseId,
            @RequestBody Map<String, Object> payload) {

        Object deptIdRaw = payload != null ? payload.get("departmentId") : null;
        if (deptIdRaw == null) {
            throw new IllegalArgumentException("departmentId is required.");
        }
        Long departmentId = Long.valueOf(String.valueOf(deptIdRaw));
        CourseDTO updated = courseAuthoringService.assignCourseOwnership(courseId, departmentId);

        return ResponseEntity.ok(
                Map.of(
                        "message", "Course ownership updated successfully",
                        "course", updated
                )
        );
    }

    @DeleteMapping("/courses/{courseId}")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Map<String, Object>> deleteCourse(
            @PathVariable("courseId") String courseId) {
        try {
            courseAuthoringService.deleteCourse(courseId);
            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "Course deleted successfully",
                            "courseId", courseId
                    )
            );
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    Map.of(
                            "success", false,
                            "error", ex.getMessage(),
                            "message", ex.getMessage()
                    )
            );
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of(
                            "success", false,
                            "error", ex.getMessage(),
                            "message", ex.getMessage()
                    )
            );
        } catch (Exception ex) {
            log.error("Failed to delete course: {}", courseId, ex);
            String msg = ex.getMessage() != null && !ex.getMessage().isBlank()
                    ? ex.getMessage()
                    : "Failed to delete course due to an internal server error.";
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    Map.of(
                            "success", false,
                            "error", msg,
                            "message", msg
                    )
            );
        }
    }

    @org.springframework.web.bind.annotation.PatchMapping("/courses/{courseId}/status")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<Map<String, Object>> updateCourseStatus(
            @PathVariable("courseId") String courseId,
            @RequestBody Map<String, Object> payload) {

        boolean active = Boolean.parseBoolean(String.valueOf(payload != null ? payload.getOrDefault("active", true) : true));
        CourseDTO updated = courseAuthoringService.setCourseActive(courseId, active);

        return ResponseEntity.ok(
                Map.of(
                        "message", active ? "Course activated successfully" : "Course deactivated successfully",
                        "course", updated
                )
        );
    }

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryDTO>> getCategories() {
        return ResponseEntity.ok(
                catalogService.listCategories()
        );
    }

    @GetMapping("/learning-paths")
    public ResponseEntity<List<LearningPathDTO>> getLearningPaths() {
        return ResponseEntity.ok(
                catalogService.listLearningPaths()
        );
    }

    @GetMapping("/learning/dashboard")
    public ResponseEntity<LearningDashboardDTO> getLearningDashboard() {
        return ResponseEntity.ok(
                catalogService.getDashboard()
        );
    }
}
