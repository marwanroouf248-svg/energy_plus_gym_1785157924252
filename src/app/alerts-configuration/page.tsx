'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import AlertsConfigurationContent from './components/AlertsConfigurationContent';

export default function AlertsConfigurationPage() {
  return (
    <AuthGuard>
      <AppLayout currentPath="/alerts-configuration">
        <AlertsConfigurationContent />
      </AppLayout>
    </AuthGuard>
  );
}
