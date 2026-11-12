package com.fairmacs.lms.integration.zoho;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ZohoWorkDriveService {

    private static final Logger log = LoggerFactory.getLogger(ZohoWorkDriveService.class);

    public static final String DEFAULT_THUMBNAIL_FOLDER_ID = "k3kdv441a3f090a3d4cb183ee44f638c0daee";
    public static final String DEFAULT_EMPLOYEE_DOCS_FOLDER_ID = "ap17jb6b3094df81d4dd79ccea04508fc6910";
    private static final long MAX_FILE_SIZE = 20L * 1024 * 1024; // 20 MB for PDF/DOCX
    private static final long MAX_THUMBNAIL_SIZE = 5L * 1024 * 1024; // 5 MB for course thumbnails

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final ZohoOAuthService zohoOAuthService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final Map<String, String> folderCache = new ConcurrentHashMap<>();

    @Value("${zoho.api-base-url}")
    private String apiBaseUrl;

    @Value("${zoho.course-documents-folder-id}")
    private String folderId;

    @Value("${zoho.course-thumbnails-folder-id:k3kdv441a3f090a3d4cb183ee44f638c0daee}")
    private String thumbnailFolderId;

    @Value("${zoho.employee-documents-folder-id:ap17jb6b3094df81d4dd79ccea04508fc6910}")
    private String employeeDocumentsFolderId;

    public ZohoWorkDriveService(ZohoOAuthService zohoOAuthService) {
        this.zohoOAuthService = zohoOAuthService;
    }

    public String getThumbnailFolderId() {
        return (thumbnailFolderId != null && !thumbnailFolderId.isBlank()) ? thumbnailFolderId : DEFAULT_THUMBNAIL_FOLDER_ID;
    }

    public String getCourseDocumentsFolderId() {
        return folderId;
    }

    public String getEmployeeDocumentsFolderId() {
        return (employeeDocumentsFolderId != null && !employeeDocumentsFolderId.isBlank())
                ? employeeDocumentsFolderId
                : DEFAULT_EMPLOYEE_DOCS_FOLDER_ID;
    }

    public synchronized String getOrCreateSubfolder(String parentFolderId, String folderName) {
        if (parentFolderId == null || parentFolderId.isBlank()) {
            throw new IllegalArgumentException("Parent folder ID cannot be null or empty.");
        }
        if (folderName == null || folderName.isBlank()) {
            throw new IllegalArgumentException("Folder name cannot be null or empty.");
        }
        String cacheKey = parentFolderId + "::" + folderName.trim().toLowerCase(Locale.ROOT);
        String cachedId = folderCache.get(cacheKey);
        if (cachedId != null) {
            return cachedId;
        }

        String token = zohoOAuthService.getAccessToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.set("Authorization", "Zoho-oauthtoken " + token);
        headers.setAccept(List.of(MediaType.parseMediaType("application/vnd.api+json")));

        // Step 1: List children of parent folder to see if subfolder already exists
        String listUrl = apiBaseUrl.replaceAll("/+$", "") + "/api/v1/files/" + parentFolderId + "/files";
        try {
            HttpEntity<Void> listReq = new HttpEntity<>(headers);
            ResponseEntity<Map> listResp = restTemplate.exchange(listUrl, HttpMethod.GET, listReq, Map.class);
            if (listResp.getStatusCode().is2xxSuccessful() && listResp.getBody() != null) {
                List<?> items = (List<?>) listResp.getBody().get("data");
                if (items != null) {
                    for (Object obj : items) {
                        if (obj instanceof Map<?, ?> item) {
                            Map<?, ?> attr = (Map<?, ?>) item.get("attributes");
                            if (attr != null && "folder".equalsIgnoreCase(String.valueOf(attr.get("type")))) {
                                String name = String.valueOf(attr.get("name"));
                                if (folderName.trim().equalsIgnoreCase(name.trim())) {
                                    String id = String.valueOf(item.get("id"));
                                    folderCache.put(cacheKey, id);
                                    return id;
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Could not list items in Zoho folder {}: {}", parentFolderId, ex.getMessage());
        }

        // Step 2: Create folder if not found
        String createUrl = apiBaseUrl.replaceAll("/+$", "") + "/api/v1/files";
        headers.setContentType(MediaType.parseMediaType("application/vnd.api+json"));

        Map<String, Object> bodyMap = new HashMap<>();
        Map<String, Object> dataMap = new HashMap<>();
        Map<String, Object> attrMap = new HashMap<>();
        attrMap.put("name", folderName.trim());
        attrMap.put("parent_id", parentFolderId);
        dataMap.put("attributes", attrMap);
        dataMap.put("type", "files");
        bodyMap.put("data", dataMap);

        HttpEntity<Map<String, Object>> createRequest = new HttpEntity<>(bodyMap, headers);
        try {
            ResponseEntity<Map> createResp = restTemplate.exchange(createUrl, HttpMethod.POST, createRequest, Map.class);
            if (createResp.getStatusCode().is2xxSuccessful() && createResp.getBody() != null) {
                Map<?, ?> createdData = (Map<?, ?>) createResp.getBody().get("data");
                if (createdData != null && createdData.get("id") != null) {
                    String newId = createdData.get("id").toString();
                    folderCache.put(cacheKey, newId);
                    log.info("Created subfolder '{}' in Zoho parent {}: id={}", folderName, parentFolderId, newId);
                    return newId;
                }
            }
            throw new IllegalStateException("Zoho WorkDrive did not return valid folder ID for " + folderName);
        } catch (HttpStatusCodeException ex) {
            log.error("Failed to create folder '{}' in parent {}: status={}, body={}",
                    folderName, parentFolderId, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to create folder in Zoho WorkDrive: " + ex.getStatusCode());
        }
    }

    public Map<String, Object> uploadFileToFolder(MultipartFile file, String targetFolderId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file.");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("File name is missing.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Maximum file size is 20 MB.");
        }
        String sanitizedFilename = filename.replaceAll("[\\\\/:*?\"<>|]", "_").trim();

        try {
            String accessToken = zohoOAuthService.getAccessToken();

            HttpHeaders fileHeaders = new HttpHeaders();
            fileHeaders.setContentType(MediaType.parseMediaType(
                    file.getContentType() != null ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE
            ));
            fileHeaders.setContentDispositionFormData("content", sanitizedFilename);

            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return sanitizedFilename;
                }
            };

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
            headers.setAccept(List.of(MediaType.parseMediaType("application/vnd.api+json")));
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("parent_id", targetFolderId);
            body.add("filename", sanitizedFilename);
            body.add("override-name-exist", "false");

            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, fileHeaders);
            body.add("content", filePart);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                    apiBaseUrl + "/api/v1/upload",
                    request,
                    Map.class
            );

            if (response == null || !(response.get("data") instanceof List<?> data)
                    || data.isEmpty()
                    || !(data.get(0) instanceof Map<?, ?> item)
                    || !(item.get("attributes") instanceof Map<?, ?> attributes)) {
                throw new IllegalStateException("Zoho WorkDrive did not return valid file metadata.");
            }

            Object resourceId = attributes.get("resource_id");
            Object returnedName = attributes.get("FileName");

            if (resourceId == null) {
                throw new IllegalStateException("Zoho WorkDrive upload response did not contain a file ID.");
            }

            return Map.of(
                    "success", true,
                    "fileId", resourceId.toString(),
                    "fileName", returnedName != null ? returnedName.toString() : sanitizedFilename,
                    "contentType", file.getContentType() != null ? file.getContentType() : "application/octet-stream",
                    "sizeBytes", file.getSize(),
                    "folderId", targetFolderId
            );
        } catch (HttpStatusCodeException ex) {
            log.error("Zoho WorkDrive upload to folder {} failed. Status: {}, Body: {}",
                    targetFolderId, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Zoho WorkDrive upload failed: " + ex.getStatusCode());
        } catch (IOException ex) {
            throw new IllegalStateException("Could not read uploaded file.", ex);
        }
    }

    public Map<String, Object> uploadDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file.");
        }

        String filename = file.getOriginalFilename();

        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("File name is missing.");
        }

        String lowerName = filename.toLowerCase(Locale.ROOT);

        if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".docx")) {
            throw new IllegalArgumentException(
                "Only PDF and DOCX files are supported."
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                "Maximum file size is 20 MB."
            );
        }

        try {
            String accessToken = zohoOAuthService.getAccessToken();

            HttpHeaders fileHeaders = new HttpHeaders();
            fileHeaders.setContentType(MediaType.parseMediaType(file.getContentType() != null ? file.getContentType(): MediaType.APPLICATION_OCTET_STREAM_VALUE));
            fileHeaders.setContentDispositionFormData("content", filename);

            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() {
                        return filename;
                    }
                };

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
            headers.setAccept(List.of(
                MediaType.parseMediaType("application/vnd.api+json")
            ));
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body =
                new LinkedMultiValueMap<>();

            body.add("parent_id", folderId);
            body.add("filename", filename);
            body.add("override-name-exist", "false");

            HttpEntity<ByteArrayResource> filePart =
                new HttpEntity<>(fileResource, fileHeaders);

            body.add("content", filePart);

            HttpEntity<MultiValueMap<String, Object>> request =
                new HttpEntity<>(body, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                apiBaseUrl + "/api/v1/upload",
                request,
                Map.class
            );

            if (response == null || !(response.get("data") instanceof List<?> data)
                    || data.isEmpty()
                    || !(data.get(0) instanceof Map<?, ?> item)
                    || !(item.get("attributes") instanceof Map<?, ?> attributes)) {
                throw new IllegalStateException(
                    "Zoho did not return valid file metadata."
                );
            }

            Object resourceId = attributes.get("resource_id");
            Object returnedName = attributes.get("FileName");

            if (resourceId == null) {
                throw new IllegalStateException(
                    "Upload response did not contain a file ID."
                );
            }

            return Map.of(
                "success", true,
                "fileId", resourceId.toString(),
                "fileName", returnedName != null
                    ? returnedName.toString() : filename,
                "fileType", lowerName.endsWith(".pdf") ? "PDF" : "DOCX",
                "sizeBytes", file.getSize()
            );

        } catch (org.springframework.web.client.RestClientException ex) {
            throw new IllegalStateException(
                "Zoho WorkDrive upload failed. Check the backend logs for details.",
                ex
            );
        } catch (java.io.IOException ex) {
            throw new IllegalStateException(
                "Could not read the uploaded file.", ex
            );
        }
    }

    public Map<String, Object> uploadThumbnail(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a thumbnail image file.");
        }

        if (file.getSize() > MAX_THUMBNAIL_SIZE) {
            throw new IllegalArgumentException("Maximum thumbnail image size is 5 MB.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "thumbnail.png";
        }

        // Sanitize filename to prevent directory traversal and illegal characters
        String sanitizedFilename = originalFilename.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        String lowerName = sanitizedFilename.toLowerCase(Locale.ROOT);

        if (!lowerName.endsWith(".jpg") && !lowerName.endsWith(".jpeg")
                && !lowerName.endsWith(".png") && !lowerName.endsWith(".webp")) {
            throw new IllegalArgumentException(
                    "Unsupported thumbnail format. Allowed formats: PNG, JPEG, WEBP."
            );
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Could not read uploaded thumbnail file.", e);
        }

        if (bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("Uploaded thumbnail file is empty.");
        }

        // Determine content type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            if (lowerName.endsWith(".png")) contentType = "image/png";
            else if (lowerName.endsWith(".webp")) contentType = "image/webp";
            else contentType = "image/jpeg";
        }

        String targetFolder = getThumbnailFolderId();

        try {
            String accessToken = zohoOAuthService.getAccessToken();

            HttpHeaders fileHeaders = new HttpHeaders();
            fileHeaders.setContentType(MediaType.parseMediaType(contentType));
            fileHeaders.setContentDispositionFormData("content", sanitizedFilename);

            ByteArrayResource fileResource = new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return sanitizedFilename;
                }
            };

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
            headers.setAccept(List.of(
                    MediaType.parseMediaType("application/vnd.api+json")
            ));
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("parent_id", targetFolder);
            body.add("filename", sanitizedFilename);
            body.add("override-name-exist", "false");

            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, fileHeaders);
            body.add("content", filePart);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                    apiBaseUrl + "/api/v1/upload",
                    request,
                    Map.class
            );

            if (response == null || !(response.get("data") instanceof List<?> data)
                    || data.isEmpty()
                    || !(data.get(0) instanceof Map<?, ?> item)
                    || !(item.get("attributes") instanceof Map<?, ?> attributes)) {
                throw new IllegalStateException(
                        "Zoho WorkDrive did not return valid file metadata for thumbnail."
                );
            }

            Object resourceId = attributes.get("resource_id");
            Object returnedName = attributes.get("FileName");

            if (resourceId == null) {
                throw new IllegalStateException(
                        "Zoho WorkDrive thumbnail upload response did not contain a file ID."
                );
            }

            log.info("Successfully uploaded thumbnail to Zoho WorkDrive folder {}. FileId: {}, Name: {}",
                    targetFolder, resourceId, returnedName);

            return Map.of(
                    "success", true,
                    "fileId", resourceId.toString(),
                    "fileName", returnedName != null ? returnedName.toString() : sanitizedFilename,
                    "contentType", contentType,
                    "sizeBytes", file.getSize(),
                    "folderId", targetFolder
            );

        } catch (HttpStatusCodeException ex) {
            log.error("Zoho WorkDrive thumbnail upload failed. Status: {}, Body: {}",
                    ex.getStatusCode(), ex.getResponseBodyAsString());
            if (ex.getStatusCode() == HttpStatus.FORBIDDEN || ex.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Zoho WorkDrive thumbnail destination folder access denied or not found (" + targetFolder + ").",
                        ex
                );
            }
            if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Zoho WorkDrive authentication failed: invalid or expired access token.",
                        ex
                );
            }
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Zoho WorkDrive thumbnail upload rejected by server: " + ex.getStatusCode(),
                    ex
            );
        } catch (RestClientException ex) {
            log.error("Zoho WorkDrive thumbnail upload connection failed: {}", ex.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Could not connect to Zoho WorkDrive for thumbnail upload: " + ex.getMessage(),
                    ex
            );
        }
    }
}
