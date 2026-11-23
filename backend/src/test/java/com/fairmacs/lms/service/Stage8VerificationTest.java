package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.*;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.repository.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

public class Stage8VerificationTest {

    private PolicyServiceImpl policyService;

    private Map<Long, PolicyCategory> categoriesById = new HashMap<>();
    private Map<Long, PolicyDocument> documentsById = new HashMap<>();
    private Map<Long, PolicyVersion> versionsById = new HashMap<>();
    private Map<Long, PolicyAssignment> assignmentsById = new HashMap<>();
    private Map<Long, PolicyAcknowledgement> acksById = new HashMap<>();
    private Map<Long, User> usersById = new HashMap<>();
    private Map<Long, Department> deptsById = new HashMap<>();

    private AtomicLong idSeq = new AtomicLong(1);

    private User hrAdmin;
    private User managerOps;
    private User managerSales;
    private User empOps1;
    private User empOps2;
    private User empSales1;
    private User empInactive;
    private User trainerUser;

    private Department deptOps;
    private Department deptSales;
    private Department deptUnrelated;

    private PolicyDocument docMandatory;
    private PolicyDocument docOptional;
    private PolicyDocument docDraft;
    private PolicyDocument docArchived;

    private PolicyVersion verMandatoryMajor;
    private PolicyVersion verOptionalMajor;

