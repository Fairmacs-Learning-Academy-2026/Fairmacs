import React, { useEffect, useMemo, useState } from 'react';



import {

  Users,

  CheckCircle2,

  ShieldCheck,

  AlertCircle,

  BarChart3,

  FileText,

  Award,

  Download,

  Loader2,

  AlertTriangle,

  X,

  BookOpen,

  CalendarDays,

  Clock3,

  Trophy

} from 'lucide-react';

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useAuth } from '../context/AuthContext';



const API_BASE_URL =

  import.meta.env.VITE_API_BASE_URL ||

  'http://localhost:8080/api';



const ReportsView = ({ currentRole }) => {

  const { user, token } = useAuth();



  const rawRole =

    currentRole ||

    user?.role ||

    user?.roleLabel ||

    '';



  const role = String(rawRole)

    .trim()

    .toUpperCase()

    .replace(/^ROLE_/, '')

    .replace(/[\s/-]+/g, '_');



  const isManager = role.includes('MANAGER');
  const isHR = role === 'HR_ADMIN' || role === 'ADMIN';



  // ============================================================

  // MANAGER REPORT

  // ============================================================



  const [report, setReport] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [hrReport, setHrReport] = useState(null);
  const [hrLoading, setHrLoading] = useState(false);
  const [hrError, setHrError] = useState('');



  // ============================================================

  // EMPLOYEE TRANSCRIPT

  // ============================================================



  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [transcript, setTranscript] = useState(null);

  const [transcriptLoading, setTranscriptLoading] = useState(false);

  const [transcriptError, setTranscriptError] = useState('');



  // ============================================================

  // LOAD MANAGER REPORT

  // ============================================================



  useEffect(() => {

    if (!isManager || !user?.id || !token) {

      return;

    }



    const loadManagerReport = async () => {

      setLoading(true);

      setError('');



      try {

        const response = await fetch(

          `${API_BASE_URL}/manager/reports/${user.id}`,

          {

            method: 'GET',

            headers: {

              Authorization: `Bearer ${token}`,

              Accept: 'application/json'

            }

          }

        );



        if (!response.ok) {

          const text = await response.text();



          throw new Error(

            text ||

              `Failed to load manager reports (${response.status})`

          );

        }



        const data = await response.json();



        setReport(data);

      } catch (err) {

        console.error('Manager reports error:', err);



        setError(

          err.message ||

            'Unable to load manager reports.'

        );

      } finally {

        setLoading(false);

      }

    };



    loadManagerReport();

  }, [isManager, user?.id, token]);


  // ============================================================
  // LOAD HR REPORT
  // ============================================================

  useEffect(() => {
    if (!isHR || !token) return;

    const loadHrReport = async () => {
      setHrLoading(true);
      setHrError('');

      try {
        const response = await fetch(
          `${API_BASE_URL}/hr/reports/training`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load HR reports (${response.status})`
          );
        }

        setHrReport(await response.json());
      } catch (err) {
        console.error('HR reports error:', err);
        setHrError(
          err.message || 'Unable to load HR reports.'
        );
      } finally {
        setHrLoading(false);
      }
    };

    loadHrReport();
  }, [isHR, token]);



const downloadExcelWorkbook = async (workbook, fileName) => {
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
};


const safeFilePart = (value, fallback = 'Report') =>
  String(value || fallback).replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_') || fallback;

const formatReportDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const downloadPdfDocument = (doc, fileName) => doc.save(fileName);

const createPdfDocument = (title, subtitle = '') => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(18);
  doc.setTextColor(23, 32, 51);
  doc.text('FAIRMACS LMS', 14, 15);
  doc.setFontSize(13);
  doc.text(title, 14, 23);
  if (subtitle) {
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 29);
  }
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 283, 15, { align: 'right' });
  return doc;
};

const addPdfTable = (doc, head, body, startY = 35) => {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [51, 65, 85] },
    headStyles: { fillColor: [7, 152, 209], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });
};

const exportManagerTeamReportToExcel = async () => {
  if (!report) return alert('Team report data is not available.');
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Team Report');
    sheet.addRows([
      ['FAIRMACS LMS - TEAM TRAINING REPORT'], [],
      ['Generated On', new Date().toLocaleString('en-IN')],
      ['Team Members', report.teamMembers ?? 0],
      ['Training Completion', `${report.overallCompletion ?? 0}%`],
      ['Mandatory Compliance', `${report.mandatoryCompliance ?? 0}%`],
      ['Assessment Performance', `${report.assessmentPerformance ?? 0}%`],
      ['Action Needed', actionNeededCount], [], ['TEAM MEMBERS'],
      ['Employee ID', 'Employee Name', 'Assigned', 'Completed', 'Progress', 'Status']
    ]);
    teamMembers.forEach((member) => sheet.addRow([
      member.employeeId || '—', member.name || '—', member.assigned ?? 0,
      member.completed ?? 0, `${Number(member.progress) || 0}%`, member.status || '—'
    ]));
    sheet.columns.forEach((column) => { column.width = 22; });
    sheet.getColumn(1).width = 18; sheet.getColumn(2).width = 28; sheet.getColumn(6).width = 22;
    await downloadExcelWorkbook(workbook, `Fairmacs_Team_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (err) {
    console.error('Team report Excel export error:', err);
    alert(err.message || 'Unable to export team report.');
  }
};

const exportManagerTeamReportToPdf = async () => {
  if (!report) return alert('Team report data is not available.');
  try {
    const doc = createPdfDocument('Team Training Report', 'Manager team training progress, compliance, and performance');
    addPdfTable(doc, ['Metric', 'Value'], [
      ['Team Members', report.teamMembers ?? 0],
      ['Training Completion', `${report.overallCompletion ?? 0}%`],
      ['Mandatory Compliance', `${report.mandatoryCompliance ?? 0}%`],
      ['Assessment Performance', `${report.assessmentPerformance ?? 0}%`],
      ['Action Needed', actionNeededCount]
    ]);
    addPdfTable(doc, ['Employee ID', 'Employee', 'Assigned', 'Completed', 'Progress', 'Status'], teamMembers.map((member) => [
      member.employeeId || '—', member.name || '—', member.assigned ?? 0, member.completed ?? 0,
      `${Number(member.progress) || 0}%`, member.status || '—'
    ]), doc.lastAutoTable.finalY + 8);
    downloadPdfDocument(doc, `Fairmacs_Team_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Team report PDF export error:', err);
    alert(err.message || 'Unable to export team report PDF.');
  }
};

const exportManagerComplianceToExcel = async () => {
  if (!report) return alert('Team compliance data is not available.');
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Compliance Summary');
    sheet.addRows([
      ['FAIRMACS LMS - TEAM COMPLIANCE SUMMARY'], [],
      ['Generated On', new Date().toLocaleString('en-IN')],
      ['Overall Completion', `${report.overallCompletion ?? 0}%`],
      ['Mandatory Compliance', `${report.mandatoryCompliance ?? 0}%`],
      ['Assessment Performance', `${report.assessmentPerformance ?? 0}%`],
      ['Employees Requiring Attention', actionNeededCount], [], ['EMPLOYEE COMPLIANCE'],
      ['Employee ID', 'Employee Name', 'Assigned', 'Completed', 'Progress', 'Status']
    ]);
    teamMembers.forEach((member) => sheet.addRow([
      member.employeeId || '—', member.name || '—', member.assigned ?? 0,
      member.completed ?? 0, `${Number(member.progress) || 0}%`, member.status || '—'
    ]));
    sheet.columns.forEach((column) => { column.width = 22; });
    sheet.getColumn(2).width = 28; sheet.getColumn(6).width = 22;
    await downloadExcelWorkbook(workbook, `Fairmacs_Team_Compliance_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (err) {
    console.error('Team compliance Excel export error:', err);
    alert(err.message || 'Unable to export team compliance report.');
  }
};

const exportManagerComplianceToPdf = async () => {
  if (!report) return alert('Team compliance data is not available.');
  try {
    const doc = createPdfDocument('Team Compliance Summary', 'Mandatory training health and employee-wise compliance');
    addPdfTable(doc, ['Metric', 'Value'], [
      ['Overall Completion', `${report.overallCompletion ?? 0}%`],
      ['Mandatory Compliance', `${report.mandatoryCompliance ?? 0}%`],
      ['Assessment Performance', `${report.assessmentPerformance ?? 0}%`],
      ['Employees Requiring Attention', actionNeededCount]
    ]);
    addPdfTable(doc, ['Employee ID', 'Employee', 'Assigned', 'Completed', 'Progress', 'Status'], teamMembers.map((member) => [
      member.employeeId || '—', member.name || '—', member.assigned ?? 0, member.completed ?? 0,
      `${Number(member.progress) || 0}%`, member.status || '—'
    ]), doc.lastAutoTable.finalY + 8);
    downloadPdfDocument(doc, `Fairmacs_Team_Compliance_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Team compliance PDF export error:', err);
    alert(err.message || 'Unable to export team compliance PDF.');
  }
};

const getOverdueCourseRecords = async () => {
  if (!token) throw new Error('Authentication token is not available.');
  const results = await Promise.all(teamMembers.map(async (member) => {
    const employeeUserId = member?.userId ?? member?.id;
    if (!employeeUserId) return [];
    const response = await fetch(`${API_BASE_URL}/manager/reports/employee/${employeeUserId}`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to load transcript for ${member.name || 'employee'}`);
    }
    const data = await response.json();
    const courses = Array.isArray(data.courses) ? data.courses : [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return courses.filter((course) => {
      if (!course.dueDate) return false;
      const dueDate = new Date(course.dueDate);
      if (Number.isNaN(dueDate.getTime())) return false;
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today && String(course.status || '').toUpperCase() !== 'COMPLETED';
    }).map((course) => {
      const dueDate = new Date(course.dueDate); dueDate.setHours(0, 0, 0, 0);
      const daysOverdue = Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / 86400000));
      return {
        employeeId: data.employeeId || member.employeeId || '—', employeeName: data.employeeName || member.name || '—',
        department: data.department || '—', courseId: course.courseId || '—', courseTitle: course.courseTitle || '—',
        status: String(course.status || '—').replace(/_/g, ' '), progress: `${course.progressPercent ?? 0}%`,
        dueDate: course.dueDate, daysOverdue
      };
    });
  }));
  return results.flat();
};

const exportOverdueTrainingReportToExcel = async () => {
  try {
    const records = await getOverdueCourseRecords();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Overdue Training');
    sheet.addRows([
      ['FAIRMACS LMS - OVERDUE TRAINING REPORT'], [],
      ['Generated On', new Date().toLocaleString('en-IN')], ['Overdue Records', records.length], [],
      ['Employee ID', 'Employee Name', 'Department', 'Course ID', 'Course Title', 'Status', 'Progress', 'Due Date', 'Days Overdue']
    ]);
    records.forEach((record) => sheet.addRow([
      record.employeeId, record.employeeName, record.department, record.courseId, record.courseTitle,
      record.status, record.progress, formatReportDate(record.dueDate), record.daysOverdue
    ]));
    sheet.columns.forEach((column) => { column.width = 20; });
    sheet.getColumn(2).width = 26; sheet.getColumn(3).width = 30; sheet.getColumn(5).width = 34; sheet.getColumn(8).width = 18;
    await downloadExcelWorkbook(workbook, `Fairmacs_Overdue_Training_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (err) {
    console.error('Overdue report Excel export error:', err);
    alert(err.message || 'Unable to generate overdue training report.');
  }
};

const exportOverdueTrainingReportToPdf = async () => {
  try {
    const records = await getOverdueCourseRecords();
    const doc = createPdfDocument('Overdue Training Report', 'Employees and courses with due dates that have passed without completion');
    addPdfTable(doc, ['Employee ID', 'Employee', 'Department', 'Course', 'Status', 'Progress', 'Due Date', 'Days Overdue'], records.length ? records.map((record) => [
      record.employeeId, record.employeeName, record.department, `${record.courseTitle} (${record.courseId})`,
      record.status, record.progress, formatReportDate(record.dueDate), record.daysOverdue
    ]) : [['—', 'No overdue training', '—', '—', '—', '—', '—', '0']]);
    downloadPdfDocument(doc, `Fairmacs_Overdue_Training_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Overdue report PDF export error:', err);
    alert(err.message || 'Unable to generate overdue training PDF.');
  }
};

const exportEmployeeReportToPdf = (data, employee) => {
  if (!data) return alert('Employee transcript data is not available.');
  try {
    const employeeName = data.employeeName || employee?.name || 'Employee';
    const doc = createPdfDocument('Employee Training Transcript', `${employeeName} - complete learning and certification record`);
    addPdfTable(doc, ['Employee Detail', 'Value'], [
      ['Employee ID', data.employeeId || '—'], ['Employee Name', employeeName], ['Email', data.email || '—'],
      ['Designation', data.designation || '—'], ['Department', data.department || '—'], ['Total Courses', data.totalCourses ?? 0],
      ['Completed Courses', data.completedCourses ?? 0], ['In Progress Courses', data.inProgressCourses ?? 0],
      ['Not Started Courses', data.notStartedCourses ?? 0], ['Certificates Issued', data.certificatesIssued ?? 0],
      ['Overall Progress', `${data.overallProgress ?? 0}%`], ['Average Score', `${data.averageScore ?? 0}%`],
      ['Training Hours', data.totalTrainingHours ?? 0]
    ]);
    const courses = Array.isArray(data.courses) ? data.courses : [];
    addPdfTable(doc, ['Course ID', 'Course', 'Type', 'Progress', 'Score', 'Status', 'Due Date', 'Certificate'], courses.map((course) => [
      course.courseId || '—', course.courseTitle || '—', course.enrollmentType || '—', `${course.progressPercent ?? 0}%`,
      course.score != null ? `${course.score}%` : '—', String(course.status || '—').replace(/_/g, ' '),
      formatReportDate(course.dueDate), course.certificateId || 'Not issued'
    ]), doc.lastAutoTable.finalY + 8);
    downloadPdfDocument(doc, `Fairmacs_${safeFilePart(employeeName)}_Training_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Employee PDF export error:', err);
    alert(err.message || 'Unable to export employee PDF.');
  }
};

const exportHrReportToExcel = async () => {
  if (!hrReport) {
    alert('HR report data is not available.');
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();

    // =========================
    // SUMMARY SHEET
    // =========================
    const summarySheet = workbook.addWorksheet('Summary');

    summarySheet.addRows([
      ['FAIRMACS LMS - HR TRAINING REPORT'],
      [],
      ['Generated On', new Date().toLocaleString('en-IN')],
      [],
      ['TRAINING OVERVIEW'],
      ['Total Employees', hrReport.totalEmployees ?? 0],
      ['Active Employees', hrReport.activeEmployees ?? 0],
      ['Total Assignments', hrReport.totalAssignments ?? 0],
      ['Completed Assignments', hrReport.completedAssignments ?? 0],
      ['In Progress Assignments', hrReport.inProgressAssignments ?? 0],
      ['Not Started Assignments', hrReport.notStartedAssignments ?? 0],
      ['Overdue Assignments', hrReport.overdueAssignments ?? 0],
      ['Mandatory Assignments', hrReport.mandatoryAssignments ?? 0],
      ['Mandatory Completed', hrReport.mandatoryCompleted ?? 0],
      ['Mandatory Compliance Rate', `${hrReport.mandatoryComplianceRate ?? 0}%`],
      ['Average Progress', `${hrReport.averageProgress ?? 0}%`],
      ['Average Score', `${hrReport.averageScore ?? 0}%`],
      ['Certificates Issued', hrReport.certificatesIssued ?? 0]
    ]);

    summarySheet.getColumn(1).width = 32;
    summarySheet.getColumn(2).width = 35;

    // =========================
    // DEPARTMENT SHEET
    // =========================
    const departmentSheet = workbook.addWorksheet('Departments');

    departmentSheet.addRow([
      'Department',
      'Employees',
      'Assignments',
      'Completed',
      'Completion Rate',
      'Overdue',
      'Mandatory Assignments',
      'Mandatory Completed',
      'Mandatory Compliance'
    ]);

    (hrReport.departmentReports || []).forEach((department) => {
      departmentSheet.addRow([
        department.department || '—',
        department.employeeCount ?? 0,
        department.totalAssignments ?? 0,
        department.completedAssignments ?? 0,
        `${department.completionRate ?? 0}%`,
        department.overdueAssignments ?? 0,
        department.mandatoryAssignments ?? 0,
        department.mandatoryCompleted ?? 0,
        `${department.mandatoryComplianceRate ?? 0}%`
      ]);
    });

    departmentSheet.columns.forEach((column) => {
      column.width = 22;
    });

    departmentSheet.getColumn(1).width = 38;

    // =========================
    // EMPLOYEE SHEET
    // =========================
    const employeeSheet = workbook.addWorksheet('Employees');

    employeeSheet.addRow([
      'Employee ID',
      'Employee Name',
      'Email',
      'Designation',
      'Department',
      'Status',
      'Assigned Courses',
      'Completed Courses',
      'In Progress',
      'Not Started',
      'Overdue',
      'Average Progress',
      'Average Score',
      'Mandatory Courses',
      'Mandatory Completed'
    ]);

    (hrReport.employeeReports || []).forEach((employee) => {
      employeeSheet.addRow([
        employee.employeeId || '—',
        employee.name || '—',
        employee.email || '—',
        employee.designation || '—',
        employee.department || '—',
        employee.status || '—',
        employee.assignedCourses ?? 0,
        employee.completedCourses ?? 0,
        employee.inProgressCourses ?? 0,
        employee.notStartedCourses ?? 0,
        employee.overdueCourses ?? 0,
        `${employee.averageProgress ?? 0}%`,
        `${employee.averageScore ?? 0}%`,
        employee.mandatoryCourses ?? 0,
        employee.mandatoryCompleted ?? 0
      ]);
    });

    employeeSheet.columns.forEach((column) => {
      column.width = 20;
    });

    employeeSheet.getColumn(2).width = 25;
    employeeSheet.getColumn(3).width = 32;
    employeeSheet.getColumn(4).width = 25;
    employeeSheet.getColumn(5).width = 32;

    // =========================
    // DOWNLOAD
    // =========================
    const fileName =
      `Fairmacs_HR_Training_Report_${new Date()
        .toISOString()
        .split('T')[0]}.xlsx`;

    await downloadExcelWorkbook(workbook, fileName);

  } catch (err) {
    console.error('HR Excel export error:', err);
    alert(err.message || 'Unable to export HR report.');
  }
};


const exportEmployeeReportToExcel = async (employee) => {
  const employeeUserId = employee?.userId ?? employee?.id;

  if (!employeeUserId || !token) {
    alert('Employee information is not available.');
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/manager/reports/employee/${employeeUserId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        text || `Failed to load employee report (${response.status})`
      );
    }

    const data = await response.json();

    const workbook = new ExcelJS.Workbook();

    // =========================
    // EMPLOYEE SUMMARY
    // =========================
    const summarySheet = workbook.addWorksheet('Employee Summary');

    summarySheet.addRows([
      ['FAIRMACS LMS - EMPLOYEE TRAINING REPORT'],
      [],
      ['Generated On', new Date().toLocaleString('en-IN')],
      [],
      ['EMPLOYEE DETAILS'],
      ['Employee ID', data.employeeId || '—'],
      ['Employee Name', data.employeeName || '—'],
      ['Email', data.email || '—'],
      ['Designation', data.designation || '—'],
      ['Department', data.department || '—'],
      [],
      ['TRAINING SUMMARY'],
      ['Total Courses', data.totalCourses ?? 0],
      ['Completed Courses', data.completedCourses ?? 0],
      ['In Progress Courses', data.inProgressCourses ?? 0],
      ['Not Started Courses', data.notStartedCourses ?? 0],
      ['Certificates Issued', data.certificatesIssued ?? 0],
      ['Overall Progress', `${data.overallProgress ?? 0}%`],
      ['Average Score', `${data.averageScore ?? 0}%`],
      ['Total Training Hours', data.totalTrainingHours ?? 0]
    ]);

    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 40;

    // =========================
    // COURSE TRANSCRIPT
    // =========================
    const courseSheet = workbook.addWorksheet('Course Transcript');

    courseSheet.addRow([
      'Course ID',
      'Course Title',
      'Category',
      'Enrollment Type',
      'Status',
      'Progress',
      'Score',
      'Due Date',
      'Enrolled At',
      'Completed Date',
      'Last Accessed',
      'Certificate ID',
      'Duration (Hours)'
    ]);

    const courses = Array.isArray(data.courses) ? data.courses : [];

    courses.forEach((course) => {
      courseSheet.addRow([
        course.courseId || '—',
        course.courseTitle || '—',
        course.category || '—',
        course.enrollmentType || '—',
        String(course.status || '—').replace(/_/g, ' '),
        `${course.progressPercent ?? 0}%`,
        course.score != null ? `${course.score}%` : '—',
        course.dueDate || '—',
        course.enrolledAt || '—',
        course.completedDate || '—',
        course.lastAccessed || '—',
        course.certificateId || 'Not issued',
        course.durationHours ?? 0
      ]);
    });

    courseSheet.columns.forEach((column) => {
      column.width = 20;
    });

    courseSheet.getColumn(1).width = 16;
    courseSheet.getColumn(2).width = 32;
    courseSheet.getColumn(3).width = 28;
    courseSheet.getColumn(9).width = 24;
    courseSheet.getColumn(10).width = 24;
    courseSheet.getColumn(11).width = 24;
    courseSheet.getColumn(12).width = 28;

    // =========================
    // DOWNLOAD
    // =========================
    const safeEmployeeName = (
      data.employeeName || employee.name || 'Employee'
    )
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    const fileName =
      `Fairmacs_${safeEmployeeName}_Training_Report_` +
      `${new Date().toISOString().split('T')[0]}.xlsx`;

    await downloadExcelWorkbook(workbook, fileName);

  } catch (err) {
    console.error('Employee Excel export error:', err);
    alert(err.message || 'Unable to export employee report.');
  }
};



  // ============================================================

  // TEAM MEMBERS

  // ============================================================



  const teamMembers = useMemo(() => {

    return Array.isArray(report?.teamMembersData)

      ? report.teamMembersData

      : [];

  }, [report]);



  // ============================================================

  // ACTION NEEDED

  // ============================================================



  const actionNeededCount = useMemo(() => {

    return teamMembers.filter(

      member =>

        String(member.status || '').toUpperCase() ===

        'ACTION NEEDED'

    ).length;

  }, [teamMembers]);



  // ============================================================

  // LOAD EMPLOYEE TRANSCRIPT

  // ============================================================



  const loadEmployeeTranscript = async (employee) => {

    const employeeUserId =

      employee?.userId ?? employee?.id;



    if (!employeeUserId || !token) {

      setTranscriptError(

        'Employee ID is not available.'

      );

      return;

    }



    setSelectedEmployee(employee);

    setTranscript(null);

    setTranscriptError('');

    setTranscriptLoading(true);



    try {

      const response = await fetch(

        `${API_BASE_URL}/manager/reports/employee/${employeeUserId}`,

        {

          method: 'GET',

          headers: {

            Authorization: `Bearer ${token}`,

            Accept: 'application/json'

          }

        }

      );



      if (!response.ok) {

        const text = await response.text();



        throw new Error(

          text ||

            `Failed to load employee transcript (${response.status})`

        );

      }



      const data = await response.json();



      setTranscript(data);

    } catch (err) {

      console.error(

        'Employee transcript error:',

        err

      );



      setTranscriptError(

        err.message ||

          'Unable to load employee training transcript.'

      );

    } finally {

      setTranscriptLoading(false);

    }

  };



  // ============================================================

  // CLOSE TRANSCRIPT

  // ============================================================



  const closeTranscript = () => {

    setSelectedEmployee(null);

    setTranscript(null);

    setTranscriptError('');

  };



  // ============================================================

  // STATUS UI

  // ============================================================



  const getStatusStyle = (status) => {

    switch (

      String(status || '').toUpperCase()

    ) {

      case 'COMPLIANT':

        return {

          background: '#dcfce7',

          color: '#15803d'

        };



      case 'ON TRACK':

        return {

          background: '#e0f2fe',

          color: '#0284c7'

        };



      case 'ACTION NEEDED':

        return {

          background: '#ffe4e6',

          color: '#e11d48'

        };



      case 'NO TRAINING':

        return {

          background: '#f1f5f9',

          color: '#64748b'

        };



      default:

        return {

          background: '#f1f5f9',

          color: '#64748b'

        };

    }

  };



  // ============================================================

  // LOADING

  // ============================================================



  if (isManager && loading) {

    return (

      <div

        style={{

          minHeight: '500px',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          background: '#f8fafc'

        }}

      >

        <div

          style={{

            display: 'flex',

            alignItems: 'center',

            gap: '10px',

            color: '#64748b',

            fontSize: '15px'

          }}

        >

          <Loader2

            size={20}

            style={{

              animation: 'spin 1s linear infinite'

            }}

          />



          Loading team reports...

        </div>

      </div>

    );

  }



  // ============================================================

  // ERROR

  // ============================================================



  if (isManager && error) {

    return (

      <div

        style={{

          padding: '32px',

          background: '#f8fafc',

          minHeight: '100%'

        }}

      >

        <div

          style={{

            background: '#fff1f2',

            border: '1px solid #fecdd3',

            borderRadius: '14px',

            padding: '24px',

            display: 'flex',

            gap: '14px',

            alignItems: 'flex-start'

          }}

        >

          <AlertTriangle

            size={24}

            color="#e11d48"

          />



          <div>

            <h3

              style={{

                margin: 0,

                fontSize: '17px',

                color: '#9f1239'

              }}

            >

              Unable to load team reports

            </h3>



            <p

              style={{

                marginTop: '8px',

                marginBottom: 0,

                color: '#be123c'

              }}

            >

              {error}

            </p>

          </div>

        </div>

      </div>

    );

  }



  // ============================================================

  // MANAGER REPORTS

  // ============================================================



  if (isManager) {

    return (

      <>

        <div

          style={{

            padding: '40px 56px',

            background: '#f8fafc',

            minHeight: '100%',

            boxSizing: 'border-box'

          }}

        >

          {/* ====================================================

              HEADER

          ==================================================== */}



          <div

            style={{

              display: 'flex',

              justifyContent: 'space-between',

              alignItems: 'flex-start',

              gap: '20px',

              marginBottom: '28px'

            }}

          >

            <div>

              <h1

                style={{

                  margin: 0,

                  fontSize: '28px',

                  fontWeight: 750,

                  color: '#172033'

                }}

              >

                Team Reports & Analytics

              </h1>



              <p

                style={{

                  marginTop: '8px',

                  marginBottom: 0,

                  color: '#71809a',

                  fontSize: '15px'

                }}

              >

                Monitor your team's training progress,

                compliance, performance, and overdue learning.

              </p>

            </div>




          </div>



          {/* ====================================================

              KPI CARDS

          ==================================================== */}



          <div

            style={{

              display: 'grid',

              gridTemplateColumns:

                'repeat(4, minmax(0, 1fr))',

              gap: '16px',

              marginBottom: '26px'

            }}

          >

            <MetricCard

              icon={<Users size={21} />}

              iconBackground="#e0f2fe"

              iconColor="#0284c7"

              value={report?.teamMembers ?? 0}

              label="Team Members"

            />



            <MetricCard

              icon={<CheckCircle2 size={21} />}

              iconBackground="#dcfce7"

              iconColor="#16a34a"

              value={`${report?.overallCompletion ?? 0}%`}

              label="Training Completion"

            />



            <MetricCard

              icon={<ShieldCheck size={21} />}

              iconBackground="#e0f2fe"

              iconColor="#0284c7"

              value={`${report?.mandatoryCompliance ?? 0}%`}

              label="Mandatory Compliance"

            />



            <MetricCard

              icon={<AlertCircle size={21} />}

              iconBackground="#ffe4e6"

              iconColor="#e11d48"

              value={actionNeededCount}

              label="Action Needed"

            />

          </div>



          {/* ====================================================

              MAIN REPORT AREA

          ==================================================== */}



          <div

            style={{

              display: 'grid',

              gridTemplateColumns:

                'minmax(0, 2fr) minmax(300px, 1fr)',

              gap: '24px',

              alignItems: 'stretch'

            }}

          >

            {/* ==================================================

                TEAM TRAINING

            ================================================== */}



            <section

              style={{

                background: '#fff',

                border: '1px solid #e2e8f0',

                borderRadius: '16px',

                padding: '22px',

                boxShadow:

                  '0 2px 8px rgba(15, 23, 42, 0.04)',

                minWidth: 0

              }}

            >

              <div

                style={{

                  display: 'flex',

                  alignItems: 'center',

                  gap: '12px',

                  marginBottom: '22px'

                }}

              >

                <IconBox>

                  <Users size={20} />

                </IconBox>



                <div>

                  <h2

                    style={{

                      margin: 0,

                      fontSize: '18px',

                      color: '#172033'

                    }}

                  >

                    Team Training Overview

                  </h2>



                  <p

                    style={{

                      margin: '5px 0 0',

                      fontSize: '13px',

                      color: '#71809a'

                    }}

                  >

                    Employee-wise training completion and

                    compliance.

                  </p>

                </div>

              </div>



              {/* TABLE HEADER */}



              <div

                style={{

                  display: 'grid',

                  gridTemplateColumns:

                    '2fr 0.8fr 0.9fr 1.5fr 1fr 32px',

                  gap: '12px',

                  padding: '13px 14px',

                  background: '#f8fafc',

                  color: '#66758f',

                  fontSize: '11px',

                  fontWeight: 700,

                  textTransform: 'uppercase',

                  borderRadius: '10px 10px 0 0'

                }}

              >

                <div>Employee</div>

                <div>Assigned</div>

                <div>Completed</div>

                <div>Progress</div>

                <div>Status</div>

                <div />

              </div>



              {/* EMPLOYEES */}



              {teamMembers.length === 0 ? (

                <div

                  style={{

                    padding: '50px 20px',

                    textAlign: 'center',

                    color: '#64748b'

                  }}

                >

                  No employees found in your team.

                </div>

              ) : (

                teamMembers.map((member) => {

                  const progress =

                    Number(member.progress) || 0;



                  const statusStyle =

                    getStatusStyle(member.status);



                  return (

                    <div

                      key={

                        member.userId ||

                        member.employeeId ||

                        member.name

                      }

                      style={{

                        display: 'grid',

                        gridTemplateColumns:

                          '2fr 0.8fr 0.9fr 1.5fr 1fr 32px',

                        gap: '12px',

                        alignItems: 'center',

                        padding: '18px 14px',

                        borderBottom:

                          '1px solid #edf2f7',

                        cursor: 'pointer',

                        transition:

                          'background 0.15s ease'

                      }}

                      onMouseEnter={(e) => {

                        e.currentTarget.style.background =

                          '#f8fbff';

                      }}

                      onMouseLeave={(e) => {

                        e.currentTarget.style.background =

                          '#fff';

                      }}

                      onClick={() => loadEmployeeTranscript(member)}

                      role="button"

                      tabIndex={0}

                      onKeyDown={(e) => {

                        if (e.key === 'Enter' || e.key === ' ') {

                          e.preventDefault();

                          loadEmployeeTranscript(member);

                        }

                      }}

                    >

                      {/* EMPLOYEE */}



                      <div

                        style={{

                          minWidth: 0

                        }}

                      >

                        <div

                          style={{

                            fontWeight: 700,

                            color: '#172033',

                            fontSize: '14px',

                            overflow: 'hidden',

                            textOverflow: 'ellipsis',

                            whiteSpace: 'nowrap'

                          }}

                        >

                          {member.name}

                        </div>



                        <div

                          style={{

                            marginTop: '4px',

                            color: '#71809a',

                            fontSize: '12px'

                          }}

                        >

                          {member.employeeId ||

                            member.designation ||

                            'Employee'}

                        </div>

                      </div>



                      {/* ASSIGNED */}



                      <div

                        style={{

                          fontWeight: 650,

                          color: '#172033'

                        }}

                      >

                        {member.assigned ?? 0}

                      </div>



                      {/* COMPLETED */}



                      <div

                        style={{

                          fontWeight: 700,

                          color: '#16a34a'

                        }}

                      >

                        {member.completed ?? 0}

                      </div>



                      {/* PROGRESS */}



                      <div>

                        <div

                          style={{

                            display: 'flex',

                            justifyContent:

                              'space-between',

                            marginBottom: '6px',

                            fontSize: '12px',

                            fontWeight: 650,

                            color: '#334155'

                          }}

                        >

                          <span>{progress}%</span>

                        </div>



                        <div

                          style={{

                            height: '7px',

                            borderRadius: '999px',

                            background: '#e2e8f0',

                            overflow: 'hidden'

                          }}

                        >

                          <div

                            style={{

                              width: `${Math.min(

                                100,

                                Math.max(0, progress)

                              )}%`,

                              height: '100%',

                              borderRadius: '999px',

                              background:

                                progress >= 100

                                  ? '#16a34a'

                                  : progress >= 70

                                    ? '#0798d1'

                                    : '#e11d48'

                            }}

                          />

                        </div>

                      </div>



                      {/* STATUS */}



                      <div>

                        <span

                          style={{

                            display: 'inline-flex',

                            alignItems: 'center',

                            padding: '7px 10px',

                            borderRadius: '999px',

                            fontSize: '10px',

                            fontWeight: 700,

                            whiteSpace: 'nowrap',

                            background:

                              statusStyle.background,

                            color: statusStyle.color

                          }}

                        >

                          {member.status}

                        </span>

                      </div>




                    </div>

                  );

                })

              )}




            </section>



            {/* ==================================================

                COMPLIANCE

            ================================================== */}



            <section

              style={{

                background: '#fff',

                border: '1px solid #e2e8f0',

                borderRadius: '16px',

                padding: '22px',

                boxShadow:

                  '0 2px 8px rgba(15, 23, 42, 0.04)'

              }}

            >

              <div

                style={{

                  display: 'flex',

                  alignItems: 'center',

                  gap: '12px',

                  marginBottom: '28px'

                }}

              >

                <IconBox>

                  <BarChart3 size={20} />

                </IconBox>



                <div>

                  <h2

                    style={{

                      margin: 0,

                      fontSize: '18px',

                      color: '#172033'

                    }}

                  >

                    Team Compliance

                  </h2>



                  <p

                    style={{

                      margin: '5px 0 0',

                      fontSize: '13px',

                      color: '#71809a'

                    }}

                  >

                    Overall mandatory training health.

                  </p>

                </div>

              </div>



              <ProgressMetric

                label="Overall Completion"

                value={report?.overallCompletion ?? 0}

                type="blue"

              />



              <ProgressMetric

                label="Mandatory Compliance"

                value={report?.mandatoryCompliance ?? 0}

                type="green"

              />



              <ProgressMetric

                label="Assessment Performance"

                value={

                  report?.assessmentPerformance ?? 0

                }

                type="purple"

              />



              <div

                style={{

                  marginTop: '30px',

                  padding: '15px',

                  borderRadius: '12px',

                  background: '#f8fafc',

                  border: '1px solid #edf2f7'

                }}

              >

                <div

                  style={{

                    fontSize: '12px',

                    color: '#64748b',

                    marginBottom: '5px'

                  }}

                >

                  Employees requiring attention

                </div>



                <div

                  style={{

                    fontSize: '24px',

                    fontWeight: 750,

                    color:

                      actionNeededCount > 0

                        ? '#e11d48'

                        : '#16a34a'

                  }}

                >

                  {actionNeededCount}

                </div>

              </div>

            </section>

          </div>



          {/* ====================================================

              REPORT CARDS

          ==================================================== */}



          <section

            style={{

              background: '#fff',

              border: '1px solid #e2e8f0',

              borderRadius: '16px',

              padding: '22px',

              marginTop: '24px',

              boxShadow:

                '0 2px 8px rgba(15, 23, 42, 0.04)'

            }}

          >

            <div

              style={{

                display: 'flex',

                alignItems: 'center',

                gap: '12px',

                marginBottom: '22px'

              }}

            >

              <IconBox>

                <FileText size={20} />

              </IconBox>



              <div>

                <h2

                  style={{

                    margin: 0,

                    fontSize: '18px',

                    color: '#172033'

                  }}

                >

                  Manager Reports

                </h2>



                <p

                  style={{

                    margin: '5px 0 0',

                    fontSize: '13px',

                    color: '#71809a'

                  }}

                >

                  Reports available for team supervision.

                </p>

              </div>

            </div>



            <div

              style={{

                display: 'grid',

                gridTemplateColumns:

                  'repeat(3, minmax(0, 1fr))',

                gap: '16px'

              }}

            >

              <ReportCard
                icon={<FileText size={21} />}
                title="Team Compliance Summary"
                description="Department and employee-wise mandatory training compliance."
                excelAction={exportManagerComplianceToExcel}
                pdfAction={exportManagerComplianceToPdf}
              />



              <ReportCard
                icon={<AlertCircle size={21} />}
                title="Overdue Training Report"
                description="Identify employees who need immediate training follow-up."
                excelAction={exportOverdueTrainingReportToExcel}
                pdfAction={exportOverdueTrainingReportToPdf}
              />

            </div>

          </section>

        </div>



        {/* ======================================================

            EMPLOYEE TRANSCRIPT MODAL

        ====================================================== */}

        {selectedEmployee && (

          <TranscriptModal

            transcript={transcript}

            employee={selectedEmployee}

            loading={transcriptLoading}

            error={transcriptError}

            onClose={closeTranscript}

            onExportExcel={() =>
              exportEmployeeReportToExcel(selectedEmployee)
            }

            onExportPdf={exportEmployeeReportToPdf}

          />

        )}



      </>

    );

  }



  // ============================================================

  
  // ============================================================
  // HR ADMIN REPORTS
  // ============================================================

  if (isHR && hrLoading) {
    return (
      <div style={{
        minHeight: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#64748b'
        }}>
          <Loader2 size={20} style={{
            animation: 'spin 1s linear infinite'
          }} />
          Loading HR reports...
        </div>
      </div>
    );
  }

  if (isHR && hrError) {
    return (
      <div style={{
        padding: '40px 56px',
        background: '#f8fafc',
        minHeight: '100%'
      }}>
        <div style={{
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          borderRadius: '14px',
          padding: '24px',
          color: '#be123c'
        }}>
          <strong>Unable to load HR reports</strong>
          <div style={{ marginTop: '8px' }}>{hrError}</div>
        </div>
      </div>
    );
  }

  if (isHR) {
    const employees = Array.isArray(hrReport?.employeeReports)
      ? hrReport.employeeReports : [];
    const departments = Array.isArray(hrReport?.departmentReports)
      ? hrReport.departmentReports : [];

    return (
      <div style={{
        padding: '40px 56px',
        background: '#f8fafc',
        minHeight: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '28px'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 750,
              color: '#172033'
            }}>
              HR Training Reports
            </h1>

            <p style={{
              marginTop: '8px',
              marginBottom: 0,
              color: '#71809a',
              fontSize: '15px'
            }}>
              Organization-wide training progress, compliance,
              employee status, and department performance.
            </p>
          </div>

          <button
            type="button"
            onClick={exportHrReportToExcel}
            style={{
              border: 0,
              borderRadius: '10px',
              padding: '12px 18px',
              background: '#0798d1',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(7, 152, 209, 0.18)'
            }}
          >
            <Download size={17} />
            Export Excel
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <MetricCard icon={<Users size={21} />}
            iconBackground="#e0f2fe" iconColor="#0284c7"
            value={hrReport?.totalEmployees ?? 0}
            label="Total Employees" />
          <MetricCard icon={<CheckCircle2 size={21} />}
            iconBackground="#dcfce7" iconColor="#16a34a"
            value={hrReport?.activeEmployees ?? 0}
            label="Active Employees" />
          <MetricCard icon={<BookOpen size={21} />}
            iconBackground="#eff8ff" iconColor="#0798d1"
            value={hrReport?.totalAssignments ?? 0}
            label="Training Assignments" />
          <MetricCard icon={<Award size={21} />}
            iconBackground="#fef3c7" iconColor="#d97706"
            value={hrReport?.certificatesIssued ?? 0}
            label="Certificates Issued" />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
          marginBottom: '26px'
        }}>
          <MetricCard icon={<BarChart3 size={21} />}
            iconBackground="#e0f2fe" iconColor="#0284c7"
            value={`${hrReport?.averageProgress ?? 0}%`}
            label="Average Progress" />
          <MetricCard icon={<ShieldCheck size={21} />}
            iconBackground="#dcfce7" iconColor="#16a34a"
            value={`${hrReport?.mandatoryComplianceRate ?? 0}%`}
            label="Mandatory Compliance" />
          <MetricCard icon={<Trophy size={21} />}
            iconBackground="#ede9fe" iconColor="#7c3aed"
            value={`${hrReport?.averageScore ?? 0}%`}
            label="Average Score" />
          <MetricCard icon={<AlertCircle size={21} />}
            iconBackground="#ffe4e6" iconColor="#e11d48"
            value={hrReport?.overdueAssignments ?? 0}
            label="Overdue Training" />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '24px'
        }}>
          <section style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '22px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '22px'
            }}>
              <IconBox><BarChart3 size={20} /></IconBox>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '18px',
                  color: '#172033'
                }}>Training Overview</h2>
                <p style={{
                  margin: '5px 0 0',
                  fontSize: '13px',
                  color: '#71809a'
                }}>Organization-wide training health.</p>
              </div>
            </div>

            <ProgressMetric
              label="Average Training Progress"
              value={hrReport?.averageProgress ?? 0}
              type="blue"
            />
            <ProgressMetric
              label="Mandatory Compliance"
              value={hrReport?.mandatoryComplianceRate ?? 0}
              type="green"
            />
            <ProgressMetric
              label="Assessment Performance"
              value={hrReport?.averageScore ?? 0}
              type="purple"
            />
          </section>

          <section style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '22px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '22px'
            }}>
              <IconBox><FileText size={20} /></IconBox>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '18px',
                  color: '#172033'
                }}>Assignment Status</h2>
              </div>
            </div>

            <StatusRow label="Completed"
              value={hrReport?.completedAssignments ?? 0}
              total={hrReport?.totalAssignments ?? 0}
              valueColor="#16a34a" />
            <StatusRow label="In Progress"
              value={hrReport?.inProgressAssignments ?? 0}
              total={hrReport?.totalAssignments ?? 0}
              valueColor="#0284c7" />
            <StatusRow label="Not Started"
              value={hrReport?.notStartedAssignments ?? 0}
              total={hrReport?.totalAssignments ?? 0}
              valueColor="#64748b" />
            <StatusRow label="Overdue"
              value={hrReport?.overdueAssignments ?? 0}
              total={hrReport?.totalAssignments ?? 0}
              valueColor="#e11d48" />
          </section>
        </div>

        <ReportTable
          title="Department Performance"
          icon={<BarChart3 size={20} />}
          columns={[
            'Department', 'Employees', 'Assignments',
            'Completion', 'Mandatory', 'Overdue'
          ]}
          rows={departments.map(d => [
            d.department || '—',
            d.employeeCount ?? 0,
            `${d.completedAssignments ?? 0} / ${d.totalAssignments ?? 0}`,
            `${d.completionRate ?? 0}%`,
            `${d.mandatoryCompleted ?? 0} / ${d.mandatoryAssignments ?? 0} (${d.mandatoryComplianceRate ?? 0}%)`,
            d.overdueAssignments ?? 0
          ])}
        />
        <section style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '22px',
          marginBottom: '24px',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '22px'
          }}>
            <IconBox>
              <Users size={20} />
            </IconBox>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '18px',
                color: '#172033'
              }}>
                Employee Training Status
              </h2>
              <p style={{
                margin: '5px 0 0',
                fontSize: '13px',
                color: '#71809a'
              }}>
                Employee-wise training progress and compliance.
              </p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
                width: '100%',
                minWidth: '1050px',
                borderCollapse: 'collapse'
            }}>
              <thead>
                <tr>
                  {[
                    'Employee',
                    'Department',
                    'Assigned',
                    'Completed',
                    'In Progress',
                    'Progress',
                    'Mandatory',
                    'Overdue',
                    'Action'
                  ].map((column) => (
                    <th
                      key={column}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        background: '#f8fafc',
                        color: '#66758f',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: '35px',
                        textAlign: 'center',
                        color: '#64748b'
                      }}
                    >
                      No employee training data available.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.userId || employee.employeeId}>
              
              {/* EMPLOYEE */}
              <td style={{
                padding: '15px 14px',
                borderTop: '1px solid #edf2f7',
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  fontWeight: 700,
                  color: '#172033',
                  fontSize: '13px'
                }}>
                  {employee.name || '—'}
                </div>

                <div style={{
                  marginTop: '3px',
                  fontSize: '11px',
                  color: '#71809a'
                }}>
                  {employee.employeeId || '—'}
                </div>
              </td>

              {/* DEPARTMENT */}
              <td style={{
                padding: '15px 14px',
                borderTop: '1px solid #edf2f7',
                color: '#475569',
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}>
                {employee.department || '—'}
              </td>

              {/* ASSIGNED */}
              <td style={{
                padding: '15px 14px',
                borderTop: '1px solid #edf2f7',
                fontWeight: 650,
                color: '#172033'
              }}>
                {employee.assignedCourses ?? 0}
              </td>

              {/* COMPLETED */}
              <td style={{
                padding: '15px 14px',
                borderTop: '1px solid #edf2f7',
                fontWeight: 700,
                color: '#16a34a'
              }}>
                {employee.completedCourses ?? 0}
              </td>

              {/* IN PROGRESS */}
              <td style={{
                padding: '15px 14px',
                borderTop: '1px solid #edf2f7',
                fontWeight: 650,
                color: '#0284c7'
              }}>
                {employee.inProgressCourses ?? 0}
              </td>

              {/* PROGRESS */}
              <td style={{
                padding: '15px 14px',
                borderTop: '1px solid #edf2f7',
                minWidth: '130px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#334155'
                }}>
                  <span>
                    {employee.averageProgress ?? 0}%
                  </span>
                </div>

                <div style={{
                  height: '6px',
                  borderRadius: '999px',
                  background: '#e2e8f0',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        Number(employee.averageProgress) || 0
                      )
                    )}%`,
                    height: '100%',
                    borderRadius: '999px',
                    background:
                      Number(employee.averageProgress) >= 100
                        ? '#16a34a'
                        : Number(employee.averageProgress) >= 70
                          ? '#0798d1'
                          : '#e11d48'
                  }} />
                </div>
              </td>

              {/* MANDATORY */}
              <td style={{
                padding: '15px 14px',
                borderTop: '1px solid #edf2f7',
                fontSize: '12px',
                fontWeight: 650,
                color: '#475569',
                whiteSpace: 'nowrap'
              }}>
                {employee.mandatoryCompleted ?? 0}
                {' / '}
                {employee.mandatoryCourses ?? 0}
              </td>

              {/* OVERDUE */}
              <td style={{
                padding: '15px 14px',
                borderTop: '1px solid #edf2f7',
                fontWeight: 700,
                color:
                  Number(employee.overdueCourses) > 0
                    ? '#e11d48'
                    : '#64748b'
              }}>
                {employee.overdueCourses ?? 0}
              </td>

              {/* ACTION */}
              <td style={{
                padding: '15px 14px',
                borderTop: '1px solid #edf2f7'
              }}>
                <button
                  type="button"
                  onClick={() =>
                    exportEmployeeReportToExcel(employee)
                  }
                  style={{
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    padding: '8px 11px',
                    background: '#f0f9ff',
                    color: '#0284c7',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Export employee training report"
                >
                  <Download size={14} />
                  Export
                </button>
              </td>

            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</section>
      </div>
    );
  }


// FALLBACK FOR OTHER ROLES

  // ============================================================



  return (

    <div

      style={{

        padding: '40px',

        color: '#64748b'

      }}

    >

      Reports are available for your role.

    </div>

  );

};



// ============================================================

// METRIC CARD

// ============================================================



const MetricCard = ({

  icon,

  iconBackground,

  iconColor,

  value,

  label

}) => (

  <div

    style={{

      background: '#fff',

      border: '1px solid #e2e8f0',

      borderRadius: '15px',

      padding: '22px',

      display: 'flex',

      alignItems: 'center',

      gap: '16px',

      minHeight: '94px',

      boxShadow:

        '0 2px 8px rgba(15, 23, 42, 0.04)'

    }}

  >

    <div

      style={{

        width: '44px',

        height: '44px',

        borderRadius: '12px',

        display: 'flex',

        alignItems: 'center',

        justifyContent: 'center',

        background: iconBackground,

        color: iconColor,

        flexShrink: 0

      }}

    >

      {icon}

    </div>



    <div>

      <div

        style={{

          fontSize: '24px',

          fontWeight: 750,

          color: '#172033'

        }}

      >

        {value}

      </div>



      <div

        style={{

          marginTop: '2px',

          color: '#71809a',

          fontSize: '12px',

          fontWeight: 600

        }}

      >

        {label}

      </div>

    </div>

  </div>

);



// ============================================================

// ICON BOX

// ============================================================



const IconBox = ({ children }) => (

  <div

    style={{

      width: '42px',

      height: '42px',

      borderRadius: '11px',

      background: '#eff8ff',

      color: '#0798d1',

      display: 'flex',

      alignItems: 'center',

      justifyContent: 'center',

      flexShrink: 0

    }}

  >

    {children}

  </div>

);



// ============================================================

// PROGRESS METRIC

// ============================================================



const ProgressMetric = ({

  label,

  value,

  type

}) => {

  const colors = {

    blue: '#0798d1',

    green: '#16a34a',

    purple: '#7c3aed'

  };



  const color =

    colors[type] || colors.blue;



  const safeValue = Math.min(

    100,

    Math.max(0, Number(value) || 0)

  );



  return (

    <div

      style={{

        marginBottom: '25px'

      }}

    >

      <div

        style={{

          display: 'flex',

          justifyContent: 'space-between',

          marginBottom: '8px',

          fontSize: '14px',

          fontWeight: 650,

          color: '#172033'

        }}

      >

        <span>{label}</span>



        <span>{safeValue}%</span>

      </div>



      <div

        style={{

          height: '8px',

          borderRadius: '999px',

          background: '#e2e8f0',

          overflow: 'hidden'

        }}

      >

        <div

          style={{

            width: `${safeValue}%`,

            height: '100%',

            background: color,

            borderRadius: '999px'

          }}

        />

      </div>

    </div>

  );

};



// ============================================================

// ============================================================
// STATUS ROW
// ============================================================

const StatusRow = ({ label, value, total, valueColor }) => {
  const t = Number(total) || 0;
  const v = Number(value) || 0;
  const pct = t > 0 ? Math.min(100, Math.max(0, v * 100 / t)) : 0;

  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '7px'
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 650,
          color: '#334155'
        }}>{label}</span>
        <span style={{
          fontSize: '13px',
          fontWeight: 750,
          color: valueColor
        }}>{v}</span>
      </div>
      <div style={{
        height: '7px',
        borderRadius: '999px',
        background: '#e2e8f0',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: valueColor,
          borderRadius: '999px'
        }} />
      </div>
    </div>
  );
};


// ============================================================
// REPORT TABLE
// ============================================================

const ReportTable = ({ title, icon, columns, rows }) => (
  <section style={{
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '22px',
    marginBottom: '24px',
    overflow: 'hidden'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '22px'
    }}>
      <IconBox>{icon}</IconBox>
      <h2 style={{
        margin: 0,
        fontSize: '18px',
        color: '#172033'
      }}>{title}</h2>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%',
        minWidth: '850px',
        borderCollapse: 'collapse'
      }}>
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column} style={{
                textAlign: 'left',
                padding: '12px 14px',
                background: '#f8fafc',
                color: '#66758f',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                padding: '35px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                No data available.
              </td>
            </tr>
          ) : rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '15px 14px',
                  borderTop: '1px solid #edf2f7',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: j === 0 ? 650 : 500,
                  whiteSpace: 'nowrap'
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);


