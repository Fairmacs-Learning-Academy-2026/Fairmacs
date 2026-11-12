package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Employee Profile Centre Service Unit Tests")
class EmployeeProfileServiceTest {

    private UserRepository userRepository;
    private EmployeePersonalInformationRepository personalInfoRepository;
    private EmployeeEmergencyContactRepository emergencyContactRepository;
    private EmployeeDocumentRepository documentRepository;
    private EmploymentStatusRequestRepository statusRequestRepository;
    private EmploymentStatusHistoryRepository statusHistoryRepository;
    private EmployeePreferenceRepository preferenceRepository;
    private EmployeeTimelineEventRepository timelineEventRepository;
    private EnrollmentRepository enrollmentRepository;
    private CertificateRepository certificateRepository;
    private NotificationService notificationService;

    private EmployeeProfileService profileService;

    private User employeeUser;
    private User managerUser;
    private User hrAdminUser;
    private User otherDeptEmployee;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        personalInfoRepository = mock(EmployeePersonalInformationRepository.class);
        emergencyContactRepository = mock(EmployeeEmergencyContactRepository.class);
        documentRepository = mock(EmployeeDocumentRepository.class);
        statusRequestRepository = mock(EmploymentStatusRequestRepository.class);
        statusHistoryRepository = mock(EmploymentStatusHistoryRepository.class);
        preferenceRepository = mock(EmployeePreferenceRepository.class);
        timelineEventRepository = mock(EmployeeTimelineEventRepository.class);
        enrollmentRepository = mock(EnrollmentRepository.class);
        certificateRepository = mock(CertificateRepository.class);
        notificationService = new NotificationService(null, null) {
            @Override
            public int notifyDepartmentManagers(String department, String title, String message, String type, String priority, String referenceType, String referenceId, String actionUrl, String deduplicationKeyPrefix, Map<String, Object> metadata) {
                return 1;
            }
            @Override
            public int notifyHrAdmins(String title, String message, String type, String priority, String referenceType, String referenceId, String actionUrl, String deduplicationKeyPrefix, Map<String, Object> metadata) {
                return 1;
            }
            @Override
            public Notification createNotificationSafely(Long recipientId, String title, String message, String type, String priority, String referenceType, String referenceId, String actionUrl, String deduplicationKey, Map<String, Object> metadata) {
                return new Notification();
            }
        };

        profileService = new EmployeeProfileService(
                userRepository,
                personalInfoRepository,
                emergencyContactRepository,
                documentRepository,
                statusRequestRepository,
                statusHistoryRepository,
                preferenceRepository,
                timelineEventRepository,
                enrollmentRepository,
                certificateRepository,
                notificationService
        );

        employeeUser = new User();
        employeeUser.setId(101L);
        employeeUser.setEmployeeId("DEV-EMP01");
        employeeUser.setName("Dev Employee");
        employeeUser.setEmail("dev.employee@fairmacs.com");
        employeeUser.setDepartment("Operations");
        employeeUser.setDesignation("Operations Executive");
        employeeUser.setLevel("P1");
        employeeUser.setPositionBand("P1");
        employeeUser.setRole(Role.EMPLOYEE);
        employeeUser.setStatus(UserStatus.ACTIVE);
        employeeUser.setJoiningDate("2025-01-15");

        managerUser = new User();
        managerUser.setId(102L);
        managerUser.setEmployeeId("DEV-MGR01");
        managerUser.setName("Dev Manager");
        managerUser.setEmail("dev.manager@fairmacs.com");
        managerUser.setDepartment("Operations");
        managerUser.setDesignation("Operations Manager");
        managerUser.setLevel("P3");
        managerUser.setPositionBand("P3");
        managerUser.setRole(Role.MANAGER);
        managerUser.setStatus(UserStatus.ACTIVE);

