package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.*;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

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
                n.setDeduplicationKey(deduplicationKey);
                notifications.add(n);
                return n;
            }

            @Override
            public int notifyHrAdmins(String title, String message, String type, String actionUrl, String deduplicationKey) {
                createNotification(hrAdminUser.getId(), title, message, type, "NORMAL", "POLICY", null, actionUrl, deduplicationKey, null);
                return 1;
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
                byte[] samplePdf = "%PDF-1.4 sample content".getBytes(StandardCharsets.UTF_8);
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
    @DisplayName("Eligibility: ACTIVE and ON_LEAVE employees are assigned; TERMINATED is excluded")
    void testEligibilityFiltering() {
        PolicyDocument doc = createAndUploadPolicy("IT Security Policy", 2L, hrAdminUser.getId());

        PublishPolicyRequest req = new PublishPolicyRequest();
        req.setAudienceType(PolicyAssignmentSource.ALL_EMPLOYEES);
        req.setMandatory(true);

        policyService.publishPolicy(doc.getId(), req, hrAdminUser.getId());

        List<PolicyAssignment> assignments = assignmentRepo.findByPolicyDocumentId(doc.getId());

        // Verify active & on-leave are assigned
        assertTrue(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeUser1.getId())));
        assertTrue(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeUser2.getId())));
        assertTrue(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeOnLeave.getId())));

        // Verify TERMINATED is excluded
        assertFalse(assignments.stream().anyMatch(a -> a.getEmployeeUser().getId().equals(employeeTerminated.getId())));
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
    @DisplayName("Precedence & Deduplication: INDIVIDUAL takes precedence over DEPARTMENT; exactly 1 assignment row created")
    void testAudiencePrecedenceAndDeduplication() {
        PolicyDocument doc = createAndUploadPolicy("Confidentiality Agreement", 3L, hrAdminUser.getId());

        PublishPolicyRequest req = new PublishPolicyRequest();
        req.setAudienceType(PolicyAssignmentSource.DEPARTMENT);
        req.setDepartmentIds(List.of(childDept.getId()));
        // Explicitly also target employeeUser1 individually
        req.setEmployeeUserIds(List.of(employeeUser1.getId()));

        policyService.publishPolicy(doc.getId(), req, hrAdminUser.getId());

        List<PolicyAssignment> userAssignments = assignmentRepo.findByPolicyDocumentId(doc.getId()).stream()
                .filter(a -> a.getEmployeeUser().getId().equals(employeeUser1.getId()))
                .toList();

        // Exactly 1 assignment record created
        assertEquals(1, userAssignments.size(), "Deduplication must ensure exactly 1 assignment per version");
        // Precedence: INDIVIDUAL > DEPARTMENT
        assertEquals(PolicyAssignmentSource.INDIVIDUAL, userAssignments.get(0).getAssignmentSource());
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
        AcknowledgePolicyRequest ackReq = new AcknowledgePolicyRequest();
        policyService.acknowledgePolicy(v1AssignmentId, ackReq, employeeUser1.getId(), "192.168.1.100", "Mozilla/5.0");

        List<PolicyAssignmentDTO> afterAck = policyService.getMyAssignments(employeeUser1.getId(), "ALL");
        assertEquals("ACKNOWLEDGED", afterAck.get(0).getComplianceStatus());

        // 1. Upload & Publish MINOR update (v1.1)
        MockMultipartFile minorPdf = new MockMultipartFile("file", "v1.1.pdf", "application/pdf", "%PDF minor".getBytes(StandardCharsets.UTF_8));
        PolicyVersionDTO v11 = policyService.uploadPolicyVersion(doc.getId(), minorPdf, "1.1", "MINOR", LocalDate.now(), true, "Minor typo fix", hrAdminUser.getId());

        PublishPolicyRequest pubV11 = new PublishPolicyRequest();
        pubV11.setPolicyVersionId(v11.getId());
        pubV11.setAudienceType(PolicyAssignmentSource.INDIVIDUAL);
        pubV11.setEmployeeUserIds(List.of(employeeUser1.getId()));
        policyService.publishPolicy(doc.getId(), pubV11, hrAdminUser.getId());

        // Minor version carries forward prior acknowledgement
        List<PolicyAssignmentDTO> afterMinor = policyService.getMyAssignments(employeeUser1.getId(), "ALL");
        assertEquals("ACKNOWLEDGED", afterMinor.get(0).getComplianceStatus(), "Minor version must carry forward valid acknowledgement");

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
        assertEquals("PENDING", afterMajor.get(0).getComplianceStatus(), "Major version must require fresh acknowledgement");
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
            policyService.acknowledgePolicy(assignmentId, new AcknowledgePolicyRequest(), employeeUser2.getId(), "10.0.0.1", "Chrome");
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
        PolicyAcknowledgementDTO firstAck = policyService.acknowledgePolicy(assignmentId, new AcknowledgePolicyRequest(), employeeUser1.getId(), "10.0.0.1", "Chrome");
        assertNotNull(firstAck.getId());

        // Second acknowledgement
        PolicyAcknowledgementDTO secondAck = policyService.acknowledgePolicy(assignmentId, new AcknowledgePolicyRequest(), employeeUser1.getId(), "10.0.0.2", "Firefox");
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
        PolicyDocumentDTO submitted = policyService.submitDepartmentPolicy(req, file, hrAdminUser.getId());

        ApprovalDecisionRequest decision = new ApprovalDecisionRequest();
        decision.setDecision(ApprovalDecisionRequest.Decision.APPROVE);
        decision.setComment("Self approval attempt");

        assertThrows(ResponseStatusException.class, () -> {
            policyService.decideManagerSubmission(submitted.getId(), decision, hrAdminUser.getId());
        }, "Self-approval restriction must block creator from approving their own submission");
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
                        return versionsById.values().stream().filter(v -> v.getPolicyDocument().getId().equals(docId)).toList();
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
