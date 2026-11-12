package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.EmployeeDocument;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService.DownloadedDocument;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveService;
import com.fairmacs.lms.repository.EmployeeDocumentRepository;
import com.fairmacs.lms.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Employee Document Zoho WorkDrive Service Tests")
class EmployeeDocumentServiceTest {

    private EmployeeDocumentRepository documentRepository;
    private UserRepository userRepository;
    private ZohoWorkDriveService zohoWorkDriveService;
    private ZohoWorkDriveDownloadService zohoDownloadService;

    private EmployeeDocumentService documentService;

    private User employeeUser;
    private User managerUser;
    private User hrAdminUser;
    private User financeEmployee;

    @BeforeEach
    void setUp() {
        documentRepository = mock(EmployeeDocumentRepository.class);
        userRepository = mock(UserRepository.class);
        zohoWorkDriveService = new ZohoWorkDriveService(null) {
            @Override
            public String getEmployeeDocumentsFolderId() {
                return "root-folder";
            }
            @Override
            public String getOrCreateSubfolder(String parentFolderId, String folderName) {
                if ("root-folder".equals(parentFolderId)) return "emp-folder";
                return "cat-folder";
            }
            @Override
            public Map<String, Object> uploadFileToFolder(org.springframework.web.multipart.MultipartFile file, String folderId) {
                return Map.of(
                        "success", true,
                        "fileId", "wd-file-999",
                        "fileName", file.getOriginalFilename() != null ? file.getOriginalFilename() : "doc.pdf",
                        "sizeBytes", file.getSize()
                );
            }
        };
        zohoDownloadService = new ZohoWorkDriveDownloadService(null) {
            @Override
            public DownloadedDocument download(String fileId) {
                return new DownloadedDocument("pdf bytes".getBytes(), "aadhaar.pdf", MediaType.APPLICATION_PDF);
            }
        };

        documentService = new EmployeeDocumentService(
                documentRepository,
                userRepository,
                zohoWorkDriveService,
                zohoDownloadService
        );

        employeeUser = new User();
        employeeUser.setId(101L);
        employeeUser.setEmployeeId("DEV-EMP01");
        employeeUser.setName("Dev Employee");
        employeeUser.setDepartment("Operations");
        employeeUser.setRole(Role.EMPLOYEE);
        employeeUser.setStatus(UserStatus.ACTIVE);

        managerUser = new User();
        managerUser.setId(102L);
        managerUser.setEmployeeId("DEV-MGR01");
        managerUser.setName("Dev Manager");
        managerUser.setDepartment("Operations");
        managerUser.setRole(Role.MANAGER);
        managerUser.setStatus(UserStatus.ACTIVE);

        hrAdminUser = new User();
        hrAdminUser.setId(103L);
        hrAdminUser.setEmployeeId("DEV-HR01");
        hrAdminUser.setName("Dev HR Admin");
        hrAdminUser.setDepartment("People Operations");
        hrAdminUser.setRole(Role.HR_ADMIN);
        hrAdminUser.setStatus(UserStatus.ACTIVE);

        financeEmployee = new User();
        financeEmployee.setId(104L);
        financeEmployee.setEmployeeId("DEV-FIN01");
        financeEmployee.setName("Dev Finance");
        financeEmployee.setDepartment("Finance");
        financeEmployee.setRole(Role.EMPLOYEE);
        financeEmployee.setStatus(UserStatus.ACTIVE);
    }

    @Test
    @DisplayName("Employee can upload permitted personal document (Identity Documents)")
    void testEmployeeCanUploadPersonalDocument() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(employeeUser));

        MockMultipartFile file = new MockMultipartFile("file", "aadhaar.pdf", "application/pdf", "dummy pdf content".getBytes());

        when(documentRepository.save(any(EmployeeDocument.class))).thenAnswer(i -> {
            EmployeeDocument d = i.getArgument(0);
            d.setId(1L);
            return d;
        });

        EmployeeDocument doc = documentService.uploadDocument(101L, "Identity Documents", file, employeeUser);

        assertNotNull(doc);
        assertEquals("wd-file-999", doc.getWorkdriveFileId());
        assertEquals("Identity Documents", doc.getCategory());
        assertEquals("cat-folder", doc.getWorkdriveFolderId());
    }

    @Test
    @DisplayName("Employee cannot upload restricted documents such as Offer Letter")
    void testEmployeeCannotUploadOfferLetter() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(employeeUser));

        MockMultipartFile file = new MockMultipartFile("file", "offer.pdf", "application/pdf", "pdf content".getBytes());

        assertThrows(ResponseStatusException.class, () ->
                documentService.uploadDocument(101L, "Offer Letter", file, employeeUser));
    }

    @Test
    @DisplayName("Manager cannot view documents of employees outside own department")
    void testManagerCannotViewOtherDepartmentDocuments() {
        when(userRepository.findById(104L)).thenReturn(Optional.of(financeEmployee));

        assertThrows(ResponseStatusException.class, () ->
                documentService.getDocumentsForTargetUser(104L, managerUser));
    }

    @Test
    @DisplayName("HR Admin can view documents across all departments")
    void testHrAdminCanViewAllDocuments() {
        when(userRepository.findById(104L)).thenReturn(Optional.of(financeEmployee));
        when(documentRepository.findByUserIdOrderByCreatedAtDesc(104L)).thenReturn(Collections.emptyList());
        when(documentRepository.findByIsCompanyPolicyTrueOrderByCreatedAtDesc()).thenReturn(Collections.emptyList());

        List<EmployeeDocument> docs = documentService.getDocumentsForTargetUser(104L, hrAdminUser);
        assertNotNull(docs);
    }

    @Test
    @DisplayName("Secure document download streams content from Zoho WorkDrive")
    void testSecureDocumentDownload() {
        EmployeeDocument doc = new EmployeeDocument();
        doc.setId(10L);
        doc.setUserId(101L);
        doc.setWorkdriveFileId("wd-file-123");
        doc.setFileName("aadhaar.pdf");

        when(documentRepository.findById(10L)).thenReturn(Optional.of(doc));
        when(userRepository.findById(101L)).thenReturn(Optional.of(employeeUser));

        DownloadedDocument result = documentService.downloadDocument(10L, employeeUser);
        assertNotNull(result);
        assertEquals("aadhaar.pdf", result.filename());
    }
}

