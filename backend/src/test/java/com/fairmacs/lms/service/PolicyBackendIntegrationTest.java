package com.fairmacs.lms.service;

import com.fairmacs.lms.controller.PolicyEmployeeController;
import com.fairmacs.lms.controller.PolicyHrController;
import com.fairmacs.lms.controller.PolicyManagerController;
import com.fairmacs.lms.dto.*;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.PdfWriter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Policies & Agreements Backend & Database Integration Tests (Stage 2)")
public class PolicyBackendIntegrationTest {

    // In-memory data store for repository proxies
    private final Map<Long, PolicyCategory> categoriesById = new LinkedHashMap<>();
    private final Map<Long, PolicyDocument> documentsById = new LinkedHashMap<>();
    private final Map<Long, PolicyVersion> versionsById = new LinkedHashMap<>();
    private final Map<Long, PolicyAssignment> assignmentsById = new LinkedHashMap<>();
    private final Map<Long, PolicyAcknowledgement> acknowledgementsById = new LinkedHashMap<>();
    private final Map<Long, PolicyAuditLog> auditLogsById = new LinkedHashMap<>();
    private final Map<Long, User> usersById = new LinkedHashMap<>();
    private final Map<Long, Department> departmentsById = new LinkedHashMap<>();
    private final List<Notification> notifications = new ArrayList<>();
    private final Set<String> notificationDedupKeys = new HashSet<>();

    private final AtomicLong catSeq = new AtomicLong(1);
    private final AtomicLong docSeq = new AtomicLong(1);
    private final AtomicLong verSeq = new AtomicLong(1);
    private final AtomicLong assignSeq = new AtomicLong(1);
    private final AtomicLong ackSeq = new AtomicLong(1);
    private final AtomicLong auditSeq = new AtomicLong(1);

    private PolicyCategoryRepository categoryRepo;
    private PolicyDocumentRepository documentRepo;
    private PolicyVersionRepository versionRepo;
    private PolicyAssignmentRepository assignmentRepo;
    private PolicyAcknowledgementRepository acknowledgementRepo;
    private PolicyAuditLogRepository auditLogRepo;
    private UserRepository userRepo;
    private DepartmentRepository departmentRepo;
    private NotificationRepository notificationRepo;

    private PolicyWorkDriveService policyWorkDriveService;
    private NotificationService notificationService;
    private PolicyServiceImpl policyService;
    private NotificationSchedulerService schedulerService;

    // Test users
    private User hrAdminUser;
    private User managerUser;
    private User employeeUser1;
    private User employeeUser2;
    private User employeeOnLeave;
    private User employeeTerminated;
    private User employeeInactive;
    private User trainerUser;

    // Test departments
    private Department parentDept;
    private Department childDept;
    private Department unrelatedDept;

    @BeforeEach
    void setUp() {
        categoriesById.clear();
        documentsById.clear();
        versionsById.clear();
        assignmentsById.clear();
        acknowledgementsById.clear();
        auditLogsById.clear();
        usersById.clear();
        departmentsById.clear();
        notifications.clear();
        notificationDedupKeys.clear();

        initRepositories();

        // 1. Setup departments
        parentDept = new Department();
        parentDept.setId(10L);
        parentDept.setName("Freight Forwarding");
        departmentsById.put(10L, parentDept);

        childDept = new Department();
        childDept.setId(11L);
        childDept.setName("Ocean Freight Operations");
        childDept.setParentDepartment(parentDept);
        departmentsById.put(11L, childDept);

        unrelatedDept = new Department();
        unrelatedDept.setId(20L);
        unrelatedDept.setName("Finance");
        departmentsById.put(20L, unrelatedDept);

        // 2. Setup users
        hrAdminUser = createUser(1L, "HR-001", "Priya HR", "priya.hr@fairmacs.com", "HR", Role.HR_ADMIN, UserStatus.ACTIVE);
        managerUser = createUser(2L, "MGR-002", "Vikram Manager", "vikram.mgr@fairmacs.com", "Freight Forwarding", Role.MANAGER, UserStatus.ACTIVE);
        employeeUser1 = createUser(3L, "EMP-003", "Aarav Employee", "aarav.emp@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        employeeUser2 = createUser(4L, "EMP-004", "Meera Employee", "meera.emp@fairmacs.com", "Finance", Role.EMPLOYEE, UserStatus.ACTIVE);
        employeeOnLeave = createUser(5L, "EMP-005", "Rohan OnLeave", "rohan.leave@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ON_LEAVE);
        employeeTerminated = createUser(6L, "EMP-006", "Sanjay Terminated", "sanjay.term@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.TERMINATED);
        employeeInactive = createUser(8L, "EMP-008", "Deepak Inactive", "deepak.inact@fairmacs.com", "Finance", Role.EMPLOYEE, UserStatus.INACTIVE);
        trainerUser = createUser(7L, "TRN-007", "Kavita Trainer", "kavita.trn@fairmacs.com", "Training", Role.TRAINER, UserStatus.ACTIVE);

        // 3. Setup mock services
        notificationService = new NotificationService(notificationRepo, userRepo) {
            @Override
            public Notification createNotification(
                    Long recipientUserId, String title, String message, String type,
                    String priority, String referenceType, String referenceId,
                    String actionUrl, String deduplicationKey, Map<String, Object> metadata
            ) {
                if (deduplicationKey != null && notificationDedupKeys.contains(deduplicationKey)) {
                    return null;
                }
                if (deduplicationKey != null) {
                    notificationDedupKeys.add(deduplicationKey);
                }
                Notification n = new Notification();
                n.setId((long) (notifications.size() + 1));
                if (recipientUserId != null) {
                    n.setRecipient(usersById.get(recipientUserId));
                }
                n.setTitle(title);
                n.setMessage(message);
                n.setType(type);
                n.setPriority(priority != null ? priority : "NORMAL");
                n.setReferenceType(referenceType);
                n.setReferenceId(referenceId);
                n.setActionUrl(actionUrl);
                n.setDeduplicationKey(deduplicationKey);
                notifications.add(n);
                return n;
            }

            @Override
            public int notifyHrAdmins(String title, String message, String type, String actionUrl, String deduplicationKey) {
                createNotification(hrAdminUser.getId(), title, message, type, "NORMAL", "POLICY", null, actionUrl, deduplicationKey, null);
                return 1;
            }

            @Override
            public int notifyHrAdmins(String title, String message, String type, String priority, String referenceType, String referenceId, String actionUrl, String deduplicationKeyPrefix, Map<String, Object> metadata) {
                createNotification(hrAdminUser.getId(), title, message, type, priority, referenceType, referenceId, actionUrl, deduplicationKeyPrefix + ":HR:" + hrAdminUser.getId(), metadata);
                return 1;
            }

            @Override
            public Notification createNotificationSafely(Long recipientUserId, String title, String message, String type, String priority, String referenceType, String referenceId, String actionUrl, String deduplicationKey, Map<String, Object> metadata) {
                return createNotification(recipientUserId, title, message, type, priority, referenceType, referenceId, actionUrl, deduplicationKey, metadata);
            }
        };

        policyWorkDriveService = new PolicyWorkDriveService(null, null) {
            @Override
            public UploadedPolicyFile uploadPolicyPdf(org.springframework.web.multipart.MultipartFile file, String categoryName, boolean isDeptSub) {
                validatePdfFile(file);
                byte[] bytes;
                try {
                    bytes = file.getBytes();
                } catch (Exception ex) {
                    bytes = new byte[0];
                }
                String sha256 = computeSha256(bytes);
                return new UploadedPolicyFile(
                        "wd-file-" + UUID.randomUUID(),
                        file.getOriginalFilename(),
                        "wd-folder-123",
                        file.getSize(),
                        file.getContentType(),
                        sha256
                );
            }

            @Override
            public ZohoWorkDriveDownloadService.DownloadedDocument downloadPolicyPdf(String fileId) {
                byte[] samplePdf = generateSamplePdf("Fairmacs KMS Sample Policy Document for Testing");
                return new ZohoWorkDriveDownloadService.DownloadedDocument(
                        samplePdf,
                        "document.pdf",
                        org.springframework.http.MediaType.APPLICATION_PDF
                );
            }
        };

        policyService = new PolicyServiceImpl(
                categoryRepo,
                documentRepo,
                versionRepo,
                assignmentRepo,
                acknowledgementRepo,
                auditLogRepo,
                userRepo,
                departmentRepo,
                policyWorkDriveService,
                notificationService
        );

        // Seed initial categories
        PolicyCategory cat1 = new PolicyCategory("Workplace Ethics & Code of Conduct", "ETHICS", "Code of conduct", 1);
        cat1.setId(catSeq.getAndIncrement());
        categoriesById.put(cat1.getId(), cat1);

        PolicyCategory cat2 = new PolicyCategory("IT Security & Acceptable Use", "IT_SECURITY", "IT policy", 2);
        cat2.setId(catSeq.getAndIncrement());
        categoriesById.put(cat2.getId(), cat2);

        PolicyCategory cat3 = new PolicyCategory("Employment & Non-Disclosure Agreements", "AGREEMENTS", "Agreements", 3);
        cat3.setId(catSeq.getAndIncrement());
        categoriesById.put(cat3.getId(), cat3);

        schedulerService = new NotificationSchedulerService(
                Mockito.mock(EnrollmentRepository.class),
                Mockito.mock(QuizAttemptRepository.class),
                userRepo,
                notificationService,
                Mockito.mock(NotificationJobLogRepository.class)
        );
        ReflectionTestUtils.setField(schedulerService, "policyAssignmentRepository", assignmentRepo);
        ReflectionTestUtils.setField(schedulerService, "policyAcknowledgementRepository", acknowledgementRepo);
        ReflectionTestUtils.setField(schedulerService, "policyService", policyService);
        ReflectionTestUtils.setField(schedulerService, "departmentRepository", departmentRepo);
    }

    private User createUser(Long id, String empId, String name, String email, String dept, Role role, UserStatus status) {
        User u = new User();
        u.setId(id);
        u.setEmployeeId(empId);
        u.setName(name);
        u.setEmail(email);
        u.setDepartment(dept);
        u.setRole(role);
        u.setStatus(status);
        usersById.put(id, u);
        return u;
    }

    // =========================================================================
    // 1. Audience Assignment & Eligibility Filtering Tests
    // =========================================================================
    @Test
    @DisplayName("Eligibility: ACTIVE and ON_LEAVE employees are assigned; INACTIVE and TERMINATED are excluded; history preserved")
    void testEligibilityFiltering() {
        PolicyDocument doc = createAndUploadPolicy("IT Security Policy", 2L, hrAdminUser.getId());

        PublishPolicyRequest req = new PublishPolicyRequest();
        req.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        req.setMandatory(true);

        policyService.publishPolicy(doc.getId(), req, hrAdminUser.getId());

        List<PolicyAssignment> assignments = assignmentRepo.findByPolicyDocumentId(doc.getId());

        // 1. ACTIVE: eligible and assigned
        assertTrue(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeUser1.getId())), "ACTIVE employee must be assigned");
        assertTrue(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeUser2.getId())), "ACTIVE employee must be assigned");

