package com.fairmacs.lms.database;

import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.NotificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.output.MigrateResult;
import org.hibernate.SessionFactory;
import org.hibernate.boot.Metadata;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.cfg.AvailableSettings;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.jpa.repository.Query;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 2: Database Migrations, Schema Alignment, Integrity & PostgreSQL Compatibility Tests.
 */
class Phase2DatabaseIntegrityTest {

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

    @Test
    @DisplayName("1. All Flyway migrations (V1..V4) exist, are non-destructive, and cover all required tables")
    void migrationFilesExistAndAreNonDestructive() throws IOException {
        List<String> migrationFiles = List.of(
                "db/migration/V1__initial_schema.sql",
                "db/migration/V2__notification_system_upgrade.sql",
                "db/migration/V3__phase1_security_hardening.sql",
                "db/migration/V4__phase2_database_integrity_and_indexes.sql",
                "db/migration/V5__phase4_course_authoring_and_assessments.sql",
                "db/migration/V6__zoho_workdrive_thumbnails.sql",
                "db/migration/V12__employee_import_audit_and_zoho_oauth_states.sql"
        );

        StringBuilder combinedSql = new StringBuilder();
        for (String path : migrationFiles) {
            ClassPathResource resource = new ClassPathResource(path);
            assertTrue(resource.exists(), "Missing migration resource: " + path);
            String sql = Files.readString(resource.getFile().toPath(), StandardCharsets.UTF_8);
            assertFalse(sql.isBlank(), "Migration file must not be blank: " + path);

            // Strip SQL line comments before checking for destructive DDL
            String activeSql = sql.replaceAll("(?m)^\\s*--.*$", "").toUpperCase(Locale.ROOT);
            assertFalse(activeSql.contains("DROP TABLE"), "Migration must not contain DROP TABLE: " + path);
            assertFalse(activeSql.contains("TRUNCATE"), "Migration must not contain TRUNCATE: " + path);
            assertFalse(activeSql.contains("DELETE FROM"), "Migration must not contain DELETE FROM: " + path);
            combinedSql.append(sql).append("\n");
        }

        String allSqlLower = combinedSql.toString().toLowerCase(Locale.ROOT);
        List<String> expectedTables = List.of(
                "categories", "certificates", "courses", "departments", "enrollments",
                "learning_path_items", "learning_paths", "lesson_progress", "lessons", "modules",
                "notification_job_logs", "notifications", "quiz_attempts", "quiz_progress",
                "quiz_questions", "quizzes", "recommendation_rules", "training_session_targets",
                "training_sessions", "users", "zoho_integration_credentials",
                "employee_import_audit_logs", "zoho_oauth_states"
        );
        for (String table : expectedTables) {
            assertTrue(allSqlLower.contains(table), "Migrations must define table: " + table);
        }
    }

    @Test
    @DisplayName("2. All 19 JPA Entity classes declare @Entity and @Table matching schema table names")
    void allJpaEntitiesHaveValidTableMappings() throws Exception {
        Set<String> mappedTables = new HashSet<>();
        for (Class<?> entityClass : ALL_JPA_ENTITIES) {
            assertTrue(entityClass.isAnnotationPresent(Entity.class),
                    entityClass.getSimpleName() + " must be annotated with @Entity");
            Table tableAnnotation = entityClass.getAnnotation(Table.class);
            assertNotNull(tableAnnotation,
                    entityClass.getSimpleName() + " must be annotated with @Table");
            assertFalse(tableAnnotation.name().isBlank(),
                    entityClass.getSimpleName() + " @Table(name) must not be blank");
            mappedTables.add(tableAnnotation.name());
        }
        assertEquals(ALL_JPA_ENTITIES.size(), mappedTables.size(), "All JPA entities must map to distinct tables");

        // Verify Notification column lengths match V2/V4 migrations
        Field priorityField = Notification.class.getDeclaredField("priority");
        Column priorityCol = priorityField.getAnnotation(Column.class);
        assertNotNull(priorityCol);
        assertEquals(32, priorityCol.length());
        assertFalse(priorityCol.nullable());

        Field actionUrlField = Notification.class.getDeclaredField("actionUrl");
        Column actionUrlCol = actionUrlField.getAnnotation(Column.class);
        assertNotNull(actionUrlCol);
        assertEquals(512, actionUrlCol.length());

        Field emailStatusField = Notification.class.getDeclaredField("emailStatus");
        Column emailStatusCol = emailStatusField.getAnnotation(Column.class);
        assertNotNull(emailStatusCol);
        assertEquals(32, emailStatusCol.length());
    }

