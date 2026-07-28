import React from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import CallTrackingContent from './components/CallTrackingContent';

export default function CallTrackingPage() {
  return (
    <AuthGuard>
      <AppLayout currentPath="/call-tracking">
        <CallTrackingContent />
      </AppLayout>
    </AuthGuard>
  );
}
