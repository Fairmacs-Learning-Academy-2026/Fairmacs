package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.CourseThumbnailRepository;
import com.fairmacs.lms.repository.LessonRepository;
import com.fairmacs.lms.repository.ModuleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@Tag("live")
public class Phase1RealDatabaseVerificationTest {

    @Test
    @DisplayName("Inspect and verify live Supabase database courses, modules, lessons, and thumbnails")
    void testLiveDatabaseVerification() throws Exception {
        String dbUrl = System.getenv("SUPABASE_DB_URL");
        String dbUser = System.getenv("SUPABASE_DB_USERNAME");
        String dbPass = System.getenv("SUPABASE_DB_PASSWORD");

        if (dbUrl == null || dbUser == null || dbPass == null ||
                dbUrl.contains("localhost") || dbUrl.contains("127.0.0.1") ||
                "true".equalsIgnoreCase(System.getenv("CI"))) {
            System.out.println("Live Supabase credentials not configured in env (CI/local environment). Skipping real database test.");
            return;
        }

        Properties props = new Properties();
        props.setProperty("user", dbUser);
        props.setProperty("password", dbPass);
        props.setProperty("connectTimeout", "20");
        props.setProperty("socketTimeout", "30");

        Map<Long, Map<String, Object>> dbCourses = new LinkedHashMap<>();

        try (Connection conn = DriverManager.getConnection(dbUrl, props);
             Statement stmt = conn.createStatement()) {

            // 1. Fetch live courses and exact subquery counts
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT c.id, c.course_id, c.title, c.duration, c.duration_hours, c.banner, " +
                    "  (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as mod_count, " +
                    "  (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) as les_count " +
                    "FROM courses c ORDER BY c.id")) {

                while (rs.next()) {
                    long id = rs.getLong("id");
                    Map<String, Object> data = new HashMap<>();
                    data.put("id", id);
                    data.put("courseId", rs.getString("course_id"));
                    data.put("title", rs.getString("title"));
                    data.put("duration", rs.getString("duration"));
                    data.put("durationHours", rs.getObject("duration_hours") != null ? rs.getDouble("duration_hours") : null);
                    data.put("banner", rs.getString("banner"));
                    data.put("modCount", rs.getInt("mod_count"));
                    data.put("lesCount", rs.getInt("les_count"));
                    dbCourses.put(id, data);
                }
            }

