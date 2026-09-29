import React, { useState } from 'react';
import { Users, UserPlus, Search, Shield, KeyRound, CheckCircle, AlertCircle, X, Lock, Building, Filter, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENT_LEARNING_PATHS } from '../data/mockData';

export default function EmployeeManagement() {
  const { usersList, createEmployee, toggleUserStatus, resetUserPassword } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetNotice, setResetNotice] = useState(null);

  // Add Employee Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    department: 'Documentation',
    designation: 'Documentation Executive',
    role: 'EMPLOYEE',
    joiningDate: new Date().toISOString().split('T')[0],
    password: 'Employee@123',
    status: 'Active'
  });

  const [formError, setFormError] = useState('');

  const filteredUsers = usersList.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesDept = deptFilter === 'ALL' || u.department === deptFilter;
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.designation && u.designation.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRole && matchesDept && matchesSearch;
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name || !formData.email || !formData.designation) {
      setFormError('Please fill in all mandatory fields.');
      return;
    }

    const autoId = formData.id.trim() || `EMP${Math.floor(1000 + Math.random() * 9000)}`;
    const res = createEmployee({ ...formData, id: autoId });

    if (res.success) {
      setShowAddModal(false);
      setFormData({
        id: '',
        name: '',
        email: '',
        department: 'Documentation',
        designation: 'Documentation Executive',
        role: 'EMPLOYEE',
        joiningDate: new Date().toISOString().split('T')[0],
        password: 'Employee@123',
        status: 'Active'
      });
    }
  };

  const handleResetPass = (empId, empName) => {
    const res = resetUserPassword(empId);
    setResetNotice({ empName, newPass: res.newPass });
    setTimeout(() => setResetNotice(null), 4000);
  };

  const activeDeptRule = DEPARTMENT_LEARNING_PATHS[formData.department];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9333ea', textTransform: 'uppercase', letterSpacing: '1px' }}>
            HR Governance & User Directory
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Employee Accounts Directory</h1>
        </div>

        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)' }}>
          <UserPlus style={{ width: 18, height: 18 }} /> Onboard Employee
        </button>
      </div>

      {/* Reset Password Success Banner */}
      {resetNotice && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.85rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CheckCircle style={{ width: 18, height: 18 }} />
          <span>Password for <strong>{resetNotice.empName}</strong> has been reset to temporary password: <code>{resetNotice.newPass}</code></span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search style={{ position: 'absolute', left: 12, top: 11, width: 18, height: 18, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search employees by ID, name, designation, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.4rem', paddingRight: '1rem', paddingTop: '0.6rem', paddingBottom: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
          />
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter style={{ width: 16, height: 16, color: '#64748b' }} />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}
          >
            <option value="ALL">All Roles ({usersList.length})</option>
            <option value="EMPLOYEE">Employees</option>
            <option value="TRAINER">Trainers</option>
            <option value="MANAGER">Managers</option>
            <option value="HR_ADMIN">HR / Admin</option>
          </select>
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}
          >
            <option value="ALL">All Departments</option>
            <option value="Documentation">Documentation</option>
            <option value="Accounts">Accounts</option>
            <option value="Operations">Operations</option>
            <option value="Sales">Sales & BD</option>
            <option value="HR">HR</option>
            <option value="IT">IT</option>
          </select>
        </div>
      </div>

      {/* Employee Roster Table */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Employee ID & Name</th>
              <th style={{ padding: '0.85rem 1rem' }}>Role</th>
              <th style={{ padding: '0.85rem 1rem' }}>Department</th>
              <th style={{ padding: '0.85rem 1rem' }}>Designation</th>
              <th style={{ padding: '0.85rem 1rem' }}>Corporate Email</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((emp) => {
              const isHR = emp.role === 'HR_ADMIN';
              const isManager = emp.role === 'MANAGER';
              const isTrainer = emp.role === 'TRAINER';

              const roleBg = isHR ? '#f3e8ff' : isManager ? '#fef3c7' : isTrainer ? '#e0f2fe' : '#f1f5f9';
              const roleColor = isHR ? '#7e22ce' : isManager ? '#b45309' : isTrainer ? '#0369a1' : '#475569';

              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img src={emp.avatar} alt={emp.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: roleBg, color: roleColor, fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                      {emp.roleLabel || emp.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                      {emp.department}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#334155' }}>{emp.designation}</td>
                  <td style={{ padding: '1rem', color: '#475569', fontSize: '0.82rem' }}>{emp.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: emp.status === 'Active' ? '#dcfce7' : '#ffe4e6',
                      color: emp.status === 'Active' ? '#15803d' : '#be123c'
                    }}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => handleResetPass(emp.id, emp.name)}
                        title="Reset Password"
                      >
                        <KeyRound style={{ width: 14, height: 14 }} /> Reset
                      </button>

                      <button
                        onClick={() => toggleUserStatus(emp.id)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: emp.status === 'Active' ? '#ffe4e6' : '#dcfce7',
                          color: emp.status === 'Active' ? '#be123c' : '#15803d'
                        }}
                      >
                        {emp.status === 'Active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Provision New Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Provision Employee Account</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Configure Role, Department, and Designation</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '50%', color: '#64748b', cursor: 'pointer' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP1006"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ankit Verma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ankit.verma@fairmacs.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700, color: '#0284c7' }}
                  >
                    <option value="EMPLOYEE">Employee (Learner)</option>
                    <option value="TRAINER">Trainer (Content Author)</option>
                    <option value="MANAGER">Manager (Supervisor)</option>
                    <option value="HR_ADMIN">HR / Admin (System Leader)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({
                      ...formData,
                      department: e.target.value,
                      designation: `${e.target.value} Executive`
                    })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  >
                    <option value="Documentation">Documentation</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales & BD</option>
                    <option value="HR">HR</option>
                    <option value="IT">IT</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Documentation Executive"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Automatic Department Learning Path Notice */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.82rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap style={{ width: 16, height: 16, color: '#0284c7', flexShrink: 0 }} />
                <span>
                  <strong>Auto-Assignment Rule:</strong> System will automatically assign the <strong>{formData.department} Department Mandatory Learning Track</strong> upon creation.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#7e22ce' }}>
                  Create & Auto-Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
