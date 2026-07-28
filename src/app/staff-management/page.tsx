import React from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import StaffManagementContent from './components/StaffManagementContent';

export default function StaffManagementPage() {
  return (
    <AuthGuard>
      <AppLayout currentPath="/staff-management">
        <StaffManagementContent />
      </AppLayout>
    </AuthGuard>
  );
}
