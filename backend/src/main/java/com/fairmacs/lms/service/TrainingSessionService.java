package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.TrainingCalendarEmployeeDTO;
import com.fairmacs.lms.dto.TrainingSessionRequest;
import com.fairmacs.lms.dto.UpcomingSessionDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.repository.TrainingSessionRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class TrainingSessionService {
    private final TrainingSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SecurityContextUtil securityContextUtil;
    private final NotificationService notificationService;

    public TrainingSessionService(
            TrainingSessionRepository sessionRepository,
            UserRepository userRepository,
            SecurityContextUtil securityContextUtil
    ) {
        this(sessionRepository, userRepository, securityContextUtil, null);
    }

    @Autowired
    public TrainingSessionService(
            TrainingSessionRepository sessionRepository,
            UserRepository userRepository,
            SecurityContextUtil securityContextUtil,
            NotificationService notificationService
    ) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.securityContextUtil = securityContextUtil;
        this.notificationService = notificationService;
    }

    private static final Pattern HTTP_URL_PATTERN = Pattern.compile("(https?://\\S+)");

    @Transactional(readOnly = true)
    public List<TrainingSession> getVisibleSessions() {
        User current = securityContextUtil.getCurrentUser();
        if (current.getRole() == Role.HR_ADMIN || current.getRole() == Role.TRAINER || current.getRole() == Role.MANAGER) {
            return sessionRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "date", "id"));
        }
        return sessionRepository.findVisibleSessions(current.getId(), current.getDepartment());
    }

    @Transactional(readOnly = true)
    public List<UpcomingSessionDTO> getUpcomingSessions(int limit) {
        int safeLimit = limit <= 0 ? 10 : Math.min(limit, 50);
        User current = securityContextUtil != null ? securityContextUtil.getCurrentUser() : null;
        if (current == null) {
            return List.of();
        }

        LocalDate today = LocalDate.now();
        List<TrainingSession> allSessions = sessionRepository.findAll(
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "date", "id")
        );

        // Exclude past, cancelled, or completed sessions
        List<TrainingSession> upcomingCandidates = allSessions.stream()
                .filter(Objects::nonNull)
                .filter(s -> s.getDate() != null && !s.getDate().isBefore(today))
                .filter(s -> !isCancelledOrCompletedSession(s))
                .toList();

        // Pre-resolve department employees for MANAGER scoping and trainer ownership for TRAINER scoping
        Set<Long> managerDeptEmployeeIds = Set.of();
        if (current.getRole() == Role.MANAGER && current.getDepartment() != null && !current.getDepartment().isBlank()) {
            String mgrDept = current.getDepartment();
            managerDeptEmployeeIds = userRepository.findAll().stream()
                    .filter(u -> u != null && u.getRole() == Role.EMPLOYEE && u.getStatus() == UserStatus.ACTIVE)
                    .filter(u -> departmentMatches(u.getDepartment(), mgrDept))
                    .map(User::getId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
        }

        boolean trainerHasDirectSessions = false;
        if (current.getRole() == Role.TRAINER) {
            trainerHasDirectSessions = upcomingCandidates.stream()
                    .anyMatch(s -> isDirectlyAssignedToTrainer(s, current));
        }

        final Set<Long> finalManagerDeptEmployeeIds = managerDeptEmployeeIds;
        final boolean finalTrainerHasDirectSessions = trainerHasDirectSessions;

        return upcomingCandidates.stream()
                .filter(s -> isSessionInRoleScope(s, current, finalManagerDeptEmployeeIds, finalTrainerHasDirectSessions))
                .sorted(Comparator
                        .comparing(TrainingSession::getDate)
                        .thenComparing(s -> s.getTime() != null ? s.getTime() : "")
                        .thenComparing(s -> s.getId() != null ? s.getId() : 0L))
                .limit(safeLimit)
                .map(s -> toUpcomingSessionDTO(s, today))
                .collect(Collectors.toList());
    }

    private boolean isCancelledOrCompletedSession(TrainingSession session) {
        return containsCancelledOrCompletedMarker(session.getType())
                || containsCancelledOrCompletedMarker(session.getTitle())
                || containsCancelledOrCompletedMarker(session.getLocation());
    }

    private boolean containsCancelledOrCompletedMarker(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String normalized = text.trim().toUpperCase(Locale.ROOT);
        return normalized.equals("CANCELLED")
                || normalized.equals("CANCELED")
                || normalized.equals("COMPLETED")
                || normalized.contains("[CANCELLED]")
                || normalized.contains("[CANCELED]")
                || normalized.contains("[COMPLETED]")
                || normalized.contains("(CANCELLED)")
                || normalized.contains("(CANCELED)")
                || normalized.contains("(COMPLETED)");
    }

    private boolean isDirectlyAssignedToTrainer(TrainingSession session, User trainer) {
        if (session == null || trainer == null) {
            return false;
        }
        if (trainer.getId() != null && Objects.equals(session.getCreatedByUserId(), trainer.getId())) {
            return true;
        }
        if (trainer.getName() != null && !trainer.getName().isBlank()) {
            String trainerName = trainer.getName().trim();
            if (session.getTrainer() != null && session.getTrainer().trim().equalsIgnoreCase(trainerName)) {
                return true;
            }
            if (session.getCreatedByName() != null && session.getCreatedByName().trim().equalsIgnoreCase(trainerName)) {
                return true;
            }
        }
        return false;
    }

    private boolean isSessionInRoleScope(
            TrainingSession session,
            User current,
            Set<Long> managerDeptEmployeeIds,
            boolean trainerHasDirectSessions
    ) {
        if (session == null || current == null || current.getRole() == null) {
            return false;
        }
        Role role = current.getRole();
        if (role == Role.HR_ADMIN) {
            return true;
        }

        TrainingSessionTargetType targetType = session.getTargetType() != null
                ? session.getTargetType()
                : TrainingSessionTargetType.ALL;

        if (role == Role.EMPLOYEE) {
            if (targetType == TrainingSessionTargetType.ALL) {
                return true;
            }
            if (targetType == TrainingSessionTargetType.DEPARTMENT) {
                return departmentMatches(session.getDepartment(), current.getDepartment());
            }
            if (targetType == TrainingSessionTargetType.EMPLOYEES) {
                return session.getTargetUserIds() != null
                        && current.getId() != null
                        && session.getTargetUserIds().contains(current.getId());
            }
            return false;
        }

        if (role == Role.MANAGER) {
            if (current.getId() != null && Objects.equals(session.getCreatedByUserId(), current.getId())) {
                return true;
            }
            if (targetType == TrainingSessionTargetType.ALL) {
                return true;
            }
            if (targetType == TrainingSessionTargetType.DEPARTMENT) {
                return departmentMatches(session.getDepartment(), current.getDepartment());
            }
            if (targetType == TrainingSessionTargetType.EMPLOYEES) {
                if (session.getTargetUserIds() == null || session.getTargetUserIds().isEmpty()) {
                    return false;
                }
                return session.getTargetUserIds().stream().anyMatch(managerDeptEmployeeIds::contains);
            }
            return false;
        }

        if (role == Role.TRAINER) {
            if (isDirectlyAssignedToTrainer(session, current)) {
                return true;
            }
            if (trainerHasDirectSessions) {
                return false;
            }
            // If trainer has no direct sessions yet, allow unassigned/organization-wide sessions
            // that are not assigned to a different specific trainer name
            if (session.getTrainer() == null || session.getTrainer().isBlank()) {
                return true;
            }
            return false;
        }

        return false;
    }

    private boolean departmentMatches(String deptA, String deptB) {
        if (deptA == null || deptA.isBlank() || deptB == null || deptB.isBlank()) {
            return false;
        }
        String canonicalA = canonicalizeDepartment(deptA);
        String canonicalB = canonicalizeDepartment(deptB);
        return canonicalA.equalsIgnoreCase(canonicalB);
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

    private UpcomingSessionDTO toUpcomingSessionDTO(TrainingSession session, LocalDate today) {
        String rawTime = session.getTime() != null ? session.getTime().trim() : null;
        String startTime = null;
        String endTime = null;
        if (rawTime != null && !rawTime.isEmpty()) {
            String[] parts = rawTime.split("\\s*[-–]\\s*", 2);
            startTime = parts[0].trim();
            if (parts.length > 1 && !parts[1].trim().isEmpty()) {
                endTime = parts[1].trim();
            }
        }

        String status = session.getDate() != null && session.getDate().isEqual(today)
                ? "TODAY"
                : "UPCOMING";

        String trainerName = (session.getTrainer() != null && !session.getTrainer().isBlank())
                ? session.getTrainer().trim()
                : ((session.getCreatedByName() != null && !session.getCreatedByName().isBlank())
                        ? session.getCreatedByName().trim()
                        : "TBA");

        String joinUrl = extractJoinUrl(session.getLocation());

        return new UpcomingSessionDTO(
                session.getId(),
                session.getTitle(),
                trainerName,
                session.getDate(),
                rawTime,
                startTime,
                endTime,
                status,
                session.getType() != null && !session.getType().isBlank() ? session.getType() : "Workshop",
                session.getDepartment() != null && !session.getDepartment().isBlank() ? session.getDepartment() : "All Departments",
                session.getLocation(),
                joinUrl
        );
    }

    private String extractJoinUrl(String location) {
        if (location == null || location.isBlank()) {
            return null;
        }
        Matcher matcher = HTTP_URL_PATTERN.matcher(location.trim());
        if (matcher.find()) {
            String url = matcher.group(1);
            while (url.endsWith(")") || url.endsWith(",") || url.endsWith(".")) {
                url = url.substring(0, url.length() - 1);
            }
            return url;
        }
        return null;
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
        TrainingSession saved = sessionRepository.save(session);
        notifySessionParticipantsAndTrainer(saved, false);
        return saved;
    }

    @Transactional
    public TrainingSession update(Long id, TrainingSessionRequest request) {
        validate(request);
        TrainingSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Training session not found."));
        applyRequest(session, request);
        TrainingSession saved = sessionRepository.save(session);
        notifySessionParticipantsAndTrainer(saved, true);
        return saved;
    }

    @Transactional
    public void delete(Long id) {
        if (!sessionRepository.existsById(id)) throw new IllegalArgumentException("Training session not found.");
        sessionRepository.deleteById(id);
    }

    private void notifySessionParticipantsAndTrainer(TrainingSession session, boolean isUpdate) {
        if (notificationService == null || session == null) {
            return;
        }

        String actionWord = isUpdate ? "Updated" : "Scheduled";
        String timeInfo = session.getTime() != null ? " at " + session.getTime() : "";
        String locInfo = session.getLocation() != null ? " (" + session.getLocation() + ")" : "";

        // Notify matching trainers if trainer name matches an active TRAINER user
        if (session.getTrainer() != null && !session.getTrainer().isBlank()) {
            List<User> trainers = userRepository.findByRoleAndStatus(Role.TRAINER, UserStatus.ACTIVE);
            for (User trainer : trainers) {
                if (trainer.getName() != null
                        && trainer.getName().trim().equalsIgnoreCase(session.getTrainer().trim())) {
                    String trainerDedupKey = isUpdate
                            ? String.format("TRAINING_SESSION:UPDATE:SES:%d:DATE:%s:TIME:%s:LOC:%s:TRN:%d",
                                    session.getId(), session.getDate(), session.getTime() != null ? session.getTime() : "",
                                    session.getLocation() != null ? session.getLocation() : "", trainer.getId())
                            : String.format("TRAINING_SESSION:CREATE:SES:%d:TRN:%d",
                                    session.getId(), trainer.getId());

                    notificationService.createNotificationSafely(
                            trainer.getId(),
                            "Training Session " + actionWord + ": " + session.getTitle(),
                            String.format(
                                    "You are assigned as trainer for \"%s\" on %s%s%s.",
                                    session.getTitle(),
                                    session.getDate(),
                                    timeInfo,
                                    locInfo
                            ),
                            NotificationType.TRAINER_ACTION_REQUIRED,
                            NotificationPriority.NORMAL,
                            "TRAINING_SESSION",
                            String.valueOf(session.getId()),
                            "/calendar",
                            trainerDedupKey,
                            Map.of(
                                    "sessionId", session.getId(),
                                    "date", session.getDate().toString()
                            )
                    );
                }
            }
        }

        // Notify targeted employees
        List<User> targetEmployees;
        if (session.getTargetType() == TrainingSessionTargetType.EMPLOYEES
                && session.getTargetUserIds() != null) {
            targetEmployees = userRepository.findAllById(session.getTargetUserIds());
        } else if (session.getTargetType() == TrainingSessionTargetType.DEPARTMENT
                && session.getDepartment() != null) {
            targetEmployees = userRepository.findByDepartmentIgnoreCaseAndRole(
                    session.getDepartment(),
                    Role.EMPLOYEE
            );
        } else {
            targetEmployees = userRepository.findByRoleAndStatus(Role.EMPLOYEE, UserStatus.ACTIVE);
        }

        for (User emp : targetEmployees) {
            if (emp.getStatus() != null && emp.getStatus() != UserStatus.ACTIVE) {
                continue;
            }
            String empDedupKey = isUpdate
                    ? String.format("TRAINING_SESSION:UPDATE:SES:%d:DATE:%s:TIME:%s:LOC:%s:EMP:%d",
                            session.getId(), session.getDate(), session.getTime() != null ? session.getTime() : "",
                            session.getLocation() != null ? session.getLocation() : "", emp.getId())
                    : String.format("TRAINING_SESSION:CREATE:SES:%d:EMP:%d",
                            session.getId(), emp.getId());

            notificationService.createNotificationSafely(
                    emp.getId(),
                    "Training Session " + actionWord + ": " + session.getTitle(),
                    String.format(
                            "A %s training session \"%s\" has been %s for %s%s%s.",
                            session.getType() != null ? session.getType() : "Workshop",
                            session.getTitle(),
                            actionWord.toLowerCase(),
                            session.getDate(),
                            timeInfo,
                            locInfo
                    ),
                    NotificationType.GENERAL_ANNOUNCEMENT,
                    NotificationPriority.NORMAL,
                    "TRAINING_SESSION",
                    String.valueOf(session.getId()),
                    "/calendar",
                    empDedupKey,
                    Map.of(
                            "sessionId", session.getId(),
                            "date", session.getDate().toString()
                    )
            );
        }
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
