import React, { useEffect, useState } from 'react';
import {
  Megaphone,
  Send,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Mail,
  Activity
} from 'lucide-react';
import { notificationService } from '../services/notificationService';

export default function HrAnnouncementsPanel({ departments = [] }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('ALL');
  const [priority, setPriority] = useState('NORMAL');
  const [sending, setSending] = useState(false);
  const [runningTask, setRunningTask] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  const loadDiagnostics = async () => {
    try {
      const data = await notificationService.getDiagnostics();
      setDiagnostics(data);
    } catch (err) {
      // Ignore non-fatal diagnostics error
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showFeedback('error', 'Please enter both an announcement title and message.');
      return;
    }

    setSending(true);
    try {
      const res = await notificationService.broadcastAnnouncement({
        title: title.trim(),
        message: message.trim(),
        department: targetDepartment,
        priority
      });
      const count = res?.recipientsCount ?? 0;
      showFeedback('success', `Announcement delivered to ${count} active recipient(s).`);
      setTitle('');
      setMessage('');
      window.dispatchEvent(new CustomEvent('fairmacs:notifications-updated'));
      loadDiagnostics();
    } catch (err) {
      showFeedback('error', err?.message || 'Failed to broadcast announcement.');
    } finally {
      setSending(false);
    }
  };

  const handleRunReminders = async () => {
    setRunningTask(true);
    try {
      const res = await notificationService.runReminders();
      showFeedback(
        'success',
        `Evaluated ${res?.processedEnrollments ?? 0} enrollments; generated ${res?.notificationsCreated ?? 0} reminder notifications.`
      );
      window.dispatchEvent(new CustomEvent('fairmacs:notifications-updated'));
      loadDiagnostics();
    } catch (err) {
      showFeedback('error', 'Failed to trigger deadline & overdue reminders.');
    } finally {
      setRunningTask(false);
    }
  };

  const handleRunDigest = async () => {
    setRunningTask(true);
    try {
      const res = await notificationService.runComplianceDigest();
      showFeedback(
        'success',
        `Weekly compliance digest executed (${res?.notificationsCreated ?? 0} summary alerts sent).`
      );
      window.dispatchEvent(new CustomEvent('fairmacs:notifications-updated'));
      loadDiagnostics();
    } catch (err) {
      showFeedback('error', 'Failed to trigger weekly compliance digest.');
    } finally {
      setRunningTask(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {feedback && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderRadius: '12px',
            background: feedback.type === 'error' ? '#FEF2F2' : '#ECFDF5',
            border: feedback.type === 'error' ? '1px solid #FECACA' : '1px solid #A7F3D0',
            color: feedback.type === 'error' ? '#B91C1C' : '#065F46',
            fontSize: '0.84rem',
            fontWeight: 700
          }}
        >
          {feedback.text}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* Broadcast Form */}
        <section
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderRadius: '18px',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid #E2EAF3'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <Megaphone size={20} color="#0878C9" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B1730', margin: 0 }}>
              Broadcast Organization Announcement
            </h2>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.84rem', lineHeight: 1.5, margin: '0 0 1.15rem 0' }}>
            Send an immediate in-app notification to all active Fairmacs employees or a specific department.
          </p>

          <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Announcement Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Mandatory Customs Compliance Training Schedule"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Target Audience
                </label>
                <select
                  value={targetDepartment}
                  onChange={(e) => setTargetDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.62rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    background: '#FFFFFF'
                  }}
                >
                  <option value="ALL">All Departments (Organization-Wide)</option>
                  {departments.map((d) => {
                    const deptName = typeof d === 'string' ? d : d.department || d.name;
                    if (!deptName) return null;
                    return (
                      <option key={deptName} value={deptName}>
                        {deptName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.62rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    background: '#FFFFFF'
                  }}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High Priority</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Announcement Message
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a clear, actionable announcement for learners and managers..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="btn-primary"
              style={{
                padding: '0.7rem 1.15rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Send size={15} />
              {sending ? 'Broadcasting Announcement...' : 'Send Announcement'}
            </button>
          </form>
        </section>

        {/* Notification Engine & Scheduled Jobs Control */}
        <section
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderRadius: '18px',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid #E2EAF3',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <Activity size={20} color="#0878C9" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B1730', margin: 0 }}>
                Notification Engine & Channels
              </h2>
            </div>
            <p style={{ color: '#64748B', fontSize: '0.84rem', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Monitor centralized notification channels and trigger deadline reminders or weekly compliance digests.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={17} color="#16A34A" />
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 800, color: '#14532D' }}>
                      In-App Notification Centre
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#166534' }}>
                      Real-time LMS event triggers + scheduled deadline & overdue reminders
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    background: '#DCFCE7',
                    color: '#15803D'
                  }}
                >
                  ACTIVE
                </span>
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={17} color="#475569" />
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 800, color: '#1E293B' }}>
                      Zoho Email Channel ({diagnostics?.emailProvider || 'ZEPTOMAIL'})
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#64748B' }}>
                      Prepared for Zoho ZeptoMail / SMTP ({diagnostics?.emailFromAddress || 'no-reply@fairmacs.com'})
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    background: diagnostics?.emailChannelEnabled ? '#DCFCE7' : '#F1F5F9',
                    color: diagnostics?.emailChannelEnabled ? '#15803D' : '#475569'
                  }}
                >
                  {diagnostics?.emailChannelEnabled ? 'ENABLED' : 'DISABLED BY DEFAULT'}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid #E2E8F0',
              paddingTop: '1rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.65rem'
            }}
          >
            <button
              type="button"
              disabled={runningTask}
              onClick={handleRunReminders}
              className="glass-button-secondary"
              style={{
                flex: '1 1 180px',
                padding: '0.6rem 0.85rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Zap size={15} color="#D97706" />
              Run Deadline & Overdue Scan
            </button>

            <button
              type="button"
              disabled={runningTask}
              onClick={handleRunDigest}
              className="glass-button-secondary"
              style={{
                flex: '1 1 180px',
                padding: '0.6rem 0.85rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <ShieldAlert size={15} color="#1677FF" />
              Send Weekly Compliance Digest
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
