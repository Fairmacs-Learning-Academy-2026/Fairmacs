package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.BulkQuestionParseResultDTO;
import com.fairmacs.lms.dto.QuizAuthoringDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.io.ByteArrayOutputStream;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Part 3: Quiz System & Bulk Question Import Audit & Verification Test Suite")
class QuizSystemAndBulkImportTest {

    private BulkQuestionParserService bulkQuestionParserService;
    private QuizService quizService;
    private ObjectMapper objectMapper;

    private final Map<Long, Course> courseStore = new LinkedHashMap<>();
    private final Map<Long, Module> moduleStore = new LinkedHashMap<>();
    private final Map<Long, Quiz> quizStore = new LinkedHashMap<>();
    private final Map<Long, QuizQuestion> questionStore = new LinkedHashMap<>();
    private final Map<Long, QuizAttempt> attemptStore = new LinkedHashMap<>();
    private final Map<Long, QuizProgress> progressStore = new LinkedHashMap<>();
    private final Map<Long, User> userStore = new LinkedHashMap<>();
    private final Map<Long, Enrollment> enrollmentStore = new LinkedHashMap<>();

    private final AtomicLong seq = new AtomicLong(100);

    private User hrAdminUser;
    private User trainerUser;
    private User employeeUser;
    private User managerUser;
    private User currentUser;

    private Course standardCourse;
    private Course foundationCourse;
    private Module module1;

    @BeforeEach
    void setUp() {
        courseStore.clear();
        moduleStore.clear();
        quizStore.clear();
        questionStore.clear();
        attemptStore.clear();
        progressStore.clear();
        userStore.clear();
        enrollmentStore.clear();

        objectMapper = new ObjectMapper();
        bulkQuestionParserService = new BulkQuestionParserService();

        hrAdminUser = new User();
        hrAdminUser.setId(1L);
        hrAdminUser.setEmail("hradmin@fairmacs.com");
        hrAdminUser.setRole(Role.HR_ADMIN);
        userStore.put(hrAdminUser.getId(), hrAdminUser);

        trainerUser = new User();
        trainerUser.setId(2L);
        trainerUser.setEmail("trainer@fairmacs.com");
        trainerUser.setRole(Role.TRAINER);
        userStore.put(trainerUser.getId(), trainerUser);

        employeeUser = new User();
        employeeUser.setId(3L);
        employeeUser.setEmail("emp@fairmacs.com");
        employeeUser.setRole(Role.EMPLOYEE);
        userStore.put(employeeUser.getId(), employeeUser);

        managerUser = new User();
        managerUser.setId(4L);
        managerUser.setEmail("mgr@fairmacs.com");
        managerUser.setRole(Role.MANAGER);
        userStore.put(managerUser.getId(), managerUser);

        currentUser = hrAdminUser;

        standardCourse = new Course();
        standardCourse.setId(10L);
        standardCourse.setTitle("Freight Forwarding Essentials");
        standardCourse.setPublishedAt(LocalDateTime.now());
        standardCourse.setFoundation(false);
        courseStore.put(standardCourse.getId(), standardCourse);

        foundationCourse = new Course();
        foundationCourse.setId(11L);
        foundationCourse.setTitle("Fairmacs Orientation Foundation");
        foundationCourse.setPublishedAt(LocalDateTime.now());
        foundationCourse.setFoundation(true);
        courseStore.put(foundationCourse.getId(), foundationCourse);

        module1 = new Module();
        module1.setId(20L);
        module1.setCourse(standardCourse);
        module1.setTitle("Module 1: Cargo Basics");
        moduleStore.put(module1.getId(), module1);

        UserRepository userRepo = createUserRepoMock();
        SecurityContextUtil securityContextUtil = createSecurityContextUtilMock(userRepo);
        QuizRepository quizRepo = createQuizRepoMock();
        QuizQuestionRepository questionRepo = createQuestionRepoMock();
        QuizAttemptRepository attemptRepo = createAttemptRepoMock();
        QuizProgressRepository progressRepo = createProgressRepoMock();
        EnrollmentRepository enrollmentRepo = createEnrollmentRepoMock();
        LessonProgressRepository lessonProgressRepo = (LessonProgressRepository) Proxy.newProxyInstance(
                LessonProgressRepository.class.getClassLoader(),
                new Class[]{LessonProgressRepository.class},
                (proxy, method, args) -> null
        );
        ModuleRepository moduleRepo = createModuleRepoMock();
        CourseRepository courseRepo = createCourseRepoMock();

        quizService = new QuizService(
                quizRepo,
                questionRepo,
                attemptRepo,
                progressRepo,
                userRepo,
                enrollmentRepo,
                lessonProgressRepo,
                moduleRepo,
                objectMapper,
                null,
                securityContextUtil
        );
        quizService.setCourseRepository(courseRepo);
        quizService.setBulkQuestionParserService(bulkQuestionParserService);
    }

    /*
     * =========================================================
     * SECTION 1: BULK IMPORT - 5 SUPPORTED FORMATS
     * =========================================================
     */

