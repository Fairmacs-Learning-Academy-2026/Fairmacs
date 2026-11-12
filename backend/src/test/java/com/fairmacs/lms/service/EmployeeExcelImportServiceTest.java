package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.repository.DepartmentRepository;
import com.fairmacs.lms.repository.EmployeeImportAuditLogRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.ByteArrayOutputStream;
import java.lang.reflect.Proxy;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Phase 5 & 8: Employee Excel Import Service, Limits, Template & Audit Log Tests")
class EmployeeExcelImportServiceTest {

    private final Map<Long, User> userStore = new LinkedHashMap<>();
    private final Map<Long, Department> departmentStore = new LinkedHashMap<>();
    private final Map<Long, EmployeeImportAuditLog> auditStore = new LinkedHashMap<>();
    private final List<User> autoEnrolledUsers = new ArrayList<>();
    private final AtomicLong seq = new AtomicLong(100);

    private EmployeeExcelImportService importService;
    private User hrActor;

    @BeforeEach
    void setUp() {
        userStore.clear();
        departmentStore.clear();
        auditStore.clear();
        autoEnrolledUsers.clear();

        Department ops = new Department();
        ops.setId(1L);
        ops.setName("Operations");
        departmentStore.put(1L, ops);

        Department peopleOps = new Department();
        peopleOps.setId(2L);
        peopleOps.setName("People Operations");
        departmentStore.put(2L, peopleOps);

        hrActor = new User();
        hrActor.setId(10L);
        hrActor.setEmployeeId("HR-01");
        hrActor.setName("Priya Nair");
        hrActor.setEmail("priya.nair@fairmacs.com");
        hrActor.setRole(Role.HR_ADMIN);

        UserRepository userRepo = (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "existsByEmployeeId" -> userStore.values().stream()
                            .anyMatch(u -> String.valueOf(args[0]).equalsIgnoreCase(u.getEmployeeId()));
                    case "existsByEmail" -> userStore.values().stream()
                            .anyMatch(u -> String.valueOf(args[0]).equalsIgnoreCase(u.getEmail()));
                    case "save" -> {
                        User u = (User) args[0];
                        if (u.getId() == null) {
                            u.setId(seq.incrementAndGet());
                        }
                        userStore.put(u.getId(), u);
                        yield u;
                    }
                    default -> null;
                }
        );

        DepartmentRepository deptRepo = (DepartmentRepository) Proxy.newProxyInstance(
                DepartmentRepository.class.getClassLoader(),
                new Class<?>[]{DepartmentRepository.class},
                (proxy, method, args) -> {
                    if ("findByNameIgnoreCase".equals(method.getName())) {
                        String name = (String) args[0];
                        return departmentStore.values().stream()
                                .filter(d -> d.getName().equalsIgnoreCase(name))
                                .findFirst();
                    }
                    return Optional.empty();
                }
        );

        EmployeeImportAuditLogRepository auditRepo = (EmployeeImportAuditLogRepository) Proxy.newProxyInstance(
                EmployeeImportAuditLogRepository.class.getClassLoader(),
                new Class<?>[]{EmployeeImportAuditLogRepository.class},
                (proxy, method, args) -> {
                    if ("save".equals(method.getName())) {
                        EmployeeImportAuditLog log = (EmployeeImportAuditLog) args[0];
                        if (log.getId() == null) {
                            log.setId(seq.incrementAndGet());
                        }
                        auditStore.put(log.getId(), log);
                        return log;
                    }
                    return List.copyOf(auditStore.values());
                }
        );

        PasswordEncoder fastEncoder = new PasswordEncoder() {
            @Override
            public String encode(CharSequence rawPassword) {
                return "HASHED:" + rawPassword;
            }

            @Override
            public boolean matches(CharSequence rawPassword, String encodedPassword) {
                return ("HASHED:" + rawPassword).equals(encodedPassword);
            }
        };

        EnrollmentService stubEnrollmentService = new EnrollmentService(
                null, null, null, null, null, null, null, null, null, null, null, null
        ) {
            @Override
            public int enrollEmployeeInMandatoryCourses(User user) {
                autoEnrolledUsers.add(user);
                return 2;
            }
        };

        SecurityContextUtil stubSecurityContext = new SecurityContextUtil(userRepo) {
            @Override
            public User getCurrentUser() {
                return hrActor;
            }
        };

