'use client';

import React from 'react';
import Icon from '@/components/ui/AppIcon';

interface BulkActionBarProps {
  count: number;
  onDelete: () => void;
  onClear: () => void;
}

export default function BulkActionBar({ count, onDelete, onClear }: BulkActionBarProps) {
  return (
    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 slide-up">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-700 tabular-nums">{count}</span>
        </div>
        <span className="text-sm font-500 text-foreground">
          {count} subscriber{count !== 1 ? 's' : ''} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-xs font-500 text-muted-foreground hover:text-foreground hover:border-border/80 transition-all duration-150"
        >
          <Icon name="ChatBubbleLeftEllipsisIcon" size={13} />
          Send Renewal Blast
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-2 bg-negative-bg border border-negative/20 rounded-lg text-xs font-600 text-negative hover:bg-negative hover:text-white transition-all duration-150"
        >
          <Icon name="TrashIcon" size={13} />
          Delete Selected
        </button>
        <button
          onClick={onClear}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-150"
          aria-label="Clear selection"
        >
          <Icon name="XMarkIcon" size={15} />
        </button>
      </div>
    </div>
  );
}