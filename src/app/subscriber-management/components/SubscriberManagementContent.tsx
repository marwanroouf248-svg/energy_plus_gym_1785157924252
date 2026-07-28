'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import Modal from '@/components/ui/Modal';
import SubscriberRegistrationForm from './SubscriberRegistrationForm';
import SubscriberTableRow from './SubscriberTableRow';
import SubscriberFilters from './SubscriberFilters';
import BulkActionBar from './BulkActionBar';
import DataUpload from '@/components/DataUpload';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logAuditAction, getUserAuditInfo, buildChanges } from '@/lib/auditLog';

export type SubscriberStatus = 'active' | 'expiring' | 'expired' | 'frozen';
export type PaymentStatus = 'paid' | 'partial' | 'overdue';
export type PackageType = 'Monthly' | 'Quarterly' | '6-Month' | 'Annual' | 'Student';

export interface Subscriber {
  id: string;
  name: string;
  phone: string;
  package: PackageType;
  branch: string;
  startDate: string;
  endDate: string;
  amountPaid: number;
  totalAmount: number;
  remainingBalance: number;
  status: SubscriberStatus;
  paymentStatus: PaymentStatus;
  assignedTo: string;
}

const PACKAGES: PackageType[] = ['Monthly', 'Quarterly', '6-Month', 'Annual', 'Student'];
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

function dbRowToSubscriber(row: any): Subscriber {
  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    package: (row.package as PackageType) || 'Monthly',
    branch: row.branch || '',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    amountPaid: row.amount_paid || 0,
    totalAmount: row.total_amount || 0,
    remainingBalance: row.remaining_balance || 0,
    status: (row.status as SubscriberStatus) || 'active',
    paymentStatus: (row.payment_status as PaymentStatus) || 'paid',
    assignedTo: row.assigned_to || '',
  };
}

