import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRoute({
  children,
  allowedRoles = []
}) {
  const {
    user,
    isAuthenticated,
    token
  } = useAuth();

  const location = useLocation();

  // Not logged in
  if (!isAuthenticated || !user || !token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  const userRole = String(user.role || '').toUpperCase();

  const normalizedAllowedRoles = allowedRoles.map(role =>
    String(role).toUpperCase()
  );

  // Logged in but does not have permission
  if (!normalizedAllowedRoles.includes(userRole)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return children;
}