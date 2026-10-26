import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react';

import { MOCK_USERS_DATABASE } from '../data/mockData';
import authService from '../services/authService.js';
import hrAdminService from '../services/hrAdminService';

const AuthContext = createContext(null);

const LEGACY_USER_KEY = 'fairmacs_lms_user';
const LEGACY_TOKEN_KEY = 'fairmacs_lms_token';
const CANON_USER_KEY = 'fairmacs_user';
const CANON_TOKEN_KEY = 'fairmacs_token';

function persistAuth(u, t) {
  if (u) {
    localStorage.setItem(
      LEGACY_USER_KEY,
      JSON.stringify(u)
    );

    localStorage.setItem(
      CANON_USER_KEY,
      JSON.stringify(u)
    );
  }

  if (t) {
    localStorage.setItem(
      LEGACY_TOKEN_KEY,
      t
    );

    localStorage.setItem(
      CANON_TOKEN_KEY,
      t
    );
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
    employeeId:
      employee.employeeId || employee.id,
    role: employee.role || 'EMPLOYEE',
    roleLabel:
      employee.roleLabel || 'Employee',
    status:
      employee.status || 'Active',
    statusCode:
      employee.statusCode ||
      (
        employee.status || 'ACTIVE'
      )
        .toUpperCase()
        .replace(/\s+/g, '_'),
    designation:
      employee.designation || 'Executive',
    department:
      employee.department || 'Operations'
  };
}