    @Test
    @DisplayName("Bulk Import 1: Excel (.xlsx) parses single & multiple correct answers and skips empty rows")
    void testExcelImport_XlsxWithMultipleAnswers() throws Exception {
        byte[] excelBytes;
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Quiz");
            Row h = sheet.createRow(0);
            h.createCell(0).setCellValue("Question");
            h.createCell(1).setCellValue("Option A");
            h.createCell(2).setCellValue("Option B");
            h.createCell(3).setCellValue("Option C");
            h.createCell(4).setCellValue("Option D");
            h.createCell(5).setCellValue("Correct Answer");
            h.createCell(6).setCellValue("Explanation");

            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue("What is the primary document in ocean freight?");
            r1.createCell(1).setCellValue("Bill of Lading");
            r1.createCell(2).setCellValue("Packing List");
            r1.createCell(3).setCellValue("Commercial Invoice");
            r1.createCell(4).setCellValue("Certificate of Origin");
            r1.createCell(5).setCellValue("A");
            r1.createCell(6).setCellValue("Bill of Lading acts as receipt, title document, and contract of carriage.");

            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue("Which Incoterms assign maximum risk to seller?");
            r2.createCell(1).setCellValue("DDP");
            r2.createCell(2).setCellValue("EXW");
            r2.createCell(3).setCellValue("DAP");
            r2.createCell(4).setCellValue("FOB");
            r2.createCell(5).setCellValue("A, C");
            r2.createCell(6).setCellValue("Both DDP and DAP require seller delivery obligations.");

            wb.write(bos);
            excelBytes = bos.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile("file", "ocean_quiz.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelBytes);

        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(file, null);

        assertNotNull(result);
        assertEquals(2, result.getTotalDetected());
        assertEquals(2, result.getValidCount());
        assertEquals(0, result.getNeedsReviewCount());
        assertTrue(result.getSourceType().contains("Excel") || result.getSourceType().contains("EXCEL"));

        BulkQuestionParseResultDTO.ParsedQuestionDTO q1 = result.getQuestions().get(0);
        assertEquals("What is the primary document in ocean freight?", q1.getQuestionText());
        assertEquals("Bill of Lading", q1.getOptionA());
        assertEquals("SINGLE_CHOICE", q1.getQuestionType());
        assertEquals("A", q1.getCorrectAnswer());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q2 = result.getQuestions().get(1);
        assertEquals("MULTI_SELECT", q2.getQuestionType());
        assertTrue(q2.getCorrectAnswer().contains("A") && q2.getCorrectAnswer().contains("C"));
    }

    @Test
    @DisplayName("Bulk Import 2: CSV parses standard quoted comma-separated questions")
    void testCsvImport_StandardQuotedRows() {
        String csvContent = "Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation\n" +
                "\"Which container is standard for dry cargo?\",\"20ft GP\",\"40ft Reefer\",\"Flat Rack\",\"Open Top\",\"A\",\"20ft GP is standard.\"\n" +
                "\"Select dangerous goods classes:\",\"Class 1 Explosives\",\"Class 3 Flammables\",\"Class 7 Radioactives\",\"Class 9 None of above\",\"A,B,C\",\"1, 3, and 7 are DG classes.\"";

        MockMultipartFile file = new MockMultipartFile("file", "dg_quiz.csv", "text/csv", csvContent.getBytes(StandardCharsets.UTF_8));
        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(file, null);

        assertNotNull(result);
        assertEquals(2, result.getTotalDetected());
        assertEquals(2, result.getValidCount());
        assertEquals("CSV", result.getSourceType());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q2 = result.getQuestions().get(1);
        assertEquals("MULTI_SELECT", q2.getQuestionType());
        assertTrue(q2.getCorrectAnswer().contains("A") && q2.getCorrectAnswer().contains("B") && q2.getCorrectAnswer().contains("C"));
    }

    @Test
    @DisplayName("Bulk Import 3: Word (.docx) parses structured paragraphs and tables")
    void testWordImport_DocxTableAndParagraphs() throws Exception {
        byte[] docxBytes;
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            XWPFTable table = doc.createTable(2, 6);
            XWPFTableRow header = table.getRow(0);
            header.getCell(0).setText("Question");
            header.getCell(1).setText("Option A");
            header.getCell(2).setText("Option B");
            header.getCell(3).setText("Option C");
            header.getCell(4).setText("Option D");
            header.getCell(5).setText("Correct Answer");

            XWPFTableRow r1 = table.getRow(1);
            r1.getCell(0).setText("What does TEU stand for?");
            r1.getCell(1).setText("Twenty-Foot Equivalent Unit");
            r1.getCell(2).setText("Total Export Unit");
            r1.getCell(3).setText("Transit Entry Unit");
            r1.getCell(4).setText("Terminal Equipment Unit");
            r1.getCell(5).setText("A");

            doc.write(bos);
            docxBytes = bos.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile("file", "teu_quiz.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes);

        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(file, null);

        assertNotNull(result);
        assertEquals(1, result.getTotalDetected());
        assertEquals(1, result.getValidCount());
        assertTrue(result.getSourceType().contains("Word") || result.getSourceType().contains("WORD"));
        assertEquals("What does TEU stand for?", result.getQuestions().get(0).getQuestionText());
    }

    @Test
    @DisplayName("Bulk Import 4: Word legacy (.doc) is rejected with clear guidance to use .docx")
    void testLegacyWordImport_RejectedWithClearGuidance() {
        MockMultipartFile file = new MockMultipartFile("file", "old_quiz.doc", "application/msword", new byte[]{0x00, 0x01, 0x02});
        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(file, null);
        assertNotNull(result);
        assertTrue(result.getMessage().contains("Legacy Word (.doc) format is not supported") || "LEGACY_DOC".equals(result.getSourceType()));
    }

    @Test
    @DisplayName("Bulk Import 5: PDF extracts selectable text and detects structured questions")
    void testPdfImport_SelectableTextExtracted() throws Exception {
        byte[] pdfBytes;
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            Document doc = new Document();
            PdfWriter.getInstance(doc, bos);
            doc.open();
            doc.add(new Paragraph("Question 1: What is customs bonded warehousing?\n" +
                    "A) Storage of dutiable goods before customs duty is paid\n" +
                    "B) Domestic non-customs storage\n" +
                    "C) Personal household storage\n" +
                    "D) Export cargo only\n" +
                    "Correct Answer: A\n" +
                    "Explanation: Bonded warehouses hold imported cargo before duty payment."));
            doc.close();
            pdfBytes = bos.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile("file", "customs.pdf", "application/pdf", pdfBytes);
        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(file, null);

        assertNotNull(result);
        assertEquals(1, result.getTotalDetected());
        assertEquals(1, result.getValidCount());
        assertEquals("PDF", result.getSourceType());
        assertEquals("What is customs bonded warehousing?", result.getQuestions().get(0).getQuestionText());
        assertEquals("Storage of dutiable goods before customs duty is paid", result.getQuestions().get(0).getOptionA());
    }

    @Test
    @DisplayName("Bulk Import 6: Scanned / Image-only PDF is rejected without AI/OCR with user-friendly message")
    void testPdfImport_ScannedImageOnlyPdfRejected() throws Exception {
        byte[] pdfBytes;
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            Document doc = new Document();
            PdfWriter.getInstance(doc, bos);
            doc.open();
            doc.add(new Paragraph(" "));
            doc.close();
            pdfBytes = bos.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile("file", "scanned_doc.pdf", "application/pdf", pdfBytes);
        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(file, null);
        assertNotNull(result);
        assertTrue(result.getMessage().contains("Scanned or image-only PDF detected"));
    }

    @Test
    @DisplayName("Bulk Import 7: Pasted Text parses tab-delimited spreadsheet rows and numbered format")
    void testPastedTextImport_TabDelimitedAndNumbered() {
        String pastedTab = "What is demurrage?\tPenalty for container holding past free time\tPort tax\tCustoms duty\tFreight tariff\tA\tDemurrage penalty applies.";
        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(null, pastedTab);

        assertNotNull(result);
        assertEquals(1, result.getTotalDetected());
        assertEquals(1, result.getValidCount());
        assertTrue(result.getSourceType().contains("Text") || result.getSourceType().contains("PASTED") || result.getSourceType().contains("Delimited"));
        assertEquals("What is demurrage?", result.getQuestions().get(0).getQuestionText());
        assertEquals("Penalty for container holding past free time", result.getQuestions().get(0).getOptionA());
    }

    @Test
    @DisplayName("Bulk Import 8: Strips leading option prefixes (A., B), [C], Option D:)")
    void testOptionPrefixStripping() {
        String pasted = "1. What is airway bill?\n" +
                "A. Non-negotiable air transport document\n" +
                "B) Negotiable document of title\n" +
                "[C] Truck receipt\n" +
                "Option D: Railway receipt\n" +
                "Answer: A";

        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(null, pasted);
        assertNotNull(result);
        assertEquals(1, result.getValidCount());
        BulkQuestionParseResultDTO.ParsedQuestionDTO q = result.getQuestions().get(0);
        assertEquals("Non-negotiable air transport document", q.getOptionA());
        assertEquals("Negotiable document of title", q.getOptionB());
        assertEquals("Truck receipt", q.getOptionC());
        assertEquals("Railway receipt", q.getOptionD());
    }

    @Test
    @DisplayName("Pasted Text Format A: Standard numbered with blank lines between elements")
    void testPastedText_FormatA_StandardNumberedWithBlankLines() {
        String pasted = "Question 1: What is the primary purpose of a Bill of Lading?\n\n" +
                "A. It acts as a receipt for goods delivered to the carrier.\n" +
                "B. It serves as evidence of the contract of carriage.\n" +
                "C. It acts as a document of title to the goods.\n" +
                "D. All of the above.\n\n" +
                "Correct Answer: D\n\n" +
                "Explanation: A Bill of Lading serves all three functions in international shipping.\n\n" +
                "Question 2: Which container is standard for general dry freight?\n\n" +
                "A. 20-foot GP Container\n" +
                "B. Reefer Container\n" +
                "C. Open Top Container\n" +
                "D. Tank Container\n\n" +
                "Correct Answer: A\n\n" +
                "Explanation: Standard dry freight moves in general purpose containers.";

        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(null, pasted);

        assertNotNull(result);
        assertEquals(2, result.getTotalDetected());
        assertEquals(2, result.getValidCount());
        assertEquals(0, result.getNeedsReviewCount());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q1 = result.getQuestions().get(0);
        assertEquals("Question 1", q1.getSourceRowOrPage());
        assertEquals("What is the primary purpose of a Bill of Lading?", q1.getQuestionText());
        assertEquals("It acts as a receipt for goods delivered to the carrier.", q1.getOptionA());
        assertEquals("It serves as evidence of the contract of carriage.", q1.getOptionB());
        assertEquals("It acts as a document of title to the goods.", q1.getOptionC());
        assertEquals("All of the above.", q1.getOptionD());
        assertEquals("D", q1.getCorrectAnswer());
        assertEquals("A Bill of Lading serves all three functions in international shipping.", q1.getExplanation());
        assertTrue(q1.isValid());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q2 = result.getQuestions().get(1);
        assertEquals("Question 2", q2.getSourceRowOrPage());
        assertEquals("Which container is standard for general dry freight?", q2.getQuestionText());
        assertEquals("20-foot GP Container", q2.getOptionA());
        assertEquals("A", q2.getCorrectAnswer());
        assertTrue(q2.isValid());
    }

    @Test
    @DisplayName("Pasted Text Format B: Parenthesis options and numbered prefixes (1., A), (A), [A])")
    void testPastedText_FormatB_ParenthesisOptionsAndAnswer() {
        String pasted = "1. What does CIF stand for?\n" +
                "A) Cost, Insurance, and Freight\n" +
                "B) Carrier, Insurance, Free\n" +
                "C) Cargo in Freight\n" +
                "D) Cost in Freight\n" +
                "Answer: A\n\n" +
                "2. What does FOB stand for?\n" +
                "(A) Free On Board\n" +
                "(B) Freight On Board\n" +
                "(C) Forwarder On Board\n" +
                "(D) Final Order Bill\n" +
                "Answer: A";

        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(null, pasted);

        assertNotNull(result);
        assertEquals(2, result.getTotalDetected());
        assertEquals(2, result.getValidCount());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q1 = result.getQuestions().get(0);
        assertEquals("What does CIF stand for?", q1.getQuestionText());
        assertEquals("Cost, Insurance, and Freight", q1.getOptionA());
        assertEquals("A", q1.getCorrectAnswer());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q2 = result.getQuestions().get(1);
        assertEquals("What does FOB stand for?", q2.getQuestionText());
        assertEquals("Free On Board", q2.getOptionA());
        assertEquals("Freight On Board", q2.getOptionB());
        assertEquals("A", q2.getCorrectAnswer());
    }

    @Test
    @DisplayName("Pasted Text Format C: Different answer labels (Correct Answers, Ans, Key) and multi-select")
    void testPastedText_FormatC_DifferentAnswerLabelsAndMultiSelect() {
        String pasted = "Question 1: Which documents are required for customs clearance?\n" +
                "A. Commercial Invoice\n" +
                "B. Packing List\n" +
                "C. Bill of Lading\n" +
                "D. Employee Badge\n" +
                "Correct Answers: A, B, C\n\n" +
                "Question 2: Which parties participate in maritime shipping?\n" +
                "A. Shipper\n" +
                "B. Carrier\n" +
                "C. Consignee\n" +
                "D. Unrelated Bystander\n" +
                "Ans: A, B and C\n\n" +
                "Question 3: Who issues the Sea Waybill?\n" +
                "A. Ocean Carrier\n" +
                "B. Local Police\n" +
                "Key: A";

        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(null, pasted);

        assertNotNull(result);
        assertEquals(3, result.getTotalDetected());
        assertEquals(3, result.getValidCount());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q1 = result.getQuestions().get(0);
        assertEquals("MULTI_SELECT", q1.getQuestionType());
        assertEquals("A,B,C", q1.getCorrectAnswer());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q2 = result.getQuestions().get(1);
        assertEquals("MULTI_SELECT", q2.getQuestionType());
        assertEquals("A,B,C", q2.getCorrectAnswer());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q3 = result.getQuestions().get(2);
        assertEquals("SINGLE_CHOICE", q3.getQuestionType());
        assertEquals("A", q3.getCorrectAnswer());
    }

    @Test
    @DisplayName("Pasted Text Format D: Explanation on separate line and multi-line explanation text")
    void testPastedText_FormatD_ExplanationOnSeparateLineAndMultiLine() {
        String pasted = "Question 4: What is demurrage?\n" +
                "A. Fee for container use inside the terminal beyond free time\n" +
                "B. Fee for early customs clearance\n" +
                "C. Discount on ocean freight\n" +
                "D. Insurance charge\n" +
                "Correct Answer: A\n" +
                "Explanation:\n" +
                "Demurrage is charged by shipping lines when containers remain inside the terminal beyond the allowed free days.\n" +
                "It is an important penalty fee designed to prevent terminal congestion.\n\n" +
                "Question 5: What is detention?\n" +
                "A. Fee for holding container outside the terminal past free time\n" +
                "B. Storage charge inside the terminal\n" +
                "Answer: A\n" +
                "Explanation: Detention applies once the container has left the terminal.";

        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(null, pasted);

        assertNotNull(result);
        assertEquals(2, result.getTotalDetected());
        assertEquals(2, result.getValidCount());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q4 = result.getQuestions().get(0);
        assertEquals("What is demurrage?", q4.getQuestionText());
        assertEquals("Fee for container use inside the terminal beyond free time", q4.getOptionA());
        assertEquals("A", q4.getCorrectAnswer());
        assertTrue(q4.getExplanation().contains("Demurrage is charged by shipping lines"));
        assertTrue(q4.getExplanation().contains("prevent terminal congestion"));

        BulkQuestionParseResultDTO.ParsedQuestionDTO q5 = result.getQuestions().get(1);
        assertEquals("What is detention?", q5.getQuestionText());
        assertEquals("A", q5.getCorrectAnswer());
        assertEquals("Detention applies once the container has left the terminal.", q5.getExplanation());
    }

    @Test
    @DisplayName("Pasted Text Format E: Bare questions without Question or 1. prefixes")
    void testPastedText_FormatE_WithoutExplicitQuestionLabels() {
        String pasted = "What is the standard container size in international logistics?\n" +
                "A. 20-foot and 40-foot\n" +
                "B. 10-foot and 50-foot\n" +
                "C. 15-foot and 30-foot\n" +
                "D. 25-foot and 45-foot\n" +
                "Answer: A\n\n" +
                "Which Incoterm imposes maximum obligation on the seller?\n" +
                "(A) EXW\n" +
                "(B) DDP\n" +
                "(C) FOB\n" +
                "(D) CIF\n" +
                "Answer: B";

        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(null, pasted);

        assertNotNull(result);
        assertEquals(2, result.getTotalDetected());
        assertEquals(2, result.getValidCount());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q1 = result.getQuestions().get(0);
        assertEquals("Question 1", q1.getSourceRowOrPage());
        assertEquals("What is the standard container size in international logistics?", q1.getQuestionText());
        assertEquals("20-foot and 40-foot", q1.getOptionA());
        assertEquals("A", q1.getCorrectAnswer());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q2 = result.getQuestions().get(1);
        assertEquals("Question 2", q2.getSourceRowOrPage());
        assertEquals("Which Incoterm imposes maximum obligation on the seller?", q2.getQuestionText());
        assertEquals("EXW", q2.getOptionA());
        assertEquals("DDP", q2.getOptionB());
        assertEquals("B", q2.getCorrectAnswer());
    }

    @Test
    @DisplayName("Pasted Text: Malformed text flags missing fields without defaulting answer to A")
    void testPastedText_MalformedContentAndMissingOptionsNoDefaultA() {
        String pasted = "Question 1: Incomplete question without answer\n" +
                "A. Only Option A\n" +
                "B. Only Option B\n\n" +
                "Question 2: Incomplete question without options";

        BulkQuestionParseResultDTO result = quizService.parseBulkQuestions(null, pasted);

        assertNotNull(result);
        assertEquals(2, result.getTotalDetected());
        assertEquals(0, result.getValidCount());
        assertEquals(2, result.getNeedsReviewCount());

        BulkQuestionParseResultDTO.ParsedQuestionDTO q1 = result.getQuestions().get(0);
        assertFalse(q1.isValid());
        assertEquals("", q1.getCorrectAnswer());
        assertTrue(q1.getValidationErrors().stream().anyMatch(e -> e.contains("correct answer")));

        BulkQuestionParseResultDTO.ParsedQuestionDTO q2 = result.getQuestions().get(1);
        assertFalse(q2.isValid());
        assertEquals("", q2.getOptionA());
        assertEquals("", q2.getOptionB());
        assertEquals("", q2.getCorrectAnswer());
        assertTrue(q2.getValidationErrors().stream().anyMatch(e -> e.contains("Option A is required")));
    }

    /*
     * =========================================================
     * SECTION 2: QUIZ AUTHORING & ROLE PERMISSIONS
     * =========================================================
     */

    @Test
    @DisplayName("Authoring 1: HR Admin and Trainer can create module quizzes and final assessments")
    void testHrAdminAndTrainer_CanCreateQuizzes() {
        currentUser = hrAdminUser;
        QuizAuthoringDTO dto = new QuizAuthoringDTO();
        dto.setTitle("Module 1 Assessment");
        dto.setType("MODULE");
        dto.setPassingScore(80);
        dto.setTimeLimitMinutes(15);

        Map<String, Object> created = quizService.createQuiz(standardCourse.getId(), module1.getId(), dto);
        assertNotNull(created);
        assertNotNull(created.get("id"));
        assertEquals("Module 1 Assessment", created.get("title"));

        // Trainer creating final assessment
        currentUser = trainerUser;
        QuizAuthoringDTO finalDto = new QuizAuthoringDTO();
        finalDto.setTitle("Comprehensive Final Assessment");
        finalDto.setType("FINAL");
        finalDto.setPassingScore(75);

        Map<String, Object> finalCreated = quizService.createQuiz(standardCourse.getId(), null, finalDto);
        assertNotNull(finalCreated);
        assertEquals("Comprehensive Final Assessment", finalCreated.get("title"));
    }

    @Test
    @DisplayName("Authoring 2: Employee and Manager are blocked from quiz authoring")
    void testEmployeeAndManager_BlockedFromAuthoring() {
        QuizAuthoringDTO dto = new QuizAuthoringDTO();
        dto.setTitle("Unauthorized Quiz");

        currentUser = employeeUser;
        assertThrows(AccessDeniedException.class, () -> quizService.createQuiz(standardCourse.getId(), null, dto));

        currentUser = managerUser;
        assertThrows(AccessDeniedException.class, () -> quizService.createQuiz(standardCourse.getId(), null, dto));
    }

    @Test
    @DisplayName("Authoring 3: Add, update, and delete questions with multi-answer support")
    void testQuestionManagement_MultiAnswerSupport() {
        currentUser = hrAdminUser;
        Quiz quiz = new Quiz();
        quiz.setId(seq.incrementAndGet());
        quiz.setCourse(standardCourse);
        quiz.setTitle("Ops Quiz");
        quizStore.put(quiz.getId(), quiz);

        QuizAuthoringDTO.QuizQuestionDTO qDto = new QuizAuthoringDTO.QuizQuestionDTO();
        qDto.setQuestionText("Select air cargo unit load devices:");
        qDto.setOptionA("LD3 Container");
        qDto.setOptionB("Pallet with Net");
        qDto.setOptionC("ISO 20ft Box");
        qDto.setOptionD("Flatbed Trailer");
        qDto.setQuestionType("MULTI_SELECT");
        qDto.setCorrectAnswer("A, B");
        qDto.setExplanation("LD3 and pallets are standard ULDs.");

        Map<String, Object> added = quizService.addQuestion(quiz.getId(), qDto);
        assertNotNull(added);
        Long questionId = ((Number) added.get("id")).longValue();

        QuizQuestion saved = questionStore.get(questionId);
        assertNotNull(saved);
        assertEquals("MULTI_SELECT", saved.getQuestionType());
        assertTrue(saved.getCorrectAnswer().contains("A") && saved.getCorrectAnswer().contains("B"));

        // Delete question
        quizService.deleteQuestion(questionId);
        assertNull(questionStore.get(questionId));
    }

    @Test
    @DisplayName("Authoring 4: Quizzes cannot be attached to Foundation courses")
    void testFoundationCourse_QuizzesDisabled() {
        currentUser = hrAdminUser;
        QuizAuthoringDTO dto = new QuizAuthoringDTO();
        dto.setTitle("Foundation Quiz Not Allowed");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> quizService.createQuiz(foundationCourse.getId(), null, dto));
        assertTrue(ex.getMessage().contains("Foundation courses cannot have quizzes"));
    }

    /*
     * =========================================================
     * SECTION 3: ATTEMPTS, 5-MINUTE COOLDOWN & SCORING
     * =========================================================
     */

    @Test
    @DisplayName("Attempt 1: Attempt numbers never duplicate and strictly increment")
    void testAttemptNumbering_NeverDuplicates() {
        currentUser = employeeUser;
        Quiz quiz = createTestQuizWithQuestions();

        Map<String, Object> attempt1 = quizService.startQuiz(quiz.getId());
        assertEquals(1, attempt1.get("attemptNumber"));

        // Submit attempt 1
        Map<String, String> answers = new HashMap<>();
        answers.put("1", "A");
        quizService.submitQuiz((String) attempt1.get("attemptId"), answers, 60);

        // Advance past cooldown
        QuizAttempt savedAttempt = attemptStore.values().iterator().next();
        savedAttempt.setCompletedAt(LocalDateTime.now().minusMinutes(6));

        Map<String, Object> attempt2 = quizService.startQuiz(quiz.getId());
        assertEquals(2, attempt2.get("attemptNumber"));
    }

    @Test
    @DisplayName("Attempt 2: 5-minute cooldown is strictly enforced server-side")
    void testFiveMinuteCooldown_Enforced() {
        currentUser = employeeUser;
        Quiz quiz = createTestQuizWithQuestions();

        Map<String, Object> attempt1 = quizService.startQuiz(quiz.getId());
        Map<String, String> wrongAnswers = new HashMap<>();
        wrongAnswers.put("1", "B"); // Wrong answer -> fails
        quizService.submitQuiz((String) attempt1.get("attemptId"), wrongAnswers, 45);

        // Next startQuiz within 5 minutes must throw IllegalStateException with cooldown message
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> quizService.startQuiz(quiz.getId()));
        assertTrue(ex.getMessage().contains("retry after") || ex.getMessage().contains("Retry available"));

        // Cooldown status check
        Map<String, Object> cdStatus = quizService.getCooldownStatus(quiz.getId(), employeeUser.getId());
        assertTrue((Boolean) cdStatus.get("cooldownActive"));
        assertTrue(((Number) cdStatus.get("remainingSeconds")).intValue() > 0);
    }

