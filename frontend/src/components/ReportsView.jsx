import React from 'react';
import { BarChart3, Download, FileCheck, Filter, Printer } from 'lucide-react';
import { MOCK_HR_METRICS } from '../data/mockData';

export default function ReportsView({ currentRole }) {
  const isHR = currentRole === 'ADMIN' || currentRole === 'TRAINER';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
            {isHR ? 'HR Analytics & Audit Reports' : 'My Learning History & Transcripts'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {isHR ? 'Generate compliance exports, transcript logs, and audit records.' : 'Review your historical course completion records and download transcripts.'}
          </p>
        </div>

        <button className="btn-primary" onClick={() => alert('Downloading official PDF report...')}>
          <Download style={{ width: 16, height: 16 }} /> Download Summary Report
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
          Standard HR & Audit Reports Catalog
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', background: '#f8fafc' }}>
            <FileCheck style={{ width: 24, height: 24, color: '#0284c7', marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Organization Compliance Summary</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.4rem 0 1rem' }}>
              Comprehensive branch and department wise mandatory training compliance breakdown.
            </p>
            <button className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', justifyContent: 'center' }}>
              Generate Excel Export
            </button>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', background: '#f8fafc' }}>
            <BarChart3 style={{ width: 24, height: 24, color: '#16a34a', marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Employee Training Transcript</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.4rem 0 1rem' }}>
              Individual transcripts logging assessment scores, credit hours, and cert IDs.
            </p>
            <button className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', justifyContent: 'center' }}>
              Generate Transcript PDF
            </button>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', background: '#f8fafc' }}>
            <Printer style={{ width: 24, height: 24, color: '#e11d48', marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Overdue Compliance Alert Roster</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.4rem 0 1rem' }}>
              Active list of employees exceeding assigned course completion target dates.
            </p>
            <button className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', justifyContent: 'center' }}>
              Generate Action List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
