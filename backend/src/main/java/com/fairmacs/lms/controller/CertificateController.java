package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.ApiResponse;
import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.service.CertificateService;
import com.fairmacs.lms.service.EnrollmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/certificates")
@CrossOrigin(origins = "http://localhost:5173")
public class CertificateController {

    private final EnrollmentService enrollmentService;
    private final CertificateService certificateService;

    public CertificateController(EnrollmentService enrollmentService,
                                  CertificateService certificateService) {
        this.enrollmentService = enrollmentService;
        this.certificateService = certificateService;
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<CertificateDTO>> generateCertificateOnCompletion(
            @RequestBody CompleteCourseRequest request) {
        try {
            if (request.getScore() == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Score is required to complete course."));
            }
            if (request.getEnrollmentId() == null && request.getCourseId() == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Either enrollmentId or courseId must be provided."));
            }
            CertificateDTO cert = enrollmentService.completeCourse(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Course completed. Certificate generated successfully.", cert));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/verify/{certificateId}")
    public ResponseEntity<ApiResponse<CertificateDTO>> verifyCertificate(
            @PathVariable String certificateId) {
        try {
            CertificateDTO cert = certificateService.verifyCertificate(certificateId);
            return ResponseEntity.ok(ApiResponse.success("Certificate verified successfully.", cert));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Certificate ID not found in Fairmacs credential registry."));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<CertificateDTO>>> getUserCertificates(
            @PathVariable Long userId) {
        try {
            List<CertificateDTO> certs = certificateService.getCertificatesByUser(userId);
            return ResponseEntity.ok(ApiResponse.success("Certificates retrieved successfully.", certs));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<CertificateDTO>>> getRecentCertificates(
            @RequestParam(defaultValue = "10") int limit) {
        try {
            List<CertificateDTO> certs = certificateService.getRecentCertificates(limit);
            return ResponseEntity.ok(ApiResponse.success("Recent certificates retrieved.", certs));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}
