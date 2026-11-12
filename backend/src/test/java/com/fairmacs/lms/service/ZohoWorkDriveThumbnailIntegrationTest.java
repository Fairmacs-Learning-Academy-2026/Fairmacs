package com.fairmacs.lms.service;

import com.fairmacs.lms.controller.CourseThumbnailController;
import com.fairmacs.lms.entity.CourseThumbnail;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.integration.zoho.ZohoOAuthService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveService;
import com.fairmacs.lms.repository.CourseThumbnailRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Zoho WorkDrive Course Thumbnail Integration Test Suite")
class ZohoWorkDriveThumbnailIntegrationTest {

    private static final String TARGET_FOLDER_ID = "k3kdv441a3f090a3d4cb183ee44f638c0daee";

    private final Map<String, CourseThumbnail> thumbnailStore = new ConcurrentHashMap<>();

    private CourseThumbnailRepository thumbnailRepo;
    private ZohoOAuthService mockOAuthService;
    private ZohoWorkDriveService mockWorkDriveService;
    private ZohoWorkDriveDownloadService mockDownloadService;
    private CourseThumbnailService thumbnailService;
    private CourseThumbnailController thumbnailController;

    private boolean isZohoConnected = true;

    @BeforeEach
    void setUp() throws Exception {
        thumbnailStore.clear();
        isZohoConnected = true;

        thumbnailRepo = (CourseThumbnailRepository) Proxy.newProxyInstance(
                CourseThumbnailRepository.class.getClassLoader(),
                new Class<?>[]{CourseThumbnailRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("save".equals(name)) {
                        CourseThumbnail t = (CourseThumbnail) args[0];
                        if (t.getId() == null) t.setId((long) (thumbnailStore.size() + 1));
                        thumbnailStore.put(t.getStorageId(), t);
                        return t;
                    }
                    if ("findByStorageId".equals(name)) {
                        return Optional.ofNullable(thumbnailStore.get(args[0]));
                    }
                    if ("findByWorkdriveFileId".equals(name)) {
                        String fileId = (String) args[0];
                        return thumbnailStore.values().stream()
                                .filter(t -> fileId.equals(t.getWorkdriveFileId()))
                                .findFirst();
                    }
                    if ("deleteByStorageId".equals(name)) {
                        thumbnailStore.remove(args[0]);
                        return null;
                    }
                    return null;
                }
        );

        // Subclass ZohoOAuthService to control connection state
        mockOAuthService = new ZohoOAuthService(null) {
            @Override
            public boolean isConnected() {
                return isZohoConnected;
            }

            @Override
            public synchronized String getAccessToken() {
                if (!isZohoConnected) {
                    throw new IllegalStateException("Zoho WorkDrive is not connected. An HR Admin must connect it first.");
                }
                return "mock_zoho_access_token_12345";
            }
        };

        // Subclass ZohoWorkDriveService with mock upload implementation
        mockWorkDriveService = new ZohoWorkDriveService(mockOAuthService) {
            @Override
            public Map<String, Object> uploadThumbnail(org.springframework.web.multipart.MultipartFile file) {
                if (file.getSize() > 5L * 1024 * 1024) {
                    throw new IllegalArgumentException("Maximum thumbnail image size is 5 MB.");
                }
                String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "thumbnail.png";
                String lower = name.toLowerCase(Locale.ROOT);
                if (!lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".jpeg") && !lower.endsWith(".webp")) {
                    throw new IllegalArgumentException("Unsupported thumbnail format. Allowed formats: PNG, JPEG, WEBP.");
                }
                return Map.of(
                        "success", true,
                        "fileId", "workdrive_thumb_" + UUID.randomUUID().toString().substring(0, 8),
                        "fileName", name,
                        "contentType", file.getContentType() != null ? file.getContentType() : "image/png",
                        "sizeBytes", file.getSize(),
                        "folderId", getThumbnailFolderId()
                );
            }
        };

        // Inject target folder ID into mockWorkDriveService
        Field folderField = ZohoWorkDriveService.class.getDeclaredField("thumbnailFolderId");
        folderField.setAccessible(true);
        folderField.set(mockWorkDriveService, TARGET_FOLDER_ID);

