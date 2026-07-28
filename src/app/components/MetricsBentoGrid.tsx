import React from 'react';
import MetricCard from './MetricCard';

// Grid plan: 6 cards → grid-cols-3 on lg → 2 rows of 3
// Row 1: New Subscribers Today (hero, spans 1), Monthly Revenue (spans 1), Active Members (spans 1)
// Row 2: Expiring This Week (warning), Renewal Rate, Overdue Balances (alert)

export default function MetricsBentoGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
      {/* Hero: New Subscribers Today */}
      <MetricCard
        label="New Subscribers Today"
        value="0"
        unit="members"
        trend={{ direction: 'up', value: 'No data yet' }}
        icon="UserPlusIcon"
        variant="hero"
        detail="Daily target: —"
        progressValue={0}
      />

      {/* Monthly Revenue */}
      <MetricCard
        label="Monthly Revenue"
        value="0"
        unit="EGP"
        trend={{ direction: 'up', value: 'No data yet' }}
        icon="BanknotesIcon"
        variant="positive"
        detail="Target: —"
        progressValue={0}
      />

      {/* Active Members */}
      <MetricCard
        label="Active Members"
        value="0"
        unit="subscribers"
        trend={{ direction: 'up', value: 'No data yet' }}
        icon="UsersIcon"
        variant="neutral"
        detail="Branch capacity: —"
        progressValue={0}
      />

      {/* Expiring This Week — WARNING */}
      <MetricCard
        label="Expiring This Week"
        value="0"
        unit="members"
        trend={{ direction: 'down', value: 'No data yet' }}
        icon="ClockIcon"
        variant="warning"
        detail="No expiring members"
        progressValue={0}
      />

      {/* Renewal Rate */}
      <MetricCard
        label="Renewal Rate"
        value="0"
        unit="%"
        trend={{ direction: 'up', value: 'No data yet' }}
        icon="ArrowPathIcon"
        variant="positive"
        detail="Target: 80% renewal rate"
        progressValue={0}
      />

      {/* Overdue Balances — ALERT */}
      <MetricCard
        label="Overdue Balances"
        value="0"
        unit="EGP"
        trend={{ direction: 'down', value: 'No overdue balances' }}
        icon="ExclamationCircleIcon"
        variant="negative"
        detail="No outstanding debts"
        progressValue={0}
      />
    </div>
  );
}