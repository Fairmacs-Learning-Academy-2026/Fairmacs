import ExcelJS from 'exceljs';

const NAVY = 'FF0F2B48';
const LIGHT = 'FFEAF2FB';
const BORDER = { style: 'thin', color: { argb: 'FFD5DEE9' } };
const PCT = '0.0%';
const DATE = 'dd-mmm-yyyy';

const STATUS_LABELS = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
};

const TYPE_LABELS = {
  MANDATORY: 'Mandatory',
  RECOMMENDED: 'Recommended',
  SELF_SELECTED: 'Self selected',
};

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** The API sends percentages as 0-100; Excel wants a fraction so the % format works. */
const pct = (value) => (value === null || value === undefined || value === '' ? null : num(value) / 100);

const toDate = (value) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const label = (map, value) => map[value] || (value ? String(value) : '');

function styleHeader(row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
  });
}

/**
 * Adds a formatted table sheet: header row, frozen header, filters, borders.
 * columns: [{ header, key, width, format }]
 */
function addTableSheet(workbook, name, columns, rows, { totalsRow = null } = {}) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 16 }));
  styleHeader(sheet.getRow(1));

  rows.forEach((data) => {
    const row = sheet.addRow(data);
    columns.forEach((c, index) => {
      const cell = row.getCell(index + 1);
      if (c.format) cell.numFmt = c.format;
      if (c.align) cell.alignment = { horizontal: c.align, vertical: 'middle' };
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
    });
  });

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  }

  if (totalsRow && rows.length > 0) {
    // header = row 1, data = rows 2..n+1, totals = row n+2
    const row = sheet.addRow(totalsRow(sheet, rows.length + 2));
    row.font = { bold: true };
    row.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
      const c = columns[colNumber - 1];
      if (c && c.format) cell.numFmt = c.format;
    });
  }

  if (rows.length === 0) {
    const row = sheet.addRow(['No data for the selected filters.']);
    row.font = { italic: true, color: { argb: 'FF64748B' } };
  }
  return sheet;
}

function describeFilters(report) {
  const f = report.filters;
  if (!f) return [];
  const courseOption = (report.filterOptions?.courses || []).find((c) => String(c.id) === String(f.courseId));
  return [
    ['Department', f.department && f.department !== 'ALL' ? f.department : 'All departments'],
    ['Course', f.courseId ? courseOption?.title || `Course #${f.courseId}` : 'All courses'],
    ['Employees', f.employeeStatus === 'ALL' ? 'Including inactive / terminated' : 'Current employees only'],
    ['Assignment type', f.enrollmentType && f.enrollmentType !== 'ALL' ? label(TYPE_LABELS, f.enrollmentType) : 'All types'],
    ['Assigned from', f.from || 'Any date'],
    ['Assigned to', f.to || 'Any date'],
  ];
}

/**
 * Builds the HR / trainer training report workbook.
 * Sheets: Summary, Departments, Employees, Courses and (HR) Assignments.
 */
