package com.fairmacs.lms.service;

import com.fairmacs.lms.controller.LessonDocumentController;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LessonRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.PdfWriter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.lang.reflect.Proxy;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Fairmacs KMS Course Document Watermark Test Suite")
public class CourseDocumentWatermarkTest {

    private final Map<Long, Course> courseStore = new ConcurrentHashMap<>();
    private final Map<Long, Module> moduleStore = new ConcurrentHashMap<>();
    private final Map<Long, Lesson> lessonStore = new ConcurrentHashMap<>();
    private final Map<Long, User> userStore = new ConcurrentHashMap<>();
    private final Map<Long, Enrollment> enrollmentStore = new ConcurrentHashMap<>();
    private final Map<String, byte[]> workDriveCloudStorage = new ConcurrentHashMap<>();

    private final AtomicLong seq = new AtomicLong(100);

    private LessonDocumentAccessService accessService;
    private LessonDocumentController controller;
    private PolicyWatermarkService watermarkService;

    private User employee1;
    private User employee2;
    private User hrAdmin;
    private User currentUser;
    private Course course1;
    private Module module1;
    private Lesson lessonPdf;
    private byte[] samplePdfBytes;
    private String originalPdfHash;

    @BeforeEach
    void setUp() throws Exception {
        courseStore.clear();
        moduleStore.clear();
        lessonStore.clear();
        userStore.clear();
        enrollmentStore.clear();
        workDriveCloudStorage.clear();

        // 1. Create Users
        employee1 = new User();
        employee1.setId(101L);
        employee1.setName("Priya Nair");
        employee1.setEmployeeId("EMP2002");
        employee1.setEmail("priya.nair@fairmacs.com");
        employee1.setRole(Role.EMPLOYEE);
        employee1.setStatus(UserStatus.ACTIVE);
        userStore.put(employee1.getId(), employee1);

        employee2 = new User();
        employee2.setId(102L);
        employee2.setName("Karthik Subramanian");
        employee2.setEmployeeId("EMP2003");
        employee2.setEmail("karthik.s@fairmacs.com");
        employee2.setRole(Role.EMPLOYEE);
        employee2.setStatus(UserStatus.ACTIVE);
        userStore.put(employee2.getId(), employee2);

        hrAdmin = new User();
        hrAdmin.setId(1L);
        hrAdmin.setName("HR Admin User");
        hrAdmin.setEmployeeId("HR001");
        hrAdmin.setEmail("hr@fairmacs.com");
        hrAdmin.setRole(Role.HR_ADMIN);
        hrAdmin.setStatus(UserStatus.ACTIVE);
        userStore.put(hrAdmin.getId(), hrAdmin);

        currentUser = employee1;

        // 2. Create Course, Module, Lesson
        course1 = new Course();
        course1.setId(10L);
        course1.setCourseId("CRS-OPS-101");
        course1.setTitle("Container Logistics Operations");
        course1.setActive(true);
        course1.setDraft(false);
        courseStore.put(course1.getId(), course1);

        module1 = new Module();
        module1.setId(20L);
        module1.setCourse(course1);
        moduleStore.put(module1.getId(), module1);

        lessonPdf = new Lesson();
        lessonPdf.setId(30L);
        lessonPdf.setLessonId("LES-VGM-GUIDE");
        lessonPdf.setTitle("Verified Gross Mass Operations Manual");
        lessonPdf.setType("pdf");
        lessonPdf.setWorkdriveFileId("wd-file-vgm-pdf-999");
        lessonPdf.setModule(module1);
        lessonStore.put(lessonPdf.getId(), lessonPdf);

        // 3. Create active enrollments for Employee 1
        Enrollment enr1 = new Enrollment();
        enr1.setId(501L);
        enr1.setUser(employee1);
        enr1.setCourse(course1);
        enr1.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollmentStore.put(enr1.getId(), enr1);

        // 4. Create sample 3-page PDF bytes
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document pdfDoc = new Document();
        PdfWriter.getInstance(pdfDoc, baos);
        pdfDoc.open();
        pdfDoc.add(new Paragraph("Page 1: VGM Safety Regulations"));
        pdfDoc.newPage();
        pdfDoc.add(new Paragraph("Page 2: Container Weight Discrepancies"));
        pdfDoc.newPage();
        pdfDoc.add(new Paragraph("Page 3: Terminal Weighbridge Protocols"));
        pdfDoc.close();
        samplePdfBytes = baos.toByteArray();
        originalPdfHash = computeSha256(samplePdfBytes);

        workDriveCloudStorage.put(lessonPdf.getWorkdriveFileId(), samplePdfBytes);

        // 5. Mock Repositories
        LessonRepository lessonRepo = createMockProxy(LessonRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByLessonId".equals(name)) {
                return lessonStore.values().stream().filter(l -> args[0].equals(l.getLessonId())).findFirst();
            }
            if ("findById".equals(name)) return Optional.ofNullable(lessonStore.get((Long) args[0]));
            return null;
        });

        EnrollmentRepository enrollmentRepo = createMockProxy(EnrollmentRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByUserIdAndCourseId".equals(name)) {
                Long uId = (Long) args[0];
                Long cId = (Long) args[1];
                return enrollmentStore.values().stream()
                        .filter(e -> e.getUser().getId().equals(uId) && e.getCourse().getId().equals(cId))
                        .findFirst();
            }
            return null;
        });

        UserRepository userRepo = createMockProxy(UserRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) return Optional.ofNullable(userStore.get((Long) args[0]));
            return null;
        });

        SecurityContextUtil securityContextUtil = new SecurityContextUtil(userRepo) {
            @Override
            public User getCurrentUser() {
                return currentUser;
            }
            @Override
            public Long getCurrentUserId() {
                return currentUser != null ? currentUser.getId() : null;
            }
            @Override
            public String getCurrentUserRole() {
                return currentUser != null && currentUser.getRole() != null ? currentUser.getRole().name() : null;
            }
        };

        ZohoWorkDriveDownloadService downloadService = new ZohoWorkDriveDownloadService(null) {
            @Override
            public DownloadedDocument download(String fileId) {
                byte[] content = workDriveCloudStorage.get(fileId);
                if (content == null) {
                    throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "WorkDrive file not found: " + fileId);
                }
                return new DownloadedDocument(content, "vgm-manual.pdf", MediaType.APPLICATION_PDF);
            }
        };

        watermarkService = new PolicyWatermarkService();
        accessService = new LessonDocumentAccessService(
                lessonRepo,
                enrollmentRepo,
                securityContextUtil,
                downloadService,
                null,
                watermarkService
        );
        controller = new LessonDocumentController(accessService);
    }

    @Test
    @DisplayName("1. Authenticated employee requests a course PDF for viewing (viewer headers populated)")
    void test1_AuthenticatedEmployeeRequestsCoursePdf_ViewerHeaders() {
        currentUser = employee1;
        ResponseEntity<byte[]> response = controller.viewDocument("LES-VGM-GUIDE");

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(MediaType.APPLICATION_PDF, response.getHeaders().getContentType());
        assertTrue(response.getHeaders().getContentDisposition().isInline());

        // Verify watermark response headers for frontend canvas rendering
        String wmText = response.getHeaders().getFirst("X-Watermark-Text");
        String wmName = response.getHeaders().getFirst("X-Watermark-Employee-Name");
        String wmCode = response.getHeaders().getFirst("X-Watermark-Employee-Code");
        String wmTime = response.getHeaders().getFirst("X-Watermark-Timestamp");

        assertNotNull(wmText, "X-Watermark-Text must be present");
        assertEquals("Priya Nair", wmName);
        assertEquals("EMP2002", wmCode);
        assertNotNull(wmTime);

        assertTrue(wmText.contains("CONFIDENTIAL"));
        assertTrue(wmText.contains("PROPERTY OF FAIRMACS"));
        assertTrue(wmText.contains("Priya Nair"));
        assertTrue(wmText.contains("EMP2002"));
        assertTrue(wmText.contains("FAIRMACS KMS"));
    }

    @Test
    @DisplayName("2. Watermark contains the correct employee identity from backend")
    void test2_WatermarkContainsCorrectEmployeeIdentity() {
        String wm1 = accessService.generateWatermarkText(employee1, LocalDateTime.of(2026, 11, 17, 11, 30));
        assertTrue(wm1.contains("Priya Nair"), "Watermark must contain Employee 1 name");
        assertTrue(wm1.contains("EMP2002"), "Watermark must contain Employee 1 ID");
        assertTrue(wm1.contains("FAIRMACS KMS"));
        assertTrue(wm1.contains("17 Nov 2026, 11:30 AM"));

        String wm2 = accessService.generateWatermarkText(employee2, LocalDateTime.of(2026, 11, 17, 11, 30));
        assertTrue(wm2.contains("Karthik Subramanian"), "Watermark must contain Employee 2 name");
        assertTrue(wm2.contains("EMP2003"), "Watermark must contain Employee 2 ID");
        assertTrue(wm2.contains("FAIRMACS KMS"));
    }

    @Test
    @DisplayName("3. Every PDF page receives the watermark and preserves dimensions")
    void test3_EveryPdfPageReceivesWatermark() throws Exception {
        currentUser = employee1;
        ResponseEntity<byte[]> response = controller.downloadDocument("LES-VGM-GUIDE");
        byte[] watermarkedBytes = response.getBody();
        assertNotNull(watermarkedBytes);

        PdfReader reader = new PdfReader(watermarkedBytes);
        assertEquals(3, reader.getNumberOfPages(), "Watermarked PDF must maintain exact 3-page count");

        PdfReader origReader = new PdfReader(samplePdfBytes);
        for (int p = 1; p <= 3; p++) {
            assertEquals(origReader.getPageSize(p).getWidth(), reader.getPageSize(p).getWidth(), 0.01);
            assertEquals(origReader.getPageSize(p).getHeight(), reader.getPageSize(p).getHeight(), 0.01);
        }
        origReader.close();
        reader.close();
    }

    @Test
    @DisplayName("4. Downloaded PDF contains the watermark and attachment disposition")
    void test4_DownloadedPdfContainsWatermark() throws Exception {
        currentUser = employee1;
        ResponseEntity<byte[]> downloadResponse = controller.downloadDocument("LES-VGM-GUIDE");

        assertEquals(200, downloadResponse.getStatusCode().value());
        assertTrue(downloadResponse.getHeaders().getContentDisposition().isAttachment());
        assertTrue(downloadResponse.getHeaders().getContentDisposition().getFilename().contains("vgm-manual.pdf"));

        byte[] watermarkedBytes = downloadResponse.getBody();
        assertNotNull(watermarkedBytes);
        assertTrue(watermarkedBytes.length > samplePdfBytes.length, "Watermarked PDF derivative must contain stamped watermark stream");
        assertNotEquals(originalPdfHash, computeSha256(watermarkedBytes), "Watermarked derivative hash must differ from original");
    }

    @Test
    @DisplayName("5. Original PDF in storage remains completely unchanged")
    void test5_OriginalPdfRemainsUnchanged() throws Exception {
        currentUser = employee1;
        controller.downloadDocument("LES-VGM-GUIDE");
        currentUser = employee2;
        // Enroll employee2 to download
        Enrollment enr2 = new Enrollment();
        enr2.setId(502L);
        enr2.setUser(employee2);
        enr2.setCourse(course1);
        enr2.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollmentStore.put(enr2.getId(), enr2);
        controller.downloadDocument("LES-VGM-GUIDE");

        byte[] currentStorageBytes = workDriveCloudStorage.get(lessonPdf.getWorkdriveFileId());
        assertEquals(originalPdfHash, computeSha256(currentStorageBytes), "Original WorkDrive document must remain byte-for-byte identical");
    }

    @Test
    @DisplayName("6. Different employees receive different personalised watermarks")
    void test6_DifferentEmployeesReceiveDifferentWatermarks() throws Exception {
        // Enroll employee2
        Enrollment enr2 = new Enrollment();
        enr2.setId(502L);
        enr2.setUser(employee2);
        enr2.setCourse(course1);
        enr2.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollmentStore.put(enr2.getId(), enr2);

        currentUser = employee1;
        ResponseEntity<byte[]> res1 = controller.downloadDocument("LES-VGM-GUIDE");
        String hash1 = computeSha256(res1.getBody());

        currentUser = employee2;
        ResponseEntity<byte[]> res2 = controller.downloadDocument("LES-VGM-GUIDE");
        String hash2 = computeSha256(res2.getBody());

        assertNotEquals(hash1, hash2, "Derivative PDFs for different employees must have distinct cryptographic hashes");
    }

    @Test
    @DisplayName("7. Unauthenticated requests are rejected with 401 Unauthorized")
    void test7_UnauthenticatedRequestsRejected() {
        currentUser = null;
        ResponseStatusException exView = assertThrows(ResponseStatusException.class, () -> controller.viewDocument("LES-VGM-GUIDE"));
        assertEquals(401, exView.getStatusCode().value());

        ResponseStatusException exDown = assertThrows(ResponseStatusException.class, () -> controller.downloadDocument("LES-VGM-GUIDE"));
        assertEquals(401, exDown.getStatusCode().value());
    }

    @Test
    @DisplayName("8. Unauthorised course document access is rejected with 403 Forbidden")
    void test8_UnauthorisedCourseDocumentAccessRejected() {
        // Employee 2 is not enrolled in course 1
        currentUser = employee2;
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> controller.viewDocument("LES-VGM-GUIDE"));
        assertEquals(403, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("You do not have access"));

        ResponseStatusException exDown = assertThrows(ResponseStatusException.class, () -> controller.downloadDocument("LES-VGM-GUIDE"));
        assertEquals(403, exDown.getStatusCode().value());

        // Inactive user
        currentUser = employee1;
        employee1.setStatus(UserStatus.INACTIVE);
        ResponseStatusException exInactive = assertThrows(ResponseStatusException.class, () -> controller.viewDocument("LES-VGM-GUIDE"));
        assertEquals(403, exInactive.getStatusCode().value());
        employee1.setStatus(UserStatus.ACTIVE);
    }

    @Test
    @DisplayName("9. Invalid or missing PDFs are handled correctly")
    void test9_InvalidOrMissingPdfsHandledCorrectly() {
        currentUser = employee1;
        // Non-existent lesson
        ResponseStatusException exNotFound = assertThrows(ResponseStatusException.class, () -> controller.viewDocument("LES-NON-EXISTENT"));
        assertEquals(404, exNotFound.getStatusCode().value());

        // Lesson without attached document
        Lesson noDocLesson = new Lesson();
        noDocLesson.setId(31L);
        noDocLesson.setLessonId("LES-NO-DOC");
        noDocLesson.setTitle("Lecture Only");
        noDocLesson.setModule(module1);
        noDocLesson.setWorkdriveFileId(null);
        lessonStore.put(noDocLesson.getId(), noDocLesson);

        ResponseStatusException exNoDoc = assertThrows(ResponseStatusException.class, () -> controller.viewDocument("LES-NO-DOC"));
        assertEquals(404, exNoDoc.getStatusCode().value());
    }

    @Test
    @DisplayName("10. Large multipage PDFs process successfully")
    void test10_LargeMultipagePdfsProcessSuccessfully() throws Exception {
        ByteArrayOutputStream largeBaos = new ByteArrayOutputStream();
        Document largeDoc = new Document();
        PdfWriter.getInstance(largeDoc, largeBaos);
        largeDoc.open();
        for (int i = 1; i <= 25; i++) {
            largeDoc.add(new Paragraph("Chapter " + i + " Detailed Fairmacs SOP specifications and regulations."));
            if (i < 25) largeDoc.newPage();
        }
        largeDoc.close();

        byte[] largePdfBytes = largeBaos.toByteArray();
        assertTrue(largePdfBytes.length > 0);

        String wmText = "CONFIDENTIAL – PROPERTY OF FAIRMACS | Priya Nair | EMP2002 | FAIRMACS KMS | 17 Nov 2026, 11:30 AM";
        byte[] watermarkedLarge = watermarkService.embedWatermark(largePdfBytes, wmText, 45.0f);

        assertNotNull(watermarkedLarge);
        PdfReader reader = new PdfReader(watermarkedLarge);
        assertEquals(25, reader.getNumberOfPages(), "All 25 pages must be stamped and retained");
        reader.close();
    }

    @Test
    @DisplayName("11. Parameterised download query (?download=true) delegates to download endpoint")
    void test11_ParameterisedDownloadDelegation() {
        currentUser = employee1;
        ResponseEntity<byte[]> response = controller.viewDocument("LES-VGM-GUIDE", true);
        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getHeaders().getContentDisposition().isAttachment());
    }

    private String computeSha256(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(md.digest(data));
    }

    @SuppressWarnings("unchecked")
    private <T> T createMockProxy(Class<T> interfaceClass, MockInvocationHandler handler) {
        return (T) Proxy.newProxyInstance(
                interfaceClass.getClassLoader(),
                new Class<?>[]{interfaceClass},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("equals".equals(name)) return proxy == args[0];
                    if ("hashCode".equals(name)) return System.identityHashCode(proxy);
                    return handler.invoke(method, args == null ? new Object[0] : args);
                }
        );
    }

    @FunctionalInterface
    private interface MockInvocationHandler {
        Object invoke(java.lang.reflect.Method method, Object[] args) throws Throwable;
    }
}
