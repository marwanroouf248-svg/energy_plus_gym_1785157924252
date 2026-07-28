'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import Icon from '@/components/ui/AppIcon';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logAuditAction, getUserAuditInfo, buildChanges } from '@/lib/auditLog';

type LeadStatus = 'new' | 'contacted' | 'interested' | 'not_interested' | 'converted' | 'lost';
type LeadSource = 'walk_in' | 'phone' | 'social_media' | 'referral' | 'website' | 'other';

interface Lead {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  branch: string;
  source: LeadSource;
  status: LeadStatus;
  interested_package: string;
  notes: string;
  assigned_to: string;
  follow_up_date: string;
  converted_at: string | null;
  subscriber_id: string | null;
  created_at: string;
}

interface LeadForm {
  name: string;
  phone: string;
  email: string;
  branch: string;
  source: LeadSource;
  status: LeadStatus;
  interested_package: string;
  notes: string;
  assigned_to: string;
  follow_up_date: string;
}

const EMPTY_FORM: LeadForm = {
  name: '',
  phone: '',
  email: '',
  branch: '',
  source: 'phone',
  status: 'new',
  interested_package: '',
  notes: '',
  assigned_to: '',
  follow_up_date: '',
};

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'جديد', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  contacted: { label: 'تم التواصل', color: 'text-warning', bg: 'bg-warning-bg border-warning/20' },
  interested: { label: 'مهتم', color: 'text-positive', bg: 'bg-positive-bg border-positive/20' },
  not_interested: { label: 'غير مهتم', color: 'text-negative', bg: 'bg-negative-bg border-negative/20' },
  converted: { label: 'تحول لمشترك', color: 'text-positive', bg: 'bg-positive-bg border-positive/20' },
  lost: { label: 'مفقود', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  walk_in: 'زيارة مباشرة',
  phone: 'هاتف',
  social_media: 'سوشيال ميديا',
  referral: 'إحالة',
  website: 'موقع إلكتروني',
  other: 'أخرى',
};

