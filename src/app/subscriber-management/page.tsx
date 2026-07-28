import React from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import SubscriberManagementContent from './components/SubscriberManagementContent';

export default function SubscriberManagementPage() {
  return (
    <AuthGuard>
      <AppLayout currentPath="/subscriber-management">
        <SubscriberManagementContent />
      </AppLayout>
    </AuthGuard>
  );
}