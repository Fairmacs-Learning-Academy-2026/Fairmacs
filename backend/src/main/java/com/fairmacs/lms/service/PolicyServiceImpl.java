package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.*;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService.DownloadedDocument;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.repository.PolicyDocumentRepository;
import com.fairmacs.lms.repository.PolicyVersionRepository;
import com.fairmacs.lms.repository.PolicyAssignmentRepository;
import com.fairmacs.lms.repository.PolicyAcknowledgementRepository;
import com.fairmacs.lms.repository.PolicyAuditLogRepository;
import com.fairmacs.lms.repository.PolicyCategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
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
    private final PolicyWatermarkService policyWatermarkService;

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
        this(categoryRepo, documentRepo, versionRepo, assignmentRepo, acknowledgementRepo,
                auditLogRepo, userRepo, departmentRepo, policyWorkDriveService, notificationService,
                new PolicyWatermarkService());
    }

    @Autowired
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
            NotificationService notificationService,
            PolicyWatermarkService policyWatermarkService
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
        this.policyWatermarkService = policyWatermarkService != null ? policyWatermarkService : new PolicyWatermarkService();
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
                assignment.setDepartmentIdSnapshot(deptIdSnapshot);
                assignment.setDepartmentNameSnapshot(emp.getDepartment());
                assignment = assignmentRepo.save(assignment);
            } else {
                assignment = new PolicyAssignment();
                assignment.setPolicyDocument(doc);
                assignment.setPolicyVersion(targetVersion);
                assignment.setEmployeeUser(emp);
                assignment.setEmployeeIdSnapshot(emp.getEmployeeId() != null ? emp.getEmployeeId() : "EMP-" + emp.getId());
                assignment.setAssignmentSource(source);
                assignment.setDepartmentIdSnapshot(deptIdSnapshot);
                assignment.setDepartmentNameSnapshot(emp.getDepartment());
                assignment.setDueDate(req.getDueDate()); // Optional: null = open-ended
                assignment.setMandatory(req.getMandatory());
                assignment.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
                assignment.setAssignedBy(publisher);
                assignment.setAssignedAt(LocalDateTime.now());
                assignment = assignmentRepo.save(assignment);
                newAssignmentCount++;
            }

            // Version acknowledgement logic: Derived acknowledgement validity for MINOR updates
            // Append-only rule: Never create fabricated CARRIED_FORWARD_MINOR acceptance records.
            // Current validity is dynamically derived from previous explicit acknowledgements.
            if (isMinorVersion && isUpdate) {
                if (isCompliantInternal(targetVersion, emp.getId())) {
                    continue; // Skip new assignment notification if employee is already compliant via prior valid acknowledgement
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
        requireManagerRole(manager);

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
        version.setVersionNumber(req.getVersionNumber() != null && !req.getVersionNumber().isBlank() ? req.getVersionNumber().trim() : "1.0");
        version.setVersionType(PolicyVersionType.MAJOR);
        version.setWorkdriveFileId(uploaded.workdriveFileId());
        version.setWorkdriveFileName(uploaded.fileName());
        version.setWorkdriveFolderId(uploaded.folderId());
        version.setFileMimeType(uploaded.contentType());
        version.setFileSize(uploaded.fileSize());
        version.setSha256Hash(uploaded.sha256Hash());
        version.setEffectiveDate(req.getEffectiveDate() != null ? req.getEffectiveDate() : LocalDate.now());
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
        requireManagerRole(manager);

        Set<Long> deptIds = resolveManagerDepartmentIds(manager);
        List<String> deptNames = departmentRepo.findAllById(deptIds).stream()
                .map(Department::getName)
                .map(String::toLowerCase)
                .toList();

        List<PolicyDocument> publishedDocs = documentRepo.findAllByOrderByCreatedAtDesc().stream()
                .filter(d -> d.getDocumentStatus() == PolicyDocumentStatus.PUBLISHED)
                .toList();

        List<PolicyAssignment> allAssignments = assignmentRepo.findAll();

        List<PolicyDocumentDTO> result = new ArrayList<>();
        for (PolicyDocument doc : publishedDocs) {
            List<PolicyAssignment> deptAssignments = allAssignments.stream()
                    .filter(a -> a.getPolicyDocument() != null && a.getPolicyDocument().getId().equals(doc.getId()))
                    .filter(a -> a.getAssignmentStatus() == PolicyAssignmentStatus.ACTIVE)
                    .filter(a -> {
                        if (a.getDepartmentIdSnapshot() != null && deptIds.contains(a.getDepartmentIdSnapshot())) return true;
                        if (a.getEmployeeUser() != null && a.getEmployeeUser().getDepartment() != null) {
                            return deptNames.contains(a.getEmployeeUser().getDepartment().trim().toLowerCase());
                        }
                        return false;
                    })
                    .toList();

            boolean isOwnedByDept = doc.getOwningDepartment() != null && deptIds.contains(doc.getOwningDepartment().getId());
            boolean hasDeptAssignments = !deptAssignments.isEmpty();

            if (isOwnedByDept || hasDeptAssignments) {
                PolicyDocumentDTO dto = toDocumentDTO(doc);

                long deptAssigned = deptAssignments.size();
                long deptAcked = 0;
                boolean anyMandatory = false;
                LocalDate earliestDue = null;

                for (PolicyAssignment a : deptAssignments) {
                    if (Boolean.TRUE.equals(a.getMandatory())) anyMandatory = true;
                    if (a.getDueDate() != null) {
                        if (earliestDue == null || a.getDueDate().isBefore(earliestDue)) {
                            earliestDue = a.getDueDate();
                        }
                    }
                    if (isCompliantInternal(a.getPolicyVersion(), a.getEmployeeUser().getId())) {
                        deptAcked++;
                    }
                }

                dto.setTotalAssignments(deptAssigned);
                dto.setTotalAcknowledgements(deptAcked);
                double pct = deptAssigned > 0 ? (double) Math.round((double) deptAcked / deptAssigned * 1000.0) / 10.0 : 0.0;
                dto.setCompliancePercentage(pct);
                dto.setMandatory(anyMandatory);
                dto.setDueDate(earliestDue);

                result.add(dto);
            }
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentSummaryDTO> getManagerDepartments(Long managerId) {
        User manager = userRepo.findById(managerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));
        requireManagerRole(manager);

        Set<Long> deptIds = resolveManagerDepartmentIds(manager);
        if (deptIds.isEmpty()) return List.of();

        return departmentRepo.findAllById(deptIds).stream()
                .map(d -> new DepartmentSummaryDTO(d.getId(), d.getName(), d.getHeadId(), d.getDescription(), 0, 0, 0.0))
                .sorted(Comparator.comparing(DepartmentSummaryDTO::getName))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PolicyDeptOverviewDTO getDepartmentOverview(Long managerId) {
        User manager = userRepo.findById(managerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));
        requireManagerRole(manager);

        PolicyDeptOverviewDTO overview = new PolicyDeptOverviewDTO();
        overview.setDepartmentName(manager.getDepartment() != null ? manager.getDepartment() : "My Department");

        Set<Long> deptIds = resolveManagerDepartmentIds(manager);
        if (deptIds.isEmpty()) {
            return overview;
        }

        List<String> deptNames = departmentRepo.findAllById(deptIds).stream()
                .map(Department::getName)
                .map(String::toLowerCase)
                .toList();

        List<PolicyAssignment> allAssignments = assignmentRepo.findAll();
        LocalDate today = LocalDate.now();

        List<PolicyAssignment> deptAssignments = allAssignments.stream()
                .filter(a -> a.getAssignmentStatus() == PolicyAssignmentStatus.ACTIVE)
                .filter(a -> a.getPolicyDocument() != null && a.getPolicyDocument().getDocumentStatus() == PolicyDocumentStatus.PUBLISHED)
                .filter(a -> {
                    if (a.getDepartmentIdSnapshot() != null && deptIds.contains(a.getDepartmentIdSnapshot())) return true;
                    if (a.getEmployeeUser() != null && a.getEmployeeUser().getDepartment() != null) {
                        return deptNames.contains(a.getEmployeeUser().getDepartment().trim().toLowerCase());
                    }
                    return false;
                })
                .toList();

        long totalAssigned = deptAssignments.size();
        long totalAcked = 0;
        long totalPending = 0;
        long totalOverdue = 0;

        Set<Long> applicableDocIds = new HashSet<>();
        long mandatoryCount = 0;
        long optionalCount = 0;
        long mandatoryAcked = 0;
        long optionalAcked = 0;
        Set<Long> empWithOutstandingMandatory = new HashSet<>();

        for (PolicyAssignment a : deptAssignments) {
            applicableDocIds.add(a.getPolicyDocument().getId());

            boolean acked = isCompliantInternal(a.getPolicyVersion(), a.getEmployeeUser().getId());
            boolean overdue = !acked && a.getDueDate() != null && a.getDueDate().isBefore(today);

            if (acked) {
                totalAcked++;
            } else if (overdue) {
                totalOverdue++;
            } else {
                totalPending++;
            }

            boolean isMandatory = Boolean.TRUE.equals(a.getMandatory());
            if (isMandatory) {
                mandatoryCount++;
                if (acked) {
                    mandatoryAcked++;
                } else if (a.getEmployeeUser() != null) {
                    empWithOutstandingMandatory.add(a.getEmployeeUser().getId());
                }
            } else {
                optionalCount++;
                if (acked) {
                    optionalAcked++;
                }
            }
        }

        long eligibleEmployees = userRepo.findAll().stream()
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .filter(u -> {
                    if (u.getDepartment() == null || u.getDepartment().isBlank()) return false;
                    return deptNames.contains(u.getDepartment().trim().toLowerCase());
                })
                .count();

        overview.setTotalEligibleEmployees(eligibleEmployees);
        overview.setTotalApplicablePolicies((long) applicableDocIds.size());
        overview.setMandatoryCount(mandatoryCount);
        overview.setOptionalCount(optionalCount);
        overview.setTotalMandatoryAssigned(mandatoryCount);
        overview.setTotalMandatoryAcknowledged(mandatoryAcked);
        overview.setMandatoryCompliancePercentage(mandatoryCount > 0 ? (double) Math.round((double) mandatoryAcked / mandatoryCount * 1000.0) / 10.0 : 0.0);
        overview.setTotalOptionalAssigned(optionalCount);
        overview.setTotalOptionalAcknowledged(optionalAcked);
        overview.setOptionalCompliancePercentage(optionalCount > 0 ? (double) Math.round((double) optionalAcked / optionalCount * 1000.0) / 10.0 : 0.0);
        overview.setEmployeesWithOutstandingMandatory((long) empWithOutstandingMandatory.size());
        overview.setTotalAssigned(totalAssigned);
        overview.setTotalAcknowledged(totalAcked);
        overview.setTotalPending(totalPending);
        overview.setTotalOverdue(totalOverdue);
        overview.setCompletionPercentage(totalAssigned > 0 ? (double) Math.round((double) totalAcked / totalAssigned * 1000.0) / 10.0 : 0.0);

        List<PolicyDocument> pendingSubmissions = documentRepo.findAll().stream()
                .filter(d -> d.getApprovalStatus() == PolicyApprovalStatus.PENDING)
                .filter(d -> d.getCreatedBy() != null && (d.getCreatedBy().getId().equals(managerId)
                        || (d.getOwningDepartment() != null && deptIds.contains(d.getOwningDepartment().getId()))))
                .sorted(Comparator.comparing(PolicyDocument::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        overview.setPendingSubmissionsCount((long) pendingSubmissions.size());
        overview.setPendingSubmissions(pendingSubmissions.stream().map(this::toDocumentDTO).toList());

        List<PolicyDocumentDTO> applicablePolicies = getDepartmentPoliciesForManager(managerId);
        overview.setRecentlyPublished(applicablePolicies.stream().limit(5).toList());

        return overview;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyDocumentDTO> getManagerSubmissions(Long managerId) {
        User manager = userRepo.findById(managerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));
        requireManagerRole(manager);

        Set<Long> deptIds = resolveManagerDepartmentIds(manager);

        return documentRepo.findAll().stream()
                .filter(d -> d.getApprovalStatus() != null && d.getApprovalStatus() != PolicyApprovalStatus.NONE)
                .filter(d -> d.getCreatedBy() != null && (d.getCreatedBy().getId().equals(managerId)
                        || (d.getOwningDepartment() != null && deptIds.contains(d.getOwningDepartment().getId()))))
                .sorted(Comparator.comparing(PolicyDocument::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toDocumentDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyAssignmentDTO> getDepartmentPolicyAssignments(Long managerId, Long policyId, Long departmentId, String status) {
        User manager = userRepo.findById(managerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));
        requireManagerRole(manager);

        Set<Long> managerDeptIds = resolveManagerDepartmentIds(manager);

        if (departmentId != null && !managerDeptIds.contains(departmentId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cross-department access prohibited: Manager is not authorized for department ID: " + departmentId);
        }

        List<String> deptNames = departmentRepo.findAllById(managerDeptIds).stream()
                .map(Department::getName)
                .map(String::toLowerCase)
                .toList();

        List<PolicyAssignment> allAssignments = assignmentRepo.findAll();
        LocalDate today = LocalDate.now();

        List<PolicyAssignmentDTO> dtos = new ArrayList<>();
        for (PolicyAssignment a : allAssignments) {
            if (a.getAssignmentStatus() != PolicyAssignmentStatus.ACTIVE) continue;
            if (a.getPolicyDocument() == null || a.getPolicyDocument().getDocumentStatus() != PolicyDocumentStatus.PUBLISHED) continue;

            boolean inDept = false;
            if (departmentId != null) {
                if (departmentId.equals(a.getDepartmentIdSnapshot())) inDept = true;
                if (a.getEmployeeUser() != null && a.getEmployeeUser().getDepartment() != null) {
                    Department targetDept = departmentRepo.findById(departmentId).orElse(null);
                    if (targetDept != null && targetDept.getName().equalsIgnoreCase(a.getEmployeeUser().getDepartment().trim())) {
                        inDept = true;
                    }
                }
            } else {
                if (a.getDepartmentIdSnapshot() != null && managerDeptIds.contains(a.getDepartmentIdSnapshot())) inDept = true;
                if (a.getEmployeeUser() != null && a.getEmployeeUser().getDepartment() != null) {
                    if (deptNames.contains(a.getEmployeeUser().getDepartment().trim().toLowerCase())) inDept = true;
                }
            }

            if (!inDept) continue;

            if (policyId != null && !a.getPolicyDocument().getId().equals(policyId)) continue;

            PolicyAssignmentDTO dto = toAssignmentDTO(a);
            EffectiveAcknowledgement eff = resolveEffectiveAcknowledgement(a.getPolicyVersion(), a.getEmployeeUser().getId());

            if (eff.acknowledged()) {
                dto.setComplianceStatus("ACKNOWLEDGED");
                dto.setAcknowledged(true);
                dto.setIsExplicit(eff.isExplicit());
                dto.setDerivedFromVersionNumber(eff.derivedFromVersionNumber());
                dto.setAcknowledgedAt(eff.acknowledgedAt());
                dto.setAcknowledgementId(eff.acknowledgementId());
                dto.setDocumentSha256Hash(eff.sha256Hash());
            } else {
                dto.setAcknowledged(false);
                dto.setIsExplicit(false);
                if (a.getDueDate() != null && a.getDueDate().isBefore(today)) {
                    dto.setComplianceStatus("OVERDUE");
                } else {
                    dto.setComplianceStatus("PENDING");
                }
            }

            if (status != null && !status.equalsIgnoreCase("ALL") && !status.equalsIgnoreCase(dto.getComplianceStatus())) {
                continue;
            }

            dtos.add(dto);
        }

        dtos.sort(Comparator.comparing(PolicyAssignmentDTO::getAssignedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return dtos;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportDepartmentAssignmentsToExcel(Long managerId, Long policyId, Long departmentId, String status) {
        List<PolicyAssignmentDTO> assignments = getDepartmentPolicyAssignments(managerId, policyId, departmentId, status);
        return buildAssignmentsExcel(assignments, "Department Compliance Report");
    }

    @Override
    @Transactional
    public void sendAcknowledgementReminder(Long assignmentId, Long managerId) {
        User manager = userRepo.findById(managerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));
        requireManagerRole(manager);

        PolicyAssignment a = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy assignment not found: " + assignmentId));

        Set<Long> managerDeptIds = resolveManagerDepartmentIds(manager);
        List<String> deptNames = departmentRepo.findAllById(managerDeptIds).stream()
                .map(Department::getName)
                .map(String::toLowerCase)
                .toList();

        boolean inDept = false;
        if (a.getDepartmentIdSnapshot() != null && managerDeptIds.contains(a.getDepartmentIdSnapshot())) inDept = true;
        if (a.getEmployeeUser() != null && a.getEmployeeUser().getDepartment() != null) {
            if (deptNames.contains(a.getEmployeeUser().getDepartment().trim().toLowerCase())) inDept = true;
        }

        if (!inDept) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cross-department action prohibited: Assignment does not belong to your department hierarchy.");
        }

        EffectiveAcknowledgement eff = resolveEffectiveAcknowledgement(a.getPolicyVersion(), a.getEmployeeUser().getId());
        if (eff.acknowledged()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee has already acknowledged this policy.");
        }

        String docTitle = a.getPolicyDocument() != null ? a.getPolicyDocument().getTitle() : "Policy Document";
        String verNum = a.getPolicyVersion() != null ? a.getPolicyVersion().getVersionNumber() : "1.0";
        LocalDate today = LocalDate.now();
        boolean isOverdue = a.getDueDate() != null && a.getDueDate().isBefore(today);

        String notifType = isOverdue ? NotificationType.POLICY_OVERDUE : NotificationType.POLICY_DUE_SOON;
        String title = (isOverdue ? "Overdue Policy Reminder: " : "Policy Reminder: ") + docTitle;
        String message = "Your manager " + manager.getFullName() + " has sent a reminder to review and acknowledge \"" + docTitle + "\" (v" + verNum + ")." +
                (a.getDueDate() != null ? " Due date: " + a.getDueDate().toString() : " Please acknowledge at your earliest convenience.");

        notificationService.createNotificationSafely(
                a.getEmployeeUser().getId(),
                title,
                message,
                notifType,
                "HIGH",
                "POLICY",
                a.getPolicyDocument() != null ? a.getPolicyDocument().getId().toString() : "",
                "/profile#policies",
                "policy-reminder:" + a.getId() + ":" + System.currentTimeMillis(),
                null
        );

        logAudit(a.getPolicyDocument() != null ? a.getPolicyDocument().getId() : null,
                a.getPolicyVersion() != null ? a.getPolicyVersion().getId() : null,
                managerId, "POLICY_REMINDER_SENT",
                "Manager sent acknowledgement reminder to employee: " + (a.getEmployeeUser() != null ? a.getEmployeeUser().getFullName() : "Employee ID " + a.getEmployeeIdSnapshot()),
                null);
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
            if (a.getPolicyDocument() == null || a.getPolicyDocument().getDocumentStatus() != PolicyDocumentStatus.PUBLISHED) {
                continue;
            }
            PolicyAssignmentDTO dto = toAssignmentDTO(a);

            // Check acknowledgement: Support explicit acknowledgement and derived validity for MINOR versions
            EffectiveAcknowledgement eff = resolveEffectiveAcknowledgement(a.getPolicyVersion(), userId);

            if (eff.acknowledged()) {
                dto.setComplianceStatus("ACKNOWLEDGED");
                dto.setAcknowledged(true);
                dto.setIsExplicit(eff.isExplicit());
                dto.setDerivedFromVersionNumber(eff.derivedFromVersionNumber());
                dto.setAcknowledgedAt(eff.acknowledgedAt());
                dto.setAcknowledgementId(eff.acknowledgementId());
                dto.setDocumentSha256Hash(eff.sha256Hash());
            } else {
                dto.setAcknowledged(false);
                dto.setIsExplicit(false);
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
    public List<PolicyAcknowledgementDTO> getMyAcknowledgements(Long userId) {
        return acknowledgementRepo.findByEmployeeUserIdOrderByAcceptedAtDesc(userId).stream()
                .map(this::toAcknowledgementDTO)
                .toList();
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
    @Transactional
    public DownloadedDocument viewPolicyDocument(Long versionId, Long userId, String userRole) {
        PolicyVersion version = versionRepo.findById(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy version not found: " + versionId));

        verifyUserAccessToVersion(version, userId, userRole);

        DownloadedDocument doc = policyWorkDriveService.downloadPolicyPdf(version.getWorkdriveFileId());
        logAudit(version.getPolicyDocument().getId(), version.getId(), userId, "DOCUMENT_VIEWED", "Viewed document in-app", null);
        return doc;
    }

    @Override
    @Transactional
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

        // Embed employee-specific watermark into the downloaded PDF copy
        User user = userRepo.findById(userId).orElse(null);
        String employeeName = (user != null && user.getFullName() != null && !user.getFullName().isBlank())
                ? user.getFullName().trim()
                : (user != null && user.getName() != null && !user.getName().isBlank())
                    ? user.getName().trim()
                    : (user != null && user.getEmail() != null) ? user.getEmail() : "Authorized Employee";
        String employeeId = (user != null && user.getEmployeeId() != null && !user.getEmployeeId().isBlank())
                ? user.getEmployeeId().trim()
                : (user != null && user.getId() != null) ? "EMP" + user.getId() : "EMP-001";
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        String watermarkText = "CONFIDENTIAL \u2013 PROPERTY OF FAIRMACS | " + employeeName + " | " + employeeId + " | Fairmacs KMS | " + timestamp;

        byte[] watermarkedBytes = policyWatermarkService.embedWatermark(doc.content(), watermarkText);
        DownloadedDocument watermarkedDoc = new DownloadedDocument(watermarkedBytes, doc.filename(), doc.contentType());

        logAudit(version.getPolicyDocument().getId(), version.getId(), userId, "DOCUMENT_DOWNLOADED", "Downloaded document file", null);
        return watermarkedDoc;
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

        // 1. Strict authorization: Employee cannot acknowledge another employee's assignment
        if (!assignment.getEmployeeUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot acknowledge another employee's assignment");
        }

        // 2. Validate document is published and available (not draft, pending approval, or archived)
        PolicyDocument doc = assignment.getPolicyDocument();
        if (doc == null || doc.getDocumentStatus() != PolicyDocumentStatus.PUBLISHED || doc.getArchivedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Policy document is not published or has been archived");
        }

        // 3. Validate assigned version is present
        PolicyVersion version = assignment.getPolicyVersion();
        if (version == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignment has no associated policy version");
        }

        // 4. Validate employee is active (not terminated or inactive)
        User employee = assignment.getEmployeeUser();
        if (employee.getStatus() == UserStatus.TERMINATED || employee.getStatus() == UserStatus.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inactive or terminated employee cannot acknowledge policy");
        }

        // 5. Explicit confirmation check: Must be strictly true (rejects false, null, and missing req)
        if (req == null || !Boolean.TRUE.equals(req.getConfirmed())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Explicit confirmation is required to acknowledge this policy");
        }

        // 6. Idempotent duplicate check: If already acknowledged, return existing record safely
        Optional<PolicyAcknowledgement> existing = acknowledgementRepo.findByPolicyVersionIdAndEmployeeUserId(
                version.getId(),
                userId
        );
        if (existing.isPresent()) {
            return toAcknowledgementDTO(existing.get());
        }

        // 7. Append-only acknowledgement insertion
        PolicyAcknowledgement ack = new PolicyAcknowledgement();
        ack.setPolicyAssignment(assignment);
        ack.setPolicyDocument(doc);
        ack.setPolicyVersion(version);
        ack.setEmployeeUser(employee);
        ack.setEmployeeIdSnapshot(employee.getEmployeeId() != null ? employee.getEmployeeId() : "EMP-" + employee.getId());
        ack.setAuthenticatedUser(userRepo.findById(userId).orElse(employee));
        ack.setDocumentSha256Hash(version.getSha256Hash());
        ack.setAcknowledgementTextVersion(req != null && req.getComments() != null && !req.getComments().isBlank()
                ? req.getComments()
                : "Acknowledged policy " + doc.getTitle() + " (v" + version.getVersionNumber() + ")");
        ack.setRequestIp(ipAddress != null ? ipAddress : "0.0.0.0");
        ack.setUserAgent(userAgent);
        ack.setAcceptedAt(LocalDateTime.now());

        ack = acknowledgementRepo.save(ack);

        logAudit(doc.getId(), version.getId(), userId, "POLICY_ACKNOWLEDGED",
                "Acknowledged policy version " + version.getVersionNumber(), ipAddress);

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
            boolean acked = isCompliantInternal(
                    a.getPolicyVersion(),
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

    @Override
    @Transactional(readOnly = true)
    public PolicyOrgOverviewDTO getOrganizationOverview() {
        PolicyOrgOverviewDTO overview = new PolicyOrgOverviewDTO();
        List<PolicyDocument> allDocs = documentRepo.findAll();

        long published = 0;
        long policies = 0;
        long agreements = 0;
        long drafts = 0;
        long archived = 0;

        for (PolicyDocument doc : allDocs) {
            if (doc.getDocumentStatus() == PolicyDocumentStatus.PUBLISHED) {
                published++;
                if (doc.getCategory() != null && doc.getCategory().getName() != null && doc.getCategory().getName().toLowerCase().contains("agreement")) {
                    agreements++;
                } else {
                    policies++;
                }
            } else if (doc.getDocumentStatus() == PolicyDocumentStatus.DRAFT) {
                drafts++;
            } else if (doc.getDocumentStatus() == PolicyDocumentStatus.ARCHIVED) {
                archived++;
            }
        }

        overview.setTotalPublished(published);
        overview.setTotalPolicies(policies);
        overview.setTotalAgreements(agreements);
        overview.setTotalDrafts(drafts);
        overview.setTotalArchived(archived);

        long pendingApprovals = documentRepo.findByApprovalStatusOrderBySubmittedAtDesc(PolicyApprovalStatus.PENDING).size();
        overview.setPendingApprovals(pendingApprovals);

        // Assignments overview across all published policies
        List<PolicyAssignment> allAssignments = assignmentRepo.findAll();
        LocalDate today = LocalDate.now();
        long totalAssigned = 0;
        long totalAcknowledged = 0;
        long totalOverdue = 0;
        long totalPending = 0;
        long totalMandatoryAssigned = 0;
        long totalMandatoryAcknowledged = 0;
        long totalOptionalAssigned = 0;
        long totalOptionalAcknowledged = 0;
        Set<Long> empWithOutstandingMandatory = new HashSet<>();

        Map<String, long[]> deptMap = new LinkedHashMap<>(); // [assigned, acked, overdue, pending]

        for (PolicyAssignment a : allAssignments) {
            if (a.getAssignmentStatus() != PolicyAssignmentStatus.ACTIVE) continue;
            if (a.getPolicyDocument() == null || a.getPolicyDocument().getDocumentStatus() != PolicyDocumentStatus.PUBLISHED) continue;

            totalAssigned++;
            boolean acked = isCompliantInternal(a.getPolicyVersion(), a.getEmployeeUser().getId());
            boolean overdue = !acked && a.getDueDate() != null && a.getDueDate().isBefore(today);

            if (acked) {
                totalAcknowledged++;
            } else if (overdue) {
                totalOverdue++;
            } else {
                totalPending++;
            }

            boolean isMandatory = Boolean.TRUE.equals(a.getMandatory());
            if (isMandatory) {
                totalMandatoryAssigned++;
                if (acked) {
                    totalMandatoryAcknowledged++;
                } else if (a.getEmployeeUser() != null) {
                    empWithOutstandingMandatory.add(a.getEmployeeUser().getId());
                }
            } else {
                totalOptionalAssigned++;
                if (acked) {
                    totalOptionalAcknowledged++;
                }
            }

            String deptName = a.getDepartmentNameSnapshot();
            if (deptName == null || deptName.isBlank()) {
                deptName = a.getEmployeeUser() != null ? a.getEmployeeUser().getDepartment() : "General";
            }
            if (deptName == null || deptName.isBlank()) deptName = "Unassigned";

            long[] stats = deptMap.computeIfAbsent(deptName, k -> new long[4]);
            stats[0]++; // assigned
            if (acked) stats[1]++; // acked
            else if (overdue) stats[2]++; // overdue
            else stats[3]++; // pending
        }

        long totalActiveEmployees = userRepo.findAll().stream()
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .count();

        overview.setTotalActiveEmployees(totalActiveEmployees);
        overview.setTotalMandatoryAssigned(totalMandatoryAssigned);
        overview.setTotalMandatoryAcknowledged(totalMandatoryAcknowledged);
        overview.setMandatoryCompliancePercentage(totalMandatoryAssigned > 0 ? (double) Math.round((double) totalMandatoryAcknowledged / totalMandatoryAssigned * 1000.0) / 10.0 : 0.0);
        overview.setTotalOptionalAssigned(totalOptionalAssigned);
        overview.setTotalOptionalAcknowledged(totalOptionalAcknowledged);
        overview.setOptionalCompliancePercentage(totalOptionalAssigned > 0 ? (double) Math.round((double) totalOptionalAcknowledged / totalOptionalAssigned * 1000.0) / 10.0 : 0.0);
        overview.setEmployeesWithOutstandingMandatory((long) empWithOutstandingMandatory.size());

        overview.setTotalAssigned(totalAssigned);
        overview.setTotalAcknowledged(totalAcknowledged);
        overview.setTotalOverdue(totalOverdue);
        overview.setTotalPending(totalPending);
        overview.setCompletionPercentage(totalAssigned > 0 ? Math.round((double) totalAcknowledged / totalAssigned * 1000.0) / 10.0 : 0.0);

        List<PolicyComplianceSummaryDTO.DepartmentComplianceDTO> deptList = new ArrayList<>();
        for (Map.Entry<String, long[]> e : deptMap.entrySet()) {
            long a = e.getValue()[0];
            long ack = e.getValue()[1];
            long ovd = e.getValue()[2];
            long pnd = e.getValue()[3];
            double pct = a > 0 ? Math.round((double) ack / a * 1000.0) / 10.0 : 0.0;
            deptList.add(new PolicyComplianceSummaryDTO.DepartmentComplianceDTO(null, e.getKey(), a, ack, pnd, ovd, pct));
        }
        overview.setDepartmentBreakdowns(deptList);

        // Recently published (up to 5)
        List<PolicyDocumentDTO> recentPub = allDocs.stream()
                .filter(d -> d.getDocumentStatus() == PolicyDocumentStatus.PUBLISHED)
                .sorted((d1, d2) -> {
                    LocalDateTime t1 = d1.getPublishedAt() != null ? d1.getPublishedAt() : d1.getCreatedAt();
                    LocalDateTime t2 = d2.getPublishedAt() != null ? d2.getPublishedAt() : d2.getCreatedAt();
                    if (t1 == null && t2 == null) return 0;
                    if (t1 == null) return 1;
                    if (t2 == null) return -1;
                    return t2.compareTo(t1);
                })
                .limit(5)
                .map(this::toDocumentDTO)
                .toList();
        overview.setRecentlyPublished(recentPub);

        // Recent manager submissions (up to 5)
        List<PolicyDocumentDTO> recentSubs = documentRepo.findByApprovalStatusOrderBySubmittedAtDesc(PolicyApprovalStatus.PENDING).stream()
                .limit(5)
                .map(this::toDocumentDTO)
                .toList();
        overview.setRecentSubmissions(recentSubs);

        // Documents requiring attention (published docs with overdue > 0 or completion < 50%)
        List<PolicyDocumentDTO> reqAttention = new ArrayList<>();
        for (PolicyDocument d : allDocs) {
            if (d.getDocumentStatus() != PolicyDocumentStatus.PUBLISHED) continue;
            PolicyComplianceSummaryDTO comp = getPolicyComplianceSummary(d.getId(), 0L, "HR_ADMIN");
            if (comp.getTotalOverdue() > 0 || (comp.getTotalAssigned() > 0 && comp.getCompliancePercentage() < 50.0)) {
                PolicyDocumentDTO dto = toDocumentDTO(d);
                dto.setTotalAssignments(comp.getTotalAssigned());
                dto.setTotalAcknowledgements(comp.getTotalAcknowledged());
                dto.setCompliancePercentage(comp.getCompliancePercentage());
                reqAttention.add(dto);
            }
        }
        overview.setDocumentsRequiringAttention(reqAttention);

        return overview;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyAssignmentDTO> getAllPolicyAssignments(Long policyId, Long departmentId, String status) {
        List<PolicyAssignment> assignments;
        if (policyId != null) {
            assignments = assignmentRepo.findByPolicyDocumentId(policyId);
        } else {
            assignments = assignmentRepo.findAll();
        }

        LocalDate today = LocalDate.now();
        List<PolicyAssignmentDTO> dtoList = new ArrayList<>();

        for (PolicyAssignment a : assignments) {
            if (a.getAssignmentStatus() != PolicyAssignmentStatus.ACTIVE) continue;
            if (departmentId != null && (a.getDepartmentIdSnapshot() == null || !a.getDepartmentIdSnapshot().equals(departmentId))) {
                continue;
            }

            PolicyAssignmentDTO dto = toAssignmentDTO(a);

            // Compute compliance using EffectiveAcknowledgement
            EffectiveAcknowledgement eff = resolveEffectiveAcknowledgement(a.getPolicyVersion(), a.getEmployeeUser().getId());
            if (eff.acknowledged()) {
                dto.setComplianceStatus("ACKNOWLEDGED");
                dto.setAcknowledged(true);
                dto.setIsExplicit(eff.isExplicit());
                dto.setDerivedFromVersionNumber(eff.derivedFromVersionNumber());
                dto.setAcknowledgedAt(eff.acknowledgedAt());
                dto.setAcknowledgementId(eff.acknowledgementId());
                dto.setDocumentSha256Hash(eff.sha256Hash());
            } else if (a.getDueDate() != null && a.getDueDate().isBefore(today)) {
                dto.setComplianceStatus("OVERDUE");
                dto.setAcknowledged(false);
                dto.setIsExplicit(false);
            } else {
                dto.setComplianceStatus("PENDING");
                dto.setAcknowledged(false);
                dto.setIsExplicit(false);
            }

            // Filter by status if requested
            if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                if (!dto.getComplianceStatus().equalsIgnoreCase(status.trim())) {
                    continue;
                }
            }

            dtoList.add(dto);
        }

        return dtoList;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportAssignmentsToExcel(Long policyId, Long departmentId, String status) {
        List<PolicyAssignmentDTO> list = getAllPolicyAssignments(policyId, departmentId, status);
        return buildAssignmentsExcel(list, "Policy Acknowledgements");
    }

    private byte[] buildAssignmentsExcel(List<PolicyAssignmentDTO> list, String sheetName) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);

            // Header style
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Columns
            String[] headers = {
                    "Employee ID", "Employee Name", "Department",
                    "Document Code", "Document Title", "Category",
                    "Version", "Assigned Date", "Due Date",
                    "Compliance Status", "Acknowledgement Type", "Acknowledged At",
                    "Document SHA-256 Hash"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (PolicyAssignmentDTO dto : list) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(dto.getEmployeeId() != null ? dto.getEmployeeId() : "");
                row.createCell(1).setCellValue(dto.getEmployeeName() != null ? dto.getEmployeeName() : "");
                row.createCell(2).setCellValue(dto.getDepartment() != null ? dto.getDepartment() : "");
                row.createCell(3).setCellValue(dto.getDocumentCode() != null ? dto.getDocumentCode() : "");
                row.createCell(4).setCellValue(dto.getTitle() != null ? dto.getTitle() : "");
                row.createCell(5).setCellValue(dto.getCategoryName() != null ? dto.getCategoryName() : "");
                row.createCell(6).setCellValue(dto.getVersionNumber() != null ? "v" + dto.getVersionNumber() : "");
                row.createCell(7).setCellValue(dto.getAssignedAt() != null ? dto.getAssignedAt().toLocalDate().toString() : "");
                row.createCell(8).setCellValue(dto.getDueDate() != null ? dto.getDueDate().toString() : "Open-ended");
                row.createCell(9).setCellValue(dto.getComplianceStatus() != null ? dto.getComplianceStatus() : "PENDING");

                String ackType = "-";
                if ("ACKNOWLEDGED".equalsIgnoreCase(dto.getComplianceStatus())) {
                    ackType = Boolean.TRUE.equals(dto.getIsExplicit()) ? "Explicit Acceptance" : "Derived (v" + dto.getDerivedFromVersionNumber() + ")";
                }
                row.createCell(10).setCellValue(ackType);
                row.createCell(11).setCellValue(dto.getAcknowledgedAt() != null ? dto.getAcknowledgedAt().toString() : "-");
                row.createCell(12).setCellValue(dto.getDocumentSha256Hash() != null ? dto.getDocumentSha256Hash() : "-");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to generate assignments Excel report: {}", ex.getMessage(), ex);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to export report: " + ex.getMessage());
        }
    }

    // ==========================================
    // STAGE 8: COMPLIANCE REPORTING & TRACKING IMPLEMENTATION
    // ==========================================

    @Override
    @Transactional(readOnly = true)
    public List<PolicyDepartmentReportDTO> getDepartmentComplianceReports(Long managerId, String userRole) {
        boolean isHrAdmin = "HR_ADMIN".equalsIgnoreCase(userRole) || "SUPER_ADMIN".equalsIgnoreCase(userRole);
        Set<Long> allowedDeptIds = null;
        List<String> allowedDeptNames = null;

        if (!isHrAdmin) {
            User manager = userRepo.findById(managerId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));
            requireManagerRole(manager);
            allowedDeptIds = resolveManagerDepartmentIds(manager);
            allowedDeptNames = departmentRepo.findAllById(allowedDeptIds).stream()
                    .map(Department::getName)
                    .map(String::toLowerCase)
                    .toList();
        }

        List<Department> departments = departmentRepo.findAll();
        List<PolicyAssignment> allAssignments = assignmentRepo.findAll();
        List<User> allUsers = userRepo.findAll();
        LocalDate today = LocalDate.now();

        List<PolicyDepartmentReportDTO> reports = new ArrayList<>();

        for (Department dept : departments) {
            if (!isHrAdmin) {
                if (allowedDeptIds == null || !allowedDeptIds.contains(dept.getId())) {
                    continue; // Strict department hierarchy scoping
                }
            }

            long eligibleEmployees = allUsers.stream()
                    .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                    .filter(u -> u.getDepartment() != null && u.getDepartment().trim().equalsIgnoreCase(dept.getName()))
                    .count();

            List<PolicyAssignment> deptAssignments = allAssignments.stream()
                    .filter(a -> a.getAssignmentStatus() == PolicyAssignmentStatus.ACTIVE)
                    .filter(a -> a.getPolicyDocument() != null && a.getPolicyDocument().getDocumentStatus() == PolicyDocumentStatus.PUBLISHED)
                    .filter(a -> {
                        if (dept.getId().equals(a.getDepartmentIdSnapshot())) return true;
                        if (a.getEmployeeUser() != null && a.getEmployeeUser().getDepartment() != null) {
                            return a.getEmployeeUser().getDepartment().trim().equalsIgnoreCase(dept.getName());
                        }
                        return false;
                    })
                    .toList();

            long totalAssigned = deptAssignments.size();
            long totalAcked = 0;
            long totalPending = 0;
            long totalOverdue = 0;
            long mandatoryAssigned = 0;
            long mandatoryAcked = 0;

            for (PolicyAssignment a : deptAssignments) {
                boolean acked = isCompliantInternal(a.getPolicyVersion(), a.getEmployeeUser().getId());
                boolean overdue = !acked && a.getDueDate() != null && a.getDueDate().isBefore(today);

                if (acked) {
                    totalAcked++;
                } else if (overdue) {
                    totalOverdue++;
                } else {
                    totalPending++;
                }

                boolean isMandatory = Boolean.TRUE.equals(a.getMandatory());
                if (isMandatory) {
                    mandatoryAssigned++;
                    if (acked) mandatoryAcked++;
                }
            }

            double compliancePct = totalAssigned > 0 ? (double) Math.round((double) totalAcked / totalAssigned * 1000.0) / 10.0 : 0.0;
            double mandatoryPct = mandatoryAssigned > 0 ? (double) Math.round((double) mandatoryAcked / mandatoryAssigned * 1000.0) / 10.0 : 0.0;

            PolicyDepartmentReportDTO dto = new PolicyDepartmentReportDTO(
                    dept.getId(),
                    dept.getName(),
                    eligibleEmployees,
                    totalAssigned,
                    totalAcked,
                    totalPending,
                    totalOverdue,
                    compliancePct,
                    mandatoryPct
            );
            dto.setMandatoryAssigned(mandatoryAssigned);
            dto.setMandatoryAcknowledged(mandatoryAcked);
            reports.add(dto);
        }

        reports.sort(Comparator.comparing(PolicyDepartmentReportDTO::getTotalAssigned, Comparator.reverseOrder())
                .thenComparing(PolicyDepartmentReportDTO::getDepartmentName, String.CASE_INSENSITIVE_ORDER));
        return reports;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyDocumentReportDTO> getDocumentComplianceReports(Long managerId, String userRole, String category, Boolean mandatory, String status) {
        boolean isHrAdmin = "HR_ADMIN".equalsIgnoreCase(userRole) || "SUPER_ADMIN".equalsIgnoreCase(userRole);
        Set<Long> allowedDeptIds = null;
        List<String> allowedDeptNames = null;

        if (!isHrAdmin) {
            User manager = userRepo.findById(managerId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));
            requireManagerRole(manager);
            allowedDeptIds = resolveManagerDepartmentIds(manager);
            allowedDeptNames = departmentRepo.findAllById(allowedDeptIds).stream()
                    .map(Department::getName)
                    .map(String::toLowerCase)
                    .toList();
        }

        List<PolicyDocument> allDocs = documentRepo.findAll();
        List<PolicyAssignment> allAssignments = assignmentRepo.findAll();
        LocalDate today = LocalDate.now();

        List<PolicyDocumentReportDTO> reports = new ArrayList<>();

        for (PolicyDocument doc : allDocs) {
            if (doc.getDocumentStatus() != PolicyDocumentStatus.PUBLISHED) {
                continue; // Only published policies count
            }

            if (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL")) {
                if (doc.getCategory() == null || !doc.getCategory().getName().equalsIgnoreCase(category.trim())) {
                    continue;
                }
            }

            final Set<Long> fDeptIds = allowedDeptIds;
            final List<String> fDeptNames = allowedDeptNames;

            List<PolicyAssignment> docAssignments = allAssignments.stream()
                    .filter(a -> a.getAssignmentStatus() == PolicyAssignmentStatus.ACTIVE)
                    .filter(a -> a.getPolicyDocument() != null && a.getPolicyDocument().getId().equals(doc.getId()))
                    .filter(a -> {
                        if (isHrAdmin) return true;
                        if (a.getDepartmentIdSnapshot() != null && fDeptIds.contains(a.getDepartmentIdSnapshot())) return true;
                        if (a.getEmployeeUser() != null && a.getEmployeeUser().getDepartment() != null) {
                            return fDeptNames.contains(a.getEmployeeUser().getDepartment().trim().toLowerCase());
                        }
                        return false;
                    })
                    .toList();

            if (!isHrAdmin && docAssignments.isEmpty()) {
                continue;
            }

            long totalAssigned = docAssignments.size();
            long totalAcked = 0;
            long totalPending = 0;
            long totalOverdue = 0;
            Boolean docMandatory = null;
            LocalDate defaultDueDate = null;

            for (PolicyAssignment a : docAssignments) {
                if (docMandatory == null && a.getMandatory() != null) {
                    docMandatory = a.getMandatory();
                }
                if (defaultDueDate == null && a.getDueDate() != null) {
                    defaultDueDate = a.getDueDate();
                }

                boolean acked = isCompliantInternal(a.getPolicyVersion(), a.getEmployeeUser().getId());
                boolean overdue = !acked && a.getDueDate() != null && a.getDueDate().isBefore(today);

                if (acked) totalAcked++;
                else if (overdue) totalOverdue++;
                else totalPending++;
            }

            if (docMandatory == null) docMandatory = true;

            if (mandatory != null && !mandatory.equals(docMandatory)) {
                continue;
            }

            double compliancePct = totalAssigned > 0 ? (double) Math.round((double) totalAcked / totalAssigned * 1000.0) / 10.0 : 0.0;

            if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                if (status.equalsIgnoreCase("OVERDUE") && totalOverdue == 0) continue;
                if (status.equalsIgnoreCase("PENDING") && totalPending == 0) continue;
                if (status.equalsIgnoreCase("COMPLIANT") && compliancePct < 100.0) continue;
                if (status.equalsIgnoreCase("LOW_COMPLIANCE") && compliancePct >= 50.0) continue;
            }

            PolicyDocumentReportDTO dto = new PolicyDocumentReportDTO();
            dto.setDocumentId(doc.getId());
            dto.setDocumentCode(doc.getDocumentCode());
            dto.setTitle(doc.getTitle());
            dto.setCategoryId(doc.getCategory() != null ? doc.getCategory().getId() : null);
            dto.setCategoryName(doc.getCategory() != null ? doc.getCategory().getName() : "General");
            PolicyVersion latestVer = versionRepo.findFirstByPolicyDocumentIdOrderByCreatedAtDesc(doc.getId()).orElse(null);
            dto.setCurrentVersionNumber(latestVer != null ? latestVer.getVersionNumber() : "1.0");
            dto.setMandatory(docMandatory);
            dto.setTotalAssigned(totalAssigned);
            dto.setTotalAcknowledged(totalAcked);
            dto.setTotalPending(totalPending);
            dto.setTotalOverdue(totalOverdue);
            dto.setCompliancePercentage(compliancePct);
            dto.setDefaultDueDate(defaultDueDate);
            dto.setPublishedAt(doc.getPublishedAt() != null ? doc.getPublishedAt() : doc.getCreatedAt());
            dto.setDocumentStatus(doc.getDocumentStatus().name());

            reports.add(dto);
        }

        reports.sort(Comparator.comparing(PolicyDocumentReportDTO::getTotalAssigned, Comparator.reverseOrder())
                .thenComparing(PolicyDocumentReportDTO::getTitle, String.CASE_INSENSITIVE_ORDER));
        return reports;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PolicyEmployeeReportDTO> getEmployeeComplianceReports(Long managerId, String userRole, Long departmentId, String complianceStatus, String userStatus, String search) {
        boolean isHrAdmin = "HR_ADMIN".equalsIgnoreCase(userRole) || "SUPER_ADMIN".equalsIgnoreCase(userRole);
        Set<Long> allowedDeptIds = null;
        List<String> allowedDeptNames = null;

        if (!isHrAdmin) {
            User manager = userRepo.findById(managerId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));
            requireManagerRole(manager);
            allowedDeptIds = resolveManagerDepartmentIds(manager);
            allowedDeptNames = departmentRepo.findAllById(allowedDeptIds).stream()
                    .map(Department::getName)
                    .map(String::toLowerCase)
                    .toList();
        }

        List<User> allUsers = userRepo.findAll();
        List<PolicyAssignment> allAssignments = assignmentRepo.findAll();
        LocalDate today = LocalDate.now();

        List<PolicyEmployeeReportDTO> reports = new ArrayList<>();

        for (User user : allUsers) {
            if (!isHrAdmin) {
                if (user.getDepartment() == null || !allowedDeptNames.contains(user.getDepartment().trim().toLowerCase())) {
                    continue; // Skip employees outside manager's hierarchy
                }
            }

            if (departmentId != null) {
                Department dept = departmentRepo.findById(departmentId).orElse(null);
                if (dept != null && (user.getDepartment() == null || !user.getDepartment().trim().equalsIgnoreCase(dept.getName()))) {
                    continue;
                }
            }

            if (userStatus != null && !userStatus.isBlank() && !userStatus.equalsIgnoreCase("ALL")) {
                if (user.getStatus() == null || !user.getStatus().name().equalsIgnoreCase(userStatus.trim())) {
                    continue;
                }
            } else {
                if (user.getStatus() == UserStatus.TERMINATED) {
                    continue;
                }
            }

            if (search != null && !search.isBlank()) {
                String term = search.trim().toLowerCase();
                boolean matchName = user.getFullName() != null && user.getFullName().toLowerCase().contains(term);
                boolean matchId = user.getEmployeeId() != null && user.getEmployeeId().toLowerCase().contains(term);
                if (!matchName && !matchId) {
                    continue;
                }
            }

            List<PolicyAssignment> empAssignments = allAssignments.stream()
                    .filter(a -> a.getAssignmentStatus() == PolicyAssignmentStatus.ACTIVE)
                    .filter(a -> a.getPolicyDocument() != null && a.getPolicyDocument().getDocumentStatus() == PolicyDocumentStatus.PUBLISHED)
                    .filter(a -> a.getEmployeeUser() != null && a.getEmployeeUser().getId().equals(user.getId()))
                    .toList();

            long totalAssigned = empAssignments.size();
            long totalAcked = 0;
            long totalPending = 0;
            long totalOverdue = 0;
            long mandatoryPending = 0;

            for (PolicyAssignment a : empAssignments) {
                boolean acked = isCompliantInternal(a.getPolicyVersion(), user.getId());
                boolean overdue = !acked && a.getDueDate() != null && a.getDueDate().isBefore(today);

                if (acked) {
                    totalAcked++;
                } else if (overdue) {
                    totalOverdue++;
                } else {
                    totalPending++;
                }

                boolean isMandatory = Boolean.TRUE.equals(a.getMandatory());
                if (isMandatory && !acked) {
                    mandatoryPending++;
                }
            }

            double compliancePct = totalAssigned > 0 ? (double) Math.round((double) totalAcked / totalAssigned * 1000.0) / 10.0 : 100.0;
            String overallStatus;
            if (totalOverdue > 0) overallStatus = "OVERDUE";
            else if (totalPending > 0) overallStatus = "PENDING";
            else overallStatus = "COMPLIANT";

            if (complianceStatus != null && !complianceStatus.isBlank() && !complianceStatus.equalsIgnoreCase("ALL")) {
                if (!complianceStatus.equalsIgnoreCase(overallStatus)) {
                    continue;
                }
            }

            PolicyEmployeeReportDTO dto = new PolicyEmployeeReportDTO();
            dto.setEmployeeId(user.getId());
            dto.setEmployeeCode(user.getEmployeeId());
            dto.setFullName(user.getFullName());
            dto.setDepartment(user.getDepartment());
            dto.setDesignation(user.getDesignation());
            dto.setUserStatus(user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
            dto.setTotalAssigned(totalAssigned);
            dto.setTotalAcknowledged(totalAcked);
            dto.setTotalPending(totalPending);
            dto.setTotalOverdue(totalOverdue);
            dto.setCompliancePercentage(compliancePct);
            dto.setMandatoryPendingCount(mandatoryPending);
            dto.setOverallComplianceStatus(overallStatus);

            reports.add(dto);
        }

        reports.sort(Comparator.comparing(PolicyEmployeeReportDTO::getTotalOverdue, Comparator.reverseOrder())
                .thenComparing(PolicyEmployeeReportDTO::getTotalPending, Comparator.reverseOrder())
                .thenComparing(PolicyEmployeeReportDTO::getEmployeeCode, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));

        return reports;
    }

    @Override
    @Transactional(readOnly = true)
    public PolicyEmployeeHistoryDTO getEmployeeAcknowledgementHistory(Long employeeId, Long requesterUserId, String requesterRole) {
        User targetEmployee = userRepo.findById(employeeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found: " + employeeId));

        boolean isHrAdmin = "HR_ADMIN".equalsIgnoreCase(requesterRole) || "SUPER_ADMIN".equalsIgnoreCase(requesterRole);
        boolean isSelf = requesterUserId.equals(employeeId);

        if (!isHrAdmin && !isSelf) {
            if (!"MANAGER".equalsIgnoreCase(requesterRole)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You do not have permission to view this employee's policy history.");
            }
            User manager = userRepo.findById(requesterUserId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + requesterUserId));
            Set<Long> managerDeptIds = resolveManagerDepartmentIds(manager);
            List<String> allowedDeptNames = departmentRepo.findAllById(managerDeptIds).stream()
                    .map(Department::getName)
                    .map(String::toLowerCase)
                    .toList();

            if (targetEmployee.getDepartment() == null || !allowedDeptNames.contains(targetEmployee.getDepartment().trim().toLowerCase())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Employee does not belong to your authorized department hierarchy.");
            }
        }

        List<PolicyAssignment> allAssignments = assignmentRepo.findByEmployeeUserId(employeeId);
        LocalDate today = LocalDate.now();

        PolicyEmployeeHistoryDTO history = new PolicyEmployeeHistoryDTO();
        history.setEmployeeId(targetEmployee.getId());
        history.setEmployeeCode(targetEmployee.getEmployeeId());
        history.setFullName(targetEmployee.getFullName());
        history.setDepartment(targetEmployee.getDepartment());
        history.setDesignation(targetEmployee.getDesignation());

        long totalAssigned = 0;
        long totalAcked = 0;
        long totalPending = 0;
        long totalOverdue = 0;

        List<PolicyEmployeeHistoryItemDTO> items = new ArrayList<>();

        for (PolicyAssignment a : allAssignments) {
            if (a.getAssignmentStatus() != PolicyAssignmentStatus.ACTIVE) continue;
            if (a.getPolicyDocument() == null || a.getPolicyDocument().getDocumentStatus() != PolicyDocumentStatus.PUBLISHED) continue;

            totalAssigned++;
            EffectiveAcknowledgement eff = resolveEffectiveAcknowledgement(a.getPolicyVersion(), employeeId);

            boolean acked = eff.acknowledged();
            boolean overdue = !acked && a.getDueDate() != null && a.getDueDate().isBefore(today);

            String statusStr;
            if (acked) {
                totalAcked++;
                statusStr = "ACKNOWLEDGED";
            } else if (overdue) {
                totalOverdue++;
                statusStr = "OVERDUE";
            } else {
                totalPending++;
                statusStr = "PENDING";
            }

            PolicyEmployeeHistoryItemDTO item = new PolicyEmployeeHistoryItemDTO();
            item.setAssignmentId(a.getId());
            item.setDocumentId(a.getPolicyDocument().getId());
            item.setDocumentCode(a.getPolicyDocument().getDocumentCode());
            item.setDocumentTitle(a.getPolicyDocument().getTitle());
            item.setCategoryName(a.getPolicyDocument().getCategory() != null ? a.getPolicyDocument().getCategory().getName() : "General");
            item.setVersionNumber(a.getPolicyVersion() != null ? a.getPolicyVersion().getVersionNumber() : "1.0");
            item.setVersionType(a.getPolicyVersion() != null && a.getPolicyVersion().getVersionType() != null ? a.getPolicyVersion().getVersionType().name() : "MAJOR");
            item.setMandatory(Boolean.TRUE.equals(a.getMandatory()));
            item.setAssignedAt(a.getAssignedAt() != null ? a.getAssignedAt() : (a.getDueDate() != null ? a.getDueDate().atStartOfDay() : null));
            item.setDueDate(a.getDueDate());
            item.setComplianceStatus(statusStr);

            if (acked) {
                item.setAcknowledgementId(eff.acknowledgementId());
                item.setAcknowledgedAt(eff.acknowledgedAt());
                item.setIsDerived(!eff.isExplicit());
                item.setDerivedFromVersionNumber(eff.derivedFromVersionNumber());
                item.setDocumentSha256Hash(eff.sha256Hash());
                if (eff.acknowledgementId() != null) {
                    try {
                        Optional<PolicyAcknowledgement> ackOpt = acknowledgementRepo.findById(eff.acknowledgementId());
                        if (ackOpt != null && ackOpt.isPresent()) {
                            item.setIpAddress(ackOpt.get().getIpAddress());
                        }
                    } catch (Exception ignored) {
                        // graceful fallback if repository returns null or throws in mock tests
                    }
                }
            }

            items.add(item);
        }

        items.sort(Comparator.comparing(PolicyEmployeeHistoryItemDTO::getComplianceStatus, (s1, s2) -> {
            int p1 = "OVERDUE".equals(s1) ? 1 : ("PENDING".equals(s1) ? 2 : 3);
            int p2 = "OVERDUE".equals(s2) ? 1 : ("PENDING".equals(s2) ? 2 : 3);
            return Integer.compare(p1, p2);
        }).thenComparing(PolicyEmployeeHistoryItemDTO::getAssignedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        history.setTotalAssigned(totalAssigned);
        history.setTotalAcknowledged(totalAcked);
        history.setTotalPending(totalPending);
        history.setTotalOverdue(totalOverdue);
        history.setCompliancePercentage(totalAssigned > 0 ? (double) Math.round((double) totalAcked / totalAssigned * 1000.0) / 10.0 : 100.0);
        history.setHistoryItems(items);

        return history;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportComplianceReportToExcel(String reportType, Long managerId, String userRole, Long departmentId, Long policyId, String status) {
        String type = reportType != null ? reportType.toUpperCase().trim() : "ASSIGNMENTS";
        switch (type) {
            case "DEPARTMENTS": {
                List<PolicyDepartmentReportDTO> depts = getDepartmentComplianceReports(managerId, userRole);
                return buildDepartmentReportExcel(depts);
            }
            case "DOCUMENTS": {
                List<PolicyDocumentReportDTO> docs = getDocumentComplianceReports(managerId, userRole, null, null, status);
                return buildDocumentReportExcel(docs);
            }
            case "EMPLOYEES": {
                List<PolicyEmployeeReportDTO> emps = getEmployeeComplianceReports(managerId, userRole, departmentId, status, null, null);
                return buildEmployeeReportExcel(emps);
            }
            case "ASSIGNMENTS":
            default: {
                boolean isHrAdmin = "HR_ADMIN".equalsIgnoreCase(userRole) || "SUPER_ADMIN".equalsIgnoreCase(userRole);
                List<PolicyAssignmentDTO> assignments;
                if (isHrAdmin) {
                    assignments = getAllPolicyAssignments(policyId, departmentId, status);
                } else {
                    assignments = getDepartmentPolicyAssignments(managerId, policyId, departmentId, status);
                }
                return buildAssignmentsExcel(assignments, isHrAdmin ? "Policy Acknowledgements" : "Department Compliance Report");
            }
        }
    }

    private byte[] buildDepartmentReportExcel(List<PolicyDepartmentReportDTO> list) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Department Compliance");

            CellStyle headerStyle = createExcelHeaderStyle(workbook);
            String[] headers = {
                    "Department Name", "Eligible Employees", "Total Assigned", "Acknowledged",
                    "Pending", "Overdue", "Compliance Rate (%)", "Mandatory Compliance (%)"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (PolicyDepartmentReportDTO d : list) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(d.getDepartmentName() != null ? d.getDepartmentName() : "");
                row.createCell(1).setCellValue(d.getTotalEligibleEmployees() != null ? d.getTotalEligibleEmployees() : 0L);
                row.createCell(2).setCellValue(d.getTotalAssigned() != null ? d.getTotalAssigned() : 0L);
                row.createCell(3).setCellValue(d.getTotalAcknowledged() != null ? d.getTotalAcknowledged() : 0L);
                row.createCell(4).setCellValue(d.getTotalPending() != null ? d.getTotalPending() : 0L);
                row.createCell(5).setCellValue(d.getTotalOverdue() != null ? d.getTotalOverdue() : 0L);
                row.createCell(6).setCellValue(d.getCompliancePercentage() != null ? d.getCompliancePercentage() : 0.0);
                row.createCell(7).setCellValue(d.getMandatoryCompliancePercentage() != null ? d.getMandatoryCompliancePercentage() : 0.0);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to export Department Excel: {}", ex.getMessage(), ex);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Export failed: " + ex.getMessage());
        }
    }

    private byte[] buildDocumentReportExcel(List<PolicyDocumentReportDTO> list) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Document Compliance");

            CellStyle headerStyle = createExcelHeaderStyle(workbook);
            String[] headers = {
                    "Document Code", "Document Title", "Category", "Version", "Mandatory",
                    "Total Assigned", "Acknowledged", "Pending", "Overdue",
                    "Compliance Rate (%)", "Default Due Date", "Published Date", "Status"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (PolicyDocumentReportDTO d : list) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(d.getDocumentCode() != null ? d.getDocumentCode() : "");
                row.createCell(1).setCellValue(d.getTitle() != null ? d.getTitle() : "");
                row.createCell(2).setCellValue(d.getCategoryName() != null ? d.getCategoryName() : "");
                row.createCell(3).setCellValue(d.getCurrentVersionNumber() != null ? "v" + d.getCurrentVersionNumber() : "");
                row.createCell(4).setCellValue(Boolean.TRUE.equals(d.getMandatory()) ? "Yes" : "No");
                row.createCell(5).setCellValue(d.getTotalAssigned() != null ? d.getTotalAssigned() : 0L);
                row.createCell(6).setCellValue(d.getTotalAcknowledged() != null ? d.getTotalAcknowledged() : 0L);
                row.createCell(7).setCellValue(d.getTotalPending() != null ? d.getTotalPending() : 0L);
                row.createCell(8).setCellValue(d.getTotalOverdue() != null ? d.getTotalOverdue() : 0L);
                row.createCell(9).setCellValue(d.getCompliancePercentage() != null ? d.getCompliancePercentage() : 0.0);
                row.createCell(10).setCellValue(d.getDefaultDueDate() != null ? d.getDefaultDueDate().toString() : "None");
                row.createCell(11).setCellValue(d.getPublishedAt() != null ? d.getPublishedAt().toLocalDate().toString() : "");
                row.createCell(12).setCellValue(d.getDocumentStatus() != null ? d.getDocumentStatus() : "PUBLISHED");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to export Document Excel: {}", ex.getMessage(), ex);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Export failed: " + ex.getMessage());
        }
    }

    private byte[] buildEmployeeReportExcel(List<PolicyEmployeeReportDTO> list) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Employee Compliance");

            CellStyle headerStyle = createExcelHeaderStyle(workbook);
            String[] headers = {
                    "Employee ID", "Employee Name", "Department", "Designation", "Employment Status",
                    "Assigned Policies", "Acknowledged", "Pending", "Overdue",
                    "Mandatory Pending", "Compliance Rate (%)", "Overall Status"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (PolicyEmployeeReportDTO e : list) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(e.getEmployeeCode() != null ? e.getEmployeeCode() : "");
                row.createCell(1).setCellValue(e.getFullName() != null ? e.getFullName() : "");
                row.createCell(2).setCellValue(e.getDepartment() != null ? e.getDepartment() : "");
                row.createCell(3).setCellValue(e.getDesignation() != null ? e.getDesignation() : "");
                row.createCell(4).setCellValue(e.getUserStatus() != null ? e.getUserStatus() : "ACTIVE");
                row.createCell(5).setCellValue(e.getTotalAssigned() != null ? e.getTotalAssigned() : 0L);
                row.createCell(6).setCellValue(e.getTotalAcknowledged() != null ? e.getTotalAcknowledged() : 0L);
                row.createCell(7).setCellValue(e.getTotalPending() != null ? e.getTotalPending() : 0L);
                row.createCell(8).setCellValue(e.getTotalOverdue() != null ? e.getTotalOverdue() : 0L);
                row.createCell(9).setCellValue(e.getMandatoryPendingCount() != null ? e.getMandatoryPendingCount() : 0L);
                row.createCell(10).setCellValue(e.getCompliancePercentage() != null ? e.getCompliancePercentage() : 0.0);
                row.createCell(11).setCellValue(e.getOverallComplianceStatus() != null ? e.getOverallComplianceStatus() : "COMPLIANT");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to export Employee Excel: {}", ex.getMessage(), ex);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Export failed: " + ex.getMessage());
        }
    }

    private CellStyle createExcelHeaderStyle(Workbook workbook) {
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        return headerStyle;
    }

    public record EmployeePolicyRecord(
            PolicyAssignment assignment,
            EffectiveAcknowledgement eff,
            String statusLabel,
            Long daysOverdue
    ) {}

    @Override
    @Transactional(readOnly = true)
    public PolicyExcelExportResult exportPolicyDocumentComplianceExcel(Long policyId, Long managerId, String userRole) {
        if (policyId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document ID is required");
        }

        PolicyDocument doc = documentRepo.findById(policyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document not found: " + policyId));

        boolean isHrAdmin = "HR_ADMIN".equalsIgnoreCase(userRole) || "SUPER_ADMIN".equalsIgnoreCase(userRole);
        boolean isManager = "MANAGER".equalsIgnoreCase(userRole);

        if (!isHrAdmin && !isManager) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: insufficient permissions to export policy compliance report");
        }

        Set<Long> allowedDeptIds = null;
        List<String> allowedDeptNames = null;
        String managerDeptName = null;

        if (isManager) {
            if (managerId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manager ID required for department scoping");
            }
            User manager = userRepo.findById(managerId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found: " + managerId));
            requireManagerRole(manager);
            allowedDeptIds = resolveManagerDepartmentIds(manager);
            allowedDeptNames = departmentRepo.findAllById(allowedDeptIds).stream()
                    .map(Department::getName)
                    .map(String::toLowerCase)
                    .toList();
            managerDeptName = manager.getDepartment() != null ? manager.getDepartment() : "Department";
        }

        PolicyVersion latestVer = versionRepo.findFirstByPolicyDocumentIdOrderByCreatedAtDesc(doc.getId()).orElse(null);

        // Fetch all assignments for this policy document
        List<PolicyAssignment> rawAssignments = assignmentRepo.findByPolicyDocumentId(doc.getId());
        if (rawAssignments == null) rawAssignments = List.of();

        List<PolicyAssignment> activeAssignments = rawAssignments.stream()
                .filter(a -> a.getAssignmentStatus() == PolicyAssignmentStatus.ACTIVE)
                .filter(a -> a.getEmployeeUser() != null)
                .toList();

        // Enforce Manager department scoping: reject unauthorized access or filter strictly
        if (isManager) {
            final Set<Long> fDeptIds = allowedDeptIds;
            final List<String> fDeptNames = allowedDeptNames;
            List<PolicyAssignment> scoped = activeAssignments.stream()
                    .filter(a -> {
                        if (a.getDepartmentIdSnapshot() != null && fDeptIds != null && fDeptIds.contains(a.getDepartmentIdSnapshot())) return true;
                        if (a.getEmployeeUser().getDepartment() != null && fDeptNames != null && fDeptNames.contains(a.getEmployeeUser().getDepartment().trim().toLowerCase())) return true;
                        return false;
                    })
                    .toList();

            if (scoped.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Policy is not assigned to your authorized department hierarchy");
            }
            activeAssignments = scoped;
        }

        // Deduplicate assignments per employee (INDIVIDUAL > DEPARTMENT > ALL_EMPLOYEES, latest version first)
        Map<Long, PolicyAssignment> effectiveMap = new LinkedHashMap<>();
        for (PolicyAssignment a : activeAssignments) {
            Long empUserId = a.getEmployeeUser().getId();
            effectiveMap.compute(empUserId, (id, existing) -> {
                if (existing == null) return a;
                return pickHigherPrecedenceAssignment(existing, a, latestVer);
            });
        }

        // Filter out TERMINATED employees as per standard eligibility
        List<PolicyAssignment> finalAssignments = effectiveMap.values().stream()
                .filter(a -> a.getEmployeeUser().getStatus() != UserStatus.TERMINATED)
                .sorted(Comparator.comparing((PolicyAssignment a) -> a.getEmployeeUser().getName() != null ? a.getEmployeeUser().getName() : "", String.CASE_INSENSITIVE_ORDER))
                .toList();

        // Calculate eligible employees count in scope
        List<User> allUsers = userRepo.findAll();
        long eligibleEmployeesCount;
        if (isHrAdmin) {
            eligibleEmployeesCount = allUsers.stream()
                    .filter(u -> u.getStatus() == UserStatus.ACTIVE || u.getStatus() == UserStatus.ON_LEAVE)
                    .count();
        } else {
            final List<String> fDeptNames = allowedDeptNames;
            eligibleEmployeesCount = allUsers.stream()
                    .filter(u -> u.getStatus() == UserStatus.ACTIVE || u.getStatus() == UserStatus.ON_LEAVE)
                    .filter(u -> u.getDepartment() != null && fDeptNames != null && fDeptNames.contains(u.getDepartment().trim().toLowerCase()))
                    .count();
        }

        // Classify records into categories
        LocalDate today = LocalDate.now();
        List<EmployeePolicyRecord> acknowledgedList = new ArrayList<>();
        List<EmployeePolicyRecord> derivedComplianceList = new ArrayList<>();
        List<EmployeePolicyRecord> overdueList = new ArrayList<>();
        List<EmployeePolicyRecord> pendingList = new ArrayList<>();
        List<EmployeePolicyRecord> completeList = new ArrayList<>();

        boolean docMandatory = false;

        for (PolicyAssignment a : finalAssignments) {
            User emp = a.getEmployeeUser();
            boolean isMandatory = Boolean.TRUE.equals(a.getMandatory());
            if (isMandatory) {
                docMandatory = true;
            }

            EffectiveAcknowledgement eff = resolveEffectiveAcknowledgement(a.getPolicyVersion(), emp.getId());
            boolean acked = eff.acknowledged();
            boolean overdue = !acked && a.getDueDate() != null && a.getDueDate().isBefore(today);

            String statusLabel;
            if (acked) {
                if (eff.isExplicit()) {
                    statusLabel = "ACKNOWLEDGED";
                    EmployeePolicyRecord rec = new EmployeePolicyRecord(a, eff, statusLabel, null);
                    acknowledgedList.add(rec);
                    completeList.add(rec);
                } else {
                    statusLabel = "DERIVED COMPLIANCE";
                    EmployeePolicyRecord rec = new EmployeePolicyRecord(a, eff, statusLabel, null);
                    derivedComplianceList.add(rec);
                    completeList.add(rec);
                }
            } else if (overdue) {
                statusLabel = "OVERDUE";
                long daysOverdue = ChronoUnit.DAYS.between(a.getDueDate(), today);
                EmployeePolicyRecord rec = new EmployeePolicyRecord(a, eff, statusLabel, daysOverdue);
                overdueList.add(rec);
                completeList.add(rec);
            } else {
                statusLabel = "PENDING";
                EmployeePolicyRecord rec = new EmployeePolicyRecord(a, eff, statusLabel, null);
                pendingList.add(rec);
                completeList.add(rec);
            }
        }

        if (finalAssignments.isEmpty()) {
            docMandatory = true;
        }

        int totalAssigned = finalAssignments.size();
        int totalCompliant = acknowledgedList.size() + derivedComplianceList.size();
        double compliancePct = totalAssigned > 0
                ? (double) Math.round((double) totalCompliant / totalAssigned * 1000.0) / 10.0
                : 100.0;

        byte[] workbookBytes = buildPolicySpecificExcelWorkbook(
                doc,
                latestVer,
                docMandatory,
                isHrAdmin,
                managerDeptName,
                eligibleEmployeesCount,
                totalAssigned,
                compliancePct,
                acknowledgedList,
                pendingList,
                overdueList,
                derivedComplianceList,
                completeList
        );

        String titlePart = doc.getTitle() != null
                ? doc.getTitle().trim().replaceAll("[^a-zA-Z0-9.-]", "_").replaceAll("_+", "_")
                : "Policy";
        String codePart = doc.getDocumentCode() != null
                ? doc.getDocumentCode().trim().replaceAll("[^a-zA-Z0-9.-]", "_").replaceAll("_+", "_")
                : "DOC";
        String filename = titlePart + "_" + codePart + "_Compliance_Report.xlsx";

        return new PolicyExcelExportResult(workbookBytes, filename);
    }

    private PolicyAssignment pickHigherPrecedenceAssignment(PolicyAssignment a1, PolicyAssignment a2, PolicyVersion latestVer) {
        if (latestVer != null) {
            boolean a1IsLatest = a1.getPolicyVersion() != null && latestVer.getId().equals(a1.getPolicyVersion().getId());
            boolean a2IsLatest = a2.getPolicyVersion() != null && latestVer.getId().equals(a2.getPolicyVersion().getId());
            if (a1IsLatest && !a2IsLatest) return a1;
            if (!a1IsLatest && a2IsLatest) return a2;
        }
        int p1 = sourcePriority(a1.getAssignmentSource());
        int p2 = sourcePriority(a2.getAssignmentSource());
        if (p1 > p2) return a1;
        if (p2 > p1) return a2;
        return a1.getId() >= a2.getId() ? a1 : a2;
    }

    private int sourcePriority(PolicyAssignmentSource source) {
        if (source == PolicyAssignmentSource.INDIVIDUAL) return 3;
        if (source == PolicyAssignmentSource.DEPARTMENT) return 2;
        return 1;
    }

    private byte[] buildPolicySpecificExcelWorkbook(
            PolicyDocument doc,
            PolicyVersion latestVer,
            boolean docMandatory,
            boolean isHrAdmin,
            String managerDeptName,
            long eligibleEmployeesCount,
            int totalAssigned,
            double compliancePct,
            List<EmployeePolicyRecord> acknowledgedList,
            List<EmployeePolicyRecord> pendingList,
            List<EmployeePolicyRecord> overdueList,
            List<EmployeePolicyRecord> derivedComplianceList,
            List<EmployeePolicyRecord> completeList
    ) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle headerStyle = createNavyHeaderStyle(workbook);
            CellStyle labelStyle = createDataCellStyle(workbook, true, HorizontalAlignment.LEFT);
            CellStyle dataStyle = createDataCellStyle(workbook, false, HorizontalAlignment.LEFT);
            CellStyle centerStyle = createDataCellStyle(workbook, false, HorizontalAlignment.CENTER);
            CellStyle numberStyle = createDataCellStyle(workbook, false, HorizontalAlignment.RIGHT);

            DateTimeFormatter dtFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            // ==========================================
            // SHEET 1: Policy Overview
            // ==========================================
            Sheet sheet1 = workbook.createSheet("Policy Overview");
            sheet1.setDisplayGridlines(true);

            Row hRow1 = sheet1.createRow(0);
            Cell c1_0 = hRow1.createCell(0);
            c1_0.setCellValue("Metric / Parameter");
            c1_0.setCellStyle(headerStyle);
            Cell c1_1 = hRow1.createCell(1);
            c1_1.setCellValue("Value");
            c1_1.setCellStyle(headerStyle);

            String pubDateStr = doc.getPublishedAt() != null ? doc.getPublishedAt().format(dtFormatter) : "Unpublished";
            String[][] overviewRows = new String[][] {
                    {"Policy Title", doc.getTitle() != null ? doc.getTitle() : ""},
                    {"Policy Code", doc.getDocumentCode() != null ? doc.getDocumentCode() : ""},
                    {"Category", doc.getCategory() != null ? doc.getCategory().getName() : "General"},
                    {"Current Version", latestVer != null ? latestVer.getVersionNumber() : "1.0"},
                    {"Version Type", latestVer != null && latestVer.getVersionType() != null ? latestVer.getVersionType().name() : "MAJOR"},
                    {"Publication Date", pubDateStr},
                    {"Mandatory/Optional Classification", docMandatory ? "Mandatory" : "Optional"},
                    {"Target Scope", isHrAdmin ? "Organisation-Wide" : ("Department: " + (managerDeptName != null ? managerDeptName : "Authorized Hierarchy"))},
                    {"Total Eligible Employees", String.valueOf(eligibleEmployeesCount)},
                    {"Total Assigned", String.valueOf(totalAssigned)},
                    {"Explicitly Acknowledged", String.valueOf(acknowledgedList.size())},
                    {"Derived Compliance", String.valueOf(derivedComplianceList.size())},
                    {"Pending Acknowledgements", String.valueOf(pendingList.size())},
                    {"Overdue Acknowledgements", String.valueOf(overdueList.size())},
                    {"Overall Compliance Percentage", String.format(Locale.US, "%.1f%%", compliancePct)},
                    {"Report Generation Timestamp", LocalDateTime.now().format(dtFormatter)}
            };

            for (int r = 0; r < overviewRows.length; r++) {
                Row row = sheet1.createRow(r + 1);
                Cell cellKey = row.createCell(0);
                cellKey.setCellValue(overviewRows[r][0]);
                cellKey.setCellStyle(labelStyle);

                Cell cellVal = row.createCell(1);
                cellVal.setCellValue(overviewRows[r][1]);
                cellVal.setCellStyle(dataStyle);
            }
            sheet1.createFreezePane(0, 1);
            sheet1.setColumnWidth(0, 9000);
            sheet1.setColumnWidth(1, 14000);

            // ==========================================
            // SHEET 2: Acknowledged
            // ==========================================
            Sheet sheet2 = workbook.createSheet("Acknowledged");
            sheet2.setDisplayGridlines(true);
            String[] headers2 = {
                    "Employee ID", "Employee Code", "Employee Name", "Department", "Designation",
                    "Document Version", "Acknowledgement Date and Time", "Acknowledgement Status", "SHA-256 Checksum"
            };
            createHeaderRow(sheet2, headers2, headerStyle);

            int rIdx2 = 1;
            for (EmployeePolicyRecord rec : acknowledgedList) {
                User u = rec.assignment().getEmployeeUser();
                Row row = sheet2.createRow(rIdx2++);
                row.createCell(0).setCellValue(u.getId());
                row.getCell(0).setCellStyle(numberStyle);
                row.createCell(1).setCellValue(u.getEmployeeId() != null ? u.getEmployeeId() : "");
                row.getCell(1).setCellStyle(dataStyle);
                row.createCell(2).setCellValue(u.getName() != null ? u.getName() : "");
                row.getCell(2).setCellStyle(dataStyle);
                row.createCell(3).setCellValue(u.getDepartment() != null ? u.getDepartment() : "");
                row.getCell(3).setCellStyle(dataStyle);
                row.createCell(4).setCellValue(u.getDesignation() != null ? u.getDesignation() : "");
                row.getCell(4).setCellStyle(dataStyle);
                row.createCell(5).setCellValue(rec.assignment().getPolicyVersion() != null ? rec.assignment().getPolicyVersion().getVersionNumber() : "1.0");
                row.getCell(5).setCellStyle(centerStyle);
                row.createCell(6).setCellValue(rec.eff().acknowledgedAt() != null ? rec.eff().acknowledgedAt().format(dtFormatter) : "");
                row.getCell(6).setCellStyle(centerStyle);
                row.createCell(7).setCellValue("ACKNOWLEDGED");
                row.getCell(7).setCellStyle(centerStyle);
                row.createCell(8).setCellValue(rec.eff().sha256Hash() != null ? rec.eff().sha256Hash() : "");
                row.getCell(8).setCellStyle(dataStyle);
            }
            sheet2.createFreezePane(0, 1);
            if (rIdx2 > 1) sheet2.setAutoFilter(new CellRangeAddress(0, rIdx2 - 1, 0, headers2.length - 1));
            autoSizeColumns(sheet2, headers2.length);

            // ==========================================
            // SHEET 3: Pending
            // ==========================================
            Sheet sheet3 = workbook.createSheet("Pending");
            sheet3.setDisplayGridlines(true);
            String[] headers3 = {
                    "Employee ID", "Employee Code", "Employee Name", "Department", "Designation",
                    "Assignment Date", "Due Date", "Mandatory/Optional", "Current Version", "Pending Status"
            };
            createHeaderRow(sheet3, headers3, headerStyle);

            int rIdx3 = 1;
            for (EmployeePolicyRecord rec : pendingList) {
                User u = rec.assignment().getEmployeeUser();
                Row row = sheet3.createRow(rIdx3++);
                row.createCell(0).setCellValue(u.getId());
                row.getCell(0).setCellStyle(numberStyle);
                row.createCell(1).setCellValue(u.getEmployeeId() != null ? u.getEmployeeId() : "");
                row.getCell(1).setCellStyle(dataStyle);
                row.createCell(2).setCellValue(u.getName() != null ? u.getName() : "");
                row.getCell(2).setCellStyle(dataStyle);
                row.createCell(3).setCellValue(u.getDepartment() != null ? u.getDepartment() : "");
                row.getCell(3).setCellStyle(dataStyle);
                row.createCell(4).setCellValue(u.getDesignation() != null ? u.getDesignation() : "");
                row.getCell(4).setCellStyle(dataStyle);
                row.createCell(5).setCellValue(rec.assignment().getAssignedAt() != null ? rec.assignment().getAssignedAt().format(dtFormatter) : "N/A");
                row.getCell(5).setCellStyle(centerStyle);
                row.createCell(6).setCellValue(rec.assignment().getDueDate() != null ? rec.assignment().getDueDate().toString() : "No Deadline");
                row.getCell(6).setCellStyle(centerStyle);
                row.createCell(7).setCellValue(Boolean.TRUE.equals(rec.assignment().getMandatory()) ? "Mandatory" : "Optional");
                row.getCell(7).setCellStyle(centerStyle);
                row.createCell(8).setCellValue(rec.assignment().getPolicyVersion() != null ? rec.assignment().getPolicyVersion().getVersionNumber() : "1.0");
                row.getCell(8).setCellStyle(centerStyle);
                row.createCell(9).setCellValue("PENDING");
                row.getCell(9).setCellStyle(centerStyle);
            }
            sheet3.createFreezePane(0, 1);
            if (rIdx3 > 1) sheet3.setAutoFilter(new CellRangeAddress(0, rIdx3 - 1, 0, headers3.length - 1));
            autoSizeColumns(sheet3, headers3.length);

            // ==========================================
            // SHEET 4: Overdue
            // ==========================================
            Sheet sheet4 = workbook.createSheet("Overdue");
            sheet4.setDisplayGridlines(true);
            String[] headers4 = {
                    "Employee ID", "Employee Code", "Employee Name", "Department", "Assignment Date",
                    "Due Date", "Days Overdue", "Mandatory/Optional", "Current Version", "Overdue Status"
            };
            createHeaderRow(sheet4, headers4, headerStyle);

            int rIdx4 = 1;
            for (EmployeePolicyRecord rec : overdueList) {
                User u = rec.assignment().getEmployeeUser();
                Row row = sheet4.createRow(rIdx4++);
                row.createCell(0).setCellValue(u.getId());
                row.getCell(0).setCellStyle(numberStyle);
                row.createCell(1).setCellValue(u.getEmployeeId() != null ? u.getEmployeeId() : "");
                row.getCell(1).setCellStyle(dataStyle);
                row.createCell(2).setCellValue(u.getName() != null ? u.getName() : "");
                row.getCell(2).setCellStyle(dataStyle);
                row.createCell(3).setCellValue(u.getDepartment() != null ? u.getDepartment() : "");
                row.getCell(3).setCellStyle(dataStyle);
                row.createCell(4).setCellValue(rec.assignment().getAssignedAt() != null ? rec.assignment().getAssignedAt().format(dtFormatter) : "N/A");
                row.getCell(4).setCellStyle(centerStyle);
                row.createCell(5).setCellValue(rec.assignment().getDueDate() != null ? rec.assignment().getDueDate().toString() : "");
                row.getCell(5).setCellStyle(centerStyle);
                row.createCell(6).setCellValue(rec.daysOverdue() != null ? rec.daysOverdue() : 0L);
                row.getCell(6).setCellStyle(numberStyle);
                row.createCell(7).setCellValue(Boolean.TRUE.equals(rec.assignment().getMandatory()) ? "Mandatory" : "Optional");
                row.getCell(7).setCellStyle(centerStyle);
                row.createCell(8).setCellValue(rec.assignment().getPolicyVersion() != null ? rec.assignment().getPolicyVersion().getVersionNumber() : "1.0");
                row.getCell(8).setCellStyle(centerStyle);
                row.createCell(9).setCellValue("OVERDUE");
                row.getCell(9).setCellStyle(centerStyle);
            }
            sheet4.createFreezePane(0, 1);
            if (rIdx4 > 1) sheet4.setAutoFilter(new CellRangeAddress(0, rIdx4 - 1, 0, headers4.length - 1));
            autoSizeColumns(sheet4, headers4.length);

            // ==========================================
            // SHEET 5: Derived Compliance
            // ==========================================
            Sheet sheet5 = workbook.createSheet("Derived Compliance");
            sheet5.setDisplayGridlines(true);
            String[] headers5 = {
                    "Employee ID", "Employee Code", "Employee Name", "Department", "Current Version",
                    "Previous Acknowledged Version", "Original Acknowledgement Date", "Original SHA-256 Checksum", "Compliance Type"
            };
            createHeaderRow(sheet5, headers5, headerStyle);

            int rIdx5 = 1;
            for (EmployeePolicyRecord rec : derivedComplianceList) {
                User u = rec.assignment().getEmployeeUser();
                Row row = sheet5.createRow(rIdx5++);
                row.createCell(0).setCellValue(u.getId());
                row.getCell(0).setCellStyle(numberStyle);
                row.createCell(1).setCellValue(u.getEmployeeId() != null ? u.getEmployeeId() : "");
                row.getCell(1).setCellStyle(dataStyle);
                row.createCell(2).setCellValue(u.getName() != null ? u.getName() : "");
                row.getCell(2).setCellStyle(dataStyle);
                row.createCell(3).setCellValue(u.getDepartment() != null ? u.getDepartment() : "");
                row.getCell(3).setCellStyle(dataStyle);
                row.createCell(4).setCellValue(rec.assignment().getPolicyVersion() != null ? rec.assignment().getPolicyVersion().getVersionNumber() : "1.0");
                row.getCell(4).setCellStyle(centerStyle);
                row.createCell(5).setCellValue(rec.eff().derivedFromVersionNumber() != null ? rec.eff().derivedFromVersionNumber() : "N/A");
                row.getCell(5).setCellStyle(centerStyle);
                row.createCell(6).setCellValue(rec.eff().acknowledgedAt() != null ? rec.eff().acknowledgedAt().format(dtFormatter) : "N/A");
                row.getCell(6).setCellStyle(centerStyle);
                row.createCell(7).setCellValue(rec.eff().sha256Hash() != null ? rec.eff().sha256Hash() : "N/A");
                row.getCell(7).setCellStyle(dataStyle);
                row.createCell(8).setCellValue("DERIVED COMPLIANCE");
                row.getCell(8).setCellStyle(centerStyle);
            }
            sheet5.createFreezePane(0, 1);
            if (rIdx5 > 1) sheet5.setAutoFilter(new CellRangeAddress(0, rIdx5 - 1, 0, headers5.length - 1));
            autoSizeColumns(sheet5, headers5.length);

            // ==========================================
            // SHEET 6: Complete Employee List
            // ==========================================
            Sheet sheet6 = workbook.createSheet("Complete Employee List");
            sheet6.setDisplayGridlines(true);
            String[] headers6 = {
                    "Employee ID", "Employee Code", "Employee Name", "Department", "Designation",
                    "Mandatory/Optional", "Assigned Date", "Due Date", "Current Version",
                    "Acknowledgement Status", "Acknowledgement Date", "Days Overdue"
            };
            createHeaderRow(sheet6, headers6, headerStyle);

            int rIdx6 = 1;
            for (EmployeePolicyRecord rec : completeList) {
                User u = rec.assignment().getEmployeeUser();
                Row row = sheet6.createRow(rIdx6++);
                row.createCell(0).setCellValue(u.getId());
                row.getCell(0).setCellStyle(numberStyle);
                row.createCell(1).setCellValue(u.getEmployeeId() != null ? u.getEmployeeId() : "");
                row.getCell(1).setCellStyle(dataStyle);
                row.createCell(2).setCellValue(u.getName() != null ? u.getName() : "");
                row.getCell(2).setCellStyle(dataStyle);
                row.createCell(3).setCellValue(u.getDepartment() != null ? u.getDepartment() : "");
                row.getCell(3).setCellStyle(dataStyle);
                row.createCell(4).setCellValue(u.getDesignation() != null ? u.getDesignation() : "");
                row.getCell(4).setCellStyle(dataStyle);
                row.createCell(5).setCellValue(Boolean.TRUE.equals(rec.assignment().getMandatory()) ? "Mandatory" : "Optional");
                row.getCell(5).setCellStyle(centerStyle);
                row.createCell(6).setCellValue(rec.assignment().getAssignedAt() != null ? rec.assignment().getAssignedAt().format(dtFormatter) : "N/A");
                row.getCell(6).setCellStyle(centerStyle);
                row.createCell(7).setCellValue(rec.assignment().getDueDate() != null ? rec.assignment().getDueDate().toString() : "No Deadline");
                row.getCell(7).setCellStyle(centerStyle);
                row.createCell(8).setCellValue(rec.assignment().getPolicyVersion() != null ? rec.assignment().getPolicyVersion().getVersionNumber() : "1.0");
                row.getCell(8).setCellStyle(centerStyle);
                row.createCell(9).setCellValue(rec.statusLabel());
                row.getCell(9).setCellStyle(centerStyle);
                row.createCell(10).setCellValue(rec.eff().acknowledged() && rec.eff().acknowledgedAt() != null ? rec.eff().acknowledgedAt().format(dtFormatter) : "");
                row.getCell(10).setCellStyle(centerStyle);
                if (rec.daysOverdue() != null) {
                    row.createCell(11).setCellValue(rec.daysOverdue());
                    row.getCell(11).setCellStyle(numberStyle);
                } else {
                    row.createCell(11).setCellValue("");
                    row.getCell(11).setCellStyle(centerStyle);
                }
            }
            sheet6.createFreezePane(0, 1);
            if (rIdx6 > 1) sheet6.setAutoFilter(new CellRangeAddress(0, rIdx6 - 1, 0, headers6.length - 1));
            autoSizeColumns(sheet6, headers6.length);

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to build policy specific Excel workbook: {}", ex.getMessage(), ex);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Export generation failed: " + ex.getMessage());
        }
    }

    private CellStyle createNavyHeaderStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 10);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        if (workbook instanceof XSSFWorkbook) {
            XSSFCellStyle xssfStyle = (XSSFCellStyle) style;
            byte[] rgb = new byte[]{(byte) 27, (byte) 54, (byte) 93}; // #1B365D Dark Navy
            xssfStyle.setFillForegroundColor(new XSSFColor(rgb, null));
        } else {
            style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        }
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        applyCellBorders(style);
        return style;
    }

    private CellStyle createDataCellStyle(Workbook workbook, boolean bold, HorizontalAlignment align) {
        Font font = workbook.createFont();
        font.setBold(bold);
        font.setFontHeightInPoints((short) 9);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(align);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        applyCellBorders(style);
        return style;
    }

    private void applyCellBorders(CellStyle style) {
        style.setBorderBottom(BorderStyle.THIN);
        style.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBorderTop(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBorderLeft(BorderStyle.THIN);
        style.setLeftBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBorderRight(BorderStyle.THIN);
        style.setRightBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
    }

    private void createHeaderRow(Sheet sheet, String[] headers, CellStyle headerStyle) {
        Row hRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = hRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
    }

    private void autoSizeColumns(Sheet sheet, int colCount) {
        for (int i = 0; i < colCount; i++) {
            sheet.autoSizeColumn(i);
            int width = sheet.getColumnWidth(i);
            if (width < 3200) sheet.setColumnWidth(i, 3200);
            else if (width > 15000) sheet.setColumnWidth(i, 15000);
        }
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
        dto.setCreatedByUserId(v.getCreatedBy() != null ? v.getCreatedBy().getId() : null);
        dto.setCreatedByUserName(v.getCreatedBy() != null ? v.getCreatedBy().getFullName() : "System");
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
        dto.setDescription(a.getPolicyDocument().getDescription());
        dto.setDocumentCode(a.getPolicyDocument().getDocumentCode());
        dto.setPolicyVersionId(a.getPolicyVersion().getId());
        dto.setVersionNumber(a.getPolicyVersion().getVersionNumber());
        dto.setVersionType(a.getPolicyVersion().getVersionType());
        dto.setEffectiveDate(a.getPolicyVersion().getEffectiveDate());
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
            dto.setCategoryId(a.getPolicyDocument().getCategory().getId());
            dto.setCategoryName(a.getPolicyDocument().getCategory().getName());
        }
        if (a.getPolicyDocument().getOwningDepartment() != null) {
            dto.setOwningDepartmentName(a.getPolicyDocument().getOwningDepartment().getName());
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

    private void requireManagerRole(User user) {
        if (user == null || user.getRole() != Role.MANAGER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Only users with the MANAGER role may access Manager Policy operations.");
        }
    }

    private boolean isManagerAuthorizedForDepartment(User manager, Department targetDept) {
        if (manager == null || manager.getRole() != Role.MANAGER) {
            return false;
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

        // 1. Check if user has active assignment for this specific version
        boolean hasAssignment = assignmentRepo.existsByPolicyVersionIdAndEmployeeUserId(version.getId(), userId);
        if (hasAssignment) {
            return;
        }

        // 2. Check if user previously acknowledged this version (historical review)
        if (acknowledgementRepo.findByPolicyVersionIdAndEmployeeUserId(version.getId(), userId).isPresent()) {
            return;
        }

        // 3. Check if user has assignment for any version of this policy document
        List<PolicyAssignment> docAssignments = assignmentRepo.findByPolicyDocumentId(version.getPolicyDocument().getId());
        boolean userHasDocAssignment = docAssignments.stream()
                .anyMatch(a -> a.getEmployeeUser() != null && a.getEmployeeUser().getId().equals(userId));
        if (userHasDocAssignment) {
            return;
        }

        // 4. Check if user is manager of the department
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

        // 5. Check if published company-wide (ALL_EMPLOYEES audience)
        if (version.getPolicyDocument().getDocumentStatus() == PolicyDocumentStatus.PUBLISHED) {
            boolean isAllEmployees = docAssignments.stream()
                    .anyMatch(a -> a.getAssignmentSource() == PolicyAssignmentSource.ALL_EMPLOYEES);
            if (isAllEmployees) {
                return;
            }
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
                boolean isAck = isCompliantInternal(
                        a.getPolicyVersion(),
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

    public record EffectiveAcknowledgement(
            boolean acknowledged,
            boolean isExplicit,
            String derivedFromVersionNumber,
            LocalDateTime acknowledgedAt,
            Long acknowledgementId,
            String sha256Hash
    ) {}

    public EffectiveAcknowledgement resolveEffectiveAcknowledgement(PolicyVersion version, Long userId) {
        if (version == null || userId == null) {
            return new EffectiveAcknowledgement(false, false, null, null, null, null);
        }

        // 1. Direct explicit acknowledgement for this specific version
        Optional<PolicyAcknowledgement> explicitAck = acknowledgementRepo.findByPolicyVersionIdAndEmployeeUserId(
                version.getId(),
                userId
        );
        if (explicitAck.isPresent()) {
            PolicyAcknowledgement ack = explicitAck.get();
            return new EffectiveAcknowledgement(
                    true,
                    true,
                    null,
                    ack.getAcceptedAt(),
                    ack.getId(),
                    ack.getDocumentSha256Hash()
            );
        }

        // 2. If MINOR version, check if employee acknowledged a prior version in this major version line
        if (version.getVersionType() == PolicyVersionType.MINOR && version.getPolicyDocument() != null) {
            List<PolicyVersion> docVersions = versionRepo.findByPolicyDocumentIdOrderByCreatedAtAsc(version.getPolicyDocument().getId());
            if (docVersions == null) docVersions = List.of();
            List<PolicyAcknowledgement> pastAcks = acknowledgementRepo.findByPolicyDocumentIdOrderByAcceptedAtDesc(version.getPolicyDocument().getId())
                    .stream()
                    .filter(a -> a.getEmployeeUser().getId().equals(userId))
                    .toList();

            for (PolicyAcknowledgement pastAck : pastAcks) {
                PolicyVersion pastVer = pastAck.getPolicyVersion();
                if (isSameOrPrecedingMajorSeries(pastVer, version, docVersions)) {
                    return new EffectiveAcknowledgement(
                            true,
                            false,
                            pastVer.getVersionNumber(),
                            pastAck.getAcceptedAt(),
                            pastAck.getId(),
                            version.getSha256Hash()
                    );
                }
            }
        }

        return new EffectiveAcknowledgement(false, false, null, null, null, null);
    }

    private boolean isSameOrPrecedingMajorSeries(PolicyVersion pastVer, PolicyVersion currentVer, List<PolicyVersion> allVersionsAsc) {
        if (pastVer == null || currentVer == null || pastVer.getId().equals(currentVer.getId())) {
            return false;
        }

        int pastIdx = -1;
        int currentIdx = -1;
        for (int i = 0; i < allVersionsAsc.size(); i++) {
            if (allVersionsAsc.get(i).getId().equals(pastVer.getId())) pastIdx = i;
            if (allVersionsAsc.get(i).getId().equals(currentVer.getId())) currentIdx = i;
        }

        if (pastIdx == -1 || currentIdx == -1 || pastIdx >= currentIdx) {
            return false;
        }

        for (int i = pastIdx + 1; i <= currentIdx; i++) {
            PolicyVersion intermediate = allVersionsAsc.get(i);
            if (intermediate.getVersionType() == PolicyVersionType.MAJOR) {
                return false;
            }
        }

        return true;
    }

    public boolean isCompliantInternal(PolicyVersion version, Long userId) {
        return resolveEffectiveAcknowledgement(version, userId).acknowledged();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isCompliant(Long versionId, Long userId) {
        PolicyVersion version = versionRepo.findById(versionId).orElse(null);
        if (version == null) return false;
        return isCompliantInternal(version, userId);
    }
}