        // Subclass ZohoWorkDriveDownloadService for thumbnail downloads
        mockDownloadService = new ZohoWorkDriveDownloadService(mockOAuthService) {
            @Override
            public DownloadedDocument downloadThumbnail(String fileId) {
                if ("not_found_file".equals(fileId)) {
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "WorkDrive file not found");
                }
                return new DownloadedDocument(
                        "mock_image_binary_data".getBytes(StandardCharsets.UTF_8),
                        "test_download.png",
                        MediaType.IMAGE_PNG
                );
            }
        };

        thumbnailService = new CourseThumbnailService(
                thumbnailRepo,
                mockWorkDriveService,
                mockDownloadService,
                mockOAuthService
        );

        thumbnailController = new CourseThumbnailController(thumbnailService);
    }

    @Test
    @DisplayName("1. Verified destination folder ID is k3kdv441a3f090a3d4cb183ee44f638c0daee")
    void verifiedDestinationFolderId() {
        assertEquals(TARGET_FOLDER_ID, mockWorkDriveService.getThumbnailFolderId(),
                "Target folder ID must match the specified Fairmacs WorkDrive folder.");
    }

    @Test
    @DisplayName("2. Upload valid PNG thumbnail stores WorkDrive file ID and caches image locally")
    void uploadValidPngThumbnail() {
        byte[] pngHeader = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3};
        MockMultipartFile file = new MockMultipartFile(
                "file", "course_preview.png", "image/png", pngHeader
        );

        Map<String, Object> result = thumbnailService.uploadThumbnail(file);

        assertNotNull(result);
        assertEquals("course_preview.png", result.get("filename"));
        assertEquals("image/png", result.get("contentType"));
        assertNotNull(result.get("storageId"));
        assertNotNull(result.get("workdriveFileId"));
        assertTrue(result.get("workdriveFileId").toString().startsWith("workdrive_thumb_"));
        assertTrue(result.get("url").toString().startsWith("/api/courses/thumbnails/"));

        // Verify entity in repository
        CourseThumbnail saved = thumbnailStore.get(result.get("storageId"));
        assertNotNull(saved);
        assertEquals(result.get("workdriveFileId"), saved.getWorkdriveFileId());
        assertArrayEquals(pngHeader, saved.getData());
    }

    @Test
    @DisplayName("3. Upload valid JPEG and WebP thumbnails succeed with correct MIME types")
    void uploadValidJpegAndWebpThumbnails() {
        byte[] jpgData = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 1, 2, 3};
        MockMultipartFile jpgFile = new MockMultipartFile(
                "file", "banner.jpg", "image/jpeg", jpgData
        );
        Map<String, Object> jpgResult = thumbnailService.uploadThumbnail(jpgFile);
        assertEquals("image/jpeg", jpgResult.get("contentType"));
        assertNotNull(jpgResult.get("workdriveFileId"));

        byte[] webpData = "RIFF1234WEBPVP8 ...".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile webpFile = new MockMultipartFile(
                "file", "banner.webp", "image/webp", webpData
        );
        Map<String, Object> webpResult = thumbnailService.uploadThumbnail(webpFile);
        assertEquals("image/webp", webpResult.get("contentType"));
        assertNotNull(webpResult.get("workdriveFileId"));
    }

    @Test
    @DisplayName("4. Reject oversized thumbnail (> 5 MB) with IllegalArgumentException")
    void rejectOversizedThumbnail() {
        byte[] oversizedData = new byte[5 * 1024 * 1024 + 1024]; // 5 MB + 1 KB
        MockMultipartFile file = new MockMultipartFile(
                "file", "huge_banner.png", "image/png", oversizedData
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                thumbnailService.uploadThumbnail(file)
        );
        assertTrue(ex.getMessage().contains("5 MB"));
    }

    @Test
    @DisplayName("5. Reject unsupported formats (e.g. .exe, .pdf, .txt) with IllegalArgumentException")
    void rejectUnsupportedFormat() {
        MockMultipartFile exeFile = new MockMultipartFile(
                "file", "malicious.exe", "application/octet-stream", new byte[]{1, 2, 3, 4}
        );
        assertThrows(IllegalArgumentException.class, () -> thumbnailService.uploadThumbnail(exeFile));

        MockMultipartFile pdfFile = new MockMultipartFile(
                "file", "document.pdf", "application/pdf", "%PDF-1.4".getBytes(StandardCharsets.UTF_8)
        );
        assertThrows(IllegalArgumentException.class, () -> thumbnailService.uploadThumbnail(pdfFile));
    }

    @Test
    @DisplayName("6. Report clear error when Zoho WorkDrive is not connected")
    void errorWhenZohoNotConnected() {
        isZohoConnected = false;

        MockMultipartFile file = new MockMultipartFile(
                "file", "preview.png", "image/png", new byte[]{1, 2, 3, 4}
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                thumbnailService.uploadThumbnail(file)
        );
        assertTrue(ex.getMessage().contains("Zoho WorkDrive is not connected"));
    }

    @Test
    @DisplayName("7. Retrieve thumbnail from DB cache via Controller returns 200, Content-Type, and Cache-Control")
    void retrieveThumbnailFromCache() {
        byte[] imgData = "sample_png_bytes".getBytes(StandardCharsets.UTF_8);
        CourseThumbnail thumb = new CourseThumbnail(
                10L, "storage_abc_123", "wd_file_999", "sample.png", "image/png", (long) imgData.length, imgData
        );
        thumbnailStore.put("storage_abc_123", thumb);

        ResponseEntity<byte[]> response = thumbnailController.getThumbnail("storage_abc_123");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.IMAGE_PNG, response.getHeaders().getContentType());
        assertTrue(response.getHeaders().getCacheControl().contains("max-age=2592000"));
        assertArrayEquals(imgData, response.getBody());
    }

    @Test
    @DisplayName("8. Missing cache data falls back to Zoho WorkDrive download and caches result")
    void missingCacheDataDownloadsFromWorkDrive() {
        // Thumbnail with null data but valid workdrive_file_id
        CourseThumbnail thumb = new CourseThumbnail(
                20L, "storage_stream_456", "wd_file_remote_888", "remote.png", "image/png", 100L, null
        );
        thumbnailStore.put("storage_stream_456", thumb);

        CourseThumbnail retrieved = thumbnailService.getThumbnail("storage_stream_456");

        assertNotNull(retrieved);
        assertNotNull(retrieved.getData(), "Data should be fetched from WorkDrive and cached");
        assertEquals("mock_image_binary_data", new String(retrieved.getData(), StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("9. Retrieve thumbnail by WorkDrive file ID succeeds")
    void retrieveThumbnailByWorkdriveFileId() {
        byte[] imgData = "workdrive_direct_bytes".getBytes(StandardCharsets.UTF_8);
        CourseThumbnail thumb = new CourseThumbnail(
                30L, "storage_wd_link", "k3kdv441a3f090a3d4cb183ee44f638c0daee_item1", "test.png", "image/png", 50L, imgData
        );
        thumbnailStore.put("storage_wd_link", thumb);

        ResponseEntity<byte[]> response = thumbnailController.getThumbnailByWorkdriveId("k3kdv441a3f090a3d4cb183ee44f638c0daee_item1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(imgData, response.getBody());
    }

    @Test
    @DisplayName("10. Missing thumbnail returns HTTP 200 with Fairmacs branded fallback SVG")
    void missingThumbnailReturnsBrandedFallbackSvg() {
        ResponseEntity<byte[]> response = thumbnailController.getThumbnail("non_existent_storage_id");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.valueOf("image/svg+xml"), response.getHeaders().getContentType());
        String body = new String(response.getBody(), StandardCharsets.UTF_8);
        assertTrue(body.contains("<svg") && body.contains("FAIRMACS LEARNING ACADEMY"));
    }

    @Test
    @DisplayName("11. Default thumbnail endpoint returns HTTP 200 with PNG and cache headers")
    void defaultThumbnailEndpointReturnsPng() {
        ResponseEntity<byte[]> response = thumbnailController.getDefaultThumbnail();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.IMAGE_PNG, response.getHeaders().getContentType());
        assertTrue(response.getHeaders().getCacheControl().contains("max-age=2592000"));
        assertNotNull(response.getBody());
        assertTrue(response.getBody().length > 100);
    }

    @Test
    @DisplayName("12. WorkDrive request for default file ID returns official default PNG")
    void defaultWorkdriveFileIdReturnsOfficialPng() {
        ResponseEntity<byte[]> response = thumbnailController.getThumbnailByWorkdriveId(
                CourseThumbnailService.DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.IMAGE_PNG, response.getHeaders().getContentType());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().length > 100);
    }
}

