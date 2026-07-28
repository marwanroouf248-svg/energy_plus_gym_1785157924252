'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RenewalRule {
  id: string;
  name: string;
  triggerDaysBefore: number;
  channel: 'sms' | 'email' | 'both';
  enabled: boolean;
}

interface OverdueRule {
  id: string;
  name: string;
  triggerDaysAfter: number;
  channel: 'sms' | 'email' | 'both';
  enabled: boolean;
}

interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  type: 'renewal' | 'overdue';
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'renewal' | 'overdue';
}

interface NotificationTiming {
  sendTime: string;
  timezone: string;
  batchSize: number;
  delayBetweenBatches: number;
  maxRetries: number;
  retryIntervalHours: number;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

const INITIAL_RENEWAL_RULES: RenewalRule[] = [
  { id: 'r1', name: 'Early Reminder', triggerDaysBefore: 14, channel: 'email', enabled: true },
  { id: 'r2', name: 'Week Before', triggerDaysBefore: 7, channel: 'both', enabled: true },
  { id: 'r3', name: 'Final Notice', triggerDaysBefore: 1, channel: 'sms', enabled: false },
];

const INITIAL_OVERDUE_RULES: OverdueRule[] = [
  { id: 'o1', name: 'Grace Period Alert', triggerDaysAfter: 3, channel: 'sms', enabled: true },
  { id: 'o2', name: 'Follow-up Notice', triggerDaysAfter: 7, channel: 'both', enabled: true },
  { id: 'o3', name: 'Final Warning', triggerDaysAfter: 14, channel: 'email', enabled: false },
];

const INITIAL_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 's1',
    name: 'Renewal Reminder SMS',
    body: 'Hi {{name}}, your Energy Plus membership expires on {{expiry_date}}. Renew now to keep your access. Reply STOP to opt out.',
    type: 'renewal',
  },
  {
    id: 's2',
    name: 'Overdue Balance SMS',
    body: 'Hi {{name}}, you have an outstanding balance of {{amount}} EGP on your Energy Plus account. Please settle it to avoid suspension.',
    type: 'overdue',
  },
];

const INITIAL_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'e1',
    name: 'Renewal Reminder Email',
    subject: 'Your Energy Plus Membership Expires Soon – {{expiry_date}}',
    body: `Dear {{name}},\n\nYour Energy Plus membership is set to expire on {{expiry_date}}.\n\nTo continue enjoying uninterrupted access to all our facilities, please renew your membership before the expiry date.\n\nRenew online or visit any branch.\n\nBest regards,\nEnergy Plus Team`,
    type: 'renewal',
  },
  {
    id: 'e2',
    name: 'Overdue Balance Email',
    subject: 'Action Required: Outstanding Balance on Your Account',
    body: `Dear {{name}},\n\nWe noticed an outstanding balance of {{amount}} EGP on your Energy Plus account.\n\nPlease settle this balance at your earliest convenience to avoid any service interruption.\n\nContact us at any branch or call our support line.\n\nBest regards,\nEnergy Plus Team`,
    type: 'overdue',
  },
];

const INITIAL_TIMING: NotificationTiming = {
  sendTime: '09:00',
  timezone: 'Africa/Cairo',
  batchSize: 50,
  delayBetweenBatches: 5,
  maxRetries: 3,
  retryIntervalHours: 24,
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="flex items-start gap-3 mb-5">
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)' }}
    >
      <Icon name={icon as any} size={17} style={{ color: '#c9a84c' }} />
    </div>
    <div>
      <h2 className="font-700 text-base" style={{ color: '#f0f2f8' }}>{title}</h2>
      <p className="text-xs mt-0.5" style={{ color: '#6b7494' }}>{subtitle}</p>
    </div>
  </div>
);

