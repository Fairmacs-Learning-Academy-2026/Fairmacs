package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.*;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService.DownloadedDocument;
import com.fairmacs.lms.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PolicyServiceImpl implements PolicyService {

    private static final Logger log = LoggerFactory.getLogger(PolicyServiceImpl.class);

    private final PolicyCategoryRepository categoryRepo;
    private final PolicyDocumentRepository documentRepo;
    private final PolicyVersionRepository versionRepo;
    private final PolicyAssignmentRepository assignmentRepo;
    private final PolicyAcknowledgementRepository acknowledgementRepo;
    private final PolicyAuditLogRepository auditLogRepo;
    private final UserRepository userRepo;
    private final DepartmentRepository departmentRepo;
    private final PolicyWorkDriveService policyWorkDriveService;
    private final NotificationService notificationService;

    public PolicyServiceImpl(
            PolicyCategoryRepository categoryRepo,
            PolicyDocumentRepository documentRepo,
            PolicyVersionRepository versionRepo,
            PolicyAssignmentRepository assignmentRepo,
            PolicyAcknowledgementRepository acknowledgementRepo,
            PolicyAuditLogRepository auditLogRepo,
            UserRepository userRepo,
            DepartmentRepository departmentRepo,
            PolicyWorkDriveService policyWorkDriveService,
            NotificationService notificationService
    ) {
        this.categoryRepo = categoryRepo;
        this.documentRepo = documentRepo;
        this.versionRepo = versionRepo;
        this.assignmentRepo = assignmentRepo;
        this.acknowledgementRepo = acknowledgementRepo;
        this.auditLogRepo = auditLogRepo;
        this.userRepo = userRepo;
        this.departmentRepo = departmentRepo;
        this.policyWorkDriveService = policyWorkDriveService;
        this.notificationService = notificationService;
    }

    // ==========================================
    // 1. Categories
    // ==========================================
    @Override
    @Transactional(readOnly = true)
    public List<PolicyCategoryDTO> getAllCategories() {
        return categoryRepo.findAll().stream()
                .sorted(Comparator.comparing(PolicyCategory::getDisplayOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(this::toCategoryDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyCategoryDTO> getActiveCategories() {
        return categoryRepo.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(this::toCategoryDTO)
                .toList();
    }

    @Override
    @Transactional
    public PolicyCategoryDTO createCategory(PolicyCategoryDTO dto, Long userId) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name is required");
        }
        if (categoryRepo.existsByNameIgnoreCase(dto.getName().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Category already exists: " + dto.getName());
        }

        PolicyCategory cat = new PolicyCategory();
        cat.setName(dto.getName().trim());
        cat.setDescription(dto.getDescription());
        cat.setIcon(dto.getIcon());
        cat.setActive(dto.getActive() != null ? dto.getActive() : true);
        cat.setDisplayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0);
        cat = categoryRepo.save(cat);

        logAudit(null, null, userId, "CATEGORY_CREATED", "Created category: " + cat.getName(), null);
        return toCategoryDTO(cat);
    }

    @Override
    @Transactional
    public PolicyCategoryDTO updateCategory(Long id, PolicyCategoryDTO dto, Long userId) {
        PolicyCategory cat = categoryRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found: " + id));

        if (dto.getName() != null && !dto.getName().isBlank()) {
            String newName = dto.getName().trim();
            if (!cat.getName().equalsIgnoreCase(newName) && categoryRepo.existsByNameIgnoreCase(newName)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Category name already in use: " + newName);
            }
            cat.setName(newName);
        }
        if (dto.getDescription() != null) cat.setDescription(dto.getDescription());
        if (dto.getIcon() != null) cat.setIcon(dto.getIcon());
        if (dto.getActive() != null) cat.setActive(dto.getActive());
        if (dto.getDisplayOrder() != null) cat.setDisplayOrder(dto.getDisplayOrder());

        cat = categoryRepo.save(cat);
        logAudit(null, null, userId, "CATEGORY_UPDATED", "Updated category: " + cat.getName(), null);
        return toCategoryDTO(cat);
    }

    // ==========================================
    // 2. Policy Document Lifecycle (HR / Admin)
    // ==========================================
    @Override
    @Transactional
    public PolicyDocumentDTO createPolicy(CreatePolicyRequest req, Long userId) {
        User creator = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));

        PolicyCategory category = categoryRepo.findById(req.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found: " + req.getCategoryId()));

        Department owningDept = null;
        if (req.getOwningDepartmentId() != null) {
            owningDept = departmentRepo.findById(req.getOwningDepartmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found: " + req.getOwningDepartmentId()));
        }

        String docCode = req.getDocumentCode();
        if (docCode == null || docCode.isBlank()) {
            docCode = generateDocumentCode(category.getName());
        } else {
            docCode = docCode.trim().toUpperCase();
            if (documentRepo.existsByDocumentCode(docCode)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Document code already exists: " + docCode);
            }
        }

        PolicyDocument doc = new PolicyDocument();
        doc.setDocumentCode(docCode);
        doc.setTitle(req.getTitle().trim());
        doc.setDescription(req.getDescription());
        doc.setCategory(category);
        doc.setOwningDepartment(owningDept);
        doc.setDocumentStatus(PolicyDocumentStatus.DRAFT);
        doc.setApprovalStatus(PolicyApprovalStatus.NONE);
        doc.setCreatedBy(creator);

        doc = documentRepo.save(doc);
        logAudit(doc.getId(), null, userId, "POLICY_CREATED", "Created policy draft: " + doc.getTitle(), null);
        return toDocumentDTO(doc);
    }

    @Override
    @Transactional
    public PolicyDocumentDTO updatePolicyDraft(Long id, CreatePolicyRequest req, Long userId) {
        PolicyDocument doc = documentRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document not found: " + id));

        if (doc.getDocumentStatus() == PolicyDocumentStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot update archived policy");
        }

        if (req.getTitle() != null && !req.getTitle().isBlank()) {
            doc.setTitle(req.getTitle().trim());
        }
        if (req.getDescription() != null) {
            doc.setDescription(req.getDescription());
        }
        if (req.getCategoryId() != null) {
            PolicyCategory category = categoryRepo.findById(req.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found: " + req.getCategoryId()));
            doc.setCategory(category);
        }
        if (req.getOwningDepartmentId() != null) {
            Department owningDept = departmentRepo.findById(req.getOwningDepartmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found: " + req.getOwningDepartmentId()));
            doc.setOwningDepartment(owningDept);
        }

        doc = documentRepo.save(doc);
        logAudit(doc.getId(), null, userId, "POLICY_UPDATED", "Updated policy draft: " + doc.getTitle(), null);
        return toDocumentDTO(doc);
    }

    @Override
    @Transactional
    public PolicyVersionDTO uploadPolicyVersion(
            Long policyId,
            MultipartFile file,
            String versionNumber,
            String versionTypeStr,
            LocalDate effectiveDate,
            Boolean allowDownload,
            String versionNotes,
            Long userId
    ) {
        PolicyDocument doc = documentRepo.findById(policyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document not found: " + policyId));

        if (doc.getDocumentStatus() == PolicyDocumentStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot upload version for archived policy");
        }

        User uploader = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));

        // Validate PDF & upload to Zoho WorkDrive
        PolicyWorkDriveService.UploadedPolicyFile uploaded = policyWorkDriveService.uploadPolicyPdf(
                file,
                doc.getCategory().getName(),
                false
        );

        // Resolve version number
        String vNumber = versionNumber;
        if (vNumber == null || vNumber.isBlank()) {
            vNumber = calculateNextVersionNumber(doc.getId(), versionTypeStr);
        } else {
            vNumber = vNumber.trim();
            if (versionRepo.existsByPolicyDocumentIdAndVersionNumber(doc.getId(), vNumber)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Version " + vNumber + " already exists for this document");
            }
        }

        PolicyVersionType vType = PolicyVersionType.MAJOR;
        if (versionTypeStr != null && versionTypeStr.equalsIgnoreCase("MINOR")) {
            vType = PolicyVersionType.MINOR;
        }

        PolicyVersion version = new PolicyVersion();
        version.setPolicyDocument(doc);
        version.setVersionNumber(vNumber);
        version.setVersionType(vType);
        version.setWorkdriveFileId(uploaded.workdriveFileId());
        version.setWorkdriveFileName(uploaded.fileName());
        version.setWorkdriveFolderId(uploaded.folderId());
        version.setFileMimeType(uploaded.contentType());
        version.setFileSize(uploaded.fileSize());
        version.setSha256Hash(uploaded.sha256Hash());
        version.setEffectiveDate(effectiveDate != null ? effectiveDate : LocalDate.now());
        version.setAllowDownload(allowDownload != null ? allowDownload : true);
        version.setVersionNotes(versionNotes);
        version.setCreatedBy(uploader);

        version = versionRepo.save(version);
        logAudit(doc.getId(), version.getId(), userId, "VERSION_UPLOADED",
                "Uploaded version " + version.getVersionNumber() + " (" + version.getVersionType() + ")", null);

        return toVersionDTO(version);
    }

    @Override
    @Transactional
    public PolicyDocumentDTO publishPolicy(Long policyId, PublishPolicyRequest req, Long userId) {
        PolicyDocument doc = documentRepo.findById(policyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document not found: " + policyId));

        if (doc.getDocumentStatus() == PolicyDocumentStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot publish archived policy");
        }

        User publisher = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));

        // Locate target version
        PolicyVersion targetVersion;
        if (req.getPolicyVersionId() != null) {
            targetVersion = versionRepo.findById(req.getPolicyVersionId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy version not found: " + req.getPolicyVersionId()));
        } else {
            targetVersion = versionRepo.findFirstByPolicyDocumentIdOrderByCreatedAtDesc(doc.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot publish policy without an uploaded version PDF"));
        }

        // Calculate Target Audience & Resolve Precedence (INDIVIDUAL > DEPARTMENT > ALL_EMPLOYEES)
        PolicyAssignmentSource audienceType = req.getAudienceType() != null ? req.getAudienceType() : PolicyAssignmentSource.ALL_EMPLOYEES;
        Map<Long, User> targetedUsers = new LinkedHashMap<>();
        Map<Long, PolicyAssignmentSource> userSourceMap = new HashMap<>();

        // 1. ALL EMPLOYEES
        if (audienceType == PolicyAssignmentSource.ALL_EMPLOYEES) {
            List<User> activeUsers = userRepo.findAll().stream()
                    .filter(u -> u.getStatus() == UserStatus.ACTIVE || u.getStatus() == UserStatus.ON_LEAVE)
                    .toList();
            for (User u : activeUsers) {
                targetedUsers.put(u.getId(), u);
                userSourceMap.put(u.getId(), PolicyAssignmentSource.ALL_EMPLOYEES);
            }
        }

        // 2. DEPARTMENT (Overwrites ALL_EMPLOYEES for higher precedence)
        if (audienceType == PolicyAssignmentSource.DEPARTMENT || (req.getDepartmentIds() != null && !req.getDepartmentIds().isEmpty())) {
            List<Long> deptIds = req.getDepartmentIds();
            if (deptIds != null && !deptIds.isEmpty()) {
                Set<Long> hierarchyDeptIds = resolveDepartmentHierarchyIds(deptIds);
                Set<String> hierarchyDeptNames = departmentRepo.findAllById(hierarchyDeptIds).stream()
                        .map(Department::getName)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());

                List<User> deptUsers = userRepo.findAll().stream()
                        .filter(u -> u.getStatus() == UserStatus.ACTIVE || u.getStatus() == UserStatus.ON_LEAVE)
                        .filter(u -> u.getDepartment() != null && hierarchyDeptNames.stream().anyMatch(n -> n.equalsIgnoreCase(u.getDepartment())))
                        .toList();

                for (User u : deptUsers) {
                    targetedUsers.put(u.getId(), u);
                    userSourceMap.put(u.getId(), PolicyAssignmentSource.DEPARTMENT);
                }
            }
        }

        // 3. INDIVIDUAL (Highest precedence)
        if (audienceType == PolicyAssignmentSource.INDIVIDUAL || (req.getEmployeeUserIds() != null && !req.getEmployeeUserIds().isEmpty())) {
            List<Long> userIds = req.getEmployeeUserIds();
            if (userIds != null && !userIds.isEmpty()) {
                List<User> explicitUsers = userRepo.findAllById(userIds).stream()
                        .filter(u -> u.getStatus() == UserStatus.ACTIVE || u.getStatus() == UserStatus.ON_LEAVE)
                        .toList();

                for (User u : explicitUsers) {
                    targetedUsers.put(u.getId(), u);
                    userSourceMap.put(u.getId(), PolicyAssignmentSource.INDIVIDUAL);
                }
            }
        }

        // Determine if this is a republish or new version
        boolean isUpdate = doc.getDocumentStatus() == PolicyDocumentStatus.PUBLISHED;
        boolean isMinorVersion = targetVersion.getVersionType() == PolicyVersionType.MINOR;

        // Create assignments & notifications
        int newAssignmentCount = 0;
        for (User emp : targetedUsers.values()) {
            PolicyAssignmentSource source = userSourceMap.get(emp.getId());
            Long deptIdSnapshot = resolveDepartmentIdForUser(emp);

            // Deduplication: UNIQUE(policy_version_id, employee_user_id)
            Optional<PolicyAssignment> existingOpt = assignmentRepo.findByPolicyVersionIdAndEmployeeUserId(targetVersion.getId(), emp.getId());
            PolicyAssignment assignment;
            if (existingOpt.isPresent()) {
                assignment = existingOpt.get();
                assignment.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
                assignment.setDueDate(req.getDueDate());
                assignment.setMandatory(req.getMandatory());
                assignment = assignmentRepo.save(assignment);
            } else {
                assignment = new PolicyAssignment();
                assignment.setPolicyDocument(doc);
                assignment.setPolicyVersion(targetVersion);
                assignment.setEmployeeUser(emp);
                assignment.setAssignmentSource(source);
                assignment.setDepartmentIdSnapshot(deptIdSnapshot);
                assignment.setDueDate(req.getDueDate()); // Optional: null = open-ended
                assignment.setMandatory(req.getMandatory());
                assignment.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
                assignment.setAssignedBy(publisher);
                assignment.setAssignedAt(LocalDateTime.now());
                assignment = assignmentRepo.save(assignment);
                newAssignmentCount++;
            }

            // Version acknowledgement logic
            if (isMinorVersion && isUpdate) {
                // If minor update, check if employee already acknowledged an earlier version of this policy
                List<PolicyAcknowledgement> pastAcks = acknowledgementRepo.findByPolicyDocumentIdOrderByAcceptedAtDesc(doc.getId()).stream()
                        .filter(a -> a.getEmployeeUser().getId().equals(emp.getId()))
                        .toList();

                if (!pastAcks.isEmpty() && !acknowledgementRepo.existsByPolicyVersionIdAndEmployeeUserId(targetVersion.getId(), emp.getId())) {
                    // Carry forward acknowledgement for minor version
                    PolicyAcknowledgement autoAck = new PolicyAcknowledgement();
                    autoAck.setPolicyAssignment(assignment);
                    autoAck.setPolicyDocument(doc);
                    autoAck.setPolicyVersion(targetVersion);
                    autoAck.setEmployeeUser(emp);
                    autoAck.setEmployeeIdSnapshot(emp.getEmployeeId() != null ? emp.getEmployeeId() : "EMP-" + emp.getId());
                    autoAck.setAuthenticatedUser(emp);
                    autoAck.setDocumentSha256Hash(targetVersion.getSha256Hash());
                    autoAck.setAcknowledgementTextVersion("Carried forward from prior acknowledgement of version " + pastAcks.get(0).getPolicyVersion().getVersionNumber());
                    autoAck.setRequestIp("SYSTEM_CARRIED_FORWARD");
                    autoAck.setUserAgent("System/MinorVersionUpdate");
                    autoAck.setAcceptedAt(pastAcks.get(0).getAcceptedAt());
                    acknowledgementRepo.save(autoAck);
                    continue; // Skip new assignment notification if already compliant
                }
            }

            // In-App Notification
            String notifType = doc.getCategory().getName().toLowerCase().contains("agreement")
                    ? NotificationType.AGREEMENT_ASSIGNED
                    : (isUpdate && targetVersion.getVersionType() == PolicyVersionType.MAJOR
                    ? NotificationType.POLICY_NEW_VERSION
                    : NotificationType.POLICY_ASSIGNED);

            String title = (notifType.equals(NotificationType.POLICY_NEW_VERSION))
                    ? "Updated Policy Assigned: " + doc.getTitle()
                    : "Policy Assigned: " + doc.getTitle();

            String message = "You have been assigned \"" + doc.getTitle() + "\" (v" + targetVersion.getVersionNumber() + ")"
                    + (req.getDueDate() != null ? " with due date " + req.getDueDate() : "") + ".";

            String dedupKey = "policy-assign:" + targetVersion.getId() + ":" + emp.getId();

            notificationService.createNotification(
                    emp.getId(),
                    title,
                    message,
                    notifType,
                    "NORMAL",
                    "POLICY",
                    doc.getId().toString(),
                    "/profile#policies",
                    dedupKey,
                    Map.of("policyId", doc.getId(), "versionId", targetVersion.getId(), "versionNumber", targetVersion.getVersionNumber())
            );
        }

        doc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        doc.setPublishedAt(LocalDateTime.now());
        doc = documentRepo.save(doc);

        logAudit(doc.getId(), targetVersion.getId(), userId, "POLICY_PUBLISHED",
                "Published policy v" + targetVersion.getVersionNumber() + " to " + targetedUsers.size() + " employees (" + newAssignmentCount + " new assignments)", null);

        return toDocumentDTO(doc);
    }

    @Override
    @Transactional
    public PolicyDocumentDTO archivePolicy(Long policyId, Long userId) {
        PolicyDocument doc = documentRepo.findById(policyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document not found: " + policyId));

        doc.setDocumentStatus(PolicyDocumentStatus.ARCHIVED);
        doc.setArchivedAt(LocalDateTime.now());
        doc = documentRepo.save(doc);

        logAudit(doc.getId(), null, userId, "POLICY_ARCHIVED", "Archived policy: " + doc.getTitle(), null);
        return toDocumentDTO(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public PolicyDocumentDTO getPolicyDetails(Long policyId, Long userId, String userRole) {
        PolicyDocument doc = documentRepo.findById(policyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document not found: " + policyId));

        return toDocumentDTO(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyDocumentDTO> getAllPoliciesForHr(Long categoryId, String status) {
        List<PolicyDocument> docs = documentRepo.findAllByOrderByCreatedAtDesc();

        return docs.stream()
                .filter(d -> categoryId == null || d.getCategory().getId().equals(categoryId))
                .filter(d -> status == null || status.isBlank() || d.getDocumentStatus().name().equalsIgnoreCase(status))
                .map(this::toDocumentDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyVersionDTO> getPolicyVersions(Long policyId, Long userId, String userRole) {
        return versionRepo.findByPolicyDocumentIdOrderByCreatedAtDesc(policyId).stream()
                .map(this::toVersionDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyAssignmentDTO> getPolicyAssignments(Long policyId, Long userId, String userRole) {
        return assignmentRepo.findByPolicyDocumentId(policyId).stream()
                .map(this::toAssignmentDTO)
                .toList();
    }

    // ==========================================
    // 3. Manager Operations & Submissions
    // ==========================================
    @Override
    @Transactional
    public PolicyDocumentDTO submitDepartmentPolicy(
            ManagerPolicySubmissionRequest req,
            MultipartFile file,
            Long managerId
    ) {
        User manager = userRepo.findById(managerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));

        Department targetDept = departmentRepo.findById(req.getTargetDepartmentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target department not found: " + req.getTargetDepartmentId()));

        // Security check: Manager must belong to or manage the department hierarchy
        if (!isManagerAuthorizedForDepartment(manager, targetDept)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Manager may only submit policies for their own department hierarchy.");
        }

        PolicyCategory category = categoryRepo.findById(req.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found: " + req.getCategoryId()));

        // Upload PDF to WorkDrive department submissions folder
        PolicyWorkDriveService.UploadedPolicyFile uploaded = policyWorkDriveService.uploadPolicyPdf(
                file,
                category.getName(),
                true
        );

        String docCode = generateDocumentCode(category.getName());

        PolicyDocument doc = new PolicyDocument();
        doc.setDocumentCode(docCode);
        doc.setTitle(req.getTitle().trim());
        doc.setDescription(req.getDescription());
        doc.setCategory(category);
        doc.setOwningDepartment(targetDept);
        doc.setDocumentStatus(PolicyDocumentStatus.PENDING_APPROVAL);
        doc.setApprovalStatus(PolicyApprovalStatus.PENDING);
        doc.setCreatedBy(manager);
        doc.setSubmittedAt(LocalDateTime.now());
        doc = documentRepo.save(doc);

        PolicyVersion version = new PolicyVersion();
        version.setPolicyDocument(doc);
        version.setVersionNumber("1.0");
        version.setVersionType(PolicyVersionType.MAJOR);
        version.setWorkdriveFileId(uploaded.workdriveFileId());
        version.setWorkdriveFileName(uploaded.fileName());
        version.setWorkdriveFolderId(uploaded.folderId());
        version.setFileMimeType(uploaded.contentType());
        version.setFileSize(uploaded.fileSize());
        version.setSha256Hash(uploaded.sha256Hash());
        version.setEffectiveDate(LocalDate.now());
        version.setAllowDownload(req.getAllowDownload() != null ? req.getAllowDownload() : true);
        version.setVersionNotes(req.getSubmissionNotes());
        version.setCreatedBy(manager);
        versionRepo.save(version);

        // Notify HR Admins
        notificationService.notifyHrAdmins(
                "New Department Policy Submitted: " + doc.getTitle(),
                "Manager " + manager.getFullName() + " submitted a department policy for approval.",
                NotificationType.POLICY_APPROVAL_REQ,
                "/hr/policies",
                "policy-approval-req:" + doc.getId()
        );

        logAudit(doc.getId(), version.getId(), managerId, "SUBMISSION_CREATED",
                "Manager submitted policy for approval: " + doc.getTitle(), null);

        return toDocumentDTO(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyDocumentDTO> getDepartmentPoliciesForManager(Long managerId) {
        User manager = userRepo.findById(managerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));

        Set<Long> deptIds = resolveManagerDepartmentIds(manager);
        if (deptIds.isEmpty()) {
            return List.of();
        }

        return documentRepo.findByOwningDepartmentIdInOrderByCreatedAtDesc(deptIds).stream()
                .map(this::toDocumentDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyDocumentDTO> getPendingSubmissionsForHr() {
        return documentRepo.findByApprovalStatusOrderBySubmittedAtDesc(PolicyApprovalStatus.PENDING).stream()
                .map(this::toDocumentDTO)
                .toList();
    }

    @Override
    @Transactional
    public PolicyDocumentDTO decideManagerSubmission(
            Long policyId,
            ApprovalDecisionRequest decision,
            Long hrAdminId
    ) {
        PolicyDocument doc = documentRepo.findById(policyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document not found: " + policyId));

        User hrAdmin = userRepo.findById(hrAdminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "HR Admin not found: " + hrAdminId));

        // Self-approval restriction
        if (hrAdminId.equals(doc.getCreatedBy().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Self-approval restriction: A user cannot approve their own submission.");
        }

        if (decision.getDecision() == ApprovalDecisionRequest.Decision.APPROVE) {
            doc.setApprovalStatus(PolicyApprovalStatus.APPROVED);
            doc.setApprovedBy(hrAdmin);
            doc.setApprovedAt(LocalDateTime.now());
            doc.setApprovalComment(decision.getComment());

            // If auto-publish requested, publish to the department
            if (decision.isAutoPublish() && doc.getOwningDepartment() != null) {
                PublishPolicyRequest pubReq = new PublishPolicyRequest();
                pubReq.setAudienceType(PolicyAssignmentSource.DEPARTMENT);
                pubReq.setDepartmentIds(List.of(doc.getOwningDepartment().getId()));
                pubReq.setDueDate(decision.getDueDate());
                pubReq.setMandatory(true);
                return publishPolicy(doc.getId(), pubReq, hrAdminId);
            } else {
                doc.setDocumentStatus(PolicyDocumentStatus.DRAFT);
                doc = documentRepo.save(doc);
            }

            // Notify submitting manager
            notificationService.createNotification(
                    doc.getCreatedBy().getId(),
                    "Policy Submission Approved: " + doc.getTitle(),
                    "Your department policy submission has been approved by HR.",
                    NotificationType.POLICY_DECISION,
                    "NORMAL",
                    "POLICY",
                    doc.getId().toString(),
                    "/manager/policies",
                    "policy-decision:" + doc.getId() + ":APPROVED",
                    Map.of("policyId", doc.getId(), "status", "APPROVED")
            );

            logAudit(doc.getId(), null, hrAdminId, "SUBMISSION_APPROVED",
                    "Approved submission: " + doc.getTitle() + (decision.getComment() != null ? " (" + decision.getComment() + ")" : ""), null);
        } else {
            doc.setApprovalStatus(PolicyApprovalStatus.REJECTED);
            doc.setApprovedBy(hrAdmin);
            doc.setApprovedAt(LocalDateTime.now());
            doc.setApprovalComment(decision.getComment());
            doc.setDocumentStatus(PolicyDocumentStatus.DRAFT);
            doc = documentRepo.save(doc);

            // Notify submitting manager
            notificationService.createNotification(
                    doc.getCreatedBy().getId(),
                    "Policy Submission Rejected: " + doc.getTitle(),
                    "Your department policy submission was rejected. Reason: " + (decision.getComment() != null ? decision.getComment() : "None provided."),
                    NotificationType.POLICY_DECISION,
                    "HIGH",
                    "POLICY",
                    doc.getId().toString(),
                    "/manager/policies",
                    "policy-decision:" + doc.getId() + ":REJECTED",
                    Map.of("policyId", doc.getId(), "status", "REJECTED")
            );

            logAudit(doc.getId(), null, hrAdminId, "SUBMISSION_REJECTED",
                    "Rejected submission: " + doc.getTitle() + " - Reason: " + decision.getComment(), null);
        }

        return toDocumentDTO(doc);
    }

    // ==========================================
    // 4. Employee Policy Operations
    // ==========================================
    @Override
    @Transactional(readOnly = true)
    public List<PolicyAssignmentDTO> getMyAssignments(Long userId, String statusFilter) {
        List<PolicyAssignment> assignments = assignmentRepo.findByEmployeeUserIdAndAssignmentStatus(userId, PolicyAssignmentStatus.ACTIVE);
        LocalDate today = LocalDate.now();

        List<PolicyAssignmentDTO> dtos = new ArrayList<>();
        for (PolicyAssignment a : assignments) {
            PolicyAssignmentDTO dto = toAssignmentDTO(a);

            // Check acknowledgement
            Optional<PolicyAcknowledgement> ackOpt = acknowledgementRepo.findByPolicyVersionIdAndEmployeeUserId(
                    a.getPolicyVersion().getId(),
                    userId
            );

            if (ackOpt.isPresent()) {
                dto.setComplianceStatus("ACKNOWLEDGED");
                dto.setAcknowledged(true);
                dto.setAcknowledgedAt(ackOpt.get().getAcceptedAt());
                dto.setAcknowledgementId(ackOpt.get().getId());
            } else {
                dto.setAcknowledged(false);
                // Due date logic: if dueDate is NULL, it is NEVER overdue!
                if (a.getDueDate() != null && a.getDueDate().isBefore(today)) {
                    dto.setComplianceStatus("OVERDUE");
                } else {
                    dto.setComplianceStatus("PENDING");
                }
            }

            // Apply filter
            if (statusFilter == null || statusFilter.equalsIgnoreCase("ALL") || statusFilter.equalsIgnoreCase(dto.getComplianceStatus())) {
                dtos.add(dto);
            }
        }

        // Sort: OVERDUE first, then PENDING, then ACKNOWLEDGED
        dtos.sort(Comparator.comparingInt(d -> {
            if ("OVERDUE".equals(d.getComplianceStatus())) return 1;
            if ("PENDING".equals(d.getComplianceStatus())) return 2;
            return 3;
        }));

        return dtos;
    }

    @Override
    @Transactional(readOnly = true)
    public PolicyDocumentDTO getMyPolicyDetails(Long policyId, Long userId) {
        PolicyDocument doc = documentRepo.findById(policyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document not found: " + policyId));

        if (doc.getDocumentStatus() != PolicyDocumentStatus.PUBLISHED) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy not available");
        }

        return toDocumentDTO(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public DownloadedDocument viewPolicyDocument(Long versionId, Long userId, String userRole) {
        PolicyVersion version = versionRepo.findById(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy version not found: " + versionId));

        verifyUserAccessToVersion(version, userId, userRole);

        DownloadedDocument doc = policyWorkDriveService.downloadPolicyPdf(version.getWorkdriveFileId());
        logAudit(version.getPolicyDocument().getId(), version.getId(), userId, "DOCUMENT_VIEWED", "Viewed document in-app", null);
        return doc;
    }

    @Override
    @Transactional(readOnly = true)
    public DownloadedDocument downloadPolicyDocument(Long versionId, Long userId, String userRole) {
        PolicyVersion version = versionRepo.findById(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy version not found: " + versionId));

        verifyUserAccessToVersion(version, userId, userRole);

        // Security check: allowDownload flag enforcement
        boolean isHrAdmin = "HR_ADMIN".equalsIgnoreCase(userRole) || "SUPER_ADMIN".equalsIgnoreCase(userRole);
        if (!isHrAdmin && !Boolean.TRUE.equals(version.getAllowDownload())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Document download is restricted by organization policy. In-app viewing only.");
        }

        DownloadedDocument doc = policyWorkDriveService.downloadPolicyPdf(version.getWorkdriveFileId());
        logAudit(version.getPolicyDocument().getId(), version.getId(), userId, "DOCUMENT_DOWNLOADED", "Downloaded document file", null);
        return doc;
    }

    @Override
    @Transactional
    public PolicyAcknowledgementDTO acknowledgePolicy(
            Long assignmentId,
            AcknowledgePolicyRequest req,
            Long userId,
            String ipAddress,
            String userAgent
    ) {
        PolicyAssignment assignment = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy assignment not found: " + assignmentId));

        // Strict authorization: Employee cannot acknowledge another employee's assignment
        if (!assignment.getEmployeeUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot acknowledge another employee's assignment");
        }

        // Idempotent duplicate check: If already acknowledged, return existing record safely
        Optional<PolicyAcknowledgement> existing = acknowledgementRepo.findByPolicyVersionIdAndEmployeeUserId(
                assignment.getPolicyVersion().getId(),
                userId
        );
        if (existing.isPresent()) {
            return toAcknowledgementDTO(existing.get());
        }

        // Append-only acknowledgement insertion
        PolicyAcknowledgement ack = new PolicyAcknowledgement();
        ack.setPolicyAssignment(assignment);
        ack.setPolicyDocument(assignment.getPolicyDocument());
        ack.setPolicyVersion(assignment.getPolicyVersion());
        ack.setEmployeeUser(assignment.getEmployeeUser());
        ack.setEmployeeIdSnapshot(assignment.getEmployeeUser().getEmployeeId() != null ? assignment.getEmployeeUser().getEmployeeId() : "EMP-" + assignment.getEmployeeUser().getId());
        ack.setAuthenticatedUser(userRepo.findById(userId).orElse(assignment.getEmployeeUser()));
        ack.setDocumentSha256Hash(assignment.getPolicyVersion().getSha256Hash());
        ack.setAcknowledgementTextVersion(req.getComments() != null && !req.getComments().isBlank()
                ? req.getComments()
                : "Acknowledged policy " + assignment.getPolicyDocument().getTitle() + " (v" + assignment.getPolicyVersion().getVersionNumber() + ")");
        ack.setRequestIp(ipAddress != null ? ipAddress : "0.0.0.0");
        ack.setUserAgent(userAgent);
        ack.setAcceptedAt(LocalDateTime.now());

        ack = acknowledgementRepo.save(ack);

        logAudit(assignment.getPolicyDocument().getId(), assignment.getPolicyVersion().getId(), userId, "POLICY_ACKNOWLEDGED",
                "Acknowledged policy version " + assignment.getPolicyVersion().getVersionNumber(), ipAddress);

        return toAcknowledgementDTO(ack);
    }

    // ==========================================
    // 5. Compliance Reporting
    // ==========================================
    @Override
    @Transactional(readOnly = true)
    public PolicyComplianceSummaryDTO getPolicyComplianceSummary(Long policyId, Long userId, String userRole) {
        PolicyDocument doc = documentRepo.findById(policyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document not found: " + policyId));

        boolean isManager = "MANAGER".equalsIgnoreCase(userRole);
        List<PolicyAssignment> assignments;

        if (isManager) {
            User manager = userRepo.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));
            Set<Long> deptIds = resolveManagerDepartmentIds(manager);
            assignments = assignmentRepo.findByPolicyDocumentIdAndDepartmentIds(doc.getId(), deptIds);
        } else {
            assignments = assignmentRepo.findByPolicyDocumentId(doc.getId());
        }

        LocalDate today = LocalDate.now();
        long totalAssigned = assignments.size();
        long totalAcknowledged = 0;
        long totalOverdue = 0;
        long totalPending = 0;

        for (PolicyAssignment a : assignments) {
            boolean acked = acknowledgementRepo.existsByPolicyVersionIdAndEmployeeUserId(
                    a.getPolicyVersion().getId(),
                    a.getEmployeeUser().getId()
            );

            if (acked) {
                totalAcknowledged++;
            } else if (a.getDueDate() != null && a.getDueDate().isBefore(today)) {
                totalOverdue++;
            } else {
                totalPending++;
            }
        }

        double complianceRate = totalAssigned > 0 ? (totalAcknowledged * 100.0 / totalAssigned) : 0.0;

        PolicyComplianceSummaryDTO summary = new PolicyComplianceSummaryDTO();
        summary.setPolicyDocumentId(doc.getId());
        summary.setDocumentCode(doc.getDocumentCode());
        summary.setTitle(doc.getTitle());
        summary.setTotalAssigned(totalAssigned);
        summary.setTotalAcknowledged(totalAcknowledged);
        summary.setTotalPending(totalPending);
        summary.setTotalOverdue(totalOverdue);
        summary.setCompliancePercentage(Math.round(complianceRate * 10.0) / 10.0);
        summary.setDepartmentBreakdowns(calculateDepartmentBreakdown(assignments, today));

        return summary;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyComplianceSummaryDTO.DepartmentComplianceDTO> getDepartmentComplianceBreakdown(
            Long policyId,
            Long userId,
            String userRole
    ) {
        PolicyComplianceSummaryDTO summary = getPolicyComplianceSummary(policyId, userId, userRole);
        return summary.getDepartmentBreakdowns();
    }

    // ==========================================
    // 6. Audit Logging
    // ==========================================
    @Override
    @Transactional
    public void logAudit(
            Long policyDocumentId,
            Long policyVersionId,
            Long userId,
            String action,
            String description,
            String ipAddress
    ) {
        try {
            PolicyDocument doc = policyDocumentId != null ? documentRepo.findById(policyDocumentId).orElse(null) : null;
            PolicyVersion version = policyVersionId != null ? versionRepo.findById(policyVersionId).orElse(null) : null;
            User user = userId != null ? userRepo.findById(userId).orElse(null) : null;

            PolicyAuditLog audit = new PolicyAuditLog();
            audit.setPolicyDocument(doc);
            audit.setPolicyVersion(version);
            audit.setPerformedBy(user);
            audit.setAction(action);
            audit.setDescription(description);
            audit.setIpAddress(ipAddress);

            auditLogRepo.save(audit);
        } catch (Exception ex) {
            log.error("Failed to record policy audit log: {}", ex.getMessage());
        }
    }

    // ==========================================
    // Helper & Mapping Methods
    // ==========================================
    private PolicyCategoryDTO toCategoryDTO(PolicyCategory cat) {
        PolicyCategoryDTO dto = new PolicyCategoryDTO();
        dto.setId(cat.getId());
        dto.setName(cat.getName());
        dto.setDescription(cat.getDescription());
        dto.setIcon(cat.getIcon());
        dto.setActive(cat.getActive());
        dto.setDisplayOrder(cat.getDisplayOrder());
        return dto;
    }

    private PolicyVersionDTO toVersionDTO(PolicyVersion v) {
        PolicyVersionDTO dto = new PolicyVersionDTO();
        dto.setId(v.getId());
        dto.setPolicyDocumentId(v.getPolicyDocument().getId());
        dto.setVersionNumber(v.getVersionNumber());
        dto.setVersionType(v.getVersionType().name());
        dto.setWorkdriveFileId(v.getWorkdriveFileId());
        dto.setWorkdriveFileName(v.getWorkdriveFileName());
        dto.setWorkdriveFolderId(v.getWorkdriveFolderId());
        dto.setFileMimeType(v.getFileMimeType());
        dto.setFileSize(v.getFileSize());
        dto.setSha256Hash(v.getSha256Hash());
        dto.setEffectiveDate(v.getEffectiveDate());
        dto.setAllowDownload(v.getAllowDownload());
        dto.setVersionNotes(v.getVersionNotes());
        dto.setCreatedByUserId(v.getCreatedBy().getId());
        dto.setCreatedByUserName(v.getCreatedBy().getFullName());
        dto.setCreatedAt(v.getCreatedAt());
        return dto;
    }

    private PolicyDocumentDTO toDocumentDTO(PolicyDocument d) {
        PolicyDocumentDTO dto = new PolicyDocumentDTO();
        dto.setId(d.getId());
        dto.setDocumentCode(d.getDocumentCode());
        dto.setTitle(d.getTitle());
        dto.setDescription(d.getDescription());
        dto.setDocumentStatus(d.getDocumentStatus().name());
        dto.setApprovalStatus(d.getApprovalStatus().name());
        dto.setApprovalComment(d.getApprovalComment());
        dto.setSubmittedAt(d.getSubmittedAt());
        dto.setApprovedAt(d.getApprovedAt());
        dto.setPublishedAt(d.getPublishedAt());
        dto.setArchivedAt(d.getArchivedAt());
        dto.setCreatedAt(d.getCreatedAt());
        dto.setUpdatedAt(d.getUpdatedAt());

        if (d.getCategory() != null) {
            dto.setCategoryId(d.getCategory().getId());
            dto.setCategoryName(d.getCategory().getName());
        }
        if (d.getOwningDepartment() != null) {
            dto.setOwningDepartmentId(d.getOwningDepartment().getId());
            dto.setOwningDepartmentName(d.getOwningDepartment().getName());
        }
        if (d.getCreatedBy() != null) {
            dto.setCreatedByUserId(d.getCreatedBy().getId());
            dto.setCreatedByUserName(d.getCreatedBy().getFullName());
        }
        if (d.getApprovedBy() != null) {
            dto.setApprovedByUserId(d.getApprovedBy().getId());
            dto.setApprovedByUserName(d.getApprovedBy().getFullName());
        }

        // Attach latest version info if available
        versionRepo.findFirstByPolicyDocumentIdOrderByCreatedAtDesc(d.getId()).ifPresent(v -> {
            dto.setLatestVersion(toVersionDTO(v));
        });

        return dto;
    }

    private PolicyAssignmentDTO toAssignmentDTO(PolicyAssignment a) {
        PolicyAssignmentDTO dto = new PolicyAssignmentDTO();
        dto.setId(a.getId());
        dto.setPolicyDocumentId(a.getPolicyDocument().getId());
        dto.setPolicyTitle(a.getPolicyDocument().getTitle());
        dto.setDocumentCode(a.getPolicyDocument().getDocumentCode());
        dto.setPolicyVersionId(a.getPolicyVersion().getId());
        dto.setVersionNumber(a.getPolicyVersion().getVersionNumber());
        dto.setEmployeeUserId(a.getEmployeeUser().getId());
        dto.setEmployeeName(a.getEmployeeUser().getFullName());
        dto.setEmployeeId(a.getEmployeeUser().getEmployeeId());
        dto.setDepartment(a.getEmployeeUser().getDepartment());
        dto.setAssignmentSource(a.getAssignmentSource());
        dto.setDepartmentIdSnapshot(a.getDepartmentIdSnapshot());
        dto.setDueDate(a.getDueDate());
        dto.setMandatory(a.getMandatory());
        dto.setAssignmentStatus(a.getAssignmentStatus());
        dto.setAssignedAt(a.getAssignedAt());
        dto.setAllowDownload(a.getPolicyVersion().getAllowDownload());
        if (a.getPolicyDocument().getCategory() != null) {
            dto.setCategoryName(a.getPolicyDocument().getCategory().getName());
        }
        return dto;
    }

    private PolicyAcknowledgementDTO toAcknowledgementDTO(PolicyAcknowledgement ack) {
        PolicyAcknowledgementDTO dto = new PolicyAcknowledgementDTO();
        dto.setId(ack.getId());
        dto.setPolicyAssignmentId(ack.getPolicyAssignment() != null ? ack.getPolicyAssignment().getId() : null);
        dto.setPolicyDocumentId(ack.getPolicyDocument().getId());
        dto.setDocumentTitle(ack.getPolicyDocument().getTitle());
        dto.setDocumentCode(ack.getPolicyDocument().getDocumentCode());
        dto.setPolicyVersionId(ack.getPolicyVersion().getId());
        dto.setVersionNumber(ack.getPolicyVersion().getVersionNumber());
        dto.setEmployeeUserId(ack.getEmployeeUser().getId());
        dto.setEmployeeName(ack.getEmployeeUser().getFullName());
        dto.setEmployeeIdSnapshot(ack.getEmployeeIdSnapshot());
        dto.setDepartmentName(ack.getEmployeeUser().getDepartment());
        dto.setAcceptedAt(ack.getAcceptedAt());
        dto.setRequestIp(ack.getRequestIp());
        dto.setUserAgent(ack.getUserAgent());
        dto.setDocumentSha256Hash(ack.getDocumentSha256Hash());
        dto.setAcknowledgementTextVersion(ack.getAcknowledgementTextVersion());
        return dto;
    }

    private String generateDocumentCode(String categoryName) {
        String prefix = "POL";
        if (categoryName != null) {
            String clean = categoryName.trim().toUpperCase();
            if (clean.contains("AGREEMENT")) prefix = "AGR";
            else if (clean.contains("SECURITY") || clean.contains("IT")) prefix = "IT-POL";
            else if (clean.contains("HR") || clean.contains("WORKPLACE")) prefix = "HR-POL";
            else if (clean.contains("COMPLIANCE") || clean.contains("ETHICS")) prefix = "CMP-POL";
        }
        int year = LocalDate.now().getYear();
        String randomSuffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return prefix + "-" + year + "-" + randomSuffix;
    }

    private String calculateNextVersionNumber(Long policyId, String versionTypeStr) {
        Optional<PolicyVersion> latest = versionRepo.findFirstByPolicyDocumentIdOrderByCreatedAtDesc(policyId);
        if (latest.isEmpty()) {
            return "1.0";
        }

        String cur = latest.get().getVersionNumber();
        try {
            String[] parts = cur.split("\\.");
            int major = Integer.parseInt(parts[0]);
            int minor = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;

            if ("MINOR".equalsIgnoreCase(versionTypeStr)) {
                return major + "." + (minor + 1);
            } else {
                return (major + 1) + ".0";
            }
        } catch (Exception ex) {
            return cur + ".1";
        }
    }

    private Set<Long> resolveDepartmentHierarchyIds(Collection<Long> departmentIds) {
        Set<Long> result = new HashSet<>(departmentIds);
        List<Department> allDepts = departmentRepo.findAll();

        boolean addedNew;
        do {
            addedNew = false;
            for (Department d : allDepts) {
                if (d.getParentDepartment() != null && result.contains(d.getParentDepartment().getId())) {
                    if (result.add(d.getId())) {
                        addedNew = true;
                    }
                }
            }
        } while (addedNew);

        return result;
    }

    private Set<Long> resolveManagerDepartmentIds(User manager) {
        Set<Long> deptIds = new HashSet<>();
        if (manager.getDepartment() == null || manager.getDepartment().isBlank()) {
            return deptIds;
        }

        departmentRepo.findByNameIgnoreCase(manager.getDepartment()).ifPresent(d -> {
            deptIds.add(d.getId());
        });

        // Also resolve child departments
        return resolveDepartmentHierarchyIds(deptIds);
    }

    private boolean isManagerAuthorizedForDepartment(User manager, Department targetDept) {
        if (manager.getRole() == Role.HR_ADMIN) {
            return true;
        }
        Set<Long> authorizedIds = resolveManagerDepartmentIds(manager);
        return authorizedIds.contains(targetDept.getId());
    }

    private Long resolveDepartmentIdForUser(User u) {
        if (u.getDepartment() == null || u.getDepartment().isBlank()) return null;
        return departmentRepo.findByNameIgnoreCase(u.getDepartment())
                .map(Department::getId)
                .orElse(null);
    }

    private void verifyUserAccessToVersion(PolicyVersion version, Long userId, String userRole) {
        if ("HR_ADMIN".equalsIgnoreCase(userRole) || "SUPER_ADMIN".equalsIgnoreCase(userRole)) {
            return;
        }

        // Check if user has active assignment
        boolean hasAssignment = assignmentRepo.existsByPolicyVersionIdAndEmployeeUserId(version.getId(), userId);
        if (hasAssignment) {
            return;
        }

        // Check if user is manager of the department
        if ("MANAGER".equalsIgnoreCase(userRole)) {
            User manager = userRepo.findById(userId).orElse(null);
            if (manager != null) {
                Set<Long> managerDeptIds = resolveManagerDepartmentIds(manager);
                if (version.getPolicyDocument().getOwningDepartment() != null
                        && managerDeptIds.contains(version.getPolicyDocument().getOwningDepartment().getId())) {
                    return;
                }
            }
        }

        // Check if published company-wide
        if (version.getPolicyDocument().getDocumentStatus() == PolicyDocumentStatus.PUBLISHED) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to policy version");
    }

    private List<PolicyComplianceSummaryDTO.DepartmentComplianceDTO> calculateDepartmentBreakdown(
            List<PolicyAssignment> assignments,
            LocalDate today
    ) {
        Map<String, List<PolicyAssignment>> byDept = assignments.stream()
                .filter(a -> a.getEmployeeUser() != null && a.getEmployeeUser().getDepartment() != null)
                .collect(Collectors.groupingBy(a -> a.getEmployeeUser().getDepartment()));

        List<PolicyComplianceSummaryDTO.DepartmentComplianceDTO> breakdowns = new ArrayList<>();
        for (Map.Entry<String, List<PolicyAssignment>> entry : byDept.entrySet()) {
            String deptName = entry.getKey();
            List<PolicyAssignment> deptAssignments = entry.getValue();

            long total = deptAssignments.size();
            long acked = 0;
            long overdue = 0;
            long pending = 0;

            for (PolicyAssignment a : deptAssignments) {
                boolean isAck = acknowledgementRepo.existsByPolicyVersionIdAndEmployeeUserId(
                        a.getPolicyVersion().getId(),
                        a.getEmployeeUser().getId()
                );
                if (isAck) {
                    acked++;
                } else if (a.getDueDate() != null && a.getDueDate().isBefore(today)) {
                    overdue++;
                } else {
                    pending++;
                }
            }

            double rate = total > 0 ? (acked * 100.0 / total) : 0.0;
            Long deptId = deptAssignments.get(0).getDepartmentIdSnapshot();

            breakdowns.add(new PolicyComplianceSummaryDTO.DepartmentComplianceDTO(
                    deptId,
                    deptName,
                    total,
                    acked,
                    pending,
                    overdue,
                    Math.round(rate * 10.0) / 10.0
            ));
        }

        breakdowns.sort(Comparator.comparing(PolicyComplianceSummaryDTO.DepartmentComplianceDTO::getDepartmentName, String.CASE_INSENSITIVE_ORDER));
        return breakdowns;
    }
}
