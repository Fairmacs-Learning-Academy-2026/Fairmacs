import React, { useState, useRef } from 'react';
import {
  X, Upload, Download, AlertCircle, CheckCircle2,
  Trash2, Plus, Edit3, FileSpreadsheet, ArrowRight,
  Check, AlertTriangle, Loader2, ChevronUp, ChevronDown
} from 'lucide-react';
import ExcelJS from 'exceljs';

export default function BulkQuizImportModal({
  isOpen,
  onClose,
  targetTitle = 'Quiz',
  onImportQuestions
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste' | 'preview'
  const [pastedText, setPastedText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [importMode, setImportMode] = useState('append'); // 'append' | 'replace'
  const [parseError, setParseError] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');

  const getAuthToken = () =>
    localStorage.getItem('fairmacs_token') ||
    localStorage.getItem('fairmacs_lms_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    '';

  // --- SAMPLE TEMPLATE GENERATION ---
  const downloadSampleExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Questions');

    worksheet.columns = [
      { header: 'Question Text', key: 'questionText', width: 45 },
      { header: 'Question Type', key: 'questionType', width: 18 },
      { header: 'Option A', key: 'optionA', width: 25 },
      { header: 'Option B', key: 'optionB', width: 25 },
      { header: 'Option C', key: 'optionC', width: 25 },
      { header: 'Option D', key: 'optionD', width: 25 },
      { header: 'Correct Answer', key: 'correctAnswer', width: 16 },
      { header: 'Explanation', key: 'explanation', width: 35 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' }
    };

    // Sample data rows
    worksheet.addRow({
      questionText: 'What is the primary document required for international maritime container release?',
      questionType: 'SINGLE_CHOICE',
      optionA: 'Original Bill of Lading (OBL)',
      optionB: 'Proforma Invoice',
      optionC: 'Packing List copy only',
      optionD: 'Certificate of Origin draft',
      correctAnswer: 'A',
      explanation: 'An endorsed Original Bill of Lading or verified Sea Waybill is required for container delivery release.'
    });

    worksheet.addRow({
      questionText: 'Which of the following are mandatory compliance documents for dangerous goods air freight?',
      questionType: 'MULTI_SELECT',
      optionA: "Shipper's Declaration for Dangerous Goods (DGD)",
      optionB: 'Material Safety Data Sheet (MSDS)',
      optionC: 'Air Waybill (AWB) with DG endorsement',
      optionD: 'Consignee corporate business license',
      correctAnswer: 'A,B,C',
      explanation: 'DGD, current MSDS/SDS, and DG-annotated Air Waybill are mandatory IATA requirements.'
    });

    worksheet.addRow({
      questionText: 'What Incoterm places maximum obligation on the seller?',
      questionType: 'SINGLE_CHOICE',
      optionA: 'EXW (Ex Works)',
      optionB: 'FOB (Free on Board)',
      optionC: 'CIF (Cost, Insurance and Freight)',
      optionD: 'DDP (Delivered Duty Paid)',
      correctAnswer: 'D',
      explanation: 'Under DDP, the seller bears all risks and costs including import customs clearance and duties.'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Fairmacs_LMS_Quiz_Question_Template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleCsv = () => {
    const csvContent =
      `Question Text,Question Type,Option A,Option B,Option C,Option D,Correct Answer,Explanation\n` +
      `"What is the primary document required for container release?",SINGLE_CHOICE,"Original Bill of Lading","Proforma Invoice","Packing List","Draft Certificate",A,"Original Bill of Lading is required for carrier delivery release."\n` +
      `"Which items are mandatory for dangerous goods shipment?",MULTI_SELECT,"Shipper's Declaration (DGD)","Safety Data Sheet (MSDS)","Air Waybill DG Endorsement","Business Card",A,B,C,"DGD, MSDS, and DG-endorsed AWB are mandatory."\n` +
      `"Which Incoterm places maximum duty on the seller?",SINGLE_CHOICE,"EXW","FOB","CIF","DDP",D,"DDP requires seller to pay duties and clearance."\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Fairmacs_LMS_Quiz_Question_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cleanOptionPrefix = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/^(?:\([A-Da-d1-4]\)\s*|\[[A-Da-d1-4]\]\s*|(?:option\s*\(?[A-Da-d1-4]\)?[:.)\s-]?\s*)|[A-Da-d1-4][:.)-]\s*)/i, '')
      .trim();
  };

  const normalizeAnswers = (rawAns, optA = '', optB = '', optC = '', optD = '') => {
    if (!rawAns || !String(rawAns).trim()) return '';
    let s = String(rawAns).trim().toUpperCase();
    s = s.replace(/^(?:CORRECT\s*ANSWERS?|ANSWERS?|ANS\.?|KEY|CORRECT)[\s:\-=]+/i, '');
    s = s.replace(/^(?:OPTION|OPT)\s*/i, '');
    s = s.replace(/\b1\b/g, 'A').replace(/\b2\b/g, 'B').replace(/\b3\b/g, 'C').replace(/\b4\b/g, 'D');

    const letters = new Set();
    if (optA && s === optA.trim().toUpperCase()) letters.add('A');
    if (optB && s === optB.trim().toUpperCase()) letters.add('B');
    if (optC && s === optC.trim().toUpperCase()) letters.add('C');
    if (optD && s === optD.trim().toUpperCase()) letters.add('D');

    if (letters.size === 0) {
      const regex = /\b([A-D])\b|\(([A-D])\)|\[([A-D])\]/gi;
      let m;
      while ((m = regex.exec(s)) !== null) {
        const l = m[1] || m[2] || m[3];
        if (l) letters.add(l.toUpperCase());
      }
    }

    if (letters.size === 0 && s.includes('ALL')) {
      letters.add('A');
      letters.add('B');
      if (optC) letters.add('C');
      if (optD) letters.add('D');
    }

    if (letters.size === 0) {
      const cleaned = s.replace(/[^A-D]/g, '');
      for (const ch of cleaned) {
        letters.add(ch);
      }
    }

    return Array.from(letters).sort().join(',');
  };

  // --- PARSERS ---

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError('');
    setIsProcessing(true);

    try {
      const lowerName = file.name.toLowerCase();

      // 1. Try Backend Document Parser first (handles Excel, CSV, PDF, Word DOCX)
      const token = getAuthToken();
      if (token) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch(`${API_BASE_URL}/quizzes/bulk-import/parse`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            if (data?.sourceType === 'LEGACY_DOC') {
              throw new Error(data.message || 'Legacy Word (.doc) format is not supported. Please convert to .docx and re-upload.');
            }
            if (data?.message && (!data?.questions || data.questions.length === 0)) {
              throw new Error(data.message);
            }
            if (Array.isArray(data?.questions) && data.questions.length > 0) {
              setParsedQuestions(data.questions);
              setActiveTab('preview');
              return;
            }
          } else {
            const errJson = await response.json().catch(() => null);
            if (errJson?.message) {
              throw new Error(errJson.message);
            }
          }
        } catch (serverErr) {
          // If server reported specific scanned PDF or legacy format error, rethrow
          if (serverErr.message && (serverErr.message.includes('Scanned') || serverErr.message.includes('Legacy Word') || serverErr.message.includes('convert your document'))) {
            throw serverErr;
          }
          console.warn('Backend parser unavailable, attempting client-side fallback:', serverErr);
        }
      }

      // 2. Client-side fallback for Excel, CSV, and Text
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        await parseExcelFile(file);
      } else if (lowerName.endsWith('.csv')) {
        const text = await file.text();
        parseCsvText(text);
      } else if (lowerName.endsWith('.txt')) {
        const text = await file.text();
        parseRawText(text);
      } else if (lowerName.endsWith('.pdf')) {
        throw new Error('PDF parsing requires active backend connection. Please ensure backend is running.');
      } else if (lowerName.endsWith('.doc')) {
        throw new Error('Legacy Word (.doc) format is not supported. Please save or convert your document to .docx format and re-upload.');
      } else if (lowerName.endsWith('.docx')) {
        throw new Error('Word (.docx) parsing requires active backend connection. Please ensure backend is running.');
      } else {
        throw new Error('Unsupported file format. Please upload an Excel (.xlsx, .xls), CSV (.csv), Word (.docx), PDF (.pdf), or Text file.');
      }
      setActiveTab('preview');
    } catch (err) {
      setParseError(err.message || 'Failed to parse file.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseExcelFile = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('Excel workbook contains no sheets.');

    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const rowArr = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let val = cell.value;
        if (val == null) {
          rowArr[colNumber - 1] = '';
        } else if (typeof val === 'object') {
          if (Array.isArray(val.richText)) {
            rowArr[colNumber - 1] = val.richText.map(t => t?.text || '').join('').trim();
          } else if (val.text != null) {
            rowArr[colNumber - 1] = String(val.text).trim();
          } else if (val.result != null) {
            rowArr[colNumber - 1] = String(val.result).trim();
          } else {
            rowArr[colNumber - 1] = '';
          }
        } else {
          rowArr[colNumber - 1] = String(val).trim();
        }
      });
      for (let i = 0; i < rowArr.length; i++) {
        if (rowArr[i] === undefined || rowArr[i] === null) rowArr[i] = '';
      }
      if (rowArr.some(v => v !== '')) {
        rows.push(rowArr);
      }
    });

    if (rows.length < 2) {
      throw new Error('Excel file must contain a header row and at least one question row.');
    }

    const headerRow = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());
    const findCol = (terms) => {
      for (let i = 0; i < headerRow.length; i++) {
        const h = headerRow[i];
        if (h && terms.some(t => String(h).toLowerCase().includes(t))) return i;
      }
      return -1;
    };

    const qTextCol = findCol(['question', 'text']);
    const qTypeCol = findCol(['type']);
    const optACol = findCol(['option a', 'opt a', 'option_a', 'a']);
    const optBCol = findCol(['option b', 'opt b', 'option_b', 'b']);
    const optCCol = findCol(['option c', 'opt c', 'option_c', 'c']);
    const optDCol = findCol(['option d', 'opt d', 'option_d', 'd']);
    const ansCol = findCol(['correct', 'answer', 'ans', 'key']);
    const expCol = findCol(['explanation', 'explain']);

    const questions = [];
    const seenTexts = new Set();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const getVal = (idx, fallbackCol) => {
        const targetIdx = idx !== -1 ? idx : fallbackCol;
        if (targetIdx == null || targetIdx < 0 || targetIdx >= row.length) return '';
        return String(row[targetIdx] || '').trim();
      };

      const questionText = getVal(qTextCol, 0);
      if (!questionText) continue;

      let rawType = getVal(qTypeCol, -1);
      const optionA = cleanOptionPrefix(getVal(optACol, 1));
      const optionB = cleanOptionPrefix(getVal(optBCol, 2));
      const optionC = cleanOptionPrefix(getVal(optCCol, 3));
      const optionD = cleanOptionPrefix(getVal(optDCol, 4));
      let correctAnswer = getVal(ansCol, 5).toUpperCase();
      const explanation = getVal(expCol, 6);

      correctAnswer = correctAnswer
        .replace(/\b1\b/g, 'A')
        .replace(/\b2\b/g, 'B')
        .replace(/\b3\b/g, 'C')
        .replace(/\b4\b/g, 'D')
        .replace(/[^A-D,]/g, '')
        .replace(/,+/g, ',');

      const isMulti = String(correctAnswer).includes(',') || String(rawType).toUpperCase().includes('MULTI');
      const questionType = isMulti ? 'MULTI_SELECT' : 'SINGLE_CHOICE';

      const validationErrors = [];
      if (!optionA) validationErrors.push('Option A is required.');
      if (!optionB) validationErrors.push('Option B is required.');
      if (!correctAnswer) validationErrors.push('Correct answer is required.');
      if (seenTexts.has(questionText.toLowerCase())) validationErrors.push('Duplicate question text detected.');
      seenTexts.add(questionText.toLowerCase());

      questions.push({
        id: `imp-${Date.now()}-${r}`,
        sourceRowOrPage: `Row ${r + 1}`,
        questionText,
        questionType,
        optionA: optionA || '',
        optionB: optionB || '',
        optionC: optionC || '',
        optionD: optionD || '',
        correctAnswer: correctAnswer || '',
        explanation: explanation || '',
        valid: validationErrors.length === 0,
        validationErrors
      });
    }

    if (questions.length === 0) {
      throw new Error('No valid question rows found in Excel sheet.');
    }
    setParsedQuestions(questions);
  };

  const splitCsvLine = (line, delimiter = ',') => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result.map(s => s.replace(/^"|"$/g, '').trim());
  };

  const parseCsvText = (csv, explicitDelimiter) => {
    const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('File must contain a header row and at least one question.');

    const firstLine = lines[0];
    const delimiter = explicitDelimiter || (firstLine.includes('\t') ? '\t' : (firstLine.includes(';') && !firstLine.includes(',')) ? ';' : ',');

    const header = splitCsvLine(firstLine, delimiter).map(h => String(h || '').trim().toLowerCase());
    const findCol = (terms) => {
      for (let i = 0; i < header.length; i++) {
        const h = header[i];
        if (h && terms.some(t => String(h).toLowerCase().includes(t))) return i;
      }
      return -1;
    };

    const qTextCol = findCol(['question', 'text']);
    const qTypeCol = findCol(['type']);
    const optACol = findCol(['option a', 'opt a', 'option_a', 'a']);
    const optBCol = findCol(['option b', 'opt b', 'option_b', 'b']);
    const optCCol = findCol(['option c', 'opt c', 'option_c', 'c']);
    const optDCol = findCol(['option d', 'opt d', 'option_d', 'd']);
    const ansCol = findCol(['correct', 'answer', 'ans', 'key']);
    const expCol = findCol(['explanation', 'explain']);

    const questions = [];
    const seenTexts = new Set();

    for (let i = 1; i < lines.length; i++) {
      const row = splitCsvLine(lines[i], delimiter);
      if (row.length < 2) continue;

      const getVal = (idx, fallbackCol) => {
        const targetIdx = idx !== -1 ? idx : fallbackCol;
        if (targetIdx == null || targetIdx < 0 || targetIdx >= row.length) return '';
        return String(row[targetIdx] || '').trim();
      };

      const questionText = getVal(qTextCol, 0);
      if (!questionText) continue;

      let rawType = getVal(qTypeCol, -1);
      const optA = cleanOptionPrefix(getVal(optACol, 1));
      const optB = cleanOptionPrefix(getVal(optBCol, 2));
      const optC = cleanOptionPrefix(getVal(optCCol, 3));
      const optD = cleanOptionPrefix(getVal(optDCol, 4));
      let ans = getVal(ansCol, 5).toUpperCase();
      const exp = getVal(expCol, 6);

      ans = ans
        .replace(/\b1\b/g, 'A')
        .replace(/\b2\b/g, 'B')
        .replace(/\b3\b/g, 'C')
        .replace(/\b4\b/g, 'D')
        .replace(/[^A-D,]/g, '')
        .replace(/,+/g, ',');

      const isMulti = String(ans).includes(',') || String(rawType).toUpperCase().includes('MULTI');

      const validationErrors = [];
      if (!optA) validationErrors.push('Option A is required.');
      if (!optB) validationErrors.push('Option B is required.');
      if (!ans) validationErrors.push('Correct answer is required.');
      if (seenTexts.has(questionText.toLowerCase())) validationErrors.push('Duplicate question text detected.');
      seenTexts.add(questionText.toLowerCase());

      questions.push({
        id: `imp-${Date.now()}-${i}`,
        sourceRowOrPage: `Row ${i + 1}`,
        questionText,
        questionType: isMulti ? 'MULTI_SELECT' : 'SINGLE_CHOICE',
        optionA: optA || '',
        optionB: optB || '',
        optionC: optC || '',
        optionD: optD || '',
        correctAnswer: ans || '',
        explanation: exp || '',
        valid: validationErrors.length === 0,
        validationErrors
      });
    }

    if (questions.length === 0) throw new Error('No valid questions parsed from tabular data.');
    setParsedQuestions(questions);
  };

  const parseRawText = (text) => {
    if (!text || !text.trim()) throw new Error('Please enter question text to parse.');

    const rawLines = text.split(/\r?\n/);
    const n = rawLines.length;

    const QUESTION_HEADER_REGEX = /^(?:question\s*\d*[:.)\s-]|q\d*[:.)\s-]|\d+[:.)-])\s*(.*)$/i;
    const OPTION_REGEX = /^(?:\(([A-Da-d])\)|\[([A-Da-d])\]|(?:option\s*\(?([A-Da-d])\)?[:.)\s-]?)|([A-Da-d])[:.)-])(?:\s+(.*)|$)/i;
    const CORRECT_ANSWER_REGEX = /^(?:correct\s*answers?|answers?|ans\.?|key|correct)[\s:=-]+(.*)$/i;
    const EXPLANATION_REGEX = /^(?:explanations?|explain|notes?|rationale)[\s:=-]*(.*)$/i;

    // Step 1: Add all lines matching QUESTION_HEADER_REGEX
    const startIndicesSet = new Set();
    for (let i = 0; i < n; i++) {
      const line = rawLines[i].trim();
      if (QUESTION_HEADER_REGEX.test(line)) {
        startIndicesSet.add(i);
      }
    }

    // Step 2: Scan for Option A line indices to catch bare questions (Format E)
    const optionAIndices = [];
    for (let i = 0; i < n; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;
      const optMatch = line.match(OPTION_REGEX);
      if (optMatch) {
        const letter = (optMatch[1] || optMatch[2] || optMatch[3] || optMatch[4] || '').toUpperCase();
        if (letter === 'A') {
          optionAIndices.push(i);
        }
      }
    }

    // For any Option A that doesn't have an explicit question header preceding it,
    // discover the question start by scanning backwards from optAIdx - 1.
    for (const optAIdx of optionAIndices) {
      const existingHeaders = Array.from(startIndicesSet).filter(idx => idx <= optAIdx).sort((a, b) => a - b);
      const floorHeader = existingHeaders.length > 0 ? existingHeaders[existingHeaders.length - 1] : null;

      let prevEndedAfterHeader = false;
      if (floorHeader !== null) {
        for (let j = floorHeader + 1; j < optAIdx; j++) {
          const line = rawLines[j].trim();
          if (CORRECT_ANSWER_REGEX.test(line) || EXPLANATION_REGEX.test(line)) {
            prevEndedAfterHeader = true;
            break;
          }
        }
      }

      if (floorHeader === null || prevEndedAfterHeader) {
        const minIdx = floorHeader !== null ? floorHeader + 1 : 0;
        let firstNonBlank = -1;
        for (let j = optAIdx - 1; j >= minIdx; j--) {
          const line = rawLines[j].trim();
          if (!line) {
            if (firstNonBlank !== -1) break;
          } else if (CORRECT_ANSWER_REGEX.test(line) || EXPLANATION_REGEX.test(line)) {
            break;
          } else {
            firstNonBlank = j;
          }
        }
        if (firstNonBlank !== -1) {
          startIndicesSet.add(firstNonBlank);
        } else {
          startIndicesSet.add(optAIdx);
        }
      }
    }

    // Step 3: If no headers and no options found, fallback to first non-blank line
    if (startIndicesSet.size === 0) {
      for (let i = 0; i < n; i++) {
        if (rawLines[i].trim()) {
          startIndicesSet.add(i);
          break;
        }
      }
    }

    const startIndices = Array.from(startIndicesSet).sort((a, b) => a - b);

    const questions = [];
    const seenTexts = new Set();

    for (let i = 0; i < startIndices.length; i++) {
      const start = startIndices[i];
      const end = i + 1 < startIndices.length ? startIndices[i + 1] : n;
      const chunkLines = rawLines.slice(start, end);

      const qTextParts = [];
      let optA = '', optB = '', optC = '', optD = '';
      let rawAns = '';
      const expParts = [];

      let currentOption = '';
      let inAnswer = false;
      let inExplanation = false;
      let seenOptionA = false;

      for (const rawLine of chunkLines) {
        const line = rawLine.trim();
        if (!line) continue;

        const expMatch = line.match(EXPLANATION_REGEX);
        const ansMatch = line.match(CORRECT_ANSWER_REGEX);
        const optMatch = line.match(OPTION_REGEX);

        if (expMatch) {
          inExplanation = true;
          inAnswer = false;
          currentOption = '';
          const expContent = (expMatch[1] || '').trim();
          if (expContent) expParts.push(expContent);
        } else if (!inExplanation && ansMatch) {
          inAnswer = true;
          currentOption = '';
          const ansContent = (ansMatch[1] || '').trim();
          if (ansContent) rawAns = ansContent;
        } else if (!inExplanation && !inAnswer && optMatch) {
          const letter = (optMatch[1] || optMatch[2] || optMatch[3] || optMatch[4] || '').toUpperCase();
          const optVal = cleanOptionPrefix((optMatch[5] || '').trim());

          currentOption = letter;
          if (letter === 'A') {
            optA = optVal;
            seenOptionA = true;
          } else if (letter === 'B') optB = optVal;
          else if (letter === 'C') optC = optVal;
          else if (letter === 'D') optD = optVal;
        } else if (inExplanation) {
          expParts.push(line);
        } else if (inAnswer && !rawAns) {
          rawAns = line;
        } else if (currentOption) {
          const continuation = cleanOptionPrefix(line);
          if (currentOption === 'A') optA = optA ? `${optA} ${continuation}` : continuation;
          else if (currentOption === 'B') optB = optB ? `${optB} ${continuation}` : continuation;
          else if (currentOption === 'C') optC = optC ? `${optC} ${continuation}` : continuation;
          else if (currentOption === 'D') optD = optD ? `${optD} ${continuation}` : continuation;
        } else if (!seenOptionA) {
          const qHeader = line.match(QUESTION_HEADER_REGEX);
          const textToAdd = qHeader ? (qHeader[1] || '').trim() : line;
          if (textToAdd) qTextParts.push(textToAdd);
        }
      }

      const questionText = qTextParts.join('\n').trim();
      const explanation = expParts.join('\n').trim();

      if (!questionText && !optA && !optB && !rawAns) continue;

      const normalizedAns = normalizeAnswers(rawAns, optA, optB, optC, optD);
      const isMulti = normalizedAns.includes(',') || rawAns.toLowerCase().includes('all') || normalizedAns.length > 1;

      const validationErrors = [];
      if (!questionText) validationErrors.push('Question text is required.');
      else {
        if (seenTexts.has(questionText.toLowerCase())) validationErrors.push('Duplicate question text detected.');
        seenTexts.add(questionText.toLowerCase());
      }
      if (!optA) validationErrors.push('Option A is required.');
      if (!optB) validationErrors.push('Option B is required.');
      if (!normalizedAns) validationErrors.push('At least one correct answer must be configured.');

      questions.push({
        id: `imp-${Date.now()}-${i}`,
        sourceRowOrPage: `Question ${questions.length + 1}`,
        questionText,
        questionType: isMulti ? 'MULTI_SELECT' : 'SINGLE_CHOICE',
        optionA: optA || '',
        optionB: optB || '',
        optionC: optC || '',
        optionD: optD || '',
        correctAnswer: normalizedAns || '',
        explanation: explanation || '',
        valid: validationErrors.length === 0,
        validationErrors
      });
    }

    if (questions.length === 0) throw new Error('Could not identify any questions. Check format or use the sample template.');
    setParsedQuestions(questions);
  };

  const handleParsePasted = async () => {
    setParseError('');
    setIsProcessing(true);

    try {
      const token = getAuthToken();
      if (token && pastedText.trim()) {
        try {
          const response = await fetch(`${API_BASE_URL}/quizzes/bulk-import/parse-text`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ text: pastedText })
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data?.questions) && data.questions.length > 0) {
              setParsedQuestions(data.questions);
              setActiveTab('preview');
              return;
            }
          }
        } catch (serverErr) {
          console.warn('Backend text parser unavailable, using client-side:', serverErr);
        }
      }

      // Local fallback
      const trimmed = pastedText.trim();
      if (trimmed.includes('\t')) {
        parseCsvText(trimmed, '\t');
      } else if (trimmed.split(/\r?\n/)[0]?.includes(',')) {
        parseCsvText(trimmed, ',');
      } else {
        parseRawText(trimmed);
      }
      setActiveTab('preview');
    } catch (err) {
      setParseError(err?.message || 'Failed to parse text.');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- QUESTION ROW EDITING ---
  const updateParsedQuestion = (index, updates) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      const updated = { ...next[index], ...updates };

      // Re-validate row on manual edit
      const errors = [];
      if (!updated.questionText?.trim()) errors.push('Question text is required.');
      if (!updated.optionA?.trim()) errors.push('Option A is required.');
      if (!updated.optionB?.trim()) errors.push('Option B is required.');
      if (!updated.correctAnswer?.trim()) errors.push('Correct answer is required.');
      else {
        const parts = updated.correctAnswer.split(',');
        for (const p of parts) {
          const l = p.trim().toUpperCase();
          if (l === 'A' && !updated.optionA?.trim()) errors.push("Correct answer references empty Option A.");
          if (l === 'B' && !updated.optionB?.trim()) errors.push("Correct answer references empty Option B.");
          if (l === 'C' && !updated.optionC?.trim()) errors.push("Correct answer references empty Option C.");
          if (l === 'D' && !updated.optionD?.trim()) errors.push("Correct answer references empty Option D.");
        }
      }

      updated.valid = errors.length === 0;
      updated.validationErrors = errors;
      next[index] = updated;
      return next;
    });
  };

  const removeParsedQuestion = (index) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const moveQuestionUp = (index) => {
    if (index <= 0) return;
    setParsedQuestions(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const moveQuestionDown = (index) => {
    setParsedQuestions(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const addNewBlankQuestion = () => {
    setParsedQuestions(prev => [
      ...prev,
      {
        id: `imp-manual-${Date.now()}`,
        sourceRowOrPage: 'Manual Entry',
        questionText: '',
        questionType: 'SINGLE_CHOICE',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 'A',
        explanation: '',
        valid: false,
        validationErrors: ['Question text is required.', 'Option A is required.', 'Option B is required.']
      }
    ]);
  };

  // --- FINAL CONFIRMATION & IMPORT ---
  const handleFinalImport = () => {
    if (isSubmitting) return;

    // Filter valid questions
    const validQuestions = parsedQuestions.filter(q => q.valid);
    if (validQuestions.length === 0) {
      setParseError('No valid questions to import. Please correct parsing errors first.');
      return;
    }

    setIsSubmitting(true);
    try {
      onImportQuestions(validQuestions, importMode);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedQuestions.filter(q => q.valid).length;
  const invalidCount = parsedQuestions.length - validCount;

  return (
    <div className="modal-overlay" style={{ zIndex: 11000 }}>
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: 1040,
          width: 'min(1040px, 96vw)',
          padding: 0,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ background: '#0f172a', padding: '1.1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Bulk Question Authoring
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800 }}>
              Import Questions into {targetTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.45rem', borderRadius: '50%', color: '#fff', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 1rem' }}>
          <button
            type="button"
            onClick={() => { setParseError(''); setActiveTab('upload'); }}
            style={{
              padding: '0.75rem 1.1rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'upload' ? 800 : 600,
              color: activeTab === 'upload' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'upload' ? '2px solid #0284c7' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7
            }}
          >
            <Upload size={15} /> Upload File (.xlsx, .csv, .pdf, .docx, .txt)
          </button>
          <button
            type="button"
            onClick={() => { setParseError(''); setActiveTab('paste'); }}
            style={{
              padding: '0.75rem 1.1rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'paste' ? 800 : 600,
              color: activeTab === 'paste' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'paste' ? '2px solid #0284c7' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7
            }}
          >
            <Edit3 size={15} /> Paste Text
          </button>
          <button
            type="button"
            onClick={() => { setParseError(''); setActiveTab('preview'); }}
            style={{
              padding: '0.75rem 1.1rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'preview' ? 800 : 600,
              color: activeTab === 'preview' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'preview' ? '2px solid #0284c7' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7
            }}
          >
            <CheckCircle2 size={15} />
            Review & Validate ({parsedQuestions.length})
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '1.2rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {parseError && (
            <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 10, borderRadius: 8, fontSize: '0.85rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{parseError}</span>
            </div>
          )}

          {/* TAB 1: UPLOAD FILE */}
          {activeTab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Template Download Banner */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <strong style={{ color: '#0369a1', fontSize: '0.9rem' }}>Download Pre-Formatted Question Template</strong>
                  <div style={{ color: '#0284c7', fontSize: '0.78rem', marginTop: 2 }}>
                    Includes sample Single Choice and Multiple Answer questions with correct formatting.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={downloadSampleExcel}
                    style={{ background: '#fff', border: '1px solid #0284c7', color: '#0284c7', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={13} /> Excel Template (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    style={{ background: '#fff', border: '1px solid #64748b', color: '#475569', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={13} /> CSV Template (.csv)
                  </button>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                style={{
                  border: '2px dashed #94a3b8',
                  borderRadius: 10,
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: isProcessing ? 'wait' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10
                }}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
              >
                <FileSpreadsheet size={36} color="#0284c7" />
                <div>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                    {isProcessing ? 'Parsing questions with deterministic extraction…' : 'Click to upload your question document'}
                  </strong>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                    Supported formats: <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV (.csv)</strong>, <strong>PDF (.pdf)</strong>, <strong>Word (.docx)</strong>, or <strong>Text (.txt)</strong>
                  </p>
                </div>
                {fileName && (
                  <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700 }}>
                    Selected file: {fileName}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
              </div>

              {parsedQuestions.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    Proceed to Review ({parsedQuestions.length} Questions) <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeTab === 'paste' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: '#475569', fontSize: '0.84rem' }}>
                Paste questions in plain text or numbered format. The parser automatically detects question text, options A-D, and single/multiple correct answers:
              </div>
              <textarea
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 220,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  resize: 'vertical'
                }}
                placeholder={`Question 1: What does FCL stand for?
A. Full Container Load
B. Freight Cargo Logistics
C. Forward Container Line
D. Full Cargo Logistics
Correct Answer: A
Explanation: FCL refers to Full Container Load.

Question 2: Which documents are used in import operations?
A. Bill of Lading
B. Commercial Invoice
C. Packing List
D. Personal ID Card
Correct Answers: A, B, C
Explanation: These are commonly used import documentation records.`}
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  if (parseError) setParseError('');
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleParsePasted}
                  disabled={!pastedText.trim() || isProcessing}
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: pastedText.trim() && !isProcessing ? 'pointer' : 'not-allowed',
                    opacity: pastedText.trim() && !isProcessing ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isProcessing ? 'Parsing...' : 'Parse Questions'} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: REVIEW & VALIDATE */}
          {activeTab === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Summary Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Detected: </span>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{parsedQuestions.length}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Valid: </span>
                    <strong style={{ fontSize: '0.9rem', color: '#16a34a' }}>{validCount}</strong>
                  </div>
                  {invalidCount > 0 && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Needs Review: </span>
                      <strong style={{ fontSize: '0.9rem', color: '#d97706' }}>{invalidCount}</strong>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addNewBlankQuestion}
                  style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Plus size={13} /> Add Question
                </button>
              </div>

              {parsedQuestions.length === 0 ? (
                <div style={{ padding: '24px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, textAlign: 'center', color: '#64748b', fontSize: '0.86rem' }}>
                  No questions parsed yet. Upload a file or paste text in the tabs above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '420px', overflowY: 'auto' }}>
                  {parsedQuestions.map((q, idx) => {
                    const isMulti = q.questionType === 'MULTI_SELECT';
                    const selectedAnswers = String(q.correctAnswer || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

                    return (
                      <div
                        key={q.id || idx}
                        style={{
                          background: '#fff',
                          border: q.valid ? '1px solid #e2e8f0' : '1px solid #fcd34d',
                          borderRadius: 8,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          boxShadow: q.valid ? 'none' : '0 1px 3px rgba(217, 119, 6, 0.08)'
                        }}
                      >
                        {/* Question Header & Controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0284c7' }}>#{idx + 1}</span>
                            {q.sourceRowOrPage && (
                              <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600 }}>
                                {q.sourceRowOrPage}
                              </span>
                            )}
                            {q.valid ? (
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Check size={11} /> Valid
                              </span>
                            ) : (
                              <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <AlertTriangle size={11} /> Needs Review
                              </span>
                            )}
                            <select
                              value={q.questionType}
                              onChange={(e) => {
                                const newType = e.target.value;
                                const updates = { questionType: newType };
                                if (newType === 'SINGLE_CHOICE') {
                                  const first = String(q.correctAnswer || '').split(',')[0].trim().toUpperCase();
                                  updates.correctAnswer = ['A', 'B', 'C', 'D'].includes(first) ? first : '';
                                } else if (newType === 'MULTI_SELECT' && !String(q.correctAnswer || '').includes(',')) {
                                  updates.correctAnswer = q.correctAnswer || '';
                                }
                                updateParsedQuestion(idx, updates);
                              }}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 5,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                border: '1px solid #cbd5e1',
                                background: isMulti ? '#fdf4ff' : '#f0f9ff',
                                color: isMulti ? '#86198f' : '#0369a1'
                              }}
                            >
                              <option value="SINGLE_CHOICE">Single Choice (1 answer)</option>
                              <option value="MULTI_SELECT">Multiple Answers (Select all that apply)</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => moveQuestionUp(idx)}
                              disabled={idx === 0}
                              style={{ background: 'transparent', border: 'none', color: idx === 0 ? '#cbd5e1' : '#64748b', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: 4 }}
                              aria-label={`Move question ${idx + 1} up`}
                              title="Move question up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestionDown(idx)}
                              disabled={idx === parsedQuestions.length - 1}
                              style={{ background: 'transparent', border: 'none', color: idx === parsedQuestions.length - 1 ? '#cbd5e1' : '#64748b', cursor: idx === parsedQuestions.length - 1 ? 'not-allowed' : 'pointer', padding: 4 }}
                              aria-label={`Move question ${idx + 1} down`}
                              title="Move question down"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeParsedQuestion(idx)}
                              style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}
                              aria-label={`Remove question ${idx + 1}`}
                              title="Delete question"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Validation Errors Box */}
                        {Array.isArray(q.validationErrors) && q.validationErrors.length > 0 && (
                          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '6px 10px', borderRadius: 6, fontSize: '0.78rem' }}>
                            {q.validationErrors.map((err, errIdx) => (
                              <div key={errIdx} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                • {err}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Question Text */}
                        <input
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                          value={q.questionText}
                          onChange={(e) => updateParsedQuestion(idx, { questionText: e.target.value })}
                          placeholder="Enter question text..."
                        />

                        {/* Options Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                          {['A', 'B', 'C', 'D'].map(letter => (
                            <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', minWidth: 16 }}>{letter}</span>
                              <input
                                style={{
                                  flex: 1,
                                  padding: '5px 8px',
                                  borderRadius: 5,
                                  border: '1px solid #e2e8f0',
                                  fontSize: '0.8rem'
                                }}
                                value={q[`option${letter}`] || ''}
                                onChange={(e) => updateParsedQuestion(idx, { [`option${letter}`]: cleanOptionPrefix(e.target.value) })}
                                placeholder={`Option ${letter}${letter === 'C' || letter === 'D' ? ' (optional)' : ''}`}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Correct Answer & Explanation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Correct:</span>
                            {isMulti ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                {['A', 'B', 'C', 'D'].map(letter => {
                                  const checked = Array.isArray(selectedAnswers) && selectedAnswers.includes(letter);
                                  return (
                                    <label key={letter} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', cursor: 'pointer', fontWeight: checked ? 800 : 500, color: checked ? '#86198f' : '#475569' }}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          let next = checked ? selectedAnswers.filter(l => l !== letter) : [...selectedAnswers, letter].sort();
                                          updateParsedQuestion(idx, { correctAnswer: next.join(',') });
                                        }}
                                      />
                                      {letter}
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <select
                                value={q.correctAnswer || ''}
                                onChange={(e) => updateParsedQuestion(idx, { correctAnswer: e.target.value })}
                                style={{ padding: '3px 8px', borderRadius: 4, fontSize: '0.78rem', border: '1px solid #cbd5e1' }}
                              >
                                <option value="">-- Select Answer --</option>
                                {['A', 'B', 'C', 'D'].map(l => (
                                  <option key={l} value={l}>Option {l}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <input
                            style={{ flex: 1, minWidth: 200, padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: '0.78rem' }}
                            value={q.explanation || ''}
                            onChange={(e) => updateParsedQuestion(idx, { explanation: e.target.value })}
                            placeholder="Optional answer explanation..."
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Import Options */}
              {parsedQuestions.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Import Action:</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                      />
                      Append to existing quiz
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                      />
                      Replace existing questions
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinalImport}
                    disabled={isSubmitting || validCount === 0}
                    style={{
                      background: validCount > 0 ? '#16a34a' : '#94a3b8',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: validCount > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
                      opacity: isSubmitting ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    Confirm & Import {validCount} Valid Question{validCount !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: '0.75rem 1.4rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '6px 14px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
