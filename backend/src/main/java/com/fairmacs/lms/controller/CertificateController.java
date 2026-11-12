package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.ApiResponse;
import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.CertificateService;
import com.fairmacs.lms.service.EnrollmentService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {

    private final EnrollmentService enrollmentService;
    private final CertificateService certificateService;
    private final SecurityContextUtil securityContextUtil;

    public CertificateController(
            EnrollmentService enrollmentService,
            CertificateService certificateService,
            SecurityContextUtil securityContextUtil) {

        this.enrollmentService = enrollmentService;
        this.certificateService = certificateService;
        this.securityContextUtil = securityContextUtil;
    }

    // =========================================================
    // GENERATE CERTIFICATE
    // =========================================================

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<CertificateDTO>>
    generateCertificateOnCompletion(
            @RequestBody CompleteCourseRequest request) {

        try {

            if (request.getScore() == null) {

                return ResponseEntity.badRequest()
                        .body(
                                ApiResponse.error(
                                        "Score is required to complete course."
                                )
                        );
            }

            if (request.getEnrollmentId() == null
                    && request.getCourseId() == null) {

                return ResponseEntity.badRequest()
                        .body(
                                ApiResponse.error(
                                        "Either enrollmentId or courseId must be provided."
                                )
                        );
            }

            CertificateDTO cert =
                    enrollmentService.completeCourse(
                            request
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            ApiResponse.success(
                                    "Course completed. Certificate generated successfully.",
                                    cert
                            )
                    );

        } catch (SecurityException e) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );
        }
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<?> getCertificateForCourse(@PathVariable Long courseId) {
        Long currentUserId = securityContextUtil.getCurrentUserId();
        return certificateService.getCertificateByUserIdAndCourseId(currentUserId, courseId)
                .map(cert -> ResponseEntity.ok(certificateService.toDTO(cert)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    // =========================================================
    // DOWNLOAD / VIEW CERTIFICATE PDF
    // =========================================================

    @GetMapping(
            value = "/{certificateId}/pdf",
            produces = MediaType.APPLICATION_PDF_VALUE
    )
    public ResponseEntity<byte[]> getCertificatePdf(
            @PathVariable String certificateId) {

        try {

            byte[] pdf =
                    certificateService.getCertificatePdf(
                            certificateId
                    );

            HttpHeaders headers =
                    new HttpHeaders();

            headers.setContentType(
                    MediaType.APPLICATION_PDF
            );

            headers.setContentDisposition(
                    ContentDisposition.inline()
                            .filename(
                                    certificateId + ".pdf"
                            )
                            .build()
            );

            headers.setContentLength(
                    pdf.length
            );

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdf);

        } catch (SecurityException e) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .build();

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .build();
        }
    }

    // =========================================================
    // VERIFY CERTIFICATE
    // =========================================================

    @GetMapping("/verify/{certificateId}")
    public ResponseEntity<ApiResponse<CertificateDTO>>
    verifyCertificate(
            @PathVariable String certificateId) {

        try {

            CertificateDTO cert =
                    certificateService.verifyCertificate(
                            certificateId
                    );

            return ResponseEntity.ok(
                    ApiResponse.success(
                            "Certificate verified successfully.",
                            cert
                    )
            );

        } catch (SecurityException e) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            ApiResponse.error(
                                    "Certificate ID not found in Fairmacs credential registry."
                            )
                    );
        }
    }

    // =========================================================
    // GET USER CERTIFICATES
    // =========================================================

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<CertificateDTO>>>
    getUserCertificates(
            @PathVariable Long userId) {

        try {

            List<CertificateDTO> certs =
                    certificateService.getCertificatesByUser(
                            userId
                    );

            return ResponseEntity.ok(
                    ApiResponse.success(
                            "Certificates retrieved successfully.",
                            certs
                    )
            );

        } catch (SecurityException e) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );
        }
    }

    // =========================================================
    // RECENT CERTIFICATES
    // =========================================================

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<CertificateDTO>>>
    getRecentCertificates(
            @RequestParam(defaultValue = "10") int limit) {

        try {

            List<CertificateDTO> certs =
                    certificateService.getRecentCertificates(
                            limit
                    );

            return ResponseEntity.ok(
                    ApiResponse.success(
                            "Recent certificates retrieved.",
                            certs
                    )
            );

        } catch (SecurityException e) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );
        }
    }

    // =========================================================
    // SEARCH & FILTER CERTIFICATES
    // =========================================================

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<CertificateDTO>>>
    searchCertificates(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String department,
            @RequestParam(defaultValue = "50") int limit) {

        try {

            List<CertificateDTO> certs =
                    certificateService.searchCertificates(
                            query,
                            department,
                            limit
                    );

            return ResponseEntity.ok(
                    ApiResponse.success(
                            "Certificates found.",
                            certs
                    )
            );

        } catch (SecurityException e) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CertificateDTO>>>
    getAllCertificates(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String department,
            @RequestParam(defaultValue = "50") int limit) {

        return searchCertificates(query, department, limit);
    }
}