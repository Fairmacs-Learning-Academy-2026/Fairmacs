
package com.fairmacs.lms.integration.zoho;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ZohoWorkDriveService {

    private static final long MAX_FILE_SIZE = 20L * 1024 * 1024;

    private final ZohoOAuthService zohoOAuthService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${zoho.api-base-url}")
    private String apiBaseUrl;

    @Value("${zoho.course-documents-folder-id}")
    private String folderId;

    public ZohoWorkDriveService(ZohoOAuthService zohoOAuthService) {
        this.zohoOAuthService = zohoOAuthService;
    }

    public Map<String, Object> uploadDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file.");
        }

        String filename = file.getOriginalFilename();

        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("File name is missing.");
        }

        String lowerName = filename.toLowerCase(java.util.Locale.ROOT);

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
}
