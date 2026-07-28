'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';

export default function NotFound() {
  return (
    <AuthGuard>
      <AppLayout currentPath="">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-700 text-foreground">Page Not Found</h1>
            <p className="text-muted-foreground mt-2">The page you are looking for does not exist.</p>
          </div>
          <a href="/" className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 transition-all duration-150">
            Back to Dashboard
          </a>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}