        hrAdminUser = new User();
        hrAdminUser.setId(103L);
        hrAdminUser.setEmployeeId("DEV-HR01");
        hrAdminUser.setName("Dev HR Admin");
        hrAdminUser.setEmail("dev.hradmin@fairmacs.com");
        hrAdminUser.setDepartment("People Operations");
        hrAdminUser.setDesignation("HR Manager");
        hrAdminUser.setLevel("P3");
        hrAdminUser.setPositionBand("P3");
        hrAdminUser.setRole(Role.HR_ADMIN);
        hrAdminUser.setStatus(UserStatus.ACTIVE);

        otherDeptEmployee = new User();
        otherDeptEmployee.setId(104L);
        otherDeptEmployee.setEmployeeId("DEV-FIN01");
        otherDeptEmployee.setName("Dev Finance");
        otherDeptEmployee.setEmail("dev.finance@fairmacs.com");
        otherDeptEmployee.setDepartment("Finance");
        otherDeptEmployee.setDesignation("Finance Analyst");
        otherDeptEmployee.setLevel("P2");
        otherDeptEmployee.setPositionBand("P2");
        otherDeptEmployee.setRole(Role.EMPLOYEE);
        otherDeptEmployee.setStatus(UserStatus.ACTIVE);
    }

    @Test
    @DisplayName("Employee can view own profile with all 10 sections")
    void testEmployeeCanViewOwnProfile() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(employeeUser));
        when(personalInfoRepository.findByUserId(101L)).thenReturn(Optional.empty());
        when(emergencyContactRepository.findByUserIdOrderByIsPrimaryDescCreatedAtAsc(101L)).thenReturn(Collections.emptyList());
        when(statusRequestRepository.findByUserIdOrderByCreatedAtDesc(101L)).thenReturn(Collections.emptyList());
        when(statusHistoryRepository.findByUserIdOrderByEffectiveDateDescCreatedAtDesc(101L)).thenReturn(Collections.emptyList());
        when(documentRepository.findByUserIdOrderByCreatedAtDesc(101L)).thenReturn(Collections.emptyList());
        when(enrollmentRepository.findByUserId(101L)).thenReturn(Collections.emptyList());
        when(certificateRepository.findByUserId(101L)).thenReturn(Collections.emptyList());
        when(preferenceRepository.findByUserId(101L)).thenReturn(Optional.empty());
        when(timelineEventRepository.findByUserIdOrderByEventDateDescCreatedAtDesc(101L)).thenReturn(Collections.emptyList());

        Map<String, Object> profile = profileService.getEmployeeProfile(101L, employeeUser);

        assertNotNull(profile);
        assertTrue(profile.containsKey("header"));
        assertTrue(profile.containsKey("personalInfo"));
        assertTrue(profile.containsKey("emergencyContacts"));
        assertTrue(profile.containsKey("employmentInfo"));
        assertTrue(profile.containsKey("employmentStatus"));
        assertTrue(profile.containsKey("documents"));
        assertTrue(profile.containsKey("learning"));
        assertTrue(profile.containsKey("accountSecurity"));
        assertTrue(profile.containsKey("preferences"));
        assertTrue(profile.containsKey("timeline"));
        assertTrue(profile.containsKey("permissions"));

        @SuppressWarnings("unchecked")
        Map<String, Object> header = (Map<String, Object>) profile.get("header");
        assertEquals("Dev Employee", header.get("name"));
        assertEquals("DEV-EMP01", header.get("employeeId"));
        assertEquals("P1", header.get("positionBand"));
    }

    @Test
    @DisplayName("Manager can view profile in own department but cannot view other departments")
    void testManagerDepartmentScoping() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(employeeUser));
        when(userRepository.findById(104L)).thenReturn(Optional.of(otherDeptEmployee));

        // In same department (Operations): allowed
        assertDoesNotThrow(() -> profileService.getEmployeeProfile(101L, managerUser));

        // In different department (Finance): forbidden
        assertThrows(ResponseStatusException.class, () -> profileService.getEmployeeProfile(104L, managerUser));
    }

    @Test
    @DisplayName("Employee cannot view other employees' profiles")
    void testEmployeeCannotViewOtherProfiles() {
        when(userRepository.findById(104L)).thenReturn(Optional.of(otherDeptEmployee));

        assertThrows(ResponseStatusException.class, () -> profileService.getEmployeeProfile(104L, employeeUser));
    }

    @Test
    @DisplayName("HR Admin can view any employee's profile across the organization")
    void testHrAdminOrgWideAccess() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(employeeUser));
        when(userRepository.findById(104L)).thenReturn(Optional.of(otherDeptEmployee));

        assertDoesNotThrow(() -> profileService.getEmployeeProfile(101L, hrAdminUser));
        assertDoesNotThrow(() -> profileService.getEmployeeProfile(104L, hrAdminUser));
    }

    @Test
    @DisplayName("Employee can edit own personal info with valid inputs")
    void testEmployeeEditOwnPersonalInfo() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(employeeUser));
        when(personalInfoRepository.findByUserId(101L)).thenReturn(Optional.empty());
        when(personalInfoRepository.save(any(EmployeePersonalInformation.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> updates = Map.of(
                "personalEmail", "my.personal@gmail.com",
                "personalPhone", "+91 9876543210",
                "addressCity", "Chennai",
                "addressState", "Tamil Nadu"
        );

        EmployeePersonalInformation updated = profileService.updatePersonalInformation(101L, updates, employeeUser);

        assertNotNull(updated);
        assertEquals("my.personal@gmail.com", updated.getPersonalEmail());
        assertEquals("+91 9876543210", updated.getPersonalPhone());
        assertEquals("Chennai", updated.getAddressCity());
    }

    @Test
    @DisplayName("Invalid email format throws validation exception")
    void testInvalidEmailValidation() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(employeeUser));

        Map<String, Object> updates = Map.of("personalEmail", "invalid-email");

        assertThrows(IllegalArgumentException.class, () ->
                profileService.updatePersonalInformation(101L, updates, employeeUser));
    }

    @Test
    @DisplayName("Employee status request lifecycle: submit -> manager review -> HR approval")
    void testStatusRequestLifecycle() {
        when(statusRequestRepository.save(any(EmploymentStatusRequest.class))).thenAnswer(i -> {
            EmploymentStatusRequest r = i.getArgument(0);
            if (r.getId() == null) r.setId(501L);
            return r;
        });

        // 1. Employee submits status request
        Map<String, Object> submitReq = Map.of(
                "requestedStatus", "ON_LEAVE",
                "startDate", "2026-12-01",
                "endDate", "2026-12-15",
                "reason", "Annual personal leave"
        );

        EmploymentStatusRequest submitted = profileService.submitStatusRequest(submitReq, employeeUser);
        assertNotNull(submitted);
        assertEquals("PENDING_MANAGER", submitted.getRequestStatus());
        assertEquals("ON_LEAVE", submitted.getRequestedStatus());

        // 2. Manager adds recommendation
        when(statusRequestRepository.findById(501L)).thenReturn(Optional.of(submitted));
        when(userRepository.findById(101L)).thenReturn(Optional.of(employeeUser));

        EmploymentStatusRequest reviewed = profileService.managerReviewStatusRequest(
                501L, "RECOMMENDED", "Leave request has team coverage.", managerUser
        );
        assertEquals("PENDING_HR", reviewed.getRequestStatus());
        assertEquals("RECOMMENDED", reviewed.getManagerRecommendation());

        // 3. HR Admin approves
        when(statusRequestRepository.findById(501L)).thenReturn(Optional.of(reviewed));
        when(userRepository.findById(101L)).thenReturn(Optional.of(employeeUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        EmploymentStatusRequest approved = profileService.hrAdminDecideStatusRequest(
                501L, true, "Approved as per leave policy.", hrAdminUser
        );

        assertEquals("APPROVED", approved.getRequestStatus());
        assertEquals(UserStatus.ON_LEAVE, employeeUser.getStatus());
        verify(statusHistoryRepository).save(any(EmploymentStatusHistory.class));
        verify(timelineEventRepository).save(any(EmployeeTimelineEvent.class));
    }
}
