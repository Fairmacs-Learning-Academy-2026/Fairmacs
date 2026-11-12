import React, { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
  X, CheckCircle2, ChevronRight, ChevronLeft, Plus, Trash2,
  FileText, Video, Upload, Save, AlertCircle, Users, Award,
  ChevronUp, ChevronDown, Image as ImageIcon, Loader2
} from 'lucide-react';
import { resolveBannerUrl } from '../utils/courseBanner';

const BulkQuizImportModal = React.lazy(() => import('./BulkQuizImportModal'));

// Module-level reference caches for instantaneous modal opening without network delays
let cachedDepartments = null;
let cachedDepartmentsTimestamp = 0;
let inFlightDepartmentsPromise = null;

let cachedEmployees = null;
let cachedEmployeesTimestamp = 0;
let inFlightEmployeesPromise = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh cache

function normalizeDepartmentsData(departmentData) {
  const departmentRows = Array.isArray(departmentData)
    ? departmentData
    : departmentData?.departments ?? departmentData?.content ?? departmentData?.data ?? [];
  return Array.isArray(departmentRows)
    ? departmentRows.map((item) => {
      if (typeof item === 'string') return { id: null, label: item, value: item, shortCode: '' };
      const id = item.id;
      const label = item.name || item.departmentName || item.label || '';
      const value = item.name || item.departmentName || item.value || label;
      return { id, label: String(label), value: String(value), shortCode: item.shortCode || '' };
    }).filter((item) => item.label && item.value)
    : [];
}

function normalizeEmployeesData(responseData) {
  const employeeRows = Array.isArray(responseData)
    ? responseData
    : responseData?.employees ?? responseData?.content ?? responseData?.data ?? responseData?.results ?? [];
  if (!Array.isArray(employeeRows)) return [];
  return employeeRows.map((employee) => {
    const id = employee.userId ?? employee.id ?? employee.employeeId ?? employee.user?.id;
    const email = employee.email ?? employee.officeEmail ?? employee.workEmail ?? employee.user?.email ?? '';
    const joinedName = [employee.firstName, employee.lastName].filter(Boolean).join(' ');
    const name = employee.name ?? employee.fullName ?? employee.employeeName ?? (joinedName || email);
    const position = employee.position || employee.level || employee.employeeLevel || 'P0';
    return {
      id: String(id ?? ''),
      name: String(name || email || `Employee ${id ?? ''}`),
      email: String(email),
      department: employee.departmentName ?? employee.department?.name ?? employee.department ?? '',
      designation: employee.designation || 'Executive',
      position: position,
      level: position
    };
  }).filter((employee) => employee.id && employee.id !== 'undefined');
}

export async function getOrFetchDepartments(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedDepartments && (now - cachedDepartmentsTimestamp) < CACHE_TTL_MS) {
    return cachedDepartments;
  }
  if (!inFlightDepartmentsPromise || forceRefresh) {
    inFlightDepartmentsPromise = apiRequest('/departments')
      .then((data) => {
        const normalized = normalizeDepartmentsData(data);
        cachedDepartments = normalized;
        cachedDepartmentsTimestamp = Date.now();
        inFlightDepartmentsPromise = null;
        return normalized;
      })
      .catch((err) => {
        inFlightDepartmentsPromise = null;
        throw err;
      });
  }
  return inFlightDepartmentsPromise;
}

export async function getOrFetchEmployees(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedEmployees && (now - cachedEmployeesTimestamp) < CACHE_TTL_MS) {
    return cachedEmployees;
  }
  if (!inFlightEmployeesPromise || forceRefresh) {
    inFlightEmployeesPromise = apiRequest('/hr/employees')
      .then((data) => {
        const normalized = normalizeEmployeesData(data);
        cachedEmployees = normalized;
        cachedEmployeesTimestamp = Date.now();
        inFlightEmployeesPromise = null;
        return normalized;
      })
      .catch((err) => {
        inFlightEmployeesPromise = null;
        throw err;
      });
  }
  return inFlightEmployeesPromise;
}

export function preloadCourseBuilderReferenceData() {
  try {
    getOrFetchDepartments().catch(() => {});
  } catch (_) {}
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.75rem',
  borderRadius: 8, border: '1px solid #cbd5e1', marginTop: 5,
  fontSize: '0.9rem', background: '#fff', color: '#0f172a'
};
const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155' };
const panelStyle = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 };
const buttonStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.55rem 0.8rem',
  background: '#fff', color: '#334155', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem'
};
const primaryStyle = {
  ...buttonStyle, border: 'none', background: '#0284c7', color: '#fff',
  padding: '0.65rem 1rem'
};

const makeQuestion = () => ({
  questionText: '', questionType: 'SINGLE_CHOICE',
  optionA: '', optionB: '', optionC: '', optionD: '',
  correctAnswer: 'A', explanation: '', orderIndex: 1
});
const makeQuiz = (title = '') => ({
  title, passingScore: 70, timeLimitMinutes: 15, randomizeQuestions: true, randomizeOptions: true,
  questions: [makeQuestion()]
});
const makeLesson = (orderIndex = 1) => ({
  title: '',
  type: 'VIDEO',
  contentUrl: '',
  duration: '',
  summary: '',
  orderIndex,
  assetFile: null,
  workdriveFileId: '',
  workdriveFileName: '',
  uploading: false
});
const makeModule = (orderIndex = 1) => ({
  localId: `${Date.now()}-${Math.random()}`, title: '', orderIndex,
  lessons: [makeLesson()], quiz: null
});

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');

function readToken() {
  return localStorage.getItem('fairmacs_token') || localStorage.getItem('token') || '';
}

