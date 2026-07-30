'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

type StaffRole = 'sales_staff' | 'branch_manager';

interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  branch: string;
  isActive: boolean;
  createdAt: string;
}

interface StaffFormData {
  email: string;
  password: string;
  fullName: string;
  role: StaffRole;
  branch: string;
  isActive: boolean;
}

interface PayrollRow {
  key: string;
  name: string;
  role: string;
  branch: string;
  amount: number;
}

interface CaptainPayrollEntry {
  id: string;
  captainId?: string;
  name: string;
  phone: string;
  shifts: number;
  shiftRate: number;
  baseSalary: number;
  revenueSharePercent: number;
  revenueAmount: number;
  bonus: number;
  incentive: number;
  penalty: number;
  penaltyReason: string;
  withdrawals: number;
}

interface SalesPayrollEntry {
  id: string;
  salesId?: string;
  name: string;
  shifts: number;
  shiftRate: number;
  baseSalary: number;
  targetCommission: number;
  extraCommission: number;
}

interface HousekeepingPayrollEntry {
  id: string;
  branch: string;
  staffCount: number;
  amountPerStaff: number;
  bonus: number;
  penalty: number;
}

const BRANCHES = ['فرع فودافون', 'فرع الرخاوي'];
const SALES_BASE_SALARY = 3000;
const CAPTAIN_BASE_SALARY = 4000;
const HOUSEKEEPING_BASE_SALARY = 1800;
const BRANCH_ALLOWANCE = 400;
const ROLE_LABELS: Record<StaffRole, string> = {
  sales_staff: 'Sales Staff',
  branch_manager: 'Branch Manager',
};

const EMPTY_FORM: StaffFormData = {
  email: '',
  password: '',
  fullName: '',
  role: 'sales_staff',
  branch: '',
  isActive: true,
};

const parsePayrollValue = (value: string | null) => {
  if (!value) return [];

  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readPayrollFromUrl = () => {
  if (typeof window === 'undefined') {
    return { captains: [], sales: [], housekeeping: [] };
  }

  const params = new URLSearchParams(window.location.search);
  const rawPayroll = params.get('payroll');

  if (rawPayroll) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawPayroll));
      return {
        captains: Array.isArray(parsed?.captains) ? parsed.captains : [],
        sales: Array.isArray(parsed?.sales) ? parsed.sales : [],
        housekeeping: Array.isArray(parsed?.housekeeping) ? parsed.housekeeping : [],
      };
    } catch {
      return { captains: [], sales: [], housekeeping: [] };
    }
  }

  return {
    captains: parsePayrollValue(params.get('captains')),
    sales: parsePayrollValue(params.get('sales')),
    housekeeping: parsePayrollValue(params.get('housekeeping')),
  };
};

