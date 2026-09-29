import React, { useState } from 'react';
import { X, CheckCircle2, ChevronRight, ChevronLeft, Plus, Trash2, FileText, Video, Award, Upload } from 'lucide-react';

export default function CourseBuilderModal({ onClose, onPublish }) {
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [courseInfo, setCourseInfo] = useState({
    title: 'Advanced Dangerous Goods Logistics SOP',
    category: 'Safety',
    level: 'Intermediate',
    duration: '3.0 Hours',
    description: 'Comprehensive manual for hazardous cargo storage, IMO IMDG sea codes, and IATA airport handling procedures.'
  });

  const [modules, setModules] = useState([
    {
      id: 1,
      title: '01 Hazard Classification & UN Packaging',
      lessons: [
        { id: 101, title: '1.1 UN Hazard Classes (Class 1 to 9)', duration: '15 mins', type: 'video' },
        { id: 102, title: '1.2 Material Safety Data Sheet (MSDS) Verification', duration: '10 pages', type: 'pdf' }
      ]
    }
  ]);

  const [quizInfo, setQuizInfo] = useState({
    passingScore: 80,
    timeLimit: 15,
    questions: [
      { id: 1, question: 'What does UN Class 3 represent?', optionA: 'Flammable Liquids', optionB: 'Explosives', correct: 'A' }
    ]
  });

  const steps = [
    '1. Course Info',
    '2. Modules & Lessons',
    '3. Videos & PDFs',
    '4. Quiz & Cert',
    '5. Review & Publish'
  ];

  const handlePublish = () => {
    onPublish({
      id: `CST-${Math.floor(100 + Math.random() * 900)}`,
      ...courseInfo,
      modules,
      quizInfo
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '850px', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#0f172a', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Trainer Authoring Tool
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create New Logistics Course</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.4rem', borderRadius: '50%', color: 'white', cursor: 'pointer' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Stepper Wizard Bar */}
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.75rem 1.5rem' }}>
          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isDone = currentStep > stepNum;

            return (
              <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: isActive || isDone ? 700 : 500, color: isActive ? '#0284c7' : isDone ? '#16a34a' : '#64748b' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: isActive ? '#0284c7' : isDone ? '#16a34a' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                  {isDone ? '✓' : stepNum}
                </span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Step Content Body */}
        <div style={{ padding: '1.75rem', maxHeight: '58vh', overflowY: 'auto' }}>
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Step 1: Course Information</h3>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Course Title</label>
                <input
                  type="text"
                  value={courseInfo.title}
                  onChange={(e) => setCourseInfo({ ...courseInfo, title: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.25rem', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Category</label>
                  <select
                    value={courseInfo.category}
                    onChange={(e) => setCourseInfo({ ...courseInfo, category: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.25rem', fontSize: '0.88rem' }}
                  >
                    <option value="Safety">Safety</option>
                    <option value="Freight Forwarding">Freight Forwarding</option>
                    <option value="Air Freight">Air Freight</option>
                    <option value="Sea Freight">Sea Freight</option>
                    <option value="Customs & Compliance">Customs & Compliance</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Level</label>
                  <select
                    value={courseInfo.level}
                    onChange={(e) => setCourseInfo({ ...courseInfo, level: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.25rem', fontSize: '0.88rem' }}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Duration</label>
                  <input
                    type="text"
                    value={courseInfo.duration}
                    onChange={(e) => setCourseInfo({ ...courseInfo, duration: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.25rem', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Course Description</label>
                <textarea
                  value={courseInfo.description}
                  onChange={(e) => setCourseInfo({ ...courseInfo, description: e.target.value })}
                  style={{ width: '100%', height: '80px', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.25rem', fontSize: '0.88rem' }}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Step 2: Modules & Lessons</h3>
                <button
                  className="btn-secondary"
                  onClick={() => setModules([...modules, { id: modules.length + 1, title: `0${modules.length + 1} New Module`, lessons: [] }])}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  <Plus style={{ width: 14, height: 14 }} /> Add Module
                </button>
              </div>

              {modules.map((mod, modIdx) => (
                <div key={mod.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.5rem' }}>{mod.title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {mod.lessons.map(les => (
                      <div key={les.id} style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>{les.title} ({les.type})</span>
                        <span style={{ color: '#64748b' }}>{les.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', padding: '2rem 1rem' }}>
              <Upload style={{ width: 48, height: 48, color: '#0284c7', margin: '0 auto' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Step 3: Upload Videos, PDFs & Assets</h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '450px', margin: '0 auto' }}>
                Drag and drop MP4 video lectures or PDF SOP documents for instant stream encoding.
              </p>
              <div style={{ border: '2px dashed #cbd5e1', padding: '2rem', borderRadius: '12px', background: '#f8fafc', cursor: 'pointer' }}>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>Click to Browse Files</span> or Drag MP4 / PDF files here
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Step 4: Assessment & Certificate Settings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Passing Threshold (%)</label>
                  <input
                    type="number"
                    value={quizInfo.passingScore}
                    onChange={(e) => setQuizInfo({ ...quizInfo, passingScore: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.25rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Time Limit (Minutes)</label>
                  <input
                    type="number"
                    value={quizInfo.timeLimit}
                    onChange={(e) => setQuizInfo({ ...quizInfo, timeLimit: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.25rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Step 5: Final Review & Publishing</h3>
              <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>Ready to Publish Course to Enterprise Catalog!</div>
                <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '0.25rem' }}>
                  Title: <strong>{courseInfo.title}</strong> • Category: <strong>{courseInfo.category}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div style={{ background: 'white', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            style={{ opacity: currentStep === 1 ? 0.5 : 1 }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back
          </button>

          {currentStep < 5 ? (
            <button
              className="btn-primary"
              onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
            >
              Continue <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handlePublish}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}
            >
              <CheckCircle2 style={{ width: 18, height: 18 }} /> Publish Course Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