async function apiRequest(path, options = {}) {
  const token = readToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) {
    const message = data?.message || data?.error || (typeof data === 'string' ? data : '') ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

async function uploadLessonDocument(file) {
  if (!file) throw new Error('Choose a PDF or DOCX document.');
  if (file.size > 20 * 1024 * 1024) throw new Error('The document exceeds the 20 MB upload limit.');

  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
  const isDocx = lowerName.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (!isPdf && !isDocx) throw new Error('Only PDF and DOCX documents are supported.');

  const formData = new FormData();
  formData.append('file', file);
  const token = readToken();

  const response = await fetch(`${API_BASE}/integrations/zoho/documents/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok || !data?.success || !data?.fileId) {
    throw new Error(data?.message || data?.error || `Document upload failed (${response.status}).`);
  }
  return data;
}

async function uploadThumbnailImage(file) {
  if (!file) throw new Error('Choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('The thumbnail exceeds the 5 MB upload limit.');

  const lowerName = file.name.toLowerCase();
  const isValid = file.type.startsWith('image/') ||
    lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.webp');
  if (!isValid) throw new Error('Only PNG, JPEG, and WEBP images are supported.');

  const formData = new FormData();
  formData.append('file', file);
  const token = readToken();

  const response = await fetch(`${API_BASE}/courses/thumbnails/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok || !data?.url) {
    throw new Error(data?.message || data?.error || `Thumbnail upload failed (${response.status}).`);
  }
  return data;
}

export default function CourseBuilderModal({ courseId = '', initialCourseId = '', onClose, onPublish }) {
  const resolvedCourseId = String(courseId || initialCourseId || '').trim();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [departments, setDepartments] = useState(() => cachedDepartments || []);
  const [employees, setEmployees] = useState(() => cachedEmployees || []);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [loadingDepartments, setLoadingDepartments] = useState(() => !cachedDepartments || (Date.now() - cachedDepartmentsTimestamp) >= CACHE_TTL_MS);
  const [departmentError, setDepartmentError] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(() => !cachedEmployees || (Date.now() - cachedEmployeesTimestamp) >= CACHE_TTL_MS);
  const [employeeLoadError, setEmployeeLoadError] = useState('');
  const [editingCourseId, setEditingCourseId] = useState(resolvedCourseId);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(resolvedCourseId));

  const [courseInfo, setCourseInfo] = useState({
    title: '', departmentId: '', level: 'P0', position: 'P0', duration: '', durationHours: '',
    description: '', banner: '', foundation: false
  });
  const [selectedDeptToAdd, setSelectedDeptToAdd] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState([]);
  const [newOutcomeText, setNewOutcomeText] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [modules, setModules] = useState([makeModule(1)]);
  const [finalQuiz, setFinalQuiz] = useState(makeQuiz('Final Assessment'));
  const [assignment, setAssignment] = useState({
    targetDepartments: [], departmentAssignments: [], selectedEmployeeIds: [], dueDate: ''
  });
  const [bulkImportTarget, setBulkImportTarget] = useState(null);

  // Lock background scrolling and prevent layout shifts while modal is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  // Keyboard accessibility: Escape closes modal if not saving and no child modal is active
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving && !bulkImportTarget) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, bulkImportTarget, onClose]);

  const handleBulkImportQuestions = (importedQuestions, mode) => {
    if (!bulkImportTarget) return;
    const { setter, heading } = bulkImportTarget;
    setter((oldQuiz) => {
      const formatted = importedQuestions.map((q, idx) => ({
        questionText: q.questionText,
        questionType: q.questionType || 'SINGLE_CHOICE',
        optionA: q.optionA || '',
        optionB: q.optionB || '',
        optionC: q.optionC || '',
        optionD: q.optionD || '',
        correctAnswer: q.correctAnswer || 'A',
        explanation: q.explanation || '',
        orderIndex: mode === 'replace' ? idx + 1 : (oldQuiz.questions?.length || 0) + idx + 1
      }));

      const newQuestions = mode === 'replace'
        ? formatted
        : [...(oldQuiz.questions || []), ...formatted];

      return {
        ...oldQuiz,
        questions: newQuestions
      };
    });
    setNotice(`Successfully imported ${importedQuestions.length} questions into ${heading}.`);
  };

  const addDepartmentAssignment = (deptId) => {
    if (!deptId) return;
    const targetDept = departments.find(d => String(d.id || d.value) === String(deptId));
    if (!targetDept) return;
    const deptNumericId = targetDept.id || null;
    const deptName = targetDept.label || targetDept.value;

    if ((assignment.departmentAssignments || []).some(da => String(da.departmentId) === String(deptNumericId) || da.departmentName.toLowerCase() === deptName.toLowerCase())) {
      return;
    }

    setAssignment(old => ({
      ...old,
      departmentAssignments: [
        ...(old.departmentAssignments || []),
        {
          departmentId: deptNumericId,
          departmentName: deptName,
          shortCode: targetDept.shortCode || '',
          assignmentType: 'MANDATORY',
          dueDate: old.dueDate || ''
        }
      ],
      targetDepartments: [...old.targetDepartments, deptName]
    }));
    setSelectedDeptToAdd('');
  };

  const updateDepartmentAssignment = (index, patch) => {
    setAssignment(old => {
      const nextList = (old.departmentAssignments || []).map((item, i) => i === index ? { ...item, ...patch } : item);
      return {
        ...old,
        departmentAssignments: nextList,
        targetDepartments: nextList.filter(item => item.assignmentType === 'MANDATORY').map(item => item.departmentName)
      };
    });
  };

  const removeDepartmentAssignment = (index) => {
    setAssignment(old => {
      const nextList = (old.departmentAssignments || []).filter((_, i) => i !== index);
      return {
        ...old,
        departmentAssignments: nextList,
        targetDepartments: nextList.filter(item => item.assignmentType === 'MANDATORY').map(item => item.departmentName)
      };
    });
  };

  const steps = [
    '1. Course Info', '2. Modules & Lessons', '3. Videos & PDFs',
    '4. Quiz & Cert', '5. Training Assignment', '6. Review & Publish'
  ];

  const loadDepartments = useCallback(async (force = false) => {
    setLoadingDepartments(true);
    setDepartmentError('');
    try {
      const data = await getOrFetchDepartments(force);
      setDepartments(data);
      if (!data.length) {
        setNotice('No departments were returned by the backend. Verify GET /api/departments.');
      }
    } catch (err) {
      setDepartmentError(`Departments could not be loaded: ${err.message || 'unknown error'}.`);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const loadEmployees = useCallback(async (force = false) => {
    setLoadingEmployees(true);
    setEmployeeLoadError('');
    try {
      const data = await getOrFetchEmployees(force);
      setEmployees(data);
      if (!data.length) {
        setEmployeeLoadError('The employee endpoint returned no usable employee records.');
      }
    } catch (err) {
      setEmployeeLoadError(`Employee list request failed: ${err.message || 'unknown error'}.`);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    if (!cachedDepartments || (Date.now() - cachedDepartmentsTimestamp) >= CACHE_TTL_MS) {
      loadDepartments().catch(() => {});
    }
    if (!cachedEmployees || (Date.now() - cachedEmployeesTimestamp) >= CACHE_TTL_MS) {
      loadEmployees().catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [loadDepartments, loadEmployees]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter((employee) =>
      `${employee.name} ${employee.email} ${employee.department} ${employee.designation || ''} ${employee.position || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [employees, employeeSearch]);
  useEffect(() => {
    if (!resolvedCourseId) return;
    let alive = true;
    (async () => {
      setLoadingDraft(true);
      setError('');
      try {
        const result = await apiRequest(
          `/courses/${encodeURIComponent(resolvedCourseId)}/authoring`
        );
        const isDraftCourse = result?.draft === true || result?.draft === 'true';
        if (!isDraftCourse) {
          throw new Error('Published courses cannot be edited. Open Course Drafts to edit an unpublished draft.');
        }
        const payload = isDraftCourse && result?.draftPayload
          ? (typeof result.draftPayload === 'string'
            ? JSON.parse(result.draftPayload)
            : result.draftPayload)
          : result;

        if (!payload || typeof payload !== 'object') {
          throw new Error('The course authoring API returned an invalid response.');
        }
        if (!alive) return;
        setEditingCourseId(resolvedCourseId);
        setCourseInfo({
          title: payload.title || result.title || '',
          departmentId: payload.departmentId || result.departmentId || '',
          level: payload.position || payload.level || result.level || 'P0',
          position: payload.position || payload.level || result.level || 'P0',
          duration: payload.duration || result.duration || '',
          durationHours: payload.durationHours ?? result.durationHours ?? '',
          description: payload.description || result.description || '',
          banner: payload.banner || result.banner || '',
          foundation: Boolean(payload.foundation ?? result.foundation)
        });
        let restoredOutcomes = [];
        if (Array.isArray(payload.learningOutcomes)) {
          restoredOutcomes = payload.learningOutcomes;
        } else if (typeof result?.learningOutcomes === 'string' && result.learningOutcomes.trim()) {
          try { restoredOutcomes = JSON.parse(result.learningOutcomes); } catch { restoredOutcomes = [result.learningOutcomes]; }
        } else if (Array.isArray(result?.learningOutcomes)) {
          restoredOutcomes = result.learningOutcomes;
        }
        setLearningOutcomes(restoredOutcomes);
        if (payload.banner || result.banner) {
          setThumbnailPreview(payload.banner || result.banner);
        }
        const normalizeQuiz = (quiz, title) => quiz ? {
          ...makeQuiz(title),
          ...quiz,
          questions: Array.isArray(quiz.questions) && quiz.questions.length
            ? quiz.questions.map((q, index) => ({
              ...makeQuestion(),
              ...q,
              orderIndex: q.orderIndex ?? index + 1
            }))
            : [makeQuestion()]
        } : null;
        const moduleSource = (Array.isArray(payload.modules) && payload.modules.length)
          ? payload.modules
          : (Array.isArray(result.modules) ? result.modules : []);
        const restoredModules = Array.isArray(moduleSource)
          ? moduleSource
            .filter((mod) => mod && typeof mod === 'object')
            .map((mod, index) => ({
              ...makeModule(index + 1),
              title: mod.title ?? '',
              orderIndex: mod.orderIndex ?? index + 1,
              lessons: Array.isArray(mod.lessons) && mod.lessons.length
                ? mod.lessons
                  .filter((lesson) => lesson && typeof lesson === 'object')
                  .map((lesson, lessonIndex) => ({
                    ...makeLesson(lessonIndex + 1),
                    ...lesson,
                    title: lesson.title ?? '',
                    summary: lesson.summary ?? '',
                    contentUrl: lesson.contentUrl ?? lesson.assetUrl ?? '',
                    workdriveFileId: lesson.workdriveFileId ?? '',
                    workdriveFileName: lesson.workdriveFileName ?? '',
                    assetFile: null,
                  }))
                : [makeLesson(1)],
              quiz: normalizeQuiz(
                mod.quiz,
                `${mod.title || `Module ${index + 1}`} Quiz`
              ),
            }))
          : [];
        setModules(restoredModules.length ? restoredModules : [makeModule(1)]);
        setFinalQuiz(
          normalizeQuiz(payload.finalQuiz || result.finalQuiz, 'Final Assessment')
          || makeQuiz('Final Assessment')
        );
        // The backend returns assignment selections directly for published courses.
        // Keep draft payload as the source for drafts, and use direct fields for published content.
        const assignmentSource = isDraftCourse ? payload : {
          ...payload,
          targetDepartments: result?.targetDepartments ?? payload.targetDepartments ?? [],
          targetEmployeeIds: result?.targetEmployeeIds ?? payload.targetEmployeeIds ?? [],
          dueDate: result?.dueDate ?? payload.dueDate ?? ''
        };
        let restoredDeptAssignments = [];
        if (Array.isArray(payload.departmentAssignments) && payload.departmentAssignments.length) {
          restoredDeptAssignments = payload.departmentAssignments.map(a => ({
            departmentId: a.departmentId,
            departmentName: a.departmentName || '',
            shortCode: a.shortCode || '',
            assignmentType: String(a.assignmentType || 'MANDATORY').toUpperCase(),
            dueDate: a.dueDate || ''
          }));
        } else if (Array.isArray(result.departmentAssignments) && result.departmentAssignments.length) {
          restoredDeptAssignments = result.departmentAssignments.map(a => ({
            departmentId: a.departmentId,
            departmentName: a.departmentName || '',
            shortCode: a.shortCode || '',
            assignmentType: String(a.assignmentType || 'MANDATORY').toUpperCase(),
            dueDate: a.dueDate || ''
          }));
        } else if (Array.isArray(assignmentSource.targetDepartments) && assignmentSource.targetDepartments.length) {
          restoredDeptAssignments = assignmentSource.targetDepartments.map(name => ({
            departmentId: null,
            departmentName: String(name),
            shortCode: '',
            assignmentType: 'MANDATORY',
            dueDate: assignmentSource.dueDate || ''
          }));
        }

        setAssignment({
          targetDepartments: Array.isArray(assignmentSource.targetDepartments)
            ? assignmentSource.targetDepartments.map(String) : restoredDeptAssignments.filter(a => a.assignmentType === 'MANDATORY').map(a => a.departmentName),
          departmentAssignments: restoredDeptAssignments,
          selectedEmployeeIds: Array.isArray(assignmentSource.targetEmployeeIds)
            ? assignmentSource.targetEmployeeIds.map(String) : [],
          dueDate: assignmentSource.dueDate || ''
        });
        setNotice(isDraftCourse
          ? 'Draft loaded. You can continue editing.'
          : 'Published course loaded with its saved training assignments.');
      } catch (err) {
        if (alive) {
          setError(err.message || 'Could not load this draft.');
        }
      } finally {
        if (alive) setLoadingDraft(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [resolvedCourseId]);
  const updateModule = (moduleIndex, patch) => {
    setModules((old) => old.map((mod, index) => index === moduleIndex ? { ...mod, ...patch } : mod));
  };
  const updateLesson = (moduleIndex, lessonIndex, patch) => {
    setModules((old) => old.map((mod, mi) => mi !== moduleIndex ? mod : {
      ...mod, lessons: mod.lessons.map((lesson, li) => li === lessonIndex ? { ...lesson, ...patch } : lesson)
    }));
  };
  const addModule = () => setModules((old) => [...old, makeModule(old.length + 1)]);
  const removeModule = (moduleIndex) => setModules((old) => old.filter((_, index) => index !== moduleIndex)
    .map((mod, index) => ({ ...mod, orderIndex: index + 1 })));
  const addLesson = (moduleIndex) => setModules((old) => old.map((mod, index) => index !== moduleIndex ? mod : {
    ...mod, lessons: [...mod.lessons, makeLesson(mod.lessons.length + 1)]
  }));
  const removeLesson = (moduleIndex, lessonIndex) => setModules((old) => old.map((mod, index) => index !== moduleIndex ? mod : ({
    ...mod, lessons: mod.lessons.filter((_, li) => li !== lessonIndex)
      .map((lesson, li) => ({ ...lesson, orderIndex: li + 1 }))
  })));

  const updateQuiz = (quizSetter, patch) => quizSetter((old) => ({ ...old, ...patch }));
  const updateQuestion = (quizSetter, questionIndex, patch) => quizSetter((old) => ({
    ...old,
    questions: old.questions.map((question, index) => index === questionIndex
      ? { ...question, ...patch } : question)
  }));
  const addQuestion = (quizSetter) => quizSetter((old) => ({
    ...old, questions: [...old.questions, { ...makeQuestion(), orderIndex: old.questions.length + 1 }],

  }));
  const removeQuestion = (quizSetter, questionIndex) => quizSetter((old) => {
    const questions = old.questions.filter((_, index) => index !== questionIndex)
      .map((question, index) => ({ ...question, orderIndex: index + 1 }));
    return { ...old, questions };
  });

  const validateStep = (step) => {
    if (step === 1) {
      if (!(courseInfo.title ?? '').trim()) return 'Enter a course title.';
      if (!courseInfo.departmentId) return 'Select a course owning department.';
      if (!courseInfo.position && !courseInfo.level) return 'Select a course position.';
      if (courseInfo.durationHours !== '' && Number(courseInfo.durationHours) < 0) return 'Duration hours cannot be negative.';
    }
    if (step === 2) {
      if (!modules.length) return 'Add at least one module.';
      for (let i = 0; i < modules.length; i++) {
        if (!(modules[i].title ?? '').trim()) return `Enter a title for Module ${i + 1}.`;
        if ((modules[i].lessons ?? []).some((lesson) => !(lesson.title ?? '').trim())) return `Every lesson in Module ${i + 1} needs a title.`;
        if (!courseInfo.foundation && modules[i].quiz?.questions?.length) {
          for (let qIdx = 0; qIdx < modules[i].quiz.questions.length; qIdx++) {
            const q = modules[i].quiz.questions[qIdx];
            if (!(q.questionText ?? '').trim()) return `Module ${i + 1} quiz question ${qIdx + 1} needs text.`;
            if (!(q.optionA ?? '').trim() || !(q.optionB ?? '').trim()) return `Module ${i + 1} quiz question ${qIdx + 1} needs at least Options A and B.`;
            if (!q.correctAnswer?.trim()) return `Select the correct answer for Module ${i + 1} question ${qIdx + 1}.`;
            if (q.questionType === 'MULTI_SELECT') {
              const answers = (q.correctAnswer || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
              if (answers.length < 2) return `Module ${i + 1} quiz question ${qIdx + 1} is Multiple Answers and requires at least 2 correct options selected.`;
            }
          }
        }
      }
    }
    if (step === 4) {
      if (courseInfo.foundation) return ''; // Foundation courses have no final assessment
      if (!finalQuiz.questions.length) return 'Add at least one final assessment question.';
      for (let i = 0; i < finalQuiz.questions.length; i++) {
        const q = finalQuiz.questions[i];
        if (!(q.questionText ?? '').trim()) return `Enter text for final question ${i + 1}.`;
        if (!q.correctAnswer?.trim()) return `Select the correct answer for final question ${i + 1}.`;
        if (!(q.optionA ?? '').trim() || !(q.optionB ?? '').trim()) return `Final question ${i + 1} needs at least options A and B.`;
        if (q.questionType === 'MULTI_SELECT') {
          const answers = (q.correctAnswer || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          if (answers.length < 2) return `Final question ${i + 1} is Multiple Answers and requires at least 2 correct options selected.`;
        }
      }
      if (Number(finalQuiz.passingScore) < 0 || Number(finalQuiz.passingScore) > 100) return 'Passing score must be between 0 and 100.';
    }
    return '';
  };

  const goNext = () => {
    const validation = validateStep(currentStep);
    if (validation) { setError(validation); return; }
    setError('');
    setNotice('');
    setCurrentStep((step) => Math.min(6, step + 1));
  };

  const buildPayload = (publish) => {
    const targetEmployeeIds = assignment.selectedEmployeeIds.map(Number).filter((value) => Number.isInteger(value) && value > 0);
    const quizPayload = (quiz) => ({
      title: quiz.title || 'Assessment',
      passingScore: Number(quiz.passingScore) || 70,
      timeLimitMinutes: quiz.timeLimitMinutes === '' ? null : Number(quiz.timeLimitMinutes),
      maxAttempts: null,
      questionsPerAttempt: quiz.questions?.length || 1,
      randomizeQuestions: Boolean(quiz.randomizeQuestions),
      randomizeOptions: Boolean(quiz.randomizeOptions),
      questions: quiz.questions.map((question, index) => ({
        questionText: question.questionText.trim(),
        questionType: question.questionType || 'SINGLE_CHOICE',
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        orderIndex: index + 1
      }))
    });

    const deptAssignmentsPayload = (assignment.departmentAssignments || []).map(da => {
      let deptId = da.departmentId;
      if (!deptId) {
        const found = departments.find(d => d.label.toLowerCase() === (da.departmentName || '').toLowerCase());
        if (found && found.id) deptId = found.id;
      }
      return {
        departmentId: deptId ? Number(deptId) : null,
        departmentName: da.departmentName,
        assignmentType: da.assignmentType || 'MANDATORY',
        dueDate: da.dueDate || assignment.dueDate || null
      };
    });

    return {
      title: (courseInfo.title ?? '').trim(),
      departmentId: courseInfo.departmentId ? Number(courseInfo.departmentId) : null,
      departmentAssignments: deptAssignmentsPayload,
      level: courseInfo.position || courseInfo.level || 'P0',
      position: courseInfo.position || courseInfo.level || 'P0',
      duration: (courseInfo.duration ?? '').trim() ||
        (courseInfo.durationHours
          ? `${courseInfo.durationHours} Hours`
          : ''),
      durationHours: courseInfo.durationHours ? Number(courseInfo.durationHours) : null,
      banner: (courseInfo.banner ?? '').trim() || null,
      description: (courseInfo.description ?? '').trim(),
      passingScore: Number(finalQuiz.passingScore) || 70,
      foundation: Boolean(courseInfo.foundation),
      learningOutcomes: learningOutcomes.filter((item) => (item ?? '').trim()),
      certificateEligible: !courseInfo.foundation,
      publish,
      targetDepartments: deptAssignmentsPayload.filter(da => da.assignmentType === 'MANDATORY').map(da => da.departmentName),
      targetEmployeeIds,
      dueDate: assignment.dueDate || null,
      mandatory: deptAssignmentsPayload.some(da => da.assignmentType === 'MANDATORY'),
      modules: modules
        .filter((mod) => (mod.title ?? '').trim())
        .map((mod, index) => ({
          title: mod.title.trim(),
          orderIndex: index + 1,
          lessons: mod.lessons
            .filter((lesson) => (lesson.title ?? '').trim())
            .map((lesson, lessonIndex) => ({
              title: lesson.title.trim(),
              summary: (lesson.summary ?? '').trim() || null,
              type: lesson.type,
              contentUrl: (lesson.contentUrl ?? '').trim() || null,
              workdriveFileId: (lesson.workdriveFileId ?? '').trim() || null,
              workdriveFileName: (lesson.workdriveFileName ?? '').trim() || null,
              duration: (lesson.duration ?? '').trim() || null,
              orderIndex: lessonIndex + 1
            })),
          quiz: (!courseInfo.foundation && mod.quiz && mod.quiz.questions.some((question) =>
            (question.questionText ?? '').trim() && question.correctAnswer
          )) ? quizPayload({
            ...mod.quiz,
            questions: mod.quiz.questions.filter((question) =>
              question.questionText.trim() && question.correctAnswer
            )
          }) : null
        })),
      finalQuiz: courseInfo.foundation ? null : ((publish || finalQuiz.questions.some((question) =>
        question.questionText.trim() && question.correctAnswer
      )) ? quizPayload({
        ...finalQuiz,
        questions: finalQuiz.questions.filter((question) =>
          question.questionText.trim() && question.correctAnswer
        )
      }) : null)
    };
  };

  const saveCourse = async (publish) => {
    setError('');
    setNotice('');

    const uploadsInProgress = modules.some((mod) =>
      (mod.lessons || []).some((lesson) => lesson.uploading)
    );
    if (uploadsInProgress) {
      setError('Wait for all document uploads to finish before saving or publishing.');
      return;
    }

    if (!publish && !(courseInfo.title ?? '').trim()) {
      setCurrentStep(1);
      setError('Enter a course title before saving a draft.');
      return;
    }

    if (publish) {
      for (let step = 1; step <= 4; step++) {
        const validation = validateStep(step);
        if (validation) {
          setCurrentStep(step);
          setError(validation);
          return;
        }
      }
      if ((assignment.departmentAssignments || []).length === 0 && (assignment.targetDepartments || []).length === 0 && (assignment.selectedEmployeeIds || []).length === 0) {
        setCurrentStep(5);
        setError('Configure at least one department assignment (Mandatory or Recommended) or select at least one employee.');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        ...buildPayload(publish),
        ...(editingCourseId ? { courseId: editingCourseId } : {})
      };
      const endpoint = !editingCourseId
        ? '/courses'
        : `/drafts/${encodeURIComponent(editingCourseId)}`;
      const result = await apiRequest(endpoint, {
        method: editingCourseId ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      const savedCourseId = typeof result === 'string'
        ? result
        : result?.courseId ?? result?.id ?? result?.data?.courseId ?? result?.data?.id ?? '';
      if (savedCourseId) {
        setEditingCourseId(savedCourseId);
      }
      const courseId = typeof result === 'string'
        ? result
        : result?.courseId ?? result?.id ?? result?.data?.courseId ?? result?.data?.id ?? '';
      const savedCourse = {
        ...(typeof result === 'object' && result ? result : {}),
        id: courseId,
        courseId: savedCourseId,
        title: (courseInfo.title ?? '').trim(),
        level: courseInfo.position || courseInfo.level || 'P0',
        position: courseInfo.position || courseInfo.level || 'P0',
        duration: payload.duration,
        description: (courseInfo.description ?? '').trim(),
        modules: payload.modules,
        finalQuiz: payload.finalQuiz,
        assignment: {
          targetDepartments: [...assignment.targetDepartments],
          targetEmployeeIds: payload.targetEmployeeIds,
          dueDate: assignment.dueDate || null
        },
        published: publish,
        active: publish
      };
      if (typeof onPublish === 'function') onPublish(savedCourse);
      setNotice(publish
        ? `Course published successfully${courseId ? ` (ID: ${courseId})` : ''}.`
        : `Draft saved successfully${courseId ? ` (ID: ${courseId})` : ''}.`);
      if (publish) onClose?.();
    } catch (err) {
      setError(err?.message || `Could not ${publish ? 'publish' : 'save'} the course. Check the backend logs and try again.`);
    } finally {
      setSaving(false);
    }
  };

  const renderQuizEditor = (quiz, setter, heading) => (
    <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ color: '#0f172a' }}>{heading}</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            style={{ ...buttonStyle, background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
            onClick={() => setBulkImportTarget({ quiz, setter, heading })}
          >
            <Upload size={14} /> Bulk Import Questions
          </button>
          <button type="button" style={buttonStyle} onClick={() => addQuestion(setter)}>
            <Plus size={14} /> Add Question
          </button>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Assessment title</label>
        <input style={inputStyle} value={quiz.title} onChange={(e) => updateQuiz(setter, { title: e.target.value })} placeholder="Final Assessment" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <div><label style={labelStyle}>Passing score (%)</label><input style={inputStyle} type="number" min="0" max="100" value={quiz.passingScore} onChange={(e) => updateQuiz(setter, { passingScore: e.target.value })} /></div>
        <div><label style={labelStyle}>Time limit (min)</label><input style={inputStyle} type="number" min="1" value={quiz.timeLimitMinutes ?? ''} onChange={(e) => updateQuiz(setter, { timeLimitMinutes: e.target.value })} /></div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.85rem', color: '#334155' }}>
        <label><input type="checkbox" checked={quiz.randomizeQuestions} onChange={(e) => updateQuiz(setter, { randomizeQuestions: e.target.checked })} /> Randomize questions</label>
        <label><input type="checkbox" checked={quiz.randomizeOptions} onChange={(e) => updateQuiz(setter, { randomizeOptions: e.target.checked })} /> Randomize options</label>
      </div>
      {quiz.questions.map((question, index) => {
        const isMulti = question.questionType === 'MULTI_SELECT';
        const selectedOptions = String(question.correctAnswer || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

        return (
          <div key={index} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <strong style={{ fontSize: '0.86rem' }}>Question {index + 1}</strong>
                <select
                  style={{
                    padding: '3px 8px',
                    borderRadius: 5,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    background: isMulti ? '#fdf4ff' : '#f0f9ff',
                    color: isMulti ? '#86198f' : '#0369a1',
                    cursor: 'pointer'
                  }}
                  value={question.questionType || 'SINGLE_CHOICE'}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const updates = { questionType: newType };
                    if (newType === 'SINGLE_CHOICE') {
                      const first = String(question.correctAnswer || 'A').split(',')[0].trim().toUpperCase() || 'A';
                      updates.correctAnswer = ['A', 'B', 'C', 'D'].includes(first) ? first : 'A';
                    } else if (newType === 'MULTI_SELECT') {
                      if (!question.correctAnswer || !String(question.correctAnswer).includes(',')) {
                        updates.correctAnswer = question.correctAnswer ? `${question.correctAnswer},B` : 'A,B';
                      }
                    }
                    updateQuestion(setter, index, updates);
                  }}
                >
                  <option value="SINGLE_CHOICE">Single Choice (1 correct option)</option>
                  <option value="MULTI_SELECT">Multiple Answers (Select all that apply)</option>
                </select>
              </div>
              {quiz.questions.length > 1 && (
                <button type="button" aria-label="Remove question" style={{ ...buttonStyle, padding: 6, color: '#dc2626' }} onClick={() => removeQuestion(setter, index)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: 65, resize: 'vertical' }}
              value={question.questionText}
              onChange={(e) => updateQuestion(setter, index, { questionText: e.target.value })}
              placeholder="Enter the question"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
              {['A', 'B', 'C', 'D'].map((letter) => (
                <div key={letter}>
                  <label style={labelStyle}>Option {letter}</label>
                  <input
                    style={inputStyle}
                    value={question[`option${letter}`] || ''}
                    onChange={(e) => updateQuestion(setter, index, { [`option${letter}`]: e.target.value })}
                    placeholder={`Option ${letter}${letter === 'C' || letter === 'D' ? ' (optional)' : ''}`}
                  />
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <label style={{ ...labelStyle, margin: 0 }}>
                  {isMulti ? 'Correct Options (Select all that apply — minimum 2)' : 'Correct Option'}
                </label>
                {isMulti && (
                  selectedOptions.length < 2 ? (
                    <span style={{ color: '#d97706', fontSize: '0.75rem', fontWeight: 700 }}>
                      ⚠️ Select at least 2 correct options
                    </span>
                  ) : (
                    <span style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                      ✓ {selectedOptions.length} options selected ({selectedOptions.join(', ')})
                    </span>
                  )
                )}
              </div>

              {isMulti ? (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  {['A', 'B', 'C', 'D'].map((letter) => {
                    const isChecked = Array.isArray(selectedOptions) && selectedOptions.includes(letter);
                    return (
                      <label key={letter} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.84rem', fontWeight: isChecked ? 800 : 500, color: isChecked ? '#86198f' : '#334155' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            let next;
                            if (isChecked) {
                              next = selectedOptions.filter((l) => l !== letter);
                            } else {
                              next = [...selectedOptions, letter].sort();
                            }
                            updateQuestion(setter, index, { correctAnswer: next.join(',') });
                          }}
                        />
                        Option {letter}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <select
                  style={{ ...inputStyle, marginTop: 0 }}
                  value={question.correctAnswer}
                  onChange={(e) => updateQuestion(setter, index, { correctAnswer: e.target.value })}
                >
                  {['A', 'B', 'C', 'D'].map((letter) => (
                    <option key={letter} value={letter}>Option {letter}</option>
                  ))}
                </select>
              )}

              <div>
                <label style={labelStyle}>Explanation (optional)</label>
                <input
                  style={{ ...inputStyle, marginTop: 4 }}
                  value={question.explanation || ''}
                  onChange={(e) => updateQuestion(setter, index, { explanation: e.target.value })}
                  placeholder="Explain why this is the correct answer"
                />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="course-modal-overlay modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose?.(); }}>
      <div className="course-modal-container animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="course-modal-title">
        {/* Fixed Header */}
        <div className="course-modal-header">
          <div>
            <div className="course-modal-header-tag">Trainer Authoring Tool</div>
            <h2 id="course-modal-title" className="course-modal-title">{editingCourseId ? 'Edit Logistics Course' : 'Create Course'}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="course-modal-close-btn"><X size={20} /></button>
        </div>

        {/* Fixed Step Navigation */}
        <div className="course-modal-steps">
          {steps.map((label, index) => {
            const stepNum = index + 1;
            const active = currentStep === stepNum;
            const done = currentStep > stepNum;
            return (
              <div
                key={label}
                className="course-modal-step-item"
                style={{
                  fontWeight: active || done ? 800 : 600,
                  color: active ? '#0284c7' : done ? '#16a34a' : '#64748b',
                  cursor: done && !saving ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (done && !saving) {
                    setError('');
                    setNotice('');
                    setCurrentStep(stepNum);
                  }
                }}
              >
                <span style={{ flexShrink: 0, width: 23, height: 23, borderRadius: '50%', background: active ? '#0284c7' : done ? '#16a34a' : '#cbd5e1', color: '#fff', display: 'grid', placeItems: 'center' }}>{done ? '✓' : stepNum}</span>
                <span>{label.replace(/^\d+\.\s*/, '')}</span>
              </div>
            );
          })}
        </div>

        {/* Independently Scrollable Content */}
        <div className="course-modal-content">
          {error && <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 11, borderRadius: 8, fontSize: '0.88rem' }}><AlertCircle size={17} style={{ flexShrink: 0 }} />{error}</div>}
          {notice && <div role="status" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: 10, borderRadius: 8, fontSize: '0.85rem' }}>{notice}</div>}
          {loadingDraft && (
            <div style={{ color: '#0369a1', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={15} className="spin" />
              <span>Loading saved draft…</span>
            </div>
          )}
          {currentStep === 1 && <>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Step 1: Course Information & Ownership</h3>
            <div><label style={labelStyle}>Course title *</label><input style={inputStyle} value={courseInfo.title} onChange={(e) => setCourseInfo({ ...courseInfo, title: e.target.value })} placeholder="Enter course title" /></div>

            {/* Course Ownership Section */}
            <div style={{ ...panelStyle, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
              <label style={{ ...labelStyle, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span>Owning Department <span style={{ color: '#e11d48' }}>*</span></span>
                {loadingDepartments && departments.length === 0 && (
                  <span style={{ color: '#0284c7', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Loader2 size={12} className="spin" /> Loading departments…
                  </span>
                )}
              </label>
              <select
                style={{ ...inputStyle, marginTop: 4, background: '#fff' }}
                value={courseInfo.departmentId || ''}
                onChange={(e) => setCourseInfo((old) => ({ ...old, departmentId: e.target.value }))}
                required
                disabled={loadingDepartments && departments.length === 0}
              >
                <option value="">
                  {loadingDepartments && departments.length === 0
                    ? '-- Loading departments… --'
                    : '-- Select Course Owning Department --'}
                </option>
                {departments.map((dept) => (
                  <option key={dept.id || dept.value} value={dept.id || dept.value}>
                    {dept.label} {dept.shortCode ? `(${dept.shortCode})` : ''}
                  </option>
                ))}
              </select>
              {departmentError && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6, padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: '0.8rem' }}>
                  <span>{departmentError}</span>
                  <button
                    type="button"
                    onClick={() => loadDepartments(true)}
                    style={{ ...buttonStyle, padding: '3px 8px', fontSize: '0.75rem', background: '#fff', color: '#b91c1c', borderColor: '#fca5a5' }}
                  >
                    Retry
                  </button>
                </div>
              )}
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.78rem', lineHeight: 1.45 }}>
                Centralized HR/Admin and Trainers can assign course ownership to any department independently of authoring accounts.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div><label style={labelStyle}>Position *</label><select style={inputStyle} value={courseInfo.position || courseInfo.level || 'P0'} onChange={(e) => setCourseInfo({ ...courseInfo, level: e.target.value, position: e.target.value })}><option value="P0">P0 — Trainee</option><option value="P1">P1 — Assistant</option><option value="P2">P2 — Executive / Senior Executive</option><option value="P3">P3 — Assistant Manager / Manager / Senior Manager</option><option value="P4">P4 — Vice President</option></select></div>
              <div><label style={labelStyle}>Duration label</label><input style={inputStyle} value={courseInfo.duration} onChange={(e) => setCourseInfo({ ...courseInfo, duration: e.target.value })} placeholder="e.g. 3 Hours" /></div>
              <div><label style={labelStyle}>Duration (hours)</label><input style={inputStyle} type="number" min="0" step="1" value={courseInfo.durationHours} onChange={(e) => setCourseInfo({ ...courseInfo, durationHours: e.target.value })} placeholder="e.g. 3" /></div>
            </div>
            <div><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={courseInfo.description} onChange={(e) => setCourseInfo({ ...courseInfo, description: e.target.value })} placeholder="Describe what employees will learn" /></div>
            {/* Course Thumbnail */}
            <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={labelStyle}>Course Thumbnail (PNG, JPEG, WEBP — max 5 MB)</label>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                {(thumbnailPreview || courseInfo.banner) ? (
                  <div style={{ position: 'relative', width: 140, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>
                    <img
                      src={resolveBannerUrl(thumbnailPreview || courseInfo.banner)}
                      alt="Thumbnail preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/fairmacs-default-thumbnail.png';
                        e.currentTarget.style.objectFit = 'contain';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ width: 140, height: 80, borderRadius: 8, border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', gap: 4 }}>
                    <ImageIcon size={20} />
                    <span>No thumbnail</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ ...buttonStyle, cursor: uploadingThumbnail ? 'wait' : 'pointer', background: '#0284c7', color: '#fff', border: 'none' }}>
                      <Upload size={14} />
                      {uploadingThumbnail ? 'Uploading…' : (courseInfo.banner ? 'Replace Thumbnail' : 'Upload Thumbnail')}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: 'none' }}
                        disabled={uploadingThumbnail}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setError('');
                          const localPreview = URL.createObjectURL(file);
                          setThumbnailPreview(localPreview);
                          setUploadingThumbnail(true);
                          try {
                            const res = await uploadThumbnailImage(file);
                            setCourseInfo((prev) => ({ ...prev, banner: res.url }));
                            setThumbnailPreview(res.url);
                            setNotice('Thumbnail uploaded to Zoho WorkDrive successfully.');
                          } catch (err) {
                            setThumbnailPreview(courseInfo.banner || '');
                            setError(err.message || 'Thumbnail upload failed.');
                          } finally {
                            try { URL.revokeObjectURL(localPreview); } catch { }
                            setUploadingThumbnail(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    {courseInfo.banner && (
                      <button
                        type="button"
                        style={{ ...buttonStyle, color: '#dc2626' }}
                        onClick={() => {
                          setCourseInfo((prev) => ({ ...prev, banner: '' }));
                          setThumbnailPreview('');
                        }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                  <input
                    style={{ ...inputStyle, marginTop: 0, fontSize: '0.8rem' }}
                    value={courseInfo.banner || ''}
                    onChange={(e) => {
                      setCourseInfo({ ...courseInfo, banner: e.target.value });
                      setThumbnailPreview(e.target.value);
                    }}
                    placeholder="Or enter a thumbnail image URL directly"
                  />
                </div>
              </div>
            </div>

            {/* What you'll learn */}
            <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>What you'll learn</strong>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>Specify the learning outcomes for this course</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputStyle, marginTop: 0 }}
                  value={newOutcomeText}
                  onChange={(e) => setNewOutcomeText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newOutcomeText.trim()) {
                        setLearningOutcomes([...learningOutcomes, newOutcomeText.trim()]);
                        setNewOutcomeText('');
                      }
                    }
                  }}
                  placeholder="e.g. Master international freight documentation compliance"
                />
                <button
                  type="button"
                  style={{ ...buttonStyle, background: '#0284c7', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    if (newOutcomeText.trim()) {
                      setLearningOutcomes([...learningOutcomes, newOutcomeText.trim()]);
                      setNewOutcomeText('');
                    }
                  }}
                >
                  <Plus size={14} /> Add Outcome
                </button>
              </div>

              {learningOutcomes.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic', padding: '4px 0' }}>
                  No learning outcomes added yet. Add at least one outcome before publishing.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {learningOutcomes.map((outcome, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', minWidth: 20 }}>{idx + 1}.</span>
                      <input
                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.85rem', color: '#0f172a', background: 'transparent' }}
                        value={outcome}
                        onChange={(e) => {
                          const updated = [...learningOutcomes];
                          updated[idx] = e.target.value;
                          setLearningOutcomes(updated);
                        }}
                      />
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          style={{ ...buttonStyle, padding: 3, opacity: idx === 0 ? 0.3 : 1 }}
                          onClick={() => {
                            if (idx === 0) return;
                            const updated = [...learningOutcomes];
                            const temp = updated[idx - 1];
                            updated[idx - 1] = updated[idx];
                            updated[idx] = temp;
                            setLearningOutcomes(updated);
                          }}
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === learningOutcomes.length - 1}
                          style={{ ...buttonStyle, padding: 3, opacity: idx === learningOutcomes.length - 1 ? 0.3 : 1 }}
                          onClick={() => {
                            if (idx === learningOutcomes.length - 1) return;
                            const updated = [...learningOutcomes];
                            const temp = updated[idx + 1];
                            updated[idx + 1] = updated[idx];
                            updated[idx] = temp;
                            setLearningOutcomes(updated);
                          }}
                        >
                          <ChevronDown size={13} />
                        </button>
                        <button
                          type="button"
                          style={{ ...buttonStyle, padding: 3, color: '#dc2626' }}
                          onClick={() => {
                            setLearningOutcomes(learningOutcomes.filter((_, i) => i !== idx));
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Course Category & Assessment Model */}
            <div style={{ ...panelStyle, background: courseInfo.foundation ? '#f0fdf4' : '#fff', border: courseInfo.foundation ? '2px solid #86efac' : '1px solid #cbd5e1' }}>
              <label style={{ ...labelStyle, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                Course Category & Assessment Model <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 8 }}>
                <label style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 8, cursor: 'pointer',
                  border: !courseInfo.foundation ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  background: !courseInfo.foundation ? '#f0f9ff' : '#fff'
                }}>
                  <input
                    type="radio"
                    name="courseType"
                    checked={!courseInfo.foundation}
                    onChange={() => setCourseInfo((prev) => ({ ...prev, foundation: false }))}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>Standard Operational Course</strong>
                    <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.78rem', lineHeight: 1.4 }}>
                      Full training with lessons, module quizzes, final assessment, and verifiable completion certificate.
                    </p>
                  </div>
                </label>
                <label style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 8, cursor: 'pointer',
                  border: courseInfo.foundation ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: courseInfo.foundation ? '#f0fdf4' : '#fff'
                }}>
                  <input
                    type="radio"
                    name="courseType"
                    checked={courseInfo.foundation}
                    onChange={() => {
                      const generalDept = departments.find((d) => (d.label || d.value || '').toLowerCase().includes('general'));
                      setCourseInfo((prev) => ({
                        ...prev,
                        foundation: true,
                        departmentId: generalDept ? String(generalDept.id || generalDept.value) : prev.departmentId
                      }));
                    }}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <strong style={{ color: '#166534', fontSize: '0.88rem' }}>Foundation Course (Introductory / Non-Assessed)</strong>
                    <p style={{ margin: '3px 0 0', color: '#166534', fontSize: '0.78rem', lineHeight: 1.4 }}>
                      Lessons only. No quizzes, no final assessment, and no certificate. Completing all lessons yields 100% course completion.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </>}

          {currentStep === 2 && <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Step 2: Modules & Lessons</h3><button type="button" style={buttonStyle} onClick={addModule}><Plus size={15} /> Add module</button></div>
            {modules.map((mod, moduleIndex) => <div key={mod.localId} style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><strong style={{ color: '#0284c7' }}>Module {moduleIndex + 1}</strong><div style={{ flex: 1 }} />{modules.length > 1 && <button type="button" style={{ ...buttonStyle, color: '#dc2626', padding: 6 }} onClick={() => removeModule(moduleIndex)}><Trash2 size={14} /> Remove</button>}</div>
              <div><label style={labelStyle}>Module title *</label><input style={inputStyle} value={mod.title} onChange={(e) => updateModule(moduleIndex, { title: e.target.value })} placeholder="e.g. Import Documentation" /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><strong style={{ fontSize: '0.88rem' }}>Lessons</strong><button type="button" style={buttonStyle} onClick={() => addLesson(moduleIndex)}><Plus size={14} /> Add lesson</button></div>
              {mod.lessons.map((lesson, lessonIndex) => <div key={lessonIndex} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 11, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '0.82rem', fontWeight: 800 }}>Lesson {lessonIndex + 1}</span>{mod.lessons.length > 1 && <button type="button" style={{ ...buttonStyle, padding: 5, color: '#dc2626' }} onClick={() => removeLesson(moduleIndex, lessonIndex)}><Trash2 size={13} /></button>}</div>
                <div><label style={labelStyle}>Lesson title *</label><input style={inputStyle} value={lesson.title} onChange={(e) => updateLesson(moduleIndex, lessonIndex, { title: e.target.value })} placeholder="Lesson title" /></div>
                <div><label style={labelStyle}>Content type</label><select style={inputStyle} value={lesson.type} onChange={(e) => updateLesson(moduleIndex, lessonIndex, { type: e.target.value })}><option value="VIDEO">Video</option><option value="PDF">PDF</option><option value="DOCUMENT">Document</option><option value="LINK">External link</option></select></div>
                <div><label style={labelStyle}>Duration</label><input style={inputStyle} value={lesson.duration} onChange={(e) => updateLesson(moduleIndex, lessonIndex, { duration: e.target.value })} placeholder="e.g. 5 mins" /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Lesson summary *</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={lesson.summary || ''} onChange={(e) => updateLesson(moduleIndex, lessonIndex, { summary: e.target.value })} placeholder="Enter key takeaways and operational summary for this lesson..." /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Video / PDF / content URL</label><input style={inputStyle} value={lesson.contentUrl} onChange={(e) => updateLesson(moduleIndex, lessonIndex, { contentUrl: e.target.value })} placeholder="Paste hosted content URL (YouTube, PDF link, etc.)" /></div>
              </div>)}
              {!courseInfo.foundation ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.88rem' }}>Module quiz</strong>
                    <button type="button" style={buttonStyle} onClick={() => updateModule(moduleIndex, { quiz: mod.quiz ? null : makeQuiz(`${mod.title || `Module ${moduleIndex + 1}`} Quiz`) })}>
                      {mod.quiz ? 'Remove module quiz' : 'Add module quiz'}
                    </button>
                  </div>
                  {mod.quiz && renderQuizEditor(mod.quiz, (updater) => setModules((old) => old.map((item, index) => index !== moduleIndex ? item : { ...item, quiz: typeof updater === 'function' ? updater(item.quiz) : { ...item.quiz, ...updater } })), `Module ${moduleIndex + 1} Quiz`)}
                </>
              ) : (
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, color: '#64748b', fontSize: '0.82rem', border: '1px dashed #cbd5e1' }}>
                  ℹ️ Foundation courses are introductory and do not include module quizzes.
                </div>
              )}
            </div>)}
          </>}

          {currentStep === 3 && <>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Step 3: Videos, PDFs & Assets</h3>
            <div style={{ ...panelStyle, display: 'flex', gap: 12, alignItems: 'flex-start', background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <Upload color="#0284c7" size={22} />
              <div>
                <strong style={{ color: '#0f172a' }}>Upload lesson documents to Zoho WorkDrive</strong>
                <p style={{ margin: '5px 0 0', color: '#475569', fontSize: '0.87rem', lineHeight: 1.5 }}>
                  PDF and DOCX files are uploaded to Zoho WorkDrive immediately. Their file IDs are included when you save the course. Video lessons must use a hosted video URL entered in Step 2.
                </p>
              </div>
            </div>
            {modules.map((mod, moduleIndex) => <div key={mod.localId} style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>{mod.title || `Module ${moduleIndex + 1}`}</strong>
                <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 3 }}>{mod.lessons.length} lesson{mod.lessons.length === 1 ? '' : 's'}</div>
              </div>
              {mod.lessons.map((lesson, lessonIndex) => {
                const file = lesson.assetFile;
                const isDocumentLesson = lesson.type === 'PDF' || lesson.type === 'DOCUMENT';
                const sizeLabel = file
                  ? (file.size < 1024 * 1024
                    ? `${(file.size / 1024).toFixed(0)} KB`
                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`)
                  : '';

                return <div key={`${mod.localId}-${lessonIndex}`} style={{ background: '#fff', border: '1px solid #dbe4ee', borderRadius: 10, padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: '#e0f2fe', color: '#0284c7', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {isDocumentLesson ? <FileText size={20} /> : <Video size={20} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{lesson.title || `Lesson ${lessonIndex + 1}`}</strong>
                      <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 3 }}>
                        {lesson.type === 'VIDEO' ? 'Hosted video URL' : lesson.type === 'PDF' ? 'PDF document' : lesson.type === 'DOCUMENT' ? 'PDF or DOCX document' : 'External link lesson'}
                      </div>
                    </div>
                    {lesson.workdriveFileId && <span style={{ color: '#047857', fontSize: '0.75rem', fontWeight: 800, background: '#dcfce7', padding: '4px 7px', borderRadius: 20 }}>Uploaded</span>}
                  </div>

                  {lesson.type === 'LINK' ? (
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>This lesson uses the external URL entered in Step 2.</div>
                  ) : lesson.type === 'VIDEO' ? (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 11, color: '#475569', fontSize: '0.84rem', lineHeight: 1.5 }}>
                      Video files are not uploaded through the document endpoint. Add a hosted video URL (for example, an approved YouTube URL) in Step 2.
                      {lesson.contentUrl && <div style={{ marginTop: 6, overflowWrap: 'anywhere' }}>Hosted URL: {lesson.contentUrl}</div>}
                    </div>
                  ) : (
                    <>
                      <label style={{ border: '1px dashed #7dd3fc', background: '#f0f9ff', borderRadius: 9, padding: '15px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, textAlign: 'center', cursor: lesson.uploading ? 'wait' : 'pointer', opacity: lesson.uploading ? 0.7 : 1 }}>
                        <Upload size={22} color="#0284c7" />
                        <strong style={{ color: '#0369a1', fontSize: '0.88rem' }}>
                          {lesson.uploading ? 'Uploading to Zoho WorkDrive…' : lesson.workdriveFileId ? 'Replace uploaded document' : 'Choose PDF or DOCX'}
                        </strong>
                        <span style={{ color: '#64748b', fontSize: '0.78rem' }}>PDF or DOCX · Maximum 20 MB</span>
                        <input
                          type="file"
                          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          disabled={lesson.uploading || saving}
                          style={{ display: 'block', maxWidth: '100%', fontSize: '0.82rem', marginTop: 3 }}
                          onChange={async (event) => {
                            const selected = event.target.files?.[0];
                            event.target.value = '';
                            if (!selected) return;

                            setError('');
                            setNotice('');
                            updateLesson(moduleIndex, lessonIndex, { uploading: true, assetFile: null });

                            try {
                              const uploaded = await uploadLessonDocument(selected);
                              updateLesson(moduleIndex, lessonIndex, {
                                assetFile: selected,
                                workdriveFileId: String(uploaded.fileId),
                                workdriveFileName: uploaded.fileName || selected.name,
                                uploading: false
                              });
                              setNotice(`${uploaded.fileName || selected.name} uploaded to Zoho WorkDrive.`);
                            } catch (uploadError) {
                              updateLesson(moduleIndex, lessonIndex, {
                                assetFile: null,
                                workdriveFileId: '',
                                workdriveFileName: '',
                                uploading: false
                              });
                              setError(uploadError?.message || 'Document upload failed.');
                            }
                          }}
                        />
                      </label>

                      {lesson.uploading && <div role="status" style={{ color: '#0369a1', fontSize: '0.82rem' }}>Please keep this course wizard open until the upload finishes.</div>}

                      {lesson.workdriveFileId && !lesson.uploading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 8 }}>
                          <FileText size={20} color="#15803d" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', overflowWrap: 'anywhere' }}>{lesson.workdriveFileName || file?.name || 'Uploaded document'}</div>
                            <div style={{ fontSize: '0.76rem', color: '#15803d', marginTop: 2 }}>
                              {file ? `${sizeLabel} · ` : ''}Saved in Zoho WorkDrive · File ID: {lesson.workdriveFileId}
                            </div>
                          </div>
                          <button
                            type="button"
                            style={{ ...buttonStyle, color: '#b91c1c', padding: 7 }}
                            disabled={saving || lesson.uploading}
                            onClick={() => {
                              updateLesson(moduleIndex, lessonIndex, {
                                assetFile: null,
                                workdriveFileId: '',
                                workdriveFileName: ''
                              });
                              setNotice('Document reference removed from this lesson. The file remains in Zoho WorkDrive.');
                            }}
                          >
                            <Trash2 size={14} /> Remove reference
                          </button>
                        </div>
                      )}

                      {!lesson.workdriveFileId && lesson.contentUrl && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', overflowWrap: 'anywhere' }}>External content URL from Step 2: {lesson.contentUrl}</div>
                      )}
                    </>
                  )}
                </div>;
              })}
            </div>)}
          </>}

          {currentStep === 4 && <>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Step 4: Assessment & Certificate Settings</h3>
            {courseInfo.foundation ? (
              <div style={{ ...panelStyle, background: '#f0fdf4', borderColor: '#bbf7d0', display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#166534', fontWeight: 800, fontSize: '1rem' }}>
                  <CheckCircle2 size={22} /> Foundation Course — Assessment & Certificate Exempt
                </div>
                <p style={{ margin: 0, color: '#166534', fontSize: '0.88rem', lineHeight: 1.6 }}>
                  This course is configured as a <strong>Foundation Course</strong>. In accordance with LMS curriculum standards, Foundation courses are introductory and non-assessed.
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#166534', fontSize: '0.84rem', lineHeight: 1.6 }}>
                  <li>Completing all video and document lessons marks employee progress at <strong>100%</strong>.</li>
                  <li>No module quizzes or final assessments are required.</li>
                  <li>No completion certificates are issued for Foundation courses.</li>
                </ul>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: '#eff6ff', border: '1px solid #bfdbfe', padding: 11, borderRadius: 8, color: '#1e40af', fontSize: '0.85rem' }}><Award size={18} /> Passing this final assessment triggers certificate issuance with the assigned department prefix. Configure questions and scoring below.</div>
                {renderQuizEditor(finalQuiz, setFinalQuiz, 'Final assessment')}
              </>
            )}
          </>}

          {currentStep === 5 && <>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Step 5: Department Assignments & Recommendations</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Configure department assignments with distinct classifications (Mandatory or Recommended) and optional department-specific due dates.
            </p>

            <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>Department Assignments</strong>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                  Select target departments and set assignment type (Mandatory or Recommended) per department.
                </p>
              </div>

              {/* Department Selector */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  style={{ ...inputStyle, marginTop: 0, flex: 1, minWidth: 220, background: '#fff' }}
                  value={selectedDeptToAdd}
                  onChange={(e) => setSelectedDeptToAdd(e.target.value)}
                >
                  <option value="">-- Select department to assign --</option>
                  {departments
                    .filter(dept => !(assignment.departmentAssignments || []).some(da => String(da.departmentId) === String(dept.id || dept.value) || da.departmentName.toLowerCase() === dept.label.toLowerCase()))
                    .map(dept => (
                      <option key={dept.id || dept.value} value={dept.id || dept.value}>
                        {dept.label} {dept.shortCode ? `(${dept.shortCode})` : ''}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  style={{ ...buttonStyle, background: '#0284c7', color: '#fff', border: 'none', padding: '0.55rem 1rem' }}
                  onClick={() => addDepartmentAssignment(selectedDeptToAdd)}
                  disabled={!selectedDeptToAdd}
                >
                  + Add Department
                </button>
              </div>

              {/* Assignments Table */}
              {(assignment.departmentAssignments || []).length > 0 ? (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1.2fr 80px', gap: 10, padding: '9px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    <div>Department</div>
                    <div>Assignment</div>
                    <div>Due Date</div>
                    <div style={{ textAlign: 'center' }}>Action</div>
                  </div>
                  {assignment.departmentAssignments.map((da, idx) => (
                    <div key={da.departmentId || da.departmentName} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1.2fr 80px', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: idx === assignment.departmentAssignments.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{da.departmentName}</strong>
                        {da.shortCode && <span style={{ marginLeft: 6, fontSize: '0.72rem', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>{da.shortCode}</span>}
                      </div>
                      <div>
                        <select
                          value={da.assignmentType}
                          onChange={(e) => updateDepartmentAssignment(idx, { assignmentType: e.target.value })}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            border: `1px solid ${da.assignmentType === 'MANDATORY' ? '#fecaca' : '#bbf7d0'}`,
                            background: da.assignmentType === 'MANDATORY' ? '#fef2f2' : '#f0fdf4',
                            color: da.assignmentType === 'MANDATORY' ? '#b91c1c' : '#15803d',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="MANDATORY">Mandatory</option>
                          <option value="RECOMMENDED">Recommended</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="date"
                          value={da.dueDate || ''}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => updateDepartmentAssignment(idx, { dueDate: e.target.value })}
                          style={{ ...inputStyle, marginTop: 0, padding: '4px 8px', fontSize: '0.82rem' }}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeDepartmentAssignment(idx)}
                          style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                  No departments added yet. Select a department from the dropdown above and click "+ Add Department".
                </div>
              )}
            </section>

            <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <strong style={{ color: '#0f172a' }}>Recommended training</strong>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>Select individual employees who may take this course optionally.</p>
              </div>
              <label style={labelStyle}><Users size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Select employees</label>
              <input style={inputStyle} value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} placeholder="Search by name, email, department, designation, or position (P0-P4)…" />
              <small style={{ color: '#64748b' }}>Tick the checkbox beside each employee. Search alone does not select anyone.</small>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <small style={{ color: '#64748b' }}>{assignment.selectedEmployeeIds.length} employee(s) selected</small>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => setAssignment((old) => ({
                    ...old,
                    selectedEmployeeIds: [...new Set([...old.selectedEmployeeIds, ...filteredEmployees.map((e) => e.id)])]
                  }))}
                  disabled={!filteredEmployees.length}
                >
                  Select all filtered
                </button>
              </div>
              <div style={{ maxHeight: 230, overflowY: 'auto', border: '1px solid #dbe4ee', borderRadius: 8, background: '#fff' }}>
                {loadingEmployees && employees.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, color: '#64748b' }}>
                    <Loader2 size={16} className="spin" />
                    <span>Loading employees…</span>
                  </div>
                ) : employeeLoadError && employees.length === 0 ? (
                  <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#fffbeb', color: '#b45309', fontSize: '0.84rem' }}>
                    <span>{employeeLoadError}</span>
                    <button
                      type="button"
                      onClick={() => loadEmployees(true)}
                      style={{ ...buttonStyle, padding: '3px 8px', fontSize: '0.75rem', borderColor: '#fde68a', background: '#fff' }}
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredEmployees.length ? (
                  filteredEmployees.map((employee) => (
                    <label key={employee.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.86rem' }}>
                      <input
                        type="checkbox"
                        checked={assignment.selectedEmployeeIds.includes(employee.id)}
                        onChange={() => setAssignment((old) => ({
                          ...old,
                          selectedEmployeeIds: old.selectedEmployeeIds.includes(employee.id)
                            ? old.selectedEmployeeIds.filter((id) => id !== employee.id)
                            : [...old.selectedEmployeeIds, employee.id]
                        }))}
                      />
                      <span style={{ flex: 1 }}>
                        <strong style={{ display: 'block', color: '#0f172a' }}>{employee.name}</strong>
                        <small style={{ color: '#64748b' }}>
                          {employee.email}{employee.department ? ` · ${employee.department}` : ''}{employee.designation ? ` · ${employee.designation}` : ''}{employee.position ? ` · Band ${employee.position}` : ''}
                        </small>
                      </span>
                      {assignment.targetDepartments.includes(employee.department) && (
                        <small style={{ color: '#b45309', fontWeight: 700 }}>Mandatory priority</small>
                      )}
                    </label>
                  ))
                ) : (
                  <p style={{ padding: 12, color: '#64748b', margin: 0 }}>
                    {employees.length ? 'No employees match your search.' : 'No employees are available to select.'}
                  </p>
                )}
              </div>
              {assignment.selectedEmployeeIds.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{employees.filter((employee) => assignment.selectedEmployeeIds.includes(employee.id)).map((employee) => <span key={employee.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e0f2fe', color: '#075985', padding: '5px 8px', borderRadius: 999, fontSize: '0.78rem' }}>{employee.name}<button type="button" aria-label={`Remove ${employee.name}`} onClick={() => setAssignment((old) => ({ ...old, selectedEmployeeIds: old.selectedEmployeeIds.filter((id) => id !== employee.id) }))} style={{ border: 0, background: 'transparent', color: '#075985', cursor: 'pointer', padding: 0 }}>×</button></span>)}</div>}
            </section>
            <div><label style={labelStyle}>Due date*</label><input style={inputStyle} type="date" value={assignment.dueDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setAssignment({ ...assignment, dueDate: e.target.value })} /></div>
          </>}

          {currentStep === 6 && <>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Step 6: Review & Publishing</h3>
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <strong style={{ color: '#166534' }}>Review course details</strong>
              <div style={{ marginTop: 8, color: '#166534', fontSize: '0.88rem', lineHeight: 1.8 }}>
                Title: <strong>{courseInfo.title || '—'}</strong><br />
                Type: <strong>{courseInfo.foundation ? 'Foundation Course (Introductory, No Quizzes/Certs)' : 'Standard Operational Course'}</strong><br />
                Position: <strong>{courseInfo.position || courseInfo.level}</strong><br />
                Modules: <strong>{modules.length}</strong><br />
                Lessons: <strong>{modules.reduce((total, mod) => total + mod.lessons.length, 0)}</strong><br />
                Final questions: <strong>{courseInfo.foundation ? 'Exempt' : finalQuiz.questions.length}</strong><br />
                Mandatory departments: <strong>{assignment.targetDepartments.length}</strong><br />
                Recommended employees: <strong>{assignment.selectedEmployeeIds.length}</strong><br />
                Due date: <strong>{assignment.dueDate || 'Not set'}</strong>
              </div>
            </div>
            <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <strong style={{ color: '#0f172a' }}>Mandatory departments</strong>
              <div style={{ color: '#475569', fontSize: '0.88rem' }}>{assignment.targetDepartments.length ? assignment.targetDepartments.join(', ') : 'No mandatory departments selected.'}</div>
              <strong style={{ color: '#0f172a', marginTop: 8 }}>Recommended employees</strong>
              <div style={{ color: '#475569', fontSize: '0.88rem' }}>{employees.filter((employee) => assignment.selectedEmployeeIds.includes(employee.id)).map((employee) => employee.name).join(', ') || 'No recommended employees selected.'}</div>
            </section>
            <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>Review the course and both assignment lists before publishing. PDF/DOCX documents uploaded in Step 3 are stored in Zoho WorkDrive, and their file IDs are sent to the backend with the lesson. Video lessons must use a hosted URL entered in Step 2.</div>
          </>}
        </div>

        {/* Fixed Footer */}
        <div className="course-modal-footer">
          <button type="button" style={{ ...buttonStyle, opacity: currentStep === 1 ? 0.5 : 1 }} onClick={() => { setError(''); setCurrentStep((step) => Math.max(1, step - 1)); }} disabled={currentStep === 1 || saving}><ChevronLeft size={16} /> Back</button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" style={buttonStyle} onClick={() => saveCourse(false)} disabled={saving}>{saving ? 'Saving…' : <><Save size={15} /> Save draft</>}</button>
            {currentStep < 6 ? <button type="button" style={primaryStyle} onClick={goNext} disabled={saving}>Continue <ChevronRight size={16} /></button> : <button type="button" style={{ ...primaryStyle, background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => saveCourse(true)} disabled={saving}>{saving ? 'Publishing…' : <><CheckCircle2 size={17} /> Publish course</>}</button>}
          </div>
        </div>
      </div>

      {bulkImportTarget && (
        <Suspense fallback={null}>
          <BulkQuizImportModal
            isOpen={Boolean(bulkImportTarget)}
            targetTitle={bulkImportTarget.heading}
            onClose={() => setBulkImportTarget(null)}
            onImportQuestions={handleBulkImportQuestions}
          />
        </Suspense>
      )}
    </div>,
    document.body
  );
}
