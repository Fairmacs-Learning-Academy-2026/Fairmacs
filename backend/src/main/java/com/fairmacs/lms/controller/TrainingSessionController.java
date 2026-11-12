package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.TrainingCalendarEmployeeDTO;
import com.fairmacs.lms.dto.TrainingSessionRequest;
import com.fairmacs.lms.dto.UpcomingSessionDTO;
import com.fairmacs.lms.entity.TrainingSession;
import com.fairmacs.lms.service.TrainingSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/training-calendar")
public class TrainingSessionController {
    private final TrainingSessionService service;
    public TrainingSessionController(TrainingSessionService service) { this.service = service; }

    @GetMapping
    public List<TrainingSession> getSessions() { return service.getVisibleSessions(); }

    @GetMapping("/upcoming")
    @PreAuthorize("hasAnyRole('EMPLOYEE','MANAGER','TRAINER','HR_ADMIN')")
    public List<UpcomingSessionDTO> getUpcomingSessions(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return service.getUpcomingSessions(limit);
    }

    @GetMapping("/employees")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER','MANAGER')")
    public List<TrainingCalendarEmployeeDTO> getSelectableEmployees() { return service.getSelectableEmployees(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER','MANAGER')")
    public TrainingSession create(@RequestBody TrainingSessionRequest request) { return service.create(request); }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER','MANAGER')")
    public TrainingSession update(@PathVariable Long id, @RequestBody TrainingSessionRequest request) { return service.update(id, request); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER','MANAGER')")
    public void delete(@PathVariable Long id) { service.delete(id); }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleBadRequest(IllegalArgumentException exception) {
        return Map.of("message", exception.getMessage() == null ? "Invalid training session." : exception.getMessage());
    }
}
