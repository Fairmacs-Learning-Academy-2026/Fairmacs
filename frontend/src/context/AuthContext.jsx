import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react';

import authService from '../services/authService.js';
import hrAdminService from '../services/hrAdminService';

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

function normalizeEmployee(employee) {
  return {
    ...employee,
    id: employee.id || employee.employeeId,
    employeeId: employee.employeeId || employee.id,
    role: employee.role || 'EMPLOYEE',
    roleLabel: employee.roleLabel || 'Employee',
    status: employee.status || 'Active',
    statusCode:
      employee.statusCode ||
      (employee.status || 'ACTIVE').toUpperCase().replace(/\s+/g, '_'),
    designation: employee.designation || 'Executive',
    department: employee.department || 'Operations',
    mustChangePassword: Boolean(employee.mustChangePassword)
  };
}

export function AuthProvider({ children }) {
  const [usersList, setUsersList] = useState([]);

  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem(CANON_USER_KEY) ||
        localStorage.getItem(LEGACY_USER_KEY);

      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return (
      localStorage.getItem(CANON_TOKEN_KEY) ||
      localStorage.getItem(LEGACY_TOKEN_KEY) ||
      ''
    );
  });

  const [employeesLoading, setEmployeesLoading] = useState(false);

  useEffect(() => {
    if (user && token) {
      persistAuth(user, token);
    } else if (!user || !token) {
      clearAuth();
    }
  }, [user, token]);

  // Synchronize authoritative profile and mustChangePassword state from backend on session restore
  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    authService.getCurrentUser().then((serverProfile) => {
      if (cancelled) return;
      if (!serverProfile) {
        if (!authService.getToken()) {
          setUser(null);
          setToken('');
        }
        return;
      }
      setUser((prev) => ({
        ...(prev || {}),
        ...serverProfile,
        mustChangePassword: Boolean(serverProfile.mustChangePassword)
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const loadEmployees = useCallback(async () => {
    if (
      !token ||
      user?.role !== 'HR_ADMIN' ||
      user?.mustChangePassword
    ) {
      return {
        success: false,
        skipped: true
      };
    }

    setEmployeesLoading(true);

    try {
      const employees = await hrAdminService.getEmployees();
      const normalizedEmployees = Array.isArray(employees)
        ? employees.map(normalizeEmployee)
        : [];

      setUsersList(normalizedEmployees);

      return {
        success: true,
        employees: normalizedEmployees
      };

    } catch (error) {
      console.error('Unable to load employees from backend:', error);
      return {
        success: false,
        message: error.message || 'Unable to load employees.'
      };
    } finally {
      setEmployeesLoading(false);
    }
  }, [token, user?.role, user?.mustChangePassword]);

  useEffect(() => {
    if (user?.role === 'HR_ADMIN' && token && !user?.mustChangePassword) {
      loadEmployees();
    }
  }, [user?.role, user?.mustChangePassword, token, loadEmployees]);

  const login = async (loginId, password) => {
    if (!loginId || !password) {
      return {
        success: false,
        message: 'Please enter both Employee ID / Corporate Email and Password.'
      };
    }

    const cleanId = loginId.trim();
    const cleanPass = password;

    try {
      const res = await authService.login(cleanId, cleanPass);

      if (!res?.success) {
        return {
          success: false,
          message:
            res?.error ||
            res?.message ||
            'Invalid Employee ID/Email or Password. Check credentials.'
        };
      }

      if (!res.token || !res.user) {
        return {
          success: false,
          message: 'Login failed. The server returned an invalid authentication response.'
        };
      }

      const backendUser = res.user;
      const backendToken = res.token;

      const normalizedUser = {
        ...backendUser,
        id: backendUser.id || backendUser.employeeId || backendUser.userId,
        employeeId: backendUser.employeeId || backendUser.id,
        name: backendUser.userName || backendUser.name || cleanId,
        role: backendUser.role || 'EMPLOYEE',
        roleLabel:
          backendUser.roleLabel ||
          ((backendUser.role || 'EMPLOYEE').toUpperCase() === 'HR_ADMIN'
            ? 'HR / Admin'
            : (backendUser.role || 'EMPLOYEE').charAt(0) +
              (backendUser.role || 'EMPLOYEE').slice(1).toLowerCase()),
        department: backendUser.department || 'Operations',
        designation: backendUser.designation || 'Executive',
        email: backendUser.email || '',
        status: backendUser.status || 'Active',
        mustChangePassword: Boolean(backendUser.mustChangePassword)
      };

      if (normalizedUser.status === 'Disabled') {
        return {
          success: false,
          message: 'Your account has been disabled. Please contact HR Admin.'
        };
      }

      setUser(normalizedUser);
      setToken(backendToken);

      return {
        success: true,
        user: normalizedUser
      };

    } catch (error) {
      console.error('Backend login failed:', error);
      return {
        success: false,
        message: error?.message || 'Unable to connect to the server. Please try again.'
      };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken('');
    setUsersList([]);
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user) {
      return {
        success: false,
        message: 'No user session.'
      };
    }

    try {
      const result = await authService.changePassword(
        currentPassword,
        newPassword
      );

      if (!result?.success) {
        return {
          success: false,
          message:
            result?.error ||
            result?.message ||
            'Unable to change password.'
        };
      }

      const updatedData = result?.data || {};
      const rotatedToken = updatedData.token || token;

      setUser((prev) =>
        prev
          ? {
              ...prev,
              ...updatedData,
              mustChangePassword: false
            }
          : prev
      );

      if (rotatedToken) {
        setToken(rotatedToken);
      }

      return {
        success: true,
        message: result?.message || 'Password updated successfully!'
      };

    } catch (error) {
      console.error('Change password failed:', error);
      return {
        success: false,
        message: error?.message || 'Unable to change password.'
      };
    }
  };

  const createEmployee = async (newEmpData) => {
    try {
      const employee = await hrAdminService.createEmployee(newEmpData);
      const normalizedEmployee = normalizeEmployee(employee);

      setUsersList((prev) => {
        const withoutDuplicate = prev.filter((u) => u.id !== normalizedEmployee.id);
        return [...withoutDuplicate, normalizedEmployee];
      });

      return {
        success: true,
        employee: normalizedEmployee
      };

    } catch (error) {
      console.error('Create employee failed:', error);
      return {
        success: false,
        message: error.message || 'Unable to create employee.'
      };
    }
  };

  const importEmployees = async (file) => {
    try {
      const result = await hrAdminService.importEmployees(file);
      if (result?.success) {
        await loadEmployees();
      }
      return result;
    } catch (error) {
      console.error('Import employees failed:', error);
      return {
        success: false,
        message: error.message || 'Unable to import employees.',
        errors: Array.isArray(error.data?.errors) ? error.data.errors : []
      };
    }
  };

  const changeEmployeeStatus = async (empId, newStatus, reason) => {
    try {
      const updatedEmployee = await hrAdminService.changeEmployeeStatus(empId, newStatus, reason);
      const normalizedEmployee = normalizeEmployee(updatedEmployee);

      setUsersList((prev) =>
        prev.map((employee) => {
          if (employee.id !== empId) {
            return employee;
          }
          return {
            ...employee,
            ...normalizedEmployee,
            id: employee.id,
            employeeId:
              employee.employeeId ||
              normalizedEmployee.employeeId ||
              employee.id,
          };
        })
      );

      return {
        success: true,
        employee: normalizedEmployee
      };

    } catch (error) {
      console.error('Change employee status failed:', error);
      return {
        success: false,
        message: error.message || 'Unable to update employee status.'
      };
    }
  };

  const resetUserPassword = async (empId, newPass) => {
    try {
      const result = await hrAdminService.resetEmployeePassword(empId, newPass);
      return {
        success: result?.success === true,
        temporaryPasswordSet: result?.temporaryPasswordSet === true,
        mustChangePassword: result?.mustChangePassword === true
      };
    } catch (error) {
      console.error('Reset password failed:', error);
      return {
        success: false,
        temporaryPasswordSet: false,
        message: error.message || 'Unable to reset password.'
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && token),
        mustChangePassword: Boolean(user?.mustChangePassword),
        token,

        usersList,
        employeesLoading,

        login,
        logout,
        changePassword,

        createEmployee,
        importEmployees,
        changeEmployeeStatus,
        resetUserPassword,

        loadEmployees
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
