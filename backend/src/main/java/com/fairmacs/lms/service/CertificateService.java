package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.entity.Certificate;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Department;
import com.fairmacs.lms.entity.NotificationPriority;
import com.fairmacs.lms.entity.NotificationType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.beans.factory.annotation.Autowired;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
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
import java.util.Optional;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class CertificateService {

    private final CertificateRepository certificateRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final SecurityContextUtil securityContextUtil;
    private final NotificationService notificationService;
    private final IdSequenceService idSequenceService;

    private final Random random = new Random();

    private static final String CERTIFICATE_DIRECTORY =
            "uploads/certificates";

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public CertificateService(
            CertificateRepository certificateRepository,
            UserRepository userRepository,
            CourseRepository courseRepository,
            SecurityContextUtil securityContextUtil) {
        this(certificateRepository, userRepository, courseRepository, securityContextUtil, null, null);
    }

    public CertificateService(
            CertificateRepository certificateRepository,
            UserRepository userRepository,
            CourseRepository courseRepository,
            SecurityContextUtil securityContextUtil,
            NotificationService notificationService) {
        this(certificateRepository, userRepository, courseRepository, securityContextUtil, notificationService, null);
    }

    @Autowired
    public CertificateService(
            CertificateRepository certificateRepository,
            UserRepository userRepository,
            CourseRepository courseRepository,
            SecurityContextUtil securityContextUtil,
            NotificationService notificationService,
            IdSequenceService idSequenceService) {

        this.certificateRepository = certificateRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.securityContextUtil = securityContextUtil;
        this.notificationService = notificationService;
        this.idSequenceService = idSequenceService;
    }

    // =========================================================
    // CERTIFICATE ID GENERATION
    // =========================================================

    private String generateCertificateId(Course course, User user) {
        if (course == null) {
            throw new IllegalArgumentException("Course is required to generate a certificate ID.");
        }
        Department owningDept = course.getOwningDepartment();
        if (owningDept == null || owningDept.getName() == null || owningDept.getName().isBlank()) {
            throw new IllegalStateException(
                    String.format("Course '%s' (%s) does not have an assigned owning department. Please assign an owning department before generating certificates.",
                            course.getTitle(), course.getCourseId())
            );
        }
        String deptName = owningDept.getName().trim();
        if ("Uncategorized".equalsIgnoreCase(deptName)) {
            throw new IllegalStateException(
                    String.format("Course '%s' (%s) has an invalid owning department 'Uncategorized'. Please assign a valid owning department before generating certificates.",
                            course.getTitle(), course.getCourseId())
            );
        }

        if (idSequenceService != null) {
            int maxAttempts = 10;
            for (int i = 0; i < maxAttempts; i++) {
                String candidate = idSequenceService.generateCertificateId(deptName);
                if (!certificateRepository.existsByCertificateId(candidate)) {
                    return candidate;
                }
            }
            return idSequenceService.generateCertificateId(deptName);
        }

        String prefix = resolveFallbackPrefix(deptName);
        int maxAttempts = 5;
        for (int i = 0; i < maxAttempts; i++) {
            String candidate = String.format("%s%03d", prefix, random.nextInt(1000));
            if (!certificateRepository.existsByCertificateId(candidate)) {
                return candidate;
            }
        }

        return String.format("%s%03d", prefix, Math.abs(System.nanoTime() % 1000L));
    }

    private String resolveFallbackPrefix(String departmentName) {
        if (departmentName == null) return "GEN";
        String lower = departmentName.toLowerCase(Locale.ROOT);
        if (lower.contains("operation")) return "OP";
        if (lower.contains("document")) return "DOC";
        if (lower.contains("account") || lower.contains("finance")) return "ACC";
        if (lower.contains("human") || lower.contains("hr")) return "HR";
        if (lower.contains("admin")) return "ADM";
        if (lower.contains("customer")) return "CS";
        if (lower.contains("price") || lower.contains("pricing")) return "PRC";
        if (lower.contains("sale")) return "SAL";
        return "GEN";
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

        if (Boolean.TRUE.equals(course.getFoundation())) {
            throw new IllegalStateException(
                    String.format("Course '%s' (%s) is a Foundation Course. Foundation courses do not issue certificates.",
                            course.getTitle(), course.getCourseId())
            );
        }

        if (course.getOwningDepartment() == null || course.getOwningDepartment().getName() == null || course.getOwningDepartment().getName().isBlank()) {
            throw new IllegalStateException(
                    String.format("Course '%s' (%s) does not have an assigned owning department. Please assign an owning department before generating certificates.",
                            course.getTitle(), course.getCourseId())
            );
        }

        if ("Uncategorized".equalsIgnoreCase(course.getOwningDepartment().getName().trim())) {
            throw new IllegalStateException(
                    String.format("Course '%s' (%s) has an invalid owning department 'Uncategorized'. Please assign a valid owning department before generating certificates.",
                            course.getTitle(), course.getCourseId())
            );
        }

        Certificate certificate = new Certificate();

        certificate.setUser(user);
        certificate.setCourse(course);
        certificate.setScore(score);

        int attempts = 0;

        while (attempts < 3) {

            try {

                certificate.setCertificateId(
                        generateCertificateId(course, user)
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

                Certificate finalCert = certificateRepository.save(saved);
                emitCertificateIssuedNotification(finalCert);
                return finalCert;

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
            if (notificationService != null) {
                String certCode = certificate != null ? certificate.getCertificateId() : "UNKNOWN";
                String courseTitle = (certificate != null && certificate.getCourse() != null)
                        ? certificate.getCourse().getTitle()
                        : "Course";
                notificationService.notifyHrAdmins(
                        "Certificate PDF Generation Alert",
                        "Unable to generate PDF file for certificate " + certCode + " (\"" + courseTitle + "\"). Please verify certificate storage permissions.",
                        NotificationType.HR_ADMIN_ALERT,
                        NotificationPriority.HIGH,
                        "CERTIFICATE",
                        certCode,
                        "/hr",
                        "CERT_PDF_FAIL:" + certCode,
                        Map.of("certificateId", certCode)
                );
            }

            throw new RuntimeException(
                    "Unable to create certificate PDF.",
                    e
            );
        }
    }

    private void emitCertificateIssuedNotification(Certificate certificate) {
        if (notificationService == null || certificate == null || certificate.getUser() == null) {
            return;
        }
        User user = certificate.getUser();
        Course course = certificate.getCourse();
        String courseTitle = course != null ? course.getTitle() : "Training Course";
        String courseCode = course != null ? course.getCourseId() : "";
        String certId = certificate.getCertificateId();

        notificationService.createNotificationSafely(
                user.getId(),
                "Certificate Issued: " + courseTitle,
                String.format(
                        "Your official Fairmacs completion certificate (%s) for \"%s\" (%s) has been issued and is ready to view or download.",
                        certId,
                        courseTitle,
                        courseCode
                ),
                NotificationType.CERTIFICATE_ISSUED,
                NotificationPriority.NORMAL,
                "CERTIFICATE",
                certId,
                "/certificates",
                "CERTIFICATE_ISSUED:" + certId,
                Map.of(
                        "certificateId", certId,
                        "courseId", courseCode,
                        "courseTitle", courseTitle,
                        "pdfUrl", certificate.getPdfUrl() != null ? certificate.getPdfUrl() : ""
                )
        );
    }

    // =========================================================
    // CREATE PDF CONTENT
    // =========================================================

    @Autowired(required = false)
    private SystemSettingsService systemSettingsService;

    private String resolveOrganisationName() {
        try {
            if (systemSettingsService != null) {
                String name = systemSettingsService.getString(SystemSettingsService.ORGANIZATION_NAME);
                if (name != null && !name.isBlank()) {
                    return name;
                }
            }
        } catch (RuntimeException ignored) {
            // fall through to the default
        }
        return "FAIRMACS";
    }

    byte[] createCertificatePdf(
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
            return CertificatePdfRenderer.render(certificate, resolveOrganisationName());
        } catch (Exception e) {
            // The branded template could not be drawn; fall back to the plain layout below.
            org.slf4j.LoggerFactory.getLogger(CertificateService.class)
                    .warn("Branded certificate rendering failed, using plain layout: {}", e.toString());
            outputStream.reset();
            document = new Document(PageSize.A4.rotate(), 50, 50, 50, 50);
        }

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

            Paragraph tagline =
                    new Paragraph(
                            "Across All Boundaries",
                            FontFactory.getFont(
                                    FontFactory.HELVETICA_OBLIQUE,
                                    11,
                                    Font.ITALIC
                            )
                    );
            tagline.setAlignment(Element.ALIGN_CENTER);
            document.add(tagline);

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

            String courseDept =
                    safeValue(
                            certificate.getCourse() != null && certificate.getCourse().getOwningDepartment() != null
                                    ? certificate.getCourse().getOwningDepartment().getName()
                                    : null
                    );

            Paragraph deptParagraph =
                    new Paragraph(
                            courseDept,
                            normalFont
                    );

            deptParagraph.setAlignment(
                    Element.ALIGN_CENTER
            );

            document.add(
                    deptParagraph
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

            document.add(new Paragraph(" "));

            PdfPTable signatureTable = new PdfPTable(2);
            signatureTable.setWidthPercentage(80);
            signatureTable.setWidths(new float[]{1, 1});

            PdfPCell emptyLeftCell = new PdfPCell(new Phrase(""));
            emptyLeftCell.setBorder(Rectangle.NO_BORDER);
            signatureTable.addCell(emptyLeftCell);

            PdfPCell signCell = new PdfPCell();
            signCell.setBorder(Rectangle.NO_BORDER);
            signCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph signLine = new Paragraph("___________________________", boldFont);
            signLine.setAlignment(Element.ALIGN_RIGHT);
            Paragraph signTitle = new Paragraph("Executive Director", boldFont);
            signTitle.setAlignment(Element.ALIGN_RIGHT);
            Paragraph signCompany = new Paragraph("Fairmacs LMS", smallFont);
            signCompany.setAlignment(Element.ALIGN_RIGHT);
            signCell.addElement(signLine);
            signCell.addElement(signTitle);
            signCell.addElement(signCompany);
            signatureTable.addCell(signCell);

            document.add(signatureTable);

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

    @Transactional
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
            generateAndAttachPdf(certificate);
        }

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

        if (currentUserId == null || currentRole == null) {
            throw new SecurityException("Authentication is required to access this certificate.");
        }

        boolean isOwner =
                certificate.getUser() != null
                        && certificate.getUser()
                        .getId()
                        .equals(currentUserId);

        if (isOwner || Role.HR_ADMIN.name().equalsIgnoreCase(currentRole)) {
            return;
        }

        if (Role.MANAGER.name().equalsIgnoreCase(currentRole)) {
            User currentUser = securityContextUtil.getCurrentUser();
            User certOwner = certificate.getUser();
            if (currentUser != null
                    && certOwner != null
                    && currentUser.getDepartment() != null
                    && currentUser.getDepartment().equalsIgnoreCase(certOwner.getDepartment())) {
                return;
            }
            throw new SecurityException(
                    "Managers may only access certificates within their own department."
            );
        }

        if (Role.TRAINER.name().equalsIgnoreCase(currentRole)) {
            User currentUser = securityContextUtil.getCurrentUser();
            Course course = certificate.getCourse();
            boolean isAuthor = course != null && course.getCreatedBy() != null
                    && course.getCreatedBy().getId() != null
                    && course.getCreatedBy().getId().equals(currentUserId);
            boolean isCourseDept = currentUser != null && currentUser.getDepartment() != null
                    && course != null && course.getOwningDepartment() != null
                    && currentUser.getDepartment().equalsIgnoreCase(course.getOwningDepartment().getName());
            boolean isUserDept = currentUser != null && currentUser.getDepartment() != null
                    && certificate.getUser() != null && certificate.getUser().getDepartment() != null
                    && currentUser.getDepartment().equalsIgnoreCase(certificate.getUser().getDepartment());

            if (isAuthor || isCourseDept || isUserDept) {
                return;
            }
            throw new SecurityException(
                    "Trainers may only access certificates within their authorized training scope."
            );
        }

        throw new SecurityException(
                "You are not authorized to access this certificate."
        );
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

        boolean isTrainer =
                Role.TRAINER.name()
                        .equalsIgnoreCase(currentRole);

        boolean isSelf =
                targetUserId.equals(currentUserId);

        if (!isSelf && !isManager && !isHr && !isTrainer) {

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

            if (currentUser == null
                    || currentUser.getDepartment() == null
                    || targetUser.getDepartment() == null
                    || !targetUser.getDepartment().equalsIgnoreCase(currentUser.getDepartment())) {

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

        if (isTrainer && !isSelf && !isHr) {
            User currentUser = securityContextUtil.getCurrentUser();
            String trainerDept = currentUser != null ? currentUser.getDepartment() : null;
            return certs.stream()
                    .filter(c -> {
                        Course course = c.getCourse();
                        boolean isAuthor = course != null && course.getCreatedBy() != null
                                && course.getCreatedBy().getId() != null
                                && course.getCreatedBy().getId().equals(currentUserId);
                        boolean courseDept = course != null && course.getOwningDepartment() != null
                                && trainerDept != null && trainerDept.equalsIgnoreCase(course.getOwningDepartment().getName());
                        boolean userDept = c.getUser() != null && c.getUser().getDepartment() != null
                                && trainerDept != null && trainerDept.equalsIgnoreCase(c.getUser().getDepartment());
                        return isAuthor || courseDept || userDept;
                    })
                    .map(this::toDTO)
                    .collect(Collectors.toList());
        }

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

        String currentRole = securityContextUtil.getCurrentUserRole();
        Long currentUserId = securityContextUtil.getCurrentUserId();

        boolean isHr = Role.HR_ADMIN.name().equalsIgnoreCase(currentRole);
        boolean isManager = Role.MANAGER.name().equalsIgnoreCase(currentRole);
        boolean isTrainer = Role.TRAINER.name().equalsIgnoreCase(currentRole);

        if (!isHr && !isManager && !isTrainer) {

            throw new SecurityException(
                    "Only Manager, HR, and Trainer roles may access recent certificates."
            );
        }

        User currentUser = securityContextUtil.getCurrentUser();
        List<Certificate> certs =
                certificateRepository.findAll();

        if (isManager && currentUser != null && currentUser.getDepartment() != null) {
            String mgrDept = currentUser.getDepartment();
            certs = certs.stream()
                    .filter(c -> c.getUser() != null
                            && c.getUser().getDepartment() != null
                            && c.getUser().getDepartment().equalsIgnoreCase(mgrDept))
                    .collect(Collectors.toList());
        } else if (isTrainer && currentUser != null) {
            String trnDept = currentUser.getDepartment();
            certs = certs.stream()
                    .filter(c -> {
                        Course course = c.getCourse();
                        boolean isAuthor = course != null && course.getCreatedBy() != null
                                && course.getCreatedBy().getId() != null
                                && course.getCreatedBy().getId().equals(currentUserId);
                        boolean courseDept = course != null && course.getOwningDepartment() != null
                                && trnDept != null && trnDept.equalsIgnoreCase(course.getOwningDepartment().getName());
                        boolean userDept = c.getUser() != null && c.getUser().getDepartment() != null
                                && trnDept != null && trnDept.equalsIgnoreCase(c.getUser().getDepartment());
                        return isAuthor || courseDept || userDept;
                    })
                    .collect(Collectors.toList());
        }

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
    // SEARCH & FILTER CERTIFICATES
    // =========================================================

    @Transactional(readOnly = true)
    public List<CertificateDTO> searchCertificates(
            String query,
            String department,
            int limit) {

        String currentRole = securityContextUtil.getCurrentUserRole();
        Long currentUserId = securityContextUtil.getCurrentUserId();

        boolean isHr = Role.HR_ADMIN.name().equalsIgnoreCase(currentRole);
        boolean isManager = Role.MANAGER.name().equalsIgnoreCase(currentRole);
        boolean isTrainer = Role.TRAINER.name().equalsIgnoreCase(currentRole);

        User currentUser = securityContextUtil.getCurrentUser();
        List<Certificate> certs = certificateRepository.findAll();

        // RBAC Scope Filtering
        if (isManager && currentUser != null && currentUser.getDepartment() != null) {
            String mgrDept = currentUser.getDepartment();
            certs = certs.stream()
                    .filter(c -> c.getUser() != null && c.getUser().getDepartment() != null
                            && c.getUser().getDepartment().equalsIgnoreCase(mgrDept))
                    .collect(Collectors.toList());
        } else if (isTrainer && currentUser != null) {
            String trnDept = currentUser.getDepartment();
            certs = certs.stream()
                    .filter(c -> {
                        Course course = c.getCourse();
                        boolean isAuthor = course != null && course.getCreatedBy() != null
                                && course.getCreatedBy().getId() != null
                                && course.getCreatedBy().getId().equals(currentUserId);
                        boolean courseDept = course != null && course.getOwningDepartment() != null
                                && trnDept != null && trnDept.equalsIgnoreCase(course.getOwningDepartment().getName());
                        boolean userDept = c.getUser() != null && c.getUser().getDepartment() != null
                                && trnDept != null && trnDept.equalsIgnoreCase(c.getUser().getDepartment());
                        return isAuthor || courseDept || userDept;
                    })
                    .collect(Collectors.toList());
        } else if (!isHr) {
            certs = certs.stream()
                    .filter(c -> c.getUser() != null && currentUserId != null && currentUserId.equals(c.getUser().getId()))
                    .collect(Collectors.toList());
        }

        // Apply department parameter filter
        if (department != null && !department.isBlank() && !"ALL".equalsIgnoreCase(department)) {
            certs = certs.stream()
                    .filter(c -> (c.getUser() != null && c.getUser().getDepartment() != null && department.equalsIgnoreCase(c.getUser().getDepartment()))
                            || (c.getCourse() != null && c.getCourse().getOwningDepartment() != null && department.equalsIgnoreCase(c.getCourse().getOwningDepartment().getName())))
                    .collect(Collectors.toList());
        }

        // Apply text query filter
        if (query != null && !query.isBlank()) {
            String q = query.trim().toLowerCase(Locale.ROOT);
            certs = certs.stream()
                    .filter(c -> {
                        boolean matchCertId = c.getCertificateId() != null && c.getCertificateId().toLowerCase(Locale.ROOT).contains(q);
                        boolean matchName = c.getUser() != null && c.getUser().getName() != null && c.getUser().getName().toLowerCase(Locale.ROOT).contains(q);
                        boolean matchEmpId = c.getUser() != null && c.getUser().getEmployeeId() != null && c.getUser().getEmployeeId().toLowerCase(Locale.ROOT).contains(q);
                        boolean matchCourse = c.getCourse() != null && c.getCourse().getTitle() != null && c.getCourse().getTitle().toLowerCase(Locale.ROOT).contains(q);
                        return matchCertId || matchName || matchEmpId || matchCourse;
                    })
                    .collect(Collectors.toList());
        }

        certs.sort((a, b) -> {
            if (a.getIssuedAt() == null) return 1;
            if (b.getIssuedAt() == null) return -1;
            return b.getIssuedAt().compareTo(a.getIssuedAt());
        });

        int max = limit > 0 ? limit : 50;
        return certs.stream().limit(max).map(this::toDTO).collect(Collectors.toList());
    }

    // =========================================================
    // DTO MAPPING
    // =========================================================

    public Optional<Certificate> getCertificateByUserIdAndCourseId(Long userId, Long courseId) {
        return certificateRepository.findByUserIdAndCourseId(userId, courseId);
    }

    public CertificateDTO toDTO(
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
                    cert.getCourse().getOwningDepartment() != null && cert.getCourse().getOwningDepartment().getName() != null
                            ? cert.getCourse().getOwningDepartment().getName()
                            : cert.getCourse().getCategory()
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