    @Test
    @DisplayName("Attempt 3: Abandoned expired attempt is auto-finalized as failed")
    void testAbandonedAttempt_AutoFinalized() {
        currentUser = employeeUser;
        Quiz quiz = createTestQuizWithQuestions();
        quiz.setTimeLimitMinutes(10);

        // Simulate an open attempt that started 12 minutes ago (expired by 2 mins, within 5-min cooldown)
        QuizAttempt abandoned = new QuizAttempt();
        abandoned.setId(seq.incrementAndGet());
        abandoned.setAttemptId("ATT-ABANDONED");
        abandoned.setQuiz(quiz);
        abandoned.setUser(employeeUser);
        abandoned.setAttemptNumber(1);
        abandoned.setStartedAt(LocalDateTime.now().minusMinutes(12));
        abandoned.setCompletedAt(null);
        attemptStore.put(abandoned.getId(), abandoned);

        // When user tries to start again, expired attempt should be finalized
        assertThrows(IllegalStateException.class, () -> quizService.startQuiz(quiz.getId()));
        assertNotNull(abandoned.getCompletedAt());
        assertFalse(abandoned.getPassed());
        assertEquals(0, abandoned.getScore());
    }

    @Test
    @DisplayName("Attempt 4: Evaluation correctly calculates pass/fail for single and multi-select")
    void testScoringEvaluation_MultiSelectAndPassingThreshold() {
        currentUser = employeeUser;
        Quiz quiz = createTestQuizWithQuestions();
        quiz.setPassingScore(100); // Requires 100%

        Map<String, Object> start = quizService.startQuiz(quiz.getId());
        Map<String, String> answers = new HashMap<>();
        answers.put("1", "A"); // Q1 is correct (Single choice: A)
        answers.put("2", "A, B"); // Q2 is correct (Multi choice: A, B)

        Map<String, Object> result = quizService.submitQuiz((String) start.get("attemptId"), answers, 90);
        assertNotNull(result);
        assertTrue((Boolean) result.get("passed"));
        assertEquals(100, ((Number) result.get("score")).intValue());
    }

