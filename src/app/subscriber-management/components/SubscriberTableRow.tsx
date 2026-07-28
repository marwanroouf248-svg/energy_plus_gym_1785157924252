'use client';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import Icon from '@/components/ui/AppIcon';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import { Subscriber, SubscriberStatus, PaymentStatus, PackageType } from './SubscriberManagementContent';
import { toast } from 'sonner';
import SoftphoneWidget, { CallContact } from '@/components/SoftphoneWidget';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditAction, getUserAuditInfo, buildChanges } from '@/lib/auditLog';

interface SubscriberTableRowProps {
  subscriber: Subscriber;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: (id: string) => void;
  onUpdate?: (updated: Subscriber) => void;
}

const PACKAGES: PackageType[] = ['Monthly', 'Quarterly', '6-Month', 'Annual', 'Student'];
const BRANCHES = ['فرع فودافون', 'فرع الرخاوي'];
const STATUSES: SubscriberStatus[] = ['active', 'expiring', 'expired', 'frozen'];
const PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'partial', 'overdue'];

const STATUS_LABELS: Record<SubscriberStatus, string> = {
  active: 'نشط',
  expiring: 'ينتهي قريباً',
  expired: 'منتهي',
  frozen: 'مجمد',
};
const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: 'مدفوع',
  partial: 'جزئي',
  overdue: 'متأخر',
};

