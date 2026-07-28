'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const MONTHLY_DATA: { month: string; count: number }[] = [];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="font-600 text-foreground mb-1">{label}</p>
        <p className="text-muted-foreground">
          New subscribers: <span className="font-600 text-foreground tabular-nums">{payload[0]?.value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function MonthlySubscribersChart() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-600 text-foreground">Monthly Subscribers</h3>
          <p className="text-xs text-muted-foreground mt-0.5">New sign-ups per month</p>
        </div>
      </div>
      {MONTHLY_DATA.length === 0 ? (
        <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
          No subscriber data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MONTHLY_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -15 }} barSize={28}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', radius: 6 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {MONTHLY_DATA.map((entry, index) => (
                <Cell
                  key={`bar-month-${entry.month}`}
                  fill={index === MONTHLY_DATA.length - 1 ? 'var(--accent)' : 'var(--primary)'}
                  opacity={index === MONTHLY_DATA.length - 1 ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}