    @Test
    @DisplayName("3. Notification, NotificationJobLog, and User lifecycle defaults populate safely")
    void entityLifecycleDefaultsAreConsistent() throws Exception {
        User user = new User();
        user.setEmployeeId("EMP-T1");
        user.setName("Test User");
        user.setEmail("test@fairmacs.com");
        user.setPassword("hashed");
        user.setRole(Role.EMPLOYEE);
        user.setRoleLabel("Employee");
        user.setDepartment("Technical");
        assertFalse(Boolean.TRUE.equals(user.getMustChangePassword()));
        assertEquals(0, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
        assertNull(user.getPasswordChangedAt());

        Notification notification = new Notification();
        notification.setRecipient(user);
        notification.setTitle("Course Assigned");
        notification.setMessage("Complete Safety 101");
        notification.setType(NotificationType.COURSE_ASSIGNED);
        notification.setPriority(null);
        notification.setEmailStatus(null);
        notification.setEmailAttempts(null);
        notification.setRead(null);

        Method notifPrePersist = Notification.class.getDeclaredMethod("onCreate");
        notifPrePersist.setAccessible(true);
        notifPrePersist.invoke(notification);

        assertEquals(NotificationPriority.NORMAL, notification.getPriority());
        assertEquals("DISABLED", notification.getEmailStatus());
        assertEquals(0, notification.getEmailAttempts());
        assertFalse(notification.getRead());
        assertNotNull(notification.getCreatedAt());

        NotificationJobLog jobLog = new NotificationJobLog();
        jobLog.setJobName("COURSE_DEADLINE_SCAN");
        jobLog.setExecutionKey("COURSE_DEADLINE_SCAN:2026-10-29");
        jobLog.setProcessedCount(null);
        jobLog.setNotificationsCreated(null);
        jobLog.setFailureCount(null);

        Method jobPrePersist = NotificationJobLog.class.getDeclaredMethod("onCreate");
        jobPrePersist.setAccessible(true);
        jobPrePersist.invoke(jobLog);

        assertNotNull(jobLog.getStartedAt());
        assertEquals("RUNNING", jobLog.getStatus());
        assertEquals(0, jobLog.getProcessedCount());
        assertEquals(0, jobLog.getNotificationsCreated());
        assertEquals(0, jobLog.getFailureCount());
    }

    @Test
    @DisplayName("4. Bidirectional entity relationships do not recurse infinitely during Jackson serialization")
    void bidirectionalEntitiesSerializeWithoutInfiniteRecursion() throws Exception {
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());

        Category category = new Category();
        category.setId(1L);
        category.setSlug("safety");
        category.setName("Safety");

        Course course = new Course();
        course.setId(10L);
        course.setCourseId("CRS-10");
        course.setTitle("Safety Basics");
        course.setCategory("Safety");
        course.setCatalogCategory(category);
        category.setCourses(List.of(course));

        Module module = new Module();
        module.setId(20L);
        module.setModuleId("MOD-1");
        module.setTitle("Module 1");
        module.setCourse(course);

        Lesson lesson = new Lesson();
        lesson.setId(30L);
        lesson.setLessonId("LES-1");
        lesson.setTitle("Lesson 1");
        lesson.setModule(module);
        module.setLessons(List.of(lesson));
        course.setModules(List.of(module));

        LearningPath path = new LearningPath();
        path.setId(40L);
        path.setPathCode("LP-1");
        path.setTitle("Onboarding Path");
        LearningPathItem item = new LearningPathItem();
        item.setId(41L);
        item.setLearningPath(path);
        item.setCourse(course);
        path.setItems(List.of(item));

        Quiz quiz = new Quiz();
        quiz.setId(50L);
        quiz.setQuizId("QZ-1");
        quiz.setTitle("Final Quiz");
        quiz.setType(QuizType.FINAL);
        quiz.setCourse(course);
        QuizQuestion question = new QuizQuestion();
        question.setId(51L);
        question.setQuestionId("Q-1");
        question.setQuestionText("What is PPE?");
        question.setCorrectAnswer("A");
        question.setQuiz(quiz);
        quiz.setQuestions(List.of(question));

        assertDoesNotThrow(() -> mapper.writeValueAsString(course));
        assertDoesNotThrow(() -> mapper.writeValueAsString(path));
        assertDoesNotThrow(() -> mapper.writeValueAsString(quiz));
    }

