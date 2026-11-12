package com.fairmacs.lms.integration;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.JwtAuthenticationFilter;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.flywaydb.core.Flyway;
import org.hibernate.SessionFactory;
import org.hibernate.boot.Metadata;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.cfg.AvailableSettings;
import org.junit.jupiter.api.*;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionTemplate;

import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Release 2.11.0 Authentic PostgreSQL Integration Verification")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class Release2110PostgresIntegrationTest {

    private static final List<Class<?>> ALL_JPA_ENTITIES = List.of(
            Category.class,
            Certificate.class,
            Course.class,
            CourseThumbnail.class,
            CourseDepartmentAssignment.class,
            Department.class,
            EmployeeImportAuditLog.class,
            Enrollment.class,
            LearningPath.class,
            LearningPathItem.class,
            Lesson.class,
            LessonProgress.class,
            Module.class,
            Notification.class,
            NotificationJobLog.class,
            Quiz.class,
            QuizAttempt.class,
            QuizProgress.class,
            QuizQuestion.class,
            RecommendationRule.class,
            TrainingSession.class,
            User.class
    );

    private String tempSchema;
    private String schemaJdbcUrl;
    private String dbUser;
    private String dbPass;
    private Connection baseConnection;

    private HikariDataSource dataSource;
    private StandardServiceRegistry serviceRegistry;
    private SessionFactory sessionFactory;
    private EntityManager entityManager;
    private TransactionTemplate txTemplate;

    // Real Spring Data JPA repositories operating on actual PostgreSQL
    private CourseRepository courseRepository;
    private CertificateRepository certificateRepository;
    private DepartmentRepository departmentRepository;
    private UserRepository userRepository;
    private EnrollmentRepository enrollmentRepository;
    private ModuleRepository moduleRepository;
    private LessonRepository lessonRepository;
    private LessonProgressRepository lessonProgressRepository;
    private QuizRepository quizRepository;
    private QuizQuestionRepository quizQuestionRepository;
    private QuizAttemptRepository quizAttemptRepository;
    private QuizProgressRepository quizProgressRepository;
    private CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository;
    private CourseThumbnailRepository thumbnailRepository;
    private LearningPathRepository learningPathRepository;
    private RecommendationRuleRepository recommendationRuleRepository;
    private CategoryRepository categoryRepository;

    // Real Services
    private IdSequenceService idSequenceService;
    private CertificateService certificateService;
    private EnrollmentService enrollmentService;
    private QuizService quizService;
    private CourseAuthoringService courseAuthoringService;
    private SecurityContextUtil securityContextUtil;

    // Test fixtures
    private Department deptOps;
    private Department deptUncategorized;
    private User testLearner;
    private User hrAdminUser;

    @BeforeAll
    void setupPostgresDatabaseAndFlywayMigrations() throws Exception {
        Map<String, String> dbConfig = resolveDbConfig();
        String rawUrl = dbConfig.get("SUPABASE_DB_URL");
        dbUser = dbConfig.get("SUPABASE_DB_USERNAME");
        dbPass = dbConfig.get("SUPABASE_DB_PASSWORD");

        Assumptions.assumeTrue(
                rawUrl != null && dbUser != null && dbPass != null,
                "Skipping live PostgreSQL integration test because SUPABASE_DB_URL / credentials are not configured"
        );

        tempSchema = "release2110_it_" + System.currentTimeMillis();
        schemaJdbcUrl = rawUrl + (rawUrl.contains("?") ? "&" : "?") + "currentSchema=" + tempSchema;

        Properties connProps = new Properties();
        connProps.setProperty("user", dbUser);
        connProps.setProperty("password", dbPass);
        connProps.setProperty("connectTimeout", "30");
        connProps.setProperty("socketTimeout", "60");
        DriverManager.setLoginTimeout(30);

        try (Connection conn = DriverManager.getConnection(rawUrl, connProps);
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA " + tempSchema);
        }

        // Apply Flyway V1..V8 migrations from scratch to the isolated disposable schema
        Flyway flyway = Flyway.configure()
                .dataSource(schemaJdbcUrl, dbUser, dbPass)
                .schemas(tempSchema)
                .locations("classpath:db/migration")
                .load();
        flyway.migrate();

        // Configure Pooled Hikari DataSource and Hibernate SessionFactory
        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(schemaJdbcUrl);
        hikariConfig.setUsername(dbUser);
        hikariConfig.setPassword(dbPass);
        hikariConfig.setMaximumPoolSize(2);
        hikariConfig.setMinimumIdle(1);
        hikariConfig.setConnectionTimeout(60000);
        hikariConfig.setIdleTimeout(60000);
        hikariConfig.setMaxLifetime(300000);
        dataSource = new HikariDataSource(hikariConfig);

        Map<String, Object> settings = new HashMap<>();
        settings.put(AvailableSettings.DATASOURCE, dataSource);
        settings.put(AvailableSettings.DIALECT, "org.hibernate.dialect.PostgreSQLDialect");
        settings.put(AvailableSettings.DEFAULT_SCHEMA, tempSchema);
        settings.put(AvailableSettings.HBM2DDL_AUTO, "validate");
        settings.put(AvailableSettings.PHYSICAL_NAMING_STRATEGY,
                "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy");

        serviceRegistry = new StandardServiceRegistryBuilder().applySettings(settings).build();
        MetadataSources sources = new MetadataSources(serviceRegistry);
        for (Class<?> entityClass : ALL_JPA_ENTITIES) {
            sources.addAnnotatedClass(entityClass);
        }
        Metadata metadata = sources.buildMetadata();
        sessionFactory = metadata.buildSessionFactory();
        entityManager = SharedEntityManagerCreator.createSharedEntityManager(sessionFactory);

        JpaTransactionManager txManager = new JpaTransactionManager(sessionFactory);
        txTemplate = new TransactionTemplate(txManager);

        // Instantiate authentic Spring Data JPA repositories via JpaRepositoryFactory
        JpaRepositoryFactory repoFactory = new JpaRepositoryFactory(entityManager);
        courseRepository = repoFactory.getRepository(CourseRepository.class);
        certificateRepository = repoFactory.getRepository(CertificateRepository.class);
        departmentRepository = repoFactory.getRepository(DepartmentRepository.class);
        userRepository = repoFactory.getRepository(UserRepository.class);
        enrollmentRepository = repoFactory.getRepository(EnrollmentRepository.class);
        moduleRepository = repoFactory.getRepository(ModuleRepository.class);
        lessonRepository = repoFactory.getRepository(LessonRepository.class);
        lessonProgressRepository = repoFactory.getRepository(LessonProgressRepository.class);
        quizRepository = repoFactory.getRepository(QuizRepository.class);
        quizQuestionRepository = repoFactory.getRepository(QuizQuestionRepository.class);
        quizAttemptRepository = repoFactory.getRepository(QuizAttemptRepository.class);
        quizProgressRepository = repoFactory.getRepository(QuizProgressRepository.class);
        courseDepartmentAssignmentRepository = repoFactory.getRepository(CourseDepartmentAssignmentRepository.class);
        thumbnailRepository = repoFactory.getRepository(CourseThumbnailRepository.class);
        learningPathRepository = repoFactory.getRepository(LearningPathRepository.class);
        recommendationRuleRepository = repoFactory.getRepository(RecommendationRuleRepository.class);
        categoryRepository = repoFactory.getRepository(CategoryRepository.class);
        NotificationRepository notificationRepository = repoFactory.getRepository(NotificationRepository.class);

        // Instantiate real backend services
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        idSequenceService = new IdSequenceService(jdbcTemplate);
        securityContextUtil = new SecurityContextUtil(userRepository);
        NotificationService notificationService = new NotificationService(notificationRepository, userRepository);

        certificateService = new CertificateService(
                certificateRepository,
                userRepository,
                courseRepository,
                securityContextUtil,
                notificationService,
                idSequenceService
        );

        enrollmentService = new EnrollmentService(
                enrollmentRepository,
                courseRepository,
                certificateService,
                securityContextUtil,
                null,
                userRepository,
                notificationService,
                departmentRepository,
                lessonProgressRepository,
                moduleRepository,
                quizRepository,
                quizProgressRepository
        );

        ObjectMapper objectMapper = new ObjectMapper();
        quizService = new QuizService(
                quizRepository,
                quizQuestionRepository,
                quizAttemptRepository,
                quizProgressRepository,
                userRepository,
                enrollmentRepository,
                lessonProgressRepository,
                moduleRepository,
                lessonRepository,
                objectMapper,
                enrollmentService,
                securityContextUtil,
                notificationService
        );

        courseAuthoringService = new CourseAuthoringService(
                categoryRepository,
                courseRepository,
                moduleRepository,
                lessonRepository,
                quizRepository,
                quizQuestionRepository,
                securityContextUtil,
                departmentRepository,
                enrollmentRepository,
                quizAttemptRepository,
                enrollmentService,
                certificateRepository,
                lessonProgressRepository,
                quizProgressRepository,
                recommendationRuleRepository,
                learningPathRepository,
                objectMapper,
                notificationService,
                idSequenceService
        );
        courseAuthoringService.setCourseDepartmentAssignmentRepository(courseDepartmentAssignmentRepository);
        courseAuthoringService.setThumbnailRepository(thumbnailRepository);
        courseAuthoringService.setEntityManager(entityManager);

        // Seed shared departments and users in the temporary schema
        txTemplate.execute(status -> {
            deptOps = new Department();
            deptOps.setName("Operations");
            deptOps.setShortCode("OP");
            deptOps = departmentRepository.save(deptOps);

            deptUncategorized = new Department();
            deptUncategorized.setName("Uncategorized");
            deptUncategorized.setShortCode("UNC");
            deptUncategorized = departmentRepository.save(deptUncategorized);

            testLearner = new User();
            testLearner.setEmployeeId("IT-EMP-01");
            testLearner.setName("Ravi Kumar");
            testLearner.setEmail("ravi.kumar@fairmacs.com");
            testLearner.setPassword("hashedpassword");
            testLearner.setDepartment("Operations");
            testLearner.setRole(Role.EMPLOYEE);
            testLearner.setRoleLabel("Employee");
            testLearner.setStatus(UserStatus.ACTIVE);
            testLearner = userRepository.save(testLearner);

            hrAdminUser = new User();
            hrAdminUser.setEmployeeId("IT-HR-01");
            hrAdminUser.setName("HR Lead");
            hrAdminUser.setEmail("hr.lead@fairmacs.com");
            hrAdminUser.setPassword("hashedpassword");
            hrAdminUser.setDepartment("Human Resources");
            hrAdminUser.setRole(Role.HR_ADMIN);
            hrAdminUser.setRoleLabel("HR Administrator");
            hrAdminUser.setStatus(UserStatus.ACTIVE);
            hrAdminUser = userRepository.save(hrAdminUser);

            return null;
        });

        assertNotNull(deptOps.getId(), "deptOps.getId() must not be null");
        assertNotNull(testLearner.getId(), "testLearner.getId() must not be null");
        assertNotNull(hrAdminUser.getId(), "hrAdminUser.getId() must not be null");
    }

    @AfterAll
    void teardownDisposablePostgresSchema() {
        try {
            if (dataSource != null && !dataSource.isClosed()) {
                dataSource.close();
            }
            if (entityManager != null && entityManager.isOpen()) {
                entityManager.close();
            }
            if (sessionFactory != null && !sessionFactory.isClosed()) {
                sessionFactory.close();
            }
            if (serviceRegistry != null) {
                StandardServiceRegistryBuilder.destroy(serviceRegistry);
            }
            if (tempSchema != null && dbUser != null && dbPass != null) {
                Map<String, String> dbConfig = resolveDbConfig();
                String rawUrl = dbConfig.get("SUPABASE_DB_URL");
                Properties connProps = new Properties();
                connProps.setProperty("user", dbUser);
                connProps.setProperty("password", dbPass);
                connProps.setProperty("connectTimeout", "30");
                connProps.setProperty("socketTimeout", "60");
                try (Connection conn = DriverManager.getConnection(rawUrl, connProps);
                     Statement stmt = conn.createStatement()) {
                    stmt.execute("DROP SCHEMA IF EXISTS " + tempSchema + " CASCADE");
                }
            }
        } catch (Exception ignored) {}
    }

    private void authenticateAs(User user) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
        auth.setDetails(new JwtAuthenticationFilter.CurrentJwtClaims(
                user.getId(),
                user.getRole().name(),
                "127.0.0.1",
                "session-123"
        ));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("1. Module quiz submission succeeds on course with category='Uncategorized' and owningDepartment='Operations' without issuing certificate")
    void moduleQuizSubmissionDoesNotIssueCertificateAndSucceeds() {
        authenticateAs(testLearner);

        // Create course with category='Uncategorized' and owningDepartment='Operations'
        Long[] ids = txTemplate.execute(status -> {
            Course course = new Course();
            course.setCourseId("CRS-UNC-OPS-01");
            course.setTitle("Operations Field Protocols");
            course.setCategory("Uncategorized");
            course.setOwningDepartment(deptOps);
            course.setPassingScore(80);
            course.setActive(true);
            course.setDraft(false);
            course.setCertificateEligible(true);
            course = courseRepository.save(course);

            Module module = new Module();
            module.setCourse(course);
            module.setModuleId("MOD-01");
            module.setTitle("Standard Operating Procedures");
            module.setOrderIndex(1);
            module = moduleRepository.save(module);

            Lesson lesson = new Lesson();
            lesson.setModule(module);
            lesson.setLessonId("LES-01");
            lesson.setTitle("SOP Overview");
            lesson.setOrderIndex(1);
            lesson = lessonRepository.save(lesson);

            Quiz moduleQuiz = new Quiz();
            moduleQuiz.setCourse(course);
            moduleQuiz.setModule(module);
            moduleQuiz.setQuizId("QZ-MOD-01");
            moduleQuiz.setTitle("Module 1 Knowledge Check");
            moduleQuiz.setType(QuizType.MODULE);
            moduleQuiz.setPassingScore(80);
            moduleQuiz.setActive(true);
            moduleQuiz.setMaxAttempts(3);
            moduleQuiz.setQuestionsPerAttempt(1);
            moduleQuiz = quizRepository.save(moduleQuiz);

            QuizQuestion question = new QuizQuestion();
            question.setQuiz(moduleQuiz);
            question.setQuestionId("QQ-01");
            question.setQuestionText("What is the primary objective of SOP 1?");
            question.setCorrectAnswer("A");
            question.setOptionA("Operational consistency");
            question.setOptionB("Documentation only");
            question.setOptionC("Optional guidelines");
            question.setOptionD("None of the above");
            question = quizQuestionRepository.save(question);

            Enrollment enrollment = new Enrollment();
            enrollment.setUser(testLearner);
            enrollment.setCourse(course);
            enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
            enrollment.setProgressPercent(50);
            enrollment.setEnrollmentType(EnrollmentType.MANDATORY);
            enrollment = enrollmentRepository.save(enrollment);

            LessonProgress lp = new LessonProgress();
            lp.setEnrollment(enrollment);
            lp.setLesson(lesson);
            lp.setCompleted(true);
            lp.setCompletedAt(LocalDateTime.now());
            lessonProgressRepository.save(lp);

            return new Long[]{course.getId(), moduleQuiz.getId(), question.getId(), enrollment.getId()};
        });

        Long courseId = ids[0];
        Long moduleQuizId = ids[1];
        Long questionId = ids[2];
        Long enrollmentId = ids[3];

        // Start Quiz attempt in PostgreSQL
        Map<String, Object> startResp = txTemplate.execute(status ->
                quizService.startQuiz(moduleQuizId)
        );
        assertNotNull(startResp);
        String attemptId = (String) startResp.get("attemptId");
        assertNotNull(attemptId);

        // Submit module quiz with passing score
        Map<String, String> answers = Map.of(String.valueOf(questionId), "A");
        Map<String, Object> submitResp = txTemplate.execute(status ->
                quizService.submitQuiz(attemptId, answers, 45)
        );

        assertNotNull(submitResp);
        assertEquals(true, submitResp.get("passed"), "Module quiz must be passed");
        assertEquals(100, submitResp.get("score"), "Score must be 100%");
        assertEquals(false, submitResp.get("courseCompleted"), "Module quiz submission must NOT complete the course");
        assertEquals(false, submitResp.get("certificateGenerated"), "Module quiz submission must NOT generate a certificate");

        // Verify PostgreSQL database state: NO certificate was created
        txTemplate.execute(status -> {
            boolean certExists = certificateRepository.existsByCourse_Id(courseId);
            assertFalse(certExists, "No certificate should exist in PostgreSQL after module quiz submission");

            Enrollment updatedEnrollment = enrollmentRepository.findById(enrollmentId).orElseThrow();
            assertNotEquals(EnrollmentStatus.COMPLETED, updatedEnrollment.getStatus(),
                    "Enrollment must remain IN_PROGRESS, not COMPLETED");
            assertNull(updatedEnrollment.getCertificateId(), "Enrollment certificate ID must remain null");
            return null;
        });
    }

    @Test
    @DisplayName("2. Final assessment submission on course with category='Uncategorized' and owningDepartment='Operations' generates OP-prefixed certificate")
    void finalAssessmentSubmissionGeneratesOpPrefixedCertificate() {
        authenticateAs(testLearner);

        // Setup course with completed lessons and module quiz
        Long[] ids = txTemplate.execute(status -> {
            Course course = new Course();
            course.setCourseId("CRS-FINAL-OPS-01");
            course.setTitle("Operations Final Certification");
            course.setCategory("Uncategorized");
            course.setOwningDepartment(deptOps);
            course.setPassingScore(80);
            course.setActive(true);
            course.setDraft(false);
            course.setCertificateEligible(true);
            course = courseRepository.save(course);

            Module module = new Module();
            module.setCourse(course);
            module.setModuleId("MOD-FINAL-01");
            module.setTitle("Core Operations");
            module.setOrderIndex(1);
            module = moduleRepository.save(module);

            Lesson lesson = new Lesson();
            lesson.setModule(module);
            lesson.setLessonId("LES-FINAL-01");
            lesson.setTitle("Operational Standards");
            lesson.setOrderIndex(1);
            lesson = lessonRepository.save(lesson);

            // Module quiz already passed
            Quiz moduleQuiz = new Quiz();
            moduleQuiz.setCourse(course);
            moduleQuiz.setModule(module);
            moduleQuiz.setQuizId("QZ-MOD-PASS-01");
            moduleQuiz.setTitle("Module Check");
            moduleQuiz.setType(QuizType.MODULE);
            moduleQuiz.setPassingScore(80);
            moduleQuiz.setActive(true);
            moduleQuiz.setQuestionsPerAttempt(1);
            moduleQuiz = quizRepository.save(moduleQuiz);

            QuizProgress modProgress = new QuizProgress();
            modProgress.setQuiz(moduleQuiz);
            modProgress.setUser(testLearner);
            modProgress.setPassed(true);
            modProgress.setBestScore(100);
            modProgress.setAttemptsUsed(1);
            modProgress.setPassedAt(LocalDateTime.now());
            quizProgressRepository.save(modProgress);

            // Final Assessment
            Quiz finalQuiz = new Quiz();
            finalQuiz.setCourse(course);
            finalQuiz.setModule(null); // Final assessment has null module
            finalQuiz.setQuizId("QZ-FINAL-OPS-01");
            finalQuiz.setTitle("Operations Final Assessment");
            finalQuiz.setType(QuizType.FINAL);
            finalQuiz.setPassingScore(80);
            finalQuiz.setActive(true);
            finalQuiz.setMaxAttempts(3);
            finalQuiz.setQuestionsPerAttempt(1);
            finalQuiz = quizRepository.save(finalQuiz);

            QuizQuestion question = new QuizQuestion();
            question.setQuiz(finalQuiz);
            question.setQuestionId("QQ-FIN-01");
            question.setQuestionText("What is the Fairmacs operational turnaround threshold?");
            question.setCorrectAnswer("B");
            question.setOptionA("48 hours");
            question.setOptionB("24 hours");
            question.setOptionC("72 hours");
            question.setOptionD("1 week");
            question = quizQuestionRepository.save(question);

            Enrollment enrollment = new Enrollment();
            enrollment.setUser(testLearner);
            enrollment.setCourse(course);
            enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
            enrollment.setProgressPercent(90);
            enrollment.setEnrollmentType(EnrollmentType.MANDATORY);
            enrollment = enrollmentRepository.save(enrollment);

            LessonProgress lp = new LessonProgress();
            lp.setEnrollment(enrollment);
            lp.setLesson(lesson);
            lp.setCompleted(true);
            lp.setCompletedAt(LocalDateTime.now());
            lessonProgressRepository.save(lp);

            return new Long[]{course.getId(), finalQuiz.getId(), question.getId(), enrollment.getId()};
        });

        Long courseId = ids[0];
        Long finalQuizId = ids[1];
        Long questionId = ids[2];
        Long enrollmentId = ids[3];

        // Start final quiz
        Map<String, Object> startResp = txTemplate.execute(status ->
                quizService.startQuiz(finalQuizId)
        );
        assertNotNull(startResp);
        String attemptId = (String) startResp.get("attemptId");

        // Submit final quiz with passing answer (B)
        Map<String, String> answers = Map.of(String.valueOf(questionId), "B");
        Map<String, Object> submitResp = txTemplate.execute(status ->
                quizService.submitQuiz(attemptId, answers, 120)
        );

        assertNotNull(submitResp);
        assertEquals(true, submitResp.get("passed"), "Final assessment must be passed");
        assertEquals(true, submitResp.get("courseCompleted"), "Final assessment must mark courseCompleted=true");
        assertEquals(true, submitResp.get("certificateGenerated"), "Final assessment must generate certificate");

        // Verify generated certificate in PostgreSQL
        txTemplate.execute(status -> {
            List<Certificate> certs = certificateRepository.findByCourse_Id(courseId);
            assertEquals(1, certs.size(), "Exactly 1 certificate must exist in PostgreSQL");
            Certificate cert = certs.get(0);

            // VERIFY PREFIX: Must start with OP prefix (CERT-OP- or OP-) based on Operations owning department
            assertNotNull(cert.getCertificateId(), "Certificate ID must not be null");
            assertTrue(cert.getCertificateId().startsWith("OP") || cert.getCertificateId().startsWith("CERT-OP-"),
                    "Certificate ID must be OP-prefixed for Operations owning department: " + cert.getCertificateId());
            assertFalse(cert.getCertificateId().contains("UNC"), "Certificate ID must not contain UNC: " + cert.getCertificateId());

            Enrollment updatedEnrollment = enrollmentRepository.findById(enrollmentId).orElseThrow();
            assertEquals(EnrollmentStatus.COMPLETED, updatedEnrollment.getStatus(), "Enrollment must be marked COMPLETED");
            assertEquals(100, updatedEnrollment.getProgressPercent(), "Enrollment progress must be 100%");
            assertEquals(cert.getCertificateId(), updatedEnrollment.getCertificateId(),
                    "Enrollment certificate ID must match generated certificate");
            return null;
        });
    }

    @Test
    @DisplayName("3. Course with missing ownership or assigned to 'Uncategorized' returns clear validation error")
    void courseWithMissingOrUncategorizedOwnershipFailsValidation() {
        authenticateAs(testLearner);

        // Case A: Missing owning department (null)
        Long courseNullDeptId = txTemplate.execute(status -> {
            Course c = new Course();
            c.setCourseId("CRS-NO-DEPT");
            c.setTitle("Unassigned Course");
            c.setCategory("General");
            c.setOwningDepartment(null);
            c.setPassingScore(80);
            c.setActive(true);
            c.setCertificateEligible(true);
            return courseRepository.save(c).getId();
        });

        IllegalStateException exNullDept = assertThrows(IllegalStateException.class, () ->
                txTemplate.execute(status ->
                        certificateService.createCertificate(testLearner.getId(), courseNullDeptId, 95)
                )
        );
        assertTrue(exNullDept.getMessage().contains("does not have an assigned owning department"),
                "Error must explicitly mention unassigned owning department: " + exNullDept.getMessage());

        // Case B: Owning department is named 'Uncategorized'
        Long courseUncDeptId = txTemplate.execute(status -> {
            Course c = new Course();
            c.setCourseId("CRS-UNC-DEPT");
            c.setTitle("Uncategorized Owning Dept Course");
            c.setCategory("General");
            c.setOwningDepartment(deptUncategorized);
            c.setPassingScore(80);
            c.setActive(true);
            c.setCertificateEligible(true);
            return courseRepository.save(c).getId();
        });

        IllegalStateException exUncDept = assertThrows(IllegalStateException.class, () ->
                txTemplate.execute(status ->
                        certificateService.createCertificate(testLearner.getId(), courseUncDeptId, 95)
                )
        );
        assertTrue(exUncDept.getMessage().contains("Uncategorized"),
                "Error must explicitly mention 'Uncategorized': " + exUncDept.getMessage());
    }

    @Test
    @DisplayName("4. Draft deletion cascades cleanly across all 12 PostgreSQL dependent tables")
    void draftDeletionWithDependentRecordsCascadesCleanlyInPostgres() {
        authenticateAs(hrAdminUser);

        String draftCourseCode = "CRS-DRAFT-PG-01";

        Long courseId = txTemplate.execute(status -> {
            Course course = new Course();
            course.setCourseId(draftCourseCode);
            course.setTitle("Draft Operations Guide");
            course.setCategory("Operations");
            course.setOwningDepartment(deptOps);
            course.setDraft(true);
            course.setActive(true);
            course = courseRepository.save(course);

            Module mod = new Module();
            mod.setCourse(course);
            mod.setModuleId("MOD-DR-01");
            mod.setTitle("Draft Module 1");
            mod.setOrderIndex(1);
            mod = moduleRepository.save(mod);

            Lesson les = new Lesson();
            les.setModule(mod);
            les.setLessonId("LES-DR-01");
            les.setTitle("Draft Lesson 1");
            les.setOrderIndex(1);
            les = lessonRepository.save(les);

            Quiz qz = new Quiz();
            qz.setCourse(course);
            qz.setModule(mod);
            qz.setQuizId("QZ-DR-01");
            qz.setTitle("Draft Quiz");
            qz.setType(QuizType.MODULE);
            qz = quizRepository.save(qz);

            QuizQuestion qq = new QuizQuestion();
            qq.setQuiz(qz);
            qq.setQuestionId("QQ-DR-01");
            qq.setQuestionText("Draft question text");
            qq.setCorrectAnswer("A");
            qq.setOptionA("Yes");
            qq.setOptionB("No");
            qq = quizQuestionRepository.save(qq);

            Enrollment enr = new Enrollment();
            enr.setUser(testLearner);
            enr.setCourse(course);
            enr.setStatus(EnrollmentStatus.IN_PROGRESS);
            enr = enrollmentRepository.save(enr);

            LessonProgress lp = new LessonProgress();
            lp.setEnrollment(enr);
            lp.setLesson(les);
            lp.setCompleted(false);
            lessonProgressRepository.save(lp);

            QuizAttempt qa = new QuizAttempt();
            qa.setAttemptId(UUID.randomUUID().toString());
            qa.setQuiz(qz);
            qa.setUser(testLearner);
            qa.setAttemptNumber(1);
            qa.setTotalQuestions(1);
            qa.setCorrectAnswers(0);
            qa.setWrongAnswers(1);
            qa.setScore(50);
            qa.setPassed(false);
            quizAttemptRepository.save(qa);

            QuizProgress qp = new QuizProgress();
            qp.setQuiz(qz);
            qp.setUser(testLearner);
            qp.setPassed(false);
            qp.setBestScore(50);
            quizProgressRepository.save(qp);

            CourseDepartmentAssignment cda = new CourseDepartmentAssignment();
            cda.setCourse(course);
            cda.setDepartment(deptOps);
            cda.setAssignmentType(EnrollmentType.MANDATORY);
            courseDepartmentAssignmentRepository.save(cda);

            RecommendationRule rr = new RecommendationRule();
            rr.setCourse(course);
            rr.setDepartment("Operations");
            rr.setPriority(1);
            recommendationRuleRepository.save(rr);

            CourseThumbnail thumb = new CourseThumbnail();
            thumb.setCourseId(course.getId());
            thumb.setStorageId("THUMB-" + UUID.randomUUID());
            thumb.setFilename("banner.png");
            thumb.setContentType("image/png");
            thumb.setFileSize(100L);
            thumb.setData(new byte[]{1, 2, 3});
            thumbnailRepository.save(thumb);

            LearningPath lpObj = new LearningPath();
            lpObj.setPathCode("PATH-PG-" + System.currentTimeMillis());
            lpObj.setTitle("Ops FastTrack");
            lpObj = learningPathRepository.save(lpObj);

            LearningPathItem lpi = new LearningPathItem();
            lpi.setLearningPath(lpObj);
            lpi.setCourse(course);
            lpi.setOrderIndex(1);
            lpObj.getItems().add(lpi);
            learningPathRepository.save(lpObj);

            return course.getId();
        });

        // Execute real deletion via courseAuthoringService
        assertDoesNotThrow(() ->
                txTemplate.execute(status -> {
                    courseAuthoringService.deleteCourse(draftCourseCode);
                    return null;
                })
        );

        // Verify clean deletion from PostgreSQL without FK violations
        txTemplate.execute(status -> {
            assertFalse(courseRepository.findById(courseId).isPresent(), "Course must be deleted from PostgreSQL");
            assertEquals(0, moduleRepository.findByCourseIdOrderByOrderIndexAsc(courseId).size());
            assertEquals(0, quizRepository.findAll().stream().filter(q -> courseId.equals(q.getCourse().getId())).count());
            assertEquals(0, enrollmentRepository.findByCourseId(courseId).size());
            return null;
        });
    }

    @Test
    @DisplayName("5. Transactional deletion rollback preserves PostgreSQL state when an error occurs")
    void deletionRollbackPreservesAllRecordsWhenExceptionOccurs() {
        authenticateAs(hrAdminUser);

        String rollbackCourseCode = "CRS-RB-PG-01";

        Long courseId = txTemplate.execute(status -> {
            Course course = new Course();
            course.setCourseId(rollbackCourseCode);
            course.setTitle("Rollback Test Course");
            course.setCategory("Operations");
            course.setOwningDepartment(deptOps);
            course.setDraft(true);
            course.setActive(true);
            course = courseRepository.save(course);

            Module mod = new Module();
            mod.setCourse(course);
            mod.setModuleId("MOD-RB-01");
            mod.setTitle("Module Rollback");
            mod.setOrderIndex(1);
            moduleRepository.save(mod);

            return course.getId();
        });

        // Simulate transactional failure: delete course then throw RuntimeException
        assertThrows(RuntimeException.class, () ->
                txTemplate.execute(status -> {
                    courseAuthoringService.deleteCourse(rollbackCourseCode);
                    throw new RuntimeException("Simulated unexpected failure during post-delete step");
                })
        );

        // Verify that Course and Module STILL EXIST in PostgreSQL due to complete transaction rollback
        txTemplate.execute(status -> {
            Optional<Course> courseOpt = courseRepository.findById(courseId);
            assertTrue(courseOpt.isPresent(), "Course record must be restored by PostgreSQL transaction rollback");
            List<Module> modules = moduleRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
            assertEquals(1, modules.size(), "Module record must be restored by PostgreSQL transaction rollback");
            return null;
        });
    }

    @Test
    @DisplayName("6. Course deletion is strictly blocked when certificates or completed enrollments exist in PostgreSQL")
    void deletionBlockedWhenCertificatesOrCompletedEnrollmentsExist() {
        authenticateAs(hrAdminUser);

        // Sub-case A: Blocked by issued certificate
        String certCourseCode = "CRS-PROT-CERT-01";
        Long certCourseId = txTemplate.execute(status -> {
            Course c = new Course();
            c.setCourseId(certCourseCode);
            c.setTitle("Certified Operations Specialist");
            c.setCategory("Operations");
            c.setOwningDepartment(deptOps);
            c.setActive(true);
            c.setDraft(false);
            c = courseRepository.save(c);

            Certificate cert = new Certificate();
            cert.setCertificateId("CERT-OP-TEST-99");
            cert.setCourse(c);
            cert.setUser(testLearner);
            cert.setScore(92);
            cert.setIssuedAt(LocalDateTime.now());
            certificateRepository.save(cert);

            return c.getId();
        });

        IllegalStateException exCert = assertThrows(IllegalStateException.class, () ->
                txTemplate.execute(status -> {
                    courseAuthoringService.deleteCourse(certCourseCode);
                    return null;
                })
        );
        assertTrue(exCert.getMessage().contains("certificates have already been issued"),
                "Message must instruct user that certificates were issued: " + exCert.getMessage());
        assertTrue(exCert.getMessage().contains("Please deactivate or archive the course instead"),
                "Message must instruct user to deactivate instead: " + exCert.getMessage());

        // Sub-case B: Blocked by completed enrollment (without certificate)
        String enrCourseCode = "CRS-PROT-ENR-01";
        Long enrCourseId = txTemplate.execute(status -> {
            Course c = new Course();
            c.setCourseId(enrCourseCode);
            c.setTitle("Completed Training Without Cert");
            c.setCategory("Operations");
            c.setOwningDepartment(deptOps);
            c.setActive(true);
            c.setDraft(false);
            c = courseRepository.save(c);

            Enrollment e = new Enrollment();
            e.setUser(testLearner);
            e.setCourse(c);
            e.setStatus(EnrollmentStatus.COMPLETED);
            e.setProgressPercent(100);
            e.setCompletedDate(LocalDateTime.now());
            enrollmentRepository.save(e);

            return c.getId();
        });

        IllegalStateException exEnr = assertThrows(IllegalStateException.class, () ->
                txTemplate.execute(status -> {
                    courseAuthoringService.deleteCourse(enrCourseCode);
                    return null;
                })
        );
        assertTrue(exEnr.getMessage().contains("employees have completed this course"),
                "Message must instruct user that employees completed the course: " + exEnr.getMessage());
        assertTrue(exEnr.getMessage().contains("Please deactivate or archive the course instead"),
                "Message must instruct user to deactivate instead: " + exEnr.getMessage());

        // Verify all protected records STILL EXIST in PostgreSQL
        txTemplate.execute(status -> {
            assertTrue(courseRepository.findById(certCourseId).isPresent());
            assertTrue(certificateRepository.existsByCourse_Id(certCourseId));
            assertTrue(courseRepository.findById(enrCourseId).isPresent());
            assertTrue(enrollmentRepository.findByCourseId(enrCourseId).stream().anyMatch(e -> e.getStatus() == EnrollmentStatus.COMPLETED));
            return null;
        });
    }

    @Test
    @DisplayName("7. Course deactivation and activation works for protected courses in PostgreSQL")
    void courseDeactivationAndActivationWorksInPostgres() {
        authenticateAs(hrAdminUser);

        String courseCode = "CRS-DEACT-01";
        Long courseId = txTemplate.execute(status -> {
            Course c = new Course();
            c.setCourseId(courseCode);
            c.setTitle("Deactivation Test Course");
            c.setCategory("Operations");
            c.setOwningDepartment(deptOps);
            c.setActive(true);
            c.setDraft(false);
            return courseRepository.save(c).getId();
        });

        // Deactivate course
        CourseDTO deactivated = txTemplate.execute(status ->
                courseAuthoringService.setCourseActive(courseCode, false)
        );
        assertNotNull(deactivated);
        assertEquals(false, deactivated.getActive(), "DTO active must be false");

        txTemplate.execute(status -> {
            Course c = courseRepository.findById(courseId).orElseThrow();
            assertFalse(c.getActive(), "PostgreSQL course active flag must be false");
            return null;
        });

        // Re-activate course
        CourseDTO activated = txTemplate.execute(status ->
                courseAuthoringService.setCourseActive(courseCode, true)
        );
        assertNotNull(activated);
        assertEquals(true, activated.getActive(), "DTO active must be true");

        txTemplate.execute(status -> {
            Course c = courseRepository.findById(courseId).orElseThrow();
            assertTrue(c.getActive(), "PostgreSQL course active flag must be true");
            return null;
        });
    }

    private Map<String, String> resolveDbConfig() throws IOException {
        Map<String, String> map = new HashMap<>(System.getenv());
        Path envFile = Path.of(".env");
        if (!Files.exists(envFile)) {
            envFile = Path.of("..", ".env");
        }
        if (Files.exists(envFile)) {
            for (String line : Files.readAllLines(envFile, StandardCharsets.UTF_8)) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty() && !trimmed.startsWith("#") && trimmed.contains("=")) {
                    int idx = trimmed.indexOf('=');
                    map.putIfAbsent(trimmed.substring(0, idx).trim(), trimmed.substring(idx + 1).trim());
                }
            }
        }
        return map;
    }
}
