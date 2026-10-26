package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Role;

import com.fairmacs.lms.entity.User;

import com.fairmacs.lms.entity.UserStatus;

import com.fairmacs.lms.repository.DepartmentRepository;

import com.fairmacs.lms.repository.UserRepository;

import org.apache.poi.ss.usermodel.*;

import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import java.io.InputStream;

import java.time.LocalDate;

import java.time.format.DateTimeFormatter;

import java.time.format.DateTimeParseException;

import java.util.*;

@Service

public class EmployeeExcelImportService {

    private static final String DEFAULT_PASSWORD = "Employee@123";

    private static final List<String> ALLOWED_DEPARTMENTS = List.of(

        "Human Resource",

        "Accounts",

        "Admin",

        "Operations",

        "Documentation",

        "Customer Service",

        "Pricing",

        "Sales",

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

    private final UserRepository userRepository;

    private final DepartmentRepository departmentRepository;

    private final PasswordEncoder passwordEncoder;

    public EmployeeExcelImportService(

            UserRepository userRepository,

            DepartmentRepository departmentRepository,

            PasswordEncoder passwordEncoder

    ) {

        this.userRepository = userRepository;

        this.departmentRepository = departmentRepository;

        this.passwordEncoder = passwordEncoder;

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

            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {

                Row row = sheet.getRow(rowIndex);

                if (isEmptyRow(row)) {

                    continue;

                }

                int excelRowNumber = rowIndex + 1;

                try {

                    EmployeeRow employeeRow = readEmployeeRow(

                            row,

                            headers,

                            excelRowNumber

                    );

                    if (departmentRepository.findByNameIgnoreCase(
                            employeeRow.department()
                    ).isEmpty()) {
                        throw new IllegalArgumentException(
                                "Department '" + employeeRow.department()
                                        + "' does not exist in the department master. "
                                        + "Complete the department migration before importing employees."
                        );
                    }

                    String employeeIdKey =

                            employeeRow.employeeId().toLowerCase(Locale.ROOT);

                    String emailKey =

                            employeeRow.email().toLowerCase(Locale.ROOT);

                    if (!employeeIdsInFile.add(employeeIdKey)) {

                        throw new IllegalArgumentException(

                                "Duplicate Employee ID in Excel: "

                                        + employeeRow.employeeId()

                        );

                    }

                    if (!emailsInFile.add(emailKey)) {

                        throw new IllegalArgumentException(

                                "Duplicate email in Excel: "

                                        + employeeRow.email()

                        );

                    }

                    if (userRepository.existsByEmployeeId(

                            employeeRow.employeeId()

                    )) {

                        throw new IllegalArgumentException(

                                "Employee ID already exists: "

                                        + employeeRow.employeeId()

                        );

                    }

                    if (userRepository.existsByEmail(

                            employeeRow.email()

                    )) {

                        throw new IllegalArgumentException(

                                "Email already exists: "

                                        + employeeRow.email()

                        );

                    }

                    rows.add(employeeRow);

                } catch (IllegalArgumentException ex) {

                    errors.add(

                            "Row "

                                    + excelRowNumber

                                    + ": "

                                    + ex.getMessage()

                    );

                }

            }

            /*

             * Do not save anything if even one row is invalid.

             */

            if (!errors.isEmpty()) {

                Map<String, Object> response =

                        new LinkedHashMap<>();

                response.put("success", false);

                response.put("message",

                        "Excel validation failed. No employees were imported.");

                response.put("importedCount", 0);

                response.put("errors", errors);

                return response;

            }

            // Save employees only after the entire Excel file passes validation.
            // Department records are managed separately; imports never create them.

            List<Map<String, Object>> importedEmployees =

                    new ArrayList<>();

            for (EmployeeRow row : rows) {

                User user = new User();

                user.setEmployeeId(

                        row.employeeId()

                );

                user.setName(

                        row.employeeName()

                );

                user.setEmail(

                        row.email().toLowerCase(Locale.ROOT)

                );

                /*

                 * Default temporary password.

                 * Only the BCrypt hash is stored in MySQL.

                 */

                user.setPassword(

                        passwordEncoder.encode(

                                DEFAULT_PASSWORD

                        )

                );

                user.setRole(
                        parseRole(row.role())
                );

                user.setRoleLabel(
                        roleLabel(user.getRole())
                );

                // Level was already validated while reading the Excel row.
                user.setLevel(
                        user.getRole() == Role.TRAINER
                                ? null
                                : row.level()
                );

                user.setDepartment(

                        row.department()

                );

                user.setDesignation(

                        row.designation()

                );

                user.setBranch(

                        row.branch()

                );

                user.setJoiningDate(

                        row.joiningDate()

                );

                user.setStatus(

                        UserStatus.ACTIVE

                );

                User savedUser =

                        userRepository.save(user);

                importedEmployees.add(

                        toEmployeeResponse(savedUser)

                );

            }

            Map<String, Object> response =

                    new LinkedHashMap<>();

            response.put("success", true);

            response.put(

                    "message",

                    "Employees imported successfully."

            );

            response.put(

                    "importedCount",

                    importedEmployees.size()

            );

            response.put(

                    "departmentsCreated",

                    0

            );

            response.put(

                    "temporaryPasswordSet",

                    true

            );

            response.put(

                    "employees",

                    importedEmployees

            );

            return response;

        } catch (IOException e) {

            throw new IllegalArgumentException(

                    "Unable to read the Excel file."

            );

        } catch (Exception e) {

            if (e instanceof IllegalArgumentException) {

                throw (IllegalArgumentException) e;

            }

            throw new IllegalArgumentException(

                    "Unable to process the Excel file: "

                            + e.getMessage()

            );

        }

    }