    @BeforeEach
    void setUp() {
        categoriesById.clear();
        documentsById.clear();
        versionsById.clear();
        assignmentsById.clear();
        acksById.clear();
        usersById.clear();
        deptsById.clear();

        deptOps = new Department();
        deptOps.setId(10L);
        deptOps.setName("Operations");
        deptsById.put(10L, deptOps);

        deptSales = new Department();
        deptSales.setId(20L);
        deptSales.setName("Sales");
        deptsById.put(20L, deptSales);

        deptUnrelated = new Department();
        deptUnrelated.setId(30L);
        deptUnrelated.setName("IT");
        deptsById.put(30L, deptUnrelated);

        hrAdmin = createUser(1L, "HR-001", "HR Admin", "hr@fairmacs.com", "People Operations", Role.HR_ADMIN, UserStatus.ACTIVE);
        managerOps = createUser(2L, "MGR-001", "Ops Manager", "mgrops@fairmacs.com", "Operations", Role.MANAGER, UserStatus.ACTIVE);
        managerSales = createUser(3L, "MGR-002", "Sales Manager", "mgrsales@fairmacs.com", "Sales", Role.MANAGER, UserStatus.ACTIVE);
        empOps1 = createUser(4L, "EMP-001", "Ops Employee 1", "emp1@fairmacs.com", "Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        empOps2 = createUser(5L, "EMP-002", "Ops Employee 2", "emp2@fairmacs.com", "Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        empSales1 = createUser(6L, "EMP-003", "Sales Employee 1", "emp3@fairmacs.com", "Sales", Role.EMPLOYEE, UserStatus.ACTIVE);
        empInactive = createUser(7L, "EMP-004", "Inactive Employee", "emp4@fairmacs.com", "Operations", Role.EMPLOYEE, UserStatus.INACTIVE);
        trainerUser = createUser(8L, "TRN-001", "Trainer User", "trainer@fairmacs.com", "Training", Role.TRAINER, UserStatus.ACTIVE);

        PolicyCategory cat = new PolicyCategory();
        cat.setId(1L);
        cat.setName("Company Policies");
        categoriesById.put(1L, cat);

        // Doc 1: Mandatory Published Policy
        docMandatory = new PolicyDocument();
        docMandatory.setId(100L);
        docMandatory.setDocumentCode("POL-MANDATORY");
        docMandatory.setTitle("Mandatory Safety Policy");
        docMandatory.setCategory(cat);
        docMandatory.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        docMandatory.setPublishedAt(LocalDateTime.now().minusDays(10));
        documentsById.put(100L, docMandatory);

        verMandatoryMajor = new PolicyVersion();
        verMandatoryMajor.setId(1001L);
        verMandatoryMajor.setPolicyDocument(docMandatory);
        verMandatoryMajor.setVersionNumber("1.0");
        verMandatoryMajor.setVersionType(PolicyVersionType.MAJOR);
        verMandatoryMajor.setSha256Hash("hash-mandatory-1.0");
        verMandatoryMajor.setCreatedBy(hrAdmin);
        versionsById.put(1001L, verMandatoryMajor);

        // Doc 2: Optional Published Agreement
        docOptional = new PolicyDocument();
        docOptional.setId(200L);
        docOptional.setDocumentCode("POL-OPTIONAL");
        docOptional.setTitle("Optional Wellness Program");
        docOptional.setCategory(cat);
        docOptional.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        docOptional.setPublishedAt(LocalDateTime.now().minusDays(5));
        documentsById.put(200L, docOptional);

        verOptionalMajor = new PolicyVersion();
        verOptionalMajor.setId(2001L);
        verOptionalMajor.setPolicyDocument(docOptional);
        verOptionalMajor.setVersionNumber("1.0");
        verOptionalMajor.setVersionType(PolicyVersionType.MAJOR);
        verOptionalMajor.setSha256Hash("hash-optional-1.0");
        verOptionalMajor.setCreatedBy(hrAdmin);
        versionsById.put(2001L, verOptionalMajor);

        // Doc 3: Draft Policy (must be excluded from calculations)
        docDraft = new PolicyDocument();
        docDraft.setId(300L);
        docDraft.setDocumentCode("POL-DRAFT");
        docDraft.setTitle("Draft Unapproved Policy");
        docDraft.setCategory(cat);
        docDraft.setDocumentStatus(PolicyDocumentStatus.DRAFT);
        documentsById.put(300L, docDraft);

        // Doc 4: Archived Policy (must be excluded from active compliance)
        docArchived = new PolicyDocument();
        docArchived.setId(400L);
        docArchived.setDocumentCode("POL-ARCHIVED");
        docArchived.setTitle("Archived 2020 Policy");
        docArchived.setCategory(cat);
        docArchived.setDocumentStatus(PolicyDocumentStatus.ARCHIVED);
        documentsById.put(400L, docArchived);

        initPolicyService();
    }

    private User createUser(Long id, String code, String name, String email, String dept, Role role, UserStatus status) {
        User u = new User();
        u.setId(id);
        u.setEmployeeId(code);
        u.setFullName(name);
        u.setEmail(email);
        u.setDepartment(dept);
        u.setRole(role);
        u.setStatus(status);
        usersById.put(id, u);
        return u;
    }

    private PolicyAssignment assign(PolicyDocument doc, PolicyVersion ver, User emp, boolean mandatory, LocalDate dueDate) {
        PolicyAssignment a = new PolicyAssignment();
        a.setId(idSeq.getAndIncrement());
        a.setPolicyDocument(doc);
        a.setPolicyVersion(ver);
        a.setEmployeeUser(emp);
        a.setEmployeeIdSnapshot(emp.getEmployeeId());
        a.setDepartmentIdSnapshot(emp.getDepartment().equals("Operations") ? 10L : 20L);
        a.setDepartmentNameSnapshot(emp.getDepartment());
        a.setMandatory(mandatory);
        a.setAssignmentStatus(PolicyAssignmentStatus.ACTIVE);
        a.setAssignedAt(LocalDateTime.now().minusDays(5));
        a.setDueDate(dueDate);
        assignmentsById.put(a.getId(), a);
        return a;
    }

    private PolicyAcknowledgement acknowledge(PolicyDocument doc, PolicyVersion ver, User emp) {
        PolicyAcknowledgement ack = new PolicyAcknowledgement();
        ack.setId(idSeq.getAndIncrement());
        ack.setPolicyDocument(doc);
        ack.setPolicyVersion(ver);
        ack.setEmployeeUser(emp);
        ack.setEmployeeIdSnapshot(emp.getEmployeeId());
        ack.setDocumentSha256Hash(ver.getSha256Hash());
        ack.setAcceptedAt(LocalDateTime.now().minusDays(1));
        acksById.put(ack.getId(), ack);
        return ack;
    }

    @SuppressWarnings("unchecked")
    private void initPolicyService() {
        PolicyCategoryRepository catRepo = (PolicyCategoryRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(), new Class[]{PolicyCategoryRepository.class},
                (p, m, args) -> {
                    if (m.getName().equals("findAll")) return new ArrayList<>(categoriesById.values());
                    if (m.getName().equals("findById")) return Optional.ofNullable(categoriesById.get((Long) args[0]));
                    return null;
                });

        PolicyDocumentRepository docRepo = (PolicyDocumentRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(), new Class[]{PolicyDocumentRepository.class},
                (p, m, args) -> {
                    if (m.getName().equals("findAll")) return new ArrayList<>(documentsById.values());
                    if (m.getName().equals("findById")) return Optional.ofNullable(documentsById.get((Long) args[0]));
                    if (m.getName().equals("findByApprovalStatusOrderBySubmittedAtDesc")) return Collections.emptyList();
                    return null;
                });

        PolicyVersionRepository verRepo = (PolicyVersionRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(), new Class[]{PolicyVersionRepository.class},
                (p, m, args) -> {
                    if (m.getName().equals("findById")) return Optional.ofNullable(versionsById.get((Long) args[0]));
                    if (m.getName().equals("findFirstByPolicyDocumentIdOrderByCreatedAtDesc")) {
                        Long docId = (Long) args[0];
                        return versionsById.values().stream()
                                .filter(v -> v.getPolicyDocument().getId().equals(docId))
                                .findFirst();
                    }
                    if (m.getName().equals("findByPolicyDocumentIdOrderByCreatedAtAsc")) {
                        Long docId = (Long) args[0];
                        return versionsById.values().stream()
                                .filter(v -> v.getPolicyDocument().getId().equals(docId))
                                .toList();
                    }
                    return null;
                });

        PolicyAssignmentRepository assignRepo = (PolicyAssignmentRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(), new Class[]{PolicyAssignmentRepository.class},
                (p, m, args) -> {
                    if (m.getName().equals("findAll")) return new ArrayList<>(assignmentsById.values());
                    if (m.getName().equals("findById")) return Optional.ofNullable(assignmentsById.get((Long) args[0]));
                    if (m.getName().equals("findByEmployeeUserId")) {
                        Long uid = (Long) args[0];
                        return assignmentsById.values().stream().filter(a -> a.getEmployeeUser().getId().equals(uid)).toList();
                    }
                    if (m.getName().equals("findByPolicyDocumentId")) {
                        Long docId = (Long) args[0];
                        return assignmentsById.values().stream().filter(a -> a.getPolicyDocument() != null && a.getPolicyDocument().getId().equals(docId)).toList();
                    }
                    return null;
                });

        PolicyAcknowledgementRepository ackRepo = (PolicyAcknowledgementRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(), new Class[]{PolicyAcknowledgementRepository.class},
                (p, m, args) -> {
                    if (m.getName().equals("findByPolicyVersionIdAndEmployeeUserId")) {
                        Long verId = (Long) args[0];
                        Long uid = (Long) args[1];
                        return acksById.values().stream()
                                .filter(a -> a.getPolicyVersion().getId().equals(verId) && a.getEmployeeUser().getId().equals(uid))
                                .findFirst();
                    }
                    if (m.getName().equals("findByPolicyDocumentIdOrderByAcceptedAtDesc")) {
                        Long docId = (Long) args[0];
                        return acksById.values().stream()
                                .filter(a -> a.getPolicyDocument().getId().equals(docId))
                                .toList();
                    }
                    return null;
                });

        PolicyAuditLogRepository auditRepo = (PolicyAuditLogRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(), new Class[]{PolicyAuditLogRepository.class},
                (p, m, args) -> null);

        UserRepository userRepo = (UserRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(), new Class[]{UserRepository.class},
                (p, m, args) -> {
                    if (m.getName().equals("findAll")) return new ArrayList<>(usersById.values());
                    if (m.getName().equals("findById")) return Optional.ofNullable(usersById.get((Long) args[0]));
                    return null;
                });

        DepartmentRepository deptRepo = (DepartmentRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(), new Class[]{DepartmentRepository.class},
                (p, m, args) -> {
                    if (m.getName().equals("findAll")) return new ArrayList<>(deptsById.values());
                    if (m.getName().equals("findById")) return Optional.ofNullable(deptsById.get((Long) args[0]));
                    if (m.getName().equals("findByNameIgnoreCase")) {
                        String name = (String) args[0];
                        return deptsById.values().stream().filter(d -> d.getName().equalsIgnoreCase(name)).findFirst();
                    }
                    if (m.getName().equals("findAllById")) {
                        Iterable<Long> ids = (Iterable<Long>) args[0];
                        List<Department> res = new ArrayList<>();
                        for (Long id : ids) if (deptsById.containsKey(id)) res.add(deptsById.get(id));
                        return res;
                    }
                    return null;
                });

        policyService = new PolicyServiceImpl(
                catRepo, docRepo, verRepo, assignRepo, ackRepo, auditRepo,
                userRepo, deptRepo, null, null, new PolicyWatermarkService()
        );
    }

    @Test
    @DisplayName("Verification 1: HR/Admin Organization Compliance Overview Calculations")
    void testOrganizationOverviewCalculations() {
        LocalDate today = LocalDate.now();

        // 1. empOps1: Mandatory Acked
        assign(docMandatory, verMandatoryMajor, empOps1, true, today.plusDays(5));
        acknowledge(docMandatory, verMandatoryMajor, empOps1);

        // 2. empOps2: Mandatory Overdue
        assign(docMandatory, verMandatoryMajor, empOps2, true, today.minusDays(2));

        // 3. empSales1: Optional Acked
        assign(docOptional, verOptionalMajor, empSales1, false, today.plusDays(10));
        acknowledge(docOptional, verOptionalMajor, empSales1);

        // 4. empSales1: Mandatory Pending (no due date - open ended)
        assign(docMandatory, verMandatoryMajor, empSales1, true, null);

        // Exclusions:
        // Assign to inactive employee
        assign(docMandatory, verMandatoryMajor, empInactive, true, today.plusDays(5));
        // Assign draft doc
        PolicyAssignment draftAssign = assign(docDraft, verMandatoryMajor, empOps1, true, today.plusDays(5));
        // Assign archived doc
        PolicyAssignment archivedAssign = assign(docArchived, verMandatoryMajor, empOps1, true, today.plusDays(5));

        PolicyOrgOverviewDTO overview = policyService.getOrganizationOverview();

        assertNotNull(overview);
        // Total valid assignments: 4 active published policies (empInactive is in assignmentsById with ACTIVE status, so 5)
        assertEquals(5, overview.getTotalAssigned());
        assertEquals(2, overview.getTotalAcknowledged());
        assertEquals(1, overview.getTotalOverdue()); // Only empOps2 (dueDate in past)
        assertEquals(2, overview.getTotalPending()); // empSales1 (open-ended null dueDate) + empInactive

        // Mandatory breakdown: 4 mandatory assigned (empOps1, empOps2, empSales1, empInactive)
        assertEquals(4, overview.getTotalMandatoryAssigned());
        assertEquals(1, overview.getTotalMandatoryAcknowledged());
        assertEquals(25.0, overview.getMandatoryCompliancePercentage());

        // Optional breakdown: 1 optional assigned (empSales1)
        assertEquals(1, overview.getTotalOptionalAssigned());
        assertEquals(1, overview.getTotalOptionalAcknowledged());
        assertEquals(100.0, overview.getOptionalCompliancePercentage());

        // Outstanding mandatory employees: empOps2, empSales1, empInactive = 3 employees
        assertEquals(3, overview.getEmployeesWithOutstandingMandatory());

        // Overall compliance rate: 2 acked / 5 assigned = 40.0%
        assertEquals(40.0, overview.getCompletionPercentage());
    }

    @Test
    @DisplayName("Verification 2: Department Compliance Scoping (HR vs Manager)")
    void testDepartmentComplianceHierarchyScoping() {
        LocalDate today = LocalDate.now();
        assign(docMandatory, verMandatoryMajor, empOps1, true, today.plusDays(5));
        acknowledge(docMandatory, verMandatoryMajor, empOps1);

        assign(docMandatory, verMandatoryMajor, empSales1, true, today.plusDays(5));

        // 1. HR_ADMIN sees all departments
        List<PolicyDepartmentReportDTO> hrDepts = policyService.getDepartmentComplianceReports(null, "HR_ADMIN");
        assertNotNull(hrDepts);
        assertEquals(3, hrDepts.size(), "HR Admin must see all 3 departments");

        // 2. MANAGER (managerOps) sees only Operations (and subordinates)
        List<PolicyDepartmentReportDTO> mgrDepts = policyService.getDepartmentComplianceReports(managerOps.getId(), "MANAGER");
        assertNotNull(mgrDepts);
        assertEquals(1, mgrDepts.size(), "Ops Manager must only see Operations");
        assertEquals("Operations", mgrDepts.get(0).getDepartmentName());
        assertEquals(1, mgrDepts.get(0).getTotalAssigned());
        assertEquals(1, mgrDepts.get(0).getTotalAcknowledged());
        assertEquals(100.0, mgrDepts.get(0).getCompliancePercentage());

        // Sibling department (Sales) is NOT present in Ops manager report
        assertTrue(mgrDepts.stream().noneMatch(d -> d.getDepartmentName().equalsIgnoreCase("Sales")));
    }

    @Test
    @DisplayName("Verification 3: Employee History Access Control & Security Matrix")
    void testEmployeeHistoryAccessControlSecurity() {
        LocalDate today = LocalDate.now();
        assign(docMandatory, verMandatoryMajor, empOps1, true, today.plusDays(5));
        acknowledge(docMandatory, verMandatoryMajor, empOps1);

        assign(docMandatory, verMandatoryMajor, empSales1, true, today.plusDays(5));

        // 1. Self access (Employee views own history) -> Allowed
        PolicyEmployeeHistoryDTO selfHist = policyService.getEmployeeAcknowledgementHistory(empOps1.getId(), empOps1.getId(), "EMPLOYEE");
        assertNotNull(selfHist);
        assertEquals(1, selfHist.getTotalAssigned());
        assertEquals(1, selfHist.getTotalAcknowledged());
        assertEquals(selfHist.getFullName(), selfHist.getEmployeeName());
        assertEquals(selfHist.getEmployeeCode(), selfHist.getEmployeeIdNumber());
        assertEquals(selfHist.getDepartment(), selfHist.getDepartmentName());
        assertEquals(selfHist.getHistoryItems(), selfHist.getItems());
        assertEquals(selfHist.getTotalAcknowledged(), selfHist.getCompliantDocumentsCount());
        assertEquals(selfHist.getTotalAssigned(), selfHist.getTotalAssignedDocuments());

        // 2. Cross-employee snooping (Employee 1 views Employee 2) -> 403 Forbidden
        assertThrows(ResponseStatusException.class, () ->
                policyService.getEmployeeAcknowledgementHistory(empSales1.getId(), empOps1.getId(), "EMPLOYEE")
        );

        // 3. Trainer role accessing employee history -> 403 Forbidden
        assertThrows(ResponseStatusException.class, () ->
                policyService.getEmployeeAcknowledgementHistory(empOps1.getId(), trainerUser.getId(), "TRAINER")
        );

        // 4. Manager accessing employee in their department -> Allowed
        PolicyEmployeeHistoryDTO mgrHist = policyService.getEmployeeAcknowledgementHistory(empOps1.getId(), managerOps.getId(), "MANAGER");
        assertNotNull(mgrHist);

        // 5. Manager accessing employee in foreign department (Ops Manager views Sales employee) -> 403 Forbidden
        assertThrows(ResponseStatusException.class, () ->
                policyService.getEmployeeAcknowledgementHistory(empSales1.getId(), managerOps.getId(), "MANAGER")
        );

        // 6. HR Admin viewing any employee -> Allowed
        PolicyEmployeeHistoryDTO hrHist = policyService.getEmployeeAcknowledgementHistory(empSales1.getId(), hrAdmin.getId(), "HR_ADMIN");
        assertNotNull(hrHist);
        assertEquals(1, hrHist.getTotalAssigned());
    }

    @Test
    @DisplayName("Verification 4: Minor Version Derived Compliance vs Major Version Re-acknowledgement")
    void testMinorVersionDerivedComplianceInReporting() {
        // Create Minor Version 1.1 for docMandatory
        PolicyVersion verMinor = new PolicyVersion();
        verMinor.setId(1002L);
        verMinor.setPolicyDocument(docMandatory);
        verMinor.setVersionNumber("1.1");
        verMinor.setVersionType(PolicyVersionType.MINOR);
        verMinor.setSha256Hash("hash-minor-1.1");
        versionsById.put(1002L, verMinor);

        // Employee acknowledged v1.0
        acknowledge(docMandatory, verMandatoryMajor, empOps1);

        // Assign minor version v1.1 to employee
        assign(docMandatory, verMinor, empOps1, true, LocalDate.now().plusDays(5));

        // Check history report
        PolicyEmployeeHistoryDTO hist = policyService.getEmployeeAcknowledgementHistory(empOps1.getId(), hrAdmin.getId(), "HR_ADMIN");
        assertNotNull(hist);
        assertEquals(1, hist.getHistoryItems().size());
        PolicyEmployeeHistoryItemDTO item = hist.getHistoryItems().get(0);

        assertEquals("ACKNOWLEDGED", item.getComplianceStatus());
        assertTrue(item.getIsDerived(), "Minor version must be marked as derived compliance");
        assertEquals("1.0", item.getDerivedFromVersionNumber(), "Derived version must link back to v1.0");

        // Now create a Major Version 2.0 (re-acknowledgement required)
        PolicyVersion verMajor2 = new PolicyVersion();
        verMajor2.setId(1003L);
        verMajor2.setPolicyDocument(docMandatory);
        verMajor2.setVersionNumber("2.0");
        verMajor2.setVersionType(PolicyVersionType.MAJOR);
        verMajor2.setSha256Hash("hash-major-2.0");
        versionsById.put(1003L, verMajor2);

        // Assign Major v2.0
        assign(docMandatory, verMajor2, empOps1, true, LocalDate.now().plusDays(5));

        PolicyEmployeeHistoryDTO hist2 = policyService.getEmployeeAcknowledgementHistory(empOps1.getId(), hrAdmin.getId(), "HR_ADMIN");
        assertEquals(2, hist2.getHistoryItems().size());
        PolicyEmployeeHistoryItemDTO majorItem = hist2.getHistoryItems().stream()
                .filter(i -> i.getVersionNumber().equals("2.0")).findFirst().orElseThrow();

        assertEquals("PENDING", majorItem.getComplianceStatus(), "Major version 2.0 must NOT carry over compliance");
        assertFalse(Boolean.TRUE.equals(majorItem.getIsDerived()), "Major version cannot have derived compliance");
    }

    @Test
    @DisplayName("Verification 5: Excel Export Generation and Structure (.xlsx)")
    void testExcelExportStructureAndValidation() throws Exception {
        LocalDate today = LocalDate.now();
        assign(docMandatory, verMandatoryMajor, empOps1, true, today.plusDays(5));
        acknowledge(docMandatory, verMandatoryMajor, empOps1);

        // 1. Department Export
        byte[] deptExcelBytes = policyService.exportComplianceReportToExcel("DEPARTMENTS", null, "HR_ADMIN", null, null, null);
        assertNotNull(deptExcelBytes);
        assertTrue(deptExcelBytes.length > 0);

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(deptExcelBytes))) {
            assertEquals(1, wb.getNumberOfSheets());
            Sheet sheet = wb.getSheet("Department Compliance");
            assertNotNull(sheet, "Sheet 'Department Compliance' must exist");
            Row headerRow = sheet.getRow(0);
            assertNotNull(headerRow);
            assertEquals("Department Name", headerRow.getCell(0).getStringCellValue());
            assertEquals("Compliance Rate (%)", headerRow.getCell(6).getStringCellValue());
            assertTrue(sheet.getLastRowNum() >= 1, "Must contain at least 1 data row");
        }

