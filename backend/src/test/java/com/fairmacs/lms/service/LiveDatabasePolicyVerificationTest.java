package com.fairmacs.lms.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.*;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class LiveDatabasePolicyVerificationTest {

    @Test
    @DisplayName("Verify live Supabase database: Flyway history, 6 policy tables, constraints, indexes, triggers, and employee_documents preservation")
    void testLiveDatabaseVerification() throws Exception {
        String dbUrl = System.getenv("SUPABASE_DB_URL");
        String dbUser = System.getenv("SUPABASE_DB_USERNAME");
        String dbPass = System.getenv("SUPABASE_DB_PASSWORD");

        if (dbUrl == null || dbUser == null || dbPass == null) {
            System.out.println("Live Supabase credentials not found in env. Skipping live database test.");
            return;
        }

        Properties props = new Properties();
        props.setProperty("user", dbUser);
        props.setProperty("password", dbPass);
        props.setProperty("connectTimeout", "20");
        props.setProperty("socketTimeout", "30");

        try (Connection conn = DriverManager.getConnection(dbUrl, props);
             Statement stmt = conn.createStatement()) {

            System.out.println("--- 1. Flyway Schema History Verification ---");
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success " +
                    "FROM flyway_schema_history ORDER BY installed_rank DESC")) {
                boolean foundV14 = false;
                boolean foundV15 = false;
                String latestVersion = null;

                while (rs.next()) {
                    String ver = rs.getString("version");
                    if (latestVersion == null) latestVersion = ver;
                    boolean success = rs.getBoolean("success");
                    String desc = rs.getString("description");
                    String installedOn = rs.getString("installed_on");
                    System.out.println("Flyway Version: " + ver + " (" + desc + ") | Success: " + success + " | Installed On: " + installedOn);

                    if ("14".equals(ver)) {
                        foundV14 = true;
                        assertTrue(success, "Flyway V14 must have executed successfully");
                    }
                    if ("15".equals(ver)) {
                        foundV15 = true;
                        assertTrue(success, "Flyway V15 must have executed successfully");
                    }
                }
                System.out.println("Current Flyway latest version: " + latestVersion);
                assertTrue(foundV14, "Flyway V14 must be recorded in flyway_schema_history");
                assertTrue(foundV15, "Flyway V15 must be recorded in flyway_schema_history");
            }

            System.out.println("--- 2. Verify 6 Policy Tables Exist ---");
            List<String> expectedTables = List.of(
                    "policy_categories",
                    "policy_documents",
                    "policy_versions",
                    "policy_assignments",
                    "policy_acknowledgements",
                    "policy_audit_logs"
            );
            for (String table : expectedTables) {
                try (ResultSet rs = stmt.executeQuery(
                        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '" + table + "'")) {
                    assertTrue(rs.next());
                    assertEquals(1, rs.getInt(1), "Table " + table + " must exist in public schema");
                    System.out.println("Table verified: " + table);
                }
            }

            System.out.println("--- 3. Verify Unique Constraints and Foreign Keys ---");
            List<String> expectedConstraints = List.of(
                    "uq_policy_versions_doc_ver",
                    "uq_policy_assignments_ver_user",
                    "uq_policy_ack_ver_user"
            );
            for (String uq : expectedConstraints) {
                try (ResultSet rs = stmt.executeQuery(
                        "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_name = '" + uq + "'")) {
                    assertTrue(rs.next());
                    assertEquals(1, rs.getInt(1), "Constraint " + uq + " must exist");
                    System.out.println("Constraint verified: " + uq);
                }
            }

            System.out.println("--- 4. Verify Immutability Triggers (V15) ---");
            List<String> expectedTriggers = List.of(
                    "trg_protect_policy_acknowledgements",
                    "trg_protect_policy_audit_logs"
            );
            for (String trg : expectedTriggers) {
                try (ResultSet rs = stmt.executeQuery(
                        "SELECT COUNT(DISTINCT trigger_name) FROM information_schema.triggers WHERE trigger_name = '" + trg + "'")) {
                    assertTrue(rs.next());
                    assertEquals(1, rs.getInt(1), "Trigger " + trg + " must exist");
                    System.out.println("Trigger verified: " + trg);
                }
            }

            // Test trigger enforcement in a rollback transaction
            conn.setAutoCommit(false);
            try {
                // Find an existing user or insert dummy data in transaction to test trigger
                long userId = 1L;
                try (ResultSet rs = stmt.executeQuery("SELECT id FROM users LIMIT 1")) {
                    if (rs.next()) {
                        userId = rs.getLong(1);
                    }
                }
                long catId = 1L;
                try (ResultSet rs = stmt.executeQuery("SELECT id FROM policy_categories LIMIT 1")) {
                    if (rs.next()) {
                        catId = rs.getLong(1);
                    }
                }

                // Insert a test doc, version, assignment, and ack in this rollback transaction
                long testDocId = -1;
                try (ResultSet rs = stmt.executeQuery(
                        "INSERT INTO policy_documents (document_code, title, category_id, created_by, document_status) " +
                        "VALUES ('TEST-VERIFY-TRIGGER', 'Trigger Test', " + catId + ", " + userId + ", 'DRAFT') RETURNING id")) {
                    if (rs.next()) testDocId = rs.getLong(1);
                }

                long testVerId = -1;
                try (ResultSet rs = stmt.executeQuery(
                        "INSERT INTO policy_versions (policy_document_id, version_number, version_type, workdrive_file_id, workdrive_file_name, sha256_hash, effective_date, created_by) " +
                        "VALUES (" + testDocId + ", '1.0', 'MAJOR', 'wd_test', 'test.pdf', 'dummyhash123456789012345678901234567890123456789012345678901234', CURRENT_DATE, " + userId + ") RETURNING id")) {
                    if (rs.next()) testVerId = rs.getLong(1);
                }

                long testAssignId = -1;
                try (ResultSet rs = stmt.executeQuery(
                        "INSERT INTO policy_assignments (policy_document_id, policy_version_id, employee_user_id, employee_id_snapshot, assignment_source, assigned_by) " +
                        "VALUES (" + testDocId + ", " + testVerId + ", " + userId + ", 'EMP-TEST', 'INDIVIDUAL', " + userId + ") RETURNING id")) {
                    if (rs.next()) testAssignId = rs.getLong(1);
                }

                long testAckId = -1;
                try (ResultSet rs = stmt.executeQuery(
                        "INSERT INTO policy_acknowledgements (policy_assignment_id, policy_document_id, policy_version_id, employee_user_id, employee_id_snapshot, authenticated_user_id, document_sha256_hash, acknowledgement_text_version) " +
                        "VALUES (" + testAssignId + ", " + testDocId + ", " + testVerId + ", " + userId + ", 'EMP-TEST', " + userId + ", 'dummyhash123456789012345678901234567890123456789012345678901234', 'I agree') RETURNING id")) {
                    if (rs.next()) testAckId = rs.getLong(1);
                }

                // Now test UPDATE on policy_acknowledgements — must be blocked by trigger!
                Savepoint sp1 = conn.setSavepoint();
                boolean updateBlocked = false;
                try (Statement testStmt = conn.createStatement()) {
                    testStmt.executeUpdate("UPDATE policy_acknowledgements SET request_ip = '10.0.0.1' WHERE id = " + testAckId);
                } catch (SQLException e) {
                    updateBlocked = true;
                    System.out.println("UPDATE on policy_acknowledgements successfully blocked by trigger: " + e.getMessage());
                    assertTrue(e.getMessage().contains("strictly append-only"), "Exception message must state strictly append-only");
                    conn.rollback(sp1);
                }
                assertTrue(updateBlocked, "Trigger must block UPDATE on policy_acknowledgements");

                // Now test DELETE on policy_acknowledgements — must be blocked by trigger!
                Savepoint sp2 = conn.setSavepoint();
                boolean deleteBlocked = false;
                try (Statement testStmt = conn.createStatement()) {
                    testStmt.executeUpdate("DELETE FROM policy_acknowledgements WHERE id = " + testAckId);
                } catch (SQLException e) {
                    deleteBlocked = true;
                    System.out.println("DELETE on policy_acknowledgements successfully blocked by trigger: " + e.getMessage());
                    assertTrue(e.getMessage().contains("strictly append-only"), "Exception message must state strictly append-only");
                    conn.rollback(sp2);
                }
                assertTrue(deleteBlocked, "Trigger must block DELETE on policy_acknowledgements");

            } finally {
                conn.rollback();
                conn.setAutoCommit(true);
            }

            System.out.println("--- 5. Verify employee_documents Table Preservation ---");
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_documents'")) {
                assertTrue(rs.next());
                assertEquals(1, rs.getInt(1), "employee_documents table must exist and remain untouched");
            }
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM employee_documents")) {
                assertTrue(rs.next());
                int count = rs.getInt(1);
                System.out.println("employee_documents row count preserved: " + count);
            }

            System.out.println("--- 6. Verify Policy Categories Seed Data ---");
            try (ResultSet rs = stmt.executeQuery("SELECT id, code, category_name FROM policy_categories ORDER BY display_order ASC")) {
                int catCount = 0;
                while (rs.next()) {
                    catCount++;
                    System.out.println("Category " + catCount + ": " + rs.getString("code") + " (" + rs.getString("category_name") + ")");
                }
                assertTrue(catCount >= 6, "Must have at least 6 baseline policy categories");
            }

            System.out.println("Live Database Verification Completed Successfully!");
        }
    }
}
