'use client';

import React from 'react';
import Icon from '@/components/ui/AppIcon';
import { PackageType } from './SubscriberManagementContent';

interface SubscriberFiltersProps {
  search: string;
  onSearch: (v: string) => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
  packageFilter: string;
  onPackageFilter: (v: string) => void;
  packages: PackageType[];
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'frozen', label: 'Frozen' },
];

export default function SubscriberFilters({
  search, onSearch, statusFilter, onStatusFilter, packageFilter, onPackageFilter, packages,
}: SubscriberFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-sm focus-within:border-primary transition-colors duration-150">
        <Icon name="MagnifyingGlassIcon" size={15} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name, phone, or ID..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {search && (
          <button onClick={() => onSearch('')} className="text-muted-foreground hover:text-foreground transition-colors duration-150">
            <Icon name="XMarkIcon" size={14} />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={`status-filter-${opt.value}`}
            onClick={() => onStatusFilter(opt.value)}
            className={`px-3 py-2 rounded-xl text-xs font-500 transition-all duration-150 whitespace-nowrap ${
              statusFilter === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Package Filter */}
      <select
        value={packageFilter}
        onChange={(e) => onPackageFilter(e.target.value)}
        className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring hover:border-primary/50 transition-colors duration-150"
      >
        <option value="all">All Packages</option>
        {packages.map((p) => (
          <option key={`pkg-filter-${p}`} value={p}>{p}</option>
        ))}
      </select>

      {/* Export */}
      <button className="flex items-center gap-2 px-3 py-2.5 bg-card border border-border rounded-xl text-sm font-500 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all duration-150 ml-auto">
        <Icon name="ArrowDownTrayIcon" size={14} />
        Export CSV
      </button>
    </div>
  );
}