const ChannelBadge = ({ channel }: { channel: 'sms' | 'email' | 'both' }) => {
  const map = {
    sms: { label: 'SMS', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    email: { label: 'Email', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    both: { label: 'SMS + Email', color: '#c9a84c', bg: 'rgba(201,168,76,0.1)' },
  };
  const c = map[channel];
  return (
    <span
      className="text-xs font-600 px-2 py-0.5 rounded-full"
      style={{ color: c.color, background: c.bg }}
    >
      {c.label}
    </span>
  );
};

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className="relative w-10 h-5 rounded-full transition-all duration-200 shrink-0"
    style={{ background: enabled ? 'linear-gradient(90deg, #c9a84c, #e8b84b)' : '#1e2235' }}
  >
    <span
      className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
      style={{
        background: enabled ? '#0d0f14' : '#3a3f55',
        left: enabled ? '22px' : '2px',
      }}
    />
  </button>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AlertsConfigurationContent() {
  const [activeTab, setActiveTab] = useState<'rules' | 'templates' | 'timing'>('rules');
  const [renewalRules, setRenewalRules] = useState<RenewalRule[]>(INITIAL_RENEWAL_RULES);
  const [overdueRules, setOverdueRules] = useState<OverdueRule[]>(INITIAL_OVERDUE_RULES);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>(INITIAL_SMS_TEMPLATES);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(INITIAL_EMAIL_TEMPLATES);
  const [timing, setTiming] = useState<NotificationTiming>(INITIAL_TIMING);
  const [editingSms, setEditingSms] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // ── Renewal rule helpers ──
  const toggleRenewalRule = (id: string) =>
    setRenewalRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));

  const updateRenewalRule = (id: string, field: keyof RenewalRule, value: any) =>
    setRenewalRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const addRenewalRule = () =>
    setRenewalRules((prev) => [
      ...prev,
      { id: `r${Date.now()}`, name: 'New Rule', triggerDaysBefore: 3, channel: 'sms', enabled: false },
    ]);

  const removeRenewalRule = (id: string) => setRenewalRules((prev) => prev.filter((r) => r.id !== id));

  // ── Overdue rule helpers ──
  const toggleOverdueRule = (id: string) =>
    setOverdueRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));

  const updateOverdueRule = (id: string, field: keyof OverdueRule, value: any) =>
    setOverdueRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const addOverdueRule = () =>
    setOverdueRules((prev) => [
      ...prev,
      { id: `o${Date.now()}`, name: 'New Rule', triggerDaysAfter: 5, channel: 'email', enabled: false },
    ]);

  const removeOverdueRule = (id: string) => setOverdueRules((prev) => prev.filter((r) => r.id !== id));

  // ── Save ──
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const inputCls =
    'w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all';
  const inputStyle = {
    background: '#0d0f14',
    border: '1px solid #1e2235',
    color: '#f0f2f8',
  };

  const TABS = [
    { id: 'rules', label: 'Reminder Rules', icon: 'BellAlertIcon' },
    { id: 'templates', label: 'Message Templates', icon: 'DocumentTextIcon' },
    { id: 'timing', label: 'Notification Timing', icon: 'ClockIcon' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-700" style={{ color: '#f0f2f8' }}>Alerts Configuration</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7494' }}>
            Configure renewal reminders, overdue balance alerts, message templates, and delivery timing
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-600 transition-all duration-200"
          style={{
            background: saved
              ? 'rgba(34,197,94,0.15)'
              : 'linear-gradient(135deg, #c9a84c, #e8b84b)',
            color: saved ? '#22c55e' : '#0d0f14',
            border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
          }}
        >
          <Icon name={saved ? 'CheckIcon' : 'CloudArrowUpIcon'} size={16} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: '#0d0f14', border: '1px solid #1a1d2e' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all duration-200"
            style={
              activeTab === tab.id
                ? { background: 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.08))', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)' }
                : { color: '#6b7494' }
            }
          >
            <Icon name={tab.icon as any} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: RULES ── */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Renewal Reminder Rules */}
          <div
            className="rounded-xl p-6"
            style={{ background: '#111318', border: '1px solid #1a1d2e' }}
          >
            <SectionHeader
              icon="ArrowPathIcon"
              title="Renewal Reminder Rules"
              subtitle="Trigger alerts before membership expiry date"
            />
            <div className="space-y-3">
              {renewalRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg p-4 space-y-3"
                  style={{
                    background: rule.enabled ? 'rgba(201,168,76,0.04)' : '#0d0f14',
                    border: `1px solid ${rule.enabled ? 'rgba(201,168,76,0.15)' : '#1e2235'}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={rule.name}
                      onChange={(e) => updateRenewalRule(rule.id, 'name', e.target.value)}
                      className={inputCls}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <Toggle enabled={rule.enabled} onChange={() => toggleRenewalRule(rule.id)} />
                    <button
                      onClick={() => removeRenewalRule(rule.id)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: '#3a3f55' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#f43f5e')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#3a3f55')}
                    >
                      <Icon name="TrashIcon" size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-600 mb-1" style={{ color: '#6b7494' }}>Days Before Expiry</label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={rule.triggerDaysBefore}
                        onChange={(e) => updateRenewalRule(rule.id, 'triggerDaysBefore', Number(e.target.value))}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-600 mb-1" style={{ color: '#6b7494' }}>Channel</label>
                      <select
                        value={rule.channel}
                        onChange={(e) => updateRenewalRule(rule.id, 'channel', e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      >
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                        <option value="both">SMS + Email</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={rule.channel} />
                    <span className="text-xs" style={{ color: '#6b7494' }}>
                      Sends {rule.triggerDaysBefore} day{rule.triggerDaysBefore !== 1 ? 's' : ''} before expiry
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addRenewalRule}
              className="mt-4 flex items-center gap-2 w-full justify-center py-2.5 rounded-lg text-sm font-600 transition-all duration-200"
              style={{ border: '1px dashed #2a2f45', color: '#6b7494' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#c9a84c'; (e.currentTarget as HTMLButtonElement).style.color = '#c9a84c'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2f45'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7494'; }}
            >
              <Icon name="PlusIcon" size={15} />
              Add Renewal Rule
            </button>
          </div>

          {/* Overdue Balance Rules */}
          <div
            className="rounded-xl p-6"
            style={{ background: '#111318', border: '1px solid #1a1d2e' }}
          >
            <SectionHeader
              icon="ExclamationTriangleIcon"
              title="Overdue Balance Rules"
              subtitle="Trigger alerts after payment due date passes"
            />
            <div className="space-y-3">
              {overdueRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg p-4 space-y-3"
                  style={{
                    background: rule.enabled ? 'rgba(244,63,94,0.04)' : '#0d0f14',
                    border: `1px solid ${rule.enabled ? 'rgba(244,63,94,0.18)' : '#1e2235'}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={rule.name}
                      onChange={(e) => updateOverdueRule(rule.id, 'name', e.target.value)}
                      className={inputCls}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <Toggle enabled={rule.enabled} onChange={() => toggleOverdueRule(rule.id)} />
                    <button
                      onClick={() => removeOverdueRule(rule.id)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: '#3a3f55' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#f43f5e')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#3a3f55')}
                    >
                      <Icon name="TrashIcon" size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-600 mb-1" style={{ color: '#6b7494' }}>Days After Due Date</label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={rule.triggerDaysAfter}
                        onChange={(e) => updateOverdueRule(rule.id, 'triggerDaysAfter', Number(e.target.value))}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-600 mb-1" style={{ color: '#6b7494' }}>Channel</label>
                      <select
                        value={rule.channel}
                        onChange={(e) => updateOverdueRule(rule.id, 'channel', e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                      >
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                        <option value="both">SMS + Email</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={rule.channel} />
                    <span className="text-xs" style={{ color: '#6b7494' }}>
                      Sends {rule.triggerDaysAfter} day{rule.triggerDaysAfter !== 1 ? 's' : ''} after due date
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addOverdueRule}
              className="mt-4 flex items-center gap-2 w-full justify-center py-2.5 rounded-lg text-sm font-600 transition-all duration-200"
              style={{ border: '1px dashed #2a2f45', color: '#6b7494' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#f43f5e'; (e.currentTarget as HTMLButtonElement).style.color = '#f43f5e'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2f45'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7494'; }}
            >
              <Icon name="PlusIcon" size={15} />
              Add Overdue Rule
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: TEMPLATES ── */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Variable Reference */}
          <div
            className="rounded-xl p-4 flex flex-wrap gap-3 items-center"
            style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}
          >
            <div className="flex items-center gap-2">
              <Icon name="InformationCircleIcon" size={15} style={{ color: '#c9a84c' }} />
              <span className="text-xs font-600" style={{ color: '#c9a84c' }}>Available Variables:</span>
            </div>
            {['{{name}}', '{{expiry_date}}', '{{amount}}', '{{branch}}', '{{phone}}', '{{package}}'].map((v) => (
              <code
                key={v}
                className="text-xs px-2 py-0.5 rounded font-700"
                style={{ background: 'rgba(201,168,76,0.12)', color: '#e8b84b' }}
              >
                {v}
              </code>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* SMS Templates */}
            <div
              className="rounded-xl p-6"
              style={{ background: '#111318', border: '1px solid #1a1d2e' }}
            >
              <SectionHeader
                icon="DevicePhoneMobileIcon"
                title="SMS Templates"
                subtitle="Short message templates for mobile delivery"
              />
              <div className="space-y-4">
                {smsTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="rounded-lg p-4 space-y-3"
                    style={{ background: '#0d0f14', border: '1px solid #1e2235' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {editingSms === tpl.id ? (
                          <input
                            type="text"
                            value={tpl.name}
                            onChange={(e) =>
                              setSmsTemplates((prev) =>
                                prev.map((t) => (t.id === tpl.id ? { ...t, name: e.target.value } : t))
                              )
                            }
                            className={inputCls}
                            style={inputStyle}
                          />
                        ) : (
                          <span className="text-sm font-600 truncate" style={{ color: '#f0f2f8' }}>{tpl.name}</span>
                        )}
                        <span
                          className="text-xs font-600 px-2 py-0.5 rounded-full shrink-0"
                          style={
                            tpl.type === 'renewal'
                              ? { background: 'rgba(201,168,76,0.1)', color: '#c9a84c' }
                              : { background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }
                          }
                        >
                          {tpl.type === 'renewal' ? 'Renewal' : 'Overdue'}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingSms(editingSms === tpl.id ? null : tpl.id)}
                        className="p-1.5 rounded-lg transition-colors shrink-0"
                        style={{ color: editingSms === tpl.id ? '#c9a84c' : '#6b7494' }}
                      >
                        <Icon name={editingSms === tpl.id ? 'CheckIcon' : 'PencilSquareIcon'} size={14} />
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={tpl.body}
                      readOnly={editingSms !== tpl.id}
                      onChange={(e) =>
                        setSmsTemplates((prev) =>
                          prev.map((t) => (t.id === tpl.id ? { ...t, body: e.target.value } : t))
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 transition-all"
                      style={{
                        ...inputStyle,
                        opacity: editingSms !== tpl.id ? 0.7 : 1,
                        cursor: editingSms !== tpl.id ? 'default' : 'text',
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: '#3a3f55' }}>
                        {tpl.body.length} chars
                      </span>
                      {tpl.body.length > 160 && (
                        <span className="text-xs" style={{ color: '#f59e0b' }}>
                          ⚠ Multi-part SMS ({Math.ceil(tpl.body.length / 153)} parts)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Templates */}
            <div
              className="rounded-xl p-6"
              style={{ background: '#111318', border: '1px solid #1a1d2e' }}
            >
              <SectionHeader
                icon="EnvelopeIcon"
                title="Email Templates"
                subtitle="Rich email templates for inbox delivery"
              />
              <div className="space-y-4">
                {emailTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="rounded-lg p-4 space-y-3"
                    style={{ background: '#0d0f14', border: '1px solid #1e2235' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {editingEmail === tpl.id ? (
                          <input
                            type="text"
                            value={tpl.name}
                            onChange={(e) =>
                              setEmailTemplates((prev) =>
                                prev.map((t) => (t.id === tpl.id ? { ...t, name: e.target.value } : t))
                              )
                            }
                            className={inputCls}
                            style={inputStyle}
                          />
                        ) : (
                          <span className="text-sm font-600 truncate" style={{ color: '#f0f2f8' }}>{tpl.name}</span>
                        )}
                        <span
                          className="text-xs font-600 px-2 py-0.5 rounded-full shrink-0"
                          style={
                            tpl.type === 'renewal'
                              ? { background: 'rgba(201,168,76,0.1)', color: '#c9a84c' }
                              : { background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }
                          }
                        >
                          {tpl.type === 'renewal' ? 'Renewal' : 'Overdue'}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingEmail(editingEmail === tpl.id ? null : tpl.id)}
                        className="p-1.5 rounded-lg transition-colors shrink-0"
                        style={{ color: editingEmail === tpl.id ? '#c9a84c' : '#6b7494' }}
                      >
                        <Icon name={editingEmail === tpl.id ? 'CheckIcon' : 'PencilSquareIcon'} size={14} />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-600 mb-1" style={{ color: '#6b7494' }}>Subject Line</label>
                      <input
                        type="text"
                        value={tpl.subject}
                        readOnly={editingEmail !== tpl.id}
                        onChange={(e) =>
                          setEmailTemplates((prev) =>
                            prev.map((t) => (t.id === tpl.id ? { ...t, subject: e.target.value } : t))
                          )
                        }
                        className={inputCls}
                        style={{
                          ...inputStyle,
                          opacity: editingEmail !== tpl.id ? 0.7 : 1,
                          cursor: editingEmail !== tpl.id ? 'default' : 'text',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-600 mb-1" style={{ color: '#6b7494' }}>Body</label>
                      <textarea
                        rows={5}
                        value={tpl.body}
                        readOnly={editingEmail !== tpl.id}
                        onChange={(e) =>
                          setEmailTemplates((prev) =>
                            prev.map((t) => (t.id === tpl.id ? { ...t, body: e.target.value } : t))
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 transition-all"
                        style={{
                          ...inputStyle,
                          opacity: editingEmail !== tpl.id ? 0.7 : 1,
                          cursor: editingEmail !== tpl.id ? 'default' : 'text',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: TIMING ── */}
      {activeTab === 'timing' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Delivery Schedule */}
          <div
            className="rounded-xl p-6 space-y-5"
            style={{ background: '#111318', border: '1px solid #1a1d2e' }}
          >
            <SectionHeader
              icon="CalendarDaysIcon"
              title="Delivery Schedule"
              subtitle="When notifications are sent each day"
            />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: '#8892aa' }}>Daily Send Time</label>
                <input
                  type="time"
                  value={timing.sendTime}
                  onChange={(e) => setTiming((t) => ({ ...t, sendTime: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                />
                <p className="text-xs mt-1" style={{ color: '#3a3f55' }}>All scheduled notifications will be dispatched at this time</p>
              </div>
              <div>
                <label className="block text-sm font-600 mb-1.5" style={{ color: '#8892aa' }}>Timezone</label>
                <select
                  value={timing.timezone}
                  onChange={(e) => setTiming((t) => ({ ...t, timezone: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="Africa/Cairo">Africa/Cairo (GMT+2/+3)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                  <option value="Europe/London">Europe/London (GMT+0/+1)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            <div
              className="rounded-lg p-4"
              style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.12)' }}
            >
              <p className="text-xs font-700 mb-2" style={{ color: '#c9a84c' }}>Schedule Preview</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Renewal (14 days before)', time: timing.sendTime, channel: 'Email' },
                  { label: 'Renewal (7 days before)', time: timing.sendTime, channel: 'SMS + Email' },
                  { label: 'Overdue (3 days after)', time: timing.sendTime, channel: 'SMS' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span style={{ color: '#6b7494' }}>{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-600" style={{ color: '#f0f2f8' }}>{item.time}</span>
                      <span style={{ color: '#3a3f55' }}>·</span>
                      <span style={{ color: '#c9a84c' }}>{item.channel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Batch & Retry Settings */}
          <div
            className="rounded-xl p-6 space-y-5"
            style={{ background: '#111318', border: '1px solid #1a1d2e' }}
          >
            <SectionHeader
              icon="AdjustmentsHorizontalIcon"
              title="Batch & Retry Settings"
              subtitle="Control delivery rate and failure handling"
            />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-600 mb-1.5" style={{ color: '#8892aa' }}>Batch Size</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={timing.batchSize}
                    onChange={(e) => setTiming((t) => ({ ...t, batchSize: Number(e.target.value) }))}
                    className={inputCls}
                    style={inputStyle}
                  />
                  <p className="text-xs mt-1" style={{ color: '#3a3f55' }}>Messages per batch</p>
                </div>
                <div>
                  <label className="block text-sm font-600 mb-1.5" style={{ color: '#8892aa' }}>Delay Between Batches</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={timing.delayBetweenBatches}
                      onChange={(e) => setTiming((t) => ({ ...t, delayBetweenBatches: Number(e.target.value) }))}
                      className={inputCls}
                      style={inputStyle}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#3a3f55' }}>min</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-600 mb-1.5" style={{ color: '#8892aa' }}>Max Retries</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={timing.maxRetries}
                    onChange={(e) => setTiming((t) => ({ ...t, maxRetries: Number(e.target.value) }))}
                    className={inputCls}
                    style={inputStyle}
                  />
                  <p className="text-xs mt-1" style={{ color: '#3a3f55' }}>On delivery failure</p>
                </div>
                <div>
                  <label className="block text-sm font-600 mb-1.5" style={{ color: '#8892aa' }}>Retry Interval</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={timing.retryIntervalHours}
                      onChange={(e) => setTiming((t) => ({ ...t, retryIntervalHours: Number(e.target.value) }))}
                      className={inputCls}
                      style={inputStyle}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#3a3f55' }}>hrs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { label: 'Active Rules', value: renewalRules.filter((r) => r.enabled).length + overdueRules.filter((r) => r.enabled).length, color: '#c9a84c' },
                { label: 'SMS Templates', value: smsTemplates.length, color: '#22c55e' },
                { label: 'Email Templates', value: emailTemplates.length, color: '#60a5fa' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg p-3 text-center"
                  style={{ background: '#0d0f14', border: '1px solid #1e2235' }}
                >
                  <p className="text-xl font-700" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7494' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