export function AuthProvider({ children }) {
  const [usersList, setUsersList] = useState(() => {
    try {
      const savedUsers =
        localStorage.getItem(
          'fairmacs_lms_users'
        );

      if (!savedUsers) {
        return MOCK_USERS_DATABASE;
      }

      const parsed = JSON.parse(savedUsers);

      const mergedMap = new Map();

      MOCK_USERS_DATABASE.forEach(user => {
        mergedMap.set(user.id, user);
      });

      parsed.forEach(user => {
        if (!mergedMap.has(user.id)) {
          mergedMap.set(user.id, user);
        }
      });

      return Array.from(
        mergedMap.values()
      );

    } catch {
      return MOCK_USERS_DATABASE;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem(
          LEGACY_USER_KEY
        ) ||
        localStorage.getItem(
          CANON_USER_KEY
        );

      return savedUser
        ? JSON.parse(savedUser)
        : null;

    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return (
      localStorage.getItem(
        CANON_TOKEN_KEY
      ) ||
      localStorage.getItem(
        LEGACY_TOKEN_KEY
      ) ||
      ''
    );
  });

  const [employeesLoading, setEmployeesLoading] =
    useState(false);

  useEffect(() => {
    localStorage.setItem(
      'fairmacs_lms_users',
      JSON.stringify(usersList)
    );
  }, [usersList]);

  useEffect(() => {
    if (user) {
      persistAuth(user, token);
    } else {
      clearAuth();
    }
  }, [user, token]);

  const loadEmployees = useCallback(async () => {
    if (
      !token ||
      user?.role !== 'HR_ADMIN'
    ) {
      return {
        success: false,
        skipped: true
      };
    }

    setEmployeesLoading(true);

    try {
      const employees =
        await hrAdminService.getEmployees();

      const normalizedEmployees =
        Array.isArray(employees)
          ? employees.map(
              normalizeEmployee
            )
          : [];

      setUsersList(
        normalizedEmployees
      );

      return {
        success: true,
        employees:
          normalizedEmployees
      };

    } catch (error) {
      console.error(
        'Unable to load employees from backend:',
        error
      );

      return {
        success: false,
        message:
          error.message ||
          'Unable to load employees.'
      };

    } finally {
      setEmployeesLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    if (
      user?.role === 'HR_ADMIN' &&
      token
    ) {
      loadEmployees();
    }
  }, [
    user?.role,
    token,
    loadEmployees
  ]);

  const login = async (
    loginId,
    password
  ) => {
    if (!loginId || !password) {
      return {
        success: false,
        message:
          'Please enter both Employee ID / Corporate Email and Password.'
      };
    }

    const cleanId =
      loginId.trim().toLowerCase();

    const cleanPass =
      password.trim();

    try {
      const res =
        await authService.login(
          cleanId,
          cleanPass
        );

      if (!res?.success) {
        return {
          success: false,
          message:
            res?.error ||
            res?.message ||
            'Invalid Employee ID/Email or Password. Check credentials.'
        };
      }

      if (
        !res.token ||
        !res.user
      ) {
        return {
          success: false,
          message:
            'Login failed. The server returned an invalid authentication response.'
        };
      }

      const backendUser =
        res.user;

      const backendToken =
        res.token;

      const normalizedUser =
        backendUser.id
          ? backendUser
          : {
              ...backendUser,

              id:
                backendUser.employeeId ||
                backendUser.userId ||
                cleanId.toUpperCase(),

              name:
                backendUser.userName ||
                backendUser.name ||
                cleanId,

              role:
                backendUser.role ||
                'EMPLOYEE',

              roleLabel: (() => {
                const r =
                  (
                    backendUser.role ||
                    'EMPLOYEE'
                  ).toUpperCase();

                if (
                  r === 'HR_ADMIN'
                ) {
                  return 'HR / Admin';
                }

                return (
                  r.charAt(0) +
                  r.slice(1).toLowerCase()
                );
              })(),

              department:
                backendUser.department ||
                'Operations',

              designation:
                backendUser.designation ||
                'Executive',

              email:
                backendUser.email ||
                `${cleanId}@fairmacs.com`,

              status:
                backendUser.status ||
                'Active'
            };

      if (
        normalizedUser.status ===
        'Disabled'
      ) {
        return {
          success: false,
          message:
            'Your account has been disabled. Please contact HR Admin.'
        };
      }

      setUser(normalizedUser);
      setToken(backendToken);

      return {
        success: true,
        user: normalizedUser
      };

    } catch (error) {
      console.error(
        'Backend login failed:',
        error
      );

      return {
        success: false,
        message:
          error?.message ||
          'Unable to connect to the server. Please try again.'
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const changePassword = async (
    currentPassword,
    newPassword
  ) => {
    if (!user) {
      return {
        success: false,
        message: 'No user session.'
      };
    }

    try {
      const result =
        await authService.changePassword(
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

      return {
        success: true,
        message:
          result?.message ||
          'Password updated successfully!'
      };

    } catch (error) {
      console.error(
        'Change password failed:',
        error
      );

      return {
        success: false,
        message:
          error?.message ||
          'Unable to change password.'
      };
    }
  };

  const createEmployee = async (
    newEmpData
  ) => {
    try {
      const employee =
        await hrAdminService.createEmployee(
          newEmpData
        );

      const normalizedEmployee =
        normalizeEmployee(
          employee
        );

      setUsersList(prev => {
        const withoutDuplicate =
          prev.filter(
            u =>
              u.id !==
              normalizedEmployee.id
          );

        return [
          ...withoutDuplicate,
          normalizedEmployee
        ];
      });

      return {
        success: true,
        employee:
          normalizedEmployee
      };

    } catch (error) {
      console.error(
        'Create employee failed:',
        error
      );

      return {
        success: false,
        message:
          error.message ||
          'Unable to create employee.'
      };
    }
  };

  const importEmployees = async (
    file
  ) => {
    try {
      const result =
        await hrAdminService.importEmployees(
          file
        );

      if (
        result?.success
      ) {
        await loadEmployees();
      }

      return result;

    } catch (error) {
      console.error(
        'Import employees failed:',
        error
      );

      return {
        success: false,
        message:
          error.message ||
          'Unable to import employees.'
      };
    }
  };

  const changeEmployeeStatus = async (
  empId,
  newStatus
) => {
  try {
    const updatedEmployee =
      await hrAdminService.changeEmployeeStatus(
        empId,
        newStatus
      );

    const normalizedEmployee =
      normalizeEmployee(
        updatedEmployee
      );

    setUsersList(prev =>
      prev.map(employee => {
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
    console.error(
      'Change employee status failed:',
      error
    );

    return {
      success: false,
      message:
        error.message ||
        'Unable to update employee status.'
    };
  }
};

  const resetUserPassword = async (
    empId,
    newPass = 'Reset@123'
  ) => {
    try {
      const result =
        await hrAdminService.resetEmployeePassword(
          empId,
          newPass
        );

      return {
        success:
          result?.success === true,

        temporaryPasswordSet:
          result?.temporaryPasswordSet === true
      };

    } catch (error) {
      console.error(
        'Reset password failed:',
        error
      );

      return {
        success: false,
        temporaryPasswordSet: false,
        message:
          error.message ||
          'Unable to reset password.'
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
}