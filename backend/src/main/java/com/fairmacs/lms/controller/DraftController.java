package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.CourseAuthoringRequest;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.service.CourseAuthoringService;
import com.fairmacs.lms.service.DraftService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/drafts")
@PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
public class DraftController {

    private final DraftService draftService;

    private final CourseAuthoringService courseAuthoringService;

    public DraftController(DraftService draftService, CourseAuthoringService courseAuthoringService) {
        this.draftService = draftService;
        this.courseAuthoringService = courseAuthoringService;
    }

    @GetMapping("/hr")
    public ResponseEntity<List<Map<String, Object>>> getHrDrafts() {
        List<Map<String, Object>> result = draftService.getMyDrafts()
                .stream().map(this::toDraftSummary).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getMyDrafts() {
        List<Map<String, Object>> result = draftService.getMyDrafts()
                .stream()
                .map(this::toDraftSummary)
                .toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{courseId}")
    public ResponseEntity<Map<String, Object>> getMyDraft(@PathVariable String courseId) {

        Course draft = draftService.getMyDraft(courseId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("courseId", draft.getCourseId());
        response.put("title", draft.getTitle());
        response.put("draftPayload", draft.getDraftPayload());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{courseId}")
    public ResponseEntity<Map<String, Object>> deleteDraft(
            @PathVariable String courseId) {

        draftService.deleteMyDraft(courseId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "Draft deleted successfully.");
        response.put("courseId", courseId);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/cleanup")
    public ResponseEntity<Map<String, Object>> cleanupMyDrafts() {
        int deletedCount = draftService.cleanupMyDrafts();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "Your drafts were deleted successfully.");
        response.put("deletedCount", deletedCount);

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> toDraftSummary(Course course) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", course.getCourseId());
        result.put("courseId", course.getCourseId());
        result.put("dbId", course.getId());
        result.put("title", course.getTitle());
        result.put("description", course.getDescription());
        String pos = course.getLevel();
        if (pos != null && pos.trim().toUpperCase().matches("L[0-4]")) {
            pos = "P" + pos.trim().toUpperCase().charAt(1);
        }
        result.put("level", pos);
        result.put("position", pos);
        result.put("duration", course.getDuration());
        result.put("durationHours", course.getDurationHours());
        result.put("banner", course.getBanner());
        result.put("foundation", Boolean.TRUE.equals(course.getFoundation()));
        result.put("draft", Boolean.TRUE.equals(course.getDraft()));
        result.put("active", Boolean.TRUE.equals(course.getActive()));
        if (course.getOwningDepartment() != null) {
            result.put("departmentId", course.getOwningDepartment().getId());
            result.put("departmentName", course.getOwningDepartment().getName());
            result.put("department", course.getOwningDepartment().getName());
        }
        if (course.getCreatedBy() != null) {
            result.put("createdById", course.getCreatedBy().getId());
            result.put("createdByName", course.getCreatedBy().getName());
            result.put("createdByRole", course.getCreatedBy().getRole() != null ? course.getCreatedBy().getRole().name() : null);
        }
        result.put("createdAt", course.getCreatedAt());
        result.put("updatedAt", course.getUpdatedAt());
        return result;
    }

    @PutMapping("/{courseId}")
    public ResponseEntity<Map<String, Object>> updateDraft(
            @PathVariable String courseId,
            @RequestBody CourseAuthoringRequest request) {

        String savedCourseId =
                courseAuthoringService.updateDraft(courseId, request);

        return ResponseEntity.ok(Map.of(
                "message", Boolean.TRUE.equals(request.getPublish())
                        ? "Course published successfully"
                        : "Draft updated successfully",
                "courseId", savedCourseId
        ));
    }
}
