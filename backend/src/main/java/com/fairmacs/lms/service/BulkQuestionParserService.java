package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.BulkQuestionParseResultDTO;
import com.fairmacs.lms.dto.BulkQuestionParseResultDTO.ParsedQuestionDTO;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class BulkQuestionParserService {

    private static final Logger log = LoggerFactory.getLogger(BulkQuestionParserService.class);

    private static final Pattern QUESTION_HEADER_PATTERN = Pattern.compile(
            "^(?:question\\s*\\d*[:.)\\-\\s]|q\\d*[:.)\\-\\s]|\\d+[:.)\\-])\\s*(.*)$", Pattern.CASE_INSENSITIVE
    );

    private static final Pattern OPTION_PATTERN = Pattern.compile(
            "^(?:\\(([A-Da-d])\\)|\\[([A-Da-d])\\]|(?:option\\s*\\(?([A-Da-d])\\)?[:.)\\-\\s]?)|([A-Da-d])[:.)\\-])(?:\\s+(.*)|$)", Pattern.CASE_INSENSITIVE
    );

    private static final Pattern CORRECT_ANSWER_PATTERN = Pattern.compile(
            "^(?:correct\\s*answers?|answers?|ans\\.?|key|correct)[\\s:\\-=]+(.*)$", Pattern.CASE_INSENSITIVE
    );

    private static final Pattern EXPLANATION_PATTERN = Pattern.compile(
            "^(?:explanations?|explain|notes?|rationale)[\\s:\\-=]*(.*)$", Pattern.CASE_INSENSITIVE
    );

    public BulkQuestionParseResultDTO parseUploadedFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file provided for bulk question import.");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        String lowerName = originalFilename.toLowerCase(Locale.ROOT);

        try (InputStream is = file.getInputStream()) {
            byte[] bytes = file.getBytes();

            if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
                return parseExcel(new ByteArrayInputStream(bytes), originalFilename);
            } else if (lowerName.endsWith(".csv")) {
                String text = new String(bytes, StandardCharsets.UTF_8);
                return parseCsv(text, originalFilename);
            } else if (lowerName.endsWith(".docx")) {
                return parseDocx(new ByteArrayInputStream(bytes), originalFilename);
            } else if (lowerName.endsWith(".doc")) {
                BulkQuestionParseResultDTO result = new BulkQuestionParseResultDTO();
                result.setSourceType("LEGACY_DOC");
                result.setMessage("Legacy Word (.doc) format is not supported for structured extraction. Please save or convert your document to .docx format and re-upload.");
                return result;
            } else if (lowerName.endsWith(".pdf")) {
                return parsePdf(new ByteArrayInputStream(bytes), originalFilename);
            } else if (lowerName.endsWith(".txt")) {
                String text = new String(bytes, StandardCharsets.UTF_8);
                return parseStructuredText(text, "Plain Text", originalFilename);
            } else {
                throw new IllegalArgumentException("Unsupported file format (" + originalFilename + "). Supported formats: Excel (.xlsx, .xls), CSV (.csv), Word (.docx), PDF (.pdf), Text (.txt).");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse bulk question file: {}", originalFilename, e);
            throw new IllegalStateException("Failed to parse document: " + e.getMessage(), e);
        }
    }

    public BulkQuestionParseResultDTO parsePastedText(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Please paste question text to parse.");
        }

        String trimmed = text.trim();
        // 1. If tab-separated, parse as TSV (copied directly from Excel/Sheets)
        if (trimmed.contains("\t")) {
            return parseDelimitedText(trimmed, "\t", "Pasted SpreadSheet");
        }

        // 2. If first line has commas and keywords, parse as CSV
        String firstLine = trimmed.split("\\r?\\n")[0];
        if (firstLine.contains(",") && (firstLine.toLowerCase(Locale.ROOT).contains("question") || firstLine.toLowerCase(Locale.ROOT).contains("option"))) {
            return parseCsv(trimmed, "Pasted CSV");
        }

        // 3. Otherwise, parse as structured text
        return parseStructuredText(trimmed, "Pasted Text", "Clipboard");
    }

    // =========================================================================
    // EXCEL PARSING
    // =========================================================================

    public BulkQuestionParseResultDTO parseExcel(InputStream is, String sourceName) throws Exception {
        BulkQuestionParseResultDTO result = new BulkQuestionParseResultDTO();
        result.setSourceType("EXCEL");

        try (Workbook workbook = WorkbookFactory.create(is)) {
            if (workbook.getNumberOfSheets() == 0) {
                result.setMessage("The Excel workbook contains no sheets.");
                return result;
            }

            Sheet sheet = workbook.getSheetAt(0);
            int physicalRows = sheet.getPhysicalNumberOfRows();
            if (physicalRows < 2) {
                result.setMessage("The Excel sheet must contain a header row and at least one data row.");
                return result;
            }

            // Extract dense rows
            List<List<String>> rows = new ArrayList<>();
            for (Row row : sheet) {
                List<String> cellValues = new ArrayList<>();
                boolean hasContent = false;
                int lastCol = Math.max(row.getLastCellNum(), 8);
                for (int c = 0; c < lastCol; c++) {
                    Cell cell = row.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    String val = getCellValueAsString(cell);
                    cellValues.add(val);
                    if (!val.isBlank()) hasContent = true;
                }
                if (hasContent) {
                    rows.add(cellValues);
                }
            }

            if (rows.size() < 2) {
                result.setMessage("No question data found in the Excel sheet.");
                return result;
            }

            return parseTableRows(rows, "Excel Sheet", sourceName);
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double num = cell.getNumericCellValue();
                if (num == Math.floor(num)) {
                    yield String.valueOf((long) num);
                }
                yield String.valueOf(num);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue().trim();
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> "";
        };
    }

    // =========================================================================
    // CSV / DELIMITED TEXT PARSING
    // =========================================================================

    public BulkQuestionParseResultDTO parseCsv(String csvContent, String sourceName) {
        List<String> rawLines = Arrays.stream(csvContent.split("\\r?\\n"))
                .map(String::trim)
                .filter(l -> !l.isBlank())
                .toList();

        if (rawLines.size() < 2) {
            BulkQuestionParseResultDTO res = new BulkQuestionParseResultDTO();
            res.setSourceType("CSV");
            res.setMessage("CSV content must contain a header row and at least one question row.");
            return res;
        }

        String firstLine = rawLines.get(0);
        char delimiter = ',';
        if (firstLine.contains("\t")) {
            delimiter = '\t';
        } else if (firstLine.contains(";") && !firstLine.contains(",")) {
            delimiter = ';';
        }

        List<List<String>> rows = new ArrayList<>();
        for (String line : rawLines) {
            List<String> fields = parseCsvLine(line, delimiter);
            if (fields.stream().anyMatch(f -> !f.isBlank())) {
                rows.add(fields);
            }
        }

        return parseTableRows(rows, "CSV", sourceName);
    }

    private BulkQuestionParseResultDTO parseDelimitedText(String content, String delimiter, String sourceName) {
        List<String> rawLines = Arrays.stream(content.split("\\r?\\n"))
                .map(String::trim)
                .filter(l -> !l.isBlank())
                .toList();

        List<List<String>> rows = new ArrayList<>();
        for (String line : rawLines) {
            String[] parts = line.split(Pattern.quote(delimiter), -1);
            List<String> fields = Arrays.stream(parts).map(String::trim).toList();
            if (fields.stream().anyMatch(f -> !f.isBlank())) {
                rows.add(fields);
            }
        }

        return parseTableRows(rows, "Delimited Text", sourceName);
    }

    private List<String> parseCsvLine(String line, char delimiter) {
        List<String> result = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    cur.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == delimiter && !inQuotes) {
                result.add(cur.toString().trim());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        result.add(cur.toString().trim());
        return result;
    }

    // =========================================================================
    // TABLE ROW PARSER (COMMON FOR EXCEL, CSV, DOCX TABLES)
    // =========================================================================

    private BulkQuestionParseResultDTO parseTableRows(List<List<String>> rows, String sourceType, String sourceName) {
        BulkQuestionParseResultDTO result = new BulkQuestionParseResultDTO();
        result.setSourceType(sourceType);

        if (rows.isEmpty()) {
            result.setMessage("No question data found.");
            return result;
        }

        List<String> firstRow = rows.get(0).stream().map(h -> h.toLowerCase(Locale.ROOT)).toList();
        boolean hasHeader = firstRow.stream().anyMatch(h -> h.contains("question") || h.contains("option") || h.contains("correct") || h.contains("answer"));

        int startRow = hasHeader ? 1 : 0;
        int qTextCol = hasHeader ? findColumnIndex(firstRow, List.of("question", "text", "qtext")) : 0;
        int qTypeCol = hasHeader ? findColumnIndex(firstRow, List.of("type", "qtype")) : -1;
        int optACol = hasHeader ? findColumnIndex(firstRow, List.of("option a", "opt a", "option_a", "opta", "a")) : 1;
        int optBCol = hasHeader ? findColumnIndex(firstRow, List.of("option b", "opt b", "option_b", "optb", "b")) : 2;
        int optCCol = hasHeader ? findColumnIndex(firstRow, List.of("option c", "opt c", "option_c", "optc", "c")) : 3;
        int optDCol = hasHeader ? findColumnIndex(firstRow, List.of("option d", "opt d", "option_d", "optd", "d")) : 4;
        int ansCol = hasHeader ? findColumnIndex(firstRow, List.of("correct", "answer", "ans", "correct answer", "key")) : 5;
        int expCol = hasHeader ? findColumnIndex(firstRow, List.of("explanation", "explain", "rationale", "note")) : 6;
        int marksCol = hasHeader ? findColumnIndex(firstRow, List.of("marks", "mark", "points", "score")) : -1;

        if (hasHeader && rows.size() < 2) {
            result.setMessage("At least one header row and one question row are required.");
            return result;
        }

        List<ParsedQuestionDTO> parsedList = new ArrayList<>();
        Set<String> seenQuestions = new HashSet<>();

        for (int r = startRow; r < rows.size(); r++) {
            List<String> row = rows.get(r);
            String questionText = getVal(row, qTextCol, 0);
            if (questionText.isBlank()) continue; // skip blank row

            ParsedQuestionDTO q = new ParsedQuestionDTO();
            q.setId("imp-" + System.currentTimeMillis() + "-" + r);
            q.setSourceRowOrPage("Row " + (r + 1));
            q.setQuestionText(questionText);

            String rawType = getVal(row, qTypeCol, -1);
            String optA = cleanOptionPrefix(getVal(row, optACol, 1));
            String optB = cleanOptionPrefix(getVal(row, optBCol, 2));
            String optC = cleanOptionPrefix(getVal(row, optCCol, 3));
            String optD = cleanOptionPrefix(getVal(row, optDCol, 4));

            q.setOptionA(optA);
            q.setOptionB(optB);
            q.setOptionC(optC);
            q.setOptionD(optD);

            String rawAns = getVal(row, ansCol, 5);
            String normalizedAns = normalizeAnswers(rawAns, optA, optB, optC, optD);
            q.setCorrectAnswer(normalizedAns);

            boolean isMulti = normalizedAns.contains(",") || rawType.toUpperCase(Locale.ROOT).contains("MULTI");
            q.setQuestionType(isMulti ? "MULTI_SELECT" : "SINGLE_CHOICE");

            q.setExplanation(getVal(row, expCol, 6));

            String rawMarks = getVal(row, marksCol, -1);
            if (!rawMarks.isBlank()) {
                try {
                    q.setMarks(Integer.parseInt(rawMarks));
                } catch (NumberFormatException ignored) {}
            }

            validateQuestion(q, seenQuestions);
            parsedList.add(q);
        }

        finalizeResult(result, parsedList);
        return result;
    }

    // =========================================================================
    // WORD (.DOCX) PARSING
    // =========================================================================

    public BulkQuestionParseResultDTO parseDocx(InputStream is, String sourceName) throws Exception {
        BulkQuestionParseResultDTO result = new BulkQuestionParseResultDTO();
        result.setSourceType("WORD_DOCX");

        try (XWPFDocument doc = new XWPFDocument(is)) {
            // 1. Check if document has tables with header row
            List<XWPFTable> tables = doc.getTables();
            if (!tables.isEmpty()) {
                List<List<String>> tableRows = new ArrayList<>();
                for (XWPFTable table : tables) {
                    for (XWPFTableRow row : table.getRows()) {
                        List<String> cells = new ArrayList<>();
                        for (XWPFTableCell cell : row.getTableCells()) {
                            cells.add(cell.getText().trim());
                        }
                        if (cells.stream().anyMatch(c -> !c.isBlank())) {
                            tableRows.add(cells);
                        }
                    }
                }
                if (tableRows.size() >= 2) {
                    List<String> firstRow = tableRows.get(0).stream().map(s -> s.toLowerCase(Locale.ROOT)).toList();
                    if (firstRow.stream().anyMatch(h -> h.contains("question") || h.contains("option") || h.contains("correct"))) {
                        return parseTableRows(tableRows, "Word Table", sourceName);
                    }
                }
            }

            // 2. Otherwise parse paragraph text
            try (XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
                String fullText = extractor.getText();
                if (fullText == null || fullText.trim().length() < 10) {
                    result.setMessage("No readable text found in Word document.");
                    return result;
                }
                return parseStructuredText(fullText, "Word Document", sourceName);
            }
        }
    }

    // =========================================================================
    // PDF PARSING (OPENPDF)
    // =========================================================================

    public BulkQuestionParseResultDTO parsePdf(InputStream is, String sourceName) throws Exception {
        BulkQuestionParseResultDTO result = new BulkQuestionParseResultDTO();
        result.setSourceType("PDF");

        PdfReader reader = null;
        try {
            reader = new PdfReader(is);
            int pages = reader.getNumberOfPages();
            if (pages == 0) {
                result.setMessage("PDF contains no pages.");
                return result;
            }

            PdfTextExtractor extractor = new PdfTextExtractor(reader);
            StringBuilder fullDocText = new StringBuilder();
            List<String> pageTexts = new ArrayList<>();
            int totalChars = 0;

            for (int p = 1; p <= pages; p++) {
                String pageText = extractor.getTextFromPage(p);
                if (pageText == null) pageText = "";
                totalChars += pageText.trim().length();
                pageTexts.add(pageText);
                fullDocText.append("\n--- PAGE ").append(p).append(" ---\n").append(pageText).append("\n");
            }

            // Scanned / Image-Only PDF Guard
            if (totalChars < 20) {
                result.setMessage("Scanned or image-only PDF detected. Selectable text could not be extracted from this document. Please use a text-based PDF or upload an Excel, CSV, Word, or text file.");
                return result;
            }

            return parseStructuredPdfPages(pageTexts, sourceName);
        } finally {
            if (reader != null) {
                reader.close();
            }
        }
    }

    private BulkQuestionParseResultDTO parseStructuredPdfPages(List<String> pageTexts, String sourceName) {
        List<ParsedQuestionDTO> allQuestions = new ArrayList<>();
        Set<String> seenQuestions = new HashSet<>();

        for (int p = 0; p < pageTexts.size(); p++) {
            String page = pageTexts.get(p);
            String pageLabel = "Page " + (p + 1);
            List<ParsedQuestionDTO> pageQs = parseTextIntoQuestions(page, pageLabel);
            for (ParsedQuestionDTO q : pageQs) {
                validateQuestion(q, seenQuestions);
                allQuestions.add(q);
            }
        }

        BulkQuestionParseResultDTO result = new BulkQuestionParseResultDTO();
        result.setSourceType("PDF");
        finalizeResult(result, allQuestions);
        return result;
    }

    // =========================================================================
    // STRUCTURED TEXT PARSING (REGEX / DETERMINISTIC)
    // =========================================================================

    public BulkQuestionParseResultDTO parseStructuredText(String text, String sourceType, String sourceName) {
        BulkQuestionParseResultDTO result = new BulkQuestionParseResultDTO();
        result.setSourceType(sourceType);

        List<ParsedQuestionDTO> questions = parseTextIntoQuestions(text, "Question");
        Set<String> seen = new HashSet<>();
        for (ParsedQuestionDTO q : questions) {
            validateQuestion(q, seen);
        }

        finalizeResult(result, questions);
        return result;
    }

    private List<ParsedQuestionDTO> parseTextIntoQuestions(String text, String sourceLabel) {
        List<ParsedQuestionDTO> questions = new ArrayList<>();
        if (text == null || text.isBlank()) return questions;

        String[] rawLines = text.split("\\r?\\n");
        List<List<String>> chunks = sliceIntoQuestionChunks(rawLines);

        int count = 0;
        for (List<String> chunkLines : chunks) {
            ParsedQuestionDTO q = parseSingleQuestionChunk(chunkLines, ++count, sourceLabel);
            if (q != null) {
                questions.add(q);
            }
        }

        return questions;
    }

    private List<List<String>> sliceIntoQuestionChunks(String[] rawLines) {
        List<List<String>> chunks = new ArrayList<>();
        if (rawLines == null || rawLines.length == 0) return chunks;

        TreeSet<Integer> startIndices = new TreeSet<>();
        int n = rawLines.length;

        // Step 1: Add all lines matching QUESTION_HEADER_PATTERN
        for (int i = 0; i < n; i++) {
            String line = rawLines[i].trim();
            if (QUESTION_HEADER_PATTERN.matcher(line).matches()) {
                startIndices.add(i);
            }
        }

        // Step 2: Scan for Option A line indices to catch bare questions (Format E)
        List<Integer> optionAIndices = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            String line = rawLines[i].trim();
            if (line.isBlank()) continue;

            Matcher optMatch = OPTION_PATTERN.matcher(line);
            if (optMatch.matches()) {
                String letterStr = optMatch.group(1) != null ? optMatch.group(1) :
                                  (optMatch.group(2) != null ? optMatch.group(2) :
                                  (optMatch.group(3) != null ? optMatch.group(3) : optMatch.group(4)));
                if (letterStr != null && Character.toUpperCase(letterStr.charAt(0)) == 'A') {
                    optionAIndices.add(i);
                }
            }
        }

        // For any Option A that doesn't have an explicit question header preceding it,
        // discover the question start by scanning backwards from optAIdx - 1.
        for (int optAIdx : optionAIndices) {
            Integer floorHeader = startIndices.floor(optAIdx);
            boolean prevEndedAfterHeader = false;
            if (floorHeader != null) {
                for (int j = floorHeader + 1; j < optAIdx; j++) {
                    String line = rawLines[j].trim();
                    if (CORRECT_ANSWER_PATTERN.matcher(line).matches() || EXPLANATION_PATTERN.matcher(line).matches()) {
                        prevEndedAfterHeader = true;
                        break;
                    }
                }
            }

            if (floorHeader == null || prevEndedAfterHeader) {
                int minIdx = floorHeader != null ? floorHeader + 1 : 0;
                int firstNonBlank = -1;
                for (int j = optAIdx - 1; j >= minIdx; j--) {
                    String line = rawLines[j].trim();
                    if (line.isBlank()) {
                        if (firstNonBlank != -1) break;
                    } else if (CORRECT_ANSWER_PATTERN.matcher(line).matches() || EXPLANATION_PATTERN.matcher(line).matches()) {
                        break;
                    } else {
                        firstNonBlank = j;
                    }
                }
                if (firstNonBlank != -1) {
                    startIndices.add(firstNonBlank);
                } else {
                    startIndices.add(optAIdx);
                }
            }
        }

        // Step 3: If no headers and no options found, fallback to first non-blank line
        if (startIndices.isEmpty()) {
            for (int i = 0; i < n; i++) {
                if (!rawLines[i].trim().isBlank()) {
                    startIndices.add(i);
                    break;
                }
            }
        }

        // Step 4: Slice rawLines into chunks
        List<Integer> sortedIndices = new ArrayList<>(startIndices);
        for (int i = 0; i < sortedIndices.size(); i++) {
            int start = sortedIndices.get(i);
            int end = (i + 1 < sortedIndices.size()) ? sortedIndices.get(i + 1) : n;

            List<String> chunk = new ArrayList<>();
            for (int j = start; j < end; j++) {
                chunk.add(rawLines[j]);
            }
            if (chunk.stream().anyMatch(l -> !l.trim().isBlank())) {
                chunks.add(chunk);
            }
        }

        return chunks;
    }

    private ParsedQuestionDTO parseSingleQuestionChunk(List<String> lines, int count, String sourceLabel) {
        StringBuilder qTextBuilder = new StringBuilder();
        String optA = "", optB = "", optC = "", optD = "";
        String rawAns = "";
        StringBuilder expBuilder = new StringBuilder();

        char currentOption = ' ';
        boolean inAnswer = false;
        boolean inExplanation = false;
        boolean seenOptionA = false;

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isBlank()) continue;

            Matcher expMatch = EXPLANATION_PATTERN.matcher(line);
            Matcher ansMatch = CORRECT_ANSWER_PATTERN.matcher(line);
            Matcher optMatch = OPTION_PATTERN.matcher(line);

            if (expMatch.matches()) {
                inExplanation = true;
                inAnswer = false;
                currentOption = ' ';
                String expContent = expMatch.group(1).trim();
                if (!expContent.isEmpty()) {
                    if (expBuilder.length() > 0) expBuilder.append("\n");
                    expBuilder.append(expContent);
                }
            } else if (!inExplanation && ansMatch.matches()) {
                inAnswer = true;
                currentOption = ' ';
                String ansContent = ansMatch.group(1).trim();
                if (!ansContent.isEmpty()) {
                    rawAns = ansContent;
                }
            } else if (!inExplanation && !inAnswer && optMatch.matches()) {
                String letterStr = optMatch.group(1) != null ? optMatch.group(1) :
                                  (optMatch.group(2) != null ? optMatch.group(2) :
                                  (optMatch.group(3) != null ? optMatch.group(3) : optMatch.group(4)));
                char letter = Character.toUpperCase(letterStr.charAt(0));
                String optVal = optMatch.group(5) != null ? cleanOptionPrefix(optMatch.group(5).trim()) : "";

                currentOption = letter;
                if (letter == 'A') {
                    optA = optVal;
                    seenOptionA = true;
                } else if (letter == 'B') {
                    optB = optVal;
                } else if (letter == 'C') {
                    optC = optVal;
                } else if (letter == 'D') {
                    optD = optVal;
                }
            } else if (inExplanation) {
                if (expBuilder.length() > 0) expBuilder.append("\n");
                expBuilder.append(line);
            } else if (inAnswer && rawAns.isEmpty()) {
                rawAns = line;
            } else if (currentOption != ' ') {
                String continuation = cleanOptionPrefix(line);
                if (currentOption == 'A') optA = (optA.isEmpty() ? continuation : optA + " " + continuation);
                else if (currentOption == 'B') optB = (optB.isEmpty() ? continuation : optB + " " + continuation);
                else if (currentOption == 'C') optC = (optC.isEmpty() ? continuation : optC + " " + continuation);
                else if (currentOption == 'D') optD = (optD.isEmpty() ? continuation : optD + " " + continuation);
            } else if (!seenOptionA) {
                Matcher qHeader = QUESTION_HEADER_PATTERN.matcher(line);
                String textToAdd = qHeader.matches() ? qHeader.group(1).trim() : line;
                if (!textToAdd.isEmpty()) {
                    if (qTextBuilder.length() > 0) qTextBuilder.append("\n");
                    qTextBuilder.append(textToAdd);
                }
            }
        }

        String qText = qTextBuilder.toString().trim();
        String explanation = expBuilder.toString().trim();

        if (qText.isBlank() && optA.isBlank() && optB.isBlank() && rawAns.isBlank()) {
            return null;
        }

        ParsedQuestionDTO q = new ParsedQuestionDTO();
        q.setId("imp-" + System.currentTimeMillis() + "-" + count);

        String qLabel;
        if (sourceLabel != null && sourceLabel.startsWith("Page ")) {
            qLabel = sourceLabel + ", Q" + count;
        } else if (sourceLabel != null && (sourceLabel.startsWith("Row ") || sourceLabel.contains("Table"))) {
            qLabel = sourceLabel;
        } else {
            qLabel = "Question " + count;
        }
        q.setSourceRowOrPage(qLabel);

        q.setQuestionText(qText);
        q.setOptionA(optA);
        q.setOptionB(optB);
        q.setOptionC(optC);
        q.setOptionD(optD);
        q.setExplanation(explanation);

        String normalizedAns = normalizeAnswers(rawAns, optA, optB, optC, optD);
        q.setCorrectAnswer(normalizedAns);

        boolean isMulti = normalizedAns.contains(",") || rawAns.toLowerCase(Locale.ROOT).contains("all") || rawAns.length() > 1;
        q.setQuestionType(isMulti ? "MULTI_SELECT" : "SINGLE_CHOICE");

        return q;
    }

    // =========================================================================
    // HELPER & NORMALIZATION UTILITIES
    // =========================================================================

    private String cleanOptionPrefix(String text) {
        if (text == null) return "";
        String s = text.trim();
        s = s.replaceFirst("^(?:\\([A-Da-d1-4]\\)\\s*|\\[[A-Da-d1-4]\\]\\s*|(?:option\\s*\\(?[A-Da-d1-4]\\)?[:.)\\-\\s]?\\s*)|[A-Da-d1-4][:.)\\-]\\s*)", "");
        return s.trim();
    }

    private String normalizeAnswers(String rawAns, String optA, String optB, String optC, String optD) {
        if (rawAns == null || rawAns.isBlank()) return "";

        String s = rawAns.trim().toUpperCase(Locale.ROOT);
        s = s.replaceFirst("^(?:CORRECT\\s*ANSWERS?|ANSWERS?|ANS\\.?|KEY|CORRECT)[\\s:\\-=]+", "");
        s = s.replaceFirst("^(?:OPTION|OPT)\\s*", "");

        s = s.replaceAll("\\b1\\b", "A")
             .replaceAll("\\b2\\b", "B")
             .replaceAll("\\b3\\b", "C")
             .replaceAll("\\b4\\b", "D");

        Set<String> letters = new LinkedHashSet<>();

        if (!optA.isBlank() && s.equalsIgnoreCase(optA.trim().toUpperCase(Locale.ROOT))) letters.add("A");
        if (!optB.isBlank() && s.equalsIgnoreCase(optB.trim().toUpperCase(Locale.ROOT))) letters.add("B");
        if (!optC.isBlank() && s.equalsIgnoreCase(optC.trim().toUpperCase(Locale.ROOT))) letters.add("C");
        if (!optD.isBlank() && s.equalsIgnoreCase(optD.trim().toUpperCase(Locale.ROOT))) letters.add("D");

        if (letters.isEmpty()) {
            Matcher m = Pattern.compile("\\b([A-D])\\b|\\(([A-D])\\)|\\[([A-D])\\]", Pattern.CASE_INSENSITIVE).matcher(s);
            while (m.find()) {
                String l = m.group(1) != null ? m.group(1) : (m.group(2) != null ? m.group(2) : m.group(3));
                if (l != null) letters.add(l.toUpperCase(Locale.ROOT));
            }
        }

        if (letters.isEmpty() && s.contains("ALL")) {
            letters.add("A");
            letters.add("B");
            if (!optC.isBlank()) letters.add("C");
            if (!optD.isBlank()) letters.add("D");
        }

        if (letters.isEmpty()) {
            String cleaned = s.replaceAll("[^A-D]", "");
            for (char ch : cleaned.toCharArray()) {
                letters.add(String.valueOf(ch));
            }
        }

        List<String> sorted = new ArrayList<>(letters);
        Collections.sort(sorted);
        return String.join(",", sorted);
    }

    private void validateQuestion(ParsedQuestionDTO q, Set<String> seenQuestions) {
        List<String> errors = new ArrayList<>();

        if (q.getQuestionText() == null || q.getQuestionText().isBlank()) {
            errors.add("Question text is required.");
        } else {
            String lower = q.getQuestionText().trim().toLowerCase(Locale.ROOT);
            if (!seenQuestions.add(lower)) {
                errors.add("Duplicate question text detected.");
            }
        }

        if (q.getOptionA() == null || q.getOptionA().isBlank()) {
            errors.add("Option A is required.");
        }
        if (q.getOptionB() == null || q.getOptionB().isBlank()) {
            errors.add("Option B is required.");
        }

        String ans = q.getCorrectAnswer();
        if (ans == null || ans.isBlank()) {
            errors.add("At least one correct answer must be configured.");
        } else {
            String[] parts = ans.split(",");
            for (String p : parts) {
                p = p.trim();
                if ("A".equals(p) && (q.getOptionA() == null || q.getOptionA().isBlank())) {
                    errors.add("Correct answer specifies 'A' but Option A is empty.");
                } else if ("B".equals(p) && (q.getOptionB() == null || q.getOptionB().isBlank())) {
                    errors.add("Correct answer specifies 'B' but Option B is empty.");
                } else if ("C".equals(p) && (q.getOptionC() == null || q.getOptionC().isBlank())) {
                    errors.add("Correct answer specifies 'C' but Option C is empty.");
                } else if ("D".equals(p) && (q.getOptionD() == null || q.getOptionD().isBlank())) {
                    errors.add("Correct answer specifies 'D' but Option D is empty.");
                }
            }
        }

        q.setValid(errors.isEmpty());
        q.setValidationErrors(errors);
    }

    private void finalizeResult(BulkQuestionParseResultDTO result, List<ParsedQuestionDTO> questions) {
        result.setQuestions(questions);
        result.setTotalDetected(questions.size());

        int valid = 0;
        int needsReview = 0;
        for (ParsedQuestionDTO q : questions) {
            if (q.isValid()) valid++;
            else needsReview++;
        }

        result.setValidCount(valid);
        result.setNeedsReviewCount(needsReview);
        result.setInvalidCount(needsReview);

        if (questions.isEmpty()) {
            if (result.getMessage() == null) {
                result.setMessage("No questions could be detected. Please check the document format.");
            }
        } else {
            result.setMessage(String.format("Successfully parsed %d questions (%d valid, %d require review).",
                    questions.size(), valid, needsReview));
        }
    }

    private int findColumnIndex(List<String> headers, List<String> searchTerms) {
        for (int i = 0; i < headers.size(); i++) {
            String h = headers.get(i);
            if (h == null) continue;
            for (String term : searchTerms) {
                if (h.equalsIgnoreCase(term) || h.contains(term)) {
                    return i;
                }
            }
        }
        return -1;
    }

    private String getVal(List<String> row, int preferredIdx, int fallbackIdx) {
        int idx = preferredIdx != -1 ? preferredIdx : fallbackIdx;
        if (idx < 0 || idx >= row.size()) return "";
        String s = row.get(idx);
        return s == null ? "" : s.trim();
    }
}
