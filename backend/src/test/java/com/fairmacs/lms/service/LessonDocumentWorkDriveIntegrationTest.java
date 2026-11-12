package com.fairmacs.lms.service;

import com.fairmacs.lms.controller.LessonDocumentController;
import com.fairmacs.lms.dto.CourseAuthoringRequest;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.integration.zoho.ZohoOAuthService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveService;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Zoho WorkDrive Lesson Document Full Lifecycle (Upload -> Save -> Reopen -> Download)")
class LessonDocumentWorkDriveIntegrationTest {

    private final Map<Long, Course> courseStore = new ConcurrentHashMap<>();
    private final Map<Long, Module> moduleStore = new ConcurrentHashMap<>();
    private final Map<Long, Lesson> lessonStore = new ConcurrentHashMap<>();
    private final Map<Long, Department> departmentStore = new ConcurrentHashMap<>();
    private final Map<Long, User> userStore = new ConcurrentHashMap<>();
    private final Map<Long, Enrollment> enrollmentStore = new ConcurrentHashMap<>();
    private final Map<String, byte[]> workDriveCloudStorage = new ConcurrentHashMap<>();

    private final AtomicLong seq = new AtomicLong(100);

    private CourseAuthoringService courseAuthoringService;
    private LessonDocumentAccessService lessonDocumentAccessService;
    private LessonDocumentController lessonDocumentController;
    private ZohoWorkDriveService workDriveService;
    private ZohoWorkDriveDownloadService downloadService;

    private User hrAdmin;
    private User employee;
    private User currentUser;
    private Department deptOps;