    @Test
    @DisplayName("Attempt 5: Partially selected answers in multi-select are scored as incorrect")
    void testPartialAnswerSelection_MarkedIncorrectInMultiSelect() {
        currentUser = employeeUser;
        Quiz quiz = new Quiz();
        quiz.setId(seq.incrementAndGet());
        quiz.setCourse(standardCourse);
        quiz.setTitle("Multi-Choice Scoring Quiz");
        quiz.setPassingScore(100);
        quiz.setTimeLimitMinutes(15);
        quiz.setActive(true);
        quizStore.put(quiz.getId(), quiz);

        QuizQuestion q = new QuizQuestion();
        q.setId(50L);
        q.setQuiz(quiz);
        q.setQuestionText("Select dangerous goods classes (multiselect):");
        q.setOptionA("Class 1 Explosives");
        q.setOptionB("Class 3 Flammables");
        q.setOptionC("Non-hazardous cargo");
        q.setOptionD("General office stationery");
        q.setQuestionType("MULTI_SELECT");
        q.setCorrectAnswer("A, B");
        questionStore.put(q.getId(), q);

        // Case 1: Partial selection ("A" only when "A, B" is required) -> fails
        Map<String, Object> start1 = quizService.startQuiz(quiz.getId());
        Map<String, String> partialAns = Map.of("50", "A");
        Map<String, Object> result1 = quizService.submitQuiz((String) start1.get("attemptId"), partialAns, 30);
        assertFalse((Boolean) result1.get("passed"));
        assertEquals(0, ((Number) result1.get("score")).intValue());
        assertEquals(0, ((Number) result1.get("correctAnswers")).intValue());
        assertEquals(1, ((Number) result1.get("wrongAnswers")).intValue());

        // Fast-forward completedAt past cooldown
        for (QuizAttempt a : attemptStore.values()) {
            a.setCompletedAt(LocalDateTime.now().minusMinutes(6));
        }

        // Case 2: Complete correct selection ("A, B") -> passes
        Map<String, Object> start2 = quizService.startQuiz(quiz.getId());
        Map<String, String> correctAns = Map.of("50", "A, B");
        Map<String, Object> result2 = quizService.submitQuiz((String) start2.get("attemptId"), correctAns, 30);
        assertTrue((Boolean) result2.get("passed"));
        assertEquals(100, ((Number) result2.get("score")).intValue());
        assertEquals(1, ((Number) result2.get("correctAnswers")).intValue());
        assertEquals(0, ((Number) result2.get("wrongAnswers")).intValue());
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("Security: Answer keys and explanations are NEVER exposed to learners before submission")
    void testAnswerKeys_NotExposedToLearnersInApiResponses() {
        currentUser = employeeUser;
        Quiz quiz = createTestQuizWithQuestions();

        // 1. Learner starts quiz
        Map<String, Object> startResponse = quizService.startQuiz(quiz.getId());
        List<Map<String, Object>> questions = (List<Map<String, Object>>) startResponse.get("questions");
        assertNotNull(questions);
        assertFalse(questions.isEmpty());

        for (Map<String, Object> q : questions) {
            assertFalse(q.containsKey("correctAnswer"), "Learner start response must not contain correctAnswer");
            assertFalse(q.containsKey("explanation"), "Learner start response must not contain explanation");
        }

        // 2. Learner resumes quiz (concurrent tab / page refresh)
        Map<String, Object> resumeResponse = quizService.startQuiz(quiz.getId());
        assertTrue(Boolean.TRUE.equals(resumeResponse.get("resumed")));
        List<Map<String, Object>> resumeQuestions = (List<Map<String, Object>>) resumeResponse.get("questions");
        assertNotNull(resumeQuestions);

        for (Map<String, Object> q : resumeQuestions) {
            assertFalse(q.containsKey("correctAnswer"), "Learner resume response must not contain correctAnswer");
            assertFalse(q.containsKey("explanation"), "Learner resume response must not contain explanation");
        }

        // 3. HR Admin preview DOES contain correct answers for authoring validation
        currentUser = hrAdminUser;
        Map<String, Object> preview = quizService.previewQuiz(quiz.getId());
        List<Map<String, Object>> previewQuestions = (List<Map<String, Object>>) preview.get("questions");
        assertNotNull(previewQuestions);
        for (Map<String, Object> q : previewQuestions) {
            assertTrue(q.containsKey("correctAnswer"), "Authoring preview mode must contain correctAnswer for verification");
        }
    }

    @Test
    @DisplayName("Concurrency: Opening another tab or refreshing resumes the active attempt without duplication")
    void testConcurrentAttempts_ResumesExistingOpenAttemptWithoutDuplication() {
        currentUser = employeeUser;
        Quiz quiz = createTestQuizWithQuestions();

        // Tab 1 starts quiz
        Map<String, Object> start1 = quizService.startQuiz(quiz.getId());
        String attemptId1 = (String) start1.get("attemptId");
        int attemptNum1 = ((Number) start1.get("attemptNumber")).intValue();
        int initialAttemptCount = attemptStore.size();

        // Tab 2 / browser refresh calls startQuiz while attempt 1 is active
        Map<String, Object> start2 = quizService.startQuiz(quiz.getId());
        String attemptId2 = (String) start2.get("attemptId");
        int attemptNum2 = ((Number) start2.get("attemptNumber")).intValue();

        // Must resume the exact same attempt
        assertEquals(attemptId1, attemptId2, "Concurrent start must resume existing open attemptId");
        assertEquals(attemptNum1, attemptNum2, "Attempt number must not increment upon resume");
        assertTrue(Boolean.TRUE.equals(start2.get("resumed")));
        assertEquals(initialAttemptCount, attemptStore.size(), "No duplicate attempt record should be created");
    }

    @Test
    @DisplayName("Cooldown Security: 5-minute cooldown cannot be bypassed by refresh or multiple requests")
    void testFiveMinuteCooldownCannotBeBypassed_AcrossConcurrentRequestsOrTabs() {
        currentUser = employeeUser;
        Quiz quiz = createTestQuizWithQuestions();

        Map<String, Object> start = quizService.startQuiz(quiz.getId());
        Map<String, String> wrongAnswers = Map.of("1", "C"); // Wrong answer -> fails
        quizService.submitQuiz((String) start.get("attemptId"), wrongAnswers, 20);

        // Immediate retry (same tab) -> blocked
        IllegalStateException ex1 = assertThrows(IllegalStateException.class, () -> quizService.startQuiz(quiz.getId()));
        assertTrue(ex1.getMessage().contains("retry after") || ex1.getMessage().contains("Retry available"));

        // Refresh / another tab request -> blocked
        IllegalStateException ex2 = assertThrows(IllegalStateException.class, () -> quizService.startQuiz(quiz.getId()));
        assertTrue(ex2.getMessage().contains("retry after") || ex2.getMessage().contains("Retry available"));

        // Direct cooldown status API returns cooldownActive = true
        Map<String, Object> cdStatus = quizService.getCooldownStatus(quiz.getId(), employeeUser.getId());
        assertTrue((Boolean) cdStatus.get("cooldownActive"));
        assertTrue(((Number) cdStatus.get("remainingSeconds")).intValue() > 0);

        // Fast forward 5 minutes + 1 second
        for (QuizAttempt a : attemptStore.values()) {
            if (a.getCompletedAt() != null) {
                a.setCompletedAt(LocalDateTime.now().minusMinutes(5).minusSeconds(1));
            }
        }

        // Retry now succeeds with attemptNumber = 2
        Map<String, Object> retryStart = quizService.startQuiz(quiz.getId());
        assertNotNull(retryStart);
        assertEquals(2, retryStart.get("attemptNumber"));
    }

    @Test
    @DisplayName("Attempt Limits: V10 unlimited attempt model preserves ability to retake post-cooldown")
    void testAttemptLimitConfiguration_UnlimitedUnderV10() {
        currentUser = employeeUser;
        Quiz quiz = createTestQuizWithQuestions();
        quiz.setMaxAttempts(null); // Unlimited per V10

        for (int attempt = 1; attempt <= 3; attempt++) {
            Map<String, Object> start = quizService.startQuiz(quiz.getId());
            assertEquals(attempt, start.get("attemptNumber"));

            Map<String, String> wrongAns = Map.of("1", "D");
            quizService.submitQuiz((String) start.get("attemptId"), wrongAns, 15);

            // Cooldown applies after each failed attempt
            assertThrows(IllegalStateException.class, () -> quizService.startQuiz(quiz.getId()));

            // Cooldown elapses
            for (QuizAttempt a : attemptStore.values()) {
                a.setCompletedAt(LocalDateTime.now().minusMinutes(6));
            }
        }

        // 4th attempt succeeds after 3 failures with 5-min cooldowns in between
        Map<String, Object> attempt4 = quizService.startQuiz(quiz.getId());
        assertEquals(4, attempt4.get("attemptNumber"));
    }

    /*
     * =========================================================
     * HELPER METHODS & MOCKS
     * =========================================================
     */

    private Quiz createTestQuizWithQuestions() {
        Quiz quiz = new Quiz();
        quiz.setId(seq.incrementAndGet());
        quiz.setCourse(standardCourse);
        quiz.setTitle("Evaluation Test Quiz");
        quiz.setPassingScore(70);
        quiz.setTimeLimitMinutes(15);
        quiz.setActive(true);
        quizStore.put(quiz.getId(), quiz);

        QuizQuestion q1 = new QuizQuestion();
        q1.setId(1L);
        q1.setQuiz(quiz);
        q1.setQuestionText("Primary ocean document?");
        q1.setOptionA("Bill of Lading");
        q1.setOptionB("Invoice");
        q1.setOptionC("Packing List");
        q1.setOptionD("Certificate of Origin");
        q1.setQuestionType("SINGLE_CHOICE");
        q1.setCorrectAnswer("A");
        questionStore.put(q1.getId(), q1);

        QuizQuestion q2 = new QuizQuestion();
        q2.setId(2L);
        q2.setQuiz(quiz);
        q2.setQuestionText("Select air cargo ULDs:");
        q2.setOptionA("LD3");
        q2.setOptionB("Pallet");
        q2.setOptionC("Truck");
        q2.setOptionD("Container Box");
        q2.setQuestionType("MULTI_SELECT");
        q2.setCorrectAnswer("A, B");
        questionStore.put(q2.getId(), q2);

        return quiz;
    }

    private SecurityContextUtil createSecurityContextUtilMock(UserRepository userRepo) {
        return new SecurityContextUtil(userRepo) {
            @Override
            public Long getCurrentUserId() {
                return currentUser != null ? currentUser.getId() : null;
            }

            @Override
            public String getCurrentUsername() {
                return currentUser != null ? currentUser.getEmail() : null;
            }

            @Override
            public String getCurrentUserRole() {
                return currentUser != null && currentUser.getRole() != null ? currentUser.getRole().name() : null;
            }

            @Override
            public User getCurrentUser() {
                return currentUser;
            }

            @Override
            public boolean hasRole(Role role) {
                return currentUser != null && currentUser.getRole() == role;
            }

            @Override
            public boolean isManagerOrHr() {
                return currentUser != null && (currentUser.getRole() == Role.HR_ADMIN || currentUser.getRole() == Role.MANAGER);
            }
        };
    }

    private QuizRepository createQuizRepoMock() {
        return (QuizRepository) Proxy.newProxyInstance(
                QuizRepository.class.getClassLoader(),
                new Class[]{QuizRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name)) return Optional.ofNullable(quizStore.get((Long) args[0]));
                    if ("save".equals(name) || "saveAndFlush".equals(name)) {
                        Quiz q = (Quiz) args[0];
                        if (q.getId() == null) q.setId(seq.incrementAndGet());
                        quizStore.put(q.getId(), q);
                        return q;
                    }
                    if ("delete".equals(name)) {
                        Quiz q = (Quiz) args[0];
                        quizStore.remove(q.getId());
                        return null;
                    }
                    if ("findByCourseId".equals(name)) {
                        Long cId = (Long) args[0];
                        return quizStore.values().stream().filter(q -> q.getCourse() != null && q.getCourse().getId().equals(cId)).toList();
                    }
                    return null;
                }
        );
    }

    private QuizQuestionRepository createQuestionRepoMock() {
        return (QuizQuestionRepository) Proxy.newProxyInstance(
                QuizQuestionRepository.class.getClassLoader(),
                new Class[]{QuizQuestionRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name)) return Optional.ofNullable(questionStore.get((Long) args[0]));
                    if ("save".equals(name) || "saveAndFlush".equals(name)) {
                        QuizQuestion q = (QuizQuestion) args[0];
                        if (q.getId() == null) q.setId(seq.incrementAndGet());
                        questionStore.put(q.getId(), q);
                        return q;
                    }
                    if ("saveAll".equals(name)) {
                        Iterable<QuizQuestion> questions = (Iterable<QuizQuestion>) args[0];
                        List<QuizQuestion> saved = new ArrayList<>();
                        for (QuizQuestion q : questions) {
                            if (q.getId() == null) q.setId(seq.incrementAndGet());
                            questionStore.put(q.getId(), q);
                            saved.add(q);
                        }
                        return saved;
                    }
                    if ("delete".equals(name)) {
                        QuizQuestion q = (QuizQuestion) args[0];
                        questionStore.remove(q.getId());
                        return null;
                    }
                    if ("deleteByQuizId".equals(name)) {
                        Long qId = (Long) args[0];
                        questionStore.values().removeIf(q -> q.getQuiz() != null && q.getQuiz().getId().equals(qId));
                        return null;
                    }
                    if ("findByQuiz_IdOrderByOrderIndexAsc".equals(name) || "findByQuiz_IdOrderByOrderAsc".equals(name) || "findByQuiz_Id".equals(name) || "findByQuizId".equals(name)) {
                        Long qId = (Long) args[0];
                        return questionStore.values().stream().filter(q -> q.getQuiz() != null && q.getQuiz().getId().equals(qId)).toList();
                    }
                    if ("findAllById".equals(name)) {
                        Iterable<Long> ids = (Iterable<Long>) args[0];
                        List<QuizQuestion> list = new ArrayList<>();
                        for (Long id : ids) {
                            QuizQuestion q = questionStore.get(id);
                            if (q != null) list.add(q);
                        }
                        return list;
                    }
                    return null;
                }
        );
    }

    private QuizAttemptRepository createAttemptRepoMock() {
        return (QuizAttemptRepository) Proxy.newProxyInstance(
                QuizAttemptRepository.class.getClassLoader(),
                new Class[]{QuizAttemptRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name)) return Optional.ofNullable(attemptStore.get((Long) args[0]));
                    if ("findByAttemptId".equals(name)) {
                        String attId = (String) args[0];
                        return attemptStore.values().stream().filter(a -> attId.equals(a.getAttemptId())).findFirst();
                    }
                    if ("save".equals(name) || "saveAndFlush".equals(name)) {
                        QuizAttempt a = (QuizAttempt) args[0];
                        if (a.getId() == null) a.setId(seq.incrementAndGet());
                        attemptStore.put(a.getId(), a);
                        return a;
                    }
                    if ("findTopByQuiz_IdAndUser_IdAndCompletedAtIsNotNullOrderByCompletedAtDesc".equals(name)) {
                        Long qId = (Long) args[0];
                        Long uId = (Long) args[1];
                        return attemptStore.values().stream()
                                .filter(a -> a.getQuiz() != null && a.getQuiz().getId().equals(qId))
                                .filter(a -> a.getUser() != null && a.getUser().getId().equals(uId))
                                .filter(a -> a.getCompletedAt() != null)
                                .max(Comparator.comparing(QuizAttempt::getCompletedAt));
                    }
                    if ("findTopByQuiz_IdAndUser_IdAndCompletedAtIsNullOrderByStartedAtDesc".equals(name)) {
                        Long qId = (Long) args[0];
                        Long uId = (Long) args[1];
                        return attemptStore.values().stream()
                                .filter(a -> a.getQuiz() != null && a.getQuiz().getId().equals(qId))
                                .filter(a -> a.getUser() != null && a.getUser().getId().equals(uId))
                                .filter(a -> a.getCompletedAt() == null)
                                .max(Comparator.comparing(QuizAttempt::getStartedAt));
                    }
                    if ("findTopByQuiz_IdAndUser_IdAndPassedTrueOrderByCompletedAtDesc".equals(name)) {
                        Long qId = (Long) args[0];
                        Long uId = (Long) args[1];
                        return attemptStore.values().stream()
                                .filter(a -> a.getQuiz() != null && a.getQuiz().getId().equals(qId))
                                .filter(a -> a.getUser() != null && a.getUser().getId().equals(uId))
                                .filter(a -> Boolean.TRUE.equals(a.getPassed()))
                                .max(Comparator.comparing(QuizAttempt::getCompletedAt));
                    }
                    if ("findMaxAttemptNumber".equals(name)) {
                        Long qId = (Long) args[0];
                        Long uId = (Long) args[1];
                        return attemptStore.values().stream()
                                .filter(a -> a.getQuiz() != null && a.getQuiz().getId().equals(qId))
                                .filter(a -> a.getUser() != null && a.getUser().getId().equals(uId))
                                .mapToInt(a -> a.getAttemptNumber() != null ? a.getAttemptNumber() : 0)
                                .max().orElse(0);
                    }
                    return null;
                }
        );
    }

    private QuizProgressRepository createProgressRepoMock() {
        return (QuizProgressRepository) Proxy.newProxyInstance(
                QuizProgressRepository.class.getClassLoader(),
                new Class[]{QuizProgressRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findByQuiz_IdAndUser_Id".equals(name) || "findByQuizIdAndUserId".equals(name)) {
                        Long qId = (Long) args[0];
                        Long uId = (Long) args[1];
                        return progressStore.values().stream()
                                .filter(p -> p.getQuiz() != null && p.getQuiz().getId().equals(qId))
                                .filter(p -> p.getUser() != null && p.getUser().getId().equals(uId))
                                .findFirst();
                    }
                    if ("save".equals(name) || "saveAndFlush".equals(name)) {
                        QuizProgress p = (QuizProgress) args[0];
                        if (p.getId() == null) p.setId(seq.incrementAndGet());
                        progressStore.put(p.getId(), p);
                        return p;
                    }
                    return null;
                }
        );
    }

    private UserRepository createUserRepoMock() {
        return (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class[]{UserRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name)) return Optional.ofNullable(userStore.get((Long) args[0]));
                    if ("findByEmail".equals(name)) {
                        String email = (String) args[0];
                        return userStore.values().stream().filter(u -> email.equalsIgnoreCase(u.getEmail())).findFirst();
                    }
                    return null;
                }
        );
    }

    private EnrollmentRepository createEnrollmentRepoMock() {
        return (EnrollmentRepository) Proxy.newProxyInstance(
                EnrollmentRepository.class.getClassLoader(),
                new Class[]{EnrollmentRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findFirstByUserIdAndCourseId".equals(name) || "findByUserIdAndCourseId".equals(name)) {
                        Long uId = (Long) args[0];
                        Long cId = (Long) args[1];
                        return enrollmentStore.values().stream()
                                .filter(e -> e.getUser() != null && e.getUser().getId().equals(uId))
                                .filter(e -> e.getCourse() != null && e.getCourse().getId().equals(cId))
                                .findFirst();
                    }
                    return Optional.empty();
                }
        );
    }

    private ModuleRepository createModuleRepoMock() {
        return (ModuleRepository) Proxy.newProxyInstance(
                ModuleRepository.class.getClassLoader(),
                new Class[]{ModuleRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name)) return Optional.ofNullable(moduleStore.get((Long) args[0]));
                    return null;
                }
        );
    }

    private CourseRepository createCourseRepoMock() {
        return (CourseRepository) Proxy.newProxyInstance(
                CourseRepository.class.getClassLoader(),
                new Class[]{CourseRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name)) return Optional.ofNullable(courseStore.get((Long) args[0]));
                    return null;
                }
        );
    }
}
