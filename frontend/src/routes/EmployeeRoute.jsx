import React from 'react';
import RoleRoute from './RoleRoute';

export default function EmployeeRoute({ children }) {
  return (
    <RoleRoute allowedRoles={['EMPLOYEE']}>
      {children}
    </RoleRoute>
  );
}
