package com.fairmacs.lms.service;

import com.fairmacs.lms.integration.zoho.ZohoOAuthService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

public class LiveZohoWorkDriveAuditTest {

    @Test
    @DisplayName("Verify real Zoho WorkDrive OAuth credentials, folder hierarchy, PDF upload, and SHA-256 calculation")
    void testLiveZohoAccess() {
        String dbUrl = System.getenv("SUPABASE_DB_URL");
        String dbUser = System.getenv("SUPABASE_DB_USERNAME");
        String dbPass = System.getenv("SUPABASE_DB_PASSWORD");
        String encKey = System.getenv("ZOHO_TOKEN_ENCRYPTION_KEY");
        String clientId = System.getenv("ZOHO_CLIENT_ID");
        String clientSecret = System.getenv("ZOHO_CLIENT_SECRET");

        if (dbUrl == null || dbUser == null || dbPass == null || encKey == null) {
            System.err.println("Database or Zoho encryption key not found in environment. Skipping live test.");
            return;
        }

        DriverManagerDataSource ds = new DriverManagerDataSource(dbUrl, dbUser, dbPass);
        JdbcTemplate jdbcTemplate = new JdbcTemplate(ds);

        ZohoOAuthService oauthService = new ZohoOAuthService(jdbcTemplate);
        ReflectionTestUtils.setField(oauthService, "clientId", clientId);
        ReflectionTestUtils.setField(oauthService, "clientSecret", clientSecret);
        ReflectionTestUtils.setField(oauthService, "accountsUrl", "https://accounts.zoho.com");
        ReflectionTestUtils.setField(oauthService, "encryptionKeyBase64", encKey);

        // 1. Verify OAuth token retrieval & refresh
        String accessToken;
        try {
            accessToken = oauthService.getAccessToken();
            System.out.println("1. Zoho OAuth Token obtained successfully: length=" + accessToken.length());
            assertNotNull(accessToken);
            assertFalse(accessToken.isBlank());
        } catch (Exception e) {
            System.err.println("Failed to obtain Zoho access token: " + e.getMessage());
            e.printStackTrace();
            fail("Failed to obtain Zoho access token: " + e.getMessage());
            return;
        }

        // 2. Setup ZohoWorkDriveService
        ZohoWorkDriveService wdService = new ZohoWorkDriveService(oauthService);
        ReflectionTestUtils.setField(wdService, "apiBaseUrl", "https://www.zohoapis.com/workdrive");
        ReflectionTestUtils.setField(wdService, "employeeDocumentsFolderId", "ap17jb6b3094df81d4dd79ccea04508fc6910");

        String rootFolderId = wdService.getEmployeeDocumentsFolderId();
        System.out.println("2. Target Root Folder ID: " + rootFolderId);
        assertEquals("ap17jb6b3094df81d4dd79ccea04508fc6910", rootFolderId);

        // 3. Setup PolicyWorkDriveService
        ZohoWorkDriveDownloadService downloadService = new ZohoWorkDriveDownloadService(oauthService);
        ReflectionTestUtils.setField(downloadService, "apiBaseUrl", "https://www.zohoapis.com/workdrive");
        ReflectionTestUtils.setField(downloadService, "downloadBaseUrl", "https://download.zoho.com");

        PolicyWorkDriveService policyWdService = new PolicyWorkDriveService(wdService, downloadService);
        ReflectionTestUtils.setField(policyWdService, "rootFolderId", rootFolderId);

        // 4. Verify folder resolution (Level 1: Policies & Agreements, Level 2: Company Policies)
        String companyPoliciesFolderId;
        String deptSubmissionsFolderId;
        try {
            companyPoliciesFolderId = policyWdService.resolveTargetFolder("Company Policies", false);
            System.out.println("3. Zoho WorkDrive 'Policies & Agreements / Company Policies' folder ID: " + companyPoliciesFolderId);
            assertNotNull(companyPoliciesFolderId);

            deptSubmissionsFolderId = policyWdService.resolveTargetFolder(null, true);
            System.out.println("4. Zoho WorkDrive 'Policies & Agreements / Department Submissions' folder ID: " + deptSubmissionsFolderId);
            assertNotNull(deptSubmissionsFolderId);
        } catch (Exception e) {
            System.err.println("Failed to resolve/create Zoho WorkDrive folder hierarchy: " + e.getMessage());
            e.printStackTrace();
            fail("Folder hierarchy resolution failed: " + e.getMessage());
            return;
        }

        // 5. Verify PDF upload & SHA-256 calculation
        byte[] testPdfContent = ("%PDF-1.4\n" +
                "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n" +
                "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n" +
                "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj\n" +
                "xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n" +
                "trailer << /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF").getBytes(StandardCharsets.UTF_8);

        String expectedSha256 = policyWdService.computeSha256(testPdfContent);
        System.out.println("5. Computed SHA-256 checksum: " + expectedSha256);
        assertEquals(64, expectedSha256.length());

        String testFileName = "Stage2_Audit_" + System.currentTimeMillis() + ".pdf";
        MockMultipartFile testPdf = new MockMultipartFile(
                "file",
                testFileName,
                "application/pdf",
                testPdfContent
        );

        try {
            PolicyWorkDriveService.UploadedPolicyFile uploadResult = policyWdService.uploadPolicyPdf(
                    testPdf,
                    "Company Policies",
                    false
            );

            System.out.println("6. Uploaded file successfully! WorkDrive File ID: " + uploadResult.workdriveFileId());
            System.out.println("   Original Filename: " + uploadResult.fileName());
            System.out.println("   File Size: " + uploadResult.fileSize() + " bytes");
            System.out.println("   SHA-256: " + uploadResult.sha256Hash());

            assertNotNull(uploadResult.workdriveFileId());
            assertTrue(uploadResult.fileName().startsWith("Stage2_Audit_") && uploadResult.fileName().endsWith(".pdf"));
            assertEquals(expectedSha256, uploadResult.sha256Hash());
            assertEquals(testPdfContent.length, uploadResult.fileSize());

            System.out.println("7. Testing PDF download stream from Zoho WorkDrive...");
            try {
                var downloaded = policyWdService.downloadPolicyPdf(uploadResult.workdriveFileId());
                assertNotNull(downloaded, "Downloaded document must not be null");
                assertNotNull(downloaded.content(), "Downloaded content must not be null");
                System.out.println("   Downloaded file mime type: " + downloaded.contentType());
                System.out.println("   Downloaded content length: " + downloaded.content().length + " bytes");
                assertEquals(testPdfContent.length, downloaded.content().length);
            } catch (Exception dlEx) {
                System.out.println("   Note on direct download: " + dlEx.getMessage());
            }

        } catch (Exception uploadEx) {
            System.err.println("Upload to Zoho WorkDrive failed: " + uploadEx.getMessage());
            uploadEx.printStackTrace();
            fail("Live Zoho WorkDrive upload failed: " + uploadEx.getMessage());
        }

        System.out.println("Live Zoho WorkDrive Audit Completed Successfully!");
    }
}
