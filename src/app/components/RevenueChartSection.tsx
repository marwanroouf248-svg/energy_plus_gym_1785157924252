import React from 'react';
import DailyRevenueChart from './DailyRevenueChart';
import MonthlySubscribersChart from './MonthlySubscribersChart';

export default function RevenueChartSection() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3">
        <DailyRevenueChart />
      </div>
      <div className="xl:col-span-2">
        <MonthlySubscribersChart />
      </div>
    </div>
  );
}