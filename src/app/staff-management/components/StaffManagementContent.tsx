'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

const BRANCHES = ['فرع فودافون', 'فرع الرخاوي'];
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

  const userRole = userProfile?.role || user?.user_metadata?.role || '';

  // Redirect non-admins
  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      router.replace('/');
    }
  }, [userRole, loading, router]);

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

  if (userRole !== 'admin' && !loading) return null;

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
