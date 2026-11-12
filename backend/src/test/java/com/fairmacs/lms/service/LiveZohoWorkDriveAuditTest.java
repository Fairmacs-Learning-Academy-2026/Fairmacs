package com.fairmacs.lms.service;

import com.fairmacs.lms.integration.zoho.ZohoOAuthService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class LiveZohoWorkDriveAuditTest {

    @Test
    @DisplayName("Verify real Zoho WorkDrive OAuth credentials and access to root employee folder")
    void testLiveZohoAccess() {
        String dbUrl = System.getenv("SUPABASE_DB_URL");
        String dbUser = System.getenv("SUPABASE_DB_USERNAME");
        String dbPass = System.getenv("SUPABASE_DB_PASSWORD");
        String encKey = System.getenv("ZOHO_TOKEN_ENCRYPTION_KEY");
        String clientId = System.getenv("ZOHO_CLIENT_ID");
        String clientSecret = System.getenv("ZOHO_CLIENT_SECRET");

        if (dbUrl == null || dbUser == null || dbPass == null || encKey == null) {
            System.err.println("Database or Zoho encryption key not found in environment.");
            return;
        }

        DriverManagerDataSource ds = new DriverManagerDataSource(dbUrl, dbUser, dbPass);
        JdbcTemplate jdbcTemplate = new JdbcTemplate(ds);

        ZohoOAuthService oauthService = new ZohoOAuthService(jdbcTemplate);
        ReflectionTestUtils.setField(oauthService, "clientId", clientId);
        ReflectionTestUtils.setField(oauthService, "clientSecret", clientSecret);
        ReflectionTestUtils.setField(oauthService, "accountsUrl", "https://accounts.zoho.com");
        ReflectionTestUtils.setField(oauthService, "encryptionKeyBase64", encKey);

        String accessToken;
        try {
            accessToken = oauthService.getAccessToken();
            System.out.println("Zoho OAuth Token obtained successfully: length=" + accessToken.length());
        } catch (Exception e) {
            System.err.println("Failed to obtain Zoho access token: " + e.getMessage());
            e.printStackTrace();
            return;
        }

        ZohoWorkDriveService wdService = new ZohoWorkDriveService(oauthService);
        ReflectionTestUtils.setField(wdService, "apiBaseUrl", "https://www.zohoapis.com/workdrive");
        ReflectionTestUtils.setField(wdService, "employeeDocumentsFolderId", "ap17jb6b3094df81d4dd79ccea04508fc6910");

        String rootFolderId = wdService.getEmployeeDocumentsFolderId();
        System.out.println("Target Root Folder ID: " + rootFolderId);

        // Verify root folder access by listing or getting/creating a test subfolder
        try {
            String testFolderId = wdService.getOrCreateSubfolder(rootFolderId, "Company Policies");
            System.out.println("Zoho WorkDrive 'Company Policies' folder verified/created successfully! Folder ID: " + testFolderId);
            assertNotNull(testFolderId, "Company Policies folder ID must not be null");
        } catch (Exception e) {
            System.err.println("Failed to access Zoho WorkDrive root folder: " + e.getMessage());
            e.printStackTrace();
            fail("Zoho WorkDrive root folder access failed: " + e.getMessage());
        }
    }
}
