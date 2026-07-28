import React from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import MessageDraftingPanel from '@/app/components/MessageDraftingPanel';
import RenewalMessagesPanel from '@/app/components/RenewalMessagesPanel';
import MarketingOffersPanel from '@/app/components/MarketingOffersPanel';

export default function MessagesPage() {
  return (
    <AuthGuard>
      <AppLayout currentPath="/messages">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-700 text-foreground">الرسائل والتسويق</h1>
            <p className="text-sm text-muted-foreground mt-1">إدارة رسائل التجديد والعروض التسويقية</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <MessageDraftingPanel />
            <RenewalMessagesPanel />
            <MarketingOffersPanel />
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
