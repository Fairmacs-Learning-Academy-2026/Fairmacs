package com.fairmacs.lms.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.fairmacs.lms.entity.Department;
import com.fairmacs.lms.entity.EmployeeImportAuditLog;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.repository.DepartmentRepository;
import com.fairmacs.lms.repository.EmployeeImportAuditLogRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.PasswordSecurityUtil;
import com.fairmacs.lms.security.SecurityContextUtil;

@Service
public class EmployeeExcelImportService {

    public static final long MAX_FILE_SIZE_BYTES = 5L * 1024L * 1024L; // 5 MB
    public static final int MAX_IMPORT_ROWS = 500;
    public static final int MAX_FIELD_LENGTH = 255;

    private static final List<String> ALLOWED_DEPARTMENTS = List.of(
            "People Operations",
            "Human Resource",
            "Information Technology",
            "Accounts",
            "Admin",
            "Operations",
            "Documentation",
            "Customer Service",
            "Pricing",
            "Sales",
            "General",
            "General / Common"
    );

    private static final Set<String> REQUIRED_HEADERS = Set.of(
            "employee id",
            "employee name",
            "corporate email",
            "role",
            "level",
            "department",
            "designation",
            "branch/location",
            "joining date"
    );

    private static final List<String> TEMPLATE_HEADERS = List.of(
            "Employee ID",
            "Employee Name",
            "Corporate Email",
            "Role",
            "Position",
            "Department",
            "Designation",
            "Branch/Location",
            "Joining Date"
    );

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private EnrollmentService enrollmentService;
    private EmployeeImportAuditLogRepository importAuditLogRepository;
    private SecurityContextUtil securityContextUtil;

    public EmployeeExcelImportService(
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            PasswordEncoder passwordEncoder
    ) {
        this(userRepository, departmentRepository, passwordEncoder, null, null, null);
    }

    public EmployeeExcelImportService(
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            PasswordEncoder passwordEncoder,
            EnrollmentService enrollmentService
    ) {
        this(userRepository, departmentRepository, passwordEncoder, enrollmentService, null, null);
    }

