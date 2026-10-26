package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.TrainingCalendarEmployeeDTO;
import com.fairmacs.lms.dto.TrainingSessionRequest;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.TrainingSession;
import com.fairmacs.lms.entity.TrainingSessionTargetType;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.TrainingSessionRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class TrainingSessionService {
    private final TrainingSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SecurityContextUtil securityContextUtil;

    public TrainingSessionService(TrainingSessionRepository sessionRepository, UserRepository userRepository, SecurityContextUtil securityContextUtil) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.securityContextUtil = securityContextUtil;
    }

    @Transactional(readOnly = true)
    public List<TrainingSession> getVisibleSessions() {
        User current = securityContextUtil.getCurrentUser();
        if (current.getRole() == Role.HR_ADMIN || current.getRole() == Role.TRAINER || current.getRole() == Role.MANAGER) {
            return sessionRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "date", "id"));
        }
        return sessionRepository.findVisibleSessions(current.getId(), current.getDepartment());
    }

    @Transactional(readOnly = true)
    public List<TrainingCalendarEmployeeDTO> getSelectableEmployees() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.EMPLOYEE)
                .map(u -> new TrainingCalendarEmployeeDTO(u.getId(), u.getEmployeeId(), u.getName(), u.getDepartment(), u.getDesignation()))
                .collect(Collectors.toList());
    }

    @Transactional
    public TrainingSession create(TrainingSessionRequest request) {
        validate(request);
        User current = securityContextUtil.getCurrentUser();
        TrainingSession session = new TrainingSession();
        applyRequest(session, request);
        session.setCreatedByUserId(current.getId());
        session.setCreatedByName(current.getName());
        return sessionRepository.save(session);
    }

    @Transactional
    public TrainingSession update(Long id, TrainingSessionRequest request) {
        validate(request);
        TrainingSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Training session not found."));
        applyRequest(session, request);
        return sessionRepository.save(session);
    }

    @Transactional
    public void delete(Long id) {
        if (!sessionRepository.existsById(id)) throw new IllegalArgumentException("Training session not found.");
        sessionRepository.deleteById(id);
    }

    private void validate(TrainingSessionRequest request) {
        if (request == null) throw new IllegalArgumentException("Session details are required.");
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) throw new IllegalArgumentException("Session title is required.");
        if (request.getDate() == null) throw new IllegalArgumentException("Session date is required.");
        if (request.getTargetType() == null) request.setTargetType(TrainingSessionTargetType.ALL);
        switch (request.getTargetType()) {
            case DEPARTMENT:
                if (request.getDepartment() == null || request.getDepartment().trim().isEmpty() || "All Departments".equalsIgnoreCase(request.getDepartment().trim()))
                    throw new IllegalArgumentException("Select a department for a department-specific session.");
                request.setTargetUserIds(List.of());
                break;
            case EMPLOYEES:
                if (request.getTargetUserIds() == null || request.getTargetUserIds().isEmpty()) throw new IllegalArgumentException("Select at least one employee.");
                List<Long> ids = request.getTargetUserIds().stream().filter(Objects::nonNull).distinct().collect(Collectors.toList());
                long validEmployees = userRepository.findAllById(ids).stream().filter(u -> u.getRole() == Role.EMPLOYEE).count();
                if (validEmployees != ids.size()) throw new IllegalArgumentException("One or more selected employee IDs are invalid.");
                request.setTargetUserIds(ids);
                request.setDepartment(null);
                break;
            case ALL:
                request.setDepartment(null);
                request.setTargetUserIds(List.of());
                break;
            default: throw new IllegalArgumentException("Unsupported session audience.");
        }
    }

    private void applyRequest(TrainingSession session, TrainingSessionRequest request) {
        session.setTitle(request.getTitle().trim());
        session.setDate(request.getDate());
        session.setTime(blankToNull(request.getTime()));
        session.setTrainer(blankToNull(request.getTrainer()));
        session.setTargetType(request.getTargetType());
        session.setDepartment(blankToNull(request.getDepartment()));
        session.setTargetUserIds(request.getTargetUserIds());
        session.setLocation(blankToNull(request.getLocation()));
        session.setType(blankToNull(request.getType()) == null ? "Workshop" : request.getType().trim());
    }

    private String blankToNull(String value) { return value == null || value.trim().isEmpty() ? null : value.trim(); }
}
