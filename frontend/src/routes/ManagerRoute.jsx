import React from 'react';
import RoleRoute from './RoleRoute';

export default function ManagerRoute({ children }) {
  return (
    <RoleRoute allowedRoles={['MANAGER']}>
      {children}
    </RoleRoute>
  );
}
