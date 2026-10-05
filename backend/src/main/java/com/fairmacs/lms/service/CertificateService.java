package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.entity.Certificate;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class CertificateService {

    private final CertificateRepository certificateRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final SecurityContextUtil securityContextUtil;

    private final Random random = new Random();

    private static final String CERTIFICATE_DIRECTORY =
            "uploads/certificates";

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMMM yyyy");

    public CertificateService(
            CertificateRepository certificateRepository,
            UserRepository userRepository,
            CourseRepository courseRepository,
            SecurityContextUtil securityContextUtil) {

        this.certificateRepository = certificateRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.securityContextUtil = securityContextUtil;
    }

    // =========================================================
    // CERTIFICATE ID GENERATION
    // =========================================================

    private String generateCertificateId() {

        int year = Year.now().getValue();

        int maxAttempts = 5;

        for (int i = 0; i < maxAttempts; i++) {

            String candidate = String.format(
                    "FM-CERT-%d-%04d",
                    year,
                    random.nextInt(10000)
            );

            if (!certificateRepository.existsByCertificateId(candidate)) {
                return candidate;
            }
        }

        String fallback = String.format(
                "FM-CERT-%d-%08d",
                year,
                Math.abs(System.nanoTime() % 100000000L)
        );

        return fallback;
    }

    // =========================================================
    // CREATE CERTIFICATE
    // =========================================================

    @Transactional
    public Certificate createCertificate(
            Long userId,
            Long courseId,
            Integer score) {

        // Prevent duplicate certificates for the same course.
        if (certificateRepository.existsByUserIdAndCourseId(
                userId,
                courseId)) {

            Certificate existing =
                    certificateRepository.findByUserId(userId)
                            .stream()
                            .filter(c ->
                                    c.getCourse() != null
                                            && c.getCourse()
                                            .getId()
                                            .equals(courseId))
                            .findFirst()
                            .orElse(null);

            if (existing != null) {

                // If an older certificate does not have a PDF,
                // generate it now.
                if (existing.getPdfUrl() == null
                        || existing.getPdfUrl().isBlank()) {

                    generateAndAttachPdf(existing);
                }

                return existing;
            }
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User",
                                "id",
                                userId
                        ));

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Course",
                                "id",
                                courseId
                        ));

        Certificate certificate = new Certificate();

        certificate.setUser(user);
        certificate.setCourse(course);
        certificate.setScore(score);

        int attempts = 0;

        while (attempts < 3) {

            try {

                certificate.setCertificateId(
                        generateCertificateId()
                );

                /*
                 * saveAndFlush is important here because issuedAt
                 * is generated by Hibernate using @CreationTimestamp.
                 * We want issuedAt to be available when generating
                 * the PDF.
                 */
                Certificate saved =
                        certificateRepository.saveAndFlush(
                                certificate
                        );

                generateAndAttachPdf(saved);

                return certificateRepository.save(saved);

            } catch (DataIntegrityViolationException e) {

                attempts++;

                if (attempts >= 3) {
                    throw e;
                }
            }
        }

        return certificate;
    }

    // =========================================================
    // GENERATE PDF
    // =========================================================

    private void generateAndAttachPdf(
            Certificate certificate) {

        try {

            Path directory =
                    Paths.get(CERTIFICATE_DIRECTORY);

            Files.createDirectories(directory);

            String fileName =
                    certificate.getCertificateId()
                            + ".pdf";

            Path pdfPath =
                    directory.resolve(fileName);

            byte[] pdfBytes =
                    createCertificatePdf(certificate);

            Files.write(pdfPath, pdfBytes);

            /*
             * Store an API URL instead of exposing the physical
             * server path.
             */
            certificate.setPdfUrl(
                    "/api/certificates/"
                            + certificate.getCertificateId()
                            + "/pdf"
            );

            certificateRepository.save(certificate);

        } catch (IOException e) {

            throw new RuntimeException(
                    "Unable to create certificate PDF.",
                    e
            );
        }
    }

    // =========================================================
    // CREATE PDF CONTENT
    // =========================================================

    private byte[] createCertificatePdf(
            Certificate certificate)
            throws IOException {

        ByteArrayOutputStream outputStream =
                new ByteArrayOutputStream();

        Document document =
                new Document(
                        PageSize.A4.rotate(),
                        50,
                        50,
                        50,
                        50
                );

        try {

            PdfWriter.getInstance(
                    document,
                    outputStream
            );

            document.open();

            // -------------------------------------------------
            // FONTS
            // -------------------------------------------------

            Font titleFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            30,
                            Font.BOLD
                    );

            Font subtitleFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA,
                            15,
                            Font.NORMAL
                    );

            Font nameFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            24,
                            Font.BOLD
                    );

            Font courseFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            18,
                            Font.BOLD
                    );

            Font normalFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA,
                            11,
                            Font.NORMAL
                    );

            Font boldFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            11,
                            Font.BOLD
                    );

            Font smallFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA,
                            9,
                            Font.NORMAL
                    );

            // -------------------------------------------------
            // OUTER BORDER
            // -------------------------------------------------

            Rectangle border =
                    new Rectangle(
                            PageSize.A4.rotate()
                    );

            border.setBorder(
                    Rectangle.BOX
            );

            border.setBorderWidth(2);

            document.add(
                    new Paragraph(" ")
            );

            // -------------------------------------------------
            // HEADER
            // -------------------------------------------------

            Paragraph company =
                    new Paragraph(
                            "FAIRMACS",
                            titleFont
                    );

            company.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(company);

            Paragraph heading =
                    new Paragraph(
                            "CERTIFICATE OF COMPLETION",
                            subtitleFont
                    );

            heading.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(heading);

            document.add(
                    new Paragraph(" ")
            );

            // -------------------------------------------------
            // PRESENTATION TEXT
            // -------------------------------------------------

            Paragraph presented =
                    new Paragraph(
                            "This certificate is proudly presented to",
                            normalFont
                    );

            presented.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(presented);

            document.add(
                    new Paragraph(" ")
            );

            // -------------------------------------------------
            // EMPLOYEE NAME
            // -------------------------------------------------

            String employeeName =
                    safeValue(
                            certificate.getUser() != null
                                    ? certificate.getUser().getName()
                                    : null
                    );

            Paragraph name =
                    new Paragraph(
                            employeeName,
                            nameFont
                    );

            name.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(name);

            document.add(
                    new Paragraph(" ")
            );

            // -------------------------------------------------
            // EMPLOYEE INFORMATION
            // -------------------------------------------------

            String employeeId =
                    safeValue(
                            certificate.getUser() != null
                                    ? certificate.getUser()
                                    .getEmployeeId()
                                    : null
                    );

            String department =
                    safeValue(
                            certificate.getUser() != null
                                    ? certificate.getUser()
                                    .getDepartment()
                                    : null
                    );

            String designation =
                    safeValue(
                            certificate.getUser() != null
                                    ? certificate.getUser()
                                    .getDesignation()
                                    : null
                    );

            PdfPTable employeeTable =
                    new PdfPTable(3);

            employeeTable.setWidthPercentage(80);

            employeeTable.setWidths(
                    new float[]{1, 1, 1}
            );

            addInfoCell(
                    employeeTable,
                    "Employee ID",
                    employeeId,
                    boldFont,
                    normalFont
            );

            addInfoCell(
                    employeeTable,
                    "Department",
                    department,
                    boldFont,
                    normalFont
            );

            addInfoCell(
                    employeeTable,
                    "Designation",
                    designation,
                    boldFont,
                    normalFont
            );

            document.add(employeeTable);

            document.add(
                    new Paragraph(" ")
            );

            // -------------------------------------------------
            // COURSE INFORMATION
            // -------------------------------------------------

            Paragraph completed =
                    new Paragraph(
                            "has successfully completed the course",
                            normalFont
                    );

            completed.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(completed);

            document.add(
                    new Paragraph(" ")
            );

            String courseTitle =
                    safeValue(
                            certificate.getCourse() != null
                                    ? certificate.getCourse()
                                    .getTitle()
                                    : null
                    );

            Paragraph course =
                    new Paragraph(
                            courseTitle,
                            courseFont
                    );

            course.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(course);

            String category =
                    safeValue(
                            certificate.getCourse() != null
                                    ? certificate.getCourse()
                                    .getCategory()
                                    : null
                    );

            Paragraph categoryParagraph =
                    new Paragraph(
                            category,
                            normalFont
                    );

            categoryParagraph.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(
                    categoryParagraph
            );

            document.add(
                    new Paragraph(" ")
            );

            // -------------------------------------------------
            // SCORE
            // -------------------------------------------------

            String scoreText =
                    certificate.getScore() != null
                            ? certificate.getScore() + "%"
                            : "Completed";

            Paragraph score =
                    new Paragraph(
                            "Assessment Score: "
                                    + scoreText,
                            boldFont
                    );

            score.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(score);

            document.add(
                    new Paragraph(" ")
            );

            // -------------------------------------------------
            // FOOTER INFORMATION
            // -------------------------------------------------

            PdfPTable footerTable =
                    new PdfPTable(2);

            footerTable.setWidthPercentage(80);

            footerTable.setWidths(
                    new float[]{1, 1}
            );

            String issuedDate =
                    certificate.getIssuedAt() != null
                            ? certificate.getIssuedAt()
                            .format(DATE_FORMATTER)
                            : "N/A";

            addInfoCell(
                    footerTable,
                    "Certificate ID",
                    safeValue(
                            certificate.getCertificateId()
                    ),
                    boldFont,
                    smallFont
            );

            addInfoCell(
                    footerTable,
                    "Issue Date",
                    issuedDate,
                    boldFont,
                    smallFont
            );

            document.add(footerTable);

            document.add(
                    new Paragraph(" ")
            );

            Paragraph verification =
                    new Paragraph(
                            "This certificate is digitally issued by Fairmacs "
                                    + "and can be verified using the Certificate ID.",
                            smallFont
                    );

            verification.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(verification);

            document.close();

            return outputStream.toByteArray();

        } catch (Exception e) {

            try {
                document.close();
            } catch (Exception ignored) {
            }

            throw new IOException(
                    "Failed to generate certificate PDF.",
                    e
            );
        }
    }

    // =========================================================
    // PDF TABLE CELL HELPER
    // =========================================================

    private void addInfoCell(
            PdfPTable table,
            String label,
            String value,
            Font labelFont,
            Font valueFont) {

        PdfPCell cell =
                new PdfPCell();

        cell.setPadding(8);
        cell.setBorder(
                Rectangle.BOX
        );

        Paragraph labelParagraph =
                new Paragraph(
                        label,
                        labelFont
                );

        labelParagraph.setAlignment(
                Element.ALIGN_CENTER
        );

        Paragraph valueParagraph =
                new Paragraph(
                        value,
                        valueFont
                );

        valueParagraph.setAlignment(
                Element.ALIGN_CENTER
        );

        cell.addElement(
                labelParagraph
        );

        cell.addElement(
                valueParagraph
        );

        table.addCell(cell);
    }

    // =========================================================
    // READ PDF
    // =========================================================

    @Transactional(readOnly = true)
    public byte[] getCertificatePdf(
            String certificateId) {

        Certificate certificate =
                certificateRepository
                        .findByCertificateIdWithDetails(
                                certificateId
                        )
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Certificate",
                                        "certificateId",
                                        certificateId
                                )
                        );

        verifyCertificateAccess(certificate);

        Path pdfPath =
                Paths.get(
                        CERTIFICATE_DIRECTORY,
                        certificateId + ".pdf"
                );

        if (!Files.exists(pdfPath)) {

            throw new ResourceNotFoundException(
                    "Certificate PDF",
                    "certificateId",
                    certificateId
            );
        }

        try {

            return Files.readAllBytes(pdfPath);

        } catch (IOException e) {

            throw new RuntimeException(
                    "Unable to read certificate PDF.",
                    e
            );
        }
    }

    // =========================================================
    // CERTIFICATE ACCESS CHECK
    // =========================================================

    private void verifyCertificateAccess(
            Certificate certificate) {

        Long currentUserId =
                securityContextUtil
                        .getCurrentUserId();

        String currentRole =
                securityContextUtil
                        .getCurrentUserRole();

        boolean isOwner =
                certificate.getUser() != null
                        && certificate.getUser()
                        .getId()
                        .equals(currentUserId);

        boolean isManagerOrHr =
                Role.MANAGER.name()
                        .equalsIgnoreCase(currentRole)
                        || Role.HR_ADMIN.name()
                        .equalsIgnoreCase(currentRole);

        if (!isOwner && !isManagerOrHr) {

            throw new SecurityException(
                    "You are not authorized to access this certificate."
            );
        }
    }

    // =========================================================
    // VERIFY CERTIFICATE
    // =========================================================

    @Transactional(readOnly = true)
    public CertificateDTO verifyCertificate(
            String certificateId) {

        Certificate cert =
                certificateRepository
                        .findByCertificateIdWithDetails(
                                certificateId
                        )
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Certificate",
                                        "certificateId",
                                        certificateId
                                )
                        );

        verifyCertificateAccess(cert);

        return toDTO(cert);
    }

    // =========================================================
    // GET USER CERTIFICATES
    // =========================================================

    @Transactional(readOnly = true)
    public List<CertificateDTO> getCertificatesByUser(
            Long targetUserId) {

        Long currentUserId =
                securityContextUtil
                        .getCurrentUserId();

        String currentRole =
                securityContextUtil
                        .getCurrentUserRole();

        boolean isHr =
                Role.HR_ADMIN.name()
                        .equalsIgnoreCase(currentRole);

        boolean isManager =
                Role.MANAGER.name()
                        .equalsIgnoreCase(currentRole);

        boolean isSelf =
                targetUserId.equals(currentUserId);

        if (!isSelf && !isManager && !isHr) {

            throw new SecurityException(
                    "You are not authorized to view certificates for this user."
            );
        }

        if (isManager && !isSelf && !isHr) {

            User currentUser =
                    securityContextUtil.getCurrentUser();

            User targetUser =
                    userRepository.findById(targetUserId)
                            .orElseThrow(() ->
                                    new ResourceNotFoundException(
                                            "User",
                                            "id",
                                            targetUserId
                                    ));

            if (currentUser != null
                    && targetUser.getDepartment() != null
                    && !targetUser.getDepartment()
                    .equals(currentUser.getDepartment())) {

                throw new SecurityException(
                        "Managers may only view certificates within their own department."
                );
            }
        }

        List<Certificate> certs =
                certificateRepository
                        .findByUserIdWithCourse(
                                targetUserId
                        );

        return certs.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // =========================================================
    // RECENT CERTIFICATES
    // =========================================================

    @Transactional(readOnly = true)
    public List<CertificateDTO> getRecentCertificates(
            int limit) {

        if (!securityContextUtil.isManagerOrHr()) {

            throw new SecurityException(
                    "Only Manager and HR roles may access recent certificates."
            );
        }

        List<Certificate> certs =
                certificateRepository.findAll();

        certs.sort((a, b) -> {

            if (a.getIssuedAt() == null) {
                return 1;
            }

            if (b.getIssuedAt() == null) {
                return -1;
            }

            return b.getIssuedAt()
                    .compareTo(a.getIssuedAt());
        });

        return certs.stream()
                .limit(limit)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // =========================================================
    // DTO MAPPING
    // =========================================================

    private CertificateDTO toDTO(
            Certificate cert) {

        CertificateDTO dto =
                new CertificateDTO();

        dto.setId(cert.getId());
        dto.setCertificateId(
                cert.getCertificateId()
        );
        dto.setScore(cert.getScore());
        dto.setPdfUrl(cert.getPdfUrl());
        dto.setIssuedAt(cert.getIssuedAt());

        if (cert.getUser() != null) {

            dto.setUserId(
                    cert.getUser().getId()
            );

            dto.setEmployeeId(
                    cert.getUser().getEmployeeId()
            );

            dto.setUserName(
                    cert.getUser().getName()
            );

            dto.setDepartment(
                    cert.getUser().getDepartment()
            );

            dto.setDesignation(
                    cert.getUser().getDesignation()
            );
        }

        if (cert.getCourse() != null) {

            dto.setCourseId(
                    cert.getCourse().getId()
            );

            dto.setCourseTitle(
                    cert.getCourse().getTitle()
            );

            dto.setCourseCategory(
                    cert.getCourse().getCategory()
            );
        }

        return dto;
    }

    // =========================================================
    // SAFE STRING
    // =========================================================

    private String safeValue(String value) {

        if (value == null || value.isBlank()) {
            return "N/A";
        }

        return value;
    }
}