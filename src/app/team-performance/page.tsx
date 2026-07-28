'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface TeamMemberMetrics {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  subscribersAssigned: number;
  renewalsHandled: number;
  conversionRate: number;
  commissionEarned: number;
  totalLeads: number;
  convertedLeads: number;
}

const COMMISSION_RATE = 0.05; // 5% commission on collected revenue

export default function TeamPerformancePage() {
  const [metrics, setMetrics] = useState<TeamMemberMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState('');

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [staffRes, subsRes, leadsRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, full_name, email, role, branch')
          .in('role', ['sales_staff', 'branch_manager'])
          .eq('is_active', true),
        supabase
          .from('subscribers')
          .select('assigned_to, amount_paid, created_at, status, end_date, start_date')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd),
        supabase
          .from('leads')
          .select('assigned_to, status, created_at')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd),
      ]);

      if (staffRes.error) throw staffRes.error;
      if (subsRes.error) throw subsRes.error;
      if (leadsRes.error) throw leadsRes.error;

      const staff = staffRes.data || [];
      const subs = subsRes.data || [];
      const leads = leadsRes.data || [];

      // Also fetch renewals (subscribers whose start_date is this month but were existing members)
      const renewalsRes = await supabase
        .from('subscribers')
        .select('assigned_to, amount_paid, created_at, status')
        .gte('start_date', monthStart)
        .lte('start_date', monthEnd)
        .not('assigned_to', 'is', null);

      const renewals = renewalsRes.data || [];

      const memberMetrics: TeamMemberMetrics[] = staff.map((member: any) => {
        const memberName = member.full_name || member.email;

        // Subscribers assigned this month
        const memberSubs = subs.filter(
          (s: any) => s.assigned_to === memberName || s.assigned_to === member.id
        );

        // Renewals handled this month
        const memberRenewals = renewals.filter(
          (r: any) => r.assigned_to === memberName || r.assigned_to === member.id
        );

        // Leads this month
        const memberLeads = leads.filter(
          (l: any) => l.assigned_to === memberName || l.assigned_to === member.id
        );
        const convertedLeads = memberLeads.filter((l: any) => l.status === 'converted').length;
        const conversionRate =
          memberLeads.length > 0
            ? Math.round((convertedLeads / memberLeads.length) * 100)
            : 0;

        // Commission: 5% of collected revenue from assigned subscribers this month
        const totalCollected = memberSubs.reduce(
          (sum: number, s: any) => sum + (s.amount_paid || 0),
          0
        );
        const commissionEarned = Math.round(totalCollected * COMMISSION_RATE);

        return {
          id: member.id,
          name: memberName,
          email: member.email,
          role: member.role,
          branch: member.branch || 'غير محدد',
          subscribersAssigned: memberSubs.length,
          renewalsHandled: memberRenewals.length,
          conversionRate,
          commissionEarned,
          totalLeads: memberLeads.length,
          convertedLeads,
        };
      });

      // Sort by subscribers assigned descending
      memberMetrics.sort((a, b) => b.subscribersAssigned - a.subscribersAssigned);

      setMetrics(memberMetrics);
    } catch (err: any) {
      toast.error('فشل تحميل بيانات الفريق: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const now = new Date();
    setCurrentMonth(
      now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
    );
  }, [fetchMetrics]);

  const branches = ['all', ...Array.from(new Set(metrics.map((m) => m.branch)))];
  const roles = ['all', 'sales_staff', 'branch_manager'];

  const filtered = metrics.filter((m) => {
    const matchBranch = branchFilter === 'all' || m.branch === branchFilter;
    const matchRole = roleFilter === 'all' || m.role === roleFilter;
    return matchBranch && matchRole;
  });

  // Summary totals
  const totalSubscribers = filtered.reduce((s, m) => s + m.subscribersAssigned, 0);
  const totalRenewals = filtered.reduce((s, m) => s + m.renewalsHandled, 0);
  const avgConversion =
    filtered.length > 0
      ? Math.round(filtered.reduce((s, m) => s + m.conversionRate, 0) / filtered.length)
      : 0;
  const totalCommission = filtered.reduce((s, m) => s + m.commissionEarned, 0);

  const getRoleLabel = (role: string) => {
    if (role === 'sales_staff') return 'موظف مبيعات';
    if (role === 'branch_manager') return 'مدير فرع';
    return role;
  };

  const getRoleBadgeClass = (role: string) => {
    if (role === 'branch_manager') return 'bg-primary/10 text-primary';
    return 'bg-muted text-muted-foreground';
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 60) return 'text-positive';
    if (rate >= 30) return 'text-warning';
    return 'text-negative';
  };

  const getConversionBg = (rate: number) => {
    if (rate >= 60) return 'bg-positive-bg';
    if (rate >= 30) return 'bg-warning-bg';
    return 'bg-negative-bg';
  };

  return (
    <AuthGuard>
      <AppLayout currentPath="/team-performance">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-700 text-foreground">أداء الفريق</h1>
              <p className="text-sm text-muted-foreground mt-1">
                مقاييس أداء كل موظف — {currentMonth}
              </p>
            </div>
            <button
              onClick={fetchMetrics}
              className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-600 hover:bg-muted/80 transition-colors"
            >
              <Icon name="ArrowPathIcon" size={16} />
              تحديث
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'مشتركون مُسنَّدون',
                value: totalSubscribers,
                icon: 'UsersIcon',
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                label: 'تجديدات مُنجَزة',
                value: totalRenewals,
                icon: 'ArrowPathIcon',
                color: 'text-positive',
                bg: 'bg-positive-bg',
              },
              {
                label: 'متوسط معدل التحويل',
                value: `${avgConversion}%`,
                icon: 'ChartBarIcon',
                color: 'text-warning',
                bg: 'bg-warning-bg',
              },
              {
                label: 'إجمالي العمولات',
                value: `${totalCommission.toLocaleString()} ج`,
                icon: 'BanknotesIcon',
                color: 'text-positive',
                bg: 'bg-positive-bg',
              },
            ].map((card) => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-5">
                <div
                  className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}
                >
                  <Icon name={card.icon as any} size={20} className={card.color} />
                </div>
                <p className={`text-2xl font-700 ${card.color}`}>{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
              {branches.map((b) => (
                <button
                  key={b}
                  onClick={() => setBranchFilter(b)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-500 transition-all whitespace-nowrap ${
                    branchFilter === b
                      ? 'bg-card text-foreground shadow-sm font-600'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {b === 'all' ? 'كل الفروع' : b}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-500 transition-all whitespace-nowrap ${
                    roleFilter === r
                      ? 'bg-card text-foreground shadow-sm font-600'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r === 'all' ? 'كل الأدوار' : getRoleLabel(r)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl p-5 animate-pulse"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted rounded w-1/6" />
                    </div>
                    <div className="grid grid-cols-4 gap-8">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="h-8 bg-muted rounded w-16" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="UsersIcon" size={24} className="text-muted-foreground" />
              </div>
              <p className="text-foreground font-600 mb-1">لا يوجد موظفون</p>
              <p className="text-sm text-muted-foreground">
                لم يتم العثور على موظفين نشطين بالفلاتر المحددة
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 bg-muted/30 border-b border-border">
                <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">
                  الموظف
                </span>
                <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide text-center">
                  مشتركون مُسنَّدون
                </span>
                <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide text-center">
                  تجديدات
                </span>
                <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide text-center">
                  ليدز
                </span>
                <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide text-center">
                  معدل التحويل
                </span>
                <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide text-center">
                  العمولة
                </span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-border">
                {filtered.map((member, idx) => (
                  <div
                    key={member.id}
                    className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 hover:bg-muted/20 transition-colors"
                  >
                    {/* Member Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-700 text-sm">
                          {member.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-600 text-foreground truncate">{member.name}</p>
                          {idx === 0 && filtered.length > 1 && (
                            <span className="text-xs bg-warning-bg text-warning px-1.5 py-0.5 rounded-full font-600">
                              🏆 الأفضل
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-500 ${getRoleBadgeClass(member.role)}`}
                          >
                            {getRoleLabel(member.role)}
                          </span>
                          <span className="text-xs text-muted-foreground">{member.branch}</span>
                        </div>
                      </div>
                    </div>

                    {/* Subscribers Assigned */}
                    <div className="flex lg:flex-col items-center lg:justify-center gap-2">
                      <span className="text-xs text-muted-foreground lg:hidden">مشتركون:</span>
                      <div className="flex items-center gap-1.5">
                        <Icon name="UsersIcon" size={14} className="text-primary shrink-0" />
                        <span className="text-lg font-700 text-foreground">
                          {member.subscribersAssigned}
                        </span>
                      </div>
                    </div>

                    {/* Renewals */}
                    <div className="flex lg:flex-col items-center lg:justify-center gap-2">
                      <span className="text-xs text-muted-foreground lg:hidden">تجديدات:</span>
                      <div className="flex items-center gap-1.5">
                        <Icon name="ArrowPathIcon" size={14} className="text-positive shrink-0" />
                        <span className="text-lg font-700 text-foreground">
                          {member.renewalsHandled}
                        </span>
                      </div>
                    </div>

                    {/* Leads */}
                    <div className="flex lg:flex-col items-center lg:justify-center gap-2">
                      <span className="text-xs text-muted-foreground lg:hidden">ليدز:</span>
                      <div className="text-center">
                        <span className="text-lg font-700 text-foreground">{member.totalLeads}</span>
                        {member.convertedLeads > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {member.convertedLeads} تحوّل
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Conversion Rate */}
                    <div className="flex lg:flex-col items-center lg:justify-center gap-2">
                      <span className="text-xs text-muted-foreground lg:hidden">التحويل:</span>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-700 ${getConversionBg(member.conversionRate)} ${getConversionColor(member.conversionRate)}`}
                      >
                        {member.conversionRate}%
                      </div>
                    </div>

                    {/* Commission */}
                    <div className="flex lg:flex-col items-center lg:justify-center gap-2">
                      <span className="text-xs text-muted-foreground lg:hidden">العمولة:</span>
                      <div className="text-center">
                        <span className="text-sm font-700 text-positive">
                          {member.commissionEarned.toLocaleString()} ج
                        </span>
                        <p className="text-xs text-muted-foreground">5% من الإيرادات</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer note */}
              <div className="px-6 py-3 bg-muted/20 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  * البيانات تعكس أداء الشهر الحالي فقط · العمولة محسوبة بنسبة 5% من الإيرادات المحصّلة
                </p>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
