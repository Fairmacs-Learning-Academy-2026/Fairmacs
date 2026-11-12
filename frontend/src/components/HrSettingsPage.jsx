import React, { useState } from 'react';
import {
  Settings,
  FolderGit2,
  ShieldCheck,
  Lock,
  Database,
  CheckCircle2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const cardStyle = {
  background: '#FFFFFF',
  borderRadius: '8px',
  border: '1px solid #E2E8F0',
  padding: '1.25rem 1.4rem',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const actionBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.45rem',
  padding: '0.52rem 0.95rem',
  borderRadius: '6px',
  fontSize: '0.84rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#0F172A',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
  whiteSpace: 'nowrap',
};

export default function HrSettingsPage() {
  const [connectingZoho, setConnectingZoho] = useState(false);
  const [zohoError, setZohoError] = useState('');

  const handleConnectZoho = async () => {
    try {
      setConnectingZoho(true);
      setZohoError('');
      const token = localStorage.getItem('fairmacs_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/zoho/auth-url`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
      throw new Error('Unable to generate Zoho OAuth authorization URL.');
    } catch (err) {
      setZohoError(err.message || 'Zoho authorization failed.');
    } finally {
      setConnectingZoho(false);
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minWidth: 0,
        color: '#14243A',
      }}
    >
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <Settings size={20} color="#0F6CBD" />
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              System Settings & Configuration
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '3px 0 0 0' }}>
              Configure corporate storage integrations, compliance thresholds, and security policies
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Zoho Integration */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FolderGit2 size={18} color="#0F6CBD" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 650, color: '#0F172A', margin: 0 }}>
                Zoho WorkDrive Integration
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Fairmacs KMS connects to corporate Zoho WorkDrive for video lesson streaming, PDF guides, and course
              materials with persistent OAuth validation.
            </p>
            {zohoError && (
              <div
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  fontSize: '0.78rem',
                }}
              >
                {zohoError}
              </div>
            )}
            <button
              type="button"
              disabled={connectingZoho}
              onClick={handleConnectZoho}
              style={{
                ...actionBtnStyle,
                background: '#0F6CBD',
                color: '#FFFFFF',
                border: '1px solid #0F6CBD',
                width: '100%',
              }}
            >
              <FolderGit2 size={14} />
              {connectingZoho ? 'Connecting…' : 'Reconnect / Authorize Zoho WorkDrive'}
            </button>
          </div>

          {/* Compliance Policies */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={18} color="#16A34A" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 650, color: '#0F172A', margin: 0 }}>
                Compliance & Passing Standards
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Default passing benchmark is strictly enforced at <strong>80%</strong> across customs clearance compliance,
              cargo inspection, and hazardous materials operations.
            </p>
            <div
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: '4px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                fontSize: '0.78rem',
                color: '#166534',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <CheckCircle2 size={14} /> Policy status: Active & Enforced in Course Engine
            </div>
          </div>

          {/* Password & Account Security */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Lock size={18} color="#0F6CBD" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 650, color: '#0F172A', margin: 0 }}>
                Authentication & Account Security
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Server-enforced initial password changes (mustChangePassword), progressive login lockout on failed attempts,
              and PBKDF2 credential hashing.
            </p>
            <div
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: '4px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: '0.78rem',
                color: '#475569',
                fontWeight: 500,
              }}
            >
              Lockout threshold: 5 failed attempts / 15-min cooldown
            </div>
          </div>

          {/* Audit & Data Retention */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Database size={18} color="#0F6CBD" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 650, color: '#0F172A', margin: 0 }}>
                Audit Logging & Excel Imports
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              All bulk employee onboarding actions, validation anomalies, and certification verifications are recorded in
              the immutable audit log table.
            </p>
            <div
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: '4px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: '0.78rem',
                color: '#475569',
                fontWeight: 500,
              }}
            >
              Audit table: employee_import_audit_logs (Flyway V11)
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
