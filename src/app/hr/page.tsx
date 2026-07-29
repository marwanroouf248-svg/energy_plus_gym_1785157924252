'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';

interface StaffMemberSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  isActive: boolean;
  createdAt: string;
  assignedLeads: number;
  convertedLeads: number;
  assignedSubscribers: number;
}

interface HrStats {
  activeEmployees: number;
  activeManagers: number;
  newThisMonth: number;
  assignedLeads: number;
  conversionRate: number;
  totalBranches: number;
}

export default function HRPage() {
  const [staffMembers, setStaffMembers] = useState<StaffMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHrData = async () => {
      try {
        setLoading(true);
        setError('');

        const supabase = createClient();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const [staffRes, leadsRes, subscribersRes] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('id, full_name, email, role, branch, is_active, created_at')
            .in('role', ['sales_staff', 'branch_manager'])
            .order('created_at', { ascending: false }),
          supabase
            .from('leads')
            .select('assigned_to, status, created_at')
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd),
          supabase
            .from('subscribers')
            .select('assigned_to, status, created_at, amount_paid')
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd),
        ]);

        if (staffRes.error) throw staffRes.error;
        if (leadsRes.error) throw leadsRes.error;
        if (subscribersRes.error) throw subscribersRes.error;

        const staff = staffRes.data || [];
        const leads = leadsRes.data || [];
        const subscribers = subscribersRes.data || [];

        const mappedMembers: StaffMemberSummary[] = (staff as any[]).map((member: any) => {
          const memberName = member.full_name || member.email;
          const memberLeads = leads.filter(
            (lead: any) => lead.assigned_to === memberName || lead.assigned_to === member.id
          );
          const convertedLeads = memberLeads.filter((lead: any) => lead.status === 'converted').length;
          const memberSubscribers = subscribers.filter(
            (sub: any) => sub.assigned_to === memberName || sub.assigned_to === member.id
          );

          return {
            id: member.id,
            name: memberName,
            email: member.email,
            role: member.role,
            branch: member.branch || 'غير محدد',
            isActive: member.is_active ?? true,
            createdAt: member.created_at,
            assignedLeads: memberLeads.length,
            convertedLeads,
            assignedSubscribers: memberSubscribers.length,
          };
        });

        setStaffMembers(mappedMembers);
      } catch (err: any) {
        setError(err.message || 'Failed to load HR data');
      } finally {
        setLoading(false);
      }
    };

    fetchHrData();
  }, []);

  const hrStats = useMemo<HrStats>(() => {
    const activeEmployees = staffMembers.filter((member) => member.isActive).length;
    const activeManagers = staffMembers.filter((member) => member.isActive && member.role === 'branch_manager').length;
    const newThisMonth = staffMembers.filter((member) => {
      if (!member.createdAt) return false;
      const createdAt = new Date(member.createdAt);
      const now = new Date();
      return createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth();
    }).length;
    const assignedLeads = staffMembers.reduce((sum, member) => sum + member.assignedLeads, 0);
    const totalConverted = staffMembers.reduce((sum, member) => sum + member.convertedLeads, 0);
    const conversionRate = assignedLeads > 0 ? Math.round((totalConverted / assignedLeads) * 100) : 0;
    const totalBranches = new Set(staffMembers.filter((member) => member.isActive).map((member) => member.branch)).size;

    return {
      activeEmployees,
      activeManagers,
      newThisMonth,
      assignedLeads,
      conversionRate,
      totalBranches,
    };
  }, [staffMembers]);

  const teamHighlights = useMemo(() => {
    return staffMembers
      .filter((member) => member.isActive)
      .slice(0, 4)
      .map((member) => ({
        name: member.name,
        role: member.role === 'branch_manager' ? 'Branch Manager' : 'Sales Staff',
        status: member.assignedLeads > 0 ? `${member.assignedLeads} leads` : 'No active assignments',
        badge: member.branch,
      }));
  }, [staffMembers]);

  const statsCards = [
    { label: 'Active employees', value: hrStats.activeEmployees, caption: 'Currently active staff', icon: 'UsersIcon', accent: 'from-amber-500/20 to-amber-500/5' },
    { label: 'Managers', value: hrStats.activeManagers, caption: 'Active branch managers', icon: 'UserGroupIcon', accent: 'from-emerald-500/20 to-emerald-500/5' },
    { label: 'New this month', value: hrStats.newThisMonth, caption: 'Joined in current month', icon: 'SparklesIcon', accent: 'from-sky-500/20 to-sky-500/5' },
    { label: 'Assigned leads', value: hrStats.assignedLeads, caption: 'Current month assignments', icon: 'BriefcaseIcon', accent: 'from-fuchsia-500/20 to-fuchsia-500/5' },
  ];

  return (
    <AuthGuard>
      <AppLayout currentPath="/hr">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-700" style={{ color: '#f0f2f8' }}>HR Center</h1>
              <p className="mt-1 text-sm" style={{ color: '#6b7494' }}>
                Live staffing overview from the CRM database
              </p>
            </div>
            <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-sm font-600" style={{ color: '#f0c96f' }}>
              Conversion rate: {hrStats.conversionRate}%
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statsCards.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm" style={{ color: '#6b7494' }}>{item.label}</p>
                    <p className="mt-2 text-2xl font-700" style={{ color: '#f0f2f8' }}>{item.value}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent}`}>
                    <Icon name={item.icon} size={18} className="text-amber-400" />
                  </div>
                </div>
                <p className="mt-3 text-sm" style={{ color: '#8892aa' }}>{item.caption}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-700" style={{ color: '#f0f2f8' }}>Team overview</h2>
                  <p className="mt-1 text-sm" style={{ color: '#6b7494' }}>Active staff and their current workload</p>
                </div>
                <div className="text-sm font-600" style={{ color: '#c9a84c' }}>
                  Branches: {hrStats.totalBranches}
                </div>
              </div>

              {loading ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-[#0d0f14] p-4 text-sm" style={{ color: '#8892aa' }}>
                  Loading HR data...
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {staffMembers.filter((member) => member.isActive).map((member) => (
                    <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0d0f14] px-3 py-3">
                      <div>
                        <p className="font-600" style={{ color: '#f0f2f8' }}>{member.name}</p>
                        <p className="text-sm" style={{ color: '#6b7494' }}>{member.role === 'branch_manager' ? 'Branch Manager' : 'Sales Staff'} • {member.branch}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1" style={{ color: '#f0c96f' }}>
                          {member.assignedLeads} leads
                        </span>
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1" style={{ color: '#66d9a6' }}>
                          {member.assignedSubscribers} subscribers
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-700" style={{ color: '#f0f2f8' }}>Quick focus</h2>
              <div className="mt-4 space-y-3">
                {teamHighlights.map((member) => (
                  <div key={member.name} className="rounded-xl border border-white/10 bg-[#0d0f14] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-600" style={{ color: '#f0f2f8' }}>{member.name}</p>
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-700 uppercase tracking-wide" style={{ color: '#f0c96f' }}>
                        {member.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-sm" style={{ color: '#6b7494' }}>{member.role}</p>
                    <p className="mt-1 text-sm" style={{ color: '#8892aa' }}>{member.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
