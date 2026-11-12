package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.CourseThumbnail;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.integration.zoho.ZohoOAuthService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveService;
import com.fairmacs.lms.repository.CourseThumbnailRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class CourseThumbnailService {

    private static final Logger log = LoggerFactory.getLogger(CourseThumbnailService.class);

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5 MB
    public static final String DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID = "gugjua96c81958f1448058257a65e94d8997b";
    public static final String DEFAULT_THUMBNAIL_WORKDRIVE_URL = "https://workdrive.zoho.com/file/gugjua96c81958f1448058257a65e94d8997b";

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final CourseThumbnailRepository thumbnailRepository;
    private final ZohoWorkDriveService zohoWorkDriveService;
    private final ZohoWorkDriveDownloadService zohoDownloadService;
    private final ZohoOAuthService zohoOAuthService;

    public CourseThumbnailService() {
        this(null, null, null, null);
    }

    public CourseThumbnailService(CourseThumbnailRepository thumbnailRepository) {
        this(thumbnailRepository, null, null, null);
    }

    @Autowired
    public CourseThumbnailService(
            @Autowired(required = false) CourseThumbnailRepository thumbnailRepository,
            @Autowired(required = false) ZohoWorkDriveService zohoWorkDriveService,
            @Autowired(required = false) ZohoWorkDriveDownloadService zohoDownloadService,
            @Autowired(required = false) ZohoOAuthService zohoOAuthService) {
        this.thumbnailRepository = thumbnailRepository;
        this.zohoWorkDriveService = zohoWorkDriveService;
        this.zohoDownloadService = zohoDownloadService;
        this.zohoOAuthService = zohoOAuthService;
    }

    @Transactional
    public Map<String, Object> uploadThumbnail(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Thumbnail file is required.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Thumbnail exceeds maximum allowed size of 5 MB.");
        }

        String rawFilename = file.getOriginalFilename();
        if (rawFilename == null || rawFilename.isBlank()) {
            rawFilename = "thumbnail.png";
        }

        String filename = rawFilename.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        String lowerFilename = filename.toLowerCase(Locale.ROOT);
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            if (!lowerFilename.endsWith(".jpg") && !lowerFilename.endsWith(".jpeg")
                    && !lowerFilename.endsWith(".png") && !lowerFilename.endsWith(".webp")) {
                throw new IllegalArgumentException("Unsupported image format. Allowed formats: PNG, JPEG, WEBP.");
            }
            if (lowerFilename.endsWith(".png")) contentType = "image/png";
            else if (lowerFilename.endsWith(".webp")) contentType = "image/webp";
            else contentType = "image/jpeg";
        }

        // 1. Upload to Zoho WorkDrive if connected
        String workdriveFileId = null;
        String finalName = filename;
        if (zohoOAuthService != null && zohoWorkDriveService != null) {
            if (zohoOAuthService.isConnected()) {
                try {
                    Map<String, Object> zohoResponse = zohoWorkDriveService.uploadThumbnail(file);
                    if (zohoResponse != null && zohoResponse.get("fileId") != null) {
                        workdriveFileId = zohoResponse.get("fileId").toString();
                        if (zohoResponse.get("fileName") != null) {
                            finalName = zohoResponse.get("fileName").toString();
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Zoho WorkDrive thumbnail upload failed; preserving binary locally: {}", ex.getMessage());
                }
            } else {
                throw new IllegalStateException("Zoho WorkDrive is not connected. Please connect Zoho WorkDrive to upload course thumbnails.");
            }
        } else if (zohoOAuthService == null) {
            // Test stub mode without Zoho integration beans
            workdriveFileId = "mock_workdrive_" + UUID.randomUUID().toString().substring(0, 8);
        }

        try {
            String storageId = UUID.randomUUID().toString();
            CourseThumbnail thumbnail = new CourseThumbnail(
                    null,
                    storageId,
                    workdriveFileId,
                    finalName,
                    contentType,
                    file.getSize(),
                    file.getBytes()
            );

            if (thumbnailRepository != null) {
                thumbnailRepository.save(thumbnail);
            }

            String url = "/api/courses/thumbnails/" + storageId;
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("storageId", storageId);
            response.put("workdriveFileId", workdriveFileId);
            response.put("filename", finalName);
            response.put("contentType", contentType);
            response.put("fileSize", file.getSize());
            response.put("url", url);
            return response;
        } catch (IOException e) {
            throw new RuntimeException("Failed to process thumbnail file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public CourseThumbnail getThumbnail(String storageId) {
        if (thumbnailRepository == null) {
            throw new ResourceNotFoundException("CourseThumbnail", "storageId", storageId);
        }
        CourseThumbnail thumbnail = thumbnailRepository.findByStorageId(storageId)
                .orElseThrow(() -> new ResourceNotFoundException("CourseThumbnail", "storageId", storageId));

        return ensureThumbnailData(thumbnail);
    }

    @Transactional
    public CourseThumbnail getThumbnailByWorkdriveFileId(String workdriveFileId) {
        if (DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID.equalsIgnoreCase(workdriveFileId)
                || "uxhlk57c56d1fba87474680a8259345370bb6".equalsIgnoreCase(workdriveFileId)) {
            byte[] defaultData = getDefaultThumbnail();
            return new CourseThumbnail(
                    null,
                    "default",
                    workdriveFileId,
                    "fairmacs-default-thumbnail.png",
                    "image/png",
                    (long) defaultData.length,
                    defaultData
            );
        }

        if (thumbnailRepository == null) {
            throw new ResourceNotFoundException("CourseThumbnail", "workdriveFileId", workdriveFileId);
        }
        return thumbnailRepository.findByWorkdriveFileId(workdriveFileId)
                .map(this::ensureThumbnailData)
                .orElseGet(() -> {
                    if (zohoOAuthService != null && zohoOAuthService.isConnected()) {
                        try {
                            ZohoWorkDriveDownloadService.DownloadedDocument doc =
                                    zohoDownloadService.downloadThumbnail(workdriveFileId);
                            String storageId = UUID.randomUUID().toString();
                            CourseThumbnail newThumb = new CourseThumbnail(
                                    null,
                                    storageId,
                                    workdriveFileId,
                                    doc.filename(),
                                    doc.contentType().toString(),
                                    (long) doc.content().length,
                                    doc.content()
                            );
                            return thumbnailRepository.save(newThumb);
                        } catch (Exception ex) {
                            log.warn("Failed to download thumbnail from Zoho WorkDrive for {}: {}", workdriveFileId, ex.getMessage());
                        }
                    }
                    byte[] fallbackData = getDefaultThumbnail();
                    return new CourseThumbnail(
                            null,
                            "default",
                            workdriveFileId,
                            "fairmacs-default-thumbnail.png",
                            "image/png",
                            (long) fallbackData.length,
                            fallbackData
                    );
                });
    }

    public byte[] getDefaultThumbnail() {
        try (var is = getClass().getResourceAsStream("/fairmacs-default-thumbnail.png")) {
            if (is != null) {
                return is.readAllBytes();
            }
        } catch (Exception ex) {
            log.warn("Could not load default thumbnail from classpath: {}", ex.getMessage());
        }
        return getBrandedFallbackThumbnail("FAIRMACS LMS", "LMS");
    }

    private CourseThumbnail ensureThumbnailData(CourseThumbnail thumbnail) {
        if ((thumbnail.getData() == null || thumbnail.getData().length == 0)
                && thumbnail.getWorkdriveFileId() != null && !thumbnail.getWorkdriveFileId().isBlank()) {
            try {
                if (zohoOAuthService != null && zohoOAuthService.isConnected()) {
                    ZohoWorkDriveDownloadService.DownloadedDocument doc =
                            zohoDownloadService.downloadThumbnail(thumbnail.getWorkdriveFileId());
                    thumbnail.setData(doc.content());
                    if (doc.contentType() != null) {
                        thumbnail.setContentType(doc.contentType().toString());
                    }
                    if (thumbnailRepository != null) {
                        thumbnailRepository.save(thumbnail);
                    }
                }
            } catch (Exception ex) {
                log.warn("Could not retrieve thumbnail {} from WorkDrive: {}", thumbnail.getWorkdriveFileId(), ex.getMessage());
            }
        }
        return thumbnail;
    }

    @Transactional(readOnly = true)
    public Optional<CourseThumbnail> findByWorkdriveFileId(String workdriveFileId) {
        if (thumbnailRepository == null) return Optional.empty();
        return thumbnailRepository.findByWorkdriveFileId(workdriveFileId);
    }

    @Transactional
    public void deleteThumbnail(String storageId) {
        if (thumbnailRepository != null) {
            thumbnailRepository.deleteByStorageId(storageId);
        }
    }

    public byte[] getBrandedFallbackThumbnail(String courseTitle, String courseId) {
        String title = (courseTitle != null && !courseTitle.isBlank()) ? courseTitle : "FAIRMACS LMS";
        if (title.length() > 40) title = title.substring(0, 37) + "...";
        String id = (courseId != null && !courseId.isBlank()) ? courseId : "LMS";

        String svg = """
            <svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
              <defs>
                <linearGradient id="bg" x1="0%%" y1="0%%" x2="100%%" y2="100%%">
                  <stop offset="0%%" stop-color="#0a192f"/>
                  <stop offset="60%%" stop-color="#0f2b48"/>
                  <stop offset="100%%" stop-color="#0284c7"/>
                </linearGradient>
              </defs>
              <rect width="600" height="340" fill="url(#bg)"/>
              <circle cx="520" cy="60" r="140" fill="#38bdf8" fill-opacity="0.08"/>
              <text x="40" y="60" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" letter-spacing="2">FAIRMACS LEARNING ACADEMY</text>
              <rect x="40" y="78" width="60" height="3" fill="#38bdf8" rx="1.5"/>
              <text x="40" y="150" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800">%s</text>
              <rect x="40" y="240" width="110" height="28" rx="14" fill="#ffffff" fill-opacity="0.12"/>
              <text x="56" y="259" fill="#e0f2fe" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700">%s</text>
            </svg>
            """.formatted(title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), id);

        return svg.getBytes(StandardCharsets.UTF_8);
    }
}