    @Test
    @DisplayName("5. CourseRepository.searchCatalog and NotificationRepository.findFilteredNotifications are PostgreSQL-safe")
    void repositoryQueriesArePostgreSqlSafe() throws Exception {
        Method searchCatalog = CourseRepository.class.getDeclaredMethod("searchCatalog", String.class, String.class);
        Query courseQuery = searchCatalog.getAnnotation(Query.class);
        assertNotNull(courseQuery);
        String jpql = courseQuery.value();
        assertTrue(jpql.contains("LEFT JOIN FETCH c.catalogCategory cat"),
                "searchCatalog must alias LEFT JOIN FETCH c.catalogCategory cat to avoid implicit inner join");
        assertTrue(jpql.contains("cat.slug = :categorySlug"),
                "searchCatalog must filter via the left-joined alias cat.slug");

        Method findFiltered = NotificationRepository.class.getDeclaredMethod(
                "findFilteredNotifications",
                Long.class, Boolean.class, String.class, String.class, String.class,
                org.springframework.data.domain.Pageable.class
        );
        Query notifQuery = findFiltered.getAnnotation(Query.class);
        assertNotNull(notifQuery);
        assertTrue(notifQuery.value().contains("ORDER BY n.createdAt DESC"));
    }

    @Test
    @DisplayName("6. Configuration files enable Flyway migrations and Hibernate schema validation by default")
    void configurationFilesUseFlywayAndHibernateValidate() throws IOException {
        String appProps = Files.readString(
                new ClassPathResource("application.properties").getFile().toPath(),
                StandardCharsets.UTF_8
        );
        assertTrue(appProps.contains("spring.flyway.enabled=${FLYWAY_ENABLED:true}"));
        assertTrue(appProps.contains("spring.flyway.baseline-on-migrate=${FLYWAY_BASELINE_ON_MIGRATE:true}"));
        assertTrue(appProps.contains("spring.jpa.hibernate.ddl-auto=${JPA_DDL_AUTO:validate}"));
        assertFalse(appProps.contains("spring.jpa.hibernate.ddl-auto=update"));
    }

