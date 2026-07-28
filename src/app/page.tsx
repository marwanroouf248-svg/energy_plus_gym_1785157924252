import React from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import MetricsBentoGrid from './components/MetricsBentoGrid';
import CallMetricsGrid from './components/CallMetricsGrid';
import RevenueChartSection from './components/RevenueChartSection';
import MessageDraftingPanel from './components/MessageDraftingPanel';
import RenewalMessagesPanel from './components/RenewalMessagesPanel';
import MarketingOffersPanel from './components/MarketingOffersPanel';

export default function SalesDashboardPage() {
  return (
    <AuthGuard>
      <AppLayout currentPath="/">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-700" style={{ color: '#f0f2f8' }}>Sales Dashboard</h1>
              <p className="text-sm mt-1" style={{ color: '#6b7494' }}>
                Energy Plus — Sales Performance Overview
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 font-500"
                style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                Live data
              </span>
            </div>
          </div>

          {/* KPI Bento Grid */}
          <MetricsBentoGrid />

          {/* Call Effectiveness KPIs */}
          <CallMetricsGrid />

          {/* Charts Row */}
          <RevenueChartSection />

          {/* Bottom Panels */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1">
              <MessageDraftingPanel />
            </div>
            <div className="xl:col-span-1">
              <RenewalMessagesPanel />
            </div>
            <div className="xl:col-span-1">
              <MarketingOffersPanel />
            </div>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}