    // =========================================================

    // FILE VALIDATION

    // =========================================================

    private void validateFile(MultipartFile file) {

        if (file == null || file.isEmpty()) {

            throw new IllegalArgumentException(

                    "Please select an Excel file."

            );

        }

        String filename =

                file.getOriginalFilename();

        if (filename == null

                || !filename.toLowerCase(Locale.ROOT)

                .endsWith(".xlsx")) {

            throw new IllegalArgumentException(

                    "Only .xlsx Excel files are supported."

            );

        }

    }

    // =========================================================

    // HEADER READING

    // =========================================================

    private Map<String, Integer> readHeaders(

            Sheet sheet

    ) {

        Row headerRow =

                sheet.getRow(0);

        if (headerRow == null) {

            throw new IllegalArgumentException(

                    "Excel header row is missing."

            );

        }

        Map<String, Integer> headers =

                new HashMap<>();

        for (Cell cell : headerRow) {

            String header =

                    getCellValue(cell)

                            .trim()

                            .toLowerCase(Locale.ROOT);

            if (!header.isBlank()) {

                headers.put(

                        normalizeHeader(header),

                        cell.getColumnIndex()

                );

            }

        }

        return headers;

    }

    private void validateRequiredHeaders(

            Map<String, Integer> headers

    ) {

        for (String requiredHeader : REQUIRED_HEADERS) {

            if (!headers.containsKey(

                    normalizeHeader(requiredHeader)

            )) {

                throw new IllegalArgumentException(

                        "Missing required Excel column: "

                                + requiredHeader

                );

            }

        }

    }

    private String normalizeHeader(

            String header

    ) {

        return header

                .trim()

                .toLowerCase(Locale.ROOT)

                .replace("_", " ")

                .replace("-", " ")

                .replaceAll("\\s+", " ");

    }

    // =========================================================

    // ROW READING

    // =========================================================

