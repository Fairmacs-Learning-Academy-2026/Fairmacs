import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Settings,
  FolderGit2,
  Lock,
  Database,
  Palette,
  GraduationCap,
  UserPlus,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { getZohoConnectUrl } from '../services/zohoService';
import { hrAdminService } from '../services/hrAdminService';

const cardStyle = {
  background: '#FFFFFF',
  borderRadius: '8px',
  border: '1px solid #E2E8F0',
  padding: '1.25rem 1.4rem',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
};

const innerCardStyle = {
  padding: '1.25rem',
  borderRadius: '6px',
  border: '1px solid #E2E8F0',
  background: '#FFFFFF',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
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
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#0F172A',
  whiteSpace: 'nowrap',
};

const primaryBtnStyle = {
  ...actionBtnStyle,
  background: '#0F6CBD',
  color: '#FFFFFF',
  border: '1px solid #0F6CBD',
};

const inputStyle = {
  width: '100%',
  padding: '0.55rem 0.7rem',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  fontSize: '0.88rem',
  color: '#0F172A',
  background: '#FFFFFF',
  boxSizing: 'border-box',
};

const SECTION_ICONS = {
  certificate: Palette,
  learning: GraduationCap,
  onboarding: UserPlus,
};

const formatWhen = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB');
};

function SettingField({ setting, draft, onChange, onRemovePassword }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = setting.type === 'password';
  const inputId = `setting-${setting.key}`;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={inputId}
        style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.3rem' }}
      >
        {setting.label}
      </label>

      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          type={isPassword && !showPassword ? 'password' : setting.type === 'number' ? 'number' : 'text'}
          value={draft ?? ''}
          min={setting.type === 'number' ? setting.min : undefined}
          max={setting.type === 'number' ? setting.max : undefined}
          maxLength={setting.type === 'text' ? setting.max : undefined}
          autoComplete={isPassword ? 'new-password' : 'off'}
          placeholder={
            isPassword
              ? setting.configured
                ? 'A password is set - type here to replace it'
                : 'Not set - type a password'
              : ''
          }
          onChange={(event) => onChange(setting.key, event.target.value)}
          style={{ ...inputStyle, paddingRight: isPassword ? '2.4rem' : '0.7rem' }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '0.45rem',
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      <p style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45, margin: '0.3rem 0 0 0' }}>
        {setting.description}
      </p>

      {isPassword && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: setting.configured ? '#166534' : '#92400E',
            }}
          >
            {setting.configured ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            {setting.configured ? 'Configured' : 'Not configured - bulk upload is blocked until set'}
          </span>
          {setting.configured && (
            <button
              type="button"
              onClick={onRemovePassword}
              style={{ ...actionBtnStyle, padding: '0.25rem 0.6rem', fontSize: '0.74rem', color: '#B91C1C' }}
            >
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
      )}

      {setting.updatedAt && (
        <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '0.35rem 0 0 0' }}>
          Last changed {formatWhen(setting.updatedAt)}
          {setting.updatedBy ? ` by ${setting.updatedBy}` : ''}
        </p>
      )}
    </div>
  );
}

