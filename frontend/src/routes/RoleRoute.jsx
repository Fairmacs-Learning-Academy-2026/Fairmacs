import React from 'react';
import {
  Navigate,
  useLocation
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';


/*
 * Returns the correct dashboard for each role.
 */
function getDashboardPath(role) {

  switch (
    String(role || '').toUpperCase()
  ) {

    case 'TRAINER':
      return '/trainer';

    case 'MANAGER':
      return '/manager';

    case 'HR_ADMIN':
      return '/hr/overview';

    case 'EMPLOYEE':
    default:
      return '/dashboard';
  }
}


export default function RoleRoute({
  children,
  allowedRoles = []
}) {

  const {
    user,
    isAuthenticated,
    token
  } = useAuth();

  const location =
    useLocation();


  /*
   * No authenticated session.
   */
  if (
    !isAuthenticated ||
    !user ||
    !token
  ) {

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname
        }}
      />
    );
  }


  /*
   * Normalize the logged-in user's role.
   */
  const userRole =
    String(
      user.role || ''
    ).toUpperCase();


  /*
   * Normalize allowed roles.
   */
  const normalizedAllowedRoles =
    allowedRoles.map(
      role =>
        String(
          role
        ).toUpperCase()
    );


  /*
   * User is trying to access a route
   * belonging to another role.
   *
   * Instead of sending the user to an
   * employee dashboard or leaving them
   * in the wrong area, send them to their
   * own dashboard.
   */
  if (
    !normalizedAllowedRoles.includes(
      userRole
    )
  ) {

    return (
      <Navigate
        to={getDashboardPath(userRole)}
        replace
      />
    );
  }


  /*
   * User has the correct role.
   */
  return children;
}