export default function SubscriberManagementContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sortCol, setSortCol] = useState<keyof Subscriber>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSubscribers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Fetch subscribers error:', error.message);
        toast.error('Failed to load subscribers');
      } else {
        setSubscribers((data || []).map(dbRowToSubscriber));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  // Real-time subscription: sync all staff instantly on any change
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel('subscribers-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'subscribers' },
        (payload) => {
          const newRow = dbRowToSubscriber(payload.new);
          setSubscribers((prev) => {
            // Avoid duplicates (e.g. the inserting user already added it optimistically)
            if (prev.some((s) => s.id === newRow.id)) return prev;
            return [newRow, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'subscribers' },
        (payload) => {
          const updated = dbRowToSubscriber(payload.new);
          setSubscribers((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'subscribers' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setSubscribers((prev) => prev.filter((s) => s.id !== deletedId));
            setSelectedIds((prev) => prev.filter((x) => x !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filtered = useMemo(() => {
    return subscribers
      .filter((s) => {
        const q = search.toLowerCase();
        const matchSearch = s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.id.includes(q);
        const matchStatus = statusFilter === 'all' || s.status === statusFilter;
        const matchPackage = packageFilter === 'all' || s.package === packageFilter;
        return matchSearch && matchStatus && matchPackage;
      })
      .sort((a, b) => {
        const av = a[sortCol] as string | number;
        const bv = b[sortCol] as string | number;
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [subscribers, search, statusFilter, packageFilter, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSort = (col: keyof Subscriber) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginated.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginated.map((s) => s.id));
    }
  };

  const handleAddSubscriber = async (newSub: Subscriber) => {
    if (!user) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subscribers')
        .insert({
          user_id: user.id,
          name: newSub.name,
          phone: newSub.phone,
          package: newSub.package,
          branch: newSub.branch,
          start_date: newSub.startDate,
          end_date: newSub.endDate,
          amount_paid: newSub.amountPaid,
          total_amount: newSub.totalAmount,
          remaining_balance: newSub.remainingBalance,
          status: newSub.status,
          payment_status: newSub.paymentStatus,
          assigned_to: newSub.assignedTo,
        })
        .select()
        .single();
      if (error) {
        toast.error('Failed to add subscriber');
      } else {
        setSubscribers((prev) => [dbRowToSubscriber(data), ...prev]);
        setRegisterOpen(false);
        toast.success('Subscriber registered successfully!');
        await logAuditAction({
          action: 'create',
          entityType: 'subscriber',
          entityId: data?.id || '',
          entityName: newSub.name,
          changes: buildChanges(null, { name: newSub.name, phone: newSub.phone, package: newSub.package, branch: newSub.branch, status: newSub.status }),
          user: getUserAuditInfo(user, null),
        });
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add subscriber');
    }
  };

  const handleDeleteSelected = async () => {
    if (!user) return;
    try {
      const supabase = createClient();
      const toDelete = subscribers.filter((s) => selectedIds.includes(s.id));
      const { error } = await supabase
        .from('subscribers')
        .delete()
        .in('id', selectedIds);
      if (error) {
        toast.error('Failed to delete subscribers');
      } else {
        setSubscribers((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
        const auditUser = getUserAuditInfo(user, null);
        for (const sub of toDelete) {
          await logAuditAction({
            action: 'delete',
            entityType: 'subscriber',
            entityId: sub.id,
            entityName: sub.name,
            changes: { deleted: true },
            user: auditUser,
          });
        }
        setSelectedIds([]);
        toast.success('Subscribers deleted');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  };

  const exportCSV = () => {
    const headers = [
      'ID', 'Name', 'Phone', 'Package', 'Branch', 'Start Date', 'End Date',
      'Amount Paid', 'Total Amount', 'Remaining Balance', 'Status', 'Payment Status', 'Assigned To'
    ];
    const rows = filtered.map((s) => [
      s.id,
      s.name,
      s.phone,
      s.package,
      s.branch,
      s.startDate,
      s.endDate,
      s.amountPaid,
      s.totalAmount,
      s.remainingBalance,
      s.status,
      s.paymentStatus,
      s.assignedTo,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => {
          const val = cell == null ? '' : String(cell);
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(',')
      )
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} subscriber${filtered.length !== 1 ? 's' : ''} to CSV`);
  };

  const SortIcon = ({ col }: { col: keyof Subscriber }) => {
    if (sortCol !== col) return <Icon name="ChevronUpDownIcon" size={13} className="text-muted-foreground/50" />;
    return sortDir === 'asc'
      ? <Icon name="ChevronUpIcon" size={13} className="text-primary" />
      : <Icon name="ChevronDownIcon" size={13} className="text-primary" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-700 text-foreground">Subscriber Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} subscriber{filtered.length !== 1 ? 's' : ''} · {subscribers.filter((s) => s.status === 'active').length} active
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-border text-foreground rounded-xl text-sm font-600 hover:bg-border active:scale-95 transition-all duration-150"
          >
            <Icon name="ArrowDownTrayIcon" size={16} />
            Export CSV
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-border text-foreground rounded-xl text-sm font-600 hover:bg-border active:scale-95 transition-all duration-150"
          >
            <Icon name="ArrowUpTrayIcon" size={16} />
            Upload Data
          </button>
          <button
            onClick={() => setRegisterOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 active:scale-95 transition-all duration-150"
          >
            <Icon name="UserPlusIcon" size={16} />
            Register Subscriber
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active', count: subscribers.filter((s) => s.status === 'active').length, color: 'text-positive', bg: 'bg-positive-bg border-positive/20' },
          { label: 'Expiring Soon', count: subscribers.filter((s) => s.status === 'expiring').length, color: 'text-warning', bg: 'bg-warning-bg border-warning/20' },
          { label: 'Expired', count: subscribers.filter((s) => s.status === 'expired').length, color: 'text-negative', bg: 'bg-negative-bg border-negative/20' },
          { label: 'Overdue Payments', count: subscribers.filter((s) => s.paymentStatus === 'overdue').length, color: 'text-negative', bg: 'bg-negative-bg border-negative/20' },
        ].map((stat) => (
          <div key={`stat-${stat.label}`} className={`rounded-xl border px-4 py-3 ${stat.bg}`}>
            <p className={`text-2xl font-700 tabular-nums ${stat.color}`}>{stat.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <SubscriberFilters
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        statusFilter={statusFilter}
        onStatusFilter={(v) => { setStatusFilter(v); setPage(1); }}
        packageFilter={packageFilter}
        onPackageFilter={(v) => { setPackageFilter(v); setPage(1); }}
        packages={PACKAGES}
      />

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <BulkActionBar
          count={selectedIds.length}
          onDelete={handleDeleteSelected}
          onClear={() => setSelectedIds([])}
        />
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && selectedIds.length === paginated.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-input accent-primary cursor-pointer"
                    aria-label="Select all"
                  />
                </th>
                {[
                  { key: 'name', label: 'Member' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'package', label: 'Package' },
                  { key: 'branch', label: 'Branch' },
                  { key: 'startDate', label: 'Start' },
                  { key: 'endDate', label: 'Expires' },
                  { key: 'amountPaid', label: 'Paid (EGP)' },
                  { key: 'remainingBalance', label: 'Balance (EGP)' },
                  { key: 'status', label: 'Status' },
                  { key: 'paymentStatus', label: 'Payment' },
                ].map(({ key, label }) => (
                  <th
                    key={`th-${key}`}
                    onClick={() => handleSort(key as keyof Subscriber)}
                    className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors duration-150 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      {label}
                      <SortIcon col={key as keyof Subscriber} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-600 text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">Loading subscribers...</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                        <Icon name="UsersIcon" size={24} className="text-muted-foreground" />
                      </div>
                      <p className="text-base font-600 text-foreground">No subscribers found</p>
                      <p className="text-sm text-muted-foreground">
                        Register a new subscriber or upload a CSV/Excel file to get started.
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => setUploadOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-muted border border-border text-foreground rounded-xl text-sm font-600 hover:bg-border transition-all duration-150"
                        >
                          <Icon name="ArrowUpTrayIcon" size={14} />
                          Upload Data
                        </button>
                        <button
                          onClick={() => setRegisterOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 transition-all duration-150"
                        >
                          <Icon name="UserPlusIcon" size={14} />
                          Register Subscriber
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((subscriber) => (
                  <SubscriberTableRow
                    key={subscriber.id}
                    subscriber={subscriber}
                    selected={selectedIds.includes(subscriber.id)}
                    onToggleSelect={() => toggleSelect(subscriber.id)}
                    onDelete={(id) => {
                      setSubscribers((prev) => prev.filter((s) => s.id !== id));
                      setSelectedIds((prev) => prev.filter((x) => x !== id));
                    }}
                    onUpdate={(updated) => {
                      setSubscribers((prev) => prev.map((s) => s.id === updated.id ? updated : s));
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
                className="bg-card border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                  <option key={`ipp-${n}`} value={n}>{n}</option>
                ))}
              </select>
              <span>
                of <span className="font-600 text-foreground tabular-nums">{filtered.length}</span> subscribers
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 text-muted-foreground" aria-label="First page">
                <Icon name="ChevronDoubleLeftIcon" size={14} />
              </button>
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 text-muted-foreground" aria-label="Previous page">
                <Icon name="ChevronLeftIcon" size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setPage(pageNum)}
                    className={`min-w-[32px] h-8 rounded-lg text-sm font-500 transition-colors duration-150 ${
                      page === pageNum ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 text-muted-foreground" aria-label="Next page">
                <Icon name="ChevronRightIcon" size={14} />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 text-muted-foreground" aria-label="Last page">
                <Icon name="ChevronDoubleRightIcon" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="Register New Subscriber" size="lg">
        <SubscriberRegistrationForm
          onSuccess={handleAddSubscriber}
          onCancel={() => setRegisterOpen(false)}
        />
      </Modal>

      {/* Upload Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Subscriber Data" size="lg">
        <DataUpload onUploadComplete={(count) => {
          setUploadOpen(false);
          fetchSubscribers();
        }} />
      </Modal>
    </div>
  );
}