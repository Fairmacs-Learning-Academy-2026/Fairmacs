package com.fairmacs.lms.integration.zoho;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class ZohoWorkDriveDownloadService {

    private static final Logger log =
            LoggerFactory.getLogger(ZohoWorkDriveDownloadService.class);

    private final ZohoOAuthService zohoOAuthService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${zoho.api-base-url}")
    private String apiBaseUrl;

    @Value("${zoho.download-base-url:https://download.zoho.com}")
    private String downloadBaseUrl;

    public ZohoWorkDriveDownloadService(
            ZohoOAuthService zohoOAuthService) {
        this.zohoOAuthService = zohoOAuthService;
    }

    public record DownloadedDocument(
            byte[] content,
            String filename,
            MediaType contentType) {
    }

    public DownloadedDocument download(String fileId) {

        if (fileId == null || fileId.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No document is attached to this resource.");
        }

        String requestStage = "initializing";

        try {
            String token = zohoOAuthService.getAccessToken();

            // Prepare headers for WorkDrive metadata requests.
            HttpHeaders headers = new HttpHeaders();
            headers.set(
                    "Authorization",
                    "Zoho-oauthtoken " + token);
            headers.setAccept(List.of(
                    MediaType.parseMediaType(
                            "application/vnd.api+json")));

            HttpEntity<Void> request = new HttpEntity<>(headers);

            // Step 1: Retrieve file metadata.
            requestStage = "file metadata";

            String metadataUrl = apiBaseUrl.replaceAll("/+$", "")
                    + "/api/v1/files/" + fileId;

            ResponseEntity<Map> metadataResponse =
                    restTemplate.exchange(
                            metadataUrl,
                            HttpMethod.GET,
                            request,
                            Map.class);

            Map<?, ?> body = metadataResponse.getBody();

            Map<?, ?> data = body == null
                    ? null
                    : (Map<?, ?>) body.get("data");

            Map<?, ?> attributes = data == null
                    ? null
                    : (Map<?, ?>) data.get("attributes");

            if (attributes == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Could not retrieve document metadata.");
            }

            Object nameValue = attributes.get("FileName");

            if (nameValue == null) {
                nameValue = attributes.get("name");
            }

            if (nameValue == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Zoho did not return the document filename.");
            }

            String filename = nameValue.toString()
                    .replaceAll("[\\\\/:\\r\\n\"]", "_");

            String lowerName = filename.toLowerCase(Locale.ROOT);
            MediaType contentType;

            if (lowerName.endsWith(".pdf")) {
                contentType = MediaType.APPLICATION_PDF;
            } else if (lowerName.endsWith(".docx")) {
                contentType = MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument."
                                + "wordprocessingml.document");
            } else if (lowerName.endsWith(".png")) {
                contentType = MediaType.IMAGE_PNG;
            } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
                contentType = MediaType.IMAGE_JPEG;
            } else if (lowerName.endsWith(".webp")) {
                contentType = MediaType.parseMediaType("image/webp");
            } else {
                throw new ResponseStatusException(
                        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "Only PDF, DOCX, PNG, JPEG, and WEBP documents are supported.");
            }

            // Step 2: Download the private file from WorkDrive.
            requestStage = "file download";

            String downloadUrl = downloadBaseUrl.replaceAll("/+$", "")
                    + "/v1/workdrive/download/" + fileId;

            HttpHeaders downloadHeaders = new HttpHeaders();
            downloadHeaders.set(
                    "Authorization",
                    "Zoho-oauthtoken " + token);
            downloadHeaders.setAccept(List.of(MediaType.ALL));

            ResponseEntity<byte[]> fileResponse =
                    restTemplate.exchange(
                            downloadUrl,
                            HttpMethod.GET,
                            new HttpEntity<>(downloadHeaders),
                            byte[].class);

            byte[] content = fileResponse.getBody();

            if (content == null || content.length == 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Zoho returned an empty document.");
            }

            return new DownloadedDocument(
                    content,
                    filename,
                    contentType);

        } catch (ResponseStatusException ex) {
            throw ex;

        } catch (HttpStatusCodeException ex) {
            // Log the failed stage and Zoho response, never the OAuth token.
            log.error(
                    "Zoho WorkDrive {} request failed. HTTP status: {}, response: {}",
                    requestStage,
                    ex.getStatusCode(),
                    ex.getResponseBodyAsString());

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Zoho WorkDrive rejected or failed the document request.");

        } catch (RestClientException ex) {
            log.error(
                    "Zoho WorkDrive {} connection failed: {}",
                    requestStage,
                    ex.getMessage());

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Could not connect to Zoho WorkDrive.");
        }
    }

    public DownloadedDocument downloadThumbnail(String fileId) {
        DownloadedDocument doc = download(fileId);
        MediaType type = doc.contentType();
        if (type == null || (!type.equals(MediaType.IMAGE_PNG) && !type.equals(MediaType.IMAGE_JPEG) && !type.toString().contains("webp"))) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "The requested WorkDrive file is not a supported image thumbnail.");
        }
        return doc;
    }
}
