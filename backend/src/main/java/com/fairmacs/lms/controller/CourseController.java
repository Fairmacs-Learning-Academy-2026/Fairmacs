package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.CategoryDTO;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.LearningDashboardDTO;
import com.fairmacs.lms.dto.LearningPathDTO;
import com.fairmacs.lms.service.CatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class CourseController {

    private final CatalogService catalogService;

    public CourseController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/courses")
    public ResponseEntity<List<CourseDTO>> getCourses(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(
                catalogService.listCourses(search, category)
        );
    }

    @GetMapping("/courses/{courseCode}")
    public ResponseEntity<CourseDTO> getCourse(
            @PathVariable String courseCode
    ) {
        return ResponseEntity.ok(
                catalogService.getCourse(courseCode)
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