// ============================================================

// REPORT CARD

// ============================================================



const ReportCard = ({
  icon,
  title,
  description,
  excelAction,
  pdfAction,
  excelLabel = 'Excel',
  pdfLabel = 'PDF',
  singleAction = false,
  singleLabel = 'Open'
}) => (
  <div style={{ border: '1px solid #dfe7f0', borderRadius: '12px', padding: '20px', background: '#fbfdff' }}>
    <div style={{ color: '#0798d1', marginBottom: '14px' }}>{icon}</div>
    <h3 style={{ margin: 0, fontSize: '15px', color: '#172033' }}>{title}</h3>
    <p style={{ marginTop: '8px', marginBottom: '20px', color: '#71809a', fontSize: '12px', lineHeight: 1.6, minHeight: '40px' }}>{description}</p>
    {singleAction ? (
      <button type="button" onClick={excelAction} style={{ width: '100%', border: 0, borderRadius: '9px', background: '#0798d1', color: '#fff', padding: '10px 8px', fontWeight: 650, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <Award size={14} /> {singleLabel}
      </button>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button type="button" onClick={excelAction} style={{ border: 0, borderRadius: '9px', background: '#0798d1', color: '#fff', padding: '10px 8px', fontWeight: 650, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <Download size={14} /> {excelLabel}
        </button>
        <button type="button" onClick={pdfAction} style={{ border: '1px solid #dbe5ef', borderRadius: '9px', background: '#fff', color: '#172033', padding: '10px 8px', fontWeight: 650, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <FileText size={14} /> {pdfLabel}
        </button>
      </div>
    )}
  </div>
);


// ============================================================

// EMPLOYEE TRAINING TRANSCRIPT MODAL

// ============================================================



const TranscriptModal = ({

  transcript,

  employee,

  loading,
  error,
  onClose,
  onExportExcel,
  onExportPdf
}) => {

  const formatDate = (value) => {

    if (!value) {

      return '—';

    }



    const date = new Date(value);



    if (Number.isNaN(date.getTime())) {

      return value;

    }



    return date.toLocaleDateString(

      'en-IN',

      {

        day: '2-digit',

        month: 'short',

        year: 'numeric'

      }

    );

  };



  const formatDateTime = (value) => {

    if (!value) {

      return '—';

    }



    const date = new Date(value);



    if (Number.isNaN(date.getTime())) {

      return value;

    }



    return date.toLocaleString(

      'en-IN',

      {

        day: '2-digit',

        month: 'short',

        year: 'numeric',

        hour: '2-digit',

        minute: '2-digit'

      }

    );

  };



  const getCourseStatusStyle = (status) => {

    switch (

      String(status || '').toUpperCase()

    ) {

      case 'COMPLETED':

        return {

          background: '#dcfce7',

          color: '#15803d'

        };



      case 'IN_PROGRESS':

      case 'IN PROGRESS':

        return {

          background: '#e0f2fe',

          color: '#0284c7'

        };



      case 'NOT_STARTED':

      case 'NOT STARTED':

        return {

          background: '#f1f5f9',

          color: '#64748b'

        };



      default:

        return {

          background: '#f1f5f9',

          color: '#64748b'

        };

    }

  };



  return (

    <div

      style={{

        position: 'fixed',

        inset: 0,

        zIndex: 9999,

        background:

          'rgba(15, 23, 42, 0.55)',

        backdropFilter: 'blur(5px)',

        display: 'flex',

        justifyContent: 'center',

        alignItems: 'center',

        padding: '30px',

        boxSizing: 'border-box'

      }}

      onMouseDown={(e) => {

        if (e.target === e.currentTarget) {

          onClose();

        }

      }}

    >

      <div

        style={{

          width: 'min(1100px, 100%)',

          maxHeight: '90vh',

          background: '#fff',

          borderRadius: '18px',

          overflow: 'hidden',

          boxShadow:

            '0 25px 70px rgba(15, 23, 42, 0.25)',

          display: 'flex',

          flexDirection: 'column'

        }}

      >

        {/* MODAL HEADER */}



        <div

          style={{

            padding: '22px 26px',

            borderBottom:

              '1px solid #e2e8f0',

            display: 'flex',

            justifyContent: 'space-between',

            alignItems: 'flex-start',

            gap: '20px'

          }}

        >

          <div>

            <div

              style={{

                display: 'flex',

                alignItems: 'center',

                gap: '10px'

              }}

            >

              <div

                style={{

                  width: '40px',

                  height: '40px',

                  borderRadius: '11px',

                  background: '#eff8ff',

                  color: '#0798d1',

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'center'

                }}

              >

                <Award size={20} />

              </div>



              <div>

                <h2

                  style={{

                    margin: 0,

                    color: '#172033',

                    fontSize: '20px'

                  }}

                >

                  Employee Training Transcript

                </h2>



                <p

                  style={{

                    margin: '4px 0 0',

                    color: '#71809a',

                    fontSize: '13px'

                  }}

                >

                  Complete learning and certification

                  record

                </p>

              </div>

            </div>

          </div>



          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!loading && !error && transcript && (
              <>
                <button
                  type="button"
                  onClick={() => onExportExcel(employee)}
                  style={{ border: 0, borderRadius: '8px', padding: '9px 12px', background: '#0798d1', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 650 }}
                >
                  <Download size={14} /> Excel
                </button>
                <button
                  type="button"
                  onClick={() => onExportPdf(transcript, employee)}
                  style={{ border: '1px solid #dbe5ef', borderRadius: '8px', padding: '9px 12px', background: '#fff', color: '#172033', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 650 }}
                >
                  <FileText size={14} /> PDF
                </button>
              </>
            )}

          <button

            type="button"

            onClick={onClose}

            style={{

              width: '36px',

              height: '36px',

              border: '1px solid #e2e8f0',

              background: '#fff',

              borderRadius: '9px',

              cursor: 'pointer',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              color: '#64748b'

            }}

          >

            <X size={18} />

          </button>


          </div>
        </div>



        {/* MODAL BODY */}



        <div

          style={{

            overflowY: 'auto',

            padding: '26px'

          }}

        >

          {/* LOADING */}



          {loading && (

            <div

              style={{

                minHeight: '300px',

                display: 'flex',

                alignItems: 'center',

                justifyContent: 'center',

                color: '#64748b',

                gap: '10px'

              }}

            >

              <Loader2

                size={22}

                style={{

                  animation:

                    'spin 1s linear infinite'

                }}

              />



              Loading training transcript...

            </div>

          )}



          {/* ERROR */}



          {!loading && error && (

            <div

              style={{

                padding: '18px',

                borderRadius: '12px',

                background: '#fff1f2',

                border:

                  '1px solid #fecdd3',

                color: '#be123c',

                display: 'flex',

                gap: '10px',

                alignItems: 'flex-start'

              }}

            >

              <AlertTriangle

                size={20}

              />



              <div>

                <strong>

                  Unable to load transcript

                </strong>



                <div

                  style={{

                    marginTop: '4px',

                    fontSize: '13px'

                  }}

                >

                  {error}

                </div>

              </div>

            </div>

          )}



          {/* TRANSCRIPT */}



          {!loading &&

            !error &&

            transcript && (

              <>

                {/* EMPLOYEE INFORMATION */}



                <div

                  style={{

                    display: 'grid',

                    gridTemplateColumns:

                      'minmax(0, 1.5fr) repeat(3, minmax(0, 1fr))',

                    gap: '12px',

                    marginBottom: '20px'

                  }}

                >

                  <div

                    style={{

                      padding: '18px',

                      border:

                        '1px solid #e2e8f0',

                      borderRadius: '13px',

                      background: '#fbfdff'

                    }}

                  >

                    <div

                      style={{

                        fontSize: '11px',

                        color: '#94a3b8',

                        fontWeight: 700,

                        textTransform:

                          'uppercase'

                      }}

                    >

                      Employee

                    </div>



                    <div

                      style={{

                        marginTop: '6px',

                        fontSize: '17px',

                        fontWeight: 750,

                        color: '#172033'

                      }}

                    >

                      {transcript.employeeName ||

                        employee?.name ||

                        '—'}

                    </div>



                    <div

                      style={{

                        marginTop: '4px',

                        color: '#71809a',

                        fontSize: '12px'

                      }}

                    >

                      {transcript.employeeId ||

                        employee?.employeeId ||

                        '—'}

                    </div>

                  </div>



                  <InfoBox

                    label="Department"

                    value={

                      transcript.department ||

                      '—'

                    }

                  />



                  <InfoBox

                    label="Designation"

                    value={

                      transcript.designation ||

                      '—'

                    }

                  />



                  <InfoBox

                    label="Email"

                    value={

                      transcript.email ||

                      '—'

                    }

                  />

                </div>



                {/* SUMMARY */}



                <div

                  style={{

                    display: 'grid',

                    gridTemplateColumns:

                      'repeat(6, minmax(0, 1fr))',

                    gap: '12px',

                    marginBottom: '24px'

                  }}

                >

                  <TranscriptMetric

                    icon={

                      <BookOpen

                        size={18}

                      />

                    }

                    value={

                      transcript.totalCourses ??

                      0

                    }

                    label="Total Courses"

                  />



                  <TranscriptMetric

                    icon={

                      <CheckCircle2

                        size={18}

                      />

                    }

                    value={

                      transcript.completedCourses ??

                      0

                    }

                    label="Completed"

                  />



                  <TranscriptMetric

                    icon={

                      <Clock3

                        size={18}

                      />

                    }

                    value={

                      transcript.inProgressCourses ??

                      0

                    }

                    label="In Progress"

                  />



                  <TranscriptMetric

                    icon={

                      <BookOpen

                        size={18}

                      />

                    }

                    value={

                      transcript.notStartedCourses ??

                      0

                    }

                    label="Not Started"

                  />



                  <TranscriptMetric

                    icon={

                      <Award size={18} />

                    }

                    value={

                      transcript.certificatesIssued ??

                      0

                    }

                    label="Certificates"

                  />



                  <TranscriptMetric

                    icon={

                      <Trophy size={18} />

                    }

                    value={

                      transcript.averageScore != null

                        ? `${transcript.averageScore}%`

                        : '0%'

                    }

                    label="Avg. Score"

                  />

                </div>



                {/* OVERALL PROGRESS */}



                <div

                  style={{

                    padding: '20px',

                    border:

                      '1px solid #e2e8f0',

                    borderRadius: '14px',

                    marginBottom: '24px',

                    background: '#fff'

                  }}

                >

                  <div

                    style={{

                      display: 'flex',

                      justifyContent:

                        'space-between',

                      alignItems: 'center',

                      marginBottom: '10px'

                    }}

                  >

                    <div>

                      <div

                        style={{

                          fontSize: '14px',

                          fontWeight: 700,

                          color: '#172033'

                        }}

                      >

                        Overall Training Progress

                      </div>



                      <div

                        style={{

                          marginTop: '3px',

                          fontSize: '12px',

                          color: '#71809a'

                        }}

                      >

                        Total training hours:{' '}

                        {transcript.totalTrainingHours ??

                          0}

                      </div>

                    </div>



                    <div

                      style={{

                        fontSize: '22px',

                        fontWeight: 750,

                        color: '#0798d1'

                      }}

                    >

                      {transcript.overallProgress ??

                        0}

                      %

                    </div>

                  </div>



                  <div

                    style={{

                      height: '10px',

                      background: '#e2e8f0',

                      borderRadius: '999px',

                      overflow: 'hidden'

                    }}

                  >

                    <div

                      style={{

                        height: '100%',

                        width: `${Math.min(

                          100,

                          Math.max(

                            0,

                            Number(

                              transcript.overallProgress

                            ) || 0

                          )

                        )}%`,

                        background: '#0798d1',

                        borderRadius: '999px'

                      }}

                    />

                  </div>

                </div>



                {/* COURSE TABLE */}



                <div

                  style={{

                    border:

                      '1px solid #e2e8f0',

                    borderRadius: '14px',

                    overflow: 'hidden'

                  }}

                >

                  <div

                    style={{

                      padding: '18px 20px',

                      borderBottom:

                        '1px solid #e2e8f0',

                      display: 'flex',

                      alignItems: 'center',

                      gap: '10px'

                    }}

                  >

                    <BookOpen

                      size={19}

                      color="#0798d1"

                    />



                    <div>

                      <h3

                        style={{

                          margin: 0,

                          fontSize: '16px',

                          color: '#172033'

                        }}

                      >

                        Course History

                      </h3>



                      <p

                        style={{

                          margin:

                            '4px 0 0',

                          fontSize: '12px',

                          color: '#71809a'

                        }}

                      >

                        Detailed employee

                        learning records

                      </p>

                    </div>

                  </div>



                  {Array.isArray(

                    transcript.courses

                  ) &&

                  transcript.courses.length > 0 ? (

                    <div

                      style={{

                        overflowX: 'auto'

                      }}

                    >

                      <div

                        style={{

                          minWidth:

                            '900px'

                        }}

                      >

                        {/* TABLE HEADER */}



                        <div

                          style={{

                            display: 'grid',

                            gridTemplateColumns:

                              '2fr 1fr 0.9fr 1fr 1fr 1.2fr 1.2fr',

                            gap: '12px',

                            padding:

                              '12px 18px',

                            background:

                              '#f8fafc',

                            color:

                              '#66758f',

                            fontSize:

                              '10px',

                            fontWeight: 700,

                            textTransform:

                              'uppercase'

                          }}

                        >

                          <div>

                            Course

                          </div>

                          <div>

                            Type

                          </div>

                          <div>

                            Progress

                          </div>

                          <div>

                            Score

                          </div>

                          <div>

                            Status

                          </div>

                          <div>

                            Due Date

                          </div>

                          <div>

                            Certificate

                          </div>

                        </div>



                        {/* COURSE ROWS */}



                        {transcript.courses.map(

                          (course) => {

                            const courseStatus =

                              getCourseStatusStyle(

                                course.status

                              );



                            return (

                              <div

                                key={

                                  course.enrollmentId

                                }

                                style={{

                                  display:

                                    'grid',

                                  gridTemplateColumns:

                                    '2fr 1fr 0.9fr 1fr 1fr 1.2fr 1.2fr',

                                  gap: '12px',

                                  alignItems:

                                    'center',

                                  padding:

                                    '16px 18px',

                                  borderTop:

                                    '1px solid #edf2f7'

                                }}

                              >

                                {/* COURSE */}



                                <div>

                                  <div

                                    style={{

                                      fontSize:

                                        '13px',

                                      fontWeight:

                                        700,

                                      color:

                                        '#172033'

                                    }}

                                  >

                                    {course.courseTitle ||

                                      'Untitled Course'}

                                  </div>



                                  <div

                                    style={{

                                      marginTop:

                                        '4px',

                                      fontSize:

                                        '11px',

                                      color:

                                        '#71809a'

                                    }}

                                  >

                                    {course.courseId ||

                                      '—'}

                                  </div>

                                </div>



                                {/* TYPE */}



                                <div

                                  style={{

                                    fontSize:

                                      '11px',

                                    fontWeight:

                                      650,

                                    color:

                                      '#475569'

                                  }}

                                >

                                  {course.enrollmentType ||

                                    '—'}

                                </div>



                                {/* PROGRESS */}



                                <div>

                                  <div

                                    style={{

                                      fontSize:

                                        '12px',

                                      fontWeight:

                                        700,

                                      marginBottom:

                                        '5px',

                                      color:

                                        '#172033'

                                    }}

                                  >

                                    {course.progressPercent ??

                                      0}

                                    %

                                  </div>



                                  <div

                                    style={{

                                      height:

                                        '6px',

                                      background:

                                        '#e2e8f0',

                                      borderRadius:

                                        '999px',

                                      overflow:

                                        'hidden'

                                    }}

                                  >

                                    <div

                                      style={{

                                        height:

                                          '100%',

                                        width: `${Math.min(

                                          100,

                                          Math.max(

                                            0,

                                            Number(

                                              course.progressPercent

                                            ) || 0

                                          )

                                        )}%`,

                                        background:

                                          '#0798d1'

                                      }}

                                    />

                                  </div>

                                </div>



                                {/* SCORE */}



                                <div

                                  style={{

                                    fontWeight:

                                      700,

                                    color:

                                      course.score !=

                                      null

                                        ? '#172033'

                                        : '#94a3b8'

                                  }}

                                >

                                  {course.score !=

                                  null

                                    ? `${course.score}%`

                                    : '—'}

                                </div>



                                {/* STATUS */}



                                <div>

                                  <span

                                    style={{

                                      display:

                                        'inline-flex',

                                      padding:

                                        '6px 9px',

                                      borderRadius:

                                        '999px',

                                      background:

                                        courseStatus.background,

                                      color:

                                        courseStatus.color,

                                      fontSize:

                                        '10px',

                                      fontWeight:

                                        700,

                                      whiteSpace:

                                        'nowrap'

                                    }}

                                  >

                                    {String(

                                      course.status ||

                                        '—'

                                    ).replace(

                                      /_/g,

                                      ' '

                                    )}

                                  </span>

                                </div>



                                {/* DUE DATE */}



                                <div

                                  style={{

                                    display:

                                      'flex',

                                    alignItems:

                                      'center',

                                    gap: '5px',

                                    fontSize:

                                      '11px',

                                    color:

                                      '#64748b'

                                  }}

                                >

                                  <CalendarDays

                                    size={13}

                                  />



                                  {formatDate(

                                    course.dueDate

                                  )}

                                </div>



                                {/* CERTIFICATE */}



                                <div

                                  style={{

                                    fontSize:

                                      '11px',

                                    fontWeight:

                                      course.certificateId

                                        ? 650

                                        : 400,

                                    color:

                                      course.certificateId

                                        ? '#15803d'

                                        : '#94a3b8',

                                    wordBreak:

                                      'break-word'

                                  }}

                                >

                                  {course.certificateId ||

                                    'Not issued'}

                                </div>

                              </div>

                            );

                          }

                        )}

                      </div>

                    </div>

                  ) : (

                    <div

                      style={{

                        padding: '50px 20px',

                        textAlign:

                          'center',

                        color: '#64748b'

                      }}

                    >

                      No training records found

                      for this employee.

                    </div>

                  )}

                </div>



                {/* LAST ACTIVITY */}



                {Array.isArray(

                  transcript.courses

                ) &&

                  transcript.courses.length >

                    0 && (

                    <div

                      style={{

                        marginTop: '18px',

                        fontSize: '12px',

                        color: '#94a3b8'

                      }}

                    >

                      Last activity:{' '}

                      {formatDateTime(

                        transcript.courses

                          .filter(

                            (course) =>

                              course.lastAccessed

                          )

                          .sort(

                            (a, b) =>

                              new Date(

                                b.lastAccessed

                              ) -

                              new Date(

                                a.lastAccessed

                              )

                          )[0]

                          ?.lastAccessed

                      )}

                    </div>

                  )}

              </>

            )}

        </div>

      </div>

    </div>

  );

};



// ============================================================

// INFO BOX

// ============================================================



const InfoBox = ({

  label,

  value

}) => (

  <div

    style={{

      padding: '18px',

      border: '1px solid #e2e8f0',

      borderRadius: '13px',

      background: '#fbfdff',

      minWidth: 0

    }}

  >

    <div

      style={{

        fontSize: '11px',

        color: '#94a3b8',

        fontWeight: 700,

        textTransform: 'uppercase'

      }}

    >

      {label}

    </div>



    <div

      style={{

        marginTop: '7px',

        fontSize: '13px',

        fontWeight: 650,

        color: '#172033',

        overflow: 'hidden',

        textOverflow: 'ellipsis',

        whiteSpace: 'nowrap'

      }}

      title={value}

    >

      {value}

    </div>

  </div>

);



// ============================================================

// TRANSCRIPT METRIC

// ============================================================



const TranscriptMetric = ({

  icon,

  value,

  label

}) => (

  <div

    style={{

      border: '1px solid #e2e8f0',

      borderRadius: '12px',

      padding: '14px',

      background: '#fff'

    }}

  >

    <div

      style={{

        color: '#0798d1',

        marginBottom: '9px'

      }}

    >

      {icon}

    </div>



    <div

      style={{

        fontSize: '20px',

        fontWeight: 750,

        color: '#172033'

      }}

    >

      {value}

    </div>



    <div

      style={{

        marginTop: '3px',

        fontSize: '10px',

        color: '#71809a',

        fontWeight: 600

      }}

    >

      {label}

    </div>

  </div>

);



export default ReportsView;