export function buildTrainingReportWorkbook(report, { title = 'HR TRAINING REPORT' } = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fairmacs Learning Academy';
  workbook.created = new Date();

  // ------------------------------------------------------------------ Summary
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [{ width: 34 }, { width: 22 }, { width: 90 }];

  const titleRow = summary.addRow([`FAIRMACS LEARNING ACADEMY - ${title}`]);
  titleRow.font = { bold: true, size: 16, color: { argb: NAVY } };
  summary.mergeCells(`A${titleRow.number}:C${titleRow.number}`);
  summary.addRow(['Generated on', report.generatedAt ? new Date(report.generatedAt) : new Date()]).getCell(2).numFmt =
    'dd-mmm-yyyy hh:mm';
  summary.addRow([]);

  const filterRows = describeFilters(report);
  if (filterRows.length > 0) {
    const head = summary.addRow(['FILTERS APPLIED']);
    head.font = { bold: true, color: { argb: NAVY } };
    filterRows.forEach((r) => summary.addRow(r));
    if (report.excludedInactiveEmployees > 0) {
      summary.addRow(['Inactive / terminated employees excluded', report.excludedInactiveEmployees]);
    }
    summary.addRow([]);
  }

  const definitionFor = (metric) =>
    (report.definitions || []).find((d) => d.metric === metric)?.definition || '';

  const metricHead = summary.addRow(['Metric', 'Value', 'How it is calculated']);
  styleHeader(metricHead);

  const metrics = [
    ['Total employees', num(report.totalEmployees), null, 'Total employees'],
    ['Active employees', num(report.activeEmployees), null, 'Active employees'],
    ['Training assignments', num(report.totalAssignments), null, 'Training assignments'],
    ['Completed', num(report.completedAssignments), null, ''],
    ['In progress', num(report.inProgressAssignments), null, ''],
    ['Not started', num(report.notStartedAssignments), null, ''],
    ['Overdue training', num(report.overdueAssignments), null, 'Overdue training'],
    ['Completion rate', pct(report.completionRateExact ?? report.completionRate), PCT, 'Completion rate'],
    ['Mandatory assignments', num(report.mandatoryAssignments), null, ''],
    ['Mandatory completed', num(report.mandatoryCompleted), null, ''],
    ['Mandatory compliance', pct(report.mandatoryComplianceRate), PCT, 'Mandatory compliance'],
    ['Average progress', pct(report.averageProgress), PCT, 'Average progress'],
    ['Average score', pct(report.averageScore), PCT, 'Average score'],
    ['Certificates issued', num(report.certificatesIssued), null, 'Certificates issued'],
    ['Published courses', num(report.publishedCourses), null, ''],
  ];
  metrics.forEach(([name, value, format, definitionKey]) => {
    const row = summary.addRow([name, value, definitionKey ? definitionFor(definitionKey) : '']);
    if (format) row.getCell(2).numFmt = format;
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
    row.eachCell((cell) => {
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
    });
  });

  // -------------------------------------------------------------- Departments
  const departments = (report.departmentReports || []).map((d) => ({
    department: d.department || '-',
    employees: num(d.employeeCount),
    assignments: num(d.totalAssignments),
    completed: num(d.completedAssignments),
    completion: pct(d.completionRate),
    overdue: num(d.overdueAssignments),
    mandatory: num(d.mandatoryAssignments),
    mandatoryDone: num(d.mandatoryCompleted),
    compliance: pct(d.mandatoryComplianceRate),
  }));

  addTableSheet(
    workbook,
    'Departments',
    [
      { header: 'Department', key: 'department', width: 34 },
      { header: 'Employees', key: 'employees', width: 12, align: 'right' },
      { header: 'Assignments', key: 'assignments', width: 14, align: 'right' },
      { header: 'Completed', key: 'completed', width: 12, align: 'right' },
      { header: 'Completion rate', key: 'completion', width: 16, format: PCT, align: 'right' },
      { header: 'Overdue', key: 'overdue', width: 11, align: 'right' },
      { header: 'Mandatory assignments', key: 'mandatory', width: 22, align: 'right' },
      { header: 'Mandatory completed', key: 'mandatoryDone', width: 21, align: 'right' },
      { header: 'Mandatory compliance', key: 'compliance', width: 22, format: PCT, align: 'right' },
    ],
    departments,
    {
      totalsRow: (sheet, last) => [
        'ALL DEPARTMENTS',
        { formula: `SUM(B2:B${last - 1})` },
        { formula: `SUM(C2:C${last - 1})` },
        { formula: `SUM(D2:D${last - 1})` },
        { formula: `IF(C${last}=0,0,D${last}/C${last})` },
        { formula: `SUM(F2:F${last - 1})` },
        { formula: `SUM(G2:G${last - 1})` },
        { formula: `SUM(H2:H${last - 1})` },
        { formula: `IF(G${last}=0,0,H${last}/G${last})` },
      ],
    }
  );

  // ---------------------------------------------------------------- Employees
  addTableSheet(
    workbook,
    'Employees',
    [
      { header: 'Employee ID', key: 'employeeId', width: 14 },
      { header: 'Name', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Designation', key: 'designation', width: 24 },
      { header: 'Department', key: 'department', width: 28 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Assigned courses', key: 'assigned', width: 16, align: 'right' },
      { header: 'Completed', key: 'completed', width: 12, align: 'right' },
      { header: 'In progress', key: 'inProgress', width: 12, align: 'right' },
      { header: 'Not started', key: 'notStarted', width: 12, align: 'right' },
      { header: 'Overdue', key: 'overdue', width: 10, align: 'right' },
      { header: 'Average progress', key: 'progress', width: 17, format: PCT, align: 'right' },
      { header: 'Average score', key: 'score', width: 14, format: PCT, align: 'right' },
      { header: 'Mandatory courses', key: 'mandatory', width: 18, align: 'right' },
      { header: 'Mandatory completed', key: 'mandatoryDone', width: 20, align: 'right' },
    ],
    (report.employeeReports || []).map((e) => ({
      employeeId: e.employeeId || '',
      name: e.name || '',
      email: e.email || '',
      designation: e.designation || '',
      department: e.department || '',
      status: e.status || '',
      assigned: num(e.assignedCourses),
      completed: num(e.completedCourses),
      inProgress: num(e.inProgressCourses),
      notStarted: num(e.notStartedCourses),
      overdue: num(e.overdueCourses),
      progress: pct(e.averageProgress),
      score: pct(e.averageScore),
      mandatory: num(e.mandatoryCourses),
      mandatoryDone: num(e.mandatoryCompleted),
    }))
  );

  // ------------------------------------------------------------------ Courses
  addTableSheet(
    workbook,
    'Courses',
    [
      { header: 'Course code', key: 'code', width: 14 },
      { header: 'Course', key: 'title', width: 44 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Owning department', key: 'department', width: 24 },
      { header: 'Published on', key: 'publishedAt', width: 14, format: DATE },
      { header: 'Assigned', key: 'assigned', width: 11, align: 'right' },
      { header: 'Completed', key: 'completed', width: 11, align: 'right' },
      { header: 'In progress', key: 'inProgress', width: 12, align: 'right' },
      { header: 'Not started', key: 'notStarted', width: 12, align: 'right' },
      { header: 'Overdue', key: 'overdue', width: 10, align: 'right' },
      { header: 'Completion rate', key: 'completion', width: 16, format: PCT, align: 'right' },
      { header: 'Average progress', key: 'progress', width: 17, format: PCT, align: 'right' },
      { header: 'Average score', key: 'score', width: 14, format: PCT, align: 'right' },
      { header: 'Mandatory assigned', key: 'mandatory', width: 19, align: 'right' },
      { header: 'Mandatory completed', key: 'mandatoryDone', width: 20, align: 'right' },
      { header: 'Mandatory compliance', key: 'compliance', width: 21, format: PCT, align: 'right' },
      { header: 'Certificates', key: 'certificates', width: 13, align: 'right' },
    ],
    (report.courseReports || report.courseBreakdown || []).map((c) => ({
      code: c.courseId || '',
      title: c.title || '',
      category: c.category || '',
      department: c.department || '',
      publishedAt: toDate(c.publishedAt),
      assigned: num(c.totalAssignments ?? c.enrolledCount),
      completed: num(c.completedAssignments ?? c.completedCount),
      inProgress: num(c.inProgressAssignments ?? c.inProgressCount),
      notStarted: num(c.notStartedAssignments ?? c.notStartedCount),
      overdue: num(c.overdueAssignments ?? c.overdueCount),
      completion: pct(c.completionRateExact ?? c.completionRate),
      progress: pct(c.averageProgress),
      score: pct(c.averageScore),
      mandatory: num(c.mandatoryAssignments),
      mandatoryDone: num(c.mandatoryCompleted),
      compliance: pct(c.mandatoryComplianceRate),
      certificates: num(c.certificatesIssued),
    }))
  );

  // -------------------------------------------------------------- Assignments
  if (Array.isArray(report.assignmentDetails)) {
    addTableSheet(
      workbook,
      'Assignments',
      [
        { header: 'Employee ID', key: 'employeeId', width: 14 },
        { header: 'Employee', key: 'employee', width: 26 },
        { header: 'Department', key: 'department', width: 26 },
        { header: 'Designation', key: 'designation', width: 24 },
        { header: 'Branch', key: 'branch', width: 18 },
        { header: 'Course code', key: 'code', width: 14 },
        { header: 'Course', key: 'course', width: 42 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Type', key: 'type', width: 14 },
        { header: 'Status', key: 'status', width: 13 },
        { header: 'Progress', key: 'progress', width: 11, format: PCT, align: 'right' },
        { header: 'Score', key: 'score', width: 10, format: PCT, align: 'right' },
        { header: 'Assigned on', key: 'assigned', width: 13, format: DATE },
        { header: 'Due date', key: 'due', width: 13, format: DATE },
        { header: 'Completed on', key: 'completedOn', width: 14, format: DATE },
        { header: 'Overdue', key: 'overdue', width: 10 },
        { header: 'Days overdue', key: 'daysOverdue', width: 13, align: 'right' },
        { header: 'Certificate ID', key: 'certificate', width: 20 },
      ],
      report.assignmentDetails.map((a) => ({
        employeeId: a.employeeId || '',
        employee: a.employeeName || '',
        department: a.department || '',
        designation: a.designation || '',
        branch: a.branch || '',
        code: a.courseCode || '',
        course: a.courseTitle || '',
        category: a.courseCategory || '',
        type: label(TYPE_LABELS, a.enrollmentType),
        status: label(STATUS_LABELS, a.status),
        progress: pct(a.progressPercent),
        score: a.score === null || a.score === undefined ? null : pct(a.score),
        assigned: toDate(a.assignedDate),
        due: toDate(a.dueDate),
        completedOn: toDate(a.completedDate),
        overdue: a.overdue ? 'Yes' : 'No',
        daysOverdue: a.overdue ? num(a.daysOverdue) : null,
        certificate: a.certificateId || '',
      }))
    );
  }

  return workbook;
}
