import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_USERS_DATABASE } from '../data/mockData';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const LEGACY_USER_KEY = 'fairmacs_lms_user';
const LEGACY_TOKEN_KEY = 'fairmacs_lms_token';
const CANON_USER_KEY = 'fairmacs_user';
const CANON_TOKEN_KEY = 'fairmacs_token';

function persistAuth(u, t) {
  if (u) {
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(u));
    localStorage.setItem(CANON_USER_KEY, JSON.stringify(u));
  }
  if (t) {
    localStorage.setItem(LEGACY_TOKEN_KEY, t);
    localStorage.setItem(CANON_TOKEN_KEY, t);
  }
}

function clearAuth() {
  localStorage.removeItem(LEGACY_USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(CANON_USER_KEY);
  localStorage.removeItem(CANON_TOKEN_KEY);
}

export function AuthProvider({ children }) {
  const [usersList, setUsersList] = useState(() => {
    try {
      const savedUsers = localStorage.getItem('fairmacs_lms_users');
      if (!savedUsers) return MOCK_USERS_DATABASE;
      const parsed = JSON.parse(savedUsers);
      const mergedMap = new Map();
      MOCK_USERS_DATABASE.forEach(u => mergedMap.set(u.id, u));
      parsed.forEach(u => {
        if (!mergedMap.has(u.id)) mergedMap.set(u.id, u);
      });
      return Array.from(mergedMap.values());
    } catch (e) {
      return MOCK_USERS_DATABASE;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem('fairmacs_lms_user') ||
        localStorage.getItem('fairmacs_user');

      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem(CANON_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
  });

  useEffect(() => {
    localStorage.setItem('fairmacs_lms_users', JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    if (user) {
      persistAuth(user, token);
    } else {
      clearAuth();
    }
  }, [user, token]);

  const login = async (loginId, password) => {
    if (!loginId || !password) {
      return { success: false, message: 'Please enter both Employee ID / Corporate Email and Password.' };
    }

    const cleanId = loginId.trim().toLowerCase();
    const cleanPass = password.trim();

    let backendUser = null;
    let backendToken = null;
    let backendError = null;
    try {
      const res = await authService.login(cleanId, cleanPass);
      if (res?.success) {
        backendToken = res.token;
        backendUser = res.user;
      } else {
        backendError = res?.error;
      }
    } catch (e) {
      console.warn('Backend login unavailable, falling back to local:', e);
      backendError = e.message;
    }

    const findLocal = () => {
      let found = usersList.find(
        u => (u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId) && u.password === cleanPass
      );
      if (!found) {
        found = MOCK_USERS_DATABASE.find(
          u => (u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId) && u.password === cleanPass
        );
      }
      return found;
    };

    if (backendUser && backendToken) {
      const normalizedUser = backendUser.id ? backendUser : {
        ...backendUser,
        id: backendUser.employeeId || backendUser.userId || cleanId.toUpperCase(),
        name: backendUser.userName || backendUser.name || cleanId,
        role: backendUser.role || 'EMPLOYEE',
        roleLabel: (() => {
          const r = (backendUser.role || 'EMPLOYEE').toUpperCase();
          if (r === 'HR_ADMIN') return 'HR / Admin';
          return r.charAt(0) + r.slice(1).toLowerCase();
        })(),
        department: backendUser.department || 'Operations',
        designation: backendUser.designation || 'Executive',
        email: backendUser.email || `${cleanId}@fairmacs.com`,
        status: 'Active',
        password: cleanPass,
      };
      if (normalizedUser.status === 'Disabled') {
        return { success: false, message: 'Your account has been disabled. Please contact HR Admin.' };
      }
      setUser(normalizedUser);
      setToken(backendToken);
      return { success: true, user: normalizedUser };
    }

    const foundUser = findLocal();
    if (foundUser) {
      if (foundUser.status === 'Disabled') {
        return { success: false, message: 'Your account has been disabled. Please contact HR Admin.' };
      }
      const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${foundUser.id}_${Date.now()}`;
      setUser(foundUser);
      setToken(fakeToken);
      return { success: true, user: foundUser, fallback: !!backendError };
    }

    return { success: false, message: backendError || 'Invalid Employee ID/Email or Password. Check credentials.' };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  // Change Password handler
  const changePassword = (currentPassword, newPassword) => {
    if (!user) return { success: false, message: 'No user session.' };
    if (user.password !== currentPassword) {
      return { success: false, message: 'Current password does not match.' };
    }

    const updatedUser = { ...user, password: newPassword };
    setUser(updatedUser);
    setUsersList(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    return { success: true, message: 'Password updated successfully!' };
  };

  // HR Add Employee handler with Automatic Department Learning Path Assignment
  const createEmployee = (newEmpData) => {
    const dept = newEmpData.department || 'Operations';
    const newEmp = {
      id: newEmpData.id || `EMP${1000 + usersList.length + 1}`,
      name: newEmpData.name,
      role: newEmpData.role || 'EMPLOYEE',
      roleLabel: newEmpData.role === 'HR_ADMIN' ? 'HR / Admin' : (newEmpData.role ? newEmpData.role.charAt(0) + newEmpData.role.slice(1).toLowerCase() : 'Employee'),
      designation: newEmpData.designation || 'Executive',
      department: dept,
      branch: newEmpData.branch || 'Corporate HQ',
      email: newEmpData.email,
      password: newEmpData.password || 'Employee@123',
      joiningDate: newEmpData.joiningDate || new Date().toISOString().split('T')[0],
      status: newEmpData.status || 'Active',
      autoAssignedDeptTrack: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
    };

    setUsersList(prev => [...prev, newEmp]);
    return { success: true, employee: newEmp };
  };

  // HR Toggle User Status
  const toggleUserStatus = (empId) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === empId) {
        const nextStatus = u.status === 'Active' ? 'Disabled' : 'Active';
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  // HR Reset Password
  const resetUserPassword = (empId, newPass = 'Reset@123') => {
    setUsersList(prev => prev.map(u => u.id === empId ? { ...u, password: newPass } : u));
    return { success: true, newPass };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        token,
        usersList,
        login,
        logout,
        changePassword,
        createEmployee,
        toggleUserStatus,
        resetUserPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
