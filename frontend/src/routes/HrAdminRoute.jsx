import React from 'react';
import RoleRoute from './RoleRoute';

export default function HrAdminRoute({ children }) {
  return (
    <RoleRoute allowedRoles={['HR_ADMIN']}>
      {children}
    </RoleRoute>
  );
}
