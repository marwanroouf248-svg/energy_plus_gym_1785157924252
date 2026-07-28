'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const DAILY_REVENUE: { day: string; revenue: number; subscribers: number }[] = [];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="font-600 text-foreground mb-1">{label}</p>
        <p className="text-muted-foreground">
          Revenue: <span className="font-600 text-foreground tabular-nums">EGP {payload[0]?.value?.toLocaleString()}</span>
        </p>
        <p className="text-muted-foreground">
          New subs: <span className="font-600 text-foreground tabular-nums">{payload[1]?.value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function DailyRevenueChart() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-600 text-foreground">Daily Revenue</h3>
          <p className="text-xs text-muted-foreground mt-0.5">EGP collected per day</p>
        </div>
        <span className="text-xs bg-muted text-muted-foreground rounded-lg px-2.5 py-1.5 font-500">This Month</span>
      </div>
      {DAILY_REVENUE.length === 0 ? (
        <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
          No revenue data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={DAILY_REVENUE} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--primary)' }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}