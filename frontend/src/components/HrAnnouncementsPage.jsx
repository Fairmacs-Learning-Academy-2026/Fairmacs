import React, { useState, useEffect } from 'react';
import HrAnnouncementsPanel from './HrAnnouncementsPanel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export default function HrAnnouncementsPage() {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function loadDepartments() {
      try {
        const token = localStorage.getItem('fairmacs_token') || localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/departments`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && Array.isArray(data)) {
          setDepartments(data);
        }
      } catch {
        // Fallback gracefully; HrAnnouncementsPanel accepts empty list
      }
    }
    loadDepartments();
    return () => { cancelled = true; };
  }, []);

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
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Announcements & Communications
        </h1>
        <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '3px 0 0 0' }}>
          Broadcast department notices, run compliance digests, and manage company-wide alerts
        </p>
      </div>

      <HrAnnouncementsPanel departments={departments} />
    </div>
  );
}