        importService = new EmployeeExcelImportService(
                userRepo,
                deptRepo,
                fastEncoder,
                stubEnrollmentService,
                auditRepo,
                stubSecurityContext
        );
    }

    @Test
    @DisplayName("1. generateImportTemplate creates a valid .xlsx template that can be imported directly")
    void templateDownloadCanBeImportedDirectly() {
        byte[] templateBytes = importService.generateImportTemplate();
        assertNotNull(templateBytes);
        assertTrue(templateBytes.length > 0);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "fairmacs-employee-import-template.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                templateBytes
        );

        Map<String, Object> result = importService.importEmployees(file);
        assertEquals(Boolean.TRUE, result.get("success"));
        assertEquals(1, result.get("importedCount"));
        assertEquals(1, userStore.size());
        assertEquals(1, autoEnrolledUsers.size());
        assertEquals(1, auditStore.size());

        EmployeeImportAuditLog log = auditStore.values().iterator().next();
        assertEquals("COMPLETED", log.getStatus());
        assertEquals(1, log.getImportedCount());
        assertEquals(0, log.getFailedCount());
        assertEquals(hrActor.getId(), log.getImportedByUserId());
        assertEquals("Priya Nair", log.getImportedByName());
    }

    @Test
    @DisplayName("2. Row-level validation catches duplicates, invalid emails, and oversized fields without partial save, and logs VALIDATION_FAILED audit record")
    void rowLevelValidationPreventsPartialSaveAndLogsAuditRecord() throws Exception {
        String overlongName = "A".repeat(260);
        byte[] xlsx = buildWorkbook(List.of(
                List.of("EMP-201", "Valid One", "valid1@fairmacs.com", "EMPLOYEE", "L2", "Human Resource", "Executive", "Chennai", "2026-10-15"),
                List.of("EMP-201", "Duplicate ID", "dup@fairmacs.com", "EMPLOYEE", "P2", "Operations", "Executive", "Chennai", "2026-10-15"),
                List.of("EMP-203", overlongName, "bad-email", "EMPLOYEE", "P9", "Operations", "Executive", "Chennai", "2026-10-15")
        ));

        MockMultipartFile file = new MockMultipartFile("file", "employees.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsx);

        Map<String, Object> result = importService.importEmployees(file);
        assertEquals(Boolean.FALSE, result.get("success"));
        assertEquals(0, result.get("importedCount"));
        assertEquals(2, result.get("failedCount"));
        assertEquals(0, userStore.size(), "No employees should be saved when any row fails validation");

        @SuppressWarnings("unchecked")
        List<String> errors = (List<String>) result.get("errors");
        assertEquals(2, errors.size());
        assertTrue(errors.get(0).contains("Row 3: Duplicate Employee ID in Excel: EMP-201"));
        assertTrue(errors.get(1).contains("Row 4: Employee Name is too long"));

        assertEquals(1, auditStore.size());
        EmployeeImportAuditLog log = auditStore.values().iterator().next();
        assertEquals("VALIDATION_FAILED", log.getStatus());
        assertEquals(3, log.getTotalRows());
        assertEquals(0, log.getImportedCount());
        assertEquals(2, log.getFailedCount());
        assertNotNull(log.getErrorSummary());
    }

    @Test
    @DisplayName("3. Enforces 5 MB file size limit and 500 row count limit")
    void enforcesFileSizeAndRowLimits() throws Exception {
        byte[] oversizedBytes = new byte[(int) (EmployeeExcelImportService.MAX_FILE_SIZE_BYTES + 1024)];
        MockMultipartFile oversizedFile = new MockMultipartFile(
                "file",
                "huge.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                oversizedBytes
        );

        IllegalArgumentException sizeEx = assertThrows(
                IllegalArgumentException.class,
                () -> importService.importEmployees(oversizedFile)
        );
        assertTrue(sizeEx.getMessage().contains("5 MB"));

        List<List<String>> rows = new ArrayList<>();
        for (int i = 1; i <= EmployeeExcelImportService.MAX_IMPORT_ROWS + 2; i++) {
            rows.add(List.of(
                    "EMP-" + i,
                    "User " + i,
                    "user" + i + "@fairmacs.com",
                    "EMPLOYEE",
                    "P2",
                    "Operations",
                    "Executive",
                    "HQ",
                    "2026-11-01"
            ));
        }
        byte[] tooManyRowsXlsx = buildWorkbook(rows);
        MockMultipartFile tooManyRowsFile = new MockMultipartFile(
                "file",
                "too-many-rows.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                tooManyRowsXlsx
        );

        IllegalArgumentException rowEx = assertThrows(
                IllegalArgumentException.class,
                () -> importService.importEmployees(tooManyRowsFile)
        );
        assertTrue(rowEx.getMessage().contains("maximum limit of 500 employee rows"));
    }

    private byte[] buildWorkbook(List<List<String>> dataRows) throws Exception {
        List<String> headers = List.of(
                "Employee ID", "Employee Name", "Corporate Email", "Role",
                "Position", "Department", "Designation", "Branch/Location", "Joining Date"
        );
        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Employees");
            Row headerRow = sheet.createRow(0);
            for (int c = 0; c < headers.size(); c++) {
                headerRow.createCell(c).setCellValue(headers.get(c));
            }
            for (int r = 0; r < dataRows.size(); r++) {
                Row row = sheet.createRow(r + 1);
                List<String> values = dataRows.get(r);
                for (int c = 0; c < values.size(); c++) {
                    row.createCell(c).setCellValue(values.get(c));
                }
            }
            wb.write(out);
            return out.toByteArray();
        }
    }
}