    @Autowired
    public EmployeeExcelImportService(
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            PasswordEncoder passwordEncoder,
            @Autowired(required = false) EnrollmentService enrollmentService,
            @Autowired(required = false) EmployeeImportAuditLogRepository importAuditLogRepository,
            @Autowired(required = false) SecurityContextUtil securityContextUtil
    ) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.enrollmentService = enrollmentService;
        this.importAuditLogRepository = importAuditLogRepository;
        this.securityContextUtil = securityContextUtil;
    }

    @Autowired(required = false)
    public void setEnrollmentService(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @Autowired(required = false)
    public void setImportAuditLogRepository(EmployeeImportAuditLogRepository importAuditLogRepository) {
        this.importAuditLogRepository = importAuditLogRepository;
    }

    @Autowired(required = false)
    public void setSecurityContextUtil(SecurityContextUtil securityContextUtil) {
        this.securityContextUtil = securityContextUtil;
    }

    /**
     * Generates a downloadable .xlsx template with required columns and an example employee row.
     */
    public byte[] generateImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Employee Import Template");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < TEMPLATE_HEADERS.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(TEMPLATE_HEADERS.get(i));
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 22 * 256);
            }

            List<String> sampleRowValues = List.of(
                    "EMP-1001",
                    "Aarav Sharma",
                    "aarav.sharma@fairmacs.com",
                    "EMPLOYEE",
                    "P2",
                    "Operations",
                    "Executive",
                    "Corporate HQ",
                    LocalDate.now().toString()
            );
            Row sampleRow = sheet.createRow(1);
            for (int i = 0; i < sampleRowValues.size(); i++) {
                sampleRow.createCell(i).setCellValue(sampleRowValues.get(i));
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to generate employee Excel import template.", ex);
        }
    }

    /**
     * Imports employees from an XLSX file.
     *
     * Important:
     * Validation is completed for the entire file before
     * any employee is saved. This prevents partial imports.
     */
    @Transactional
    public Map<String, Object> importEmployees(MultipartFile file) {
        validateFile(file);

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {

            if (workbook.getNumberOfSheets() == 0) {
                throw new IllegalArgumentException(
                        "The Excel file does not contain any worksheet."
                );
            }

            Sheet sheet = workbook.getSheetAt(0);

            if (sheet.getPhysicalNumberOfRows() < 2) {
                throw new IllegalArgumentException(
                        "The Excel file must contain a header row and at least one employee."
                );
            }

            Map<String, Integer> headers = readHeaders(sheet);
            validateRequiredHeaders(headers);

            List<EmployeeRow> rows = new ArrayList<>();
            List<String> errors = new ArrayList<>();
            Set<String> employeeIdsInFile = new HashSet<>();
            Set<String> emailsInFile = new HashSet<>();
            int nonEmptyDataRows = 0;

            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (isEmptyRow(row)) {
                    continue;
                }

                nonEmptyDataRows++;
                if (nonEmptyDataRows > MAX_IMPORT_ROWS) {
                    throw new IllegalArgumentException(
                            "Excel file exceeds the maximum limit of " + MAX_IMPORT_ROWS + " employee rows per import."
                    );
                }

                int excelRowNumber = rowIndex + 1;

                try {
                    EmployeeRow employeeRow = readEmployeeRow(
                            row,
                            headers,
                            excelRowNumber
                    );

                    Department matchedDept = resolveDepartmentMaster(employeeRow.department());
                    if (matchedDept == null) {
                        throw new IllegalArgumentException(
                                "Department '" + employeeRow.department()
                                        + "' does not exist in the department master. "
                                        + "Complete the department migration before importing employees."
                        );
                    }
                    if (matchedDept.getName() != null && !matchedDept.getName().isBlank()) {
                        employeeRow = new EmployeeRow(
                                employeeRow.employeeId(),
                                employeeRow.employeeName(),
                                employeeRow.email(),
                                employeeRow.role(),
                                employeeRow.level(),
                                matchedDept.getName().trim(),
                                employeeRow.designation(),
                                employeeRow.branch(),
                                employeeRow.joiningDate()
                        );
                    }

                    String employeeIdKey = employeeRow.employeeId().toLowerCase(Locale.ROOT);
                    String emailKey = employeeRow.email().toLowerCase(Locale.ROOT);

                    if (!employeeIdsInFile.add(employeeIdKey)) {
                        throw new IllegalArgumentException(
                                "Duplicate Employee ID in Excel: " + employeeRow.employeeId()
                        );
                    }

                    if (!emailsInFile.add(emailKey)) {
                        throw new IllegalArgumentException(
                                "Duplicate email in Excel: " + employeeRow.email()
                        );
                    }

                    if (userRepository.existsByEmployeeId(employeeRow.employeeId())) {
                        throw new IllegalArgumentException(
                                "Employee ID already exists: " + employeeRow.employeeId()
                        );
                    }

                    if (userRepository.existsByEmail(employeeRow.email())) {
                        throw new IllegalArgumentException(
                                "Email already exists: " + employeeRow.email()
                        );
                    }

                    rows.add(employeeRow);

                } catch (IllegalArgumentException ex) {
                    errors.add("Row " + excelRowNumber + ": " + ex.getMessage());
                }
            }

            if (nonEmptyDataRows == 0) {
                throw new IllegalArgumentException(
                        "The Excel file must contain a header row and at least one employee."
                );
            }

            if (!errors.isEmpty()) {
                EmployeeImportAuditLog auditLog = recordImportAuditLog(
                        file.getOriginalFilename(),
                        nonEmptyDataRows,
                        0,
                        errors.size(),
                        "VALIDATION_FAILED",
                        String.join("; ", errors.subList(0, Math.min(errors.size(), 10)))
                );
                Map<String, Object> response = new LinkedHashMap<>();
                response.put("success", false);
                response.put("message", "Excel validation failed. No employees were imported.");
                response.put("importedCount", 0);
                response.put("failedCount", errors.size());
                response.put("totalRows", nonEmptyDataRows);
                if (auditLog != null && auditLog.getId() != null) {
                    response.put("auditLogId", auditLog.getId());
                }
                response.put("errors", errors);
                return response;
            }

            List<Map<String, Object>> importedEmployees = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();

            for (EmployeeRow row : rows) {
                User user = new User();

                user.setEmployeeId(row.employeeId());
                user.setName(row.employeeName());
                user.setEmail(row.email().toLowerCase(Locale.ROOT));

                /*
                 * Generate a unique cryptographically random temporary password.
                 * Only the BCrypt hash is stored in the database, and the user is
                 * required to change their password on first login.
                 */
                String generatedTempPassword = PasswordSecurityUtil.generateSecureTemporaryPassword();
                user.setPassword(passwordEncoder.encode(generatedTempPassword));
                user.setMustChangePassword(true);
                user.setPasswordChangedAt(now);

                user.setRole(parseRole(row.role()));
                user.setRoleLabel(roleLabel(user.getRole()));

                user.setLevel(
                        user.getRole() == Role.TRAINER
                                ? null
                                : row.level()
                );

                user.setDepartment(row.department());
                user.setDesignation(row.designation());
                user.setBranch(row.branch());
                user.setJoiningDate(row.joiningDate());
                user.setStatus(UserStatus.ACTIVE);

                User savedUser = userRepository.save(user);
                if (enrollmentService != null) {
                    enrollmentService.enrollEmployeeInMandatoryCourses(savedUser);
                }
                importedEmployees.add(toEmployeeResponse(savedUser));
            }

            EmployeeImportAuditLog auditLog = recordImportAuditLog(
                    file.getOriginalFilename(),
                    nonEmptyDataRows,
                    importedEmployees.size(),
                    0,
                    "COMPLETED",
                    null
            );

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("message", "Employees imported successfully.");
            response.put("importedCount", importedEmployees.size());
            response.put("failedCount", 0);
            response.put("totalRows", nonEmptyDataRows);
            response.put("departmentsCreated", 0);
            response.put("temporaryPasswordSet", true);
            response.put("mustChangePassword", true);
            if (auditLog != null && auditLog.getId() != null) {
                response.put("auditLogId", auditLog.getId());
            }
            response.put("employees", importedEmployees);

            return response;

        } catch (IOException e) {
            throw new IllegalArgumentException("Unable to read the Excel file.");
        } catch (Exception e) {
            if (e instanceof IllegalArgumentException) {
                throw (IllegalArgumentException) e;
            }
            throw new IllegalArgumentException("Unable to process the Excel file: " + e.getMessage());
        }
    }

    private EmployeeImportAuditLog recordImportAuditLog(
            String fileName,
            int totalRows,
            int importedCount,
            int failedCount,
            String status,
            String errorSummary
    ) {
        if (importAuditLogRepository == null) {
            return null;
        }
        try {
            EmployeeImportAuditLog log = new EmployeeImportAuditLog();
            if (securityContextUtil != null) {
                try {
                    User actor = securityContextUtil.getCurrentUser();
                    if (actor != null) {
                        log.setImportedByUserId(actor.getId());
                        log.setImportedByName(actor.getName());
                    }
                } catch (Exception ignored) {
                    // Unauthenticated or unit-test context
                }
            }
            log.setFileName(fileName != null && fileName.length() > 255 ? fileName.substring(0, 255) : fileName);
            log.setTotalRows(totalRows);
            log.setImportedCount(importedCount);
            log.setFailedCount(failedCount);
            log.setStatus(status);
            log.setErrorSummary(errorSummary);
            log.setCreatedAt(LocalDateTime.now());
            return importAuditLogRepository.save(log);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select an Excel file.");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Excel file size exceeds the maximum allowed limit of 5 MB.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw new IllegalArgumentException("Only .xlsx Excel files are supported.");
        }
    }

    private Map<String, Integer> readHeaders(Sheet sheet) {
        Row headerRow = sheet.getRow(0);
        if (headerRow == null) {
            throw new IllegalArgumentException("Excel header row is missing.");
        }

        Map<String, Integer> headers = new HashMap<>();
        for (Cell cell : headerRow) {
            String header = getCellValue(cell).trim().toLowerCase(Locale.ROOT);
            if (!header.isBlank()) {
                headers.put(normalizeHeader(header), cell.getColumnIndex());
            }
        }
        return headers;
    }

    private void validateRequiredHeaders(Map<String, Integer> headers) {
        for (String requiredHeader : REQUIRED_HEADERS) {
            if ("level".equals(requiredHeader)) {
                if (!headers.containsKey("level") && !headers.containsKey("position")) {
                    throw new IllegalArgumentException("Missing required Excel column: position (or level)");
                }
                continue;
            }
            if (!headers.containsKey(normalizeHeader(requiredHeader))) {
                throw new IllegalArgumentException("Missing required Excel column: " + requiredHeader);
            }
        }
    }

    private String normalizeHeader(String header) {
        return header
                .trim()
                .toLowerCase(Locale.ROOT)
                .replace("_", " ")
                .replace("-", " ")
                .replaceAll("\\s+", " ");
    }

    private EmployeeRow readEmployeeRow(
            Row row,
            Map<String, Integer> headers,
            int excelRowNumber
    ) {
        String employeeId = getRequiredCell(row, headers, "employee id");
        String employeeName = getRequiredCell(row, headers, "employee name");
        String email = getRequiredCell(row, headers, "corporate email");
        String role = getRequiredCell(row, headers, "role");
        String department = canonicalDepartment(getRequiredCell(row, headers, "department"));
        String designation = getRequiredCell(row, headers, "designation");
        String branch = getRequiredCell(row, headers, "branch/location");
        String joiningDateRaw = getRequiredCell(row, headers, "joining date");

        validateEmployeeId(employeeId);
        validateFieldLength("Employee Name", employeeName, MAX_FIELD_LENGTH);
        validateFieldLength("Corporate Email", email, MAX_FIELD_LENGTH);
        validateFieldLength("Designation", designation, MAX_FIELD_LENGTH);
        validateFieldLength("Branch/Location", branch, MAX_FIELD_LENGTH);
        validateEmail(email);
        validateRole(role);

        Integer levelIdx = headers.get(normalizeHeader("position"));
        if (levelIdx == null) {
            levelIdx = headers.get(normalizeHeader("level"));
        }
        String level = levelIdx != null ? getCellValue(row.getCell(levelIdx)) : null;
        Role parsedRole = parseRole(role);

        if (parsedRole == Role.TRAINER) {
            level = null;
        } else {
            if (level == null || level.isBlank()) {
                throw new IllegalArgumentException("Position is required for Employee, Manager and HR/Admin.");
            }
            level = level.trim().toUpperCase(Locale.ROOT);
            if (level.startsWith("L") && level.length() == 2 && Character.isDigit(level.charAt(1))) {
                level = "P" + level.charAt(1);
            }
            if (!Set.of("P0", "P1", "P2", "P3", "P4").contains(level)) {
                throw new IllegalArgumentException(
                        "Invalid position '" + level  + "'. Allowed positions: P0, P1, P2, P3, P4."
                );
            }
        }

        String joiningDate = parseJoiningDate(
                row,
                headers.get(normalizeHeader("joining date")),
                joiningDateRaw
        );

        return new EmployeeRow(
                employeeId.trim(),
                employeeName.trim(),
                email.trim(),
                role.trim(),
                level,
                department.trim(),
                designation.trim(),
                branch.trim(),
                joiningDate
        );
    }

    private String getRequiredCell(
            Row row,
            Map<String, Integer> headers,
            String header
    ) {
        Integer columnIndex = headers.get(normalizeHeader(header));
        if (columnIndex == null) {
            throw new IllegalArgumentException("Missing column: " + header);
        }

        String value = getCellValue(row.getCell(columnIndex));
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(header + " cannot be empty.");
        }

        return value.trim();
    }

    private void validateEmployeeId(String employeeId) {
        if (employeeId.length() > 50) {
            throw new IllegalArgumentException("Employee ID is too long (maximum 50 characters).");
        }
    }

    private void validateFieldLength(String fieldLabel, String value, int maxLength) {
        if (value != null && value.length() > maxLength) {
            throw new IllegalArgumentException(fieldLabel + " is too long (maximum " + maxLength + " characters).");
        }
    }

    private void validateEmail(String email) {
        if (!email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new IllegalArgumentException("Invalid corporate email address.");
        }
    }

    private void validateRole(String role) {
        parseRole(role);
    }

    private Role parseRole(String value) {
        String normalized = value
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace(" ", "_")
                .replace("/", "_");

        return switch (normalized) {
            case "EMPLOYEE" -> Role.EMPLOYEE;
            case "TRAINER" -> Role.TRAINER;
            case "MANAGER" -> Role.MANAGER;
            case "HR_ADMIN", "HRADMIN", "ADMIN", "HR" -> Role.HR_ADMIN;
            default -> throw new IllegalArgumentException(
                    "Invalid role '" + value + "'. Allowed values: EMPLOYEE, TRAINER, MANAGER, HR_ADMIN."
            );
        };
    }

    private String canonicalDepartment(String department) {
        String normalized = department.trim().replaceAll("\\s+", " ");
        return ALLOWED_DEPARTMENTS.stream()
                .filter(allowed -> allowed.equalsIgnoreCase(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid department '" + department
                                + "'. Allowed departments: "
                                + String.join(", ", ALLOWED_DEPARTMENTS)
                ));
    }

    private Department resolveDepartmentMaster(String departmentName) {
        if (departmentName == null || departmentName.isBlank()) {
            return null;
        }
        String clean = departmentName.trim();
        Department exact = departmentRepository.findByNameIgnoreCase(clean).orElse(null);
        if (exact != null) {
            return exact;
        }
        if (clean.equalsIgnoreCase("Human Resource") || clean.equalsIgnoreCase("People Operations")) {
            Department alt = departmentRepository.findByNameIgnoreCase("People Operations")
                    .orElseGet(() -> departmentRepository.findByNameIgnoreCase("Human Resource").orElse(null));
            if (alt != null) {
                return alt;
            }
        }
        if (clean.equalsIgnoreCase("General") || clean.equalsIgnoreCase("General / Common")) {
            Department alt = departmentRepository.findByNameIgnoreCase("General")
                    .orElseGet(() -> departmentRepository.findByNameIgnoreCase("General / Common").orElse(null));
            if (alt != null) {
                return alt;
            }
        }
        return null;
    }

    private String parseJoiningDate(Row row, int columnIndex, String rawValue) {
        Cell cell = row.getCell(columnIndex);

        if (cell != null
                && cell.getCellType() == CellType.NUMERIC
                && DateUtil.isCellDateFormatted(cell)) {
            LocalDate date = cell.getLocalDateTimeCellValue().toLocalDate();
            return date.toString();
        }

        String value = rawValue.trim();

        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("dd-MM-yyyy"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                DateTimeFormatter.ofPattern("MM-dd-yyyy"),
                DateTimeFormatter.ofPattern("MM/dd/yyyy")
        );

        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(value, formatter).toString();
            } catch (DateTimeParseException ignored) {
                // Try next format.
            }
        }

        throw new IllegalArgumentException(
                "Invalid Joining Date '" + value + "'. Use YYYY-MM-DD, DD-MM-YYYY or DD/MM/YYYY."
        );
    }

    private String getCellValue(Cell cell) {
        if (cell == null) {
            return "";
        }
        DataFormatter formatter = new DataFormatter();
        return formatter.formatCellValue(cell);
    }

    private boolean isEmptyRow(Row row) {
        if (row == null) {
            return true;
        }
        for (Cell cell : row) {
            if (cell != null && !getCellValue(cell).trim().isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String roleLabel(Role role) {
        if (role == null) {
            return "Employee";
        }
        if (role == Role.HR_ADMIN) {
            return "HR / Admin";
        }
        String value = role.name().replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    private Map<String, Object> toEmployeeResponse(User user) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", user.getEmployeeId());
        response.put("employeeId", user.getEmployeeId());
        response.put("userId", user.getId());
        response.put("level", user.getLevel());
        response.put("position", user.getLevel());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole() != null ? user.getRole().name() : "EMPLOYEE");
        response.put("roleLabel", user.getRoleLabel());
        response.put("department", user.getDepartment());
        response.put("designation", user.getDesignation());
        response.put("branch", user.getBranch());
        response.put("joiningDate", user.getJoiningDate());
        response.put("status", user.getStatus() == UserStatus.ACTIVE ? "Active" : "Disabled");
        response.put("avatar", user.getAvatar());
        response.put("mustChangePassword", Boolean.TRUE.equals(user.getMustChangePassword()));
        return response;
    }

    private record EmployeeRow(
            String employeeId,
            String employeeName,
            String email,
            String role,
            String level,
            String department,
            String designation,
            String branch,
            String joiningDate
    ) {
    }
}
