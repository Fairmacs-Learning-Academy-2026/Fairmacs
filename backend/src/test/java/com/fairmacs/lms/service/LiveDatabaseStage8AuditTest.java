package com.fairmacs.lms.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.*;
import java.util.*;

import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("live")
public class LiveDatabaseStage8AuditTest {

    @Test
    @DisplayName("Audit live Supabase database for Stage 8 reporting verification")
    void testLiveDatabaseStage8Audit() throws Exception {
        String dbUrl = System.getenv("SUPABASE_DB_URL");
        String dbUser = System.getenv("SUPABASE_DB_USERNAME");
        String dbPass = System.getenv("SUPABASE_DB_PASSWORD");

        if (dbUrl == null || dbUser == null || dbPass == null ||
                dbUrl.contains("localhost") || dbUrl.contains("127.0.0.1") ||
                "true".equalsIgnoreCase(System.getenv("CI"))) {
            System.out.println("Live Supabase credentials not configured in env (CI/local environment). Skipping audit.");
            return;
        }

        Properties props = new Properties();
        props.setProperty("user", dbUser);
        props.setProperty("password", dbPass);
        props.setProperty("connectTimeout", "20");
        props.setProperty("socketTimeout", "30");

        try (Connection conn = DriverManager.getConnection(dbUrl, props);
             Statement stmt = conn.createStatement()) {

            System.out.println("=== STAGE 8 LIVE DATABASE AUDIT ===");

            // 1. Users
            try (ResultSet rs = stmt.executeQuery("SELECT status, role, COUNT(*) FROM users GROUP BY status, role ORDER BY role, status")) {
                System.out.println("\n--- 1. Users by Role & Status ---");
                while (rs.next()) {
                    System.out.printf("Role: %s | Status: %s | Count: %d%n", rs.getString("role"), rs.getString("status"), rs.getInt(3));
                }
            }

            // 2. Departments
            try (ResultSet rs = stmt.executeQuery("SELECT id, name, parent_department_id FROM departments ORDER BY id")) {
                System.out.println("\n--- 2. Departments ---");
                while (rs.next()) {
                    System.out.printf("Dept ID: %d | Name: %s | Parent: %s%n",
                            rs.getLong("id"), rs.getString("name"), rs.getString("parent_department_id"));
                }
            }

            // 3. Policy Documents
            try (ResultSet rs = stmt.executeQuery("SELECT id, document_code, title, document_status, owning_department_id, published_at FROM policy_documents ORDER BY id")) {
                System.out.println("\n--- 3. Policy Documents ---");
                while (rs.next()) {
                    System.out.printf("Doc ID: %d | Code: %s | Title: %s | Status: %s | Dept: %s | PublishedAt: %s%n",
                            rs.getLong("id"), rs.getString("document_code"), rs.getString("title"),
                            rs.getString("document_status"), rs.getString("owning_department_id"), rs.getString("published_at"));
                }
            }

            // 4. Policy Versions
            try (ResultSet rs = stmt.executeQuery("SELECT id, policy_document_id, version_number, version_type, allow_download, created_at FROM policy_versions ORDER BY id")) {
                System.out.println("\n--- 4. Policy Versions ---");
                while (rs.next()) {
                    System.out.printf("Version ID: %d | Doc ID: %d | Ver: %s | Type: %s | Download: %b | CreatedAt: %s%n",
                            rs.getLong("id"), rs.getLong("policy_document_id"), rs.getString("version_number"),
                            rs.getString("version_type"), rs.getBoolean("allow_download"), rs.getString("created_at"));
                }
            }

            // 5. Policy Assignments
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*), mandatory, assignment_status FROM policy_assignments GROUP BY mandatory, assignment_status")) {
                System.out.println("\n--- 5. Policy Assignments Summary ---");
                while (rs.next()) {
                    System.out.printf("Mandatory: %s | Status: %s | Count: %d%n",
                            rs.getString("mandatory"), rs.getString("assignment_status"), rs.getInt(1));
                }
            }

