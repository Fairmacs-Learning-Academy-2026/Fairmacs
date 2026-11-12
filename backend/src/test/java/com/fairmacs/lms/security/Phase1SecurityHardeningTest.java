package com.fairmacs.lms.security;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.fairmacs.lms.config.DataInitializer;
import com.fairmacs.lms.controller.AuthController;
import com.fairmacs.lms.controller.CourseController;
import com.fairmacs.lms.controller.DepartmentController;
import com.fairmacs.lms.controller.HrAdminController;
import com.fairmacs.lms.controller.ManagerReportController;
import com.fairmacs.lms.controller.ManagerReportsController;
import com.fairmacs.lms.controller.QuizProgressController;
import com.fairmacs.lms.dto.ApiResponse;
import com.fairmacs.lms.dto.EmployeeTrainingTranscriptDTO;
import com.fairmacs.lms.dto.LoginRequest;
import com.fairmacs.lms.dto.LoginResponse;
import com.fairmacs.lms.dto.ManagerReportDTO;
import com.fairmacs.lms.entity.Certificate;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizProgress;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.QuizProgressRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.service.CertificateService;
import com.fairmacs.lms.service.HrAdminService;
import com.fairmacs.lms.service.ManagerReportService;
import com.fairmacs.lms.service.ManagerReportsService;
import com.fairmacs.lms.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class Phase1SecurityHardeningTest {

    private static final String TEST_JWT_SECRET =
            "fairmacs_phase1_test_secret_key_with_more_than_32_bytes_entropy_2026";

    private final Map<Long, User> userStore = new HashMap<>();
    private final AtomicLong userIdSeq = new AtomicLong(1L);

    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private LoginAttemptService loginAttemptService;
    private UserRepository userRepository;
    private SecurityContextUtil securityContextUtil;
    private UserService userService;
    private AuthController authController;
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        userStore.clear();
        userIdSeq.set(1L);

        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new JwtService(TEST_JWT_SECRET, 3_600_000L);
        loginAttemptService = new LoginAttemptService(5, 20, 60L, true);
        userRepository = createUserRepositoryProxy();
        securityContextUtil = new SecurityContextUtil(userRepository);

        AuthenticationManager authManager = authentication -> {
            String loginId = String.valueOf(authentication.getPrincipal());
            String rawPassword = String.valueOf(authentication.getCredentials());
            User found = findUserByLoginId(loginId).orElseThrow(
                    () -> new BadCredentialsException("Bad credentials")
            );
            if (!passwordEncoder.matches(rawPassword, found.getPassword())) {
                throw new BadCredentialsException("Bad credentials");
            }
            return new UsernamePasswordAuthenticationToken(
                    found.getEmail(),
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + found.getRole().name()))
            );
        };

        userService = new UserService(
                userRepository,
                jwtService,
                authManager,
                passwordEncoder,
                loginAttemptService
        );
        authController = new AuthController(userService, securityContextUtil);
        jwtAuthenticationFilter = new JwtAuthenticationFilter(userRepository, jwtService);
    }

    // ========================================================================
    // 1. AUTHENTICATION TESTS
    // ========================================================================

    @Test
    void testValidLoginAndGenericFailureMessages() {
        User employee = createAndSaveUser("EMP1001", "arjun@fairmacs.com", "ValidPass#2026", Role.EMPLOYEE, "Operations", false);

        // Valid login by employee ID
        LoginRequest validReq = new LoginRequest("EMP1001", "ValidPass#2026");
        ResponseEntity<ApiResponse<LoginResponse>> okResp = authController.login(validReq, createMockRequest("POST", "/api/auth/login", null));
        assertEquals(HttpStatus.OK, okResp.getStatusCode());
        assertNotNull(okResp.getBody());
        assertTrue(okResp.getBody().isSuccess());
        assertNotNull(okResp.getBody().getData().getToken());
        assertFalse(okResp.getBody().getData().isMustChangePassword());
        assertEquals(employee.getId(), okResp.getBody().getData().getId());

        // Wrong password returns generic 401
        LoginRequest wrongPassReq = new LoginRequest("EMP1001", "WrongPass#999");
        ResponseEntity<ApiResponse<LoginResponse>> failResp1 = authController.login(wrongPassReq, createMockRequest("POST", "/api/auth/login", null));
        assertEquals(HttpStatus.UNAUTHORIZED, failResp1.getStatusCode());
        assertEquals(UserService.GENERIC_LOGIN_ERROR, failResp1.getBody().getMessage());

        // Non-existent account returns identical generic 401 (no account enumeration)
        LoginRequest unknownUserReq = new LoginRequest("NON_EXISTENT_999", "WrongPass#999");
        ResponseEntity<ApiResponse<LoginResponse>> failResp2 = authController.login(unknownUserReq, createMockRequest("POST", "/api/auth/login", null));
        assertEquals(HttpStatus.UNAUTHORIZED, failResp2.getStatusCode());
        assertEquals(UserService.GENERIC_LOGIN_ERROR, failResp2.getBody().getMessage());

        // Disabled account returns identical generic 401 (no state enumeration)
        employee.setStatus(UserStatus.INACTIVE);
        ResponseEntity<ApiResponse<LoginResponse>> disabledResp = authController.login(validReq, createMockRequest("POST", "/api/auth/login", null));
        assertEquals(HttpStatus.UNAUTHORIZED, disabledResp.getStatusCode());
        assertEquals(UserService.GENERIC_LOGIN_ERROR, disabledResp.getBody().getMessage());

        // Blank login ID returns 400 Bad Request, NOT 401
        LoginRequest badReq = new LoginRequest("   ", "ValidPass#2026");
        ResponseEntity<ApiResponse<LoginResponse>> badResp = authController.login(badReq, createMockRequest("POST", "/api/auth/login", null));
        assertEquals(HttpStatus.BAD_REQUEST, badResp.getStatusCode());
    }

    @Test
    void testUnauthenticatedAndInvalidJwtRejected() throws Exception {
        // Unauthenticated /api/auth/me and /api/auth/change-password rejected with 401
        SecurityContextHolder.clearContext();
        ResponseEntity<ApiResponse<LoginResponse>> meResp = authController.getCurrentUser();
        assertEquals(HttpStatus.UNAUTHORIZED, meResp.getStatusCode());

        ResponseEntity<ApiResponse<LoginResponse>> cpResp = authController.changePassword(
                Map.of("currentPassword", "OldPass#2026", "newPassword", "NewPass#2026")
        );
        assertEquals(HttpStatus.UNAUTHORIZED, cpResp.getStatusCode());

        // Invalid & expired JWT rejected by JwtService
        assertFalse(jwtService.isTokenValid("invalid.jwt.token"));
        JwtService expiredJwtService = new JwtService(TEST_JWT_SECRET, 1L);
        String shortToken = expiredJwtService.generateToken("arjun@fairmacs.com");
        Thread.sleep(15L);
        assertFalse(jwtService.isTokenValid(shortToken));

        // Weak or placeholder JWT secrets rejected at startup
        assertThrows(IllegalStateException.class, () -> new JwtService("short_secret", 3600000L));
        assertThrows(IllegalStateException.class, () -> new JwtService("your_jwt_secret_key_minimum_256_bits_length", 3600000L));
    }

    // ========================================================================
    // 2. FIRST-LOGIN PASSWORD CHANGE & TOKEN INVALIDATION TESTS
    // ========================================================================

    @Test
    void testFirstLoginPasswordChangeEnforcementAndTokenRotation() throws Exception {
        User tempUser = createAndSaveUser("EMP2001", "temp.user@fairmacs.com", "InitTemp#2026", Role.EMPLOYEE, "Operations", true);

        // Login succeeds and indicates mustChangePassword = true
        LoginResponse loginRes = userService.login(new LoginRequest("EMP2001", "InitTemp#2026"), "10.0.0.1");
        assertTrue(loginRes.isMustChangePassword());
        String initialToken = loginRes.getToken();
        assertNotNull(initialToken);

        // Attempt to access normal LMS endpoint (/api/courses) while mustChangePassword = true -> blocked with 403
        AtomicBoolean chainCalledForCourses = new AtomicBoolean(false);
        StringWriter bodyWriter = new StringWriter();
        AtomicInteger statusHolder = new AtomicInteger(200);

        HttpServletRequest coursesReq = createMockRequest("GET", "/api/courses", "Bearer " + initialToken);
        HttpServletResponse coursesRes = createMockResponse(statusHolder, bodyWriter);
        FilterChain chain = (req, res) -> chainCalledForCourses.set(true);

        jwtAuthenticationFilter.doFilter(coursesReq, coursesRes, chain);
        assertFalse(chainCalledForCourses.get(), "Filter chain must not proceed when mustChangePassword is true");
        assertEquals(HttpServletResponse.SC_FORBIDDEN, statusHolder.get());
        assertTrue(bodyWriter.toString().contains("PASSWORD_CHANGE_REQUIRED"));

        // Attempt to access /api/auth/change-password while mustChangePassword = true -> allowed through filter
        AtomicBoolean chainCalledForChangePwd = new AtomicBoolean(false);
        AtomicInteger changePwdStatus = new AtomicInteger(200);
        HttpServletRequest changePwdReq = createMockRequest("POST", "/api/auth/change-password", "Bearer " + initialToken);
        HttpServletResponse changePwdRes = createMockResponse(changePwdStatus, new StringWriter());

        jwtAuthenticationFilter.doFilter(changePwdReq, changePwdRes, (req, res) -> {
            chainCalledForChangePwd.set(true);
            // Inside the authenticated filter execution, invoke AuthController.changePassword
            // Also verify that attempting to pass another user's ID in payload is ignored
            ResponseEntity<ApiResponse<LoginResponse>> controllerRes = authController.changePassword(
                    Map.of(
                            "userId", "999999",
                            "currentPassword", "InitTemp#2026",
                            "newPassword", "StrongNewPass#2026"
                    )
            );
            assertEquals(HttpStatus.OK, controllerRes.getStatusCode());
            assertNotNull(controllerRes.getBody().getData());
            assertFalse(controllerRes.getBody().getData().isMustChangePassword());
            assertNotNull(controllerRes.getBody().getData().getToken());
            assertNotEquals(initialToken, controllerRes.getBody().getData().getToken());
        });

        assertTrue(chainCalledForChangePwd.get());
        assertFalse(tempUser.getMustChangePassword());
        assertNotNull(tempUser.getPasswordChangedAt());

        // Old password no longer works; new password works
        assertThrows(BadCredentialsException.class,
                () -> userService.login(new LoginRequest("EMP2001", "InitTemp#2026"), "10.0.0.1"));
        LoginResponse reloginRes = userService.login(new LoginRequest("EMP2001", "StrongNewPass#2026"), "10.0.0.1");
        assertFalse(reloginRes.isMustChangePassword());

        // Old token (issued before passwordChangedAt) is rejected by JwtAuthenticationFilter
        SecurityContextHolder.clearContext();
        HttpServletRequest oldTokenReq = createMockRequest("GET", "/api/courses", "Bearer " + initialToken);
        HttpServletResponse oldTokenRes = createMockResponse(new AtomicInteger(200), new StringWriter());
        jwtAuthenticationFilter.doFilter(oldTokenReq, oldTokenRes, (req, res) -> {
            assertNull(SecurityContextHolder.getContext().getAuthentication(),
                    "Token issued prior to password change must not authenticate");
        });

        // New token works for normal LMS endpoints
        SecurityContextHolder.clearContext();
        AtomicBoolean newTokenAuthenticated = new AtomicBoolean(false);
        HttpServletRequest newTokenReq = createMockRequest("GET", "/api/courses", "Bearer " + reloginRes.getToken());
        HttpServletResponse newTokenRes = createMockResponse(new AtomicInteger(200), new StringWriter());
        jwtAuthenticationFilter.doFilter(newTokenReq, newTokenRes, (req, res) -> {
            newTokenAuthenticated.set(SecurityContextHolder.getContext().getAuthentication() != null);
        });
        assertTrue(newTokenAuthenticated.get(), "Newly minted token after password change must authenticate");
    }

    // ========================================================================
    // 3. AUTHORIZATION & RBAC TESTS
    // ========================================================================

    @Test
    void testEmployeeAndManagerAuthorizationAndOwnershipBoundaries() throws Exception {
        User empOps1 = createAndSaveUser("EMP101", "emp1@fairmacs.com", "Pass#101A", Role.EMPLOYEE, "Operations", false);
        User empOps2 = createAndSaveUser("EMP102", "emp2@fairmacs.com", "Pass#102A", Role.EMPLOYEE, "Operations", false);
        User empSales = createAndSaveUser("EMP103", "emp3@fairmacs.com", "Pass#103A", Role.EMPLOYEE, "Sales", false);
        User mgrOps = createAndSaveUser("MGR201", "mgr.ops@fairmacs.com", "Pass#201A", Role.MANAGER, "Operations", false);
        User mgrSales = createAndSaveUser("MGR202", "mgr.sales@fairmacs.com", "Pass#202A", Role.MANAGER, "Sales", false);
        User hrAdmin = createAndSaveUser("HR301", "hr@fairmacs.com", "Pass#301A", Role.HR_ADMIN, "Human Resource", false);

        // --- QuizProgressController ownership & safe DTO ---
        Quiz quiz = new Quiz();
        quiz.setId(10L);
        QuizProgress progressOps1 = new QuizProgress();
        progressOps1.setId(500L);
        progressOps1.setQuiz(quiz);
        progressOps1.setUser(empOps1);
        progressOps1.setAttemptsUsed(2);
        progressOps1.setBestScore(85);
        progressOps1.setPassed(true);

        QuizProgressRepository qpRepo = (QuizProgressRepository) Proxy.newProxyInstance(
                QuizProgressRepository.class.getClassLoader(),
                new Class<?>[]{QuizProgressRepository.class},
                (proxy, method, args) -> {
                    if ("findByQuizIdAndUserId".equals(method.getName())) {
                        Long qId = (Long) args[0];
                        Long uId = (Long) args[1];
                        if (qId.equals(10L) && uId.equals(empOps1.getId())) {
                            return Optional.of(progressOps1);
                        }
                        return Optional.empty();
                    }
                    if ("findByUserId".equals(method.getName())) {
                        Long uId = (Long) args[0];
                        if (uId.equals(empOps1.getId())) {
                            return List.of(progressOps1);
                        }
                        return Collections.emptyList();
                    }
                    return null;
                }
        );

        QuizProgressController quizProgressController = new QuizProgressController(qpRepo, securityContextUtil, userRepository);

        // Employee 1 can view own quiz progress and DTO contains no password hash
        setSecurityContext(empOps1);
        ResponseEntity<Map<String, Object>> ownQp = quizProgressController.getProgress(10L, empOps1.getId());
        assertEquals(HttpStatus.OK, ownQp.getStatusCode());
        assertEquals(85, ownQp.getBody().get("bestScore"));
        assertFalse(ownQp.getBody().containsKey("password"));
        assertFalse(ownQp.getBody().containsKey("user"));

        // Employee 2 CANNOT view Employee 1's quiz progress
        setSecurityContext(empOps2);
        assertThrows(SecurityException.class, () -> quizProgressController.getProgress(10L, empOps1.getId()));
        assertThrows(SecurityException.class, () -> quizProgressController.getUserProgress(empOps1.getId()));

        // Operations Manager CAN view Operations Employee 1's quiz progress, but CANNOT view Sales Employee's quiz progress
        setSecurityContext(mgrOps);
        assertEquals(HttpStatus.OK, quizProgressController.getProgress(10L, empOps1.getId()).getStatusCode());
        assertThrows(SecurityException.class, () -> quizProgressController.getUserProgress(empSales.getId()));

        // --- CertificateService ownership & department scoping ---
        Course course = new Course();
        course.setId(20L);
        course.setCourseId("CRS-01");
        course.setTitle("Safety Compliance");

        Certificate certOps1 = new Certificate();
        certOps1.setId(1L);
        certOps1.setCertificateId("FM-CERT-2026-0001");
        certOps1.setUser(empOps1);
        certOps1.setCourse(course);
        certOps1.setScore(92);

        CertificateRepository certRepo = (CertificateRepository) Proxy.newProxyInstance(
                CertificateRepository.class.getClassLoader(),
                new Class<?>[]{CertificateRepository.class},
                (proxy, method, args) -> {
                    if ("findByCertificateIdWithDetails".equals(method.getName())) {
                        return "FM-CERT-2026-0001".equals(args[0]) ? Optional.of(certOps1) : Optional.empty();
                    }
                    if ("findByUserIdWithCourse".equals(method.getName())) {
                        return empOps1.getId().equals(args[0]) ? List.of(certOps1) : Collections.emptyList();
                    }
                    return Collections.emptyList();
                }
        );
        CourseRepository courseRepo = (CourseRepository) Proxy.newProxyInstance(
                CourseRepository.class.getClassLoader(),
                new Class<?>[]{CourseRepository.class},
                (proxy, method, args) -> Optional.of(course)
        );

        CertificateService certificateService = new CertificateService(certRepo, userRepository, courseRepo, securityContextUtil, null);

        // Employee 2 cannot view Employee 1's certificates
        setSecurityContext(empOps2);
        assertThrows(SecurityException.class, () -> certificateService.getCertificatesByUser(empOps1.getId()));
        assertThrows(SecurityException.class, () -> certificateService.verifyCertificate("FM-CERT-2026-0001"));

        // Sales Manager cannot view Operations Employee 1's certificates
        setSecurityContext(mgrSales);
        assertThrows(SecurityException.class, () -> certificateService.getCertificatesByUser(empOps1.getId()));
        assertThrows(SecurityException.class, () -> certificateService.verifyCertificate("FM-CERT-2026-0001"));

        // Operations Manager CAN view Operations Employee 1's certificates
        setSecurityContext(mgrOps);
        assertEquals(1, certificateService.getCertificatesByUser(empOps1.getId()).size());
        assertEquals("FM-CERT-2026-0001", certificateService.verifyCertificate("FM-CERT-2026-0001").getCertificateId());

        // --- ManagerReportController & ManagerReportsController scoping ---
        EnrollmentRepository enrollRepo = (EnrollmentRepository) Proxy.newProxyInstance(
                EnrollmentRepository.class.getClassLoader(),
                new Class<?>[]{EnrollmentRepository.class},
                (proxy, method, args) -> Collections.emptyList()
        );
        ManagerReportService mgrReportService = new ManagerReportService(userRepository, enrollRepo);
        ManagerReportController mgrReportController = new ManagerReportController(mgrReportService, securityContextUtil);

        ManagerReportsService mgrReportsService = new ManagerReportsService(userRepository, enrollRepo);
        ManagerReportsController mgrReportsController = new ManagerReportsController(mgrReportsService, securityContextUtil, userRepository);

        // Operations Manager cannot query Sales Manager's report ID
        setSecurityContext(mgrOps);
        assertThrows(SecurityException.class, () -> mgrReportController.getManagerReports(mgrSales.getId()));
        // Operations Manager CAN query their own report ID
        ResponseEntity<ManagerReportDTO> ownMgrReport = mgrReportController.getManagerReports(mgrOps.getId());
        assertEquals(HttpStatus.OK, ownMgrReport.getStatusCode());

        // Operations Manager cannot query Sales Employee's training transcript
        assertThrows(SecurityException.class, () -> mgrReportsController.getEmployeeTrainingTranscript(empSales.getId()));
        // Operations Manager CAN query Operations Employee's training transcript
        ResponseEntity<EmployeeTrainingTranscriptDTO> opsTranscript = mgrReportsController.getEmployeeTrainingTranscript(empOps1.getId());
        assertEquals(HttpStatus.OK, opsTranscript.getStatusCode());

        // Employee 2 cannot query Employee 1's training transcript
        setSecurityContext(empOps2);
        assertThrows(SecurityException.class, () -> mgrReportsController.getEmployeeTrainingTranscript(empOps1.getId()));

        // HR Admin can query any manager report and employee transcript
        setSecurityContext(hrAdmin);
        assertEquals(HttpStatus.OK, mgrReportController.getManagerReports(mgrSales.getId()).getStatusCode());
        assertEquals(HttpStatus.OK, mgrReportsController.getEmployeeTrainingTranscript(empSales.getId()).getStatusCode());
    }

    @Test
    void testMethodLevelRoleAnnotationsOnControllers() throws Exception {
        // Verify HrAdminController HR-only endpoints enforce @PreAuthorize("hasRole('HR_ADMIN')")
        assertPreAuthorizeContains(HrAdminController.class.getMethod("createEmployee", Map.class), "HR_ADMIN");
        assertPreAuthorizeContains(HrAdminController.class.getMethod("updateEmployee", String.class, Map.class), "HR_ADMIN");
        assertPreAuthorizeContains(HrAdminController.class.getMethod("deactivateEmployee", String.class), "HR_ADMIN");
        assertPreAuthorizeContains(HrAdminController.class.getMethod("changeEmployeeStatus", String.class, Map.class), "HR_ADMIN");
        assertPreAuthorizeContains(HrAdminController.class.getMethod("resetEmployeePassword", String.class, Map.class), "HR_ADMIN");

        // Verify CourseController authoring endpoints enforce HR_ADMIN or TRAINER
        assertPreAuthorizeContains(CourseController.class.getMethod("getCourseForEditing", String.class), "HR_ADMIN");
        assertPreAuthorizeContains(CourseController.class.getMethod("getCourseForEditing", String.class), "TRAINER");
        assertPreAuthorizeContains(CourseController.class.getMethod("deleteCourse", String.class), "HR_ADMIN");
        assertPreAuthorizeContains(CourseController.class.getMethod("deleteCourse", String.class), "TRAINER");

        // Verify DepartmentController detail endpoints enforce HR_ADMIN, TRAINER, or MANAGER
        assertPreAuthorizeContains(DepartmentController.class.getMethod("getDepartmentEmployees", Long.class), "HR_ADMIN");
        assertPreAuthorizeContains(DepartmentController.class.getMethod("getDepartmentDetails", Long.class), "MANAGER");
    }

    // ========================================================================
    // 4. BOOTSTRAP, CREDENTIALS & SERIALIZATION TESTS
    // ========================================================================

    @Test
    void testBootstrapAndCredentialHardening() throws Exception {
        // 1. DataInitializer is restricted to @Profile("local") and opt-in property
        Profile profileAnnotation = DataInitializer.class.getAnnotation(Profile.class);
        assertNotNull(profileAnnotation, "DataInitializer must be annotated with @Profile");
        assertEquals("local", profileAnnotation.value()[0]);

        ConditionalOnProperty condAnnotation = DataInitializer.class.getAnnotation(ConditionalOnProperty.class);
        assertNotNull(condAnnotation, "DataInitializer must require explicit opt-in property");
        assertEquals("app.seed.sample-users.enabled", condAnnotation.name()[0]);
        assertEquals("true", condAnnotation.havingValue());
        assertFalse(condAnnotation.matchIfMissing());

        // 2. When DataInitializer runs locally, seeded users have mustChangePassword = true and never use known defaults
        DataInitializer initializer = new DataInitializer(userRepository, passwordEncoder);
        initializer.run();
        assertEquals(4, userStore.size());
        for (User seeded : userStore.values()) {
            assertTrue(seeded.getMustChangePassword(), "Seeded user must require first-login password change");
            assertFalse(passwordEncoder.matches("Employee@123", seeded.getPassword()));
            assertFalse(passwordEncoder.matches("Trainer@123", seeded.getPassword()));
            assertFalse(passwordEncoder.matches("Manager@123", seeded.getPassword()));
            assertFalse(passwordEncoder.matches("Admin@123", seeded.getPassword()));
        }

        // 3. HrAdminService createEmployee & resetEmployeePassword never return password hashes or plaintext passwords
        EnrollmentRepository enrollRepo = (EnrollmentRepository) Proxy.newProxyInstance(
                EnrollmentRepository.class.getClassLoader(),
                new Class<?>[]{EnrollmentRepository.class},
                (proxy, method, args) -> Collections.emptyList()
        );
        CertificateRepository certRepo = (CertificateRepository) Proxy.newProxyInstance(
                CertificateRepository.class.getClassLoader(),
                new Class<?>[]{CertificateRepository.class},
                (proxy, method, args) -> 0L
        );
        HrAdminService hrAdminService = new HrAdminService(userRepository, enrollRepo, certRepo, passwordEncoder);

        // Known weak defaults are rejected
        assertThrows(IllegalArgumentException.class, () -> hrAdminService.createEmployee(Map.of(
                "id", "EMP9001",
                "name", "New Hire",
                "email", "newhire@fairmacs.com",
                "role", "EMPLOYEE",
                "level", "L1",
                "password", "Employee@123"
        )));

        Map<String, Object> createdResp = hrAdminService.createEmployee(Map.of(
                "id", "EMP9001",
                "name", "New Hire",
                "email", "newhire@fairmacs.com",
                "role", "EMPLOYEE",
                "level", "L1"
        ));
        assertFalse(createdResp.containsKey("password"));
        assertEquals(true, createdResp.get("mustChangePassword"));

        Map<String, Object> resetResp = hrAdminService.resetEmployeePassword("EMP9001", null);
        assertFalse(resetResp.containsKey("password"));
        assertFalse(resetResp.containsKey("newPassword"));
        assertEquals(true, resetResp.get("mustChangePassword"));
        assertEquals(true, resetResp.get("temporaryPasswordSet"));

        // 4. User entity never serializes password hash in JSON
        User sampleUser = userStore.values().iterator().next();
        String serializedUser = new ObjectMapper().findAndRegisterModules().writeValueAsString(sampleUser);
        assertFalse(serializedUser.contains(sampleUser.getPassword()));
        assertFalse(serializedUser.contains("\"password\""));
    }

    @Test
    void testLocalDevelopmentRoleSeedingPreservesExistingUsersAndAuthenticatesAllFourRoles() throws Exception {
        // Pre-populate existing database users (simulating existing Supabase rows like EMP1001)
        User existingEmp = createAndSaveUser(
                "EMP1001", "arjun.kumar@fairmacs.com", "ExistingPass#2025!", Role.EMPLOYEE, "Operations", false
        );
        String originalEncodedPassword = existingEmp.getPassword();

        EnrollmentRepository enrollRepo = (EnrollmentRepository) Proxy.newProxyInstance(
                EnrollmentRepository.class.getClassLoader(),
                new Class<?>[]{EnrollmentRepository.class},
                (proxy, method, args) -> Collections.emptyList()
        );
        CertificateRepository certRepo = (CertificateRepository) Proxy.newProxyInstance(
                CertificateRepository.class.getClassLoader(),
                new Class<?>[]{CertificateRepository.class},
                (proxy, method, args) -> 0L
        );
        HrAdminService hrAdminService = new HrAdminService(userRepository, enrollRepo, certRepo, passwordEncoder);

        // 1. Verify production profile refuses to seed at runtime even if invoked directly
        org.springframework.core.env.Environment prodEnv = (org.springframework.core.env.Environment) Proxy.newProxyInstance(
                org.springframework.core.env.Environment.class.getClassLoader(),
                new Class<?>[]{org.springframework.core.env.Environment.class},
                (proxy, method, args) -> {
                    if ("acceptsProfiles".equals(method.getName()) && args != null && args.length == 1
                            && args[0] instanceof org.springframework.core.env.Profiles profiles) {
                        return profiles.matches(profile -> "prod".equalsIgnoreCase(profile) || "local".equalsIgnoreCase(profile));
                    }
                    return false;
                }
        );
        DataInitializer prodInitializer = new DataInitializer(userRepository, passwordEncoder, hrAdminService, prodEnv);
        prodInitializer.setConfiguredInitialPassword("Fairmacs#LocalDev2026!");
        prodInitializer.setMustChangePasswordOnSeed(false);
        prodInitializer.run();
        assertEquals(1, userStore.size(), "Production profile must never seed test accounts");

        // 2. Run under 'local' profile: preserves existing EMP1001 and creates all 4 DEV-* role accounts
        org.springframework.core.env.Environment localEnv = (org.springframework.core.env.Environment) Proxy.newProxyInstance(
                org.springframework.core.env.Environment.class.getClassLoader(),
                new Class<?>[]{org.springframework.core.env.Environment.class},
                (proxy, method, args) -> {
                    if ("acceptsProfiles".equals(method.getName()) && args != null && args.length == 1
                            && args[0] instanceof org.springframework.core.env.Profiles profiles) {
                        return profiles.matches("local"::equalsIgnoreCase);
                    }
                    return false;
                }
        );
        DataInitializer localInitializer = new DataInitializer(userRepository, passwordEncoder, hrAdminService, localEnv);
        localInitializer.setConfiguredInitialPassword("Fairmacs#LocalDev2026!");
        localInitializer.setMustChangePasswordOnSeed(false);
        localInitializer.run();

        // Existing user + 4 local role accounts = 5 users total; existing user's password untouched
        assertEquals(5, userStore.size());
        assertEquals(originalEncodedPassword, userRepository.findByEmployeeId("EMP1001").orElseThrow().getPassword());

        // Re-running DataInitializer is idempotent and does not overwrite passwords
        localInitializer.run();
        assertEquals(5, userStore.size());

        // 3. Verify all 4 seeded accounts authenticate against POST /api/auth/login and have correct roles & departments
        Map<String, Role> expectedRoles = Map.of(
                "DEV-EMP01", Role.EMPLOYEE,
                "DEV-MGR01", Role.MANAGER,
                "DEV-TRN01", Role.TRAINER,
                "DEV-HR01", Role.HR_ADMIN
        );

        for (Map.Entry<String, Role> entry : expectedRoles.entrySet()) {
            String empId = entry.getKey();
            Role expectedRole = entry.getValue();

            User dbUser = userRepository.findByEmployeeId(empId).orElseThrow();
            assertNotEquals("Fairmacs#LocalDev2026!", dbUser.getPassword(), "Plaintext password must never be stored");
            assertTrue(passwordEncoder.matches("Fairmacs#LocalDev2026!", dbUser.getPassword()));
            assertEquals(expectedRole, dbUser.getRole());

            ResponseEntity<ApiResponse<LoginResponse>> loginResp = authController.login(
                    new LoginRequest(empId, "Fairmacs#LocalDev2026!"),
                    createMockRequest("POST", "/api/auth/login", null)
            );
            assertEquals(HttpStatus.OK, loginResp.getStatusCode());
            LoginResponse data = loginResp.getBody().getData();
            assertNotNull(data.getToken());
            assertEquals(expectedRole.name(), data.getRole());
            assertFalse(data.isMustChangePassword());
        }

        // Verify Manager Dashboard sees the Operations team (including DEV-EMP01 and EMP1001)
        User devManager = userRepository.findByEmployeeId("DEV-MGR01").orElseThrow();
        setSecurityContext(devManager);
        ManagerReportService mgrReportService = new ManagerReportService(userRepository, enrollRepo);
        ManagerReportController mgrReportController = new ManagerReportController(mgrReportService, securityContextUtil);
        ResponseEntity<ManagerReportDTO> mgrReport = mgrReportController.getManagerReports(devManager.getId());
        assertEquals(HttpStatus.OK, mgrReport.getStatusCode());
        assertEquals(2, mgrReport.getBody().getTeamMembers(), "Manager in Operations should see both Operations employees");

        // Verify HR Admin Dashboard metrics work for DEV-HR01
        User devHr = userRepository.findByEmployeeId("DEV-HR01").orElseThrow();
        setSecurityContext(devHr);
        Map<String, Object> hrMetrics = hrAdminService.getDashboardMetrics();
        assertEquals(5L, hrMetrics.get("totalEmployees"));
    }

    // ========================================================================
    // 5. LOGIN ABUSE & ACCOUNT LOCKOUT TESTS
    // ========================================================================

    @Test
    void testLoginLockoutThresholdAndAutomaticExpiry() throws Exception {
        LoginAttemptService shortLockoutService = new LoginAttemptService(3, 10, 1L, true);
        AuthenticationManager authManager = authentication -> {
            String loginId = String.valueOf(authentication.getPrincipal());
            String rawPassword = String.valueOf(authentication.getCredentials());
            User found = findUserByLoginId(loginId).orElseThrow(() -> new BadCredentialsException("Bad credentials"));
            if (!passwordEncoder.matches(rawPassword, found.getPassword())) {
                throw new BadCredentialsException("Bad credentials");
            }
            return new UsernamePasswordAuthenticationToken(found.getEmail(), null, Collections.emptyList());
        };
        UserService throttledUserService = new UserService(
                userRepository, jwtService, authManager, passwordEncoder, shortLockoutService
        );

        createAndSaveUser("EMP5001", "locktest@fairmacs.com", "CorrectPass#2026", Role.EMPLOYEE, "Operations", false);

        // 3 failed login attempts trigger lockout
        for (int i = 0; i < 3; i++) {
            assertThrows(BadCredentialsException.class,
                    () -> throttledUserService.login(new LoginRequest("EMP5001", "WrongPass#1"), "192.168.1.50"));
        }

        assertTrue(shortLockoutService.isBlocked("EMP5001", "192.168.1.50"));

        // Even with the correct password, login is blocked during active lockout
        assertThrows(BadCredentialsException.class,
                () -> throttledUserService.login(new LoginRequest("EMP5001", "CorrectPass#2026"), "192.168.1.50"));

        // Wait for 1-second lockout window to expire -> login recovers automatically
        Thread.sleep(1150L);
        assertFalse(shortLockoutService.isBlocked("EMP5001", "192.168.1.50"));

        LoginResponse recovered = throttledUserService.login(new LoginRequest("EMP5001", "CorrectPass#2026"), "192.168.1.50");
        assertNotNull(recovered.getToken());
        assertEquals(0, shortLockoutService.getFailedAttempts("EMP5001"));
    }

    // ========================================================================
    // TEST HELPERS
    // ========================================================================

    private void assertPreAuthorizeContains(Method method, String expectedRole) {
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        assertNotNull(annotation, "Expected @PreAuthorize on " + method.getName());
        assertTrue(annotation.value().contains(expectedRole),
                "Expected " + method.getName() + " @PreAuthorize to contain " + expectedRole);
    }

    private void setSecurityContext(User user) {
        JwtAuthenticationFilter.CurrentJwtClaims claims =
                new JwtAuthenticationFilter.CurrentJwtClaims(user.getId(), user.getRole().name(), "127.0.0.1", null);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
        auth.setDetails(claims);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private User createAndSaveUser(
            String employeeId,
            String email,
            String rawPassword,
            Role role,
            String department,
            boolean mustChangePassword) {
        User u = new User();
        u.setId(userIdSeq.getAndIncrement());
        u.setEmployeeId(employeeId);
        u.setEmail(email);
        u.setName("User " + employeeId);
        u.setPassword(passwordEncoder.encode(rawPassword));
        u.setRole(role);
        u.setRoleLabel(role.name());
        u.setDepartment(department);
        u.setDesignation("Executive");
        u.setStatus(UserStatus.ACTIVE);
        u.setMustChangePassword(mustChangePassword);
        userStore.put(u.getId(), u);
        return u;
    }

    private Optional<User> findUserByLoginId(String loginId) {
        if (loginId == null) {
            return Optional.empty();
        }
        return userStore.values().stream()
                .filter(u -> loginId.equalsIgnoreCase(u.getEmail()) || loginId.equalsIgnoreCase(u.getEmployeeId()))
                .findFirst();
    }

    private UserRepository createUserRepositoryProxy() {
        return (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name)) {
                        return Optional.ofNullable(userStore.get((Long) args[0]));
                    }
                    if ("findByEmailOrEmployeeIdIgnoreCase".equals(name)) {
                        return findUserByLoginId((String) args[0]);
                    }
                    if ("findByEmail".equals(name)) {
                        String email = (String) args[0];
                        return userStore.values().stream()
                                .filter(u -> email != null && email.equalsIgnoreCase(u.getEmail()))
                                .findFirst();
                    }
                    if ("findByEmployeeId".equals(name)) {
                        String empId = (String) args[0];
                        return userStore.values().stream()
                                .filter(u -> empId != null && empId.equalsIgnoreCase(u.getEmployeeId()))
                                .findFirst();
                    }
                    if ("existsByEmployeeId".equals(name)) {
                        String empId = (String) args[0];
                        return userStore.values().stream()
                                .anyMatch(u -> empId != null && empId.equalsIgnoreCase(u.getEmployeeId()));
                    }
                    if ("existsByEmail".equals(name)) {
                        String email = (String) args[0];
                        return userStore.values().stream()
                                .anyMatch(u -> email != null && email.equalsIgnoreCase(u.getEmail()));
                    }
                    if ("findByDepartmentIgnoreCaseAndRole".equals(name)) {
                        String dept = (String) args[0];
                        Role role = (Role) args[1];
                        return userStore.values().stream()
                                .filter(u -> dept != null && dept.equalsIgnoreCase(u.getDepartment()) && u.getRole() == role)
                                .toList();
                    }
                    if ("save".equals(name)) {
                        User u = (User) args[0];
                        if (u.getId() == null) {
                            u.setId(userIdSeq.getAndIncrement());
                        }
                        userStore.put(u.getId(), u);
                        return u;
                    }
                    if ("count".equals(name)) {
                        return (long) userStore.size();
                    }
                    if ("findAll".equals(name)) {
                        return new ArrayList<>(userStore.values());
                    }
                    return null;
                }
        );
    }

    private HttpServletRequest createMockRequest(String method, String uri, String authHeader) {
        return (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class<?>[]{HttpServletRequest.class},
                (proxy, m, args) -> {
                    switch (m.getName()) {
                        case "getHeader":
                            return "Authorization".equalsIgnoreCase((String) args[0]) ? authHeader : null;
                        case "getRequestURI":
                            return uri;
                        case "getMethod":
                            return method;
                        case "getRemoteAddr":
                            return "127.0.0.1";
                        case "getRequestedSessionId":
                            return null;
                        case "getAttribute":
                            return null;
                        default:
                            return null;
                    }
                }
        );
    }

    private HttpServletResponse createMockResponse(AtomicInteger statusHolder, StringWriter bodyWriter) {
        PrintWriter printWriter = new PrintWriter(bodyWriter);
        return (HttpServletResponse) Proxy.newProxyInstance(
                HttpServletResponse.class.getClassLoader(),
                new Class<?>[]{HttpServletResponse.class},
                (proxy, m, args) -> {
                    switch (m.getName()) {
                        case "setStatus":
                            statusHolder.set((Integer) args[0]);
                            return null;
                        case "getStatus":
                            return statusHolder.get();
                        case "getWriter":
                            return printWriter;
                        default:
                            return null;
                    }
                }
        );
    }
}

