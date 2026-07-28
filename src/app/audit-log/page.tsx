'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  changes: Record<string, any>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  create: { label: 'إضافة', color: 'text-positive', bg: 'bg-positive-bg border-positive/20', icon: 'PlusCircleIcon' },
  update: { label: 'تعديل', color: 'text-warning', bg: 'bg-warning-bg border-warning/20', icon: 'PencilSquareIcon' },
  delete: { label: 'حذف', color: 'text-negative', bg: 'bg-negative-bg border-negative/20', icon: 'TrashIcon' },
};

const ENTITY_LABELS: Record<string, string> = {
  lead: 'ليد',
  subscriber: 'مشترك',
  package: 'باقة',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير عام',
  branch_manager: 'مدير فرع',
  sales_staff: 'موظف مبيعات',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ChangesDisplay({ changes }: { changes: Record<string, any> }) {
  if (!changes || Object.keys(changes).length === 0) return null;
  if (changes.deleted) return <span className="text-xs text-negative">تم الحذف</span>;
  if (changes.created) {
    const entries = Object.entries(changes.created).filter(([, v]) => v !== '' && v !== null && v !== undefined);
    return (
      <div className="space-y-0.5">
        {entries.slice(0, 4).map(([k, v]) => (
          <div key={k} className="text-xs text-muted-foreground">
            <span className="font-500 text-foreground">{k}:</span> {String(v)}
          </div>
        ))}
        {entries.length > 4 && <div className="text-xs text-muted-foreground">+{entries.length - 4} حقول أخرى</div>}
      </div>
    );
  }
  const entries = Object.entries(changes);
  return (
    <div className="space-y-0.5">
      {entries.slice(0, 3).map(([k, v]: [string, any]) => (
        <div key={k} className="text-xs text-muted-foreground">
          <span className="font-500 text-foreground">{k}:</span>{' '}
          <span className="line-through opacity-60">{String(v?.from ?? '')}</span>
          {' → '}
          <span className="text-positive">{String(v?.to ?? '')}</span>
        </div>
      ))}
      {entries.length > 3 && <div className="text-xs text-muted-foreground">+{entries.length - 3} تغييرات أخرى</div>}
    </div>
  );
}

export default function AuditLogPage() {
  const { user, userProfile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const userRole = userProfile?.role || user?.user_metadata?.role || '';
  const canView = userRole === 'admin' || userRole === 'branch_manager';

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      toast.error('فشل تحميل سجل التدقيق: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) fetchLogs();
  }, [fetchLogs, canView]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchAction = actionFilter === 'all' || log.action === actionFilter;
      const matchEntity = entityFilter === 'all' || log.entity_type === entityFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        log.user_name.toLowerCase().includes(q) ||
        log.user_email.toLowerCase().includes(q) ||
        log.entity_name.toLowerCase().includes(q);
      return matchAction && matchEntity && matchSearch;
    });
  }, [logs, actionFilter, entityFilter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const stats = useMemo(() => ({
    total: logs.length,
    creates: logs.filter((l) => l.action === 'create').length,
    updates: logs.filter((l) => l.action === 'update').length,
    deletes: logs.filter((l) => l.action === 'delete').length,
  }), [logs]);

  return (
    <AuthGuard>
      <AppLayout currentPath="/audit-log">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-700 text-foreground">سجل التدقيق</h1>
              <p className="text-sm text-muted-foreground mt-1">تتبع جميع إجراءات المديرين والموظفين</p>
            </div>
            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg text-sm font-500 hover:bg-border transition-colors"
            >
              <Icon name="ArrowPathIcon" size={15} />
              تحديث
            </button>
          </div>

          {!canView ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Icon name="ShieldExclamationIcon" size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="font-600 text-foreground">غير مصرح بالوصول</p>
              <p className="text-sm text-muted-foreground mt-1">سجل التدقيق متاح للمديرين فقط</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'إجمالي الإجراءات', value: stats.total, color: 'text-foreground', bg: 'bg-card' },
                  { label: 'إضافات', value: stats.creates, color: 'text-positive', bg: 'bg-positive-bg' },
                  { label: 'تعديلات', value: stats.updates, color: 'text-warning', bg: 'bg-warning-bg' },
                  { label: 'حذف', value: stats.deletes, color: 'text-negative', bg: 'bg-negative-bg' },
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
                    placeholder="بحث بالاسم أو البريد أو الكيان..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pr-9 pl-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <select
                  value={actionFilter}
                  onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">كل الإجراءات</option>
                  <option value="create">إضافة</option>
                  <option value="update">تعديل</option>
                  <option value="delete">حذف</option>
                </select>
                <select
                  value={entityFilter}
                  onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">كل الكيانات</option>
                  <option value="lead">ليدز</option>
                  <option value="subscriber">مشتركين</option>
                  <option value="package">باقات</option>
                </select>
              </div>

              {/* Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
                ) : paginated.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Icon name="ClipboardDocumentListIcon" size={40} className="text-muted-foreground mb-3" />
                    <p className="font-600 text-foreground">لا توجد سجلات</p>
                    <p className="text-sm text-muted-foreground mt-1">ستظهر الإجراءات هنا بعد تنفيذها</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">التاريخ والوقت</th>
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">المستخدم</th>
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">الإجراء</th>
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">الكيان</th>
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">الاسم</th>
                          <th className="text-right px-4 py-3 font-600 text-muted-foreground">التغييرات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paginated.map((log) => {
                          const ac = ACTION_CONFIG[log.action] || { label: log.action, color: 'text-foreground', bg: 'bg-muted', icon: 'InformationCircleIcon' };
                          return (
                            <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(log.created_at)}
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-600 text-foreground text-sm">{log.user_name || log.user_email}</p>
                                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[log.user_role] || log.user_role}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-500 border ${ac.bg} ${ac.color}`}>
                                  <Icon name={ac.icon as any} size={11} />
                                  {ac.label}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-500 text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  {ENTITY_LABELS[log.entity_type] || log.entity_type}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-500 text-foreground">{log.entity_name}</td>
                              <td className="px-4 py-3 max-w-xs">
                                <ChangesDisplay changes={log.changes} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    عرض {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} من {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 bg-muted border border-border rounded-lg text-sm disabled:opacity-40 hover:bg-border transition-colors"
                    >
                      السابق
                    </button>
                    <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 bg-muted border border-border rounded-lg text-sm disabled:opacity-40 hover:bg-border transition-colors"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