export default function SubscriberTableRow({ subscriber: s, selected, onToggleSelect, onDelete, onUpdate }: SubscriberTableRowProps) {
  const { user, userProfile } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [softphoneContact, setSoftphoneContact] = useState<CallContact | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: s.name,
    phone: s.phone,
    package: s.package as PackageType,
    branch: s.branch,
    startDate: s.startDate,
    endDate: s.endDate,
    amountPaid: s.amountPaid,
    totalAmount: s.totalAmount,
    remainingBalance: s.remainingBalance,
    status: s.status as SubscriberStatus,
    paymentStatus: s.paymentStatus as PaymentStatus,
    assignedTo: s.assignedTo,
  });

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(s.id);
      toast.success(`${s.name} removed from subscribers`);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const handleCall = () => {
    setSoftphoneContact({
      name: s.name,
      phone: s.phone,
      type: 'subscriber',
      leadId: s.id,
      assignedTo: s.assignedTo,
    });
  };

  const openEdit = () => {
    setForm({
      name: s.name,
      phone: s.phone,
      package: s.package as PackageType,
      branch: s.branch,
      startDate: s.startDate,
      endDate: s.endDate,
      amountPaid: s.amountPaid,
      totalAmount: s.totalAmount,
      remainingBalance: s.remainingBalance,
      status: s.status as SubscriberStatus,
      paymentStatus: s.paymentStatus as PaymentStatus,
      assignedTo: s.assignedTo,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('الاسم والهاتف مطلوبان');
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const updateData = {
        name: form.name,
        phone: form.phone,
        package: form.package,
        branch: form.branch,
        start_date: form.startDate,
        end_date: form.endDate,
        amount_paid: form.amountPaid,
        total_amount: form.totalAmount,
        remaining_balance: form.remainingBalance,
        status: form.status,
        payment_status: form.paymentStatus,
        assigned_to: form.assignedTo,
      };
      const { error } = await supabase.from('subscribers').update(updateData).eq('id', s.id);
      if (error) throw error;
      toast.success('تم تحديث بيانات المشترك');
      await logAuditAction({
        action: 'update',
        entityType: 'subscriber',
        entityId: s.id,
        entityName: form.name,
        changes: buildChanges(
          { name: s.name, phone: s.phone, package: s.package, branch: s.branch, status: s.status, paymentStatus: s.paymentStatus },
          { name: form.name, phone: form.phone, package: form.package, branch: form.branch, status: form.status, paymentStatus: form.paymentStatus }
        ),
        user: getUserAuditInfo(user, userProfile),
      });
      const updated: Subscriber = { ...s, ...form };
      onUpdate?.(updated);
      setEditOpen(false);
    } catch (err: any) {
      toast.error('فشل التحديث: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {softphoneContact && typeof document !== 'undefined' && ReactDOM.createPortal(
        <SoftphoneWidget
          contact={softphoneContact}
          onClose={() => setSoftphoneContact(null)}
        />,
        document.body
      )}
      <tr className={`group transition-colors duration-100 ${selected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded border-input accent-primary cursor-pointer"
            aria-label={`Select ${s.name}`}
          />
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-600">
                {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </span>
            </div>
            <div>
              <p className="font-500 text-foreground text-sm">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.id}</p>
            </div>
          </div>
        </td>

        <td className="px-4 py-3">
          <span className="text-sm text-foreground tabular-nums">{s.phone}</span>
        </td>

        <td className="px-4 py-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-muted text-xs font-500 text-foreground border border-border">
            {s.package}
          </span>
        </td>

        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">{s.branch}</span>
        </td>

        <td className="px-4 py-3">
          <span className="text-sm text-foreground tabular-nums">{s.startDate}</span>
        </td>

        <td className="px-4 py-3">
          <span className={`text-sm tabular-nums font-500 ${s.status === 'expiring' ? 'text-warning' : s.status === 'expired' ? 'text-negative' : 'text-foreground'}`}>
            {s.endDate}
          </span>
        </td>

        <td className="px-4 py-3">
          <span className="text-sm text-foreground tabular-nums font-500">
            {s.amountPaid.toLocaleString()}
          </span>
        </td>

        <td className="px-4 py-3">
          <span className={`text-sm tabular-nums font-600 ${s.remainingBalance > 0 ? 'text-negative' : 'text-positive'}`}>
            {s.remainingBalance > 0 ? s.remainingBalance.toLocaleString() : '—'}
          </span>
        </td>

        <td className="px-4 py-3">
          <StatusBadge status={s.status} />
        </td>

        <td className="px-4 py-3">
          <StatusBadge status={s.paymentStatus} />
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={handleCall}
              title={`Call ${s.name}`}
              className="p-1.5 rounded-lg hover:bg-positive/10 text-muted-foreground hover:text-positive transition-colors duration-150"
            >
              <Icon name="PhoneIcon" size={15} />
            </button>
            <button
              onClick={openEdit}
              title="Edit subscriber details"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <Icon name="PencilSquareIcon" size={15} />
            </button>
            <button
              title="Send renewal message"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors duration-150"
            >
              <Icon name="ChatBubbleLeftEllipsisIcon" size={15} />
            </button>
            <button
              onClick={handleDelete}
              title={confirmDelete ? 'Click again to confirm deletion' : 'Delete subscriber — cannot be undone'}
              className={`p-1.5 rounded-lg transition-colors duration-150 ${confirmDelete ? 'bg-negative/10 text-negative' : 'hover:bg-muted text-muted-foreground hover:text-negative'}`}
            >
              <Icon name={confirmDelete ? 'ExclamationTriangleIcon' : 'TrashIcon'} size={15} />
            </button>
          </div>
        </td>
      </tr>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`تعديل بيانات: ${s.name}`}>
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
              <label className="block text-sm font-600 text-foreground mb-1.5">الباقة</label>
              <select
                value={form.package}
                onChange={(e) => setForm({ ...form, package: e.target.value as PackageType })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {PACKAGES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">تاريخ البداية</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">تاريخ الانتهاء</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">المبلغ المدفوع</label>
              <input
                type="number"
                value={form.amountPaid}
                onChange={(e) => setForm({ ...form, amountPaid: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">الإجمالي</label>
              <input
                type="number"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">المتبقي</label>
              <input
                type="number"
                value={form.remainingBalance}
                onChange={(e) => setForm({ ...form, remainingBalance: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">حالة الاشتراك</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as SubscriberStatus })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">حالة الدفع</label>
              <select
                value={form.paymentStatus}
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as PaymentStatus })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {PAYMENT_STATUSES.map((ps) => <option key={ps} value={ps}>{PAYMENT_LABELS[ps]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5">المسؤول</label>
            <input
              type="text"
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
            <button
              onClick={() => setEditOpen(false)}
              className="flex-1 bg-muted text-foreground py-2 rounded-lg text-sm font-600 hover:bg-muted/80 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}