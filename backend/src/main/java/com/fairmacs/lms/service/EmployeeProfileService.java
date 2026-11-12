package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class EmployeeProfileService {

    private static final Logger log = LoggerFactory.getLogger(EmployeeProfileService.class);

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[+0-9\\s-]{7,20}$");

    private final UserRepository userRepository;
    private final EmployeePersonalInformationRepository personalInfoRepository;
    private final EmployeeEmergencyContactRepository emergencyContactRepository;
    private final EmployeeDocumentRepository documentRepository;
    private final EmploymentStatusRequestRepository statusRequestRepository;
    private final EmploymentStatusHistoryRepository statusHistoryRepository;
    private final EmployeePreferenceRepository preferenceRepository;
    private final EmployeeTimelineEventRepository timelineEventRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CertificateRepository certificateRepository;
    private final NotificationService notificationService;

    public EmployeeProfileService(
            UserRepository userRepository,
            EmployeePersonalInformationRepository personalInfoRepository,
            EmployeeEmergencyContactRepository emergencyContactRepository,
            EmployeeDocumentRepository documentRepository,
            EmploymentStatusRequestRepository statusRequestRepository,
            EmploymentStatusHistoryRepository statusHistoryRepository,
            EmployeePreferenceRepository preferenceRepository,
            EmployeeTimelineEventRepository timelineEventRepository,
            EnrollmentRepository enrollmentRepository,
            CertificateRepository certificateRepository,
            NotificationService notificationService
    ) {
        this.userRepository = userRepository;
        this.personalInfoRepository = personalInfoRepository;
        this.emergencyContactRepository = emergencyContactRepository;
        this.documentRepository = documentRepository;
        this.statusRequestRepository = statusRequestRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.preferenceRepository = preferenceRepository;
        this.timelineEventRepository = timelineEventRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.certificateRepository = certificateRepository;
        this.notificationService = notificationService;
    }

    /**
     * Resolves target user by numeric ID or Employee ID string.
     */
    public User resolveTargetUser(String identifier) {
        if (identifier == null || identifier.isBlank() || "me".equalsIgnoreCase(identifier.trim())) {
            return null;
        }
        String trimmed = identifier.trim();
        try {
            Long id = Long.parseLong(trimmed);
            Optional<User> u = userRepository.findById(id);
            if (u.isPresent()) return u.get();
        } catch (NumberFormatException ignored) {}

        return userRepository.findByEmployeeId(trimmed)
                .or(() -> userRepository.findByEmailOrEmployeeIdIgnoreCase(trimmed))
                .orElseThrow(() -> new ResourceNotFoundException("User", "identifier", identifier));
    }

    /**
     * Enforces RBAC visibility checks.
     */
    public void validateProfileAccess(User targetUser, User actor) {
        if (actor == null || targetUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        if (actor.getRole() == Role.HR_ADMIN) {
            return; // HR Admin can view any profile
        }
        if (actor.getId().equals(targetUser.getId())) {
            return; // Any user can view their own profile
        }
        if (actor.getRole() == Role.MANAGER) {
            String actorDept = actor.getDepartment();
            String targetDept = targetUser.getDepartment();
            if (actorDept != null && targetDept != null && actorDept.trim().equalsIgnoreCase(targetDept.trim())) {
                return; // Manager can view profiles within their own department
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to employee profile.");
    }

    /**
     * Assembles all 10 sections for the Employee Profile Centre.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getEmployeeProfile(Long targetUserId, User actor) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        validateProfileAccess(targetUser, actor);

        boolean isSelf = actor.getId().equals(targetUser.getId());
        boolean isHrAdmin = actor.getRole() == Role.HR_ADMIN;
        boolean isManager = actor.getRole() == Role.MANAGER;

        // 1. Personal Information
        EmployeePersonalInformation personalInfo = personalInfoRepository.findByUserId(targetUser.getId())
                .orElse(null);

        // 2. Emergency Contacts
        List<EmployeeEmergencyContact> emergencyContacts = emergencyContactRepository
                .findByUserIdOrderByIsPrimaryDescCreatedAtAsc(targetUser.getId());

        // 3. Status Requests & History
        List<EmploymentStatusRequest> statusRequests = statusRequestRepository
                .findByUserIdOrderByCreatedAtDesc(targetUser.getId());
        List<EmploymentStatusHistory> statusHistory = statusHistoryRepository
                .findByUserIdOrderByEffectiveDateDescCreatedAtDesc(targetUser.getId());

        // 4. Documents
        List<EmployeeDocument> documents = documentRepository.findByUserIdOrderByCreatedAtDesc(targetUser.getId());

        // 5. Learning & Development metrics
        List<Enrollment> enrollments = enrollmentRepository.findByUserId(targetUser.getId());
        long totalAssignedCourses = enrollments.size();
        long inProgressCourses = enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.IN_PROGRESS || (e.getProgressPercent() != null && e.getProgressPercent() > 0 && e.getProgressPercent() < 100))
                .count();
        long completedCourses = enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED || (e.getProgressPercent() != null && e.getProgressPercent() >= 100))
                .count();
        List<Certificate> certificates = certificateRepository.findByUserId(targetUser.getId());
        long certificatesEarned = certificates.size();

        // 6. Preferences
        EmployeePreference preferences = preferenceRepository.findByUserId(targetUser.getId())
                .orElseGet(() -> {
                    EmployeePreference def = new EmployeePreference();
                    def.setUserId(targetUser.getId());
                    return def;
                });

        // 7. Timeline Events
        List<EmployeeTimelineEvent> timelineEvents = timelineEventRepository
                .findByUserIdOrderByEventDateDescCreatedAtDesc(targetUser.getId());

        List<Map<String, Object>> synthesizedTimeline = new ArrayList<>();
        // Add stored timeline events
        for (EmployeeTimelineEvent evt : timelineEvents) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "evt-" + evt.getId());
            item.put("title", evt.getTitle());
            item.put("description", evt.getDescription());
            item.put("eventDate", evt.getEventDate() != null ? evt.getEventDate().toString() : null);
            item.put("eventType", evt.getEventType());
            synthesizedTimeline.add(item);
        }
        // Add real status transition history
        for (EmploymentStatusHistory sh : statusHistory) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "sh-" + sh.getId());
            item.put("title", "Status Changed to " + sh.getNewStatus());
            item.put("description", sh.getReason() != null ? sh.getReason() : "Transition from " + sh.getPreviousStatus());
            item.put("eventDate", sh.getEffectiveDate() != null ? sh.getEffectiveDate().toString() : (sh.getCreatedAt() != null ? sh.getCreatedAt().toLocalDate().toString() : null));
            item.put("eventType", "STATUS_CHANGE");
            if (synthesizedTimeline.stream().noneMatch(x -> Objects.equals(x.get("title"), item.get("title")) && Objects.equals(x.get("eventDate"), item.get("eventDate")))) {
                synthesizedTimeline.add(item);
            }
        }
        // Add real certificates earned
        for (Certificate cert : certificates) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "cert-" + cert.getId());
            String courseTitle = cert.getCourse() != null && cert.getCourse().getTitle() != null ? cert.getCourse().getTitle() : "Course";
            item.put("title", "Earned Certification: " + courseTitle);
            item.put("description", "Certificate ID: " + (cert.getCertificateId() != null ? cert.getCertificateId() : "N/A"));
            item.put("eventDate", cert.getIssuedAt() != null ? cert.getIssuedAt().toLocalDate().toString() : null);
            item.put("eventType", "CERTIFICATE");
            synthesizedTimeline.add(item);
        }
        // Add genuine joining date milestone if recorded in DB
        if (targetUser.getJoiningDate() != null && !targetUser.getJoiningDate().isBlank()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "joining-" + targetUser.getId());
            item.put("title", "Joined Fairmacs");
            item.put("description", "Commenced employment as " + (targetUser.getDesignation() != null ? targetUser.getDesignation() : "Employee")
                    + " in " + (targetUser.getDepartment() != null ? targetUser.getDepartment() : "Operations") + ".");
            item.put("eventDate", targetUser.getJoiningDate());
            item.put("eventType", "JOINING");
            synthesizedTimeline.add(item);
        }

        // Sort timeline descending by date
        synthesizedTimeline.sort((a, b) -> {
            String da = (String) a.get("eventDate");
            String db = (String) b.get("eventDate");
            if (da == null && db == null) return 0;
            if (da == null) return 1;
            if (db == null) return -1;
            return db.compareTo(da);
        });

        // Calculate profile completion percentage
        int completionPercent = calculateProfileCompletion(targetUser, personalInfo, emergencyContacts);

        // Reporting Manager details
        Map<String, Object> managerInfo = null;
        if (targetUser.getReportingManagerId() != null) {
            Optional<User> mgr = userRepository.findById(targetUser.getReportingManagerId());
            if (mgr.isPresent()) {
                managerInfo = Map.of(
                        "id", mgr.get().getId(),
                        "employeeId", mgr.get().getEmployeeId() != null ? mgr.get().getEmployeeId() : "",
                        "name", mgr.get().getName() != null ? mgr.get().getName() : "",
                        "email", mgr.get().getEmail() != null ? mgr.get().getEmail() : "",
                        "designation", mgr.get().getDesignation() != null ? mgr.get().getDesignation() : "Manager"
                );
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();

        // Section 1: Profile Header
        Map<String, Object> headerMap = new LinkedHashMap<>();
        headerMap.put("id", targetUser.getId());
        headerMap.put("employeeId", targetUser.getEmployeeId());
        headerMap.put("name", targetUser.getName());
        headerMap.put("designation", targetUser.getDesignation() != null ? targetUser.getDesignation() : "Not provided");
        headerMap.put("department", targetUser.getDepartment() != null ? targetUser.getDepartment() : "Not provided");
        headerMap.put("status", targetUser.getStatus() != null ? targetUser.getStatus().name() : "ACTIVE");
        headerMap.put("positionBand", targetUser.getPositionBand() != null ? targetUser.getPositionBand() : "P1");
        headerMap.put("profileCompletion", completionPercent);
        headerMap.put("profileCompletionPercentage", completionPercent);
        headerMap.put("role", targetUser.getRole() != null ? targetUser.getRole().name() : "EMPLOYEE");
        headerMap.put("roleLabel", targetUser.getRoleLabel() != null ? targetUser.getRoleLabel() : "Employee");
        response.put("header", headerMap);

        // Section 2: Personal Information (with aliases for all field names)
        Map<String, Object> personalInfoMap = new LinkedHashMap<>();
        personalInfoMap.put("fullName", targetUser.getName());
        personalInfoMap.put("personalEmail", personalInfo != null && personalInfo.getPersonalEmail() != null ? personalInfo.getPersonalEmail() : "");
        personalInfoMap.put("personalPhone", personalInfo != null && personalInfo.getPersonalPhone() != null ? personalInfo.getPersonalPhone() : "");
        personalInfoMap.put("mobileNumber", personalInfo != null && personalInfo.getPersonalPhone() != null ? personalInfo.getPersonalPhone() : "");
        personalInfoMap.put("dateOfBirth", personalInfo != null && personalInfo.getDateOfBirth() != null ? personalInfo.getDateOfBirth().toString() : "");
        personalInfoMap.put("gender", personalInfo != null && personalInfo.getGender() != null ? personalInfo.getGender() : "");
        personalInfoMap.put("bloodGroup", personalInfo != null && personalInfo.getBloodGroup() != null ? personalInfo.getBloodGroup() : "");
        personalInfoMap.put("addressHouse", personalInfo != null && personalInfo.getAddressHouse() != null ? personalInfo.getAddressHouse() : "");
        personalInfoMap.put("addressLine1", personalInfo != null && personalInfo.getAddressHouse() != null ? personalInfo.getAddressHouse() : "");
        personalInfoMap.put("addressStreet", personalInfo != null && personalInfo.getAddressStreet() != null ? personalInfo.getAddressStreet() : "");
        personalInfoMap.put("addressLine2", personalInfo != null && personalInfo.getAddressStreet() != null ? personalInfo.getAddressStreet() : "");
        personalInfoMap.put("addressCity", personalInfo != null && personalInfo.getAddressCity() != null ? personalInfo.getAddressCity() : "");
        personalInfoMap.put("city", personalInfo != null && personalInfo.getAddressCity() != null ? personalInfo.getAddressCity() : "");
        personalInfoMap.put("addressState", personalInfo != null && personalInfo.getAddressState() != null ? personalInfo.getAddressState() : "");
        personalInfoMap.put("state", personalInfo != null && personalInfo.getAddressState() != null ? personalInfo.getAddressState() : "");
        personalInfoMap.put("addressCountry", personalInfo != null && personalInfo.getAddressCountry() != null ? personalInfo.getAddressCountry() : "India");
        personalInfoMap.put("country", personalInfo != null && personalInfo.getAddressCountry() != null ? personalInfo.getAddressCountry() : "India");
        personalInfoMap.put("addressPincode", personalInfo != null && personalInfo.getAddressPincode() != null ? personalInfo.getAddressPincode() : "");
        personalInfoMap.put("postalCode", personalInfo != null && personalInfo.getAddressPincode() != null ? personalInfo.getAddressPincode() : "");
        response.put("personalInfo", personalInfoMap);
        response.put("personalInformation", personalInfoMap);

        // Section 3: Emergency Contacts
        response.put("emergencyContacts", emergencyContacts);

        // Section 4: Employment Information
        Map<String, Object> employmentInfoMap = new LinkedHashMap<>();
        employmentInfoMap.put("employeeId", targetUser.getEmployeeId() != null ? targetUser.getEmployeeId() : "Not provided");
        employmentInfoMap.put("officialEmail", targetUser.getEmail());
        employmentInfoMap.put("department", targetUser.getDepartment() != null ? targetUser.getDepartment() : "Not provided");
        employmentInfoMap.put("designation", targetUser.getDesignation() != null ? targetUser.getDesignation() : "Not provided");
        employmentInfoMap.put("jobLevel", targetUser.getLevel() != null ? targetUser.getLevel() : "Not provided");
        employmentInfoMap.put("positionBand", targetUser.getPositionBand() != null ? targetUser.getPositionBand() : "P1");
        employmentInfoMap.put("joiningDate", targetUser.getJoiningDate() != null ? targetUser.getJoiningDate() : "Not provided");
        employmentInfoMap.put("employmentType", targetUser.getEmploymentType() != null ? targetUser.getEmploymentType() : "Full-time");
        String rawBranch = (targetUser.getBranch() != null && !targetUser.getBranch().isBlank())
                ? targetUser.getBranch().trim()
                : null;
        employmentInfoMap.put("branch", rawBranch);
        employmentInfoMap.put("officeLocation", rawBranch);
        employmentInfoMap.put("reportingManager", managerInfo);
        response.put("employmentInfo", employmentInfoMap);

        // Section 5: Employment Status & Workflow
        Map<String, Object> statusMap = new LinkedHashMap<>();
        statusMap.put("currentStatus", targetUser.getStatus() != null ? targetUser.getStatus().name() : "ACTIVE");
        statusMap.put("activeRequest", statusRequests.stream()
                .filter(r -> "PENDING_MANAGER".equals(r.getRequestStatus()) || "PENDING_HR".equals(r.getRequestStatus()))
                .findFirst().orElse(null));
        statusMap.put("requests", statusRequests);
        statusMap.put("history", statusHistory);
        response.put("employmentStatus", statusMap);
        response.put("statusWorkflow", statusMap);

        // Section 6: My Documents
        response.put("documents", documents);

        // Section 7: Learning & Development (calculated genuinely from real course durations)
        double totalHours = 0.0;
        for (Enrollment e : enrollments) {
            double courseHours = 0.0;
            if (e.getCourse() != null) {
                if (e.getCourse().getDurationHours() != null && e.getCourse().getDurationHours() > 0) {
                    courseHours = e.getCourse().getDurationHours();
                } else if (e.getCourse().getDuration() != null) {
                    courseHours = parseDurationToHours(e.getCourse().getDuration());
                }
            }
            if (courseHours > 0) {
                if (e.getStatus() == EnrollmentStatus.COMPLETED) {
                    totalHours += courseHours;
                } else if (e.getStatus() == EnrollmentStatus.IN_PROGRESS && e.getProgressPercent() != null) {
                    totalHours += (courseHours * (e.getProgressPercent() / 100.0));
                }
            }
        }
        double roundedHours = Math.round(totalHours * 10.0) / 10.0;

        Map<String, Object> learningMap = new LinkedHashMap<>();
        learningMap.put("totalAssignedCourses", totalAssignedCourses);
        learningMap.put("assignedCourses", totalAssignedCourses);
        learningMap.put("inProgressCourses", inProgressCourses);
        learningMap.put("completedCourses", completedCourses);
        learningMap.put("certificatesEarned", certificatesEarned);
        learningMap.put("learningHours", roundedHours);
        learningMap.put("totalLearningHours", roundedHours);
        learningMap.put("certificates", certificates);
        response.put("learning", learningMap);
        response.put("learningDevelopment", learningMap);

        // Section 8: Account & Security
        Map<String, Object> accountSecurityMap = new LinkedHashMap<>();
        accountSecurityMap.put("loginEmail", targetUser.getEmail());
        accountSecurityMap.put("createdAt", targetUser.getCreatedAt());
        accountSecurityMap.put("passwordChangedAt", targetUser.getPasswordChangedAt());
        accountSecurityMap.put("mustChangePassword", Boolean.TRUE.equals(targetUser.getMustChangePassword()));
        accountSecurityMap.put("failedLoginAttempts", targetUser.getFailedLoginAttempts());
        response.put("accountSecurity", accountSecurityMap);

        // Section 9: Preferences
        response.put("preferences", preferences);

        // Section 10: Timeline
        response.put("timeline", synthesizedTimeline);
        response.put("timelineEvents", synthesizedTimeline);

        // Top-level convenience accessors
        response.put("id", targetUser.getId());
        response.put("userId", targetUser.getId());
        response.put("employeeId", targetUser.getEmployeeId());
        response.put("fullName", targetUser.getName());
        response.put("officialEmail", targetUser.getEmail());
        response.put("department", targetUser.getDepartment());
        response.put("designation", targetUser.getDesignation());
        response.put("employmentStatus", targetUser.getStatus() != null ? targetUser.getStatus().name() : "ACTIVE");
        response.put("positionBand", targetUser.getPositionBand());
        response.put("branch", rawBranch);
        response.put("officeLocation", rawBranch);
        response.put("profileCompletionPercentage", completionPercent);
        response.put("reportingManager", managerInfo);

        // Permissions flag metadata for UI controls
        response.put("permissions", Map.of(
                "isSelf", isSelf,
                "canEditPersonalInfo", isSelf || isHrAdmin,
                "canEditEmploymentDetails", isHrAdmin,
                "canManageEmergencyContact", isSelf || isHrAdmin,
                "canSubmitStatusRequest", isSelf && targetUser.getStatus() == UserStatus.ACTIVE,
                "canReviewStatusRequest", isManager || isHrAdmin,
                "canApproveStatusRequest", isHrAdmin,
                "canDirectChangeStatus", isHrAdmin,
                "canUploadDocuments", isSelf || isManager || isHrAdmin,
                "canDeleteDocuments", isHrAdmin
        ));

        return response;
    }

    /**
     * Updates personal and address information with validations and RBAC.
     */
    @Transactional
    public EmployeePersonalInformation updatePersonalInformation(Long targetUserId, Map<String, Object> request, User actor) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        if (!actor.getId().equals(targetUser.getId()) && actor.getRole() != Role.HR_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to edit this profile's personal information.");
        }

        EmployeePersonalInformation info = personalInfoRepository.findByUserId(targetUserId)
                .orElseGet(() -> {
                    EmployeePersonalInformation newInfo = new EmployeePersonalInformation();
                    newInfo.setUserId(targetUserId);
                    return newInfo;
                });

        // HR-controlled legal name update
        if (actor.getRole() == Role.HR_ADMIN) {
            String newName = request.get("fullName") != null ? String.valueOf(request.get("fullName")).trim()
                    : (request.get("name") != null ? String.valueOf(request.get("name")).trim() : null);
            if (newName != null && !newName.isBlank() && !newName.equals(targetUser.getName())) {
                targetUser.setName(newName);
                userRepository.save(targetUser);
            }
        }

        if (request.containsKey("personalEmail")) {
            String email = request.get("personalEmail") != null ? String.valueOf(request.get("personalEmail")).trim() : "";
            if (!email.isEmpty() && !EMAIL_PATTERN.matcher(email).matches()) {
                throw new IllegalArgumentException("Invalid personal email format.");
            }
            info.setPersonalEmail(email);
        }

        if (request.containsKey("personalPhone") || request.containsKey("mobileNumber")) {
            Object phoneObj = request.get("personalPhone") != null ? request.get("personalPhone") : request.get("mobileNumber");
            String phone = phoneObj != null ? String.valueOf(phoneObj).trim() : "";
            if (!phone.isEmpty() && !PHONE_PATTERN.matcher(phone).matches()) {
                throw new IllegalArgumentException("Invalid personal phone number format.");
            }
            info.setPersonalPhone(phone);
        }

        if (request.containsKey("dateOfBirth")) {
            String dob = request.get("dateOfBirth") != null ? String.valueOf(request.get("dateOfBirth")).trim() : "";
            if (!dob.isEmpty()) {
                try {
                    info.setDateOfBirth(LocalDate.parse(dob));
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException("Invalid Date of Birth. Format must be YYYY-MM-DD.");
                }
            } else {
                info.setDateOfBirth(null);
            }
        }

        if (request.containsKey("gender")) {
            info.setGender(request.get("gender") != null ? String.valueOf(request.get("gender")).trim() : null);
        }
        if (request.containsKey("bloodGroup")) {
            info.setBloodGroup(request.get("bloodGroup") != null ? String.valueOf(request.get("bloodGroup")).trim() : null);
        }
        if (request.containsKey("addressHouse") || request.containsKey("addressLine1")) {
            Object val = request.get("addressHouse") != null ? request.get("addressHouse") : request.get("addressLine1");
            info.setAddressHouse(val != null ? String.valueOf(val).trim() : null);
        }
        if (request.containsKey("addressStreet") || request.containsKey("addressLine2")) {
            Object val = request.get("addressStreet") != null ? request.get("addressStreet") : request.get("addressLine2");
            info.setAddressStreet(val != null ? String.valueOf(val).trim() : null);
        }
        if (request.containsKey("addressCity") || request.containsKey("city")) {
            Object val = request.get("addressCity") != null ? request.get("addressCity") : request.get("city");
            info.setAddressCity(val != null ? String.valueOf(val).trim() : null);
        }
        if (request.containsKey("addressState") || request.containsKey("state")) {
            Object val = request.get("addressState") != null ? request.get("addressState") : request.get("state");
            info.setAddressState(val != null ? String.valueOf(val).trim() : null);
        }
        if (request.containsKey("addressCountry") || request.containsKey("country")) {
            Object val = request.get("addressCountry") != null ? request.get("addressCountry") : request.get("country");
            info.setAddressCountry(val != null ? String.valueOf(val).trim() : "India");
        }
        if (request.containsKey("addressPincode") || request.containsKey("postalCode")) {
            Object val = request.get("addressPincode") != null ? request.get("addressPincode") : request.get("postalCode");
            info.setAddressPincode(val != null ? String.valueOf(val).trim() : null);
        }

        EmployeePersonalInformation saved = personalInfoRepository.save(info);
        log.info("Updated personal information for user id={}", targetUserId);
        return saved;
    }

    /**
     * Adds or updates an emergency contact.
     */
    @Transactional
    public EmployeeEmergencyContact addOrUpdateEmergencyContact(Long targetUserId, Map<String, Object> request, User actor) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        if (!actor.getId().equals(targetUser.getId()) && actor.getRole() != Role.HR_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permission denied to modify emergency contact.");
        }

        String contactName = request.get("contactName") != null ? String.valueOf(request.get("contactName")).trim()
                : (request.get("name") != null ? String.valueOf(request.get("name")).trim() : "");
        String relationship = request.get("relationship") != null ? String.valueOf(request.get("relationship")).trim() : "";
        String primaryPhone = request.get("primaryPhone") != null ? String.valueOf(request.get("primaryPhone")).trim() : "";
        String alternatePhone = request.get("alternatePhone") != null ? String.valueOf(request.get("alternatePhone")).trim()
                : (request.get("secondaryPhone") != null ? String.valueOf(request.get("secondaryPhone")).trim() : "");
        boolean isPrimary = request.get("isPrimary") == null || Boolean.TRUE.equals(request.get("isPrimary"));

        if (contactName.isBlank()) throw new IllegalArgumentException("Contact person name is required.");
        if (relationship.isBlank()) throw new IllegalArgumentException("Relationship is required.");
        if (primaryPhone.isBlank() || !PHONE_PATTERN.matcher(primaryPhone).matches()) {
            throw new IllegalArgumentException("A valid primary phone number is required.");
        }
        if (!alternatePhone.isBlank() && !PHONE_PATTERN.matcher(alternatePhone).matches()) {
            throw new IllegalArgumentException("Invalid alternate phone number.");
        }

        Long contactId = request.get("id") != null && !(request.get("id") instanceof String s && s.isBlank())
                ? Long.valueOf(String.valueOf(request.get("id")))
                : null;

        EmployeeEmergencyContact contact;
        if (contactId != null) {
            contact = emergencyContactRepository.findById(contactId)
                    .orElseThrow(() -> new ResourceNotFoundException("EmergencyContact", "id", contactId));
            if (!contact.getUserId().equals(targetUserId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Contact does not belong to specified user.");
            }
        } else {
            contact = new EmployeeEmergencyContact();
            contact.setUserId(targetUserId);
        }

        contact.setContactName(contactName);
        contact.setRelationship(relationship);
        contact.setPrimaryPhone(primaryPhone);
        contact.setAlternatePhone(alternatePhone.isBlank() ? null : alternatePhone);
        contact.setIsPrimary(isPrimary);

        // Ensure only one contact is primary per employee
        if (isPrimary) {
            List<EmployeeEmergencyContact> existing = emergencyContactRepository.findByUserIdOrderByIsPrimaryDescCreatedAtAsc(targetUserId);
            for (EmployeeEmergencyContact c : existing) {
                if ((contactId == null || !c.getId().equals(contactId)) && Boolean.TRUE.equals(c.getIsPrimary())) {
                    c.setIsPrimary(false);
                    emergencyContactRepository.save(c);
                }
            }
        }

        return emergencyContactRepository.save(contact);
    }

    @Transactional
    public void deleteEmergencyContact(Long contactId, User actor) {
        EmployeeEmergencyContact contact = emergencyContactRepository.findById(contactId)
                .orElseThrow(() -> new ResourceNotFoundException("EmergencyContact", "id", contactId));

        if (!actor.getId().equals(contact.getUserId()) && actor.getRole() != Role.HR_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permission denied to delete emergency contact.");
        }

        emergencyContactRepository.delete(contact);
    }

    /**
     * Updates user preferences.
     */
    @Transactional
    public EmployeePreference updatePreferences(Long targetUserId, Map<String, Object> request, User actor) {
        if (!actor.getId().equals(targetUserId) && actor.getRole() != Role.HR_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permission denied to update preferences.");
        }

        EmployeePreference pref = preferenceRepository.findByUserId(targetUserId)
                .orElseGet(() -> {
                    EmployeePreference p = new EmployeePreference();
                    p.setUserId(targetUserId);
                    return p;
                });

        if (request.containsKey("emailNotifications")) {
            pref.setEmailNotifications(Boolean.TRUE.equals(request.get("emailNotifications")));
        }
        if (request.containsKey("inAppNotifications")) {
            pref.setInAppNotifications(Boolean.TRUE.equals(request.get("inAppNotifications")));
        }
        if (request.containsKey("assignmentAlerts") || request.containsKey("certificateAlerts")) {
            Object v = request.get("assignmentAlerts") != null ? request.get("assignmentAlerts") : request.get("certificateAlerts");
            pref.setAssignmentAlerts(Boolean.TRUE.equals(v));
        }
        if (request.containsKey("courseReminders") || request.containsKey("statusChangeAlerts")) {
            Object v = request.get("courseReminders") != null ? request.get("courseReminders") : request.get("statusChangeAlerts");
            pref.setCourseReminders(Boolean.TRUE.equals(v));
        }
        if (request.containsKey("theme")) {
            pref.setTheme(String.valueOf(request.get("theme")).trim());
        }
        if (request.containsKey("language")) {
            pref.setLanguage(String.valueOf(request.get("language")).trim());
        }

        return preferenceRepository.save(pref);
    }

    /**
     * Submits an employment status change request.
     */
    @Transactional
    public EmploymentStatusRequest submitStatusRequest(Map<String, Object> request, User actor) {
        String requestedStatus = request.get("requestedStatus") != null
                ? String.valueOf(request.get("requestedStatus")).trim().toUpperCase()
                : "";
        String reason = request.get("reason") != null
                ? String.valueOf(request.get("reason")).trim()
                : "";
        String startDateStr = request.get("startDate") != null
                ? String.valueOf(request.get("startDate")).trim()
                : (request.get("effectiveStartDate") != null ? String.valueOf(request.get("effectiveStartDate")).trim() : "");
        String endDateStr = request.get("endDate") != null
                ? String.valueOf(request.get("endDate")).trim()
                : (request.get("effectiveEndDate") != null ? String.valueOf(request.get("effectiveEndDate")).trim() : "");
        String supportingDocFileId = request.get("supportingDocumentFileId") != null
                ? String.valueOf(request.get("supportingDocumentFileId")).trim()
                : (request.get("documentUrl") != null ? String.valueOf(request.get("documentUrl")).trim() : null);
        String supportingDocName = request.get("supportingDocumentName") != null
                ? String.valueOf(request.get("supportingDocumentName")).trim()
                : null;

        if (requestedStatus.isEmpty() || (!requestedStatus.equals("ON_LEAVE") && !requestedStatus.equals("INACTIVE") && !requestedStatus.equals("TERMINATED") && !requestedStatus.equals("ACTIVE"))) {
            throw new IllegalArgumentException("Requested status must be ACTIVE, ON_LEAVE, INACTIVE, or TERMINATED.");
        }
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("A reason is required for status change requests.");
        }

        LocalDate startDate;
        if (startDateStr.isEmpty() || "immediate".equalsIgnoreCase(startDateStr)) {
            startDate = LocalDate.now();
        } else {
            try {
                startDate = LocalDate.parse(startDateStr);
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Invalid start date format. Must be YYYY-MM-DD.");
            }
        }

        LocalDate endDate = null;
        if (!endDateStr.isEmpty() && !"indefinite".equalsIgnoreCase(endDateStr)) {
            try {
                endDate = LocalDate.parse(endDateStr);
                if (endDate.isBefore(startDate)) {
                    throw new IllegalArgumentException("End date cannot be earlier than start date.");
                }
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Invalid end date format. Must be YYYY-MM-DD.");
            }
        }

        EmploymentStatusRequest req = new EmploymentStatusRequest();
        req.setUserId(actor.getId());
        req.setEmployeeId(actor.getEmployeeId());
        req.setRequestedStatus(requestedStatus);
        req.setCurrentStatus(actor.getStatus().name());
        req.setStartDate(startDate);
        req.setEndDate(endDate);
        req.setReason(reason);
        req.setSupportingDocumentFileId(supportingDocFileId);
        req.setSupportingDocumentName(supportingDocName);
        req.setRequestStatus("PENDING_MANAGER");

        EmploymentStatusRequest saved = statusRequestRepository.save(req);

        // Notify department managers
        if (actor.getDepartment() != null && !actor.getDepartment().isBlank()) {
            notificationService.notifyDepartmentManagers(
                    actor.getDepartment(),
                    "Status Change Request Submitted",
                    actor.getName() + " has requested a status change to " + requestedStatus + " effective " + startDate + ".",
                    NotificationType.SYSTEM_ALERT,
                    NotificationPriority.HIGH,
                    "STATUS_REQUEST",
                    String.valueOf(saved.getId()),
                    "/profile",
                    "STATUS_REQ:" + saved.getId(),
                    Map.of("requestId", saved.getId(), "employeeId", actor.getEmployeeId())
            );
        }

        // Notify HR Admins
        notificationService.notifyHrAdmins(
                "New Employment Status Request",
                actor.getName() + " (" + actor.getDepartment() + ") requested " + requestedStatus + ".",
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.HIGH,
                "STATUS_REQUEST",
                String.valueOf(saved.getId()),
                "/profile",
                "STATUS_REQ_HR:" + saved.getId(),
                Map.of("requestId", saved.getId(), "employeeId", actor.getEmployeeId())
        );

        log.info("Created employment status request id={} for user={}", saved.getId(), actor.getEmployeeId());
        return saved;
    }

    /**
     * Manager review and recommendation on status request.
     */
    @Transactional
    public EmploymentStatusRequest managerReviewStatusRequest(Long requestId, String recommendation, String comment, User manager) {
        EmploymentStatusRequest req = statusRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("StatusRequest", "id", requestId));

        User employee = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", req.getUserId()));

        if (manager.getRole() != Role.HR_ADMIN) {
            if (manager.getRole() != Role.MANAGER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Managers or HR Admins can review requests.");
            }
            if (manager.getDepartment() == null || !manager.getDepartment().equalsIgnoreCase(employee.getDepartment())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Managers can only review requests for their department.");
            }
        }

        String rawRec = recommendation != null ? recommendation.trim().toUpperCase() : "RECOMMENDED";
        String rec = (rawRec.contains("NOT") || rawRec.contains("REJECT") || rawRec.contains("OPPOSE")) ? "NOT_RECOMMENDED" : "RECOMMENDED";

        req.setManagerId(manager.getId());
        req.setManagerRecommendation(rec);
        req.setManagerComment(comment != null ? comment.trim() : null);
        req.setManagerReviewedAt(LocalDateTime.now());
        req.setRequestStatus("PENDING_HR");

        EmploymentStatusRequest saved = statusRequestRepository.save(req);

        // Notify HR Admins that manager has reviewed
        notificationService.notifyHrAdmins(
                "Manager Reviewed Status Request",
                manager.getName() + " marked request for " + employee.getName() + " as " + rec + ".",
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.NORMAL,
                "STATUS_REQUEST",
                String.valueOf(saved.getId()),
                "/profile",
                "MGR_REV:" + saved.getId(),
                Map.of("requestId", saved.getId(), "recommendation", rec)
        );

        return saved;
    }

    /**
     * HR Admin decision on status request (Approve or Reject).
     */
    @Transactional
    public EmploymentStatusRequest hrAdminDecideStatusRequest(Long requestId, boolean approve, String comment, User hrAdmin) {
        if (hrAdmin.getRole() != Role.HR_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only HR/Admin can approve or reject status requests.");
        }

        EmploymentStatusRequest req = statusRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("StatusRequest", "id", requestId));

        User employee = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", req.getUserId()));

        req.setHrAdminId(hrAdmin.getId());
        req.setHrAdminComment(comment != null ? comment.trim() : null);
        req.setHrReviewedAt(LocalDateTime.now());

        if (approve) {
            req.setRequestStatus("APPROVED");

            String prevStatus = employee.getStatus().name();
            String newStatusStr = req.getRequestedStatus();
            UserStatus newStatus = UserStatus.valueOf(newStatusStr);

            // Update employee's official status
            employee.setStatus(newStatus);
            userRepository.save(employee);

            // Create status history record
            EmploymentStatusHistory history = new EmploymentStatusHistory();
            history.setUserId(employee.getId());
            history.setEmployeeId(employee.getEmployeeId());
            history.setPreviousStatus(prevStatus);
            history.setNewStatus(newStatusStr);
            history.setChangedByUserId(hrAdmin.getId());
            history.setStatusRequestId(req.getId());
            history.setEffectiveDate(req.getStartDate());
            history.setReason(req.getReason());
            history.setComments(comment);
            statusHistoryRepository.save(history);

            // Create timeline event
            EmployeeTimelineEvent event = new EmployeeTimelineEvent();
            event.setUserId(employee.getId());
            event.setEmployeeId(employee.getEmployeeId());
            event.setEventType("STATUS_CHANGE");
            event.setTitle("Status Changed to " + newStatusStr);
            event.setDescription("Employment status transitioned from " + prevStatus + " to " + newStatusStr + ". Approved by HR.");
            event.setEventDate(req.getStartDate());
            timelineEventRepository.save(event);

            // In-app notification to employee
            notificationService.createNotificationSafely(
                    employee.getId(),
                    "Employment Status Updated",
                    "Your status change request to " + newStatusStr + " has been approved by HR.",
                    NotificationType.SYSTEM_ALERT,
                    NotificationPriority.HIGH,
                    "STATUS_REQUEST",
                    String.valueOf(req.getId()),
                    "/profile",
                    "STATUS_APPROVED:" + req.getId(),
                    Map.of("status", newStatusStr)
            );

        } else {
            req.setRequestStatus("REJECTED");

            // In-app notification to employee
            notificationService.createNotificationSafely(
                    employee.getId(),
                    "Status Request Not Approved",
                    "Your status change request was not approved. " + (comment != null && !comment.isBlank() ? "Note: " + comment : ""),
                    NotificationType.SYSTEM_ALERT,
                    NotificationPriority.NORMAL,
                    "STATUS_REQUEST",
                    String.valueOf(req.getId()),
                    "/profile",
                    "STATUS_REJECTED:" + req.getId(),
                    Map.of("status", req.getRequestedStatus())
            );
        }

        return statusRequestRepository.save(req);
    }

    /**
     * HR Admin direct employment status update.
     */
    @Transactional
    public User hrAdminDirectStatusChange(String employeeId, String newStatusStr, String reason, String comment, User hrAdmin) {
        return hrAdminDirectStatusChange(employeeId, null, newStatusStr, reason, comment, hrAdmin);
    }

    @Transactional
    public User hrAdminDirectStatusChange(String employeeId, Long targetUserId, String newStatusStr, String reason, String comment, User hrAdmin) {
        if (hrAdmin.getRole() != Role.HR_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only HR/Admin can directly update employment status.");
        }

        User employee;
        if (employeeId != null && !employeeId.isBlank()) {
            employee = userRepository.findByEmployeeId(employeeId)
                    .or(() -> {
                        try {
                            return userRepository.findById(Long.parseLong(employeeId));
                        } catch (NumberFormatException e) {
                            return Optional.empty();
                        }
                    })
                    .orElseThrow(() -> new ResourceNotFoundException("User", "employeeId", employeeId));
        } else if (targetUserId != null) {
            employee = userRepository.findById(targetUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));
        } else {
            throw new IllegalArgumentException("Employee ID or User ID is required.");
        }

        UserStatus newStatus;
        try {
            newStatus = UserStatus.valueOf(newStatusStr.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status: " + newStatusStr);
        }

        String prevStatus = employee.getStatus().name();
        if (prevStatus.equals(newStatus.name())) {
            return employee;
        }

        employee.setStatus(newStatus);
        User saved = userRepository.save(employee);

        // Record history
        EmploymentStatusHistory history = new EmploymentStatusHistory();
        history.setUserId(employee.getId());
        history.setEmployeeId(employee.getEmployeeId());
        history.setPreviousStatus(prevStatus);
        history.setNewStatus(newStatus.name());
        history.setChangedByUserId(hrAdmin.getId());
        history.setEffectiveDate(LocalDate.now());
        history.setReason(reason != null && !reason.isBlank() ? reason : "Direct HR update");
        history.setComments(comment);
        statusHistoryRepository.save(history);

        // Record timeline event
        EmployeeTimelineEvent event = new EmployeeTimelineEvent();
        event.setUserId(employee.getId());
        event.setEmployeeId(employee.getEmployeeId());
        event.setEventType("STATUS_CHANGE");
        event.setTitle("Status Changed to " + newStatus.name());
        event.setDescription("Employment status updated to " + newStatus.name() + " by HR Admin (" + hrAdmin.getName() + ").");
        event.setEventDate(LocalDate.now());
        timelineEventRepository.save(event);

        // Notify employee
        notificationService.createNotificationSafely(
                employee.getId(),
                "Employment Status Changed",
                "Your employment status has been changed to " + newStatus.name() + " by HR Operations.",
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.HIGH,
                "EMPLOYMENT_STATUS",
                String.valueOf(employee.getId()),
                "/profile",
                "DIRECT_STATUS:" + employee.getId() + ":" + System.currentTimeMillis(),
                Map.of("newStatus", newStatus.name())
        );

        return saved;
    }

    /**
     * Calculates profile completion percentage based on completeness of basic, personal, and address fields.
     */
    private int calculateProfileCompletion(User user, EmployeePersonalInformation personalInfo, List<EmployeeEmergencyContact> contacts) {
        int totalWeight = 10;
        int completed = 0;

        if (user.getName() != null && !user.getName().isBlank()) completed++;
        if (user.getEmail() != null && !user.getEmail().isBlank()) completed++;
        if (user.getDepartment() != null && !user.getDepartment().isBlank()) completed++;
        if (user.getDesignation() != null && !user.getDesignation().isBlank()) completed++;

        if (personalInfo != null) {
            if (personalInfo.getPersonalEmail() != null && !personalInfo.getPersonalEmail().isBlank()) completed++;
            if (personalInfo.getPersonalPhone() != null && !personalInfo.getPersonalPhone().isBlank()) completed++;
            if (personalInfo.getDateOfBirth() != null) completed++;
            if (personalInfo.getAddressStreet() != null && !personalInfo.getAddressStreet().isBlank()) completed++;
            if (personalInfo.getAddressCity() != null && !personalInfo.getAddressCity().isBlank()) completed++;
        }

        if (contacts != null && !contacts.isEmpty()) completed++;

        return Math.min(100, Math.max(10, (completed * 100) / totalWeight));
    }

    private double parseDurationToHours(String duration) {
        if (duration == null || duration.isBlank()) return 0.0;
        String clean = duration.trim().toLowerCase(Locale.ROOT);
        double hours = 0.0;
        try {
            java.util.regex.Matcher hm = java.util.regex.Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*(?:h|hr|hour)").matcher(clean);
            if (hm.find()) {
                hours += Double.parseDouble(hm.group(1));
            }
            java.util.regex.Matcher mm = java.util.regex.Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*(?:m|min|minute)").matcher(clean);
            if (mm.find()) {
                hours += (Double.parseDouble(mm.group(1)) / 60.0);
            }
            if (hours == 0.0) {
                hours = Double.parseDouble(clean);
            }
        } catch (Exception ignored) {}
        return hours;
    }
}
