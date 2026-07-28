'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import Icon from '@/components/ui/AppIcon';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logAuditAction, getUserAuditInfo, buildChanges } from '@/lib/auditLog';

interface Package {
  id: string;
  name: string;
  name_ar: string;
  duration_days: number;
  price: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface PackageForm {
  name: string;
  name_ar: string;
  duration_days: number;
  price: number;
  description: string;
  is_active: boolean;
}

const EMPTY_FORM: PackageForm = {
  name: '',
  name_ar: '',
  duration_days: 30,
  price: 0,
  description: '',
  is_active: true,
};

export default function PackagesPage() {
  const { user, userProfile } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const userRole = userProfile?.role || user?.user_metadata?.role || '';
  const isAdmin = userRole === 'admin';

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('price', { ascending: true });
      if (error) throw error;
      setPackages(data || []);
    } catch (err: any) {
      toast.error('فشل تحميل الباقات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Package) => {
    setEditingId(p.id);
    setForm({ name: p.name, name_ar: p.name_ar, duration_days: p.duration_days, price: p.price, description: p.description, is_active: p.is_active });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('اسم الباقة مطلوب'); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const auditUser = getUserAuditInfo(user, userProfile);
      if (editingId) {
        const prevPkg = packages.find((p) => p.id === editingId);
        const { error } = await supabase.from('packages').update(form).eq('id', editingId);
        if (error) throw error;
        toast.success('تم تحديث الباقة');
        await logAuditAction({
          action: 'update',
          entityType: 'package',
          entityId: editingId,
          entityName: form.name_ar || form.name,
          changes: buildChanges(prevPkg ? { name: prevPkg.name, name_ar: prevPkg.name_ar, price: prevPkg.price, duration_days: prevPkg.duration_days, is_active: prevPkg.is_active } : null, { name: form.name, name_ar: form.name_ar, price: form.price, duration_days: form.duration_days, is_active: form.is_active }),
          user: auditUser,
        });
      } else {
        const { data: inserted, error } = await supabase.from('packages').insert(form).select().single();
        if (error) throw error;
        toast.success('تم إضافة الباقة');
        await logAuditAction({
          action: 'create',
          entityType: 'package',
          entityId: inserted?.id || '',
          entityName: form.name_ar || form.name,
          changes: buildChanges(null, form),
          user: auditUser,
        });
      }
      setModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      toast.error('فشل الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const deletedPkg = packages.find((p) => p.id === id);
      const { error } = await supabase.from('packages').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف الباقة');
      setDeleteId(null);
      await logAuditAction({
        action: 'delete',
        entityType: 'package',
        entityId: id,
        entityName: deletedPkg?.name_ar || deletedPkg?.name || id,
        changes: { deleted: true },
        user: getUserAuditInfo(user, userProfile),
      });
      fetchPackages();
    } catch (err: any) {
      toast.error('فشل الحذف: ' + err.message);
    }
  };

  return (
    <AuthGuard>
      <AppLayout currentPath="/packages">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-700 text-foreground">إدارة الباقات</h1>
              <p className="text-sm text-muted-foreground mt-1">{packages.length} باقة مسجلة</p>
            </div>
            {isAdmin && (
              <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors">
                <Icon name="PlusIcon" size={16} />
                إضافة باقة
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-8 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-700 text-foreground text-lg">{pkg.name_ar || pkg.name}</h3>
                      <p className="text-xs text-muted-foreground">{pkg.name}</p>
                    </div>
                    <span className={`text-xs font-500 px-2 py-1 rounded-full ${pkg.is_active ? 'bg-positive-bg text-positive' : 'bg-muted text-muted-foreground'}`}>
                      {pkg.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <p className="text-3xl font-700 text-primary mb-1">{pkg.price.toLocaleString()} <span className="text-base font-500">ج</span></p>
                  <p className="text-sm text-muted-foreground mb-3">{pkg.duration_days} يوم</p>
                  {pkg.description && <p className="text-xs text-muted-foreground border-t border-border pt-3">{pkg.description}</p>}
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                      <button onClick={() => openEdit(pkg)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-primary/10">
                        <Icon name="PencilIcon" size={13} />تعديل
                      </button>
                      <button onClick={() => setDeleteId(pkg.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-negative transition-colors px-2 py-1 rounded hover:bg-negative-bg">
                        <Icon name="TrashIcon" size={13} />حذف
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'تعديل الباقة' : 'إضافة باقة جديدة'}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">الاسم (إنجليزي) *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">الاسم (عربي)</label>
                <input type="text" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">السعر (ج)</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-600 text-foreground mb-1.5">المدة (أيام)</label>
                <input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">الوصف</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pkg_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-primary" />
              <label htmlFor="pkg_active" className="text-sm font-500 text-foreground">باقة نشطة</label>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'إضافة'}
              </button>
              <button onClick={() => setModalOpen(false)} className="flex-1 bg-muted text-foreground py-2 rounded-lg text-sm font-600 hover:bg-muted/80 transition-colors">إلغاء</button>
            </div>
          </div>
        </Modal>

        <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذه الباقة؟</p>
            <div className="flex items-center gap-3">
              <button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 bg-negative text-white py-2 rounded-lg text-sm font-600 hover:bg-negative/90 transition-colors">حذف</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-muted text-foreground py-2 rounded-lg text-sm font-600 hover:bg-muted/80 transition-colors">إلغاء</button>
            </div>
          </div>
        </Modal>
      </AppLayout>
    </AuthGuard>
  );
}