    @BeforeEach
    void setUp() {
        courseStore.clear();
        moduleStore.clear();
        lessonStore.clear();
        departmentStore.clear();
        userStore.clear();
        enrollmentStore.clear();
        workDriveCloudStorage.clear();

        hrAdmin = new User();
        hrAdmin.setId(1L);
        hrAdmin.setName("HR Admin");
        hrAdmin.setRole(Role.HR_ADMIN);
        hrAdmin.setStatus(UserStatus.ACTIVE);
        userStore.put(hrAdmin.getId(), hrAdmin);

        employee = new User();
        employee.setId(2L);
        employee.setName("Employee");
        employee.setRole(Role.EMPLOYEE);
        employee.setStatus(UserStatus.ACTIVE);
        userStore.put(employee.getId(), employee);

        deptOps = new Department();
        deptOps.setId(10L);
        deptOps.setName("Operations");
        deptOps.setShortCode("OP");
        departmentStore.put(deptOps.getId(), deptOps);

        currentUser = hrAdmin;

        // Mock repositories
        CourseRepository courseRepo = createMockProxy(CourseRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findAll".equals(name)) return new ArrayList<>(courseStore.values());
            if ("findById".equals(name)) return Optional.ofNullable(courseStore.get((Long) args[0]));
            if ("findByCourseId".equals(name)) return courseStore.values().stream().filter(c -> args[0].equals(c.getCourseId())).findFirst();
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                Course c = (Course) args[0];
                if (c.getId() == null) c.setId(seq.incrementAndGet());
                courseStore.put(c.getId(), c);
                return c;
            }
            if ("existsByCourseId".equals(name)) return courseStore.values().stream().anyMatch(c -> args[0].equals(c.getCourseId()));
            return null;
        });

        ModuleRepository moduleRepo = createMockProxy(ModuleRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByCourseIdOrderByOrderIndexAsc".equals(name)) {
                Long cid = (Long) args[0];
                return moduleStore.values().stream().filter(m -> m.getCourse() != null && cid.equals(m.getCourse().getId())).toList();
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                Module m = (Module) args[0];
                if (m.getId() == null) m.setId(seq.incrementAndGet());
                moduleStore.put(m.getId(), m);
                return m;
            }
            return null;
        });

        LessonRepository lessonRepo = createMockProxy(LessonRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByLessonId".equals(name)) {
                String lid = (String) args[0];
                return lessonStore.values().stream().filter(l -> lid.equals(l.getLessonId())).findFirst();
            }
            if ("findByModuleIdOrderByOrderIndexAsc".equals(name)) {
                Long mid = (Long) args[0];
                return lessonStore.values().stream().filter(l -> l.getModule() != null && mid.equals(l.getModule().getId())).toList();
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                Lesson l = (Lesson) args[0];
                if (l.getId() == null) l.setId(seq.incrementAndGet());
                lessonStore.put(l.getId(), l);
                return l;
            }
            return null;
        });

        DepartmentRepository deptRepo = createMockProxy(DepartmentRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) return Optional.ofNullable(departmentStore.get((Long) args[0]));
            if ("existsById".equals(method.getName())) return departmentStore.containsKey((Long) args[0]);
            if ("findByNameIgnoreCase".equals(method.getName())) return departmentStore.values().stream().filter(d -> d.getName().equalsIgnoreCase((String) args[0])).findFirst();
            return null;
        });

        EnrollmentRepository enrollmentRepo = createMockProxy(EnrollmentRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByCourseId".equals(name)) return List.of();
            if ("findByUserIdAndCourseId".equals(name)) {
                Long uid = (Long) args[0];
                Long cid = (Long) args[1];
                return enrollmentStore.values().stream().filter(e -> uid.equals(e.getUser().getId()) && cid.equals(e.getCourse().getId())).findFirst();
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
        };

        // WorkDrive Service subclass simulating Zoho cloud upload & storage
        workDriveService = new ZohoWorkDriveService(null) {
            @Override
            public Map<String, Object> uploadDocument(org.springframework.web.multipart.MultipartFile file) {
                String fileId = "wd-resource-" + UUID.randomUUID().toString().substring(0, 8);
                try {
                    workDriveCloudStorage.put(fileId, file.getBytes());
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
                return Map.of(
                        "success", true,
                        "fileId", fileId,
                        "fileName", file.getOriginalFilename(),
                        "fileType", file.getOriginalFilename().endsWith(".pdf") ? "PDF" : "DOCX",
                        "sizeBytes", file.getSize()
                );
            }
        };

        // WorkDrive Download Service subclass simulating Zoho download
        downloadService = new ZohoWorkDriveDownloadService(null) {
            @Override
            public DownloadedDocument download(String fileId) {
                byte[] content = workDriveCloudStorage.get(fileId);
                if (content == null) {
                    throw new RuntimeException("WorkDrive file not found: " + fileId);
                }
                return new DownloadedDocument(content, "downloaded-doc.pdf", MediaType.APPLICATION_PDF);
            }
        };

        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();

        IdSequenceService idSequenceService = new IdSequenceService(null) {
            @Override
            public long getNextSequence(String key) {
                return 1L;
            }
        };

        QuizRepository quizRepo = createMockProxy(QuizRepository.class, (method, args) -> {
            if ("findByCourseId".equals(method.getName())) return List.of();
            if ("save".equals(method.getName())) return args[0];
            return null;
        });

        QuizQuestionRepository questionRepo = createMockProxy(QuizQuestionRepository.class, (method, args) -> {
            if ("findByQuiz_IdOrderByOrderIndexAsc".equals(method.getName())) return List.of();
            return null;
        });

        QuizAttemptRepository attemptRepo = createMockProxy(QuizAttemptRepository.class, (method, args) -> null);
        CategoryRepository catRepo = createMockProxy(CategoryRepository.class, (method, args) -> Optional.empty());

        courseAuthoringService = new CourseAuthoringService(
                catRepo,
                courseRepo,
                moduleRepo,
                lessonRepo,
                quizRepo,
                questionRepo,
                securityContextUtil,
                deptRepo,
                enrollmentRepo,
                attemptRepo,
                null,
                null,
                null,
                null,
                null,
                null,
                objectMapper,
                null,
                idSequenceService
        );

        lessonDocumentAccessService = new LessonDocumentAccessService(
                lessonRepo,
                enrollmentRepo,
                securityContextUtil,
                downloadService
        );

        lessonDocumentController = new LessonDocumentController(lessonDocumentAccessService);
    }

    @Test
    @DisplayName("Complete WorkDrive Document Lifecycle: Upload -> Save -> Reopen -> Download")
    void testFullWorkDriveDocumentLifecycle() throws Exception {
        // Step 1: Upload a real PDF file to Zoho WorkDrive
        byte[] originalPdfBytes = "%PDF-1.4 Mock Fairmacs Standard Operating Procedures".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "operations-sop.pdf",
                "application/pdf",
                originalPdfBytes
        );

        Map<String, Object> uploadResult = workDriveService.uploadDocument(file);
        assertNotNull(uploadResult);
        assertTrue((Boolean) uploadResult.get("success"));
        String workdriveFileId = (String) uploadResult.get("fileId");
        String workdriveFileName = (String) uploadResult.get("fileName");
        assertNotNull(workdriveFileId);
        assertEquals("operations-sop.pdf", workdriveFileName);

        // Step 2: Author and save the course referencing the WorkDrive file ID
        CourseAuthoringRequest req = new CourseAuthoringRequest();
        req.setTitle("Operations Standard Procedures");
        req.setDepartmentId(deptOps.getId());
        req.setPosition("P1");
        req.setPublish(false); // Save as draft
        req.setFoundation(true);

        CourseAuthoringRequest.ModuleInput mod = new CourseAuthoringRequest.ModuleInput();
        mod.setTitle("Module 1: SOP Execution");
        mod.setOrderIndex(1);

        CourseAuthoringRequest.LessonInput les = new CourseAuthoringRequest.LessonInput();
        les.setTitle("Lesson 1.1: Daily Dispatch Checklist");
        les.setType("PDF");
        les.setWorkdriveFileId(workdriveFileId);
        les.setWorkdriveFileName(workdriveFileName);
        les.setDuration("10 mins");
        les.setSummary("Complete daily checklist before dispatching vehicles.");
        les.setOrderIndex(1);
        mod.setLessons(List.of(les));
        req.setModules(List.of(mod));

        String courseId = courseAuthoringService.createCourse(req);
        assertNotNull(courseId);

        // Step 3: Reopen course and verify that the WorkDrive file ID and file name are faithfully restored
        Map<String, Object> reopened = courseAuthoringService.getCourseForEditing(courseId);
        assertNotNull(reopened);

        List<?> modules = (List<?>) reopened.get("modules");
        assertEquals(1, modules.size());
        Map<?, ?> reopenedMod = (Map<?, ?>) modules.get(0);

        List<?> lessons = (List<?>) reopenedMod.get("lessons");
        assertEquals(1, lessons.size());
        Map<?, ?> reopenedLes = (Map<?, ?>) lessons.get(0);

        assertEquals(workdriveFileId, reopenedLes.get("workdriveFileId"));
        assertEquals("operations-sop.pdf", reopenedLes.get("workdriveFileName"));
        String generatedLessonId = (String) reopenedLes.get("lessonId");
        assertNotNull(generatedLessonId);

        // Step 4: Download the document via LessonDocumentController and verify binary stream matches
        currentUser = hrAdmin; // HR Admin has authoring access to preview document
        ResponseEntity<byte[]> downloadResponse = lessonDocumentController.viewDocument(generatedLessonId);

        assertEquals(200, downloadResponse.getStatusCode().value());
        assertNotNull(downloadResponse.getBody());
        assertArrayEquals(originalPdfBytes, downloadResponse.getBody(), "Downloaded binary bytes must match original uploaded PDF content");
        assertEquals(MediaType.APPLICATION_PDF, downloadResponse.getHeaders().getContentType());
        assertTrue(downloadResponse.getHeaders().getContentDisposition().toString().contains("downloaded-doc.pdf"));
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
