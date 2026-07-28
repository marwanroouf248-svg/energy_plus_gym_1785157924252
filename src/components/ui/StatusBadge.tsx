import React from 'react';

type StatusType = 'active' | 'expiring' | 'expired' | 'frozen' | 'new' | 'contacted' | 'interested' | 'converted' | 'lost' | 'paid' | 'partial' | 'overdue' | 'pending';

const STATUS_CONFIG: Record<StatusType, { label: string; className: string }> = {
  active:      { label: 'Active',         className: 'bg-positive-bg text-positive border-positive/20' },
  expiring:    { label: 'Expiring Soon',  className: 'bg-warning-bg text-warning border-warning/20' },
  expired:     { label: 'Expired',        className: 'bg-negative-bg text-negative border-negative/20' },
  frozen:      { label: 'Frozen',         className: 'bg-info-bg text-info border-info/20' },
  new:         { label: 'New',            className: 'bg-info-bg text-info border-info/20' },
  contacted:   { label: 'Contacted',      className: 'bg-warning-bg text-warning border-warning/20' },
  interested:  { label: 'Interested',     className: 'bg-positive-bg text-positive border-positive/20' },
  converted:   { label: 'Converted',      className: 'bg-positive-bg text-positive border-positive/20' },
  lost:        { label: 'Lost',           className: 'bg-negative-bg text-negative border-negative/20' },
  paid:        { label: 'Paid',           className: 'bg-positive-bg text-positive border-positive/20' },
  partial:     { label: 'Partial',        className: 'bg-warning-bg text-warning border-warning/20' },
  overdue:     { label: 'Overdue',        className: 'bg-negative-bg text-negative border-negative/20' },
  pending:     { label: 'Pending',        className: 'bg-muted text-muted-foreground border-border' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${config.className} ${className}`}>
      {config.label}
    </span>
  );
}