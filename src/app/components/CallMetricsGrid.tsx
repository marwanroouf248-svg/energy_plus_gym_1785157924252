import React from 'react';
import MetricCard from './MetricCard';

export default function CallMetricsGrid() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-600 text-foreground">Team Call Effectiveness</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Today</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Call Volume"
          value="0"
          unit="calls"
          trend={{ direction: 'up', value: 'No data yet' }}
          icon="PhoneIcon"
          variant="neutral"
          detail="Daily target: —"
          progressValue={0}
        />

        <MetricCard
          label="Pickup Rate"
          value="0"
          unit="%"
          trend={{ direction: 'down', value: 'No data yet' }}
          icon="PhoneArrowUpRightIcon"
          variant="warning"
          detail="No calls recorded"
          progressValue={0}
        />

        <MetricCard
          label="Avg. Call Duration"
          value="0:00"
          unit="min"
          trend={{ direction: 'up', value: 'No data yet' }}
          icon="ClockIcon"
          variant="positive"
          detail="Total talk time: 0"
          progressValue={0}
        />

        <MetricCard
          label="Call Conversion"
          value="0"
          unit="%"
          trend={{ direction: 'up', value: 'No data yet' }}
          icon="CheckCircleIcon"
          variant="hero"
          detail="No conversions yet"
          progressValue={0}
        />
      </div>
    </div>
  );
}
