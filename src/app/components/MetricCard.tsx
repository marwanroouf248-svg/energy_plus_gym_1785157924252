'use client';

import React from 'react';
import Icon from '@/components/ui/AppIcon';

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  trend: { direction: 'up' | 'down'; value: string };
  icon: string;
  variant: 'hero' | 'positive' | 'negative' | 'warning' | 'neutral';
  detail: string;
  progressValue: number;
}

export default function MetricCard({ label, value, unit, trend, icon, variant, detail, progressValue }: MetricCardProps) {
  const clampedProgress = Math.min(100, Math.max(0, progressValue));

  const getStyles = () => {
    switch (variant) {
      case 'hero':
        return {
          card: { background: 'linear-gradient(135deg, #1a1508 0%, #231c0a 100%)', border: '1px solid rgba(201,168,76,0.3)', boxShadow: '0 4px 24px rgba(201,168,76,0.1)' },
          iconBg: { background: 'rgba(201,168,76,0.15)', color: '#c9a84c' },
          label: { color: 'rgba(201,168,76,0.7)' },
          value: { color: '#c9a84c' },
          unit: { color: 'rgba(201,168,76,0.6)' },
          trend: { color: '#e8b84b' },
          bar: { background: '#c9a84c' },
          track: { background: 'rgba(201,168,76,0.1)' },
          detail: { color: 'rgba(201,168,76,0.5)' },
        };
      case 'positive':
        return {
          card: { background: 'linear-gradient(135deg, #13161f 0%, #161921 100%)', border: '1px solid #1f2335', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' },
          iconBg: { background: 'rgba(34,197,94,0.1)', color: '#22c55e' },
          label: { color: '#6b7494' },
          value: { color: '#f0f2f8' },
          unit: { color: '#6b7494' },
          trend: { color: '#22c55e' },
          bar: { background: '#22c55e' },
          track: { background: '#1f2335' },
          detail: { color: '#6b7494' },
        };
      case 'negative':
        return {
          card: { background: 'linear-gradient(135deg, #1a0a0d 0%, #1f0a10 100%)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' },
          iconBg: { background: 'rgba(244,63,94,0.1)', color: '#f43f5e' },
          label: { color: 'rgba(244,63,94,0.6)' },
          value: { color: '#f43f5e' },
          unit: { color: 'rgba(244,63,94,0.5)' },
          trend: { color: '#f43f5e' },
          bar: { background: '#f43f5e' },
          track: { background: 'rgba(244,63,94,0.1)' },
          detail: { color: 'rgba(244,63,94,0.5)' },
        };
      case 'warning':
        return {
          card: { background: 'linear-gradient(135deg, #1a1206 0%, #1c1408 100%)', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' },
          iconBg: { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
          label: { color: 'rgba(245,158,11,0.6)' },
          value: { color: '#f59e0b' },
          unit: { color: 'rgba(245,158,11,0.5)' },
          trend: { color: '#f59e0b' },
          bar: { background: '#f59e0b' },
          track: { background: 'rgba(245,158,11,0.1)' },
          detail: { color: 'rgba(245,158,11,0.5)' },
        };
      default:
        return {
          card: { background: 'linear-gradient(135deg, #13161f 0%, #161921 100%)', border: '1px solid #1f2335', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' },
          iconBg: { background: 'rgba(56,189,248,0.1)', color: '#38bdf8' },
          label: { color: '#6b7494' },
          value: { color: '#f0f2f8' },
          unit: { color: '#6b7494' },
          trend: { color: '#6b7494' },
          bar: { background: '#38bdf8' },
          track: { background: '#1f2335' },
          detail: { color: '#6b7494' },
        };
    }
  };

  const s = getStyles();

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 transition-all duration-200"
      style={{ ...s.card, cursor: 'default' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={s.iconBg}>
          <Icon name={icon as any} size={20} />
        </div>
        <div className="text-right">
          <p className="text-xs font-600 uppercase tracking-wider" style={{ ...s.label, letterSpacing: '0.08em' }}>{label}</p>
        </div>
      </div>

      <div>
        <div className="flex items-end gap-1.5">
          <span className="text-3xl font-700 tabular-nums leading-none" style={s.value}>{value}</span>
          <span className="text-sm font-500 mb-0.5" style={s.unit}>{unit}</span>
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <Icon
            name={trend.direction === 'up' ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon'}
            size={13}
            style={s.trend as React.CSSProperties}
          />
          <span className="text-xs font-500" style={s.trend}>{trend.value}</span>
        </div>
      </div>

      <div>
        <div className="w-full h-1.5 rounded-full" style={s.track}>
          <div
            className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${clampedProgress}%`, ...s.bar }}
          />
        </div>
        <p className="text-xs mt-1.5" style={s.detail}>{detail}</p>
      </div>
    </div>
  );
}