export default function StaffManagementContent() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<StaffFormData>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [captainPayrollEntries, setCaptainPayrollEntries] = useState<CaptainPayrollEntry[]>(() => readPayrollFromUrl().captains as CaptainPayrollEntry[]);
  const [salesPayrollEntries, setSalesPayrollEntries] = useState<SalesPayrollEntry[]>(() => readPayrollFromUrl().sales as SalesPayrollEntry[]);
  const [housekeepingPayrollEntries, setHousekeepingPayrollEntries] = useState<HousekeepingPayrollEntry[]>(() => readPayrollFromUrl().housekeeping as HousekeepingPayrollEntry[]);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [payrollSavedMessage, setPayrollSavedMessage] = useState('');
  const [isPayrollOpen, setIsPayrollOpen] = useState(true);

  const userRole = useMemo(() => {
    const profileRole = userProfile?.role || userProfile?.user_role;
    const metadataRole = user?.user_metadata?.role || user?.raw_user_meta_data?.role;
    const rawRole = profileRole || metadataRole || '';
    return String(rawRole).toLowerCase().trim();
  }, [user, userProfile]);

  const isAdminUser = ['admin', 'super_admin', 'administrator'].includes(userRole);

  // Redirect non-admins only when the role is clearly resolved
  useEffect(() => {
    if (!loading && user && !isAdminUser && userRole) {
      router.replace('/');
    }
  }, [userRole, isAdminUser, loading, router, user]);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['sales_staff', 'branch_manager'])
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setStaffList(
        (data || []).map((row: any) => ({
          id: row.id,
          email: row.email,
          fullName: row.full_name,
          role: row.role as StaffRole,
          branch: row.branch || '',
          isActive: row.is_active ?? true,
          createdAt: row.created_at,
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    const captainMembers = staffList.filter((member) => member.isActive && member.role === 'branch_manager');
    const salesMembers = staffList.filter((member) => member.isActive && member.role === 'sales_staff');
    const activeBranches = Array.from(
      new Set(staffList.filter((member) => member.isActive).map((member) => member.branch).filter(Boolean))
    );
    const branchList = activeBranches.length > 0 ? activeBranches : BRANCHES;

    setCaptainPayrollEntries((prev) => {
      const nextEntries = captainMembers.map((member) => {
        const existingEntry = prev.find((entry) => entry.captainId === member.id || entry.name === member.fullName);

        return {
          id: existingEntry?.id || `${member.id}-captain`,
          captainId: member.id,
          name: member.fullName,
          phone: existingEntry?.phone || '',
          shifts: existingEntry?.shifts || 0,
          shiftRate: existingEntry?.shiftRate || 0,
          baseSalary: existingEntry?.baseSalary || CAPTAIN_BASE_SALARY,
          revenueSharePercent: existingEntry?.revenueSharePercent || 0,
          revenueAmount: existingEntry?.revenueAmount || 0,
          bonus: existingEntry?.bonus || 0,
          incentive: existingEntry?.incentive || 0,
          penalty: existingEntry?.penalty || 0,
          penaltyReason: existingEntry?.penaltyReason || '',
          withdrawals: existingEntry?.withdrawals || 0,
        };
      });

      if (nextEntries.length === 0) {
        return [
          {
            id: 'captain-placeholder',
            name: 'New Captain',
            phone: '',
            shifts: 0,
            shiftRate: 0,
            baseSalary: CAPTAIN_BASE_SALARY,
            revenueSharePercent: 0,
            revenueAmount: 0,
            bonus: 0,
            incentive: 0,
            penalty: 0,
            penaltyReason: '',
            withdrawals: 0,
          },
        ];
      }

      return nextEntries;
    });

    setSalesPayrollEntries((prev) => {
      const nextEntries = salesMembers.map((member) => {
        const existingEntry = prev.find((entry) => entry.salesId === member.id || entry.name === member.fullName);

        return {
          id: existingEntry?.id || `${member.id}-sales`,
          salesId: member.id,
          name: member.fullName,
          shifts: existingEntry?.shifts || 0,
          shiftRate: existingEntry?.shiftRate || 0,
          baseSalary: existingEntry?.baseSalary || SALES_BASE_SALARY,
          targetCommission: existingEntry?.targetCommission || 0,
          extraCommission: existingEntry?.extraCommission || 0,
        };
      });

      if (nextEntries.length === 0) {
        return [
          {
            id: 'sales-placeholder',
            name: 'New Sales Staff',
            shifts: 0,
            shiftRate: 0,
            baseSalary: SALES_BASE_SALARY,
            targetCommission: 0,
            extraCommission: 0,
          },
        ];
      }

      return nextEntries;
    });

    setHousekeepingPayrollEntries((prev) => {
      const nextEntries = branchList.map((branch) => {
        const existingEntry = prev.find((entry) => entry.branch === branch);

        return {
          id: existingEntry?.id || `housekeeping-${branch}`,
          branch,
          staffCount: existingEntry?.staffCount || 1,
          amountPerStaff: existingEntry?.amountPerStaff || HOUSEKEEPING_BASE_SALARY,
          bonus: existingEntry?.bonus || 0,
          penalty: existingEntry?.penalty || 0,
        };
      });

      if (nextEntries.length === 0) {
        return [
          {
            id: 'housekeeping-placeholder',
            branch: 'فرع فودافون',
            staffCount: 1,
            amountPerStaff: HOUSEKEEPING_BASE_SALARY,
            bonus: 0,
            penalty: 0,
          },
        ];
      }

      return nextEntries;
    });
  }, [staffList]);

  const validateForm = (): boolean => {
    const errs: Partial<StaffFormData> = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Valid email is required';
    if (!editingId && form.password.length < 8)
      errs.password = 'Password must be at least 8 characters';
    if (!form.branch) errs.branch = 'Branch is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setForm({
      email: member.email,
      password: '',
      fullName: member.fullName,
      role: member.role,
      branch: member.branch,
      isActive: member.isActive,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    setError('');
    try {
      const supabase = createClient();

      if (editingId) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: form.fullName,
            role: form.role,
            branch: form.branch,
            is_active: form.isActive,
          })
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        // Create new auth user via admin API — use service role or edge function
        // Since we're client-side, we create the profile after signUp
        // We use Supabase admin signUp with metadata
        const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
          email: form.email,
          password: form.password,
          email_confirm: true,
          user_metadata: {
            full_name: form.fullName,
            role: form.role,
            branch: form.branch,
          },
        });

        if (signUpError) throw signUpError;

        // Upsert profile in case trigger didn't fire
        if (signUpData?.user) {
          const { error: profileError } = await supabase.from('user_profiles').upsert({
            id: signUpData.user.id,
            email: form.email,
            full_name: form.fullName,
            role: form.role,
            branch: form.branch,
            is_active: form.isActive,
          });
          if (profileError) throw profileError;
        }
      }

      setModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (member: StaffMember) => {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ is_active: !member.isActive })
        .eq('id', member.id);
      if (updateError) throw updateError;
      setStaffList((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, isActive: !m.isActive } : m))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      setStaffList((prev) => prev.filter((m) => m.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete staff member');
    }
  };

  const handleSavePayroll = async () => {
    try {
      setSavingPayroll(true);
      setPayrollSavedMessage('');
      const payload = {
        savedAt: new Date().toISOString(),
        captains: captainPayrollEntries,
        sales: salesPayrollEntries,
        housekeeping: housekeepingPayrollEntries,
      };

      localStorage.setItem('hr-payroll-data', JSON.stringify(payload));
      setPayrollSavedMessage('Payroll data saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save payroll data');
    } finally {
      setSavingPayroll(false);
    }
  };

  const filtered = staffList.filter((m) => {
    const matchSearch =
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.branch.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || m.role === roleFilter;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && m.isActive) ||
      (statusFilter === 'inactive' && !m.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const totalStaff = staffList.length;
  const activeCount = staffList.filter((m) => m.isActive).length;
  const salesCount = staffList.filter((m) => m.role === 'sales_staff').length;
  const managerCount = staffList.filter((m) => m.role === 'branch_manager').length;

  const payrollPayload = useMemo(
    () => ({
      captains: captainPayrollEntries,
      sales: salesPayrollEntries,
      housekeeping: housekeepingPayrollEntries,
    }),
    [captainPayrollEntries, salesPayrollEntries, housekeepingPayrollEntries]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    params.set('payroll', encodeURIComponent(JSON.stringify(payrollPayload)));
    params.set('captains', encodeURIComponent(JSON.stringify(payrollPayload.captains)));
    params.set('sales', encodeURIComponent(JSON.stringify(payrollPayload.sales)));
    params.set('housekeeping', encodeURIComponent(JSON.stringify(payrollPayload.housekeeping)));

    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [payrollPayload]);

  const payrollSummary = useMemo(() => {
    const activeStaff = staffList.filter((member) => member.isActive);
    const salesMembers = activeStaff.filter((member) => member.role === 'sales_staff');
    const captainMembers = activeStaff.filter((member) => member.role === 'branch_manager');
    const activeBranches = Array.from(new Set(activeStaff.map((member) => member.branch).filter(Boolean)));

    const captainPayrollRows = captainPayrollEntries.map((entry) => {
      const shiftSalary = entry.shifts * entry.shiftRate;
      const revenueShare = (entry.revenueAmount * entry.revenueSharePercent) / 100;
      const captainShare = revenueShare * 0.5;
      const grossSalary = entry.baseSalary + shiftSalary + captainShare + entry.bonus + entry.incentive;
      const netSalary = grossSalary - entry.penalty - entry.withdrawals;

      return {
        ...entry,
        shiftSalary,
        revenueShare,
        captainShare,
        grossSalary,
        netSalary,
      };
    });

    const salesPayrollRows = salesPayrollEntries.map((entry) => {
      const shiftSalary = entry.shifts * entry.shiftRate;
      const totalSalary = entry.baseSalary + shiftSalary + entry.targetCommission + entry.extraCommission;

      return {
        ...entry,
        shiftSalary,
        totalSalary,
      };
    });

    const housekeepingPayrollRows = housekeepingPayrollEntries.map((entry) => {
      const totalSalary = entry.staffCount * entry.amountPerStaff + entry.bonus - entry.penalty;

      return {
        ...entry,
        totalSalary,
      };
    });

    const salesTotal = salesPayrollRows.reduce((sum, entry) => sum + entry.totalSalary, 0);
    const captainTotal = captainPayrollRows.reduce((sum, entry) => sum + entry.netSalary, 0);
    const housekeepingTotal = housekeepingPayrollRows.reduce((sum, entry) => sum + entry.totalSalary, 0);
    const totalPayroll = salesTotal + captainTotal + housekeepingTotal;

    const rows: PayrollRow[] = [
      ...salesPayrollRows.map((entry) => ({
        key: `sales-${entry.id}`,
        name: entry.name,
        role: 'Sales',
        branch: salesMembers.find((member) => member.id === entry.salesId)?.branch || '—',
        amount: entry.totalSalary,
      })),
      ...captainPayrollRows.map((entry) => ({
        key: `captain-${entry.id}`,
        name: entry.name,
        role: 'Captain',
        branch: captainMembers.find((member) => member.id === entry.captainId)?.branch || '—',
        amount: entry.netSalary,
      })),
      ...housekeepingPayrollRows.map((entry) => ({
        key: `housekeeping-${entry.id}`,
        name: `${entry.branch} - Housekeeping`,
        role: 'Housekeeping',
        branch: entry.branch,
        amount: entry.totalSalary,
      })),
    ];

    return {
      salesTotal,
      captainTotal,
      housekeepingTotal,
      totalPayroll,
      rows,
      captainPayrollRows,
      salesPayrollRows,
      housekeepingPayrollRows,
    };
  }, [captainPayrollEntries, salesPayrollEntries, housekeepingPayrollEntries, staffList]);

  if (!loading && !user) return null;
  if (!loading && user && !isAdminUser && userRole) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-700 text-foreground">Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage Sales Staff and Branch Manager accounts
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors"
        >
          <Icon name="PlusIcon" size={16} />
          Add Staff Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: totalStaff, icon: 'UsersIcon', color: 'text-primary' },
          { label: 'Active', value: activeCount, icon: 'CheckCircleIcon', color: 'text-positive' },
          { label: 'Sales Staff', value: salesCount, icon: 'UserIcon', color: 'text-accent' },
          { label: 'Branch Managers', value: managerCount, icon: 'BuildingOfficeIcon', color: 'text-warning' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                <Icon name={stat.icon as any} size={18} />
              </div>
              <div>
                <p className="text-2xl font-700 text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm font-700 text-primary">
              <Icon name="BriefcaseIcon" size={14} />
              HR Payroll
            </div>
            <h2 className="mt-2 text-lg font-700 text-foreground">HR Payroll Summary</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Organised captain salary review with shifts, revenue share, bonus, incentives and penalties.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPayrollOpen((prev) => !prev)}
              className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-600 text-primary"
            >
              {isPayrollOpen ? 'Hide Payroll' : 'Open HR Payroll'}
            </button>
            <div className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-600 text-primary">
              Total Payroll: {new Intl.NumberFormat('en-EG').format(payrollSummary.totalPayroll)} EGP
            </div>
          </div>
        </div>

        {isPayrollOpen ? (
        <>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            {
              label: 'Sales Salary',
              value: `${new Intl.NumberFormat('en-EG').format(payrollSummary.salesTotal)} EGP`,
              color: 'text-accent',
            },
            {
              label: 'Captains Salary',
              value: `${new Intl.NumberFormat('en-EG').format(payrollSummary.captainTotal)} EGP`,
              color: 'text-warning',
            },
            {
              label: 'Housekeeping',
              value: `${new Intl.NumberFormat('en-EG').format(payrollSummary.housekeepingTotal)} EGP`,
              color: 'text-positive',
            },
            {
              label: 'Total',
              value: `${new Intl.NumberFormat('en-EG').format(payrollSummary.totalPayroll)} EGP`,
              color: 'text-primary',
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-background/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className={`mt-2 text-lg font-700 ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-border bg-background/70 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-700 text-foreground">Captain Payroll Setup</h3>
              <p className="text-sm text-muted-foreground">Add captain name, phone, shifts, revenue share, bonus, incentive and penalties.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setCaptainPayrollEntries((prev) => [
                  ...prev,
                  {
                    id: `captain-${Date.now()}`,
                    name: 'New Captain',
                    phone: '',
                    shifts: 0,
                    shiftRate: 0,
                    baseSalary: CAPTAIN_BASE_SALARY,
                    revenueSharePercent: 0,
                    revenueAmount: 0,
                    bonus: 0,
                    incentive: 0,
                    penalty: 0,
                    penaltyReason: '',
                    withdrawals: 0,
                  },
                ])
              }
              className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-600 text-primary"
            >
              + Add Captain
            </button>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {payrollSummary.captainPayrollRows.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={entry.name}
                    onChange={(e) =>
                      setCaptainPayrollEntries((prev) =>
                        prev.map((item) => (item.id === entry.id ? { ...item, name: e.target.value } : item))
                      )
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-600 text-foreground"
                    placeholder="Captain name"
                  />
                  <div className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-700 text-primary">
                    {new Intl.NumberFormat('en-EG').format(entry.netSalary)} EGP
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">الراتب الأساسي</label>
                    <input
                      type="number"
                      value={entry.baseSalary}
                      onChange={(e) =>
                        setCaptainPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, baseSalary: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل الراتب الأساسي"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">رقم الهاتف</label>
                    <input
                      value={entry.phone}
                      onChange={(e) =>
                        setCaptainPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, phone: e.target.value } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل رقم الهاتف"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">عدد الشيفتات</label>
                    <input
                      type="number"
                      value={entry.shifts}
                      onChange={(e) =>
                        setCaptainPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, shifts: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل عدد الشيفتات"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">سعر الشيفت</label>
                    <input
                      type="number"
                      value={entry.shiftRate}
                      onChange={(e) =>
                        setCaptainPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, shiftRate: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل سعر الشيفت"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">إجمالي شغل الشيفت</label>
                    <input
                      value={entry.shiftSalary}
                      readOnly
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">الحافز</label>
                    <input
                      type="number"
                      value={entry.bonus}
                      onChange={(e) =>
                        setCaptainPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, bonus: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل الحافز"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">الإضافي / التحفيز</label>
                    <input
                      type="number"
                      value={entry.incentive}
                      onChange={(e) =>
                        setCaptainPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, incentive: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل التحفيز"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">دخل التغذية والبرفيت</label>
                    <input
                      type="number"
                      value={entry.revenueAmount}
                      onChange={(e) =>
                        setCaptainPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, revenueAmount: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل مبلغ التغذية/البرفيت"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">النسبة المئوية</label>
                    <input
                      type="number"
                      value={entry.revenueSharePercent}
                      onChange={(e) =>
                        setCaptainPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, revenueSharePercent: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل النسبة"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">إجمالي الحوافز</label>
                    <input
                      value={entry.bonus + entry.incentive}
                      readOnly
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">مشاركة الكابتن من التغذية/البرفيت (50%)</label>
                    <input
                      value={entry.revenueShare * 0.5}
                      readOnly
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">المسحوبات</label>
                    <input
                      type="number"
                      value={entry.withdrawals}
                      onChange={(e) =>
                        setCaptainPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, withdrawals: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل المسحوبات"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">الباقي بعد المسحوبات</label>
                    <input
                      value={entry.netSalary}
                      readOnly
                      className="w-full rounded-lg border border-border bg-primary/10 px-3 py-2 text-sm font-700 text-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">الخصم / الغرامة</label>
                    <input
                      type="number"
                      value={entry.penalty}
                      onChange={(e) =>
                        setCaptainPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, penalty: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل الخصم"
                    />
                  </div>
                </div>

                <textarea
                  value={entry.penaltyReason}
                  onChange={(e) =>
                    setCaptainPayrollEntries((prev) =>
                      prev.map((item) => (item.id === entry.id ? { ...item, penaltyReason: e.target.value } : item))
                    )
                  }
                  className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Penalty reason"
                  rows={2}
                />

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>الأساس: {new Intl.NumberFormat('en-EG').format(entry.baseSalary)} EGP</span>
                  <span>أجر الشيفت: {new Intl.NumberFormat('en-EG').format(entry.shiftSalary)} EGP</span>
                  <span>مشاركة التغذية/البرفيت: {new Intl.NumberFormat('en-EG').format(entry.captainShare)} EGP</span>
                  <span>الصافي: {new Intl.NumberFormat('en-EG').format(entry.netSalary)} EGP</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-700 text-foreground">Sales Payroll Setup</h3>
              <p className="text-sm text-muted-foreground">Organise sales salary with base pay, shifts, commissions and total pay.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSalesPayrollEntries((prev) => [
                  ...prev,
                  {
                    id: `sales-${Date.now()}`,
                    name: 'New Sales Staff',
                    shifts: 0,
                    shiftRate: 0,
                    baseSalary: SALES_BASE_SALARY,
                    targetCommission: 0,
                    extraCommission: 0,
                  },
                ])
              }
              className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-600 text-accent"
            >
              + Add Sales
            </button>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {payrollSummary.salesPayrollRows.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={entry.name}
                    onChange={(e) =>
                      setSalesPayrollEntries((prev) =>
                        prev.map((item) => (item.id === entry.id ? { ...item, name: e.target.value } : item))
                      )
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-600 text-foreground"
                    placeholder="Sales staff name"
                  />
                  <div className="rounded-full bg-accent/10 px-2.5 py-1 text-sm font-700 text-accent">
                    {new Intl.NumberFormat('en-EG').format(entry.totalSalary)} EGP
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">الراتب الأساسي</label>
                    <input
                      type="number"
                      value={entry.baseSalary}
                      onChange={(e) =>
                        setSalesPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, baseSalary: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل الراتب الأساسي"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">عدد الشيفتات</label>
                    <input
                      type="number"
                      value={entry.shifts}
                      onChange={(e) =>
                        setSalesPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, shifts: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل عدد الشيفتات"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">سعر الشيفت</label>
                    <input
                      type="number"
                      value={entry.shiftRate}
                      onChange={(e) =>
                        setSalesPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, shiftRate: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل سعر الشيفت"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">إجمالي شغل الشيفت</label>
                    <input
                      value={entry.shiftSalary}
                      readOnly
                      className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">عمولة الهدف</label>
                    <input
                      type="number"
                      value={entry.targetCommission}
                      onChange={(e) =>
                        setSalesPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, targetCommission: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل عمولة الهدف"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">عمولة إضافية</label>
                    <input
                      type="number"
                      value={entry.extraCommission}
                      onChange={(e) =>
                        setSalesPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, extraCommission: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل عمولة إضافية"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>الأساس: {new Intl.NumberFormat('en-EG').format(entry.baseSalary)} EGP</span>
                  <span>أجر الشيفت: {new Intl.NumberFormat('en-EG').format(entry.shiftSalary)} EGP</span>
                  <span>الإجمالي: {new Intl.NumberFormat('en-EG').format(entry.totalSalary)} EGP</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-700 text-foreground">Housekeeping Payroll Setup</h3>
              <p className="text-sm text-muted-foreground">Organise housekeeping payroll per branch with staff count and salary per person.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {payrollSummary.housekeepingPayrollRows.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-700 text-foreground">{entry.branch}</div>
                  <div className="rounded-full bg-positive/10 px-2.5 py-1 text-sm font-700 text-positive">
                    {new Intl.NumberFormat('en-EG').format(entry.totalSalary)} EGP
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">عدد العاملين</label>
                    <input
                      type="number"
                      value={entry.staffCount}
                      onChange={(e) =>
                        setHousekeepingPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, staffCount: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل عدد العاملين"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">الراتب لكل عامل</label>
                    <input
                      type="number"
                      value={entry.amountPerStaff}
                      onChange={(e) =>
                        setHousekeepingPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, amountPerStaff: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل الراتب لكل عامل"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">الحافز</label>
                    <input
                      type="number"
                      value={entry.bonus}
                      onChange={(e) =>
                        setHousekeepingPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, bonus: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل الحافز"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">الخصم</label>
                    <input
                      type="number"
                      value={entry.penalty}
                      onChange={(e) =>
                        setHousekeepingPayrollEntries((prev) =>
                          prev.map((item) => (item.id === entry.id ? { ...item, penalty: Number(e.target.value) } : item))
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="أدخل الخصم"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {payrollSavedMessage ? (
              <p className="text-sm font-600 text-positive">{payrollSavedMessage}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Data is stored locally in this browser for quick payroll closing.</p>
            )}
          </div>
          <button
            onClick={handleSavePayroll}
            disabled={savingPayroll}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-600 text-primary-foreground disabled:opacity-60"
          >
            {savingPayroll ? 'Saving...' : 'Save Payroll'}
          </button>
        </div>

        <div className="mt-5 overflow-x-auto border-t border-border pt-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-600">Person</th>
                <th className="pb-2 pr-3 font-600">Role</th>
                <th className="pb-2 pr-3 font-600">Branch</th>
                <th className="pb-2 text-right font-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payrollSummary.rows.map((row) => (
                <tr key={row.key} className="border-b border-border/70 last:border-b-0">
                  <td className="py-2 pr-3 font-500 text-foreground">{row.name}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{row.role}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{row.branch}</td>
                  <td className="py-2 text-right font-600 text-primary">{new Intl.NumberFormat('en-EG').format(row.amount)} EGP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-primary/30 bg-background/60 p-4 text-sm text-muted-foreground">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-600 text-foreground">HR Payroll is ready</p>
                <p>Open it to review captain and sales payroll details plus the total summary.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayrollOpen(true)}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-600 text-primary-foreground"
              >
                Open HR Payroll
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 bg-negative/10 border border-negative/20 text-negative rounded-lg px-4 py-3 text-sm">
          <Icon name="ExclamationCircleIcon" size={16} />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <Icon name="XMarkIcon" size={14} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Roles</option>
            <option value="sales_staff">Sales Staff</option>
            <option value="branch_manager">Branch Manager</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Icon name="UsersIcon" size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-500">No staff members found</p>
            <p className="text-xs mt-1">Try adjusting your filters or add a new staff member</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-600 text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-600 text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-600 text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-600 text-muted-foreground">Branch</th>
                  <th className="text-left px-4 py-3 font-600 text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-600 text-muted-foreground">Joined</th>
                  <th className="text-right px-4 py-3 font-600 text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((member) => {
                  const initials = member.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  const joinedDate = member.createdAt
                    ? new Date(member.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-700 text-primary">{initials}</span>
                          </div>
                          <span className="font-500 text-foreground">{member.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-600 ${
                            member.role === 'branch_manager' ?'bg-warning/10 text-warning' :'bg-accent/10 text-accent'
                          }`}
                        >
                          <Icon
                            name={member.role === 'branch_manager' ? 'BuildingOfficeIcon' : 'UserIcon'}
                            size={11}
                          />
                          {ROLE_LABELS[member.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{member.branch || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(member)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-600 transition-colors cursor-pointer ${
                            member.isActive
                              ? 'bg-positive/10 text-positive hover:bg-positive/20' :'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.isActive ? 'bg-positive' : 'bg-muted-foreground'
                            }`}
                          />
                          {member.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{joinedDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(member)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Icon name="PencilSquareIcon" size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(member.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-negative/10 hover:text-negative transition-colors"
                            title="Delete"
                          >
                            <Icon name="TrashIcon" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Staff Member' : 'Add Staff Member'}>
        <div className="space-y-4 pt-1">
          {error && (
            <div className="flex items-center gap-2 bg-negative/10 border border-negative/20 text-negative rounded-lg px-3 py-2 text-xs">
              <Icon name="ExclamationCircleIcon" size={14} />
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Full Name *</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="e.g. Ahmed Hassan"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {formErrors.fullName && (
              <p className="text-xs text-negative mt-1">{formErrors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="staff@energyplus.io"
              disabled={!!editingId}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {formErrors.email && (
              <p className="text-xs text-negative mt-1">{formErrors.email}</p>
            )}
          </div>

          {/* Password (create only) */}
          {!editingId && (
            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {formErrors.password && (
                <p className="text-xs text-negative mt-1">{formErrors.password}</p>
              )}
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="sales_staff">Sales Staff</option>
              <option value="branch_manager">Branch Manager</option>
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Branch *</label>
            <select
              value={form.branch}
              onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select branch...</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {formErrors.branch && (
              <p className="text-xs text-negative mt-1">{formErrors.branch}</p>
            )}
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs font-600 text-foreground">Account Status</p>
              <p className="text-xs text-muted-foreground">Allow this staff member to log in</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isActive ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-600 text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Remove Staff Member">
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this staff member? This will delete their profile but their auth account will remain.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-600 text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="flex-1 px-4 py-2.5 bg-negative text-white rounded-lg text-sm font-600 hover:bg-negative/90 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