const BRANCHES = ['فرع فودافون', 'فرع الرخاوي'];
const PACKAGES = ['Monthly', 'Quarterly', '6-Month', 'Annual', 'Student'];

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [convertLoading, setConvertLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      toast.error('فشل تحميل الليدز: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Real-time subscription: sync all staff instantly on any change
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const newLead = payload.new as Lead;
          setLeads((prev) => {
            if (prev.some((l) => l.id === newLead.id)) return prev;
            return [newLead, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          const updated = payload.new as Lead;
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? updated : l))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'leads' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setLeads((prev) => prev.filter((l) => l.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search);
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchBranch = branchFilter === 'all' || l.branch === branchFilter;
      return matchSearch && matchStatus && matchBranch;
    });
  }, [leads, search, statusFilter, branchFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    interested: leads.filter((l) => l.status === 'interested').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    followUp: leads.filter((l) => l.follow_up_date && l.status !== 'converted' && l.status !== 'lost').length,
  }), [leads]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setForm({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      branch: lead.branch,
      source: lead.source,
      status: lead.status,
      interested_package: lead.interested_package,
      notes: lead.notes,
      assigned_to: lead.assigned_to,
      follow_up_date: lead.follow_up_date,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('الاسم ورقم الهاتف مطلوبان');
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const auditUser = getUserAuditInfo(user, null);
      if (editingId) {
        const prevLead = leads.find((l) => l.id === editingId);
        const { error } = await supabase.from('leads').update(form).eq('id', editingId);
        if (error) throw error;
        toast.success('تم تحديث الليد');
        await logAuditAction({
          action: 'update',
          entityType: 'lead',
          entityId: editingId,
          entityName: form.name,
          changes: buildChanges(prevLead ? { name: prevLead.name, phone: prevLead.phone, status: prevLead.status, branch: prevLead.branch, source: prevLead.source, notes: prevLead.notes } : null, { name: form.name, phone: form.phone, status: form.status, branch: form.branch, source: form.source, notes: form.notes }),
          user: auditUser,
        });
      } else {
        const { data: inserted, error } = await supabase.from('leads').insert({ ...form, user_id: user?.id }).select().single();
        if (error) throw error;
        toast.success('تم إضافة الليد');
        await logAuditAction({
          action: 'create',
          entityType: 'lead',
          entityId: inserted?.id || '',
          entityName: form.name,
          changes: buildChanges(null, form),
          user: auditUser,
        });
      }
      setModalOpen(false);
      fetchLeads();
    } catch (err: any) {
      toast.error('فشل الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const deletedLead = leads.find((l) => l.id === id);
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف الليد');
      setDeleteId(null);
      await logAuditAction({
        action: 'delete',
        entityType: 'lead',
        entityId: id,
        entityName: deletedLead?.name || id,
        changes: { deleted: true },
        user: getUserAuditInfo(user, null),
      });
      fetchLeads();
    } catch (err: any) {
      toast.error('فشل الحذف: ' + err.message);
    }
  };

  const handleConvert = async (lead: Lead) => {
    setConvertLoading(true);
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      const { data: sub, error: subError } = await supabase
        .from('subscribers')
        .insert({
          user_id: user?.id,
          name: lead.name,
          phone: lead.phone,
          package: lead.interested_package || 'Monthly',
          branch: lead.branch,
          start_date: today,
          end_date: endDate.toISOString().split('T')[0],
          amount_paid: 0,
          total_amount: 350,
          remaining_balance: 350,
          status: 'active',
          payment_status: 'partial',
          assigned_to: lead.assigned_to,
          notes: `تحويل من ليد - ${lead.notes}`,
        })
        .select()
        .single();
      if (subError) throw subError;
      const { error: updateError } = await supabase
        .from('leads')
        .update({ status: 'converted', converted_at: new Date().toISOString(), subscriber_id: sub.id })
        .eq('id', lead.id);
      if (updateError) throw updateError;
      toast.success(`تم تحويل ${lead.name} إلى مشترك بنجاح`);
      setConvertId(null);
      fetchLeads();
    } catch (err: any) {
      toast.error('فشل التحويل: ' + err.message);
    } finally {
      setConvertLoading(false);
    }
  };

  const convertLead = leads.find((l) => l.id === convertId);

  return (
    <AuthGuard>
      <AppLayout currentPath="/leads">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-700 text-foreground">إدارة الليدز</h1>
              <p className="text-sm text-muted-foreground mt-1">العملاء المحتملون وتتبع المبيعات</p>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors"
            >
              <Icon name="PlusIcon" size={16} />
              إضافة ليد
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'إجمالي', value: stats.total, color: 'text-foreground', bg: 'bg-card' },
              { label: 'جديد', value: stats.new, color: 'text-primary', bg: 'bg-primary/5' },
              { label: 'مهتم', value: stats.interested, color: 'text-positive', bg: 'bg-positive-bg' },
              { label: 'تحول لمشترك', value: stats.converted, color: 'text-positive', bg: 'bg-positive-bg' },
              { label: 'متابعة مطلوبة', value: stats.followUp, color: 'text-warning', bg: 'bg-warning-bg' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border border-border rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-700 ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Icon name="MagnifyingGlassIcon" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث بالاسم أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">كل الحالات</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">كل الفروع</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Icon name="UserPlusIcon" size={40} className="text-muted-foreground mb-3" />
                <p className="font-600 text-foreground">لا توجد ليدز</p>
                <p className="text-sm text-muted-foreground mt-1">أضف أول ليد للبدء</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right px-4 py-3 font-600 text-muted-foreground">الاسم</th>
                      <th className="text-right px-4 py-3 font-600 text-muted-foreground">الهاتف</th>
                      <th className="text-right px-4 py-3 font-600 text-muted-foreground">الفرع</th>
                      <th className="text-right px-4 py-3 font-600 text-muted-foreground">المصدر</th>
                      <th className="text-right px-4 py-3 font-600 text-muted-foreground">الحالة</th>
                      <th className="text-right px-4 py-3 font-600 text-muted-foreground">المتابعة</th>
                      <th className="text-right px-4 py-3 font-600 text-muted-foreground">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((lead) => {
                      const sc = STATUS_CONFIG[lead.status];
                      return (
                        <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-600 text-foreground">{lead.name}</p>
                              {lead.interested_package && (
                                <p className="text-xs text-muted-foreground">{lead.interested_package}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground" dir="ltr">{lead.phone}</td>
                          <td className="px-4 py-3 text-muted-foreground">{lead.branch || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{SOURCE_LABELS[lead.source]}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 border ${sc.bg} ${sc.color}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {lead.follow_up_date || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEdit(lead)}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="تعديل"
                              >
                                <Icon name="PencilIcon" size={14} />
                              </button>
                              {lead.status !== 'converted' && (
                                <button
                                  onClick={() => setConvertId(lead.id)}
                                  className="p-1.5 rounded hover:bg-positive-bg text-muted-foreground hover:text-positive transition-colors"
                                  title="تحويل لمشترك"
                                >
                                  <Icon name="ArrowRightCircleIcon" size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => setDeleteId(lead.id)}
                                className="p-1.5 rounded hover:bg-negative-bg text-muted-foreground hover:text-negative transition-colors"
                                title="حذف"
                              >
                                <Icon name="TrashIcon" size={14} />
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
        </div>

        {/* Add/Edit Modal */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'تعديل الليد' : 'إضافة ليد جديد'}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">الاسم *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">الهاتف *</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">الفرع</label>
                <select
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">اختر الفرع</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">المصدر</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">الباقة المهتم بها</label>
                <select
                  value={form.interested_package}
                  onChange={(e) => setForm({ ...form, interested_package: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">غير محدد</option>
                  {PACKAGES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">تاريخ المتابعة</label>
                <input
                  type="date"
                  value={form.follow_up_date}
                  onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">مسؤول المتابعة</label>
                <input
                  type="text"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">ملاحظات</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'إضافة'}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 bg-muted text-foreground py-2 rounded-lg text-sm font-600 hover:bg-muted/80 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>

        {/* Convert Modal */}
        <Modal open={!!convertId} onClose={() => setConvertId(null)} title="تحويل إلى مشترك">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              سيتم تحويل <span className="font-600 text-foreground">{convertLead?.name}</span> إلى مشترك جديد في الفرع <span className="font-600 text-foreground">{convertLead?.branch || 'غير محدد'}</span>.
            </p>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              سيتم إنشاء اشتراك شهري بشكل افتراضي. يمكنك تعديل تفاصيل الاشتراك من صفحة المشتركين.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => convertLead && handleConvert(convertLead)}
                disabled={convertLoading}
                className="flex-1 bg-positive text-white py-2 rounded-lg text-sm font-600 hover:bg-positive/90 transition-colors disabled:opacity-50"
              >
                {convertLoading ? 'جاري التحويل...' : 'تأكيد التحويل'}
              </button>
              <button
                onClick={() => setConvertId(null)}
                className="flex-1 bg-muted text-foreground py-2 rounded-lg text-sm font-600 hover:bg-muted/80 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذا الليد؟</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => deleteId && handleDelete(deleteId)}
                className="flex-1 bg-negative text-white py-2 rounded-lg text-sm font-600 hover:bg-negative/90 transition-colors"
              >
                حذف
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 bg-muted text-foreground py-2 rounded-lg text-sm font-600 hover:bg-muted/80 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      </AppLayout>
    </AuthGuard>
  );
}
