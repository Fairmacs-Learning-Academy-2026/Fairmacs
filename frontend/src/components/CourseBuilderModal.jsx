import React, { useEffect, useState } from 'react';
import {
  X, CheckCircle2, ChevronRight, ChevronLeft, Plus, Trash2,
  FileText, Video, Upload, Save, AlertCircle, Users, Building2, Award, ExternalLink, XCircle
} from 'lucide-react';

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
  title, passingScore: 70, timeLimitMinutes: 15, maxAttempts: 3,
  questionsPerAttempt: 1, randomizeQuestions: true, randomizeOptions: true,
  questions: [makeQuestion()]
});
const makeLesson = (orderIndex = 1) => ({
  title: '',
  type: 'VIDEO',
  contentUrl: '',
  duration: '',
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

export default function CourseBuilderModal({ courseId = '', initialCourseId = '', onClose, onPublish }) {
  const resolvedCourseId = String(courseId || initialCourseId || '').trim();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeLoadError, setEmployeeLoadError] = useState('');
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [editingCourseId, setEditingCourseId] = useState(resolvedCourseId);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(resolvedCourseId));

  const [courseInfo, setCourseInfo] = useState({
    title: '', level: 'L0', duration: '', durationHours: '',
    description: '', banner: '', foundation: false
  });
  const [modules, setModules] = useState([makeModule(1)]);
  const [finalQuiz, setFinalQuiz] = useState(makeQuiz('Final Assessment'));
  const [assignment, setAssignment] = useState({
    targetDepartments: [], selectedEmployeeIds: [], dueDate: ''
  });

  const steps = [
    '1. Course Info', '2. Modules & Lessons', '3. Videos & PDFs',
    '4. Quiz & Cert', '5. Training Assignment', '6. Review & Publish'
  ];

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingLookups(true);
      const [departmentResult, employeeResult] = await Promise.allSettled([
        apiRequest('/departments'),
        apiRequest('/hr/employees')
      ]);
      if (!alive) return;
      if (departmentResult.status === 'fulfilled') {
        const departmentData = departmentResult.value;
        const departmentRows = Array.isArray(departmentData)
          ? departmentData
          : departmentData?.departments ?? departmentData?.content ?? departmentData?.data ?? [];
        const normalizedDepartments = Array.isArray(departmentRows)
          ? departmentRows.map((item) => {
              if (typeof item === 'string') return { label: item, value: item };
              const label = item.name || item.departmentName || item.label || '';
              const value = item.name || item.departmentName || item.value || label;
              return { label: String(label), value: String(value) };
            }).filter((item) => item.label && item.value)
          : [];
        setDepartments(normalizedDepartments);
        if (!normalizedDepartments.length) {
          setNotice('No departments were returned by the backend. Verify GET /api/departments.');
        }
      } else {
        setDepartments([]);
        setNotice(`Departments could not be loaded: ${departmentResult.reason?.message || 'unknown error'}.`);
      }
      if (employeeResult.status === 'fulfilled') {
        const responseData = employeeResult.value;
        const employeeRows = Array.isArray(responseData)
          ? responseData
          : responseData?.employees ?? responseData?.content ?? responseData?.data ?? responseData?.results ?? [];
        if (!Array.isArray(employeeRows)) {
          setEmployees([]);
          setEmployeeLoadError('The employee endpoint returned an unexpected response format. Verify its JSON response.');
        } else {
          const normalizedEmployees = employeeRows.map((employee) => {
            const id = employee.id ?? employee.employeeId ?? employee.userId ?? employee.user?.id;
            const email = employee.email ?? employee.officeEmail ?? employee.workEmail ?? employee.user?.email ?? '';
            const joinedName = [employee.firstName, employee.lastName].filter(Boolean).join(' ');
            const name = employee.name ?? employee.fullName ?? employee.employeeName ?? (joinedName || email);
            return {
              id: String(id ?? ''),
              name: String(name || email || `Employee ${id ?? ''}`),
              email: String(email),
              department: employee.departmentName ?? employee.department?.name ?? employee.department ?? ''
            };
          }).filter((employee) => employee.id && employee.id !== 'undefined');
          setEmployees(normalizedEmployees);
          setEmployeeLoadError(
            normalizedEmployees.length
              ? ''
              : 'The employee endpoint returned no usable employee records. Verify the endpoint response and employee fields.'
          );
        }
      } else {
        setEmployees([]);
        setEmployeeLoadError(`Employee list request failed: ${employeeResult.reason?.message || 'unknown error'}. Verify the backend route, authentication, and permissions.`);
      }
      setLoadingLookups(false);
    })();
    return () => { alive = false; };
  }, []);
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
        const payload = result?.draftPayload
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
          level: payload.level || 'L0',
          duration: payload.duration || '',
          durationHours: payload.durationHours ?? '',
          description: payload.description || result.description || '',
          banner: payload.banner || '',
          foundation: Boolean(payload.foundation)
        });
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
        const restoredModules = Array.isArray(payload.modules)
          ? payload.modules
            .filter((mod) => mod && typeof mod === 'object')
            .map((mod, index) => ({
              ...makeModule(index + 1),
              title: mod.title ?? '',
              orderIndex: mod.orderIndex ?? index + 1,
              lessons: Array.isArray(mod.lessons)
                ? mod.lessons
                .filter((lesson) => lesson && typeof lesson === 'object')
                .map((lesson, lessonIndex) => ({
                  ...makeLesson(lessonIndex + 1),
                  ...lesson,
                  title: lesson.title ?? '',
                  contentUrl: lesson.contentUrl ?? lesson.assetUrl ?? '',
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
          normalizeQuiz(payload.finalQuiz, 'Final Assessment')
          || makeQuiz('Final Assessment')
        );
        setAssignment({
          targetDepartments: payload.targetDepartments || [],
        selectedEmployeeIds: (payload.targetEmployeeIds || []).map(String),
        dueDate: payload.dueDate || ''
      });
      setNotice('Draft loaded. You can continue editing.');
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
    questionsPerAttempt: Math.min(old.questions.length + 1, Number(old.questionsPerAttempt) || 1)
  }));
  const removeQuestion = (quizSetter, questionIndex) => quizSetter((old) => {
    const questions = old.questions.filter((_, index) => index !== questionIndex)
      .map((question, index) => ({ ...question, orderIndex: index + 1 }));
    return { ...old, questions, questionsPerAttempt: Math.max(1, Math.min(questions.length || 1, Number(old.questionsPerAttempt) || 1)) };
  });

  const validateStep = (step) => {
    if (step === 1) {
      if (!(courseInfo.title ?? '').trim()) return 'Enter a course title.';
      if (!courseInfo.level) return 'Select a course level.';
      if (courseInfo.durationHours !== '' && Number(courseInfo.durationHours) < 0) return 'Duration hours cannot be negative.';
    }
    if (step === 2) {
      if (!modules.length) return 'Add at least one module.';
      for (let i = 0; i < modules.length; i++) {
        if (!(modules[i].title ?? '').trim()) return `Enter a title for Module ${i + 1}.`;
        if ((modules[i].lessons ?? []).some((lesson) => !(lesson.title ?? '').trim())) return `Every lesson in Module ${i + 1} needs a title.`;
      }
    }
    if (step === 4) {
      if (!finalQuiz.questions.length) return 'Add at least one final assessment question.';
      for (let i = 0; i < finalQuiz.questions.length; i++) {
        const q = finalQuiz.questions[i];
        if (!(q.questionText ?? '').trim()) return `Enter text for final question ${i + 1}.`;
        if (!q.correctAnswer) return `Select the correct answer for final question ${i + 1}.`;
        if (!(q.optionA ?? '').trim() || !(q.optionB ?? '').trim()) return `Final question ${i + 1} needs at least options A and B.`;
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
      maxAttempts: Number(quiz.maxAttempts) || 3,
      questionsPerAttempt: Math.max(1, Math.min(quiz.questions.length || 1, Number(quiz.questionsPerAttempt) || 1)),
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

    return {
      title: (courseInfo.title ?? '').trim(),
      level: courseInfo.level || 'L0',
      duration: (courseInfo.duration ?? '').trim() ||
      (courseInfo.durationHours
        ? `${courseInfo.durationHours} Hours`
        : ''),
      banner: (courseInfo.banner ?? '').trim() || null,
      description: (courseInfo.description ?? '').trim(),
      passingScore: Number(finalQuiz.passingScore) || 70,
      foundation: Boolean(courseInfo.foundation),
      publish,
      targetDepartments: [...assignment.targetDepartments],
      targetEmployeeIds,
      dueDate: assignment.dueDate || null,
      mandatory: assignment.targetDepartments.length > 0,
      modules: modules
        .filter((mod) => (mod.title ?? '').trim())
        .map((mod, index) => ({
          title: mod.title.trim(),
          orderIndex: index + 1,
          lessons: mod.lessons
            .filter((lesson) => (lesson.title ?? '').trim())
            .map((lesson, lessonIndex) => ({
              title: lesson.title.trim(),
              type: lesson.type,
              contentUrl: (lesson.contentUrl ?? '').trim() || null,
              workdriveFileId: (lesson.workdriveFileId ?? '').trim() || null,
              duration: (lesson.duration ?? '').trim() || null,
              orderIndex: lessonIndex + 1
            })),
          quiz: mod.quiz && mod.quiz.questions.some((question) =>
            (question.questionText ?? '').trim() && question.correctAnswer
          ) ? quizPayload({
            ...mod.quiz,
            questions: mod.quiz.questions.filter((question) =>
              question.questionText.trim() && question.correctAnswer
            )
          }) : null
        })),
      finalQuiz: publish || finalQuiz.questions.some((question) =>
        question.questionText.trim() && question.correctAnswer
      ) ? quizPayload({
        ...finalQuiz,
        questions: finalQuiz.questions.filter((question) =>
          question.questionText.trim() && question.correctAnswer
        )
      }) : null
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

    if (publish) {
      for (let step = 1; step <= 4; step++) {
        const validation = validateStep(step);
        if (validation) {
          setCurrentStep(step);
          setError(validation);
          return;
        }
      }
      if (assignment.targetDepartments.length === 0 && assignment.selectedEmployeeIds.length === 0) {
        setCurrentStep(5);
        setError('Select at least one department for mandatory training or at least one employee for recommended training.');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        ...buildPayload(publish),
        ...(editingCourseId ? { courseId: editingCourseId } : {})
      };
      const result = await apiRequest(
        editingCourseId
          ? `/drafts/${encodeURIComponent(editingCourseId)}`
          : '/courses',
        {
          method: editingCourseId ? 'PUT' : 'POST',
          body: JSON.stringify(payload)
        }
      );
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
        level: courseInfo.level || 'L0',
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

  const toggleDepartment = (value) => setAssignment((old) => ({
    ...old,
    targetDepartments: old.targetDepartments.includes(value)
      ? old.targetDepartments.filter((item) => item !== value)
      : [...old.targetDepartments, value]
  }));

  const renderQuizEditor = (quiz, setter, heading) => (
    <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ color: '#0f172a' }}>{heading}</strong>
        <button type="button" style={buttonStyle} onClick={() => addQuestion(setter)}><Plus size={14} /> Add Question</button>
      </div>
      <div>
        <label style={labelStyle}>Assessment title</label>
        <input style={inputStyle} value={quiz.title} onChange={(e) => updateQuiz(setter, { title: e.target.value })} placeholder="Final Assessment" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <div><label style={labelStyle}>Passing score (%)</label><input style={inputStyle} type="number" min="0" max="100" value={quiz.passingScore} onChange={(e) => updateQuiz(setter, { passingScore: e.target.value })} /></div>
        <div><label style={labelStyle}>Time limit (min)</label><input style={inputStyle} type="number" min="1" value={quiz.timeLimitMinutes ?? ''} onChange={(e) => updateQuiz(setter, { timeLimitMinutes: e.target.value })} /></div>
        <div><label style={labelStyle}>Max attempts</label><input style={inputStyle} type="number" min="1" value={quiz.maxAttempts} onChange={(e) => updateQuiz(setter, { maxAttempts: e.target.value })} /></div>
        <div><label style={labelStyle}>Questions per attempt</label><input style={inputStyle} type="number" min="1" max={Math.max(1, quiz.questions.length)} value={quiz.questionsPerAttempt} onChange={(e) => updateQuiz(setter, { questionsPerAttempt: e.target.value })} /></div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.85rem', color: '#334155' }}>
        <label><input type="checkbox" checked={quiz.randomizeQuestions} onChange={(e) => updateQuiz(setter, { randomizeQuestions: e.target.checked })} /> Randomize questions</label>
        <label><input type="checkbox" checked={quiz.randomizeOptions} onChange={(e) => updateQuiz(setter, { randomizeOptions: e.target.checked })} /> Randomize options</label>
      </div>
      {quiz.questions.map((question, index) => (
        <div key={index} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.86rem' }}>Question {index + 1}</strong>
            {quiz.questions.length > 1 && <button type="button" aria-label="Remove question" style={{ ...buttonStyle, padding: 6, color: '#dc2626' }} onClick={() => removeQuestion(setter, index)}><Trash2 size={14} /></button>}
          </div>
          <textarea style={{ ...inputStyle, minHeight: 65, resize: 'vertical' }} value={question.questionText} onChange={(e) => updateQuestion(setter, index, { questionText: e.target.value })} placeholder="Enter the question" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
            {['A', 'B', 'C', 'D'].map((letter) => (
              <div key={letter}>
                <label style={labelStyle}>Option {letter}</label>
                <input style={inputStyle} value={question[`option${letter}`]} onChange={(e) => updateQuestion(setter, index, { [`option${letter}`]: e.target.value })} placeholder={`Option ${letter}${letter === 'C' || letter === 'D' ? ' (optional)' : ''}`} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 0.5fr) minmax(180px, 1.5fr)', gap: 10 }}>
            <div><label style={labelStyle}>Correct option</label><select style={inputStyle} value={question.correctAnswer} onChange={(e) => updateQuestion(setter, index, { correctAnswer: e.target.value })}>{['A', 'B', 'C', 'D'].map((letter) => <option key={letter} value={letter}>Option {letter}</option>)}</select></div>
            <div><label style={labelStyle}>Explanation (optional)</label><input style={inputStyle} value={question.explanation} onChange={(e) => updateQuestion(setter, index, { explanation: e.target.value })} placeholder="Explain the answer" /></div>
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose?.(); }}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: 980, width: 'min(980px, 96vw)', padding: 0, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0f172a', padding: '1.15rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>Trainer Authoring Tool</div>
            <h2 style={{ margin: '5px 0 0', fontSize: '1.22rem', fontWeight: 800 }}> {editingCourseId ? 'Edit Logistics Course' : 'Create Logistics Course'}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.45rem', borderRadius: '50%', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.85rem 1.3rem' }}>
          {steps.map((label, index) => {
            const stepNum = index + 1;
            const active = currentStep === stepNum;
            const done = currentStep > stepNum;
            return <div key={label} style={{ flex: '1 0 125px', display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.77rem', fontWeight: active || done ? 800 : 600, color: active ? '#0284c7' : done ? '#16a34a' : '#64748b' }}>
              <span style={{ flexShrink: 0, width: 23, height: 23, borderRadius: '50%', background: active ? '#0284c7' : done ? '#16a34a' : '#cbd5e1', color: '#fff', display: 'grid', placeItems: 'center' }}>{done ? '✓' : stepNum}</span>
              <span>{label.replace(/^\d+\.\s*/, '')}</span>
            </div>;
          })}
        </div>

        <div style={{ padding: '1.35rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 11, borderRadius: 8, fontSize: '0.88rem' }}><AlertCircle size={17} style={{ flexShrink: 0 }} />{error}</div>}
          {notice && <div role="status" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: 10, borderRadius: 8, fontSize: '0.85rem' }}>{notice}</div>}
          {loadingDraft && (
            <div style={{ color: '#0369a1', fontSize: '0.9rem' }}>
              Loading saved draft…
            </div>
          )}
          {loadingLookups && (
            <div style={{ color: '#64748b', fontSize: '0.84rem' }}>
              Loading departments…
            </div>
          )}
          {currentStep === 1 && <>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Step 1: Course Information</h3>
            <div><label style={labelStyle}>Course title *</label><input style={inputStyle} value={courseInfo.title} onChange={(e) => setCourseInfo({ ...courseInfo, title: e.target.value })} placeholder="Enter course title" /></div>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div><label style={labelStyle}>Level *</label><select style={inputStyle} value={courseInfo.level} onChange={(e) => setCourseInfo({ ...courseInfo, level: e.target.value })}><option value="L0">L0 — Trainee</option><option value="L1">L1 — Assistant</option><option value="L2">L2 — Executive / Senior Executive</option><option value="L3">L3 — Assistant Manager / Manager / Senior Manager</option><option value="L4">L4 — Vice President</option></select></div>
              <div><label style={labelStyle}>Duration label</label><input style={inputStyle} value={courseInfo.duration} onChange={(e) => setCourseInfo({ ...courseInfo, duration: e.target.value })} placeholder="e.g. 3 Hours" /></div>
              <div><label style={labelStyle}>Duration (hours)</label><input style={inputStyle} type="number" min="0" step="1" value={courseInfo.durationHours} onChange={(e) => setCourseInfo({ ...courseInfo, durationHours: e.target.value })} placeholder="e.g. 3" /></div>
            </div>
            <div><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={courseInfo.description} onChange={(e) => setCourseInfo({ ...courseInfo, description: e.target.value })} placeholder="Describe what employees will learn" /></div>
            <div><label style={labelStyle}>Banner URL (optional)</label><input style={inputStyle} value={courseInfo.banner} onChange={(e) => setCourseInfo({ ...courseInfo, banner: e.target.value })} placeholder="https\://…" /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155', fontSize: '0.88rem' }}><input type="checkbox" checked={courseInfo.foundation} onChange={(e) => setCourseInfo({ ...courseInfo, foundation: e.target.checked })} /> Foundation course</label>
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
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Video / PDF / content URL</label><input style={inputStyle} value={lesson.contentUrl} onChange={(e) => updateLesson(moduleIndex, lessonIndex, { contentUrl: e.target.value })} placeholder="Paste hosted content URL (YouTube, PDF link, etc.)" /></div>
              </div>)}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><strong style={{ fontSize: '0.88rem' }}>Module quiz</strong><button type="button" style={buttonStyle} onClick={() => updateModule(moduleIndex, { quiz: mod.quiz ? null : makeQuiz(`${mod.title || `Module ${moduleIndex + 1}`} Quiz`) })}>{mod.quiz ? 'Remove module quiz' : 'Add module quiz'}</button></div>
              {mod.quiz && renderQuizEditor(mod.quiz, (updater) => setModules((old) => old.map((item, index) => index !== moduleIndex ? item : { ...item, quiz: typeof updater === 'function' ? updater(item.quiz) : { ...item.quiz, ...updater } })), `Module ${moduleIndex + 1} Quiz`)}
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
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: '#eff6ff', border: '1px solid #bfdbfe', padding: 11, borderRadius: 8, color: '#1e40af', fontSize: '0.85rem' }}><Award size={18} /> Certificate creation itself is handled by the LMS completion workflow. Configure the final assessment below.</div>
            {renderQuizEditor(finalQuiz, setFinalQuiz, 'Final assessment')}
          </>}

          {currentStep === 5 && <>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Step 5: Training Assignment</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6 }}>Configure both assignment types independently. Selected departments receive mandatory training; individually selected employees receive recommended training. If an employee qualifies for both, mandatory training takes priority.</p>

            <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <strong style={{ color: '#0f172a' }}>Mandatory training</strong>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>Select departments whose employees must complete this course.</p>
              </div>
              {departments.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 7 }}>{departments.map((department) => <label key={department.value} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 10px', fontSize: '0.85rem' }}><input type="checkbox" checked={assignment.targetDepartments.includes(department.value)} onChange={() => toggleDepartment(department.value)} />{department.label}</label>)}</div> : <p style={{ color: '#b45309', fontSize: '0.85rem' }}>No departments are available.</p>}
            </section>

            <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <strong style={{ color: '#0f172a' }}>Recommended training</strong>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>Select individual employees who may take this course optionally.</p>
              </div>
              <label style={labelStyle}><Users size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Select employees</label>
              <input style={inputStyle} value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} placeholder="Search by employee name or office email…" />
              <small style={{ color: '#64748b' }}>Tick the checkbox beside each employee. Search alone does not select anyone.</small>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><small style={{ color: '#64748b' }}>{assignment.selectedEmployeeIds.length} employee(s) selected</small><button type="button" style={buttonStyle} onClick={() => setAssignment((old) => ({ ...old, selectedEmployeeIds: [...new Set([...old.selectedEmployeeIds, ...employees.filter((employee) => `${employee.name} ${employee.email} ${employee.department}`.toLowerCase().includes(employeeSearch.toLowerCase())).map((employee) => employee.id)])] }))} disabled={!employees.length}>Select all filtered</button></div>
              <div style={{ maxHeight: 230, overflowY: 'auto', border: '1px solid #dbe4ee', borderRadius: 8, background: '#fff' }}>{loadingLookups ? <p style={{ padding: 12, color: '#64748b', margin: 0 }}>Loading employees…</p> : employeeLoadError ? <p style={{ padding: 12, color: '#b45309', margin: 0 }}>{employeeLoadError}</p> : employees.filter((employee) => `${employee.name} ${employee.email} ${employee.department}`.toLowerCase().includes(employeeSearch.toLowerCase())).length ? employees.filter((employee) => `${employee.name} ${employee.email} ${employee.department}`.toLowerCase().includes(employeeSearch.toLowerCase())).map((employee) => <label key={employee.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.86rem' }}><input type="checkbox" checked={assignment.selectedEmployeeIds.includes(employee.id)} onChange={() => setAssignment((old) => ({ ...old, selectedEmployeeIds: old.selectedEmployeeIds.includes(employee.id) ? old.selectedEmployeeIds.filter((id) => id !== employee.id) : [...old.selectedEmployeeIds, employee.id] }))} /><span style={{ flex: 1 }}><strong style={{ display: 'block', color: '#0f172a' }}>{employee.name}</strong><small style={{ color: '#64748b' }}>{employee.email}{employee.department ? ` · ${employee.department}` : ''}</small></span>{assignment.targetDepartments.includes(employee.department) && <small style={{ color: '#b45309', fontWeight: 700 }}>Mandatory priority</small>}</label>) : <p style={{ padding: 12, color: '#64748b', margin: 0 }}>{employees.length ? 'No employees match your search.' : 'No employees are available to select.'}</p>}</div>
              {assignment.selectedEmployeeIds.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{employees.filter((employee) => assignment.selectedEmployeeIds.includes(employee.id)).map((employee) => <span key={employee.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e0f2fe', color: '#075985', padding: '5px 8px', borderRadius: 999, fontSize: '0.78rem' }}>{employee.name}<button type="button" aria-label={`Remove ${employee.name}`} onClick={() => setAssignment((old) => ({ ...old, selectedEmployeeIds: old.selectedEmployeeIds.filter((id) => id !== employee.id) }))} style={{ border: 0, background: 'transparent', color: '#075985', cursor: 'pointer', padding: 0 }}>×</button></span>)}</div>}
            </section>
            <div><label style={labelStyle}>Due date (optional)</label><input style={inputStyle} type="date" value={assignment.dueDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setAssignment({ ...assignment, dueDate: e.target.value })} /></div>
          </>}

          {currentStep === 6 && <>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>Step 6: Review & Publishing</h3>
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <strong style={{ color: '#166534' }}>Review course details</strong>
              <div style={{ marginTop: 8, color: '#166534', fontSize: '0.88rem', lineHeight: 1.8 }}>Title: <strong>{courseInfo.title || '—'}</strong><br />Level: <strong>{courseInfo.level}</strong><br />Modules: <strong>{modules.length}</strong><br />Lessons: <strong>{modules.reduce((total, mod) => total + mod.lessons.length, 0)}</strong><br />Final questions: <strong>{finalQuiz.questions.length}</strong><br />Mandatory departments: <strong>{assignment.targetDepartments.length}</strong><br />Recommended employees: <strong>{assignment.selectedEmployeeIds.length}</strong><br />Due date: <strong>{assignment.dueDate || 'Not set'}</strong></div>
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

        <div style={{ background: '#fff', padding: '0.9rem 1.4rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" style={{ ...buttonStyle, opacity: currentStep === 1 ? 0.5 : 1 }} onClick={() => { setError(''); setCurrentStep((step) => Math.max(1, step - 1)); }} disabled={currentStep === 1 || saving}><ChevronLeft size={16} /> Back</button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" style={buttonStyle} onClick={() => saveCourse(false)} disabled={saving}>{saving ? 'Saving…' : <><Save size={15} /> Save draft</>}</button>
            {currentStep < 6 ? <button type="button" style={primaryStyle} onClick={goNext} disabled={saving}>Continue <ChevronRight size={16} /></button> : <button type="button" style={{ ...primaryStyle, background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => saveCourse(true)} disabled={saving}>{saving ? 'Publishing…' : <><CheckCircle2 size={17} /> Publish course</>}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
