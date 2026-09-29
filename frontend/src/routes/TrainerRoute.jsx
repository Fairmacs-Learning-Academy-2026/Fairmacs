import React from 'react';
import RoleRoute from './RoleRoute';

export default function TrainerRoute({ children }) {
  return (
    <RoleRoute allowedRoles={['TRAINER']}>
      {children}
    </RoleRoute>
  );
}