export default function HrSettingsPage() {
  const [connectingZoho, setConnectingZoho] = useState(false);
  const [zohoError, setZohoError] = useState('');

  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [notice, setNotice] = useState({ type: '', text: '' });

  const applyServerState = useCallback((payload) => {
    const groups = Array.isArray(payload?.categories) ? payload.categories : [];
    setCategories(groups);
    const nextDrafts = {};
    groups.forEach((group) =>
      (group.settings || []).forEach((setting) => {
        nextDrafts[setting.key] = setting.type === 'password' ? '' : String(setting.value ?? '');
      })
    );
    setDrafts(nextDrafts);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError('');
        const payload = await hrAdminService.getSettings();
        if (!cancelled) applyServerState(payload);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Unable to load settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyServerState]);

  const serverValues = useMemo(() => {
    const map = {};
    categories.forEach((group) =>
      (group.settings || []).forEach((setting) => {
        map[setting.key] = setting.type === 'password' ? '' : String(setting.value ?? '');
      })
    );
    return map;
  }, [categories]);

  const handleChange = (key, value) => {
    setNotice({ type: '', text: '' });
    setDrafts((current) => ({ ...current, [key]: value }));
  };

  const saveGroup = async (group, extra = {}) => {
    const values = { ...extra };
    (group.settings || []).forEach((setting) => {
      if (Object.prototype.hasOwnProperty.call(extra, setting.key)) return;
      const draft = drafts[setting.key] ?? '';
      if (setting.type === 'password') {
        if (draft.trim() !== '') values[setting.key] = draft;
      } else if (draft !== serverValues[setting.key]) {
        values[setting.key] = draft;
      }
    });

    if (Object.keys(values).length === 0) {
      setNotice({ type: 'info', text: 'Nothing to save - no values were changed.' });
      return;
    }

    try {
      setSavingId(group.id);
      setNotice({ type: '', text: '' });
      const payload = await hrAdminService.updateSettings(values);
      applyServerState(payload);
      setNotice({ type: 'success', text: `${group.label} settings saved.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Unable to save settings.' });
    } finally {
      setSavingId('');
    }
  };

  const handleConnectZoho = async () => {
    try {
      setConnectingZoho(true);
      setZohoError('');
      const authUrl = await getZohoConnectUrl();
      window.location.href = authUrl;
    } catch (err) {
      setZohoError(err.message || 'Zoho authorization failed.');
    } finally {
      setConnectingZoho(false);
    }
  };

  const noticeColors = {
    success: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
    error: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
    info: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
  };

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0, color: '#14243A' }}
    >
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <Settings size={20} color="#0F6CBD" />
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              System Settings
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '3px 0 0 0' }}>
              Certificate, learning rules and employee onboarding. Only HR / Admin can view or change these.
            </p>
          </div>
        </div>

        {notice.text && (
          <div
            role="status"
            style={{
              marginBottom: '1rem',
              padding: '0.6rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.84rem',
              background: noticeColors[notice.type].bg,
              border: `1px solid ${noticeColors[notice.type].border}`,
              color: noticeColors[notice.type].text,
            }}
          >
            {notice.text}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.88rem' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading settings...
          </div>
        )}

        {loadError && !loading && (
          <div
            style={{
              padding: '0.6rem 0.8rem',
              borderRadius: '6px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              fontSize: '0.84rem',
            }}
          >
            {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
              gap: '1rem',
              alignItems: 'start',
            }}
          >
            {categories.map((group) => {
              const Icon = SECTION_ICONS[group.id] || Settings;
              const saving = savingId === group.id;
              return (
                <div key={group.id} style={innerCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Icon size={18} color="#0F6CBD" />
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 650, color: '#0F172A', margin: 0 }}>
                      {group.label}
                    </h3>
                  </div>

                  {(group.settings || []).map((setting) => (
                    <SettingField
                      key={setting.key}
                      setting={setting}
                      draft={drafts[setting.key]}
                      onChange={handleChange}
                      onRemovePassword={() => {
                        if (window.confirm('Remove the shared initial password? Bulk upload will be blocked until a new one is set.')) {
                          saveGroup(group, { [setting.key]: null });
                        }
                      }}
                    />
                  ))}

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveGroup(group)}
                    style={{ ...primaryBtnStyle, width: '100%', opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                    {saving ? 'Saving...' : `Save ${group.label.toLowerCase()} settings`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <FolderGit2 size={20} color="#0F6CBD" />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Integrations & security
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '3px 0 0 0' }}>
              Storage connection and built-in protections.
            </p>
          </div>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(270px, 100%), 1fr))', gap: '1rem' }}
        >
          <div style={innerCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FolderGit2 size={18} color="#0F6CBD" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 650, color: '#0F172A', margin: 0 }}>
                Zoho WorkDrive
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Course videos, documents and thumbnails are stored in Zoho WorkDrive. Reconnect here if uploads stop
              working or after moving to a new server.
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
              style={{ ...primaryBtnStyle, width: '100%' }}
            >
              <FolderGit2 size={14} />
              {connectingZoho ? 'Connecting...' : 'Reconnect / Authorize Zoho WorkDrive'}
            </button>
          </div>

          <div style={innerCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Lock size={18} color="#0F6CBD" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 650, color: '#0F172A', margin: 0 }}>
                Account security
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
              Passwords are stored as BCrypt hashes. New and reset accounts must choose their own password at first
              login, and repeated failed logins trigger a temporary lockout.
            </p>
          </div>

          <div style={innerCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Database size={18} color="#0F6CBD" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 650, color: '#0F172A', margin: 0 }}>
                Audit logging
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
              Bulk employee imports, validation problems and certificate verifications are recorded in the audit log.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
