
package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.CategoryDTO;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.CourseAuthoringRequest;
import com.fairmacs.lms.dto.LearningDashboardDTO;
import com.fairmacs.lms.dto.LearningPathDTO;
import com.fairmacs.lms.service.CatalogService;
import com.fairmacs.lms.service.CourseAuthoringService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class CourseController {

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

    // Load a course by its course code for the existing course-detail page.
    @GetMapping("/courses/{courseCode}")
    public ResponseEntity<CourseDTO> getCourseByCode(
            @PathVariable("courseCode") String courseCode) {

        return ResponseEntity.ok(
                catalogService.getCourse(courseCode)
        );
    }

    // Load saved course content for the course-editing wizard.
    @GetMapping("/courses/{courseId}/authoring")
    public ResponseEntity<?> getCourseForEditing(
            @PathVariable("courseId") String courseId) {

        return ResponseEntity.ok(
                courseAuthoringService.getCourseForEditing(courseId)
        );
    }

    @PostMapping("/courses")
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
