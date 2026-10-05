import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react';

import { MOCK_USERS_DATABASE } from '../data/mockData';
import { authService } from '../services/authService';
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

  /*
   * Keep localStorage as a temporary frontend cache.
   * MySQL/backend is now the source of truth for HR employees.
   */
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

  /*
   * Load employees from Spring Boot / MySQL
   */
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

  /*
   * Automatically load real employees
   * whenever HR Admin logs in.
   */
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

  /*
   * LOGIN
   *
   * Backend is the ONLY authentication source.
   * No local/mock login and no fake JWT fallback.
   */
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

      /*
       * Backend rejected the credentials.
       */
      if (!res?.success) {
        return {
          success: false,
          message:
            res?.error ||
            res?.message ||
            'Invalid Employee ID/Email or Password. Check credentials.'
        };
      }

      /*
       * Backend must provide both a user and a real JWT.
       */
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

      /*
       * Only now create the authenticated frontend session.
       */
      setUser(normalizedUser);
      setToken(backendToken);

      return {
        success: true,
        user: normalizedUser
      };

    } catch (error) {

      /*
       * Backend unavailable / network error.
       *
       * IMPORTANT:
       * Never fall back to mock users.
       * Never generate a fake JWT.
       */
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

  /*
   * LOGOUT
   */
  const logout = () => {
    setUser(null);
    setToken(null);
  };

  /*
   * CHANGE PASSWORD
   *
   * Existing frontend behaviour is preserved here.
   */
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

  /*
   * CREATE EMPLOYEE
   *
   * Now creates the employee in MySQL
   * through Spring Boot.
   */
  const createEmployee = async (
    newEmpData
  ) => {

    try {

      const employee =
        await hrAdminService.createEmployee(
          newEmpData
        );

      const normalizedEmployee =
        normalizeEmployee(employee);

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

  /*
   * ENABLE / DISABLE EMPLOYEE
   */
  const toggleUserStatus = async (
    empId
  ) => {

    try {

      const updatedEmployee =
        await hrAdminService
          .toggleEmployeeStatus(
            empId
          );

      const normalizedEmployee =
        normalizeEmployee(
          updatedEmployee
        );

      setUsersList(prev =>
        prev.map(u =>
          u.id ===
          normalizedEmployee.id
            ? normalizedEmployee
            : u
        )
      );

      return {
        success: true,
        employee:
          normalizedEmployee
      };

    } catch (error) {

      console.error(
        'Toggle employee status failed:',
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

  /*
   * RESET EMPLOYEE PASSWORD
   *
   * Backend now returns only a flag.
   * Never return or store the plaintext password.
   */
  const resetUserPassword = async (
    empId,
    newPass = 'Reset@123'
  ) => {

    try {

      const result =
        await hrAdminService
          .resetEmployeePassword(
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
        toggleUserStatus,
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