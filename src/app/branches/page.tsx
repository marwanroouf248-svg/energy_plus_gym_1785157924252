'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import Icon from '@/components/ui/AppIcon';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Branch {
  id: string;
  name: string;
  name_ar: string;
  type: string;
  address: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

interface BranchForm {
  name: string;
  name_ar: string;
  type: string;
  address: string;
  phone: string;
  is_active: boolean;
}

const EMPTY_FORM: BranchForm = {
  name: '',
  name_ar: '',
  type: 'mixed',
  address: '',
  phone: '',
  is_active: true,
};

const TYPE_LABELS: Record<string, string> = {
  male: 'رجالي',
  female: 'نسائي',
  mixed: 'مختلط',
};

export default function BranchesPage() {
  const { user, userProfile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const userRole = userProfile?.role || user?.user_metadata?.role || '';

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setBranches(data || []);
    } catch (err: any) {
      toast.error('فشل تحميل الفروع: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditingId(b.id);
    setForm({
      name: b.name,
      name_ar: b.name_ar,
      type: b.type,
      address: b.address,
      phone: b.phone,
      is_active: b.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('اسم الفرع مطلوب');
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      if (editingId) {
        const { error } = await supabase.from('branches').update(form).eq('id', editingId);
        if (error) throw error;
        toast.success('تم تحديث الفرع');
      } else {
        const { error } = await supabase.from('branches').insert({ ...form });
        if (error) throw error;
        toast.success('تم إضافة الفرع');
      }
      setModalOpen(false);
      fetchBranches();
    } catch (err: any) {
      toast.error('فشل الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف الفرع');
      setDeleteId(null);
      fetchBranches();
    } catch (err: any) {
      toast.error('فشل الحذف: ' + err.message);
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <AuthGuard>
      <AppLayout currentPath="/branches">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-700 text-foreground">إدارة الفروع</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {branches.length} فرع مسجل
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors"
              >
                <Icon name="PlusIcon" size={16} />
                إضافة فرع
              </button>
            )}
          </div>

          {/* Branches Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : branches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Icon name="BuildingOfficeIcon" size={48} className="text-muted-foreground mb-4" />
              <p className="text-lg font-600 text-foreground">لا توجد فروع</p>
              <p className="text-sm text-muted-foreground mt-1">أضف أول فرع للبدء</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((branch) => (
                <div key={branch.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        branch.type === 'male' ? 'bg-blue-500/10' :
                        branch.type === 'female' ? 'bg-pink-500/10' : 'bg-primary/10'
                      }`}>
                        <Icon
                          name="BuildingOfficeIcon"
                          size={20}
                          className={
                            branch.type === 'male' ? 'text-blue-500' :
                            branch.type === 'female' ? 'text-pink-500' : 'text-primary'
                          }
                        />
                      </div>
                      <div>
                        <h3 className="font-700 text-foreground text-base">{branch.name}</h3>
                        <span className={`text-xs font-500 px-2 py-0.5 rounded-full ${
                          branch.type === 'male' ? 'bg-blue-500/10 text-blue-500' :
                          branch.type === 'female'? 'bg-pink-500/10 text-pink-500' : 'bg-primary/10 text-primary'
                        }`}>
                          {TYPE_LABELS[branch.type] || branch.type}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-500 px-2 py-1 rounded-full ${
                      branch.is_active ? 'bg-positive-bg text-positive' : 'bg-muted text-muted-foreground'
                    }`}>
                      {branch.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {branch.address && (
                      <div className="flex items-center gap-2">
                        <Icon name="MapPinIcon" size={14} />
                        <span>{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2">
                        <Icon name="PhoneIcon" size={14} />
                        <span dir="ltr">{branch.phone}</span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                      <button
                        onClick={() => openEdit(branch)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-primary/10"
                      >
                        <Icon name="PencilIcon" size={13} />
                        تعديل
                      </button>
                      <button
                        onClick={() => setDeleteId(branch.id)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-negative transition-colors px-2 py-1 rounded hover:bg-negative-bg"
                      >
                        <Icon name="TrashIcon" size={13} />
                        حذف
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'تعديل الفرع' : 'إضافة فرع جديد'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">اسم الفرع *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: فرع فودافون"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">نوع الفرع</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="male">رجالي</option>
                <option value="female">نسائي</option>
                <option value="mixed">مختلط</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">العنوان</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="عنوان الفرع"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">رقم الهاتف</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01xxxxxxxxx"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                dir="ltr"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="is_active" className="text-sm font-500 text-foreground">فرع نشط</label>
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

        {/* Delete Confirm Modal */}
        <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذا الفرع؟ لا يمكن التراجع عن هذا الإجراء.</p>
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