    @Test
    @DisplayName("7. Disposable PostgreSQL schema verifies Flyway V1..V4 migrations, baseline upgrade, and Hibernate ddl-auto=validate")
    void flywayAndHibernateValidatePassAgainstDisposablePostgresSchema() throws Exception {
        Map<String, String> dbConfig = resolveDbConfig();
        String url = dbConfig.get("SUPABASE_DB_URL");
        String user = dbConfig.get("SUPABASE_DB_USERNAME");
        String pass = dbConfig.get("SUPABASE_DB_PASSWORD");
        if (url == null || user == null || pass == null) {
            return;
        }

        String tempSchema = "phase2_verify_" + System.currentTimeMillis();
        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA " + tempSchema);
            try {
                String schemaJdbcUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + tempSchema;

                // Execute V1..V4 from scratch on the disposable schema directly from classpath:db/migration
                Flyway isolatedFlyway = Flyway.configure()
                        .dataSource(schemaJdbcUrl, user, pass)
                        .schemas(tempSchema)
                        .defaultSchema(tempSchema)
                        .locations("classpath:db/migration")
                        .load();

                MigrateResult result = isolatedFlyway.migrate();
                assertTrue(result.migrationsExecuted >= 4, "All migrations (V1..V5) must execute on a fresh schema");

                MigrationInfo[] applied = isolatedFlyway.info().applied();
                assertTrue(applied.length >= 4);

                // Verify Hibernate SchemaValidator (ddl-auto=validate) passes 100% against the migrated schema!
                DriverManagerDataSource ds = new DriverManagerDataSource(schemaJdbcUrl, user, pass);
                ds.setDriverClassName("org.postgresql.Driver");

                Map<String, Object> settings = new HashMap<>();
                settings.put(AvailableSettings.DATASOURCE, ds);
                settings.put(AvailableSettings.DIALECT, "org.hibernate.dialect.PostgreSQLDialect");
                settings.put(AvailableSettings.DEFAULT_SCHEMA, tempSchema);
                settings.put(AvailableSettings.HBM2DDL_AUTO, "validate");
                settings.put(AvailableSettings.PHYSICAL_NAMING_STRATEGY,
                        "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy");

                StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                        .applySettings(settings)
                        .build();
                try {
                    MetadataSources sources = new MetadataSources(registry);
                    for (Class<?> entityClass : ALL_JPA_ENTITIES) {
                        sources.addAnnotatedClass(entityClass);
                    }
                    Metadata metadata = sources.buildMetadata();
                    try (SessionFactory sessionFactory = metadata.buildSessionFactory()) {
                        assertNotNull(sessionFactory);
                    }
                } finally {
                    StandardServiceRegistryBuilder.destroy(registry);
                }

                // Verify key indexes exist in the migrated schema
                Set<String> indexes = new HashSet<>();
                try (ResultSet rs = stmt.executeQuery(
                        "SELECT indexname FROM pg_indexes WHERE schemaname = '" + tempSchema + "'")) {
                    while (rs.next()) {
                        indexes.add(rs.getString(1));
                    }
                }
                assertTrue(indexes.contains("idx_notifications_email_status"));
                assertTrue(indexes.contains("idx_notifications_dedup_key"));
                assertTrue(indexes.contains("idx_users_lower_email"));
                assertTrue(indexes.contains("idx_enrollments_status_due_date"));
                assertTrue(indexes.contains("idx_quizzes_course_type"));
            } finally {
                stmt.execute("DROP SCHEMA IF EXISTS " + tempSchema + " CASCADE");
            }
        }
    }

    @Test
    @DisplayName("8. Baseline-on-migrate (V1->V4) repairs legacy NULLs, converts users.level, and executes JPQL queries on PostgreSQL")
    void baselineUpgradeAndPostgresQueriesPassOnSimulatedExistingSchema() throws Exception {
        Map<String, String> dbConfig = resolveDbConfig();
        String url = dbConfig.get("SUPABASE_DB_URL");
        String user = dbConfig.get("SUPABASE_DB_USERNAME");
        String pass = dbConfig.get("SUPABASE_DB_PASSWORD");
        if (url == null || user == null || pass == null) {
            return;
        }

        String tempSchema = "phase2_baseline_" + System.currentTimeMillis();
        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA " + tempSchema);
            try {
                String schemaJdbcUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + tempSchema;

                // 1. Seed schema with V1 SQL directly (simulating pre-Flyway database without flyway_schema_history)
                String v1Sql = Files.readString(
                        new ClassPathResource("db/migration/V1__initial_schema.sql").getFile().toPath(),
                        StandardCharsets.UTF_8
                );
                stmt.execute("SET search_path TO " + tempSchema);
                stmt.execute(v1Sql);
                // Simulate legacy drift: users.level as TEXT, and pre-existing user + notification with NULL email_status
                stmt.execute("ALTER TABLE users ALTER COLUMN level TYPE TEXT");
                stmt.execute("""
                    INSERT INTO users (employee_id, name, email, password, role, role_label, department, level, status)
                    VALUES ('EMP1001', 'Legacy Employee', 'legacy@fairmacs.com', 'hash', 'EMPLOYEE', 'Employee', 'Technical', 'L2', 'ACTIVE')
                """);
                stmt.execute("""
                    INSERT INTO courses (course_id, title, category, description, active, is_draft, certificate_eligible)
                    VALUES ('CRS-UNC01', 'Uncategorized Safety Course', 'Safety', 'Full text description', TRUE, FALSE, TRUE)
                """);
                stmt.execute("""
                    INSERT INTO notifications (recipient_user_id, title, message, type, is_read, created_at)
                    VALUES (1, 'Welcome', 'Legacy notification row', 'SYSTEM_ALERT', FALSE, CURRENT_TIMESTAMP)
                """);

                // 2. Run Flyway with baselineOnMigrate=true, baselineVersion=1 (matching application.properties)
                Flyway baselineFlyway = Flyway.configure()
                        .dataSource(schemaJdbcUrl, user, pass)
                        .schemas(tempSchema)
                        .defaultSchema(tempSchema)
                        .locations("classpath:db/migration")
                        .baselineOnMigrate(true)
                        .baselineVersion("1")
                        .load();

                MigrateResult migrateResult = baselineFlyway.migrate();
                assertTrue(migrateResult.migrationsExecuted >= 3, "Migrations V2..V5 must execute after baselining at V1");

                // 3. Verify legacy NULLs on notifications were repaired and users.level is now VARCHAR(255) preserving 'L2'
                stmt.execute("SET search_path TO " + tempSchema);
                try (ResultSet rs = stmt.executeQuery(
                        "SELECT priority, email_status, email_attempts FROM notifications WHERE id = 1")) {
                    assertTrue(rs.next());
                    assertEquals("NORMAL", rs.getString("priority"));
                    assertEquals("DISABLED", rs.getString("email_status"));
                    assertEquals(0, rs.getInt("email_attempts"));
                }
                try (ResultSet rs = stmt.executeQuery(
                        "SELECT level, must_change_password, failed_login_attempts FROM users WHERE employee_id = 'EMP1001'")) {
                    assertTrue(rs.next());
                    assertEquals("L2", rs.getString("level"));
                    assertFalse(rs.getBoolean("must_change_password"));
                    assertEquals(0, rs.getInt("failed_login_attempts"));
                }

                // 4. Boot Hibernate SessionFactory with ddl-auto=validate and execute the JPQL queries with NULL parameters
                DriverManagerDataSource ds = new DriverManagerDataSource(schemaJdbcUrl, user, pass);
                ds.setDriverClassName("org.postgresql.Driver");

                Map<String, Object> settings = new HashMap<>();
                settings.put(AvailableSettings.DATASOURCE, ds);
                settings.put(AvailableSettings.DIALECT, "org.hibernate.dialect.PostgreSQLDialect");
                settings.put(AvailableSettings.DEFAULT_SCHEMA, tempSchema);
                settings.put(AvailableSettings.HBM2DDL_AUTO, "validate");
                settings.put(AvailableSettings.PHYSICAL_NAMING_STRATEGY,
                        "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy");

                StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                        .applySettings(settings)
                        .build();
                try {
                    MetadataSources sources = new MetadataSources(registry);
                    for (Class<?> entityClass : ALL_JPA_ENTITIES) {
                        sources.addAnnotatedClass(entityClass);
                    }
                    Metadata metadata = sources.buildMetadata();
                    try (SessionFactory sf = metadata.buildSessionFactory();
                         var session = sf.openSession()) {
                        // Execute CourseRepository.searchCatalog JPQL with null :q and null :categorySlug
                        Method searchCatalog = CourseRepository.class.getDeclaredMethod("searchCatalog", String.class, String.class);
                        String courseJpql = searchCatalog.getAnnotation(Query.class).value();
                        List<Course> courses = session.createQuery(courseJpql, Course.class)
                                .setParameter("q", null)
                                .setParameter("categorySlug", null)
                                .getResultList();
                        assertEquals(1, courses.size(), "Uncategorized course must be returned when categorySlug is null");
                        assertEquals("CRS-UNC01", courses.get(0).getCourseId());

                        // Execute NotificationRepository.findFilteredNotifications JPQL with null filter parameters
                        Method findFiltered = NotificationRepository.class.getDeclaredMethod(
                                "findFilteredNotifications",
                                Long.class, Boolean.class, String.class, String.class, String.class,
                                org.springframework.data.domain.Pageable.class
                        );
                        String notifJpql = findFiltered.getAnnotation(Query.class).value();
                        List<Notification> notifs = session.createQuery(notifJpql, Notification.class)
                                .setParameter("userId", 1L)
                                .setParameter("read", null)
                                .setParameter("type", null)
                                .setParameter("priority", null)
                                .setParameter("search", null)
                                .getResultList();
                        assertEquals(1, notifs.size());
                        assertEquals("DISABLED", notifs.get(0).getEmailStatus());
                    }
                } finally {
                    StandardServiceRegistryBuilder.destroy(registry);
                }
            } finally {
                stmt.execute("DROP SCHEMA IF EXISTS " + tempSchema + " CASCADE");
            }
        }
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