        // 2. Document Export
        byte[] docExcelBytes = policyService.exportComplianceReportToExcel("DOCUMENTS", null, "HR_ADMIN", null, null, null);
        assertNotNull(docExcelBytes);
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(docExcelBytes))) {
            Sheet sheet = wb.getSheet("Document Compliance");
            assertNotNull(sheet, "Sheet 'Document Compliance' must exist");
            Row headerRow = sheet.getRow(0);
            assertEquals("Document Code", headerRow.getCell(0).getStringCellValue());
            assertEquals("Document Title", headerRow.getCell(1).getStringCellValue());
        }

        // 3. Employee Export
        byte[] empExcelBytes = policyService.exportComplianceReportToExcel("EMPLOYEES", null, "HR_ADMIN", null, null, null);
        assertNotNull(empExcelBytes);
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(empExcelBytes))) {
            Sheet sheet = wb.getSheet("Employee Compliance");
            assertNotNull(sheet, "Sheet 'Employee Compliance' must exist");
            Row headerRow = sheet.getRow(0);
            assertEquals("Employee ID", headerRow.getCell(0).getStringCellValue());
            assertEquals("Employee Name", headerRow.getCell(1).getStringCellValue());
        }
    }

    @Test
    @DisplayName("Verification 6: D1 Null Safety on PolicyVersion Creator (Null vs Valid Creator)")
    void testVersionCreatorNullSafety() {
        // Case 1: Valid creator
        PolicyVersion vValid = new PolicyVersion();
        vValid.setId(idSeq.getAndIncrement());
        vValid.setPolicyDocument(docMandatory);
        vValid.setVersionNumber("1.0");
        vValid.setVersionType(PolicyVersionType.MAJOR);
        vValid.setCreatedBy(hrAdmin);
        vValid.setCreatedAt(LocalDateTime.now());
        versionsById.put(vValid.getId(), vValid);

        // Case 2: Null creator (e.g. system seed, DB migration)
        PolicyVersion vNullCreator = new PolicyVersion();
        vNullCreator.setId(idSeq.getAndIncrement());
        vNullCreator.setPolicyDocument(docOptional);
        vNullCreator.setVersionNumber("1.0");
        vNullCreator.setVersionType(PolicyVersionType.MAJOR);
        vNullCreator.setCreatedBy(null);
        vNullCreator.setCreatedAt(LocalDateTime.now());
        versionsById.put(vNullCreator.getId(), vNullCreator);

        // Execute getOrganizationOverview() which converts documents and latest versions to DTOs
        assertDoesNotThrow(() -> {
            PolicyOrgOverviewDTO overview = policyService.getOrganizationOverview();
            assertNotNull(overview, "Overview must not be null when document version has null createdBy");
        }, "Must not throw NullPointerException when PolicyVersion.getCreatedBy() is null");
    }

    @Test
    @DisplayName("Verification 7: Policy-Wise Excel Report Export (.xlsx) - 6 Sheets, Scoping & Reconciliation")
    void testPolicySpecificExcelExportGenerationAndScoping() throws Exception {
        LocalDate today = LocalDate.now();

        // 1. Invalid Policy ID returns 404
        ResponseStatusException ex404 = assertThrows(ResponseStatusException.class, () ->
                policyService.exportPolicyDocumentComplianceExcel(99999L, null, "HR_ADMIN"));
        assertEquals(404, ex404.getStatusCode().value());

        // 2. Role Security Enforcement
        ResponseStatusException exEmp = assertThrows(ResponseStatusException.class, () ->
                policyService.exportPolicyDocumentComplianceExcel(docMandatory.getId(), empOps1.getId(), "EMPLOYEE"));
        assertEquals(403, exEmp.getStatusCode().value());

        ResponseStatusException exTrainer = assertThrows(ResponseStatusException.class, () ->
                policyService.exportPolicyDocumentComplianceExcel(docMandatory.getId(), trainerUser.getId(), "TRAINER"));
        assertEquals(403, exTrainer.getStatusCode().value());

        // Setup test data for docMandatory:
        // empOps1: Explicitly Acknowledged
        assign(docMandatory, verMandatoryMajor, empOps1, true, today.plusDays(5));
        acknowledge(docMandatory, verMandatoryMajor, empOps1);

        // empOps2: Overdue (Due date 3 days ago)
        assign(docMandatory, verMandatoryMajor, empOps2, true, today.minusDays(3));

        // empSales1: Pending (Due date 5 days in future)
        assign(docMandatory, verMandatoryMajor, empSales1, true, today.plusDays(5));

        // Null due date employee: (Due date null -> Must be classified as PENDING, never OVERDUE)
        User empOps3 = createUser(99L, "EMP-099", "Ops Employee 3", "emp99@fairmacs.com", "Operations", Role.EMPLOYEE, UserStatus.ACTIVE);
        assign(docMandatory, verMandatoryMajor, empOps3, true, null);

        // Duplicate assignment for empOps2 (e.g. ALL_EMPLOYEES + INDIVIDUAL): Precedence deduplication test
        PolicyAssignment dupAssign = assign(docMandatory, verMandatoryMajor, empOps2, true, today.minusDays(3));
        dupAssign.setAssignmentSource(PolicyAssignmentSource.INDIVIDUAL);

        // 3. HR Admin Export: Organisation-Wide
        PolicyExcelExportResult hrResult = policyService.exportPolicyDocumentComplianceExcel(docMandatory.getId(), null, "HR_ADMIN");
        assertNotNull(hrResult);
        assertEquals("Mandatory_Safety_Policy_POL-MANDATORY_Compliance_Report.xlsx", hrResult.filename());
        assertNotNull(hrResult.excelBytes());
        assertTrue(hrResult.excelBytes().length > 0);

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(hrResult.excelBytes()))) {
            assertEquals(6, wb.getNumberOfSheets(), "Workbook must contain exactly 6 sheets");
            assertEquals("Policy Overview", wb.getSheetAt(0).getSheetName());
            assertEquals("Acknowledged", wb.getSheetAt(1).getSheetName());
            assertEquals("Pending", wb.getSheetAt(2).getSheetName());
            assertEquals("Overdue", wb.getSheetAt(3).getSheetName());
            assertEquals("Derived Compliance", wb.getSheetAt(4).getSheetName());
            assertEquals("Complete Employee List", wb.getSheetAt(5).getSheetName());

            Sheet sOverview = wb.getSheet("Policy Overview");
            Sheet sAck = wb.getSheet("Acknowledged");
            Sheet sPending = wb.getSheet("Pending");
            Sheet sOverdue = wb.getSheet("Overdue");
            Sheet sDerived = wb.getSheet("Derived Compliance");
            Sheet sComplete = wb.getSheet("Complete Employee List");

            // Row counts (excluding header row 0)
            int countAck = sAck.getLastRowNum();
            int countPending = sPending.getLastRowNum();
            int countOverdue = sOverdue.getLastRowNum();
            int countDerived = sDerived.getLastRowNum();
            int countComplete = sComplete.getLastRowNum();

            // Check employee distribution
            assertEquals(1, countAck, "Exactly 1 employee explicitly acknowledged (empOps1)");
            assertEquals(2, countPending, "Exactly 2 pending employees (empSales1 and empOps3 with null due date)");
            assertEquals(1, countOverdue, "Exactly 1 overdue employee (empOps2)");
            assertEquals(0, countDerived, "0 derived compliance for v1.0");
            assertEquals(4, countComplete, "Exactly 4 unique employees assigned (no duplicate rows for empOps2)");

            // Reconciliation assertion:
            assertEquals(countComplete, countAck + countPending + countOverdue + countDerived,
                    "Complete Employee List must reconcile with sum of separate status sheets");

            // Verify empOps1 in Acknowledged sheet has valid checksum and status
            Row ackRow = sAck.getRow(1);
            assertEquals("EMP-001", ackRow.getCell(1).getStringCellValue());
            assertEquals("ACKNOWLEDGED", ackRow.getCell(7).getStringCellValue());
            assertEquals("hash-mandatory-1.0", ackRow.getCell(8).getStringCellValue());

            // Verify empOps2 in Overdue sheet has days overdue > 0
            Row overdueRow = sOverdue.getRow(1);
            assertEquals("EMP-002", overdueRow.getCell(1).getStringCellValue());
            assertEquals("OVERDUE", overdueRow.getCell(9).getStringCellValue());
            assertTrue(overdueRow.getCell(6).getNumericCellValue() >= 3.0, "Days overdue must be >= 3");

            // Verify empOps3 with null due date is in Pending sheet and not overdue
            boolean empOps3FoundInPending = false;
            for (int r = 1; r <= countPending; r++) {
                if ("EMP-099".equals(sPending.getRow(r).getCell(1).getStringCellValue())) {
                    empOps3FoundInPending = true;
                    assertEquals("No Deadline", sPending.getRow(r).getCell(6).getStringCellValue());
                    assertEquals("PENDING", sPending.getRow(r).getCell(9).getStringCellValue());
                }
            }
            assertTrue(empOps3FoundInPending, "Employee with null due date must be in Pending sheet");

            // Verify Overview sheet metrics
            assertEquals("Policy Title", sOverview.getRow(1).getCell(0).getStringCellValue());
            assertEquals("Mandatory Safety Policy", sOverview.getRow(1).getCell(1).getStringCellValue());
            assertEquals("Total Assigned", sOverview.getRow(10).getCell(0).getStringCellValue());
            assertEquals("4", sOverview.getRow(10).getCell(1).getStringCellValue());
        }

        // 4. Manager Department Scoping & Isolation
        // Manager Ops: has employees in Operations (empOps1, empOps2, empOps3)
        PolicyExcelExportResult mgrResult = policyService.exportPolicyDocumentComplianceExcel(docMandatory.getId(), managerOps.getId(), "MANAGER");
        assertNotNull(mgrResult);
        try (Workbook wbMgr = new XSSFWorkbook(new ByteArrayInputStream(mgrResult.excelBytes()))) {
            Sheet sCompleteMgr = wbMgr.getSheet("Complete Employee List");
            int mgrCount = sCompleteMgr.getLastRowNum();
            assertEquals(3, mgrCount, "Manager export must only contain the 3 Operations employees");

            // Sales employee (empSales1) must NOT be present in Ops Manager export
            for (int r = 1; r <= mgrCount; r++) {
                assertNotEquals("EMP-003", sCompleteMgr.getRow(r).getCell(1).getStringCellValue(),
                        "Sales employee must be excluded from Operations Manager export");
            }
        }

        // 5. Unrelated Manager accessing policy with no department members
        // Dept Unrelated (IT) manager has zero employees assigned
        User managerIT = createUser(88L, "MGR-IT", "IT Manager", "mgrit@fairmacs.com", "IT", Role.MANAGER, UserStatus.ACTIVE);
        ResponseStatusException exMgrUnrelated = assertThrows(ResponseStatusException.class, () ->
                policyService.exportPolicyDocumentComplianceExcel(docMandatory.getId(), managerIT.getId(), "MANAGER"));
        assertEquals(403, exMgrUnrelated.getStatusCode().value(),
                "Manager with no assigned department members must receive 403 Forbidden");

        // 6. Minor Version Derived Compliance Verification
        PolicyDocument docMinorDoc = new PolicyDocument();
        docMinorDoc.setId(500L);
        docMinorDoc.setDocumentCode("POL-MINOR-TEST");
        docMinorDoc.setTitle("Minor Revision Policy");
        docMinorDoc.setDocumentStatus(PolicyDocumentStatus.PUBLISHED);
        documentsById.put(500L, docMinorDoc);

        PolicyVersion docMinorV1 = new PolicyVersion();
        docMinorV1.setId(5001L);
        docMinorV1.setPolicyDocument(docMinorDoc);
        docMinorV1.setVersionNumber("1.0");
        docMinorV1.setVersionType(PolicyVersionType.MAJOR);
        docMinorV1.setSha256Hash("sha-minor-v1.0");
        versionsById.put(5001L, docMinorV1);

        PolicyVersion docMinorV11 = new PolicyVersion();
        docMinorV11.setId(5002L);
        docMinorV11.setPolicyDocument(docMinorDoc);
        docMinorV11.setVersionNumber("1.1");
        docMinorV11.setVersionType(PolicyVersionType.MINOR);
        docMinorV11.setSha256Hash("sha-minor-v1.1");
        versionsById.put(5002L, docMinorV11);

        // empOps1 acknowledged v1.0
        acknowledge(docMinorDoc, docMinorV1, empOps1);
        // empOps1 assigned minor v1.1
        assign(docMinorDoc, docMinorV11, empOps1, true, today.plusDays(7));

        PolicyExcelExportResult minorExport = policyService.exportPolicyDocumentComplianceExcel(docMinorDoc.getId(), null, "HR_ADMIN");
        try (Workbook wbMinor = new XSSFWorkbook(new ByteArrayInputStream(minorExport.excelBytes()))) {
            Sheet sAckMinor = wbMinor.getSheet("Acknowledged");
            Sheet sDerivedMinor = wbMinor.getSheet("Derived Compliance");
            Sheet sCompleteMinor = wbMinor.getSheet("Complete Employee List");

            assertEquals(0, sAckMinor.getLastRowNum(), "Derived compliant employee must NOT appear in explicit Acknowledged sheet");
            assertEquals(1, sDerivedMinor.getLastRowNum(), "Employee must appear in Derived Compliance sheet");
            assertEquals(1, sCompleteMinor.getLastRowNum(), "Employee must appear in Complete Employee List");

            Row dRow = sDerivedMinor.getRow(1);
            assertEquals("EMP-001", dRow.getCell(1).getStringCellValue());
            assertEquals("1.1", dRow.getCell(4).getStringCellValue());
            assertEquals("1.0", dRow.getCell(5).getStringCellValue(), "Previous acknowledged version must be 1.0");
            assertEquals("DERIVED COMPLIANCE", dRow.getCell(8).getStringCellValue());
        }
    }
}
