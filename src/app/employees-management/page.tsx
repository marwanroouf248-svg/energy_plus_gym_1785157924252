'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Employee = {
  id: string;
  full_name: string;
  email: string;
  employee_code: string;
  branch: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

type FormState = {
  fullName: string;
  employeeCode: string;
  pin: string;
  branch: string;
  active: boolean;
};

const BRANCHES = ['فرع فودافون', 'فرع الرخاوي'];
const EMPTY: FormState = { fullName: '', employeeCode: '', pin: '', branch: '', active: true };

export default function EmployeesManagementPage() {
  const { user, userProfile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const role = String(userProfile?.role || user?.user_metadata?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'administrator';

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id,full_name,email,employee_code,branch,role,is_active,created_at')
      .eq('role', 'sales_staff')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setEmployees((data || []) as Employee[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const filtered = useMemo(() => employees.filter(e => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [e.full_name, e.email, e.employee_code, e.branch].some(v => String(v || '').toLowerCase().includes(q));
    return matchesSearch && (branch === 'all' || e.branch === branch) && (status === 'all' || (status === 'active' ? e.is_active : !e.is_active));
  }), [employees, search, branch, status]);

  const active = employees.filter(e => e.is_active).length;

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditingId(e.id);
    setForm({ fullName: e.full_name || '', employeeCode: e.employee_code || '', pin: '', branch: e.branch || '', active: e.is_active });
    setOpen(true);
  };

  const save = async () => {
    if (!form.fullName.trim() || !form.branch) return toast.error('اكتب اسم الموظف واختر الفرع.');
    if (!editingId && !/^[A-Za-z0-9_-]{4,20}$/.test(form.employeeCode.trim())) return toast.error('Employee Code من 4 إلى 20 حرف/رقم.');
    if (!editingId && !/^\d{6,8}$/.test(form.pin)) return toast.error('PIN يجب أن يكون 6 إلى 8 أرقام.');

    setSaving(true);
    try {
      const supabase = createClient();
      if (editingId) {
        const { error } = await supabase.from('user_profiles').update({
          full_name: form.fullName.trim(),
          branch: form.branch,
          is_active: form.active,
        }).eq('id', editingId).eq('role', 'sales_staff');
        if (error) throw error;
        toast.success('تم تحديث الموظف');
      } else {
        const { error } = await supabase.rpc('create_employee_account', {
          p_full_name: form.fullName.trim(),
          p_employee_code: form.employeeCode.trim(),
          p_pin: form.pin,
          p_branch: form.branch,
        });
        if (error) throw error;
        toast.success('تم إنشاء حساب الموظف');
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'تعذر حفظ الموظف');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (e: Employee) => {
    const supabase = createClient();
    const { error } = await supabase.from('user_profiles').update({ is_active: !e.is_active }).eq('id', e.id).eq('role', 'sales_staff');
    if (error) toast.error(error.message);
    else { toast.success(e.is_active ? 'تم إيقاف الموظف' : 'تم تفعيل الموظف'); load(); }
  };

  if (!isAdmin && user) return null;

  return (
    <AuthGuard>
      <AppLayout currentPath="/employees-management">
        <div dir="rtl" className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-800">Employees Management</h1>
              <p className="text-sm text-muted-foreground mt-1">إضافة وإدارة حسابات فريق الـSales من مكان واحد.</p>
            </div>
            <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-700">
              <Icon name="PlusIcon" size={17} /> إضافة موظف
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['إجمالي الموظفين', employees.length], ['Active', active], ['Inactive', employees.length - active], ['المعروض', filtered.length]].map(([label, value]) => (
              <div key={String(label)} className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-800">{value}</div><div className="text-xs text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-3 flex flex-col md:flex-row gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الكود أو الفرع..." className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background" />
            <select value={branch} onChange={e => setBranch(e.target.value)} className="px-3 py-2.5 rounded-lg border border-border bg-background">
              <option value="all">كل الفروع</option>{BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2.5 rounded-lg border border-border bg-background">
              <option value="all">كل الحالات</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead><tr className="bg-muted/40 border-b border-border">
                  <th className="p-3 text-right">الموظف</th><th>Code</th><th>الفرع</th><th>الحالة</th><th>تاريخ الإضافة</th><th>إجراء</th>
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} className="p-10 text-center">جاري تحميل الموظفين...</td></tr> :
                    filtered.map(e => <tr key={e.id} className="border-b border-border/60">
                      <td className="p-3 text-right"><div className="font-700">{e.full_name}</div><div className="text-xs text-muted-foreground">{e.email}</div></td>
                      <td className="text-center font-mono">{e.employee_code || '—'}</td>
                      <td className="text-center">{e.branch || '—'}</td>
                      <td className="text-center"><button onClick={() => toggle(e)} className={`px-2.5 py-1 rounded-full text-xs font-700 ${e.is_active ? 'bg-positive/10 text-positive' : 'bg-muted text-muted-foreground'}`}>{e.is_active ? 'Active' : 'Inactive'}</button></td>
                      <td className="text-center text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="text-center"><button onClick={() => openEdit(e)} className="px-3 py-1.5 rounded-lg border border-border">تعديل</button></td>
                    </tr>)}
                  {!loading && !filtered.length && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">لا يوجد موظفون مطابقون.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {open && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={() => setOpen(false)}>
            <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-5 shadow-xl" onMouseDown={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-800">{editingId ? 'تعديل الموظف' : 'إضافة موظف Sales'}</h2><p className="text-xs text-muted-foreground mt-1">{editingId ? 'تعديل البيانات الأساسية والحالة.' : 'سيتم إنشاء حساب دخول للموظف.'}</p></div><button onClick={() => setOpen(false)} className="text-muted-foreground">✕</button></div>
              <div className="space-y-3">
                <input value={form.fullName} onChange={e => setForm({...form, fullName:e.target.value})} placeholder="اسم الموظف" className="w-full px-3 py-3 rounded-lg border border-border bg-background" />
                <div className="grid grid-cols-2 gap-3">
                  <input disabled={!!editingId} value={form.employeeCode} onChange={e => setForm({...form, employeeCode:e.target.value.toUpperCase()})} placeholder="Employee Code" className="px-3 py-3 rounded-lg border border-border bg-background disabled:opacity-50" />
                  {!editingId ? <input value={form.pin} onChange={e => setForm({...form, pin:e.target.value.replace(/\D/g,'').slice(0,8)})} inputMode="numeric" placeholder="PIN (6-8 digits)" className="px-3 py-3 rounded-lg border border-border bg-background" /> : <div className="px-3 py-3 rounded-lg bg-muted text-xs text-muted-foreground">PIN الحالي لا يظهر هنا.</div>}
                </div>
                <select value={form.branch} onChange={e => setForm({...form, branch:e.target.value})} className="w-full px-3 py-3 rounded-lg border border-border bg-background"><option value="">اختر الفرع</option>{BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}</select>
                {editingId && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} /> الحساب Active</label>}
              </div>
              <div className="flex gap-2 mt-5"><button onClick={() => setOpen(false)} className="flex-1 px-4 py-3 rounded-lg border border-border">إلغاء</button><button disabled={saving} onClick={save} className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-700">{saving ? 'جاري الحفظ...' : 'حفظ'}</button></div>
            </div>
          </div>}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