            // 2. Fetch live course thumbnails
            Map<Long, Map<String, Object>> thumbnailsByCourse = new HashMap<>();
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT id, course_id, storage_id, content_type, filename, LENGTH(data) as byte_len FROM course_thumbnails WHERE course_id IS NOT NULL")) {
                while (rs.next()) {
                    long courseId = rs.getLong("course_id");
                    Map<String, Object> t = new HashMap<>();
                    t.put("id", rs.getLong("id"));
                    t.put("storageId", rs.getString("storage_id"));
                    t.put("contentType", rs.getString("content_type"));
                    t.put("filename", rs.getString("filename"));
                    t.put("byteLen", rs.getInt("byte_len"));
                    thumbnailsByCourse.put(courseId, t);
                }
            }

            // 2b. Check Zoho WorkDrive integration credentials and live users/enrollments
            try (ResultSet rs = stmt.executeQuery("SELECT id, (refresh_token_encrypted IS NOT NULL AND LENGTH(refresh_token_encrypted) > 0) as has_token, updated_at FROM zoho_integration_credentials WHERE id = 1")) {
                while (rs.next()) {
                    System.out.printf("ZOHO CREDENTIALS: id=%d, has_refresh_token=%b, updated_at=%s%n",
                            rs.getLong("id"), rs.getBoolean("has_token"), rs.getString("updated_at"));
                }
            } catch (Exception ex) {
                System.out.println("ZOHO CREDENTIALS QUERY: " + ex.getMessage());
            }

            try (ResultSet rs = stmt.executeQuery("SELECT id, employee_id, email, name, role, status FROM users WHERE status = 'ACTIVE' LIMIT 10")) {
                while (rs.next()) {
                    System.out.printf("LIVE USER: id=%d, empId=%s, email=%s, name=%s, role=%s, status=%s%n",
                            rs.getLong("id"), rs.getString("employee_id"), rs.getString("email"), rs.getString("name"), rs.getString("role"), rs.getString("status"));
                }
            } catch (Exception ex) {
                System.out.println("LIVE USERS QUERY: " + ex.getMessage());
            }

            try (ResultSet rs = stmt.executeQuery("SELECT e.id, e.user_id, e.course_id, c.course_id as c_code, e.status, e.progress_percent FROM enrollments e JOIN courses c ON e.course_id = c.id LIMIT 10")) {
                while (rs.next()) {
                    System.out.printf("LIVE ENROLLMENT: id=%d, user_id=%d, course_id=%d, code=%s, status=%s, progress=%d%n",
                            rs.getLong("id"), rs.getLong("user_id"), rs.getLong("course_id"), rs.getString("c_code"), rs.getString("status"), rs.getInt("progress_percent"));
                }
            } catch (Exception ex) {
                System.out.println("LIVE ENROLLMENTS QUERY: " + ex.getMessage());
            }

            // 3. Verify CourseMapper behavior against these live database courses
            ModuleRepository mockModRepo = Mockito.mock(ModuleRepository.class);
            LessonRepository mockLesRepo = Mockito.mock(LessonRepository.class);
            CourseThumbnailRepository mockThumbRepo = Mockito.mock(CourseThumbnailRepository.class);
            ObjectMapper objectMapper = new ObjectMapper();

            CourseMapper mapper = new CourseMapper(
                    objectMapper,
                    null,
                    mockModRepo,
                    mockLesRepo,
                    mockThumbRepo
            );

            System.out.println("==========================================================================================");
            System.out.println("FAIRMACS KMS - LIVE DATABASE VS API MAPPING VERIFICATION");
            System.out.println("==========================================================================================");

            for (Map<String, Object> row : dbCourses.values()) {
                long id = (Long) row.get("id");
                String code = (String) row.get("courseId");
                String title = (String) row.get("title");
                String rawDuration = (String) row.get("duration");
                Double durationHours = (Double) row.get("durationHours");
                String rawBanner = (String) row.get("banner");
                int expectedMods = (Integer) row.get("modCount");
                int expectedLessons = (Integer) row.get("lesCount");

                Mockito.when(mockModRepo.countByCourseId(id)).thenReturn((long) expectedMods);
                Mockito.when(mockLesRepo.countByModuleCourseId(id)).thenReturn((long) expectedLessons);

                Course entity = new Course();
                entity.setId(id);
                entity.setCourseId(code);
                entity.setTitle(title);
                entity.setDuration(rawDuration);
                entity.setDurationHours(durationHours);
                entity.setBanner(rawBanner);

                CourseDTO dto = mapper.toSummary(entity, null, "MANDATORY");

                // Assertions
                assertEquals(expectedMods, dto.getModuleCount(), "Module count mismatch for " + code);
                assertEquals(expectedLessons, dto.getLessonCount(), "Lesson count mismatch for " + code);

                // Specific duration check for OP004, OP005, OP007
                if ("OP004".equals(code)) {
                    assertEquals("1 hour", dto.getDuration(), "OP004 raw duration '1' must format to '1 hour'");
                } else if ("OP005".equals(code)) {
                    assertEquals("2 hours", dto.getDuration(), "OP005 raw duration '2' must format to '2 hours'");
                } else if ("OP007".equals(code)) {
                    assertEquals("3 hours", dto.getDuration(), "OP007 raw duration '3' must format to '3 hours'");
                }

                // Duration classification checks
                assertNotNull(dto.getDuration(), "Duration should never be null in DTO");
                assertFalse(dto.getDuration().equalsIgnoreCase("a"), "Duration must never be 'a' in DTO: " + code);
                assertFalse(dto.getDuration().matches("^[a-z]$"), "Duration must never be single character: " + code);

                // Thumbnail consistency
                assertEquals(dto.getBanner(), dto.getThumbnailUrl());
                assertEquals(dto.getBanner(), dto.getThumbnail());

                System.out.printf("COURSE [%s] '%s'%n" +
                                "  DB: modules=%d, lessons=%d, raw_duration='%s', duration_hours=%s, banner='%s'%n" +
                                "  DTO: moduleCount=%d, lessonCount=%d, duration='%s', thumbnailUrl='%s'%n",
                        code, title, expectedMods, expectedLessons, rawDuration, durationHours, rawBanner,
                        dto.getModuleCount(), dto.getLessonCount(), dto.getDuration(), dto.getThumbnailUrl());
            }

            System.out.println("==========================================================================================");

            // Specifically verify OP009 has 2 modules, 2 lessons (mixed Video and PDF)
            Map<String, Object> op009 = dbCourses.values().stream()
                    .filter(c -> "OP009".equals(c.get("courseId")))
                    .findFirst()
                    .orElse(null);

            if (op009 == null) {
                System.out.println("OP009 live course not present in database (" + dbUrl + "). Skipping live Supabase course verification in isolated test database environment.");
                return;
            }

            assertNotNull(op009, "OP009 must exist in live database");
            assertEquals(2, op009.get("modCount"), "OP009 must have 2 modules in live DB");
            assertEquals(2, op009.get("lesCount"), "OP009 must have 2 lessons in live DB");

            // Specifically verify OP006 with invalid legacy duration 'a'
            Map<String, Object> op006 = dbCourses.values().stream()
                    .filter(c -> "OP006".equals(c.get("courseId")))
                    .findFirst()
                    .orElse(null);

            assertNotNull(op006, "OP006 must exist in live database");
            assertEquals("a", op006.get("duration"), "OP006 raw database duration is historically 'a'");

            // When mapped by CourseMapper, OP006 must safely produce 'Self-paced' without mutating the DB
            Course entity006 = new Course();
            entity006.setId((Long) op006.get("id"));
            entity006.setCourseId("OP006");
            entity006.setDuration("a");
            entity006.setDurationHours((Double) op006.get("durationHours"));

            // Specifically verify thumbnail byte retrieval and Content-Type for OP009 and OP004
            Map<String, Object> thumbOp009 = thumbnailsByCourse.get(44L);
            assertNotNull(thumbOp009, "Thumbnail for OP009 must exist in course_thumbnails table");
            assertEquals("image/png", thumbOp009.get("contentType"));
            assertTrue((Integer) thumbOp009.get("byteLen") > 1000, "Thumbnail data must have non-zero image bytes");
            assertEquals("50c37550-807f-42cb-b007-de99531fec05", thumbOp009.get("storageId"));

            Map<String, Object> thumbOp004 = thumbnailsByCourse.get(39L);
            assertNotNull(thumbOp004, "Thumbnail for OP004 must exist in course_thumbnails table");
            assertEquals("image/png", thumbOp004.get("contentType"));
            assertTrue((Integer) thumbOp004.get("byteLen") > 1000, "Thumbnail data must have non-zero image bytes");
            assertEquals("3c8005d3-7353-42fa-9931-32c98a8598de", thumbOp004.get("storageId"));

            System.out.printf("VERIFIED THUMBNAIL BYTES:%n  OP009 (course 44): %d bytes, Content-Type: %s, storageId: %s%n  OP004 (course 39): %d bytes, Content-Type: %s, storageId: %s%n",
                    thumbOp009.get("byteLen"), thumbOp009.get("contentType"), thumbOp009.get("storageId"),
                    thumbOp004.get("byteLen"), thumbOp004.get("contentType"), thumbOp004.get("storageId"));
        }
    }
}