            // Detailed assignments count
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM policy_assignments")) {
                rs.next();
                System.out.println("Total policy_assignments rows: " + rs.getInt(1));
            }

            // 6. Policy Acknowledgements
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM policy_acknowledgements")) {
                rs.next();
                System.out.println("Total policy_acknowledgements rows: " + rs.getInt(1));
            }

            try (ResultSet rs = stmt.executeQuery("SELECT id, policy_document_id, policy_version_id, employee_user_id, accepted_at FROM policy_acknowledgements ORDER BY id")) {
                System.out.println("\n--- 6. Policy Acknowledgements Details ---");
                while (rs.next()) {
                    System.out.printf("Ack ID: %d | Doc ID: %d | Ver ID: %d | User ID: %d | AcceptedAt: %s%n",
                            rs.getLong("id"), rs.getLong("policy_document_id"), rs.getLong("policy_version_id"),
                            rs.getLong("employee_user_id"), rs.getString("accepted_at"));
                }
            }

            // 7. Inspect Specific Users 7 and 10 and their assignments
            try (ResultSet rs = stmt.executeQuery("SELECT id, name, email, employee_id, role, department, status FROM users WHERE id IN (7, 10) OR employee_id IN ('10', 'EMP2002') ORDER BY id")) {
                System.out.println("\n--- 7. Target Users (7, 10) ---");
                while (rs.next()) {
                    System.out.printf("User ID: %d | Name: %s | Email: %s | EmpId: %s | Role: %s | Dept: %s | Status: %s%n",
                            rs.getLong("id"), rs.getString("name"), rs.getString("email"), rs.getString("employee_id"),
                            rs.getString("role"), rs.getString("department"), rs.getString("status"));
                }
            }

            try (ResultSet rs = stmt.executeQuery("SELECT id, employee_user_id, policy_document_id, policy_version_id, mandatory, assignment_status FROM policy_assignments WHERE employee_user_id IN (7, 10) ORDER BY id")) {
                System.out.println("\n--- 8. Assignments for Users (7, 10) ---");
                while (rs.next()) {
                    System.out.printf("Assignment ID: %d | User ID: %d | Doc ID: %d | Ver ID: %d | Mandatory: %s | Status: %s%n",
                            rs.getLong("id"), rs.getLong("employee_user_id"), rs.getLong("policy_document_id"),
                            rs.getLong("policy_version_id"), rs.getString("mandatory"), rs.getString("assignment_status"));
                }
            }

            // 9. Inspect Live Policy Document 8 Excel Generation Data
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT u.id, u.employee_id, u.name, u.department, u.designation, " +
                    "       pa.mandatory, pa.due_date, pv.version_number, " +
                    "       ack.id AS ack_id, ack.accepted_at, ack.document_sha256_hash " +
                    "FROM policy_assignments pa " +
                    "JOIN users u ON u.id = pa.employee_user_id " +
                    "JOIN policy_versions pv ON pv.id = pa.policy_version_id " +
                    "LEFT JOIN policy_acknowledgements ack ON ack.policy_version_id = pa.policy_version_id AND ack.employee_user_id = u.id " +
                    "WHERE pa.policy_document_id = 8 AND pa.assignment_status = 'ACTIVE' " +
                    "ORDER BY u.id, pv.id DESC")) {
                System.out.println("\n--- 9. Live Policy 8 Assignments & Ack Join ---");
                int rowCount = 0;
                while (rs.next()) {
                    rowCount++;
                    System.out.printf("Emp: %s (%s) | Ver: %s | Mandatory: %s | Due: %s | AckId: %s | AckAt: %s%n",
                            rs.getString("name"), rs.getString("employee_id"), rs.getString("version_number"),
                            rs.getString("mandatory"), rs.getString("due_date"), rs.getString("ack_id"), rs.getString("accepted_at"));
                }
                System.out.println("Total active assigned rows for Doc 8: " + rowCount);
                assertTrue(rowCount > 0, "Doc 8 must have active assignments in live DB");
            }
        }
    }
}
