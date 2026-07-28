'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { toast } from 'sonner';

interface ReportData {
  totalSubscribers: number;
  activeSubscribers: number;
  expiredSubscribers: number;
  expiringSubscribers: number;
  frozenSubscribers: number;
  totalRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  branchStats: { name: string; subscribers: number; revenue: number }[];
  packageStats: { name: string; count: number; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number; subscribers: number }[];
  staffPerformance: { name: string; subscribers: number; leads: number; revenue: number }[];
  expiringThisWeek: { name: string; phone: string; branch: string; endDate: string; package: string }[];
  overduePayments: { name: string; phone: string; branch: string; remaining: number; package: string }[];
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'branches' | 'leads' | 'expiry' | 'staff'>('overview');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [subsRes, leadsRes] = await Promise.all([
        supabase.from('subscribers').select('*'),
        supabase.from('leads').select('*'),
      ]);
      if (subsRes.error) throw subsRes.error;
      if (leadsRes.error) throw leadsRes.error;

      const subs = subsRes.data || [];
      const leads = leadsRes.data || [];

      const today = new Date();
      const weekLater = new Date(today);
      weekLater.setDate(weekLater.getDate() + 7);

      const totalRevenue = subs.reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
      const collectedRevenue = subs.reduce((s: number, r: any) => s + (r.amount_paid || 0), 0);

      // Branch stats
      const branchMap: Record<string, { subscribers: number; revenue: number }> = {};
      subs.forEach((s: any) => {
        const b = s.branch || 'غير محدد';
        if (!branchMap[b]) branchMap[b] = { subscribers: 0, revenue: 0 };
        branchMap[b].subscribers++;
        branchMap[b].revenue += s.amount_paid || 0;
      });

      // Package stats
      const pkgMap: Record<string, { count: number; revenue: number }> = {};
      subs.forEach((s: any) => {
        const p = s.package || 'Monthly';
        if (!pkgMap[p]) pkgMap[p] = { count: 0, revenue: 0 };
        pkgMap[p].count++;
        pkgMap[p].revenue += s.amount_paid || 0;
      });

      // Monthly revenue (last 6 months)
      const monthlyMap: Record<string, { revenue: number; subscribers: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('ar-EG', { month: 'short', year: '2-digit' });
        monthlyMap[key] = { revenue: 0, subscribers: 0 };
      }
      subs.forEach((s: any) => {
        if (!s.created_at) return;
        const d = new Date(s.created_at);
        const key = d.toLocaleString('ar-EG', { month: 'short', year: '2-digit' });
        if (monthlyMap[key]) {
          monthlyMap[key].revenue += s.amount_paid || 0;
          monthlyMap[key].subscribers++;
        }
      });

      // Staff performance
      const staffMap: Record<string, { subscribers: number; leads: number; revenue: number }> = {};
      subs.forEach((s: any) => {
        const name = s.assigned_to || 'غير محدد';
        if (!staffMap[name]) staffMap[name] = { subscribers: 0, leads: 0, revenue: 0 };
        staffMap[name].subscribers++;
        staffMap[name].revenue += s.amount_paid || 0;
      });
      leads.forEach((l: any) => {
        const name = l.assigned_to || 'غير محدد';
        if (!staffMap[name]) staffMap[name] = { subscribers: 0, leads: 0, revenue: 0 };
        staffMap[name].leads++;
      });

      // Expiring this week
      const expiringThisWeek = subs
        .filter((s: any) => {
          if (!s.end_date) return false;
          const end = new Date(s.end_date);
          return end >= today && end <= weekLater;
        })
        .map((s: any) => ({ name: s.name, phone: s.phone, branch: s.branch, endDate: s.end_date, package: s.package }));

      // Overdue payments
      const overduePayments = subs
        .filter((s: any) => (s.remaining_balance || 0) > 0)
        .map((s: any) => ({ name: s.name, phone: s.phone, branch: s.branch, remaining: s.remaining_balance, package: s.package }))
        .sort((a: any, b: any) => b.remaining - a.remaining);

      const converted = leads.filter((l: any) => l.status === 'converted').length;

