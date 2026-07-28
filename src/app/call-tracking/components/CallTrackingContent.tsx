'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import Modal from '@/components/ui/Modal';
import AudioPlayer from '@/components/ui/AudioPlayer';
import SoftphoneWidget, { CallContact, CallEndedData } from '@/components/SoftphoneWidget';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type CallDirection = 'outbound' | 'inbound';
export type CallOutcome = 'interested' | 'not_interested' | 'no_answer' | 'callback' | 'converted' | 'follow_up';
export type ContactType = 'subscriber' | 'lead';

export interface CallLog {
  id: string;
  date: string;
  time: string;
  contactName: string;
  contactPhone: string;
  contactType: ContactType;
  direction: CallDirection;
  duration: string;
  outcome: CallOutcome;
  notes: string;
  assignedTo: string;
  recordingUrl?: string | null;
  callSid?: string | null;
  callStatus?: string;
}

interface AssignedContact {
  id: string;
  name: string;
  phone: string;
  type: ContactType;
  status?: string;
  source?: string;
  notes?: string;
}

const OUTCOME_CONFIG: Record<CallOutcome, { label: string; color: string; bg: string }> = {
  interested: { label: 'Interested', color: 'text-positive', bg: 'bg-positive-bg border-positive/20' },
  not_interested: { label: 'Not Interested', color: 'text-negative', bg: 'bg-negative-bg border-negative/20' },
  no_answer: { label: 'No Answer', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  callback: { label: 'Callback', color: 'text-warning', bg: 'bg-warning-bg border-warning/20' },
  converted: { label: 'Converted', color: 'text-positive', bg: 'bg-positive-bg border-positive/20' },
  follow_up: { label: 'Follow Up', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
};

const EMPTY_FORM: Omit<CallLog, 'id'> = {
  date: '',
  time: '',
  contactName: '',
  contactPhone: '',
  contactType: 'lead',
  direction: 'outbound',
  duration: '',
  outcome: 'interested',
  notes: '',
  assignedTo: '',
  recordingUrl: null,
  callSid: null,
};

function formatSeconds(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getNow() {
  const now = new Date();
  const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

function dbRowToCallLog(row: Record<string, unknown>): CallLog {
  const createdAt = row.created_at ? new Date(row.created_at as string) : new Date();
  const date = `${String(createdAt.getDate()).padStart(2, '0')}/${String(createdAt.getMonth() + 1).padStart(2, '0')}/${createdAt.getFullYear()}`;
  const time = `${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`;

  const statusToOutcome = (status: string, outcome?: string): CallOutcome => {
    if (outcome && Object.keys(OUTCOME_CONFIG).includes(outcome)) return outcome as CallOutcome;
    if (status === 'no-answer' || status === 'busy') return 'no_answer';
    if (status === 'failed' || status === 'canceled') return 'not_interested';
    return 'interested';
  };

  return {
    id: row.id as string,
    date,
    time,
    contactName: (row.contact_name as string) || '',
    contactPhone: (row.contact_phone as string) || '',
    contactType: (row.contact_type as ContactType) || 'lead',
    direction: (row.direction as CallDirection) || 'outbound',
    duration: formatSeconds(row.call_duration as number),
    outcome: statusToOutcome(row.call_status as string, row.outcome as string),
    notes: (row.notes as string) || '',
    assignedTo: (row.assigned_to as string) || '',
    recordingUrl: (row.recording_url as string) || null,
    callSid: (row.call_sid as string) || null,
    callStatus: (row.call_status as string) || '',
  };
}

export default function CallTrackingContent() {
  const { user, userProfile } = useAuth();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignedContacts, setAssignedContacts] = useState<AssignedContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactSearch, setContactSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'my-contacts' | 'call-log'>('my-contacts');
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [contactTypeFilter, setContactTypeFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<CallLog | null>(null);
  const [form, setForm] = useState<Omit<CallLog, 'id'>>(EMPTY_FORM);
  const [softphoneContact, setSoftphoneContact] = useState<CallContact | null>(null);
  const [quickCallOpen, setQuickCallOpen] = useState(false);
  const [quickCallForm, setQuickCallForm] = useState({ name: '', phone: '', type: 'lead' as ContactType });
  const [recordingsModalOpen, setRecordingsModalOpen] = useState(false);

  const supabase = createClient();
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'branch_manager';
  const staffName = userProfile?.full_name || user?.email || '';

  const fetchAssignedContacts = useCallback(async () => {
    setContactsLoading(true);
    const contacts: AssignedContact[] = [];

    const leadsQuery = supabase
      .from('leads')
      .select('id, name, phone, status, source, notes')
      .order('created_at', { ascending: false });

    if (!isAdmin && staffName) {
      leadsQuery.eq('assigned_to', staffName);
    }

    const { data: leadsData } = await leadsQuery;
    if (leadsData) {
      leadsData.forEach((l) => {
        if (l.phone) {
          contacts.push({
            id: l.id,
            name: l.name || '',
            phone: l.phone,
            type: 'lead',
            status: l.status,
            source: l.source,
            notes: l.notes,
          });
        }
      });
    }

    const subsQuery = supabase
      .from('subscribers')
      .select('id, name, phone, status, membership_type')
      .order('created_at', { ascending: false });

    if (!isAdmin && staffName) {
      subsQuery.eq('assigned_to', staffName);
    }

    const { data: subsData } = await subsQuery;
    if (subsData) {
      subsData.forEach((s) => {
        if (s.phone) {
          contacts.push({
            id: s.id,
            name: s.name || '',
            phone: s.phone,
            type: 'subscriber',
            status: s.status,
          });
        }
      });
    }

    setAssignedContacts(contacts);
    setContactsLoading(false);
  }, [isAdmin, staffName]);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCalls(data.map(dbRowToCallLog));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCalls();
    fetchAssignedContacts();
  }, [fetchCalls, fetchAssignedContacts]);

  useEffect(() => {
    const channel = supabase
      .channel('call_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_logs' }, () => {
        fetchCalls();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCalls]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase();
    if (!q) return assignedContacts;
    return assignedContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [assignedContacts, contactSearch]);

  const filtered = useMemo(() => {
    return calls.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        c.contactName.toLowerCase().includes(q) ||
        c.contactPhone.includes(q) ||
        c.notes.toLowerCase().includes(q);
      const matchDir = directionFilter === 'all' || c.direction === directionFilter;
      const matchOutcome = outcomeFilter === 'all' || c.outcome === outcomeFilter;
      const matchType = contactTypeFilter === 'all' || c.contactType === contactTypeFilter;
      return matchSearch && matchDir && matchOutcome && matchType;
    });
  }, [calls, search, directionFilter, outcomeFilter, contactTypeFilter]);

  const stats = useMemo(() => ({
    total: calls.length,
    outbound: calls.filter((c) => c.direction === 'outbound').length,
    inbound: calls.filter((c) => c.direction === 'inbound').length,
    converted: calls.filter((c) => c.outcome === 'converted').length,
  }), [calls]);

  const openAdd = () => {
    setEditingCall(null);
    const { date, time } = getNow();
    setForm({ ...EMPTY_FORM, date, time, assignedTo: staffName });
    setModalOpen(true);
  };

  const openEdit = (call: CallLog) => {
    setEditingCall(call);
    const { id, ...rest } = call;
    setForm(rest);
    setModalOpen(true);
  };

  const handleCallEnded = (data: CallEndedData) => {
    const { date, time } = getNow();
    setEditingCall(null);
    setForm({
      ...EMPTY_FORM,
      date,
      time,
      contactName: data.contact.name,
      contactPhone: data.contact.phone,
      contactType: data.contact.type,
      direction: 'outbound',
      duration: data.durationFormatted,
      notes: data.notes,
      assignedTo: staffName,
      callSid: data.callSid,
    });
    setSoftphoneContact(null);
    setModalOpen(true);
  };

  const startCallForContact = (contact: AssignedContact) => {
    setSoftphoneContact({
      name: contact.name,
      phone: contact.phone,
      type: contact.type,
      leadId: contact.type === 'lead' ? contact.id : undefined,
      assignedTo: staffName,
      assignedUserId: user?.id,
    });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('call_logs').delete().eq('id', id);
    setCalls((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationSeconds = form.duration
      ? form.duration.split(':').reduce((acc, t, i) => acc + parseInt(t) * (i === 0 ? 60 : 1), 0)
      : 0;

    const dbRow: Record<string, unknown> = {
      contact_name: form.contactName,
      contact_phone: form.contactPhone,
      contact_type: form.contactType,
      direction: form.direction,
      call_duration: durationSeconds,
      call_status: form.outcome === 'no_answer' ? 'no-answer' : 'completed',
      outcome: form.outcome,
      notes: form.notes,
      assigned_to: form.assignedTo || staffName,
      assigned_user_id: user?.id || null,
      recording_url: form.recordingUrl || null,
    };

    if (form.callSid) {
      dbRow.call_sid = form.callSid;
    }

    if (editingCall) {
      await supabase.from('call_logs').update(dbRow).eq('id', editingCall.id);
    } else {
      await supabase.from('call_logs').insert(dbRow);
    }

    setModalOpen(false);
    fetchCalls();
  };

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuickCall = () => {
    if (!quickCallForm.name || !quickCallForm.phone) return;
    setSoftphoneContact({
      name: quickCallForm.name,
      phone: quickCallForm.phone,
      type: quickCallForm.type,
      assignedTo: staffName,
      assignedUserId: user?.id,
    });
    setQuickCallOpen(false);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Contact Name', 'Phone', 'Type', 'Direction', 'Duration', 'Outcome', 'Assigned To', 'Notes', 'Recording URL'];
    const rows = filtered.map((c) => [
      c.date,
      c.time,
      c.contactName,
      c.contactPhone,
      c.contactType,
      c.direction,
      c.duration || '',
      OUTCOME_CONFIG[c.outcome]?.label || c.outcome,
      c.assignedTo,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      c.recordingUrl || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `call_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const recordingsWithUrl = useMemo(() => filtered.filter((c) => !!c.recordingUrl), [filtered]);

  return (
    <div className="space-y-6">
      {/* Softphone Widget */}
      {softphoneContact && (
        <SoftphoneWidget
          contact={softphoneContact}
          onClose={() => setSoftphoneContact(null)}
          onCallLogged={fetchCalls}
          onCallEnded={handleCallEnded}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-700 text-foreground">Call Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {staffName && <span className="font-500 text-foreground">{staffName} · </span>}
            {calls.length} call{calls.length !== 1 ? 's' : ''} logged
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground rounded-xl text-sm font-600 hover:bg-muted active:scale-95 transition-all duration-150"
            title="Export call logs as CSV"
          >
            <Icon name="ArrowDownTrayIcon" size={16} />
            Export CSV
          </button>
          <button
            onClick={() => setRecordingsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground rounded-xl text-sm font-600 hover:bg-muted active:scale-95 transition-all duration-150"
            title="Download recordings"
          >
            <Icon name="MusicalNoteIcon" size={16} />
            Recordings
            {recordingsWithUrl.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-700">
                {recordingsWithUrl.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setQuickCallOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-positive text-white rounded-xl text-sm font-600 hover:bg-positive/90 active:scale-95 transition-all duration-150"
          >
            <Icon name="PhoneIcon" size={16} />
            Quick Call
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 active:scale-95 transition-all duration-150"
          >
            <Icon name="PhoneArrowUpRightIcon" size={16} />
            Log Call
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Calls', count: stats.total, color: 'text-foreground', bg: 'bg-card border-border' },
          { label: 'Outbound', count: stats.outbound, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
          { label: 'Inbound', count: stats.inbound, color: 'text-positive', bg: 'bg-positive-bg border-positive/20' },
          { label: 'Converted', count: stats.converted, color: 'text-positive', bg: 'bg-positive-bg border-positive/20' },
        ].map((stat) => (
          <div key={`stat-${stat.label}`} className={`rounded-xl border px-4 py-3 ${stat.bg}`}>
            <p className={`text-2xl font-700 tabular-nums ${stat.color}`}>{stat.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('my-contacts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all duration-150 ${activeTab === 'my-contacts' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Icon name="UsersIcon" size={15} />
          My Contacts
          {assignedContacts.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-700">
              {assignedContacts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('call-log')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all duration-150 ${activeTab === 'call-log' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Icon name="PhoneIcon" size={15} />
          Call Log
          {calls.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-700">
              {calls.length}
            </span>
          )}
        </button>
      </div>

      {/* My Contacts Tab */}
      {activeTab === 'my-contacts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search contacts…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-card border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
            </div>
            <p className="text-sm text-muted-foreground shrink-0">
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
            </p>
          </div>

          {contactsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl flex flex-col items-center gap-3 py-16">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <Icon name="UsersIcon" size={24} className="text-muted-foreground" />
              </div>
              <p className="text-base font-600 text-foreground">No contacts assigned</p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {isAdmin ? 'No leads or subscribers found.' : 'Ask your manager to assign leads or subscribers to you.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredContacts.map((contact) => (
                <div
                  key={`contact-${contact.id}`}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-150"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary text-sm font-600">
                        {contact.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-600 text-foreground text-sm truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{contact.phone}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-600 uppercase tracking-wide ${
                          contact.type === 'subscriber' ? 'bg-primary/10 text-primary' : 'bg-warning-bg text-warning'
                        }`}>
                          {contact.type === 'subscriber' ? 'Subscriber' : 'Lead'}
                        </span>
                        {contact.status && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-500 bg-muted text-muted-foreground">
                            {contact.status}
                          </span>
                        )}
                      </div>
                      {contact.notes && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{contact.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => startCallForContact(contact)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-positive text-white rounded-lg text-xs font-600 hover:bg-positive/90 active:scale-95 transition-all duration-150"
                    >
                      <Icon name="PhoneIcon" size={13} />
                      Call Now
                    </button>
                    <button
                      onClick={() => {
                        const { date, time } = getNow();
                        setEditingCall(null);
                        setForm({
                          ...EMPTY_FORM,
                          date,
                          time,
                          contactName: contact.name,
                          contactPhone: contact.phone,
                          contactType: contact.type,
                          direction: 'outbound',
                          assignedTo: staffName,
                        });
                        setModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-600 hover:bg-muted/80 transition-all duration-150"
                      title="Log call manually"
                    >
                      <Icon name="PencilSquareIcon" size={13} />
                      Log
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Call Log Tab */}
      {activeTab === 'call-log' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, phone, or notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-card border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
            </div>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="px-3 py-2.5 bg-card border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            >
              <option value="all">All Directions</option>
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
            <select
              value={contactTypeFilter}
              onChange={(e) => setContactTypeFilter(e.target.value)}
              className="px-3 py-2.5 bg-card border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            >
              <option value="all">All Contacts</option>
              <option value="subscriber">Subscribers</option>
              <option value="lead">Leads</option>
            </select>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="px-3 py-2.5 bg-card border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            >
              <option value="all">All Outcomes</option>
              {(Object.keys(OUTCOME_CONFIG) as CallOutcome[]).map((key) => (
                <option key={key} value={key}>{OUTCOME_CONFIG[key].label}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm min-w-[960px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {['Date & Time', 'Contact', 'Type', 'Direction', 'Duration', 'Outcome', 'Recording', 'Notes', 'Assigned To', ''].map((h) => (
                        <th key={`th-${h}`} className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                              <Icon name="PhoneIcon" size={24} className="text-muted-foreground" />
                            </div>
                            <p className="text-base font-600 text-foreground">No calls found</p>
                            <p className="text-sm text-muted-foreground">Adjust your filters or log a new call.</p>
                            <button
                              onClick={openAdd}
                              className="mt-1 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 transition-all duration-150"
                            >
                              <Icon name="PhoneArrowUpRightIcon" size={14} />
                              Log Call
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((call) => {
                        const outcome = OUTCOME_CONFIG[call.outcome];
                        return (
                          <tr key={call.id} className="hover:bg-muted/30 transition-colors duration-100">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-sm font-500 text-foreground">{call.date}</p>
                              <p className="text-xs text-muted-foreground">{call.time}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-500 text-foreground">{call.contactName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-xs text-muted-foreground">{call.contactPhone}</p>
                                <button
                                  onClick={() => setSoftphoneContact({ name: call.contactName, phone: call.contactPhone, type: call.contactType, assignedTo: staffName, assignedUserId: user?.id })}
                                  className="p-0.5 rounded text-muted-foreground hover:text-positive hover:bg-positive/10 transition-colors duration-150"
                                  title={`Call ${call.contactName}`}
                                >
                                  <Icon name="PhoneIcon" size={11} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-500 border ${
                                call.contactType === 'subscriber' ? 'text-primary bg-primary/10 border-primary/20' : 'text-warning bg-warning-bg border-warning/20'
                              }`}>
                                {call.contactType === 'subscriber' ? 'Subscriber' : 'Lead'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-500 border ${
                                call.direction === 'outbound' ? 'text-primary bg-primary/10 border-primary/20' : 'text-positive bg-positive-bg border-positive/20'
                              }`}>
                                <Icon name={call.direction === 'outbound' ? 'PhoneArrowUpRightIcon' : 'PhoneArrowDownLeftIcon'} size={12} />
                                {call.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-sm text-foreground">
                                <Icon name="ClockIcon" size={13} className="text-muted-foreground" />
                                {call.duration || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-500 border ${outcome.bg} ${outcome.color}`}>
                                {outcome.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 min-w-[240px]">
                              {call.recordingUrl ? (
                                <AudioPlayer
                                  url={call.recordingUrl}
                                  contactName={call.contactName}
                                  contactPhone={call.contactPhone}
                                  date={call.date}
                                  time={call.time}
                                  durationLabel={call.duration || undefined}
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-[200px]">
                              <p className="text-sm text-muted-foreground truncate" title={call.notes}>
                                {call.notes || '—'}
                              </p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-sm text-foreground">{call.assignedTo}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => openEdit(call)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
                                  title="Edit"
                                >
                                  <Icon name="PencilSquareIcon" size={15} />
                                </button>
                                <button
                                  onClick={() => handleDelete(call.id)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-negative hover:bg-negative-bg transition-all duration-150"
                                  title="Delete"
                                >
                                  <Icon name="TrashIcon" size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recordings Modal */}
      <Modal open={recordingsModalOpen} onClose={() => setRecordingsModalOpen(false)} title="Call Recordings">
        <div className="space-y-3">
          {recordingsWithUrl.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <Icon name="MusicalNoteIcon" size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No recordings available in the current view.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground pb-1">
                {recordingsWithUrl.length} recording{recordingsWithUrl.length !== 1 ? 's' : ''} found. Click the download button to save each file.
              </p>
              <div className="divide-y divide-border max-h-[420px] overflow-y-auto -mx-1 px-1">
                {recordingsWithUrl.map((call) => (
                  <div key={`rec-${call.id}`} className="py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-600 text-foreground truncate">{call.contactName}</p>
                      <p className="text-xs text-muted-foreground">{call.date} · {call.time} · {call.duration || '—'}</p>
                      <div className="mt-2">
                        <AudioPlayer
                          url={call.recordingUrl!}
                          contactName={call.contactName}
                          contactPhone={call.contactPhone}
                          date={call.date}
                          time={call.time}
                          durationLabel={call.duration || undefined}
                        />
                      </div>
                    </div>
                    <a
                      href={call.recordingUrl!}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-600 hover:bg-primary/20 transition-all duration-150"
                      title="Download recording"
                    >
                      <Icon name="ArrowDownTrayIcon" size={13} />
                      Download
                    </a>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => {
                    recordingsWithUrl.forEach((call, i) => {
                      setTimeout(() => {
                        const link = document.createElement('a');
                        link.href = call.recordingUrl!;
                        link.download = `recording_${call.contactName.replace(/\s+/g, '_')}_${call.date.replace(/\//g, '-')}.mp3`;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.click();
                      }, i * 300);
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 active:scale-95 transition-all duration-150"
                >
                  <Icon name="ArrowDownTrayIcon" size={16} />
                  Download All ({recordingsWithUrl.length})
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Quick Call Modal */}
      <Modal open={quickCallOpen} onClose={() => setQuickCallOpen(false)} title="Quick Call">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Contact Name</label>
            <input
              type="text"
              placeholder="Full name"
              value={quickCallForm.name}
              onChange={(e) => setQuickCallForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            />
          </div>
          <div>
            <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Phone Number</label>
            <input
              type="tel"
              placeholder="01xxxxxxxxx"
              value={quickCallForm.phone}
              onChange={(e) => setQuickCallForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            />
          </div>
          <div>
            <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Contact Type</label>
            <select
              value={quickCallForm.type}
              onChange={(e) => setQuickCallForm((p) => ({ ...p, type: e.target.value as ContactType }))}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            >
              <option value="lead">Lead</option>
              <option value="subscriber">Subscriber</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setQuickCallOpen(false)}
              className="flex-1 px-4 py-2.5 bg-muted text-foreground rounded-xl text-sm font-600 hover:bg-muted/80 transition-all duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleQuickCall}
              disabled={!quickCallForm.name || !quickCallForm.phone}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-positive text-white rounded-xl text-sm font-600 hover:bg-positive/90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="PhoneIcon" size={16} />
              Call Now
            </button>
          </div>
        </div>
      </Modal>

      {/* Log / Edit Call Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingCall ? 'Edit Call Log' : 'Log New Call'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingCall && form.duration && (
            <div className="flex items-center gap-2 px-3 py-2 bg-positive-bg border border-positive/20 rounded-xl">
              <Icon name="CheckCircleIcon" size={15} className="text-positive shrink-0" />
              <p className="text-xs text-positive font-500">Call duration auto-filled from the call you just made.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Date</label>
              <input
                type="date"
                required
                value={form.date ? form.date.split('/').reverse().join('-') : ''}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split('-');
                  updateForm('date', `${d}/${m}/${y}`);
                }}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Time</label>
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => updateForm('time', e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Contact Name</label>
              <input
                type="text"
                required
                placeholder="Full name"
                value={form.contactName}
                onChange={(e) => updateForm('contactName', e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Phone</label>
              <input
                type="tel"
                placeholder="01xxxxxxxxx"
                value={form.contactPhone}
                onChange={(e) => updateForm('contactPhone', e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Contact Type</label>
              <select
                value={form.contactType}
                onChange={(e) => updateForm('contactType', e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              >
                <option value="subscriber">Subscriber</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Direction</label>
              <select
                value={form.direction}
                onChange={(e) => updateForm('direction', e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                Duration (mm:ss)
                {form.duration && !editingCall && (
                  <span className="ml-1 text-positive font-500 normal-case">✓ auto-filled</span>
                )}
              </label>
              <input
                type="text"
                placeholder="e.g. 4:32"
                value={form.duration}
                onChange={(e) => updateForm('duration', e.target.value)}
                className={`w-full px-3 py-2.5 bg-background border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${form.duration && !editingCall ? 'border-positive/40 bg-positive-bg/30' : 'border-input'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Outcome</label>
              <select
                value={form.outcome}
                onChange={(e) => updateForm('outcome', e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              >
                {(Object.keys(OUTCOME_CONFIG) as CallOutcome[]).map((key) => (
                  <option key={key} value={key}>{OUTCOME_CONFIG[key].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Assigned To</label>
            <input
              type="text"
              placeholder="Staff member name"
              value={form.assignedTo}
              onChange={(e) => updateForm('assignedTo', e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            />
          </div>
          <div>
            <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Recording URL (optional)</label>
            <input
              type="url"
              placeholder="https://…"
              value={form.recordingUrl || ''}
              onChange={(e) => updateForm('recordingUrl', e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            />
          </div>
          <div>
            <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Outcome Notes</label>
            <textarea
              rows={3}
              placeholder="What happened during the call? Any follow-up actions?"
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 bg-muted text-foreground rounded-xl text-sm font-600 hover:bg-muted/80 transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 active:scale-95 transition-all duration-150"
            >
              {editingCall ? 'Save Changes' : 'Log Call'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}