    private EmployeeRow readEmployeeRow(

            Row row,

            Map<String, Integer> headers,

            int excelRowNumber

    ) {

        String employeeId =

                getRequiredCell(

                        row,

                        headers,

                        "employee id"

                );

        String employeeName =

                getRequiredCell(

                        row,

                        headers,

                        "employee name"

                );

        String email =

                getRequiredCell(

                        row,

                        headers,

                        "corporate email"

                );

        String role =

                getRequiredCell(

                        row,

                        headers,

                        "role"

                );

        String department = canonicalDepartment(
                getRequiredCell(row, headers, "department")
        );

        String designation =

                getRequiredCell(

                        row,

                        headers,

                        "designation"

                );

        String branch =

                getRequiredCell(

                        row,

                        headers,

                        "branch/location"

                );

        String joiningDateRaw =

                getRequiredCell(

                        row,

                        headers,

                        "joining date"

                );

        validateEmployeeId(

                employeeId

        );

        validateEmail(

                email

        );

        validateRole(

                role

        );

        String level = getCellValue(
                row.getCell(
                        headers.get(normalizeHeader("level"))
                )
        );

        Role parsedRole = parseRole(role);

        if (parsedRole == Role.TRAINER) {
            // Trainer must never have an L0-L4 level.
            level = null;
        } else {
            if (level == null || level.isBlank()) {
                throw new IllegalArgumentException(
                        "Level is required for Employee, Manager and HR/Admin."
                );
            }

            level = level.trim().toUpperCase(Locale.ROOT);

            if (!Set.of("L0", "L1", "L2", "L3", "L4").contains(level)) {
                throw new IllegalArgumentException(
                        "Invalid level '" + level
                                + "'. Allowed levels: L0, L1, L2, L3, L4."
                );
            }
        }

        String joiningDate =

                parseJoiningDate(

                        row,

                        headers.get(

                                normalizeHeader(

                                        "joining date"

                                )

                        ),

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

        Integer columnIndex =

                headers.get(

                        normalizeHeader(header)

                );

        if (columnIndex == null) {

            throw new IllegalArgumentException(

                    "Missing column: " + header

            );

        }

        String value =

                getCellValue(

                        row.getCell(

                                columnIndex

                        )

                );

        if (value == null

                || value.isBlank()) {

            throw new IllegalArgumentException(

                    header

                            + " cannot be empty."

            );

        }

        return value.trim();

    }

    // =========================================================

    // FIELD VALIDATION

    // =========================================================

    private void validateEmployeeId(

            String employeeId

    ) {

        if (employeeId.length() > 50) {

            throw new IllegalArgumentException(

                    "Employee ID is too long."

            );

        }

    }

    private void validateEmail(

            String email

    ) {

        if (!email.matches(

                "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"

        )) {

            throw new IllegalArgumentException(

                    "Invalid corporate email address."

            );

        }

    }

    private void validateRole(

            String role

    ) {

        parseRole(role);

    }

    private Role parseRole(

            String value

    ) {

        String normalized =

                value

                        .trim()

                        .toUpperCase(Locale.ROOT)

                        .replace(" ", "_")

                        .replace("/", "_");

        return switch (normalized) {

            case "EMPLOYEE" ->

                    Role.EMPLOYEE;

            case "TRAINER" ->

                    Role.TRAINER;

            case "MANAGER" ->

                    Role.MANAGER;

            case "HR_ADMIN",

                 "HRADMIN",

                 "ADMIN",

                 "HR" ->

                    Role.HR_ADMIN;

            default ->

                    throw new IllegalArgumentException(

                            "Invalid role '"

                                    + value

                                    + "'. Allowed values: EMPLOYEE, TRAINER, MANAGER, HR_ADMIN."

                    );

        };

    }

    //==========================================================

    // Department validation

    //==========================================================

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

    // =========================================================

    // JOINING DATE

    // =========================================================

    private String parseJoiningDate(

            Row row,

            int columnIndex,

            String rawValue

    ) {

        Cell cell =

                row.getCell(columnIndex);

        /*

         * Excel native date cell.

         */

        if (cell != null

                && cell.getCellType()

                == CellType.NUMERIC

                && DateUtil.isCellDateFormatted(cell)) {

            LocalDate date =

                    cell.getLocalDateTimeCellValue()

                            .toLocalDate();

            return date.toString();

        }

        String value =

                rawValue.trim();

        List<DateTimeFormatter> formatters =

                List.of(

                        DateTimeFormatter.ISO_LOCAL_DATE,

                        DateTimeFormatter.ofPattern("dd-MM-yyyy"),

                        DateTimeFormatter.ofPattern("dd/MM/yyyy"),

                        DateTimeFormatter.ofPattern("MM-dd-yyyy"),

                        DateTimeFormatter.ofPattern("MM/dd/yyyy")

                );

        for (DateTimeFormatter formatter :

                formatters) {

            try {

                return LocalDate.parse(

                        value,

                        formatter

                ).toString();

            } catch (DateTimeParseException ignored) {

                // Try next format.

            }

        }

        throw new IllegalArgumentException(

                "Invalid Joining Date '"

                        + value

                        + "'. Use YYYY-MM-DD, DD-MM-YYYY or DD/MM/YYYY."

        );

    }

    // =========================================================

    // CELL VALUE

    // =========================================================

    private String getCellValue(

            Cell cell

    ) {

        if (cell == null) {

            return "";

        }

        DataFormatter formatter =

                new DataFormatter();

        return formatter.formatCellValue(

                cell

        );

    }

    private boolean isEmptyRow(

            Row row

    ) {

        if (row == null) {

            return true;

        }

        for (Cell cell : row) {

            if (cell != null

                    && !getCellValue(cell)

                    .trim()

                    .isBlank()) {

                return false;

            }

        }

        return true;

    }

    // =========================================================

    // ROLE LABEL

    // =========================================================

    private String roleLabel(

            Role role

    ) {

        if (role == null) {

            return "Employee";

        }

        if (role == Role.HR_ADMIN) {

            return "HR / Admin";

        }

        String value =

                role.name()

                        .replace('_', ' ')

                        .toLowerCase(Locale.ROOT);

        return Character.toUpperCase(

                value.charAt(0)

        ) + value.substring(1);

    }

    // =========================================================

    // RESPONSE

    // =========================================================

    private Map<String, Object> toEmployeeResponse(

            User user

    ) {

        Map<String, Object> response =

                new LinkedHashMap<>();

        response.put(

                "id",

                user.getEmployeeId()

        );

        response.put(

                "employeeId",

                user.getEmployeeId()

        );

        response.put(

                "userId",

                user.getId()

        );

        response.put(

                "level",
                
                user.getLevel()
        );

        response.put(

                "name",

                user.getName()

        );

        response.put(

                "email",

                user.getEmail()

        );

        response.put(

                "role",

                user.getRole() != null

                        ? user.getRole().name()

                        : "EMPLOYEE"

        );

        response.put(

                "roleLabel",

                user.getRoleLabel()

        );

        response.put(

                "department",

                user.getDepartment()

        );

        response.put(

                "designation",

                user.getDesignation()

        );

        response.put(

                "branch",

                user.getBranch()

        );

        response.put(

                "joiningDate",

                user.getJoiningDate()

        );

        response.put(

                "status",

                user.getStatus() == UserStatus.ACTIVE

                        ? "Active"

                        : "Disabled"

        );

        response.put(

                "avatar",

                user.getAvatar()

        );

        return response;

    }

    // =========================================================

    // INTERNAL ROW MODEL

    // =========================================================

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