      setData({
        totalSubscribers: subs.length,
        activeSubscribers: subs.filter((s: any) => s.status === 'active').length,
        expiredSubscribers: subs.filter((s: any) => s.status === 'expired').length,
        expiringSubscribers: subs.filter((s: any) => s.status === 'expiring').length,
        frozenSubscribers: subs.filter((s: any) => s.status === 'frozen').length,
        totalRevenue,
        collectedRevenue,
        pendingRevenue: totalRevenue - collectedRevenue,
        totalLeads: leads.length,
        convertedLeads: converted,
        conversionRate: leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0,
        branchStats: Object.entries(branchMap).map(([name, v]) => ({ name, ...v })),
        packageStats: Object.entries(pkgMap).map(([name, v]) => ({ name, ...v })),
        monthlyRevenue: Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v })),
        staffPerformance: Object.entries(staffMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
        expiringThisWeek,
        overduePayments,
      });
    } catch (err: any) {
      toast.error('فشل تحميل التقارير: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: 'ChartBarIcon' },
    { id: 'branches', label: 'الفروع', icon: 'BuildingOfficeIcon' },
    { id: 'leads', label: 'الليدز', icon: 'UserPlusIcon' },
    { id: 'expiry', label: 'الانتهاء والمديونية', icon: 'ExclamationTriangleIcon' },
    { id: 'staff', label: 'أداء الموظفين', icon: 'IdentificationIcon' },
  ] as const;

  return (
    <AuthGuard>
      <AppLayout currentPath="/reports">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-700 text-foreground">التقارير والإحصائيات</h1>
              <p className="text-sm text-muted-foreground mt-1">تحليل شامل لأداء النادي</p>
            </div>
            <button
              onClick={fetchReports}
              className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-600 hover:bg-muted/80 transition-colors"
            >
              <Icon name="ArrowPathIcon" size={16} />
              تحديث
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-500 whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-card text-foreground shadow-sm font-600'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab.icon as any} size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-8 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : data ? (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'إجمالي المشتركين', value: data.totalSubscribers, icon: 'UsersIcon', color: 'text-primary', bg: 'bg-primary/10' },
                      { label: 'مشتركون نشطون', value: data.activeSubscribers, icon: 'CheckCircleIcon', color: 'text-positive', bg: 'bg-positive-bg' },
                      { label: 'إجمالي الإيرادات', value: `${data.collectedRevenue.toLocaleString()} ج`, icon: 'BanknotesIcon', color: 'text-positive', bg: 'bg-positive-bg' },
                      { label: 'مديونيات معلقة', value: `${data.pendingRevenue.toLocaleString()} ج`, icon: 'ExclamationCircleIcon', color: 'text-warning', bg: 'bg-warning-bg' },
                    ].map((s) => (
                      <div key={s.label} className="bg-card border border-border rounded-xl p-5">
                        <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                          <Icon name={s.icon as any} size={20} className={s.color} />
                        </div>
                        <p className={`text-2xl font-700 ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-card border border-border rounded-xl p-5">
                      <h3 className="font-600 text-foreground mb-4">الإيرادات الشهرية</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={data.monthlyRevenue}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                          <Tooltip formatter={(v: any) => [`${v.toLocaleString()} ج`, 'الإيرادات']} />
                          <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-5">
                      <h3 className="font-600 text-foreground mb-4">توزيع الباقات</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={data.packageStats} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {data.packageStats.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'منتهي', value: data.expiredSubscribers, color: 'text-negative' },
                      { label: 'على وشك الانتهاء', value: data.expiringSubscribers, color: 'text-warning' },
                      { label: 'مجمد', value: data.frozenSubscribers, color: 'text-muted-foreground' },
                      { label: 'معدل التحويل', value: `${data.conversionRate}%`, color: 'text-primary' },
                    ].map((s) => (
                      <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                        <p className={`text-2xl font-700 ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Branches Tab */}
              {activeTab === 'branches' && (
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-600 text-foreground mb-4">مقارنة الفروع</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.branchStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <Tooltip />
                        <Bar dataKey="subscribers" name="المشتركون" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="revenue" name="الإيرادات" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">الفرع</th>
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">المشتركون</th>
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">الإيرادات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.branchStats.map((b) => (
                          <tr key={b.name} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-500 text-foreground">{b.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{b.subscribers}</td>
                            <td className="px-4 py-3 text-positive font-500">{b.revenue.toLocaleString()} ج</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Leads Tab */}
              {activeTab === 'leads' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'إجمالي الليدز', value: data.totalLeads, color: 'text-primary' },
                      { label: 'تحولوا لمشتركين', value: data.convertedLeads, color: 'text-positive' },
                      { label: 'معدل التحويل', value: `${data.conversionRate}%`, color: 'text-warning' },
                    ].map((s) => (
                      <div key={s.label} className="bg-card border border-border rounded-xl p-5 text-center">
                        <p className={`text-3xl font-700 ${s.color}`}>{s.value}</p>
                        <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-600 text-foreground mb-4">المشتركون الجدد شهرياً</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <Tooltip />
                        <Bar dataKey="subscribers" name="مشتركون جدد" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Expiry Tab */}
              {activeTab === 'expiry' && (
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                      <Icon name="CalendarDaysIcon" size={18} className="text-warning" />
                      <h3 className="font-600 text-foreground">اشتراكات تنتهي هذا الأسبوع ({data.expiringThisWeek.length})</h3>
                    </div>
                    {data.expiringThisWeek.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">لا توجد اشتراكات تنتهي هذا الأسبوع</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-right px-4 py-3 font-600 text-muted-foreground">الاسم</th>
                            <th className="text-right px-4 py-3 font-600 text-muted-foreground">الهاتف</th>
                            <th className="text-right px-4 py-3 font-600 text-muted-foreground">الفرع</th>
                            <th className="text-right px-4 py-3 font-600 text-muted-foreground">الباقة</th>
                            <th className="text-right px-4 py-3 font-600 text-muted-foreground">تاريخ الانتهاء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {data.expiringThisWeek.map((s, i) => (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-500 text-foreground">{s.name}</td>
                              <td className="px-4 py-3 text-muted-foreground" dir="ltr">{s.phone}</td>
                              <td className="px-4 py-3 text-muted-foreground">{s.branch}</td>
                              <td className="px-4 py-3 text-muted-foreground">{s.package}</td>
                              <td className="px-4 py-3 text-warning font-500">{s.endDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                      <Icon name="BanknotesIcon" size={18} className="text-negative" />
                      <h3 className="font-600 text-foreground">مديونيات معلقة ({data.overduePayments.length})</h3>
                    </div>
                    {data.overduePayments.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">لا توجد مديونيات معلقة</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-right px-4 py-3 font-600 text-muted-foreground">الاسم</th>
                            <th className="text-right px-4 py-3 font-600 text-muted-foreground">الهاتف</th>
                            <th className="text-right px-4 py-3 font-600 text-muted-foreground">الفرع</th>
                            <th className="text-right px-4 py-3 font-600 text-muted-foreground">الباقة</th>
                            <th className="text-right px-4 py-3 font-600 text-muted-foreground">المبلغ المتبقي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {data.overduePayments.map((s, i) => (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-500 text-foreground">{s.name}</td>
                              <td className="px-4 py-3 text-muted-foreground" dir="ltr">{s.phone}</td>
                              <td className="px-4 py-3 text-muted-foreground">{s.branch}</td>
                              <td className="px-4 py-3 text-muted-foreground">{s.package}</td>
                              <td className="px-4 py-3 text-negative font-600">{s.remaining.toLocaleString()} ج</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* Staff Tab */}
              {activeTab === 'staff' && (
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-600 text-foreground mb-4">أداء الموظفين</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.staffPerformance.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <Tooltip />
                        <Bar dataKey="subscribers" name="المشتركون" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="leads" name="الليدز" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">الموظف</th>
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">المشتركون</th>
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">الليدز</th>
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">الإيرادات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.staffPerformance.map((s, i) => (
                          <tr key={i} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-500 text-foreground">{s.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{s.subscribers}</td>
                            <td className="px-4 py-3 text-muted-foreground">{s.leads}</td>
                            <td className="px-4 py-3 text-positive font-500">{s.revenue.toLocaleString()} ج</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
