package com.fairmacs.lms.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.*;

public class ProfileCentreLiveDatabaseAuditTest {

    @Test
    @DisplayName("Audit live Supabase database for Employee Profile Centre")
    void auditLiveDatabase() throws Exception {
        String dbUrl = System.getenv("SUPABASE_DB_URL");
        String dbUser = System.getenv("SUPABASE_DB_USERNAME");
        String dbPass = System.getenv("SUPABASE_DB_PASSWORD");

        if (dbUrl == null || dbUser == null || dbPass == null) {
            System.err.println("Live Supabase credentials not found in env.");
            return;
        }

        Properties props = new Properties();
        props.setProperty("user", dbUser);
        props.setProperty("password", dbPass);
        props.setProperty("connectTimeout", "20");
        props.setProperty("socketTimeout", "30");

        try (Connection conn = DriverManager.getConnection(dbUrl, props);
             Statement stmt = conn.createStatement()) {

            System.out.println("=== 1. FLYWAY SCHEMA HISTORY ===");
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT installed_rank, version, description, type, script, installed_on, success " +
                    "FROM flyway_schema_history ORDER BY installed_rank")) {
                while (rs.next()) {
                    System.out.printf("Rank %d | Version %s | Desc: %s | Success: %b | Installed: %s%n",
                            rs.getInt("installed_rank"),
                            rs.getString("version"),
                            rs.getString("description"),
                            rs.getBoolean("success"),
                            rs.getString("installed_on")
                    );
                }
            } catch (Exception e) {
                System.out.println("flyway_schema_history table error: " + e.getMessage());
            }

            System.out.println("\n=== 2. PROFILE TABLES IN PUBLIC SCHEMA ===");
            List<String> targetTables = List.of(
                    "employee_personal_info",
                    "employee_emergency_contacts",
                    "employee_documents",
                    "employment_status_requests",
                    "employment_status_history",
                    "employee_preferences",
                    "employee_timeline_events"
            );
            for (String tbl : targetTables) {
                try (ResultSet rs = stmt.executeQuery(
                        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='" + tbl + "'")) {
                    if (rs.next() && rs.getInt(1) > 0) {
                        try (ResultSet countRs = stmt.executeQuery("SELECT COUNT(*) FROM " + tbl)) {
                            countRs.next();
                            System.out.printf("Table '%s': EXISTS (Row count: %d)%n", tbl, countRs.getInt(1));
                        }
                    } else {
                        System.out.printf("Table '%s': DOES NOT EXIST%n", tbl);
                    }
                }
            }

            System.out.println("\n=== 3. USERS COLUMNS ===");
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT column_name, data_type FROM information_schema.columns " +
                    "WHERE table_schema='public' AND table_name='users' " +
                    "AND column_name IN ('position_band', 'employment_type', 'reporting_manager_id', 'department', 'designation', 'status')")) {
                while (rs.next()) {
                    System.out.printf("Column '%s' -> %s%n", rs.getString("column_name"), rs.getString("data_type"));
                }
            }

            System.out.println("\n=== 4. EXISTING LIVE USERS IN SUPABASE ===");
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT id, employee_id, name, email, department, designation, role, status, branch " +
                    "FROM users ORDER BY id LIMIT 15")) {
                while (rs.next()) {
                    System.out.printf("ID=%d | EmpId=%s | Name=%s | Email=%s | Dept=%s | Role=%s | Status=%s | Branch=%s%n",
                            rs.getLong("id"),
                            rs.getString("employee_id"),
                            rs.getString("name"),
                            rs.getString("email"),
                            rs.getString("department"),
                            rs.getString("role"),
                            rs.getString("status"),
                            rs.getString("branch")
                    );
                }
            }

            System.out.println("\n=== 5. ENROLLMENTS & CERTIFICATES COUNT ===");
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM enrollments")) {
                if (rs.next()) System.out.println("Total enrollments: " + rs.getInt(1));
            }
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM certificates")) {
                if (rs.next()) System.out.println("Total certificates: " + rs.getInt(1));
            }
        }
    }
}