        // 2. ON_LEAVE: eligible and assigned
        assertTrue(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeOnLeave.getId())), "ON_LEAVE employee must be assigned");

        // 3. INACTIVE: excluded from new assignments
        assertFalse(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeInactive.getId())), "INACTIVE employee must be excluded from assignments");

        // 4. TERMINATED: excluded from new assignments
        assertFalse(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeTerminated.getId())), "TERMINATED employee must be excluded from assignments");

        // 5. Individual targeting also respects exclusions
        PolicyDocument docIndiv = createAndUploadPolicy("Individual Executive Policy", 1L, hrAdminUser.getId());
        PublishPolicyRequest reqIndiv = new PublishPolicyRequest();
        reqIndiv.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        reqIndiv.setEmployeeUserIds(List.of(employeeUser1.getId(), employeeInactive.getId(), employeeTerminated.getId()));
        policyService.publishPolicy(docIndiv.getId(), reqIndiv, hrAdminUser.getId());

        List<PolicyAssignment> indivAssignments = assignmentRepo.findByPolicyDocumentId(docIndiv.getId());
        assertEquals(1, indivAssignments.size(), "Only the ACTIVE user should receive assignment despite individual targeting");
        assertEquals(employeeUser1.getId(), indivAssignments.get(0).getEmployeeUser().getId());

        // 6. Preservation of past assignment & acknowledgement history upon status change
        PolicyAssignment user1Assignment = assignments.stream().filter(a -> a.getEmployeeUser().getId().equals(employeeUser1.getId())).findFirst().orElseThrow();
        policyService.acknowledgePolicy(user1Assignment.getId(), AcknowledgePolicyRequest.confirmed(), employeeUser1.getId(), "10.0.0.1", "Browser");

        // Employee transitions to INACTIVE
        employeeUser1.setStatus(UserStatus.INACTIVE);

        // History remains intact in repository after transition to INACTIVE
        assertTrue(assignmentRepo.findByPolicyVersionIdAndEmployeeUserId(user1Assignment.getPolicyVersion().getId(), employeeUser1.getId()).isPresent(), "Historical assignment must remain preserved when employee is INACTIVE");
        assertTrue(acknowledgementRepo.findByPolicyVersionIdAndEmployeeUserId(user1Assignment.getPolicyVersion().getId(), employeeUser1.getId()).isPresent(), "Historical acknowledgement must remain preserved when employee is INACTIVE");

        // While INACTIVE, publishing a subsequent policy must exclude this employee
        PolicyDocument docPostInactive = createAndUploadPolicy("Post-Inactive Company Policy", 1L, hrAdminUser.getId());
        PublishPolicyRequest reqPostInactive = new PublishPolicyRequest();
        reqPostInactive.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        policyService.publishPolicy(docPostInactive.getId(), reqPostInactive, hrAdminUser.getId());
        List<PolicyAssignment> postInactiveAssignments = assignmentRepo.findByPolicyDocumentId(docPostInactive.getId());
        assertFalse(postInactiveAssignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeUser1.getId())), "Newly transitioned INACTIVE employee must be excluded from new policy assignments");

        // Employee transitions to TERMINATED
        employeeUser1.setStatus(UserStatus.TERMINATED);

        // History remains intact in repository after transition to TERMINATED
        assertTrue(assignmentRepo.findByPolicyVersionIdAndEmployeeUserId(user1Assignment.getPolicyVersion().getId(), employeeUser1.getId()).isPresent(), "Historical assignment must remain preserved when employee is TERMINATED");
        assertTrue(acknowledgementRepo.findByPolicyVersionIdAndEmployeeUserId(user1Assignment.getPolicyVersion().getId(), employeeUser1.getId()).isPresent(), "Historical acknowledgement must remain preserved when employee is TERMINATED");

        // While TERMINATED, publishing a subsequent policy must exclude this employee
        PolicyDocument docPostTerminated = createAndUploadPolicy("Post-Terminated Company Policy", 1L, hrAdminUser.getId());
        PublishPolicyRequest reqPostTerminated = new PublishPolicyRequest();
        reqPostTerminated.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        policyService.publishPolicy(docPostTerminated.getId(), reqPostTerminated, hrAdminUser.getId());
        List<PolicyAssignment> postTerminatedAssignments = assignmentRepo.findByPolicyDocumentId(docPostTerminated.getId());
        assertFalse(postTerminatedAssignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeUser1.getId())), "Newly transitioned TERMINATED employee must be excluded from new policy assignments");

        // Restore status
        employeeUser1.setStatus(UserStatus.ACTIVE);
    }

    @Test
    @DisplayName("Department Hierarchy: Publishing to parent department targets parent + child department users")
    void testDepartmentHierarchyAudience() {
        PolicyDocument doc = createAndUploadPolicy("Ocean Shipping Protocol", 1L, hrAdminUser.getId());

        PublishPolicyRequest req = new PublishPolicyRequest();
        req.setAudienceType(PolicyAssignmentSource.DEPARTMENT);
        req.setDepartmentIds(List.of(parentDept.getId())); // Freight Forwarding (parent)

        policyService.publishPolicy(doc.getId(), req, hrAdminUser.getId());

        List<PolicyAssignment> assignments = assignmentRepo.findByPolicyDocumentId(doc.getId());

        // Manager in parent dept is assigned
        assertTrue(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(managerUser.getId())));
        // Employee in child dept (Ocean Freight Operations) is assigned
        assertTrue(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeUser1.getId())));
        // Employee in unrelated dept (Finance) is NOT assigned
        assertFalse(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeUser2.getId())));
    }

    @Test
    @DisplayName("Precedence & Deduplication: INDIVIDUAL > DEPARTMENT > ALL_EMPLOYEES; outside department targeting; retry idempotency")
    void testAudiencePrecedenceAndDeduplication() {
        PolicyDocument doc = createAndUploadPolicy("Confidentiality Agreement", 3L, hrAdminUser.getId());
        doc.setOwningDepartment(parentDept); // Owned by Freight Forwarding

        PublishPolicyRequest req = new PublishPolicyRequest();
        req.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        req.setDepartmentIds(List.of(childDept.getId())); // Ocean Freight Operations
        // Target employeeUser1 individually (in child dept) and employeeUser2 (in Finance - outside owning dept)
        req.setEmployeeUserIds(List.of(employeeUser1.getId(), employeeUser2.getId()));

        policyService.publishPolicy(doc.getId(), req, hrAdminUser.getId());

        List<PolicyAssignment> user1Assignments = assignmentRepo.findByPolicyDocumentId(doc.getId()).stream()
                .filter(a -> a.getEmployeeUser().getId().equals(employeeUser1.getId()))
                .toList();

        // Exactly 1 assignment record created
        assertEquals(1, user1Assignments.size(), "Deduplication must ensure exactly 1 assignment per version");
        // Precedence: INDIVIDUAL > DEPARTMENT > ALL_EMPLOYEES
        assertEquals(PolicyAssignmentSource.INDIVIDUAL, user1Assignments.get(0).getAssignmentSource());

        // Individual outside owning department (employeeUser2 in Finance)
        List<PolicyAssignment> user2Assignments = assignmentRepo.findByPolicyDocumentId(doc.getId()).stream()
                .filter(a -> a.getEmployeeUser().getId().equals(employeeUser2.getId()))
                .toList();
        assertEquals(1, user2Assignments.size());
        assertEquals(PolicyAssignmentSource.INDIVIDUAL, user2Assignments.get(0).getAssignmentSource());

        // Snapshot verification
        assertEquals("Ocean Freight Operations", user1Assignments.get(0).getDepartmentNameSnapshot());
        assertEquals("Finance", user2Assignments.get(0).getDepartmentNameSnapshot());

        // Retry publish on same version (idempotency check)
        int initialTotalAssignments = assignmentRepo.findByPolicyDocumentId(doc.getId()).size();
        policyService.publishPolicy(doc.getId(), req, hrAdminUser.getId());
        int retryTotalAssignments = assignmentRepo.findByPolicyDocumentId(doc.getId()).size();
        assertEquals(initialTotalAssignments, retryTotalAssignments, "Publishing retry must not create duplicate assignments");
    }

    // =========================================================================
    // 2. Optional Due Date Behavior Tests
    // =========================================================================
    @Test
    @DisplayName("Optional Due Date: Open-ended policies (due date null) are PENDING and NEVER OVERDUE")
    void testOpenEndedPolicyNeverOverdue() {
        PolicyDocument doc = createAndUploadPolicy("General Ethics Guide", 1L, hrAdminUser.getId());

        PublishPolicyRequest req = new PublishPolicyRequest();
        req.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        req.setEmployeeUserIds(List.of(employeeUser1.getId()));
        req.setDueDate(null); // Open-ended

        policyService.publishPolicy(doc.getId(), req, hrAdminUser.getId());

        List<PolicyAssignmentDTO> myAssignments = policyService.getMyAssignments(employeeUser1.getId(), "ALL");
        assertEquals(1, myAssignments.size());
        assertNull(myAssignments.get(0).getDueDate());
        assertEquals("PENDING", myAssignments.get(0).getComplianceStatus());

        // Status filter for OVERDUE returns empty
        List<PolicyAssignmentDTO> overdueList = policyService.getMyAssignments(employeeUser1.getId(), "OVERDUE");
        assertTrue(overdueList.isEmpty(), "Open-ended assignment must never appear as OVERDUE");
    }

    @Test
    @DisplayName("Explicit Due Date: Past due date flags assignment as OVERDUE; future due date flags as PENDING")
    void testExplicitDueDateStatuses() {
        PolicyDocument docPast = createAndUploadPolicy("Past Due Policy", 1L, hrAdminUser.getId());
        PublishPolicyRequest reqPast = new PublishPolicyRequest();
        reqPast.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        reqPast.setEmployeeUserIds(List.of(employeeUser1.getId()));
        reqPast.setDueDate(LocalDate.now().minusDays(5));
        policyService.publishPolicy(docPast.getId(), reqPast, hrAdminUser.getId());

        PolicyDocument docFuture = createAndUploadPolicy("Future Due Policy", 1L, hrAdminUser.getId());
        PublishPolicyRequest reqFuture = new PublishPolicyRequest();
        reqFuture.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        reqFuture.setEmployeeUserIds(List.of(employeeUser1.getId()));
        reqFuture.setDueDate(LocalDate.now().plusDays(10));
        policyService.publishPolicy(docFuture.getId(), reqFuture, hrAdminUser.getId());

        List<PolicyAssignmentDTO> all = policyService.getMyAssignments(employeeUser1.getId(), "ALL");
        assertEquals(2, all.size());

        PolicyAssignmentDTO pastDto = all.stream().filter(a -> a.getPolicyDocumentId().equals(docPast.getId())).findFirst().orElseThrow();
        assertEquals("OVERDUE", pastDto.getComplianceStatus());

        PolicyAssignmentDTO futureDto = all.stream().filter(a -> a.getPolicyDocumentId().equals(docFuture.getId())).findFirst().orElseThrow();
        assertEquals("PENDING", futureDto.getComplianceStatus());
    }

    // =========================================================================
    // 3. Version Lifecycle & Acknowledgement Invalidation Tests
    // =========================================================================
    @Test
    @DisplayName("Versioning: MAJOR version requires fresh acknowledgement; MINOR preserves prior acknowledgement")
    void testMajorVsMinorVersioning() {
        PolicyDocument doc = createAndUploadPolicy("Information Security Manual", 2L, hrAdminUser.getId());

        // Publish v1.0
        PublishPolicyRequest pubV1 = new PublishPolicyRequest();
        pubV1.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubV1.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(doc.getId(), pubV1, hrAdminUser.getId());

        List<PolicyAssignmentDTO> v1Assignments = policyService.getMyAssignments(employeeUser1.getId(), "ALL");
        Long v1AssignmentId = v1Assignments.get(0).getId();

        // Employee acknowledges v1.0
        AcknowledgePolicyRequest ackReq = AcknowledgePolicyRequest.confirmed();
        policyService.acknowledgePolicy(v1AssignmentId, ackReq, employeeUser1.getId(), "192.168.1.100", "Mozilla/5.0");

        List<PolicyAssignmentDTO> afterAck = policyService.getMyAssignments(employeeUser1.getId(), "ALL");
        assertEquals("ACKNOWLEDGED", afterAck.get(0).getComplianceStatus());
        assertTrue(afterAck.get(0).getIsExplicit(), "Direct acknowledgement must be marked explicit");
        PolicyAcknowledgement ackV1 = acknowledgementRepo.findByPolicyVersionIdAndEmployeeUserId(afterAck.get(0).getPolicyVersionId(), employeeUser1.getId()).orElseThrow();
        assertEquals(afterAck.get(0).getDocumentSha256Hash(), ackV1.getDocumentSha256Hash(), "Explicit acknowledgement must capture exact SHA-256");

        // 1. Upload & Publish MINOR update (v1.1)
        MockMultipartFile minorPdf = new MockMultipartFile("file", "v1.1.pdf", "application/pdf", "%PDF minor".getBytes(StandardCharsets.UTF_8));
        PolicyVersionDTO v11 = policyService.uploadPolicyVersion(doc.getId(), minorPdf, "1.1", "MINOR", LocalDate.now(), true, "Minor typo fix", hrAdminUser.getId());

        PublishPolicyRequest pubV11 = new PublishPolicyRequest();
        pubV11.setPolicyVersionId(v11.getId());
        pubV11.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubV11.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(doc.getId(), pubV11, hrAdminUser.getId());

        // Minor version carries forward prior acknowledgement WITHOUT inserting a fabricated record
        List<PolicyAssignmentDTO> afterMinor = policyService.getMyAssignments(employeeUser1.getId(), "ALL");
        PolicyAssignmentDTO v11Assignment = afterMinor.stream()
                .filter(a -> a.getPolicyVersionId().equals(v11.getId()))
                .findFirst().orElseThrow();
        assertEquals("ACKNOWLEDGED", v11Assignment.getComplianceStatus(), "Minor version must carry forward valid acknowledgement");
        assertFalse(v11Assignment.getIsExplicit(), "Minor version acknowledgement must be derived, not explicit");
        assertEquals("1.0", v11Assignment.getDerivedFromVersionNumber(), "Derived version must reference v1.0");
        assertFalse(acknowledgementRepo.existsByPolicyVersionIdAndEmployeeUserId(v11.getId(), employeeUser1.getId()),
                "System must NEVER insert fabricated CARRIED_FORWARD_MINOR row into policy_acknowledgements");

        // 2. Upload & Publish MAJOR update (v2.0)
        MockMultipartFile majorPdf = new MockMultipartFile("file", "v2.0.pdf", "application/pdf", "%PDF major".getBytes(StandardCharsets.UTF_8));
        PolicyVersionDTO v20 = policyService.uploadPolicyVersion(doc.getId(), majorPdf, "2.0", "MAJOR", LocalDate.now(), true, "Annual comprehensive revision", hrAdminUser.getId());

        PublishPolicyRequest pubV20 = new PublishPolicyRequest();
        pubV20.setPolicyVersionId(v20.getId());
        pubV20.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubV20.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(doc.getId(), pubV20, hrAdminUser.getId());

        // Major version requires fresh acknowledgement
        List<PolicyAssignmentDTO> afterMajor = policyService.getMyAssignments(employeeUser1.getId(), "ALL");
        PolicyAssignmentDTO v20Assignment = afterMajor.stream()
                .filter(a -> a.getPolicyVersionId().equals(v20.getId()))
                .findFirst().orElseThrow();
        assertEquals("PENDING", v20Assignment.getComplianceStatus(), "Major version must require fresh acknowledgement");
    }

    // =========================================================================
    // 4. Strict Acknowledgement Integrity Tests
    // =========================================================================
    @Test
    @DisplayName("Acknowledgement Integrity: Cannot acknowledge another employee's assignment (403 Forbidden)")
    void testCannotAcknowledgeAnotherEmployeesAssignment() {
        PolicyDocument doc = createAndUploadPolicy("Anti-Harassment Policy", 1L, hrAdminUser.getId());

        PublishPolicyRequest pub = new PublishPolicyRequest();
        pub.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pub.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(doc.getId(), pub, hrAdminUser.getId());

        List<PolicyAssignment> assignments = assignmentRepo.findByPolicyDocumentId(doc.getId());
        Long assignmentId = assignments.get(0).getId();

        // employeeUser2 attempts to acknowledge employeeUser1's assignment
        assertThrows(ResponseStatusException.class, () -> {
            policyService.acknowledgePolicy(assignmentId, AcknowledgePolicyRequest.confirmed(), employeeUser2.getId(), "10.0.0.1", "Chrome");
        }, "Should throw 403 Forbidden when acknowledging someone else's assignment");
    }

    @Test
    @DisplayName("Idempotency: Re-acknowledging returns existing record without duplicate insertion or error")
    void testIdempotentAcknowledgement() {
        PolicyDocument doc = createAndUploadPolicy("Remote Work Policy", 1L, hrAdminUser.getId());

        PublishPolicyRequest pub = new PublishPolicyRequest();
        pub.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pub.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(doc.getId(), pub, hrAdminUser.getId());

        List<PolicyAssignment> assignments = assignmentRepo.findByPolicyDocumentId(doc.getId());
        Long assignmentId = assignments.get(0).getId();

        // First acknowledgement
        PolicyAcknowledgementDTO firstAck = policyService.acknowledgePolicy(assignmentId, AcknowledgePolicyRequest.confirmed(), employeeUser1.getId(), "10.0.0.1", "Chrome");
        assertNotNull(firstAck.getId());

        // Second acknowledgement
        PolicyAcknowledgementDTO secondAck = policyService.acknowledgePolicy(assignmentId, AcknowledgePolicyRequest.confirmed(), employeeUser1.getId(), "10.0.0.2", "Firefox");
        assertEquals(firstAck.getId(), secondAck.getId(), "Must return identical existing record");

        // Verify database has exactly 1 row
        assertEquals(1, acknowledgementsById.size());
    }

    // =========================================================================
    // 5. Role-Based Isolation & Self-Approval Prevention Tests
    // =========================================================================
    @Test
    @DisplayName("Manager Isolation: Manager can submit policy for their department hierarchy; cannot submit for unrelated department")
    void testManagerDepartmentIsolation() {
        // Manager vikram is in Freight Forwarding (parent of Ocean Freight Operations)
        ManagerPolicySubmissionRequest validReq = new ManagerPolicySubmissionRequest();
        validReq.setTitle("Port Operations Protocol");
        validReq.setCategoryId(1L);
        validReq.setTargetDepartmentId(childDept.getId()); // Child department in hierarchy

        MockMultipartFile file = new MockMultipartFile("file", "port.pdf", "application/pdf", "%PDF test".getBytes(StandardCharsets.UTF_8));
        PolicyDocumentDTO submitted = policyService.submitDepartmentPolicy(validReq, file, managerUser.getId());
        assertEquals(PolicyDocumentStatus.PENDING_APPROVAL, submitted.getDocumentStatus());

        // Attempt submission for Finance (unrelated department)
        ManagerPolicySubmissionRequest invalidReq = new ManagerPolicySubmissionRequest();
        invalidReq.setTitle("Finance Cheque Signing Rule");
        invalidReq.setCategoryId(1L);
        invalidReq.setTargetDepartmentId(unrelatedDept.getId());

        assertThrows(ResponseStatusException.class, () -> {
            policyService.submitDepartmentPolicy(invalidReq, file, managerUser.getId());
        }, "Manager should be forbidden from submitting policies for departments outside their hierarchy");
    }

    @Test
    @DisplayName("Self-Approval Restriction: A user cannot approve their own submission")
    void testSelfApprovalPrevention() {
        ManagerPolicySubmissionRequest req = new ManagerPolicySubmissionRequest();
        req.setTitle("HR Internal Guidelines");
        req.setCategoryId(1L);
        req.setTargetDepartmentId(parentDept.getId());

        MockMultipartFile file = new MockMultipartFile("file", "guideline.pdf", "application/pdf", "%PDF test".getBytes(StandardCharsets.UTF_8));
        PolicyDocumentDTO submitted = policyService.submitDepartmentPolicy(req, file, managerUser.getId());

        ApprovalDecisionRequest decision = new ApprovalDecisionRequest();
        decision.setDecision(ApprovalDecisionRequest.Decision.APPROVE);
        decision.setComment("Self approval attempt");

        assertThrows(ResponseStatusException.class, () -> {
            policyService.decideManagerSubmission(submitted.getId(), decision, managerUser.getId());
        }, "Self-approval restriction must block creator from approving their own submission");

        PolicyDocument hrDoc = createAndUploadPolicy("HR Created Document", 1L, hrAdminUser.getId());
        assertThrows(ResponseStatusException.class, () -> {
            policyService.decideManagerSubmission(hrDoc.getId(), decision, hrAdminUser.getId());
        }, "Self-approval restriction must block HR Admin from approving their own created document");
    }

    // =========================================================================
    // 6. Download Restrictions & File Validation Tests
    // =========================================================================
    @Test
    @DisplayName("Download Restriction: When allowDownload is false, Employee download is blocked (403), but HR_ADMIN can download")
    void testDownloadRestrictions() {
        CreatePolicyRequest draftReq = new CreatePolicyRequest();
        draftReq.setTitle("Classified Security Architecture");
        draftReq.setCategoryId(2L);
        PolicyDocumentDTO doc = policyService.createPolicy(draftReq, hrAdminUser.getId());

        // Upload version with allowDownload = false
        MockMultipartFile pdf = new MockMultipartFile("file", "sec.pdf", "application/pdf", "%PDF sec".getBytes(StandardCharsets.UTF_8));
        PolicyVersionDTO version = policyService.uploadPolicyVersion(doc.getId(), pdf, "1.0", "MAJOR", LocalDate.now(), false, "View only", hrAdminUser.getId());

        PublishPolicyRequest pub = new PublishPolicyRequest();
        pub.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pub.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(doc.getId(), pub, hrAdminUser.getId());

        // Regular employee can VIEW
        assertDoesNotThrow(() -> {
            policyService.viewPolicyDocument(version.getId(), employeeUser1.getId(), "EMPLOYEE");
        });
        assertTrue(auditLogsById.values().stream().anyMatch(l -> "DOCUMENT_VIEWED".equals(l.getAction())),
                "Viewing document must record DOCUMENT_VIEWED audit log");

        // Regular employee CANNOT DOWNLOAD (403 Forbidden)
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            policyService.downloadPolicyDocument(version.getId(), employeeUser1.getId(), "EMPLOYEE");
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(ex.getReason().contains("restricted"));

        // HR Admin CAN DOWNLOAD even when allowDownload is false
        assertDoesNotThrow(() -> {
            policyService.downloadPolicyDocument(version.getId(), hrAdminUser.getId(), "HR_ADMIN");
        });
        assertTrue(auditLogsById.values().stream().anyMatch(l -> "DOCUMENT_DOWNLOADED".equals(l.getAction())),
                "Downloading document must record DOCUMENT_DOWNLOADED audit log");
    }

    @Test
    @DisplayName("File Validation: Rejects non-PDF files and files exceeding 25MB")
    void testFileValidationRules() {
        MockMultipartFile exeFile = new MockMultipartFile("file", "script.exe", "application/x-msdownload", "echo hello".getBytes(StandardCharsets.UTF_8));
        assertThrows(ResponseStatusException.class, () -> {
            policyWorkDriveService.validatePdfFile(exeFile);
        });

        byte[] bigBytes = new byte[26 * 1024 * 1024]; // 26 MB
        MockMultipartFile bigPdf = new MockMultipartFile("file", "huge.pdf", "application/pdf", bigBytes);
        assertThrows(ResponseStatusException.class, () -> {
            policyWorkDriveService.validatePdfFile(bigPdf);
        });
    }

    // =========================================================================
    // 7. In-App Notifications & Deduplication Tests
    // =========================================================================
    @Test
    @DisplayName("In-App Notification: Dispatched upon policy assignment with deduplication key")
    void testNotificationDispatchOnAssignment() {
        PolicyDocument doc = createAndUploadPolicy("Travel & Expense Policy", 1L, hrAdminUser.getId());

        PublishPolicyRequest pub = new PublishPolicyRequest();
        pub.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pub.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(doc.getId(), pub, hrAdminUser.getId());

        // Notification created for employeeUser1
        assertEquals(1, notifications.size());
        Notification n = notifications.get(0);
        assertEquals(employeeUser1.getId(), n.getRecipientUserId());
        assertEquals(NotificationType.POLICY_ASSIGNED, n.getType());
        assertTrue(n.getDeduplicationKey().startsWith("policy-assign:"));
    }

    @Test
    @DisplayName("Notification Types: Distinguishes POLICY_ASSIGNED, AGREEMENT_ASSIGNED, and POLICY_NEW_VERSION")
    void testPolicyAndAgreementPublicationNotifications() {
        notifications.clear();
        notificationDedupKeys.clear();

        // 1. Policy publication -> POLICY_ASSIGNED
        PolicyDocument policyDoc = createAndUploadPolicy("General Operations Policy", 1L, hrAdminUser.getId());
        PublishPolicyRequest pubPolicy = new PublishPolicyRequest();
        pubPolicy.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubPolicy.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(policyDoc.getId(), pubPolicy, hrAdminUser.getId());

        assertTrue(notifications.stream().anyMatch(n -> n.getType().equals(NotificationType.POLICY_ASSIGNED)));

        // 2. Agreement publication -> AGREEMENT_ASSIGNED (Category 3 has 'Agreements')
        PolicyDocument agreementDoc = createAndUploadPolicy("Non-Disclosure Agreement", 3L, hrAdminUser.getId());
        PublishPolicyRequest pubAgreement = new PublishPolicyRequest();
        pubAgreement.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubAgreement.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(agreementDoc.getId(), pubAgreement, hrAdminUser.getId());

        assertTrue(notifications.stream().anyMatch(n -> n.getType().equals(NotificationType.AGREEMENT_ASSIGNED)));

        // 3. MAJOR Version Update -> POLICY_NEW_VERSION
        MockMultipartFile v2Pdf = new MockMultipartFile("file", "v2.pdf", "application/pdf", "%PDF v2".getBytes(StandardCharsets.UTF_8));
        PolicyVersionDTO v2 = policyService.uploadPolicyVersion(policyDoc.getId(), v2Pdf, "2.0", "MAJOR", LocalDate.now(), true, "Major update", hrAdminUser.getId());

        PublishPolicyRequest pubV2 = new PublishPolicyRequest();
        pubV2.setPolicyVersionId(v2.getId());
        pubV2.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubV2.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(policyDoc.getId(), pubV2, hrAdminUser.getId());

        assertTrue(notifications.stream().anyMatch(n -> n.getType().equals(NotificationType.POLICY_NEW_VERSION)));
    }

    @Test
    @DisplayName("Manager Notifications: Submission generates POLICY_APPROVAL_REQ; HR decision generates POLICY_DECISION")
    void testManagerSubmissionAndDecisionNotifications() {
        notifications.clear();
        notificationDedupKeys.clear();

        // 1. Manager submission
        ManagerPolicySubmissionRequest subReq = new ManagerPolicySubmissionRequest();
        subReq.setTitle("Port Safety Protocol");
        subReq.setCategoryId(1L);
        subReq.setTargetDepartmentId(childDept.getId());
        MockMultipartFile pdf = new MockMultipartFile("file", "port_safe.pdf", "application/pdf", "%PDF port".getBytes(StandardCharsets.UTF_8));

        PolicyDocumentDTO submitted = policyService.submitDepartmentPolicy(subReq, pdf, managerUser.getId());

        // Verify HR Admin received approval request notification
        Notification reqNotif = notifications.stream()
                .filter(n -> n.getType().equals(NotificationType.POLICY_APPROVAL_REQ))
                .findFirst().orElseThrow();
        assertEquals("policy-approval-req:" + submitted.getId(), reqNotif.getDeduplicationKey());

        // 2. HR Admin approval
        ApprovalDecisionRequest approveDecision = new ApprovalDecisionRequest();
        approveDecision.setDecision(ApprovalDecisionRequest.Decision.APPROVE);
        approveDecision.setComment("Approved for department");
        approveDecision.setAutoPublish(false);

        policyService.decideManagerSubmission(submitted.getId(), approveDecision, hrAdminUser.getId());

        Notification decisionNotif = notifications.stream()
                .filter(n -> n.getType().equals(NotificationType.POLICY_DECISION) && n.getDeduplicationKey().contains("APPROVED"))
                .findFirst().orElseThrow();
        assertEquals(managerUser.getId(), decisionNotif.getRecipientUserId());
        assertEquals("policy-decision:" + submitted.getId() + ":APPROVED", decisionNotif.getDeduplicationKey());
    }

    @Test
    @DisplayName("Scheduler Reminders: 5-day, 2-day, overdue alerts; skips open-ended & compliant; deduplicates runs")
    void testSchedulerPolicyRemindersDeduplicationAndOpenEndedSkipping() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate today = LocalDate.now();

        PolicyDocument doc = createAndUploadPolicy("Compliance Checklist", 1L, hrAdminUser.getId());
        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        PolicyVersion version = versionsById.values().stream().filter(v -> v.getPolicyDocument().getId().equals(doc.getId())).findFirst().orElseThrow();

        // Assignment 1: Due in 5 days (Unacknowledged)
        PolicyAssignment a1 = new PolicyAssignment();
        a1.setId(assignSeq.getAndIncrement());
        a1.setPolicyDocument(doc);
        a1.setPolicyVersion(version);
        a1.setEmployeeUser(employeeUser1);
        a1.setEmployeeIdSnapshot(employeeUser1.getEmployeeId());
        a1.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a1.setDueDate(today.plusDays(5));
        assignmentsById.put(a1.getId(), a1);

        // Assignment 2: Due in 2 days (Unacknowledged)
        PolicyAssignment a2 = new PolicyAssignment();
        a2.setId(assignSeq.getAndIncrement());
        a2.setPolicyDocument(doc);
        a2.setPolicyVersion(version);
        a2.setEmployeeUser(employeeUser2);
        a2.setEmployeeIdSnapshot(employeeUser2.getEmployeeId());
        a2.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a2.setDueDate(today.plusDays(2));
        assignmentsById.put(a2.getId(), a2);

        // Assignment 3: Overdue (Due 1 day ago - initial overdue milestone, Unacknowledged)
        PolicyAssignment a3 = new PolicyAssignment();
        a3.setId(assignSeq.getAndIncrement());
        a3.setPolicyDocument(doc);
        a3.setPolicyVersion(version);
        a3.setEmployeeUser(employeeOnLeave);
        a3.setEmployeeIdSnapshot(employeeOnLeave.getEmployeeId());
        a3.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a3.setDueDate(today.minusDays(1));
        assignmentsById.put(a3.getId(), a3);

        // Assignment 4: Open-ended (dueDate == null, Unacknowledged)
        PolicyAssignment a4 = new PolicyAssignment();
        a4.setId(assignSeq.getAndIncrement());
        a4.setPolicyDocument(doc);
        a4.setPolicyVersion(version);
        a4.setEmployeeUser(trainerUser);
        a4.setEmployeeIdSnapshot(trainerUser.getEmployeeId());
        a4.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a4.setDueDate(null); // Open-ended
        assignmentsById.put(a4.getId(), a4);

        // Assignment 5: Due in 5 days, but ALREADY ACKNOWLEDGED
        PolicyAssignment a5 = new PolicyAssignment();
        a5.setId(assignSeq.getAndIncrement());
        a5.setPolicyDocument(doc);
        a5.setPolicyVersion(version);
        a5.setEmployeeUser(managerUser);
        a5.setEmployeeIdSnapshot(managerUser.getEmployeeId());
        a5.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a5.setDueDate(today.plusDays(5));
        assignmentsById.put(a5.getId(), a5);

        PolicyAcknowledgement ack5 = new PolicyAcknowledgement();
        ack5.setId(ackSeq.getAndIncrement());
        ack5.setPolicyAssignment(a5);
        ack5.setPolicyDocument(doc);
        ack5.setPolicyVersion(version);
        ack5.setEmployeeUser(managerUser);
        ack5.setEmployeeIdSnapshot(managerUser.getEmployeeId());
        ack5.setAuthenticatedUser(managerUser);
        ack5.setDocumentSha256Hash(version.getSha256Hash());
        ack5.setAcknowledgementTextVersion("Acknowledged");
        acknowledgementsById.put(ack5.getId(), ack5);

        // Run Scheduler Job
        Map<String, Object> run1Result = schedulerService.processPolicyDeadlineReminders(today, true);
        assertTrue((int) run1Result.get("notificationsCreated") >= 3, "Should generate at least 3 notifications (5-day, 2-day, overdue, plus escalation)");

        // Verify distinct deduplication keys
        assertTrue(notifications.stream().anyMatch(n -> ("policy-due-5d:" + a1.getId()).equals(n.getDeduplicationKey())));
        assertTrue(notifications.stream().anyMatch(n -> ("policy-due-2d:" + a2.getId()).equals(n.getDeduplicationKey())));
        assertTrue(notifications.stream().anyMatch(n -> ("policy-overdue:" + a3.getId() + ":" + today).equals(n.getDeduplicationKey())));

        // Verify open-ended assignment NEVER received reminder
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipientUserId().equals(trainerUser.getId())), "Open-ended assignment must never receive due date reminders");

        // Verify already acknowledged assignment NEVER received due date reminder
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipientUserId().equals(managerUser.getId()) && NotificationType.POLICY_DUE_SOON.equals(n.getType())), "Acknowledged assignment must never receive due date reminders");

        // Duplicate run on same day must be deduplicated
        int notifCountBeforeDuplicate = notifications.size();
        schedulerService.processPolicyDeadlineReminders(today, true);
        assertEquals(notifCountBeforeDuplicate, notifications.size(), "Deduplication must prevent duplicate reminders on same day");
    }

    @Test
    @DisplayName("Role Security: Trainer has standard employee permissions; cannot acknowledge others; isolated from admin")
    void testTrainerRolePermissionsAndAccessControl() {
        PolicyDocument doc = createAndUploadPolicy("Trainer Orientation Policy", 1L, hrAdminUser.getId());

        PublishPolicyRequest req = new PublishPolicyRequest();
        req.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        req.setEmployeeUserIds(List.of(trainerUser.getId(), employeeUser1.getId()));
        policyService.publishPolicy(doc.getId(), req, hrAdminUser.getId());

        List<PolicyAssignment> trainerAssignments = assignmentRepo.findByPolicyDocumentId(doc.getId()).stream()
                .filter(a -> a.getEmployeeUser().getId().equals(trainerUser.getId()))
                .toList();
        assertEquals(1, trainerAssignments.size());

        // Trainer can acknowledge their own assignment
        assertDoesNotThrow(() -> {
            policyService.acknowledgePolicy(trainerAssignments.get(0).getId(), AcknowledgePolicyRequest.confirmed(), trainerUser.getId(), "127.0.0.1", "Mozilla");
        });

        // Trainer CANNOT acknowledge employeeUser1's assignment (403 Forbidden)
        List<PolicyAssignment> emp1Assignments = assignmentRepo.findByPolicyDocumentId(doc.getId()).stream()
                .filter(a -> a.getEmployeeUser().getId().equals(employeeUser1.getId()))
                .toList();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            policyService.acknowledgePolicy(emp1Assignments.get(0).getId(), AcknowledgePolicyRequest.confirmed(), trainerUser.getId(), "127.0.0.1", "Mozilla");
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    @DisplayName("Reporting & Analytics: Organization overview metrics, assignments report, and Excel export")
    void testOrganizationOverviewAndReports() {
        PolicyDocument policyDoc = createAndUploadPolicy("Code of Conduct 2026", 1L, hrAdminUser.getId());
        PublishPolicyRequest pubPolicy = new PublishPolicyRequest();
        pubPolicy.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubPolicy.setEmployeeUserIds(List.of(employeeUser1.getId(), employeeUser2.getId()));
        pubPolicy.setDueDate(LocalDate.now().plusDays(10));
        policyService.publishPolicy(policyDoc.getId(), pubPolicy, hrAdminUser.getId());

        // employeeUser1 acknowledges
        PolicyAssignment a1 = assignmentRepo.findByPolicyVersionIdAndEmployeeUserId(
                versionRepo.findFirstByPolicyDocumentIdOrderByCreatedAtDesc(policyDoc.getId()).orElseThrow().getId(),
                employeeUser1.getId()
        ).orElseThrow();
        policyService.acknowledgePolicy(a1.getId(), AcknowledgePolicyRequest.confirmed(), employeeUser1.getId(), "10.0.0.1", "Chrome");

        // 1. Verify Organization Overview
        PolicyOrgOverviewDTO overview = policyService.getOrganizationOverview();
        assertNotNull(overview);
        assertTrue(overview.getTotalPublished() >= 1, "Must have at least 1 published policy");
        assertTrue(overview.getTotalAssigned() >= 2, "Must count active assignments");
        assertTrue(overview.getTotalAcknowledged() >= 1, "Must count acknowledged employee");
        assertTrue(overview.getCompletionPercentage() > 0.0, "Completion percentage must be computed");
        assertNotNull(overview.getDepartmentBreakdowns(), "Department breakdown must not be null");

        // 2. Verify Organization-Wide Assignments Report
        List<PolicyAssignmentDTO> allAssignments = policyService.getAllPolicyAssignments(null, null, "ALL");
        assertNotNull(allAssignments);
        assertTrue(allAssignments.size() >= 2, "Assignments list must contain assignments");
        assertTrue(allAssignments.stream().anyMatch(a -> a.getComplianceStatus().equals("ACKNOWLEDGED")), "Must have acknowledged item");
        assertTrue(allAssignments.stream().anyMatch(a -> a.getComplianceStatus().equals("PENDING")), "Must have pending item");

        // Status-filtered query
        List<PolicyAssignmentDTO> ackedOnly = policyService.getAllPolicyAssignments(null, null, "ACKNOWLEDGED");
        assertTrue(ackedOnly.stream().allMatch(a -> a.getComplianceStatus().equals("ACKNOWLEDGED")), "Filtered list must only have ACKNOWLEDGED");

        // 3. Verify Excel Export Generation
        byte[] excelBytes = policyService.exportAssignmentsToExcel(null, null, "ALL");
        assertNotNull(excelBytes);
        assertTrue(excelBytes.length > 500, "Excel output must be valid XLSX file bytes");
        // Check zip PK header for xlsx
        assertEquals((byte) 0x50, excelBytes[0], "Must start with PK zip header");
        assertEquals((byte) 0x4B, excelBytes[1], "Must start with PK zip header");
    }

    @Test
    @DisplayName("Verify Archive Policy Integrity, Immutability & Idempotence")
    void testArchivePolicyIntegrityAndIdempotence() {
        // 1. Create and publish a policy
        PolicyDocument doc = createAndUploadPolicy("Data Retention Policy", 2L, hrAdminUser.getId());
        PublishPolicyRequest pubReq = new PublishPolicyRequest();
        pubReq.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        pubReq.setMandatory(true);
        PolicyDocumentDTO publishedDto = policyService.publishPolicy(doc.getId(), pubReq, hrAdminUser.getId());
        assertEquals(PolicyDocumentStatus.PUBLISHED, publishedDto.getDocumentStatus());

        int initialVersionCount = versionsById.size();
        int initialAssignmentCount = assignmentsById.size();
        assertTrue(initialAssignmentCount > 0, "Should have created assignments");

        // 2. Archive the policy
        PolicyDocumentDTO archivedDto = policyService.archivePolicy(doc.getId(), hrAdminUser.getId());
        assertEquals(PolicyDocumentStatus.ARCHIVED, archivedDto.getDocumentStatus());
        assertNotNull(archivedDto.getArchivedAt());

        // Verify audit log
        assertTrue(auditLogsById.values().stream().anyMatch(l -> "POLICY_ARCHIVED".equals(l.getAction()) && l.getPolicyDocument() != null && doc.getId().equals(l.getPolicyDocument().getId())),
                "Audit log must contain POLICY_ARCHIVED event");

        // 3. Repeated archive is idempotent and safe
        PolicyDocumentDTO reArchivedDto = policyService.archivePolicy(doc.getId(), hrAdminUser.getId());
        assertEquals(PolicyDocumentStatus.ARCHIVED, reArchivedDto.getDocumentStatus());

        // 4. Updating an archived policy must be rejected
        CreatePolicyRequest updateReq = new CreatePolicyRequest();
        updateReq.setTitle("Modified Title");
        ResponseStatusException updateEx = assertThrows(ResponseStatusException.class, () ->
                policyService.updatePolicyDraft(doc.getId(), updateReq, hrAdminUser.getId())
        );
        assertEquals(HttpStatus.BAD_REQUEST, updateEx.getStatusCode());
        assertTrue(updateEx.getReason().contains("Cannot update archived policy"));

        // 5. Uploading a new version to an archived policy must be rejected
        MockMultipartFile newPdf = new MockMultipartFile("file", "v2.pdf", "application/pdf", "%PDF v2".getBytes(StandardCharsets.UTF_8));
        ResponseStatusException uploadEx = assertThrows(ResponseStatusException.class, () ->
                policyService.uploadPolicyVersion(doc.getId(), newPdf, "2.0", "MAJOR", LocalDate.now(), true, "New version", hrAdminUser.getId())
        );
        assertEquals(HttpStatus.BAD_REQUEST, uploadEx.getStatusCode());
        assertTrue(uploadEx.getReason().contains("Cannot upload version for archived policy"));

        // 6. Publishing an archived policy must be rejected
        ResponseStatusException pubEx = assertThrows(ResponseStatusException.class, () ->
                policyService.publishPolicy(doc.getId(), pubReq, hrAdminUser.getId())
        );
        assertEquals(HttpStatus.BAD_REQUEST, pubEx.getStatusCode());
        assertTrue(pubEx.getReason().contains("Cannot publish archived policy"));

        // 7. Verify existing versions and assignments remain intact (no deletion)
        assertEquals(initialVersionCount, versionsById.size(), "Historical versions must not be deleted");
        assertEquals(initialAssignmentCount, assignmentsById.size(), "Assignments must remain intact");
    }

    // =========================================================================
    // 7. Stage 4 Manager Module Tests
    // =========================================================================
    @Test
    @DisplayName("Stage 4 Manager: Department Overview metrics are strictly scoped to manager hierarchy")
    void testManagerDepartmentOverview() {
        PolicyDocument doc = createAndUploadPolicy("Code of Conduct", 1L, hrAdminUser.getId());
        PublishPolicyRequest pubReq = new PublishPolicyRequest();
        pubReq.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        pubReq.setMandatory(true);
        policyService.publishPolicy(doc.getId(), pubReq, hrAdminUser.getId());

        Optional<PolicyAssignment> a1 = assignmentRepo.findByPolicyVersionIdAndEmployeeUserId(doc.getId(), employeeUser1.getId());
        assertTrue(a1.isPresent());
        AcknowledgePolicyRequest ackReq = new AcknowledgePolicyRequest();
        ackReq.setConfirmed(true);
        policyService.acknowledgePolicy(a1.get().getId(), ackReq, employeeUser1.getId(), "127.0.0.1", "Agent");

        PolicyDeptOverviewDTO overview = policyService.getDepartmentOverview(managerUser.getId());
        assertNotNull(overview);
        assertEquals("Freight Forwarding", overview.getDepartmentName());
        assertTrue(overview.getTotalAssigned() >= 2, "Manager department hierarchy must have at least 2 assigned employees");
        assertTrue(overview.getTotalAcknowledged() >= 1, "Must reflect employee 1 acknowledgement");
        assertTrue(overview.getCompletionPercentage() > 0.0);
    }

    @Test
    @DisplayName("Stage 4 Manager: Department library excludes archived and returns compliance stats")
    void testManagerApplicablePoliciesExcludesArchived() {
        PolicyDocument doc = createAndUploadPolicy("Safety Standards", 1L, hrAdminUser.getId());
        PublishPolicyRequest pubReq = new PublishPolicyRequest();
        pubReq.setAudienceType(PolicyAssignmentSource.DEPARTMENT);
        pubReq.setDepartmentIds(List.of(parentDept.getId()));
        pubReq.setMandatory(true);
        policyService.publishPolicy(doc.getId(), pubReq, hrAdminUser.getId());

        List<PolicyDocumentDTO> policies = policyService.getDepartmentPoliciesForManager(managerUser.getId());
        assertTrue(policies.stream().anyMatch(p -> p.getId().equals(doc.getId())), "Must contain published policy");

        policyService.archivePolicy(doc.getId(), hrAdminUser.getId());

        List<PolicyDocumentDTO> afterArchive = policyService.getDepartmentPoliciesForManager(managerUser.getId());
        assertFalse(afterArchive.stream().anyMatch(p -> p.getId().equals(doc.getId())), "Archived policy must NOT appear in active library");
    }

    @Test
    @DisplayName("Stage 4 Manager: Department reports enforce strict department isolation")
    void testManagerDepartmentReportingAndIsolation() {
        PolicyDocument doc = createAndUploadPolicy("Remote Work Policy", 1L, hrAdminUser.getId());
        PublishPolicyRequest pubReq = new PublishPolicyRequest();
        pubReq.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        pubReq.setMandatory(true);
        policyService.publishPolicy(doc.getId(), pubReq, hrAdminUser.getId());

        List<PolicyAssignmentDTO> deptReports = policyService.getDepartmentPolicyAssignments(managerUser.getId(), doc.getId(), childDept.getId(), "ALL");
        assertNotNull(deptReports);
        assertTrue(deptReports.stream().allMatch(a -> childDept.getName().equalsIgnoreCase(a.getDepartment())),
                "Assignments must be restricted to child department");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                policyService.getDepartmentPolicyAssignments(managerUser.getId(), doc.getId(), unrelatedDept.getId(), "ALL")
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Cross-department access prohibited"));
    }

    @Test
    @DisplayName("Stage 4 Manager: Submissions and review comments tracking")
    void testManagerSubmissionsAndReviewComments() {
        ManagerPolicySubmissionRequest subReq = new ManagerPolicySubmissionRequest();
        subReq.setTitle("Customs Clearance SOP");
        subReq.setCategoryId(1L);
        subReq.setTargetDepartmentId(parentDept.getId());
        subReq.setSubmissionNotes("Standardizing export customs workflow.");

        MockMultipartFile file = new MockMultipartFile("file", "sop.pdf", "application/pdf", "%PDF SOP".getBytes(StandardCharsets.UTF_8));
        PolicyDocumentDTO submitted = policyService.submitDepartmentPolicy(subReq, file, managerUser.getId());

        List<PolicyDocumentDTO> mySubmissions = policyService.getManagerSubmissions(managerUser.getId());
        assertTrue(mySubmissions.stream().anyMatch(s -> s.getId().equals(submitted.getId())));

        ApprovalDecisionRequest decision = new ApprovalDecisionRequest();
        decision.setDecision(ApprovalDecisionRequest.Decision.REJECT);
        decision.setComment("Please attach Appendix B before approval.");
        policyService.decideManagerSubmission(submitted.getId(), decision, hrAdminUser.getId());

        List<PolicyDocumentDTO> afterDecision = policyService.getManagerSubmissions(managerUser.getId());
        PolicyDocumentDTO rejectedDoc = afterDecision.stream().filter(s -> s.getId().equals(submitted.getId())).findFirst().orElse(null);
        assertNotNull(rejectedDoc);
        assertEquals(PolicyApprovalStatus.REJECTED, rejectedDoc.getApprovalStatus());
        assertEquals("Please attach Appendix B before approval.", rejectedDoc.getApprovalComment());
    }

    @Test
    @DisplayName("Stage 4 Manager: Send acknowledgement reminder notification")
    void testManagerSendReminderNotification() {
        PolicyDocument doc = createAndUploadPolicy("Travel Expense Agreement", 2L, hrAdminUser.getId());
        PublishPolicyRequest pubReq = new PublishPolicyRequest();
        pubReq.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        pubReq.setMandatory(true);
        pubReq.setDueDate(LocalDate.now().plusDays(5));
        policyService.publishPolicy(doc.getId(), pubReq, hrAdminUser.getId());

        Optional<PolicyAssignment> emp1Assign = assignmentRepo.findByPolicyVersionIdAndEmployeeUserId(doc.getId(), employeeUser1.getId());
        assertTrue(emp1Assign.isPresent());

        assertDoesNotThrow(() -> policyService.sendAcknowledgementReminder(emp1Assign.get().getId(), managerUser.getId()));
        assertTrue(auditLogsById.values().stream().anyMatch(l -> "POLICY_REMINDER_SENT".equals(l.getAction())));

        Optional<PolicyAssignment> financeAssign = assignmentRepo.findByPolicyVersionIdAndEmployeeUserId(doc.getId(), employeeUser2.getId());
        assertTrue(financeAssign.isPresent());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                policyService.sendAcknowledgementReminder(financeAssign.get().getId(), managerUser.getId())
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    @DisplayName("Stage 4 Manager: Excel export of department assignments")
    void testManagerExportDepartmentAssignmentsExcel() {
        PolicyDocument doc = createAndUploadPolicy("Equipment Usage Policy", 1L, hrAdminUser.getId());
        PublishPolicyRequest pubReq = new PublishPolicyRequest();
        pubReq.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        pubReq.setMandatory(true);
        policyService.publishPolicy(doc.getId(), pubReq, hrAdminUser.getId());

        byte[] excelBytes = policyService.exportDepartmentAssignmentsToExcel(managerUser.getId(), null, null, "ALL");
        assertNotNull(excelBytes);
        assertTrue(excelBytes.length > 500);
        assertEquals((byte) 0x50, excelBytes[0], "PK zip header");
        assertEquals((byte) 0x4B, excelBytes[1], "PK zip header");
    }

    @Test
    @DisplayName("Stage 4 Role Security Matrix: MANAGER vs HR_ADMIN vs SUPER_ADMIN vs TRAINER vs EMPLOYEE")
    void testRoleMatrixManagerVsHrAdminModules() {
        // 1. Verify Controller @PreAuthorize annotations
        PreAuthorize mgrPreAuth = PolicyManagerController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(mgrPreAuth, "PolicyManagerController must have @PreAuthorize annotation");
        assertEquals("hasRole('MANAGER')", mgrPreAuth.value(), "PolicyManagerController must restrict strictly to MANAGER");

        PreAuthorize hrPreAuth = PolicyHrController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(hrPreAuth, "PolicyHrController must have @PreAuthorize annotation");
        assertEquals("hasAnyRole('HR_ADMIN', 'SUPER_ADMIN')", hrPreAuth.value(), "PolicyHrController must allow HR_ADMIN and SUPER_ADMIN");

        // 2. Test all 5 roles against PolicyManagerController & PolicyHrController
        final AtomicLong activeUserId = new AtomicLong();
        final String[] activeRole = new String[1];

        SecurityContextUtil mockSecUtil = new SecurityContextUtil(userRepo) {
            @Override
            public Long getCurrentUserId() {
                return activeUserId.get();
            }

            @Override
            public String getCurrentUserRole() {
                return activeRole[0];
            }
        };

        PolicyManagerController managerController = new PolicyManagerController(policyService, mockSecUtil);
        PolicyHrController hrController = new PolicyHrController(policyService, mockSecUtil);

        // Role 1: MANAGER -> Manager module ALLOWED, HR/Admin module DENIED
        activeUserId.set(managerUser.getId());
        activeRole[0] = "MANAGER";
        assertDoesNotThrow(() -> managerController.getDepartmentOverview(), "MANAGER must be allowed on Manager module");
        assertDoesNotThrow(() -> managerController.getDepartmentPolicies(), "MANAGER must be allowed on Manager module policies");
        assertDoesNotThrow(() -> managerController.getManagerDepartments(), "MANAGER must be allowed on Manager departments");
        assertDoesNotThrow(() -> managerController.getMySubmissions(), "MANAGER must be allowed on Manager submissions");
        assertDoesNotThrow(() -> managerController.getDepartmentReports(null, null, "ALL"), "MANAGER must be allowed on Manager reports");

        ResponseStatusException mgrOnHr = assertThrows(ResponseStatusException.class, hrController::getOrganizationOverview, "MANAGER must be denied on HR/Admin module");
        assertEquals(HttpStatus.FORBIDDEN, mgrOnHr.getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> hrController.listPolicies(null, null)).getStatusCode());

        // Role 2: HR_ADMIN -> Manager module DENIED, HR/Admin module ALLOWED
        activeUserId.set(hrAdminUser.getId());
        activeRole[0] = "HR_ADMIN";
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, managerController::getDepartmentOverview, "HR_ADMIN must be denied on Manager module").getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, managerController::getDepartmentPolicies, "HR_ADMIN must be denied on Manager policies").getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> policyService.getDepartmentOverview(hrAdminUser.getId()), "Service layer must deny HR_ADMIN on Manager overview").getStatusCode());
        assertDoesNotThrow(hrController::getOrganizationOverview, "HR_ADMIN must be allowed on HR/Admin module");
        assertDoesNotThrow(() -> hrController.listPolicies(null, null), "HR_ADMIN must be allowed on HR/Admin policies");

        // Role 3: SUPER_ADMIN -> Manager module DENIED, HR/Admin module ALLOWED
        activeUserId.set(hrAdminUser.getId());
        activeRole[0] = "SUPER_ADMIN";
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, managerController::getDepartmentOverview, "SUPER_ADMIN must be denied on Manager module").getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, managerController::getDepartmentPolicies, "SUPER_ADMIN must be denied on Manager policies").getStatusCode());
        assertDoesNotThrow(hrController::getOrganizationOverview, "SUPER_ADMIN must be allowed on HR/Admin module");
        assertDoesNotThrow(() -> hrController.listPolicies(null, null), "SUPER_ADMIN must be allowed on HR/Admin policies");

        // Role 4: TRAINER -> Manager module DENIED, HR/Admin module DENIED
        activeUserId.set(trainerUser.getId());
        activeRole[0] = "TRAINER";
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, managerController::getDepartmentOverview, "TRAINER must be denied on Manager module").getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> policyService.getDepartmentOverview(trainerUser.getId()), "Service layer must deny TRAINER on Manager overview").getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, hrController::getOrganizationOverview, "TRAINER must be denied on HR/Admin module").getStatusCode());

        // Role 5: EMPLOYEE -> Manager module DENIED, HR/Admin module DENIED
        activeUserId.set(employeeUser1.getId());
        activeRole[0] = "EMPLOYEE";
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, managerController::getDepartmentOverview, "EMPLOYEE must be denied on Manager module").getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> policyService.getDepartmentOverview(employeeUser1.getId()), "Service layer must deny EMPLOYEE on Manager overview").getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, hrController::getOrganizationOverview, "EMPLOYEE must be denied on HR/Admin module").getStatusCode());
    }

    @Test
    @DisplayName("Stage 5 Employee My Profile: Own assignments, acknowledgement history, and self-only isolation")
    void testStage5EmployeeProfileAssignmentsAndHistory() {
        PolicyDocument activeDoc = createAndUploadPolicy("Workplace Safety Handbook", 1L, hrAdminUser.getId());
        PublishPolicyRequest pubActive = new PublishPolicyRequest();
        pubActive.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubActive.setEmployeeUserIds(List.of(employeeUser1.getId()));
        pubActive.setMandatory(true);
        pubActive.setDueDate(LocalDate.now().plusDays(7));
        policyService.publishPolicy(activeDoc.getId(), pubActive, hrAdminUser.getId());

        PolicyDocument otherDoc = createAndUploadPolicy("Finance Audit Protocol", 2L, hrAdminUser.getId());
        PublishPolicyRequest pubOther = new PublishPolicyRequest();
        pubOther.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubOther.setEmployeeUserIds(List.of(employeeUser2.getId()));
        pubOther.setMandatory(false);
        policyService.publishPolicy(otherDoc.getId(), pubOther, hrAdminUser.getId());

        PolicyDocument archivedDoc = createAndUploadPolicy("Retired Policy 2020", 1L, hrAdminUser.getId());
        PublishPolicyRequest pubArchived = new PublishPolicyRequest();
        pubArchived.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        policyService.publishPolicy(archivedDoc.getId(), pubArchived, hrAdminUser.getId());
        policyService.archivePolicy(archivedDoc.getId(), hrAdminUser.getId());

        final AtomicLong activeUserId = new AtomicLong(employeeUser1.getId());
        SecurityContextUtil mockSecUtil = new SecurityContextUtil(userRepo) {
            @Override
            public Long getCurrentUserId() {
                return activeUserId.get();
            }

            @Override
            public String getCurrentUserRole() {
                return "EMPLOYEE";
            }
        };
        PolicyEmployeeController empController = new PolicyEmployeeController(policyService, mockSecUtil);

        // 1. Employee 1 sees activeDoc with full metadata (effectiveDate, categoryId, categoryName), does NOT see otherDoc or archivedDoc
        List<PolicyAssignmentDTO> emp1List = empController.getMyAssignments("ALL").getBody().getData();
        assertTrue(emp1List.stream().anyMatch(a -> a.getPolicyDocumentId().equals(activeDoc.getId()) && a.getEffectiveDate() != null && a.getCategoryId() != null));
        assertFalse(emp1List.stream().anyMatch(a -> a.getPolicyDocumentId().equals(otherDoc.getId())), "Employee 1 must not see Employee 2's individual policy");
        assertFalse(emp1List.stream().anyMatch(a -> a.getPolicyDocumentId().equals(archivedDoc.getId())), "Archived policies must not appear in Employee My Profile");

        // 2. Employee 1 acknowledges activeDoc; verify history endpoint returns strictly Employee 1's acknowledgement
        Long activeAssignmentId = emp1List.stream().filter(a -> a.getPolicyDocumentId().equals(activeDoc.getId())).findFirst().orElseThrow().getId();
        AcknowledgePolicyRequest ackReq = new AcknowledgePolicyRequest();
        ackReq.setConfirmed(true);
        policyService.acknowledgePolicy(activeAssignmentId, ackReq, employeeUser1.getId(), "127.0.0.1", "TestBrowser");

        List<PolicyAcknowledgementDTO> emp1History = empController.getMyAcknowledgements().getBody().getData();
        assertEquals(1, emp1History.size());
        assertEquals(activeDoc.getId(), emp1History.get(0).getPolicyDocumentId());

        // 3. Switch authenticated user to Employee 2 -> Employee 2 has 0 acknowledgements and cannot see Employee 1's history
        activeUserId.set(employeeUser2.getId());
        List<PolicyAcknowledgementDTO> emp2History = empController.getMyAcknowledgements().getBody().getData();
        assertTrue(emp2History.isEmpty(), "Employee 2 must not see Employee 1's acknowledgement history");
    }

    @Test
    @DisplayName("Stage 6: Secure PDF Viewer & Explicit Acknowledgement Workflow Verification")
    void testStage6SecureViewerAndExplicitAcknowledgementWorkflow() {
        Long catId = categoryRepo.findAll().get(0).getId();
        // Setup: Create policy with allowDownload = false targeted to Employee 1 only
        PolicyDocument targetedDoc = createAndUploadPolicy("Confidential Security Agreement", catId, hrAdminUser.getId());
        PolicyVersion v1 = versionRepo.findFirstByPolicyDocumentIdOrderByCreatedAtDesc(targetedDoc.getId()).orElseThrow();
        v1.setAllowDownload(false); // Restrict downloads
        versionRepo.save(v1);

        PublishPolicyRequest pubReq = new PublishPolicyRequest();
        pubReq.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubReq.setEmployeeUserIds(List.of(employeeUser1.getId()));
        pubReq.setMandatory(true);
        pubReq.setDueDate(LocalDate.now().plusDays(14));
        policyService.publishPolicy(targetedDoc.getId(), pubReq, hrAdminUser.getId());

        List<PolicyAssignment> assignments = assignmentRepo.findByPolicyDocumentId(targetedDoc.getId());
        assertEquals(1, assignments.size());
        PolicyAssignment emp1Assignment = assignments.get(0);
        assertEquals(employeeUser1.getId(), emp1Assignment.getEmployeeUser().getId());

        // 1. In-app viewer access: Employee 1 can view; Employee 2 CANNOT view (403 Forbidden)
        assertDoesNotThrow(() -> {
            policyService.viewPolicyDocument(v1.getId(), employeeUser1.getId(), "EMPLOYEE");
        }, "Assigned employee must be allowed to view in-app");

        ResponseStatusException unauthViewEx = assertThrows(ResponseStatusException.class, () -> {
            policyService.viewPolicyDocument(v1.getId(), employeeUser2.getId(), "EMPLOYEE");
        }, "Unassigned employee must be forbidden from viewing targeted document");
        assertEquals(HttpStatus.FORBIDDEN, unauthViewEx.getStatusCode());

        // 2. Download enforcement: Employee 1 cannot download when allowDownload=false (403 Forbidden); HR Admin CAN download
        ResponseStatusException downloadBlockedEx = assertThrows(ResponseStatusException.class, () -> {
            policyService.downloadPolicyDocument(v1.getId(), employeeUser1.getId(), "EMPLOYEE");
        }, "Employee download must be blocked when allowDownload=false");
        assertEquals(HttpStatus.FORBIDDEN, downloadBlockedEx.getStatusCode());

        assertDoesNotThrow(() -> {
            policyService.downloadPolicyDocument(v1.getId(), hrAdminUser.getId(), "HR_ADMIN");
        }, "HR Admin administrative override must allow download");

        // 3. Acknowledgement validation: Explicit confirmation required (All 4 cases)
        int initialAckCount = acknowledgementRepo.findAll().size();
        long initialAuditCount = auditLogsById.values().stream().filter(l -> "POLICY_ACKNOWLEDGED".equals(l.getAction())).count();

        // Case 3a: confirmed = false -> reject with HTTP 400
        AcknowledgePolicyRequest reqFalse = new AcknowledgePolicyRequest(false, null);
        ResponseStatusException exFalse = assertThrows(ResponseStatusException.class, () -> {
            policyService.acknowledgePolicy(emp1Assignment.getId(), reqFalse, employeeUser1.getId(), "10.0.0.1", "Chrome");
        }, "confirmed: false must be rejected with 400");
        assertEquals(HttpStatus.BAD_REQUEST, exFalse.getStatusCode());

        // Case 3b: confirmed = null -> reject with HTTP 400
        AcknowledgePolicyRequest reqNull = new AcknowledgePolicyRequest(null, null);
        ResponseStatusException exNull = assertThrows(ResponseStatusException.class, () -> {
            policyService.acknowledgePolicy(emp1Assignment.getId(), reqNull, employeeUser1.getId(), "10.0.0.1", "Chrome");
        }, "confirmed: null must be rejected with 400");
        assertEquals(HttpStatus.BAD_REQUEST, exNull.getStatusCode());

        // Case 3c: Missing confirmed field (default empty request) -> reject with HTTP 400
        AcknowledgePolicyRequest reqMissing = new AcknowledgePolicyRequest();
        ResponseStatusException exMissing = assertThrows(ResponseStatusException.class, () -> {
            policyService.acknowledgePolicy(emp1Assignment.getId(), reqMissing, employeeUser1.getId(), "10.0.0.1", "Chrome");
        }, "Missing confirmed field must be rejected with 400");
        assertEquals(HttpStatus.BAD_REQUEST, exMissing.getStatusCode());

        // Case 3d: Null request entirely -> reject with HTTP 400
        ResponseStatusException exNullReq = assertThrows(ResponseStatusException.class, () -> {
            policyService.acknowledgePolicy(emp1Assignment.getId(), null, employeeUser1.getId(), "10.0.0.1", "Chrome");
        }, "Null request must be rejected with 400");
        assertEquals(HttpStatus.BAD_REQUEST, exNullReq.getStatusCode());

        // Verify rejected requests created NO acknowledgement records and NO success audit events
        assertEquals(initialAckCount, acknowledgementRepo.findAll().size(), "Rejected requests must create 0 acknowledgement records");
        assertEquals(initialAuditCount, auditLogsById.values().stream().filter(l -> "POLICY_ACKNOWLEDGED".equals(l.getAction())).count(), "Rejected requests must create 0 POLICY_ACKNOWLEDGED audit events");

        // 4. Cross-employee acknowledgement prevention: Employee 2 cannot acknowledge Employee 1's assignment
        AcknowledgePolicyRequest validReq = AcknowledgePolicyRequest.confirmed();
        ResponseStatusException crossAckEx = assertThrows(ResponseStatusException.class, () -> {
            policyService.acknowledgePolicy(emp1Assignment.getId(), validReq, employeeUser2.getId(), "10.0.0.2", "Chrome");
        }, "Employee 2 must not acknowledge Employee 1's assignment");
        assertEquals(HttpStatus.FORBIDDEN, crossAckEx.getStatusCode());

        // 5. Valid explicit acknowledgement by Employee 1
        PolicyAcknowledgementDTO ackDto = policyService.acknowledgePolicy(
                emp1Assignment.getId(),
                validReq,
                employeeUser1.getId(),
                "192.168.1.50",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        );
        assertNotNull(ackDto);
        assertNotNull(ackDto.getAcceptedAt(), "Server timestamp must be recorded");
        assertEquals("1.0", ackDto.getVersionNumber());
        assertEquals(v1.getSha256Hash(), ackDto.getDocumentSha256Hash(), "Document SHA-256 hash must be recorded");
        assertEquals(employeeUser1.getId(), ackDto.getEmployeeUserId());

        // 6. Idempotent duplicate check: Repeated acknowledgement returns existing without duplicating
        int ackCountBefore = acknowledgementRepo.findAll().size();
        PolicyAcknowledgementDTO dupAckDto = policyService.acknowledgePolicy(
                emp1Assignment.getId(),
                validReq,
                employeeUser1.getId(),
                "192.168.1.50",
                "Mozilla/5.0"
        );
        assertEquals(ackDto.getId(), dupAckDto.getId(), "Duplicate call must return existing acknowledgement record");
        assertEquals(ackCountBefore, acknowledgementRepo.findAll().size(), "Duplicate call must not create additional database record");

        // 7. Cannot acknowledge archived document
        targetedDoc.setDocumentStatus(PolicyDocumentStatus.ARCHIVED);
        targetedDoc.setArchivedAt(LocalDateTime.now());
        documentRepo.save(targetedDoc);

        ResponseStatusException archivedAckEx = assertThrows(ResponseStatusException.class, () -> {
            policyService.acknowledgePolicy(emp1Assignment.getId(), validReq, employeeUser1.getId(), "192.168.1.50", "Chrome");
        }, "Cannot acknowledge archived policy");
        assertEquals(HttpStatus.BAD_REQUEST, archivedAckEx.getStatusCode());

        // Restore status for history verification
        targetedDoc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        targetedDoc.setArchivedAt(null);
        documentRepo.save(targetedDoc);

        // 8. Inactive or terminated employee cannot acknowledge policy
        employeeUser1.setStatus(UserStatus.INACTIVE);
        ResponseStatusException inactiveEx = assertThrows(ResponseStatusException.class, () -> {
            policyService.acknowledgePolicy(emp1Assignment.getId(), validReq, employeeUser1.getId(), "192.168.1.50", "Chrome");
        }, "Inactive employee cannot acknowledge policy");
        assertEquals(HttpStatus.BAD_REQUEST, inactiveEx.getStatusCode());
        employeeUser1.setStatus(UserStatus.ACTIVE); // restore

        // 9. Revisit past acknowledged version: Even if user is unassigned later, acknowledged version remains accessible
        assertDoesNotThrow(() -> {
            policyService.viewPolicyDocument(v1.getId(), employeeUser1.getId(), "EMPLOYEE");
        }, "Employee can revisit previously acknowledged version");
    }

    @Test
    @DisplayName("Stage 6: Watermarked PDF Download - Employee Download Embedded Watermark Verification")
    void testDownloadPolicyDocumentWithWatermark() throws Exception {
        Long catId = categoryRepo.findAll().get(0).getId();
        PolicyDocument doc = createAndUploadPolicy("Employee Safety Guidelines", catId, hrAdminUser.getId());
        PolicyVersion v1 = versionRepo.findFirstByPolicyDocumentIdOrderByCreatedAtDesc(doc.getId()).orElseThrow();
        v1.setAllowDownload(true);
        versionRepo.save(v1);

        PublishPolicyRequest pubReq = new PublishPolicyRequest();
        pubReq.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubReq.setEmployeeUserIds(List.of(employeeUser1.getId(), employeeUser2.getId()));
        pubReq.setMandatory(true);
        policyService.publishPolicy(doc.getId(), pubReq, hrAdminUser.getId());

        // Employee 1 downloads watermarked copy
        ZohoWorkDriveDownloadService.DownloadedDocument emp1Download =
                policyService.downloadPolicyDocument(v1.getId(), employeeUser1.getId(), "EMPLOYEE");
        assertNotNull(emp1Download);
        assertTrue(emp1Download.content().length > 0);

        // Employee 2 downloads watermarked copy
        ZohoWorkDriveDownloadService.DownloadedDocument emp2Download =
                policyService.downloadPolicyDocument(v1.getId(), employeeUser2.getId(), "EMPLOYEE");
        assertNotNull(emp2Download);
        assertTrue(emp2Download.content().length > 0);

        // Verify PDF integrity
        PdfReader reader1 = new PdfReader(emp1Download.content());
        assertEquals(1, reader1.getNumberOfPages());
        reader1.close();

        PdfReader reader2 = new PdfReader(emp2Download.content());
        assertEquals(1, reader2.getNumberOfPages());
        reader2.close();

        // Verify distinct employee watermarked derivatives
        assertNotEquals(computeSha256(emp1Download.content()), computeSha256(emp2Download.content()),
                "Different authenticated employees must receive separate watermarked copies with unique content hashes");

        // Verify audit logs
        assertTrue(auditLogsById.values().stream()
                .anyMatch(l -> "DOCUMENT_DOWNLOADED".equals(l.getAction()) && l.getActorUser() != null && employeeUser1.getId().equals(l.getActorUser().getId())));
        assertTrue(auditLogsById.values().stream()
                .anyMatch(l -> "DOCUMENT_DOWNLOADED".equals(l.getAction()) && l.getActorUser() != null && employeeUser2.getId().equals(l.getActorUser().getId())));
    }

    // =========================================================================
    // Stage 7: Scheduled Reminders, Escalations & Periodic Digest Tests
    // =========================================================================

    @Test
    @DisplayName("Stage 7: Scheduled reminders generate Due-Soon (5d), Due-Today (0d), Overdue (1d), and recurring overdue (7d interval)")
    void testStage7ScheduledRemindersDueSoonDueTodayAndOverdue() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate today = LocalDate.now();

        PolicyDocument doc = createAndUploadPolicy("Information Security Protocol", 2L, hrAdminUser.getId());
        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        PolicyVersion version = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(doc.getId()))
                .findFirst().orElseThrow();

        // 1. Due Soon (5 days before deadline)
        PolicyAssignment aDueSoon = new PolicyAssignment();
        aDueSoon.setId(assignSeq.getAndIncrement());
        aDueSoon.setPolicyDocument(doc);
        aDueSoon.setPolicyVersion(version);
        aDueSoon.setEmployeeUser(employeeUser1);
        aDueSoon.setEmployeeIdSnapshot(employeeUser1.getEmployeeId());
        aDueSoon.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aDueSoon.setDueDate(today.plusDays(5));
        assignmentsById.put(aDueSoon.getId(), aDueSoon);

        // 2. Due Today (deadline is today)
        PolicyAssignment aDueToday = new PolicyAssignment();
        aDueToday.setId(assignSeq.getAndIncrement());
        aDueToday.setPolicyDocument(doc);
        aDueToday.setPolicyVersion(version);
        aDueToday.setEmployeeUser(employeeUser2);
        aDueToday.setEmployeeIdSnapshot(employeeUser2.getEmployeeId());
        aDueToday.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aDueToday.setDueDate(today);
        assignmentsById.put(aDueToday.getId(), aDueToday);

        // 3. Overdue (1 day overdue)
        User emp3 = createUser(15L, "EMP-015", "Overdue Emp", "overdue@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        PolicyAssignment aOverdue1 = new PolicyAssignment();
        aOverdue1.setId(assignSeq.getAndIncrement());
        aOverdue1.setPolicyDocument(doc);
        aOverdue1.setPolicyVersion(version);
        aOverdue1.setEmployeeUser(emp3);
        aOverdue1.setEmployeeIdSnapshot(emp3.getEmployeeId());
        aOverdue1.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aOverdue1.setDueDate(today.minusDays(1));
        assignmentsById.put(aOverdue1.getId(), aOverdue1);

        // Execute scheduled reminder scan
        Map<String, Object> result = schedulerService.processPolicyDeadlineReminders(today, true);
        assertNotNull(result);
        assertTrue(notifications.size() >= 3, "Must generate due-soon, due-today, and overdue notifications");

        // Verify Due Soon notification details
        Notification notifDueSoon = notifications.stream()
                .filter(n -> ("policy-due-5d:" + aDueSoon.getId()).equals(n.getDeduplicationKey()))
                .findFirst().orElse(null);
        assertNotNull(notifDueSoon, "5-day due-soon notification must exist");
        assertEquals(employeeUser1.getId(), notifDueSoon.getRecipient().getId());
        assertEquals(NotificationType.POLICY_DUE_SOON, notifDueSoon.getType());
        assertEquals("/profile#policies", notifDueSoon.getActionUrl());
        assertTrue(notifDueSoon.getMessage().contains("5 days"));

        // Verify Due Today notification details
        Notification notifDueToday = notifications.stream()
                .filter(n -> ("policy-due-today:" + aDueToday.getId() + ":" + today).equals(n.getDeduplicationKey()))
                .findFirst().orElse(null);
        assertNotNull(notifDueToday, "Due-today notification must exist");
        assertEquals(employeeUser2.getId(), notifDueToday.getRecipient().getId());
        assertEquals(NotificationType.POLICY_DUE_SOON, notifDueToday.getType());
        assertEquals("/profile#policies", notifDueToday.getActionUrl());
        assertTrue(notifDueToday.getMessage().contains("today"));

        // Verify Overdue notification details
        Notification notifOverdue = notifications.stream()
                .filter(n -> ("policy-overdue:" + aOverdue1.getId() + ":" + today).equals(n.getDeduplicationKey()))
                .findFirst().orElse(null);
        assertNotNull(notifOverdue, "Overdue notification must exist");
        assertEquals(emp3.getId(), notifOverdue.getRecipient().getId());
        assertEquals(NotificationType.POLICY_OVERDUE, notifOverdue.getType());
        assertEquals("/profile#policies", notifOverdue.getActionUrl());

        // 4. Test Due-Date Change Handling
        // Move aDueSoon deadline forward by 10 days; re-running on 'today' must not send due-soon
        aDueSoon.setDueDate(today.plusDays(15));
        notifications.clear();
        notificationDedupKeys.clear();
        schedulerService.processPolicyDeadlineReminders(today, true);
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(employeeUser1.getId())),
                "Assignment with rescheduled due date (15 days away) must not receive due-soon reminder today");
    }

    @Test
    @DisplayName("Stage 7: Strict Exclusions - null due date, acknowledged assignments, archived policies, unpublished drafts, minor version coverage")
    void testStage7ExclusionsStrictNullDueDateAcknowledgedArchivedUnpublished() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate today = LocalDate.now();

        PolicyDocument doc = createAndUploadPolicy("Workplace Safety Rules", 1L, hrAdminUser.getId());
        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        PolicyVersion v1 = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(doc.getId()))
                .findFirst().orElseThrow();

        // 1. Open-ended assignment (dueDate == null) -> NEVER notified, NEVER overdue
        PolicyAssignment aNullDue = new PolicyAssignment();
        aNullDue.setId(assignSeq.getAndIncrement());
        aNullDue.setPolicyDocument(doc);
        aNullDue.setPolicyVersion(v1);
        aNullDue.setEmployeeUser(employeeUser1);
        aNullDue.setEmployeeIdSnapshot(employeeUser1.getEmployeeId());
        aNullDue.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aNullDue.setDueDate(null);
        assignmentsById.put(aNullDue.getId(), aNullDue);

        // 2. Already Acknowledged assignment -> Excluded
        PolicyAssignment aAcked = new PolicyAssignment();
        aAcked.setId(assignSeq.getAndIncrement());
        aAcked.setPolicyDocument(doc);
        aAcked.setPolicyVersion(v1);
        aAcked.setEmployeeUser(employeeUser2);
        aAcked.setEmployeeIdSnapshot(employeeUser2.getEmployeeId());
        aAcked.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aAcked.setDueDate(today.minusDays(2));
        assignmentsById.put(aAcked.getId(), aAcked);

        PolicyAcknowledgement ack = new PolicyAcknowledgement();
        ack.setId(ackSeq.getAndIncrement());
        ack.setPolicyAssignment(aAcked);
        ack.setPolicyDocument(doc);
        ack.setPolicyVersion(v1);
        ack.setEmployeeUser(employeeUser2);
        ack.setEmployeeIdSnapshot(employeeUser2.getEmployeeId());
        ack.setAuthenticatedUser(employeeUser2);
        ack.setDocumentSha256Hash(v1.getSha256Hash());
        acknowledgementsById.put(ack.getId(), ack);

        // 3. Archived Document assignment -> Excluded
        PolicyDocument archivedDoc = createAndUploadPolicy("Deprecated Safety Manual", 1L, hrAdminUser.getId());
        archivedDoc.setDocumentStatus(PolicyDocumentStatus.ARCHIVED);
        PolicyVersion archVer = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(archivedDoc.getId()))
                .findFirst().orElseThrow();

        User empArch = createUser(16L, "EMP-016", "Archived Doc Emp", "archived@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        PolicyAssignment aArchived = new PolicyAssignment();
        aArchived.setId(assignSeq.getAndIncrement());
        aArchived.setPolicyDocument(archivedDoc);
        aArchived.setPolicyVersion(archVer);
        aArchived.setEmployeeUser(empArch);
        aArchived.setEmployeeIdSnapshot(empArch.getEmployeeId());
        aArchived.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aArchived.setDueDate(today.minusDays(5));
        assignmentsById.put(aArchived.getId(), aArchived);

        // 4. Unpublished Draft Document assignment -> Excluded
        PolicyDocument draftDoc = createAndUploadPolicy("Draft Unapproved Policy", 1L, hrAdminUser.getId());
        draftDoc.setDocumentStatus(PolicyDocumentStatus.DRAFT);
        PolicyVersion draftVer = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(draftDoc.getId()))
                .findFirst().orElseThrow();

        User empDraft = createUser(17L, "EMP-017", "Draft Emp", "draft@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        PolicyAssignment aDraft = new PolicyAssignment();
        aDraft.setId(assignSeq.getAndIncrement());
        aDraft.setPolicyDocument(draftDoc);
        aDraft.setPolicyVersion(draftVer);
        aDraft.setEmployeeUser(empDraft);
        aDraft.setEmployeeIdSnapshot(empDraft.getEmployeeId());
        aDraft.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aDraft.setDueDate(today.minusDays(2));
        assignmentsById.put(aDraft.getId(), aDraft);

        // Execute scan
        schedulerService.processPolicyDeadlineReminders(today, true);

        // Verifications
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(employeeUser1.getId())),
                "Open-ended assignment (null dueDate) must never receive reminders or overdue alerts");
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(employeeUser2.getId())),
                "Acknowledged assignment must never receive reminders or overdue alerts");
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(empArch.getId())),
                "Archived policy assignments must never receive reminders or overdue alerts");
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(empDraft.getId())),
                "Unpublished/draft policy assignments must never receive reminders or overdue alerts");
    }

    @Test
    @DisplayName("Stage 7: Employee Status & Leave Handling - ACTIVE eligible, ON_LEAVE paused, INACTIVE and TERMINATED excluded")
    void testStage7EmployeeStatusAndLeaveHandling() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate today = LocalDate.now();

        PolicyDocument doc = createAndUploadPolicy("Disciplinary Code", 1L, hrAdminUser.getId());
        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        PolicyVersion version = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(doc.getId()))
                .findFirst().orElseThrow();

        // 1. ACTIVE employee
        PolicyAssignment aActive = new PolicyAssignment();
        aActive.setId(assignSeq.getAndIncrement());
        aActive.setPolicyDocument(doc);
        aActive.setPolicyVersion(version);
        aActive.setEmployeeUser(employeeUser1);
        aActive.setEmployeeIdSnapshot(employeeUser1.getEmployeeId());
        aActive.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aActive.setDueDate(today.plusDays(5));
        assignmentsById.put(aActive.getId(), aActive);

        // 2. ON_LEAVE employee
        PolicyAssignment aOnLeave = new PolicyAssignment();
        aOnLeave.setId(assignSeq.getAndIncrement());
        aOnLeave.setPolicyDocument(doc);
        aOnLeave.setPolicyVersion(version);
        aOnLeave.setEmployeeUser(employeeOnLeave);
        aOnLeave.setEmployeeIdSnapshot(employeeOnLeave.getEmployeeId());
        aOnLeave.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aOnLeave.setDueDate(today.plusDays(5));
        assignmentsById.put(aOnLeave.getId(), aOnLeave);

        // 3. INACTIVE employee
        PolicyAssignment aInactive = new PolicyAssignment();
        aInactive.setId(assignSeq.getAndIncrement());
        aInactive.setPolicyDocument(doc);
        aInactive.setPolicyVersion(version);
        aInactive.setEmployeeUser(employeeInactive);
        aInactive.setEmployeeIdSnapshot(employeeInactive.getEmployeeId());
        aInactive.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aInactive.setDueDate(today.plusDays(5));
        assignmentsById.put(aInactive.getId(), aInactive);

        // 4. TERMINATED employee
        PolicyAssignment aTerminated = new PolicyAssignment();
        aTerminated.setId(assignSeq.getAndIncrement());
        aTerminated.setPolicyDocument(doc);
        aTerminated.setPolicyVersion(version);
        aTerminated.setEmployeeUser(employeeTerminated);
        aTerminated.setEmployeeIdSnapshot(employeeTerminated.getEmployeeId());
        aTerminated.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aTerminated.setDueDate(today.plusDays(5));
        assignmentsById.put(aTerminated.getId(), aTerminated);

        // When remindOnLeave is false (paused leave policy)
        schedulerService.setRemindOnLeave(false);
        schedulerService.processPolicyDeadlineReminders(today, true);

        // ACTIVE received notification
        assertTrue(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(employeeUser1.getId())),
                "ACTIVE employee must receive reminder");
        // ON_LEAVE paused (0 notifications)
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(employeeOnLeave.getId())),
                "ON_LEAVE employee reminder must be paused when remindOnLeave is false");
        // INACTIVE excluded (0 notifications)
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(employeeInactive.getId())),
                "INACTIVE employee must be excluded from reminders");
        // TERMINATED excluded (0 notifications)
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(employeeTerminated.getId())),
                "TERMINATED employee must be excluded from reminders");

        // Verify assignment and history records remain intact
        assertNotNull(assignmentRepo.findById(aOnLeave.getId()).orElse(null), "ON_LEAVE assignment record must be preserved intact");
        assertNotNull(assignmentRepo.findById(aTerminated.getId()).orElse(null), "TERMINATED assignment record must be preserved intact");

        // Restore remindOnLeave default
        schedulerService.setRemindOnLeave(true);
    }

    @Test
    @DisplayName("Stage 7: Level 2 Manager Escalation, Level 3 HR Prolonged Escalation, and Fallback when Manager is missing")
    void testStage7ManagerAndHrEscalationsDepartmentScopingAndFallback() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate today = LocalDate.now();

        PolicyDocument doc = createAndUploadPolicy("Operational Protocol", 1L, hrAdminUser.getId());
        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        PolicyVersion version = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(doc.getId()))
                .findFirst().orElseThrow();

        // 1. Level 2 Manager Escalation:
        // Employee in childDept ("Ocean Freight Operations") is 1 day overdue.
        // managerUser manages parentDept ("Freight Forwarding"), so managerDeptIds includes childDept 11L.
        User empInChildDept = createUser(21L, "EMP-021", "Child Dept Emp", "child.emp@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        PolicyAssignment aOverdueManager = new PolicyAssignment();
        aOverdueManager.setId(assignSeq.getAndIncrement());
        aOverdueManager.setPolicyDocument(doc);
        aOverdueManager.setPolicyVersion(version);
        aOverdueManager.setEmployeeUser(empInChildDept);
        aOverdueManager.setEmployeeIdSnapshot(empInChildDept.getEmployeeId());
        aOverdueManager.setDepartmentIdSnapshot(11L); // Ocean Freight Operations
        aOverdueManager.setDepartmentNameSnapshot("Ocean Freight Operations");
        aOverdueManager.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aOverdueManager.setDueDate(today.minusDays(1)); // 1 day overdue = manager escalation threshold
        assignmentsById.put(aOverdueManager.getId(), aOverdueManager);

        // 2. Level 3 HR/Admin Escalation:
        // Prolonged overdue: 7 days overdue (escalationHrDays = 7)
        User empProlonged = createUser(22L, "EMP-022", "Prolonged Emp", "prolonged.emp@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        PolicyAssignment aOverdueHr = new PolicyAssignment();
        aOverdueHr.setId(assignSeq.getAndIncrement());
        aOverdueHr.setPolicyDocument(doc);
        aOverdueHr.setPolicyVersion(version);
        aOverdueHr.setEmployeeUser(empProlonged);
        aOverdueHr.setEmployeeIdSnapshot(empProlonged.getEmployeeId());
        aOverdueHr.setDepartmentIdSnapshot(11L);
        aOverdueHr.setDepartmentNameSnapshot("Ocean Freight Operations");
        aOverdueHr.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aOverdueHr.setDueDate(today.minusDays(7)); // 7 days overdue = HR escalation threshold
        assignmentsById.put(aOverdueHr.getId(), aOverdueHr);

        // 3. Fallback when Manager is missing:
        // Employee in "Finance" (unrelatedDept 20L) where no manager exists
        User empNoManager = createUser(23L, "EMP-023", "Unmanaged Emp", "unmanaged@fairmacs.com", "Finance", Role.EMPLOYEE, UserStatus.ACTIVE);
        PolicyAssignment aOverdueFallback = new PolicyAssignment();
        aOverdueFallback.setId(assignSeq.getAndIncrement());
        aOverdueFallback.setPolicyDocument(doc);
        aOverdueFallback.setPolicyVersion(version);
        aOverdueFallback.setEmployeeUser(empNoManager);
        aOverdueFallback.setEmployeeIdSnapshot(empNoManager.getEmployeeId());
        aOverdueFallback.setDepartmentIdSnapshot(20L); // Finance
        aOverdueFallback.setDepartmentNameSnapshot("Finance");
        aOverdueFallback.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aOverdueFallback.setDueDate(today.minusDays(1)); // 1 day overdue
        assignmentsById.put(aOverdueFallback.getId(), aOverdueFallback);

        // Execute scan
        schedulerService.processPolicyDeadlineReminders(today, true);

        // Verify Level 2 Manager Escalation
        Notification mgrEscalation = notifications.stream()
                .filter(n -> n.getRecipient().getId().equals(managerUser.getId()) && NotificationType.POLICY_ESCALATION.equals(n.getType()))
                .findFirst().orElse(null);
        assertNotNull(mgrEscalation, "Department Manager must receive Level 2 escalation for overdue employee");
        assertEquals("/manager/policies", mgrEscalation.getActionUrl());
        assertTrue(mgrEscalation.getTitle().contains("Manager Escalation"));
        assertTrue(mgrEscalation.getMessage().contains("Child Dept Emp"));

        // Verify Level 3 HR/Admin Escalation
        Notification hrProlongedEscalation = notifications.stream()
                .filter(n -> n.getRecipient().getId().equals(hrAdminUser.getId())
                        && n.getTitle().contains("HR Escalation (Level 3)"))
                .findFirst().orElse(null);
        assertNotNull(hrProlongedEscalation, "HR Admin must receive Level 3 escalation for 7-day prolonged overdue assignment");
        assertEquals("/hr/policies", hrProlongedEscalation.getActionUrl());
        assertTrue(hrProlongedEscalation.getMessage().contains("Prolonged overdue"));
        assertTrue(hrProlongedEscalation.getMessage().contains("Prolonged Emp"));

        // Verify Fallback Escalation to HR when Manager is missing
        Notification hrFallback = notifications.stream()
                .filter(n -> n.getRecipient().getId().equals(hrAdminUser.getId())
                        && n.getTitle().contains("Manager Escalation Fallback"))
                .findFirst().orElse(null);
        assertNotNull(hrFallback, "HR Admin must receive fallback escalation when employee has no eligible manager");
        assertEquals("/hr/policies", hrFallback.getActionUrl());
        assertTrue(hrFallback.getMessage().contains("Unmanaged Emp"));
    }

    @Test
    @DisplayName("Stage 7: Weekly Compliance Digests - HR/Admin org digest, Manager department-scoped digest, and deduplication")
    void testStage7WeeklyComplianceDigests() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate monday = LocalDate.now();

        // 1. Run Weekly Policy Digests
        Map<String, Object> digestResult = schedulerService.processWeeklyPolicyDigests(monday, true);
        assertNotNull(digestResult);
        assertTrue((int) digestResult.get("digestsCreated") >= 1, "Must generate weekly compliance digests");

        // Verify HR/Admin Digest
        Notification hrDigest = notifications.stream()
                .filter(n -> n.getRecipient().getId().equals(hrAdminUser.getId()) && NotificationType.POLICY_DIGEST.equals(n.getType()))
                .findFirst().orElse(null);
        assertNotNull(hrDigest, "HR Admin must receive weekly policy compliance digest");
        assertEquals("/hr/policies", hrDigest.getActionUrl());
        assertTrue(hrDigest.getTitle().contains("Weekly Policy Compliance Digest"));
        assertTrue(hrDigest.getMessage().contains("Weekly Policies & Agreements Summary"));

        // Verify Manager Digest
        Notification mgrDigest = notifications.stream()
                .filter(n -> n.getRecipient().getId().equals(managerUser.getId()) && NotificationType.POLICY_DIGEST.equals(n.getType()))
                .findFirst().orElse(null);
        assertNotNull(mgrDigest, "Manager must receive weekly department-scoped policy compliance digest");
        assertEquals("/manager/policies", mgrDigest.getActionUrl());
        assertTrue(mgrDigest.getTitle().contains("Weekly Department Policy Compliance"));

        // Verify Manager does NOT receive HR Org digest
        assertFalse(notifications.stream()
                .anyMatch(n -> n.getRecipient().getId().equals(managerUser.getId()) && n.getTitle().contains("Organization")),
                "Manager must never receive organization-wide HR digest");

        // 2. Duplicate prevention on retry / repeated execution
        int countBeforeRetry = notifications.size();
        schedulerService.processWeeklyPolicyDigests(monday, true);
        assertEquals(countBeforeRetry, notifications.size(), "Deduplication must prevent duplicate weekly digests for the same week");
    }

    @Test
    @DisplayName("Stage 7 Behavioural: Strict Overdue intervals - Day 1 initial, recurring Day 8 and 15, silent on Days 2-7 and 9-14")
    void testStage7OverdueReminderIntervalsSevenDayStrictBehavior() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate today = LocalDate.now();

        PolicyDocument doc = createAndUploadPolicy("Code of Business Conduct", 1L, hrAdminUser.getId());
        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        PolicyVersion v1 = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(doc.getId()))
                .findFirst().orElseThrow();

        // Create 15 employees with assignments ranging from 1 to 15 days overdue
        Map<Integer, User> empByOverdueDays = new HashMap<>();
        for (int days = 1; days <= 15; days++) {
            User emp = createUser(100L + days, "EMP-OV-" + days, "Overdue Employee " + days,
                    "overdue" + days + "@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
            PolicyAssignment a = new PolicyAssignment();
            a.setId(assignSeq.getAndIncrement());
            a.setPolicyDocument(doc);
            a.setPolicyVersion(v1);
            a.setEmployeeUser(emp);
            a.setEmployeeIdSnapshot(emp.getEmployeeId());
            a.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
            a.setDueDate(today.minusDays(days));
            assignmentsById.put(a.getId(), a);
            empByOverdueDays.put(days, emp);
        }

        // Execute scheduled reminder scan
        schedulerService.processPolicyDeadlineReminders(today, true);

        // Verification of Employee Reminders:
        // Day 1 (initial overdue): MUST receive reminder
        assertTrue(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(empByOverdueDays.get(1).getId())
                        && NotificationType.POLICY_OVERDUE.equals(n.getType())),
                "Day 1 overdue employee must receive initial overdue reminder");

        // Days 2 through 7: MUST NOT receive employee overdue reminders (prevent daily spam)
        for (int d = 2; d <= 7; d++) {
            final int dayVal = d;
            assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(empByOverdueDays.get(dayVal).getId())
                            && NotificationType.POLICY_OVERDUE.equals(n.getType())),
                    "Day " + d + " overdue employee must NOT receive reminder (must remain silent between 7-day intervals)");
        }

        // Day 8 (1 + 7 days overdue): MUST receive recurring overdue reminder
        assertTrue(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(empByOverdueDays.get(8).getId())
                        && NotificationType.POLICY_OVERDUE.equals(n.getType())),
                "Day 8 overdue employee (1 + 7d recurring) must receive recurring overdue reminder");

        // Days 9 through 14: MUST NOT receive employee overdue reminders
        for (int d = 9; d <= 14; d++) {
            final int dayVal = d;
            assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(empByOverdueDays.get(dayVal).getId())
                            && NotificationType.POLICY_OVERDUE.equals(n.getType())),
                    "Day " + d + " overdue employee must NOT receive reminder (must remain silent between 7-day intervals)");
        }

        // Day 15 (1 + 14 days overdue): MUST receive recurring overdue reminder
        assertTrue(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(empByOverdueDays.get(15).getId())
                        && NotificationType.POLICY_OVERDUE.equals(n.getType())),
                "Day 15 overdue employee (1 + 14d recurring) must receive recurring overdue reminder");
    }

    @Test
    @DisplayName("Stage 7 Behavioural: Major vs Minor version acknowledgement - Minor carries over without synthetic row; Major requires new acknowledgement")
    void testStage7MajorVersusMinorVersionAcknowledgementBehavior() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate today = LocalDate.now();

        // 1. Create and publish Policy V1.0
        PolicyDocument doc = createAndUploadPolicy("IT Security & Acceptable Use Policy", 1L, hrAdminUser.getId());
        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        PolicyVersion v1_0 = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(doc.getId()))
                .findFirst().orElseThrow();

        // Assign to employeeUser1
        PolicyAssignment a1 = new PolicyAssignment();
        a1.setId(assignSeq.getAndIncrement());
        a1.setPolicyDocument(doc);
        a1.setPolicyVersion(v1_0);
        a1.setEmployeeUser(employeeUser1);
        a1.setEmployeeIdSnapshot(employeeUser1.getEmployeeId());
        a1.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a1.setDueDate(today.minusDays(1));
        assignmentsById.put(a1.getId(), a1);

        // Employee acknowledges V1.0
        AcknowledgePolicyRequest ackReq = new AcknowledgePolicyRequest();
        ackReq.setConfirmed(true);
        PolicyAcknowledgementDTO ackV1 = policyService.acknowledgePolicy(a1.getId(), ackReq, employeeUser1.getId(), "127.0.0.1", "Mozilla/5.0");
        assertNotNull(ackV1);
        assertEquals(1, acknowledgementsById.size(), "Database must contain exactly 1 acknowledgement record for V1.0");

        // 2. Publish Minor Version V1.1
        MockMultipartFile fileV1_1 = new MockMultipartFile("file", "it-sec-v1.1.pdf", "application/pdf", generateSamplePdf("IT Security Policy V1.1 Minor Changes"));
        PolicyVersionDTO v1_1Dto = policyService.uploadPolicyVersion(doc.getId(), fileV1_1, "1.1", "MINOR", today, true, "Minor typo corrections", hrAdminUser.getId());
        PolicyVersion v1_1 = versionsById.get(v1_1Dto.getId());

        // Assign V1.1 to employeeUser1
        PolicyAssignment a1_1 = new PolicyAssignment();
        a1_1.setId(assignSeq.getAndIncrement());
        a1_1.setPolicyDocument(doc);
        a1_1.setPolicyVersion(v1_1);
        a1_1.setEmployeeUser(employeeUser1);
        a1_1.setEmployeeIdSnapshot(employeeUser1.getEmployeeId());
        a1_1.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a1_1.setDueDate(today.minusDays(1));
        assignmentsById.put(a1_1.getId(), a1_1);

        // Verify Minor Version does NOT create a synthetic acknowledgement row in database
        assertEquals(1, acknowledgementsById.size(), "Minor version must NOT create synthetic acknowledgement rows in DB");

        // Verify employee is compliant for V1.1 via implicit carryover
        assertTrue(policyService.isCompliant(v1_1.getId(), employeeUser1.getId()),
                "Employee must be compliant for minor version 1.1 due to major 1.0 acknowledgement");

        // Run scheduler: Employee must NOT receive overdue reminders for V1.1
        notifications.clear();
        notificationDedupKeys.clear();
        schedulerService.processPolicyDeadlineReminders(today, true);
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(employeeUser1.getId())),
                "No reminder must be generated for compliant minor version 1.1");

        // 3. Publish Major Version V2.0
        MockMultipartFile fileV2_0 = new MockMultipartFile("file", "it-sec-v2.0.pdf", "application/pdf", generateSamplePdf("IT Security Policy V2.0 Major Overhaul"));
        PolicyVersionDTO v2_0Dto = policyService.uploadPolicyVersion(doc.getId(), fileV2_0, "2.0", "MAJOR", today, true, "Complete security architecture overhaul", hrAdminUser.getId());
        PolicyVersion v2_0 = versionsById.get(v2_0Dto.getId());

        // Assign V2.0 to employeeUser1
        PolicyAssignment a2_0 = new PolicyAssignment();
        a2_0.setId(assignSeq.getAndIncrement());
        a2_0.setPolicyDocument(doc);
        a2_0.setPolicyVersion(v2_0);
        a2_0.setEmployeeUser(employeeUser1);
        a2_0.setEmployeeIdSnapshot(employeeUser1.getEmployeeId());
        a2_0.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a2_0.setDueDate(today.minusDays(1));
        assignmentsById.put(a2_0.getId(), a2_0);

        // Verify employee is NOT compliant for Major Version 2.0
        assertFalse(policyService.isCompliant(v2_0.getId(), employeeUser1.getId()),
                "Employee must NOT be compliant for major version 2.0 until explicitly acknowledged");

        // Run scheduler: Employee MUST receive overdue reminder for V2.0
        notifications.clear();
        notificationDedupKeys.clear();
        schedulerService.processPolicyDeadlineReminders(today, true);
        assertTrue(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(employeeUser1.getId())
                        && NotificationType.POLICY_OVERDUE.equals(n.getType())),
                "Overdue reminder must be emitted for unacknowledged major version 2.0");

        // 4. Employee acknowledges V2.0
        PolicyAcknowledgementDTO ackV2 = policyService.acknowledgePolicy(a2_0.getId(), ackReq, employeeUser1.getId(), "127.0.0.1", "Mozilla/5.0");
        assertNotNull(ackV2);
        assertEquals(2, acknowledgementsById.size(), "Database must now contain exactly 2 formal acknowledgement records (v1.0 and v2.0)");

        // Run scheduler again: No reminders emitted
        notifications.clear();
        notificationDedupKeys.clear();
        schedulerService.processPolicyDeadlineReminders(today, true);
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(employeeUser1.getId())),
                "No reminders once major version 2.0 is acknowledged");
    }

    @Test
    @DisplayName("Stage 7 Behavioural: Level 2 Manager Escalation - Department Hierarchy traversal, cross-dept isolation, fallback, and deduplication")
    void testStage7ManagerEscalationHierarchyIsolationAndDeduplication() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate today = LocalDate.now();

        // Departments:
        // Dept 1: Logistics Division (Parent)
        // Dept 2: Ocean Freight (Child of Dept 1)
        // Dept 3: Air Freight (Child of Dept 1)
        // Dept 4: Legal & Compliance (Unrelated)
        Department deptLogistics = new Department();
        deptLogistics.setId(10L);
        deptLogistics.setName("Logistics Division");
        departmentsById.put(deptLogistics.getId(), deptLogistics);

        Department deptOcean = new Department();
        deptOcean.setId(11L);
        deptOcean.setName("Ocean Freight Operations");
        deptOcean.setParentDepartment(deptLogistics);
        departmentsById.put(deptOcean.getId(), deptOcean);

        Department deptAir = new Department();
        deptAir.setId(12L);
        deptAir.setName("Air Freight Logistics");
        deptAir.setParentDepartment(deptLogistics);
        departmentsById.put(deptAir.getId(), deptAir);

        Department deptLegal = new Department();
        deptLegal.setId(13L);
        deptLegal.setName("Legal & Compliance");
        departmentsById.put(deptLegal.getId(), deptLegal);

        // Managers:
        User mgrLogisticsParent = createUser(21L, "MGR-PAR", "Logistics Director", "parent.mgr@fairmacs.com", "Logistics Division", Role.MANAGER, UserStatus.ACTIVE);
        User mgrOceanDirect = createUser(22L, "MGR-OCN", "Ocean Mgr", "ocean.mgr@fairmacs.com", "Ocean Freight Operations", Role.MANAGER, UserStatus.ACTIVE);
        User mgrAirSibling = createUser(23L, "MGR-AIR", "Air Mgr", "air.mgr@fairmacs.com", "Air Freight Logistics", Role.MANAGER, UserStatus.ACTIVE);
        User mgrLegalOther = createUser(24L, "MGR-LEG", "Legal Mgr", "legal.mgr@fairmacs.com", "Legal & Compliance", Role.MANAGER, UserStatus.ACTIVE);

        // Employee in Ocean Freight (Child of Logistics Division)
        User empOcean = createUser(25L, "EMP-OCN-1", "Ocean Sailor", "sailor@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);

        PolicyDocument doc = createAndUploadPolicy("Port Safety Protocol", 1L, hrAdminUser.getId());
        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        PolicyVersion ver = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(doc.getId()))
                .findFirst().orElseThrow();

        // 1 day overdue assignment for Ocean Sailor
        PolicyAssignment aOcean = new PolicyAssignment();
        aOcean.setId(assignSeq.getAndIncrement());
        aOcean.setPolicyDocument(doc);
        aOcean.setPolicyVersion(ver);
        aOcean.setEmployeeUser(empOcean);
        aOcean.setEmployeeIdSnapshot(empOcean.getEmployeeId());
        aOcean.setDepartmentIdSnapshot(deptOcean.getId());
        aOcean.setDepartmentNameSnapshot(deptOcean.getName());
        aOcean.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        aOcean.setDueDate(today.minusDays(1)); // 1 day overdue -> triggers manager escalation
        assignmentsById.put(aOcean.getId(), aOcean);

        // Run scheduler
        schedulerService.processPolicyDeadlineReminders(today, true);

        // Verify:
        // 1. Direct Manager (mgrOceanDirect) receives Level 2 Escalation
        assertTrue(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(mgrOceanDirect.getId())
                        && NotificationType.POLICY_ESCALATION.equals(n.getType())
                        && "/manager/policies".equals(n.getActionUrl())),
                "Direct department manager must receive Level 2 escalation");

        // 2. Parent Hierarchy Manager (mgrLogisticsParent) receives Level 2 Escalation
        assertTrue(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(mgrLogisticsParent.getId())
                        && NotificationType.POLICY_ESCALATION.equals(n.getType())
                        && "/manager/policies".equals(n.getActionUrl())),
                "Parent department manager must receive Level 2 escalation via hierarchy resolution");

        // 3. Sibling Department Manager (mgrAirSibling) MUST NOT receive escalation
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(mgrAirSibling.getId())),
                "Sibling department manager (Air Freight) must NOT receive escalation for Ocean Freight employee");

        // 4. Unrelated Department Manager (mgrLegalOther) MUST NOT receive escalation
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(mgrLegalOther.getId())),
                "Unrelated department manager (Legal) must NOT receive escalation for Ocean Freight employee");

        // 5. Deduplication: Repeated execution on same day must not create duplicate escalations
        int notifCountBeforeRerun = notifications.size();
        schedulerService.processPolicyDeadlineReminders(today, true);
        assertEquals(notifCountBeforeRerun, notifications.size(),
                "Repeated scheduler execution must produce 0 duplicate escalations due to dedup keys");
    }

    @Test
    @DisplayName("Stage 7 Behavioural: Level 3 HR/Admin Escalation - 7-day threshold, intervals, priority, and duplicate prevention")
    void testStage7HrAdminProlongedEscalationThresholdsAndIntervals() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate today = LocalDate.now();

        PolicyDocument doc = createAndUploadPolicy("Anti-Corruption & Bribery Standard", 1L, hrAdminUser.getId());
        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        PolicyVersion ver = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(doc.getId()))
                .findFirst().orElseThrow();

        // Employee 1: 3 days overdue (Manager escalated, HR NOT escalated)
        User emp3d = createUser(31L, "EMP-3D", "Emp ThreeDays", "emp3d@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        PolicyAssignment a3d = new PolicyAssignment();
        a3d.setId(assignSeq.getAndIncrement());
        a3d.setPolicyDocument(doc);
        a3d.setPolicyVersion(ver);
        a3d.setEmployeeUser(emp3d);
        a3d.setEmployeeIdSnapshot(emp3d.getEmployeeId());
        a3d.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a3d.setDueDate(today.minusDays(3));
        assignmentsById.put(a3d.getId(), a3d);

        // Employee 2: 7 days overdue (Level 3 HR Prolonged Escalation MUST trigger)
        User emp7d = createUser(32L, "EMP-7D", "Emp SevenDays", "emp7d@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        PolicyAssignment a7d = new PolicyAssignment();
        a7d.setId(assignSeq.getAndIncrement());
        a7d.setPolicyDocument(doc);
        a7d.setPolicyVersion(ver);
        a7d.setEmployeeUser(emp7d);
        a7d.setEmployeeIdSnapshot(emp7d.getEmployeeId());
        a7d.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a7d.setDueDate(today.minusDays(7));
        assignmentsById.put(a7d.getId(), a7d);

        // Employee 3: 10 days overdue (Between 7 and 14: HR NOT escalated)
        User emp10d = createUser(33L, "EMP-10D", "Emp TenDays", "emp10d@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        PolicyAssignment a10d = new PolicyAssignment();
        a10d.setId(assignSeq.getAndIncrement());
        a10d.setPolicyDocument(doc);
        a10d.setPolicyVersion(ver);
        a10d.setEmployeeUser(emp10d);
        a10d.setEmployeeIdSnapshot(emp10d.getEmployeeId());
        a10d.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a10d.setDueDate(today.minusDays(10));
        assignmentsById.put(a10d.getId(), a10d);

        // Employee 4: 14 days overdue (Level 3 HR Prolonged Escalation interval MUST trigger)
        User emp14d = createUser(34L, "EMP-14D", "Emp FourteenDays", "emp14d@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        PolicyAssignment a14d = new PolicyAssignment();
        a14d.setId(assignSeq.getAndIncrement());
        a14d.setPolicyDocument(doc);
        a14d.setPolicyVersion(ver);
        a14d.setEmployeeUser(emp14d);
        a14d.setEmployeeIdSnapshot(emp14d.getEmployeeId());
        a14d.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a14d.setDueDate(today.minusDays(14));
        assignmentsById.put(a14d.getId(), a14d);

        // Run scheduler
        schedulerService.processPolicyDeadlineReminders(today, true);

        // 1. Employee 3d: No HR escalation
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(hrAdminUser.getId())
                        && n.getMessage().contains("Emp ThreeDays") && NotificationType.POLICY_ESCALATION.equals(n.getType())),
                "3-day overdue employee must NOT trigger Level 3 HR escalation");

        // 2. Employee 7d: Level 3 HR escalation MUST be delivered to HR Admin
        Notification hrNotif7d = notifications.stream()
                .filter(n -> n.getRecipient().getId().equals(hrAdminUser.getId())
                        && n.getMessage().contains("Emp SevenDays")
                        && NotificationType.POLICY_ESCALATION.equals(n.getType()))
                .findFirst().orElse(null);
        assertNotNull(hrNotif7d, "7-day overdue employee MUST trigger Level 3 HR escalation");
        assertEquals("/hr/policies", hrNotif7d.getActionUrl());
        assertEquals(NotificationPriority.CRITICAL, hrNotif7d.getPriority());
        assertTrue(hrNotif7d.getTitle().contains("HR Escalation (Level 3)"));
        assertTrue(hrNotif7d.getMessage().contains("7 days overdue"));

        // 3. Employee 10d: No HR escalation on off-cycle day
        assertFalse(notifications.stream().anyMatch(n -> n.getRecipient().getId().equals(hrAdminUser.getId())
                        && n.getMessage().contains("Emp TenDays") && NotificationType.POLICY_ESCALATION.equals(n.getType())),
                "10-day overdue employee must NOT trigger HR escalation (silent between 7d intervals)");

        // 4. Employee 14d: Level 3 HR recurring escalation MUST trigger
        Notification hrNotif14d = notifications.stream()
                .filter(n -> n.getRecipient().getId().equals(hrAdminUser.getId())
                        && n.getMessage().contains("Emp FourteenDays")
                        && NotificationType.POLICY_ESCALATION.equals(n.getType()))
                .findFirst().orElse(null);
        assertNotNull(hrNotif14d, "14-day overdue employee MUST trigger recurring Level 3 HR escalation");

        // 5. Duplicate prevention
        int countBeforeRerun = notifications.size();
        schedulerService.processPolicyDeadlineReminders(today, true);
        assertEquals(countBeforeRerun, notifications.size(), "Deduplication must prevent duplicate HR escalations");
    }

    @Test
    @DisplayName("Stage 7 Behavioural: Batch Processing & Pagination - Processes high-volume assignments without memory exhaustion")
    void testStage7BatchProcessingAndPaginationHighVolume() {
        notifications.clear();
        notificationDedupKeys.clear();
        LocalDate today = LocalDate.now();

        PolicyDocument doc = createAndUploadPolicy("Organization Whistleblower Policy", 1L, hrAdminUser.getId());
        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        PolicyVersion ver = versionsById.values().stream()
                .filter(v -> v.getPolicyDocument().getId().equals(doc.getId()))
                .findFirst().orElseThrow();

        // Create 250 policy assignments due in 5 days (Due-Soon)
        int volume = 250;
        for (int i = 1; i <= volume; i++) {
            User emp = createUser(1000L + i, "VOL-" + i, "Batch Employee " + i,
                    "batch" + i + "@fairmacs.com", "Ocean Freight Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
            PolicyAssignment a = new PolicyAssignment();
            a.setId(assignSeq.getAndIncrement());
            a.setPolicyDocument(doc);
            a.setPolicyVersion(ver);
            a.setEmployeeUser(emp);
            a.setEmployeeIdSnapshot(emp.getEmployeeId());
            a.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
            a.setDueDate(today.plusDays(5));
            assignmentsById.put(a.getId(), a);
        }

        // Run scheduler
        Map<String, Object> result = schedulerService.processPolicyDeadlineReminders(today, true);
        assertNotNull(result);
        assertEquals(0, result.get("failures"), "Large volume batch processing must have 0 failures");
        assertEquals(volume, result.get("notificationsCreated"), "All 250 employees in high-volume batch must receive due-soon reminder");
    }

    private byte[] generateSamplePdf(String text) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document doc = new Document();
            PdfWriter.getInstance(doc, baos);
            doc.open();
            doc.add(new Paragraph(text));
            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate sample PDF for testing", e);
        }
    }

    private String computeSha256(byte[] data) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(md.digest(data));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // =========================================================================
    // Helper to create & upload initial draft policy
    // =========================================================================
    private PolicyDocument createAndUploadPolicy(String title, Long catId, Long creatorId) {
        CreatePolicyRequest req = new CreatePolicyRequest();
        req.setTitle(title);
        req.setCategoryId(catId);
        PolicyDocumentDTO docDto = policyService.createPolicy(req, creatorId);

        MockMultipartFile samplePdf = new MockMultipartFile("file", "initial.pdf", "application/pdf", "%PDF initial".getBytes(StandardCharsets.UTF_8));
        policyService.uploadPolicyVersion(docDto.getId(), samplePdf, "1.0", "MAJOR", LocalDate.now(), true, "Initial version", creatorId);

        return documentsById.get(docDto.getId());
    }

    // =========================================================================
    // Proxy-based in-memory repository initialization
    // =========================================================================
    @SuppressWarnings("unchecked")
    private void initRepositories() {
        categoryRepo = (PolicyCategoryRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class[]{PolicyCategoryRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if (name.equals("save")) {
                        PolicyCategory c = (PolicyCategory) args[0];
                        if (c.getId() == null) c.setId(catSeq.getAndIncrement());
                        categoriesById.put(c.getId(), c);
                        return c;
                    }
                    if (name.equals("findById")) {
                        return Optional.ofNullable(categoriesById.get((Long) args[0]));
                    }
                    if (name.equals("findAll")) {
                        return new ArrayList<>(categoriesById.values());
                    }
                    if (name.equals("findByActiveTrueOrderByDisplayOrderAsc")) {
                        return categoriesById.values().stream().filter(PolicyCategory::getActive).toList();
                    }
                    if (name.equals("existsByNameIgnoreCase")) {
                        String target = (String) args[0];
                        return categoriesById.values().stream().anyMatch(c -> c.getName().equalsIgnoreCase(target));
                    }
                    return null;
                }
        );

        documentRepo = (PolicyDocumentRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class[]{PolicyDocumentRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if (name.equals("save")) {
                        PolicyDocument d = (PolicyDocument) args[0];
                        if (d.getId() == null) d.setId(docSeq.getAndIncrement());
                        documentsById.put(d.getId(), d);
                        return d;
                    }
                    if (name.equals("findById")) {
                        return Optional.ofNullable(documentsById.get((Long) args[0]));
                    }
                    if (name.equals("findAllByOrderByCreatedAtDesc") || name.equals("findAll")) {
                        return new ArrayList<>(documentsById.values());
                    }
                    if (name.equals("existsByDocumentCode")) {
                        return documentsById.values().stream().anyMatch(d -> d.getDocumentCode().equalsIgnoreCase((String) args[0]));
                    }
                    if (name.equals("findByOwningDepartmentIdInOrderByCreatedAtDesc")) {
                        Collection<Long> ids = (Collection<Long>) args[0];
                        return documentsById.values().stream().filter(d -> d.getOwningDepartment() != null && ids.contains(d.getOwningDepartment().getId())).toList();
                    }
                    if (name.equals("findByApprovalStatusOrderBySubmittedAtDesc")) {
                        PolicyApprovalStatus st = (PolicyApprovalStatus) args[0];
                        return documentsById.values().stream().filter(d -> d.getApprovalStatus() == st).toList();
                    }
                    return null;
                }
        );

        versionRepo = (PolicyVersionRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class[]{PolicyVersionRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if (name.equals("save")) {
                        PolicyVersion v = (PolicyVersion) args[0];
                        if (v.getId() == null) v.setId(verSeq.getAndIncrement());
                        versionsById.put(v.getId(), v);
                        return v;
                    }
                    if (name.equals("findById")) {
                        return Optional.ofNullable(versionsById.get((Long) args[0]));
                    }
                    if (name.equals("findByPolicyDocumentIdOrderByCreatedAtDesc")) {
                        Long docId = (Long) args[0];
                        return versionsById.values().stream().filter(v -> v.getPolicyDocument().getId().equals(docId)).sorted(Comparator.comparing(PolicyVersion::getId).reversed()).toList();
                    }
                    if (name.equals("findByPolicyDocumentIdOrderByCreatedAtAsc")) {
                        Long docId = (Long) args[0];
                        return versionsById.values().stream().filter(v -> v.getPolicyDocument().getId().equals(docId)).sorted(Comparator.comparing(PolicyVersion::getId)).toList();
                    }
                    if (name.equals("findFirstByPolicyDocumentIdOrderByCreatedAtDesc")) {
                        Long docId = (Long) args[0];
                        return versionsById.values().stream().filter(v -> v.getPolicyDocument().getId().equals(docId)).max(Comparator.comparing(PolicyVersion::getId));
                    }
                    if (name.equals("existsByPolicyDocumentIdAndVersionNumber")) {
                        Long docId = (Long) args[0];
                        String vNum = (String) args[1];
                        return versionsById.values().stream().anyMatch(v -> v.getPolicyDocument().getId().equals(docId) && v.getVersionNumber().equals(vNum));
                    }
                    return null;
                }
        );

        assignmentRepo = (PolicyAssignmentRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class[]{PolicyAssignmentRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if (name.equals("save")) {
                        PolicyAssignment a = (PolicyAssignment) args[0];
                        if (a.getId() == null) a.setId(assignSeq.getAndIncrement());
                        assignmentsById.put(a.getId(), a);
                        return a;
                    }
                    if (name.equals("findById")) {
                        return Optional.ofNullable(assignmentsById.get((Long) args[0]));
                    }
                    if (name.equals("findAll")) {
                        return new ArrayList<>(assignmentsById.values());
                    }
                    if (name.equals("findByPolicyDocumentId")) {
                        Long docId = (Long) args[0];
                        return assignmentsById.values().stream().filter(a -> a.getPolicyDocument().getId().equals(docId)).toList();
                    }
                    if (name.equals("findByEmployeeUserIdAndAssignmentStatus")) {
                        Long uid = (Long) args[0];
                        PolicyAssignmentStatus st = (PolicyAssignmentStatus) args[1];
                        return assignmentsById.values().stream().filter(a -> a.getEmployeeUser().getId().equals(uid) && a.getAssignmentStatus() == st).toList();
                    }
                    if (name.equals("findByPolicyVersionIdAndEmployeeUserId")) {
                        Long vid = (Long) args[0];
                        Long uid = (Long) args[1];
                        return assignmentsById.values().stream().filter(a -> a.getPolicyVersion().getId().equals(vid) && a.getEmployeeUser().getId().equals(uid)).findFirst();
                    }
                    if (name.equals("existsByPolicyVersionIdAndEmployeeUserId")) {
                        Long vid = (Long) args[0];
                        Long uid = (Long) args[1];
                        return assignmentsById.values().stream().anyMatch(a -> a.getPolicyVersion().getId().equals(vid) && a.getEmployeeUser().getId().equals(uid));
                    }
                    if (name.equals("findActiveAssignmentsDueOn")) {
                        LocalDate targetDate = (LocalDate) args[0];
                        List<PolicyAssignment> matched = assignmentsById.values().stream()
                                .filter(a -> a.getAssignmentStatus() == PolicyAssignmentStatus.ACTIVE
                                        && a.getDueDate() != null
                                        && a.getDueDate().equals(targetDate))
                                .toList();
                        if (args.length > 1 && args[1] instanceof Pageable pageable) {
                            int start = (int) pageable.getOffset();
                            int end = Math.min((start + pageable.getPageSize()), matched.size());
                            List<PolicyAssignment> subList = start <= matched.size() ? matched.subList(start, end) : List.of();
                            return new PageImpl<>(subList, pageable, matched.size());
                        }
                        return matched;
                    }
                    if (name.equals("findActiveOverdueAssignments")) {
                        LocalDate currentDate = (LocalDate) args[0];
                        List<PolicyAssignment> matched = assignmentsById.values().stream()
                                .filter(a -> a.getAssignmentStatus() == PolicyAssignmentStatus.ACTIVE
                                        && a.getDueDate() != null
                                        && a.getDueDate().isBefore(currentDate))
                                .toList();
                        if (args.length > 1 && args[1] instanceof Pageable pageable) {
                            int start = (int) pageable.getOffset();
                            int end = Math.min((start + pageable.getPageSize()), matched.size());
                            List<PolicyAssignment> subList = start <= matched.size() ? matched.subList(start, end) : List.of();
                            return new PageImpl<>(subList, pageable, matched.size());
                        }
                        return matched;
                    }
                    return null;
                }
        );

        acknowledgementRepo = (PolicyAcknowledgementRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class[]{PolicyAcknowledgementRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if (name.equals("save")) {
                        PolicyAcknowledgement ack = (PolicyAcknowledgement) args[0];
                        if (ack.getId() == null) ack.setId(ackSeq.getAndIncrement());
                        acknowledgementsById.put(ack.getId(), ack);
                        return ack;
                    }
                    if (name.equals("findById")) {
                        return Optional.ofNullable(acknowledgementsById.get((Long) args[0]));
                    }
                    if (name.equals("findAll")) {
                        return new ArrayList<>(acknowledgementsById.values());
                    }
                    if (name.equals("findByPolicyVersionIdAndEmployeeUserId")) {
                        Long vid = (Long) args[0];
                        Long uid = (Long) args[1];
                        return acknowledgementsById.values().stream().filter(a -> a.getPolicyVersion().getId().equals(vid) && a.getEmployeeUser().getId().equals(uid)).findFirst();
                    }
                    if (name.equals("existsByPolicyVersionIdAndEmployeeUserId")) {
                        Long vid = (Long) args[0];
                        Long uid = (Long) args[1];
                        return acknowledgementsById.values().stream().anyMatch(a -> a.getPolicyVersion().getId().equals(vid) && a.getEmployeeUser().getId().equals(uid));
                    }
                    if (name.equals("findByPolicyDocumentIdOrderByAcceptedAtDesc")) {
                        Long docId = (Long) args[0];
                        return acknowledgementsById.values().stream().filter(a -> a.getPolicyDocument().getId().equals(docId)).toList();
                    }
                    if (name.equals("findByEmployeeUserIdOrderByAcceptedAtDesc")) {
                        Long uid = (Long) args[0];
                        return acknowledgementsById.values().stream()
                                .filter(a -> a.getEmployeeUser() != null && a.getEmployeeUser().getId().equals(uid))
                                .sorted(Comparator.comparing(PolicyAcknowledgement::getAcceptedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                                .toList();
                    }
                    if (name.equals("countByPolicyVersionId")) {
                        Long vid = (Long) args[0];
                        return (long) acknowledgementsById.values().stream().filter(a -> a.getPolicyVersion().getId().equals(vid)).count();
                    }
                    return null;
                }
        );

        auditLogRepo = (PolicyAuditLogRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class[]{PolicyAuditLogRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if (name.equals("save")) {
                        PolicyAuditLog l = (PolicyAuditLog) args[0];
                        if (l.getId() == null) l.setId(auditSeq.getAndIncrement());
                        auditLogsById.put(l.getId(), l);
                        return l;
                    }
                    return null;
                }
        );

        userRepo = (UserRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class[]{UserRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if (name.equals("findById")) {
                        return Optional.ofNullable(usersById.get((Long) args[0]));
                    }
                    if (name.equals("findAll")) {
                        return new ArrayList<>(usersById.values());
                    }
                    if (name.equals("findAllById")) {
                        Iterable<Long> ids = (Iterable<Long>) args[0];
                        List<User> list = new ArrayList<>();
                        for (Long id : ids) {
                            if (usersById.containsKey(id)) list.add(usersById.get(id));
                        }
                        return list;
                    }
                    if (name.equals("findByRoleAndStatus")) {
                        Role r = (Role) args[0];
                        UserStatus s = (UserStatus) args[1];
                        return usersById.values().stream().filter(u -> u.getRole() == r && u.getStatus() == s).toList();
                    }
                    if (name.equals("findByRole")) {
                        Role r = (Role) args[0];
                        return usersById.values().stream().filter(u -> u.getRole() == r).toList();
                    }
                    return null;
                }
        );

        departmentRepo = (DepartmentRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class[]{DepartmentRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if (name.equals("findById")) {
                        return Optional.ofNullable(departmentsById.get((Long) args[0]));
                    }
                    if (name.equals("findAll")) {
                        return new ArrayList<>(departmentsById.values());
                    }
                    if (name.equals("findAllById")) {
                        Iterable<Long> ids = (Iterable<Long>) args[0];
                        List<Department> list = new ArrayList<>();
                        for (Long id : ids) {
                            if (departmentsById.containsKey(id)) list.add(departmentsById.get(id));
                        }
                        return list;
                    }
                    if (name.equals("findByNameIgnoreCase")) {
                        String dName = (String) args[0];
                        return departmentsById.values().stream().filter(d -> d.getName().equalsIgnoreCase(dName)).findFirst();
                    }
                    return null;
                }
        );

        notificationRepo = (NotificationRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class[]{NotificationRepository.class},
                (proxy, method, args) -> null
        );
    }
}
