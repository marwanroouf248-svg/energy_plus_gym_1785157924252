'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Icon from '@/components/ui/AppIcon';
import { Subscriber, PackageType } from './SubscriberManagementContent';
import { toast } from 'sonner';

interface FormData {
  name: string;
  phone: string;
  package: PackageType;
  branch: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  amountPaid: number;
  assignedTo: string;
  notes: string;
}

const PACKAGE_PRICES: Record<PackageType, number> = {
  Monthly: 350,
  Quarterly: 950,
  '6-Month': 1800,
  Annual: 3200,
  Student: 200,
};

const PACKAGE_DURATIONS: Record<PackageType, number> = {
  Monthly: 30,
  Quarterly: 90,
  '6-Month': 180,
  Annual: 365,
  Student: 30,
};

const BRANCHES = ['فرع فودافون', 'فرع الرخاوي'];
const STAFF = ['Nour Ibrahim', 'Khaled Omar', 'Ahmed Hassan', 'Sara Khalil', 'Mostafa Amin'];

interface Props {
  onSuccess: (sub: Subscriber) => void;
  onCancel: () => void;
}

export default function SubscriberRegistrationForm({ onSuccess, onCancel }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      package: 'Monthly',
      branch: 'فرع فودافون',
      assignedTo: '',
      totalAmount: 350,
      amountPaid: 0,
      startDate: '2026-07-26',
    },
  });

  const watchedPackage = watch('package') as PackageType;
  const watchedStartDate = watch('startDate');
  const watchedTotal = watch('totalAmount');
  const watchedPaid = watch('amountPaid');
  const remaining = Math.max(0, (Number(watchedTotal) || 0) - (Number(watchedPaid) || 0));

  const handlePackageChange = (pkg: PackageType) => {
    setValue('package', pkg);
    setValue('totalAmount', PACKAGE_PRICES[pkg]);
    if (watchedStartDate) {
      const start = new Date(watchedStartDate);
      start.setDate(start.getDate() + PACKAGE_DURATIONS[pkg]);
      setValue('endDate', start.toISOString().split('T')[0]);
    }
  };

  // Backend integration point: replace with POST /api/subscribers
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 1000));

    const subCount = 13 + Math.floor(Math.random() * 900);
    const newSub: Subscriber = {
      id: `sub-${String(subCount).padStart(3, '0')}`,
      name: data.name,
      phone: data.phone,
      package: data.package,
      branch: data.branch,
      startDate: data.startDate.split('-').reverse().join('/'),
      endDate: data.endDate ? data.endDate.split('-').reverse().join('/') : '',
      amountPaid: Number(data.amountPaid),
      totalAmount: Number(data.totalAmount),
      remainingBalance: remaining,
      status: 'active',
      paymentStatus: remaining === 0 ? 'paid' : Number(data.amountPaid) === 0 ? 'overdue' : 'partial',
      assignedTo: data.assignedTo,
    };

    setIsLoading(false);
    toast.success(`${data.name} registered successfully!`);
    onSuccess(newSub);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6" noValidate>
      {/* Personal Info */}
      <div>
        <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
          <Icon name="UserIcon" size={15} className="text-primary" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reg-name" className="block text-sm font-500 text-foreground mb-1.5">
              Full Name <span className="text-negative">*</span>
            </label>
            <input
              id="reg-name"
              type="text"
              placeholder="e.g. Layla Mostafa"
              {...register('name', { required: 'Full name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150 ${errors.name ? 'border-negative' : 'border-input hover:border-muted-foreground'}`}
            />
            {errors.name && <p className="text-xs text-negative mt-1 flex items-center gap-1"><Icon name="ExclamationCircleIcon" size={11} />{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-phone" className="block text-sm font-500 text-foreground mb-1.5">
              Phone Number <span className="text-negative">*</span>
            </label>
            <input
              id="reg-phone"
              type="tel"
              placeholder="e.g. 01012345678"
              {...register('phone', {
                required: 'Phone number is required',
                pattern: { value: /^01[0-9]{9}$/, message: 'Enter a valid Egyptian mobile number (01xxxxxxxxx)' },
              })}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150 ${errors.phone ? 'border-negative' : 'border-input hover:border-muted-foreground'}`}
            />
            {errors.phone && <p className="text-xs text-negative mt-1 flex items-center gap-1"><Icon name="ExclamationCircleIcon" size={11} />{errors.phone.message}</p>}
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Subscription Details */}
      <div>
        <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
          <Icon name="TagIcon" size={15} className="text-primary" />
          Subscription Package
        </h3>

        {/* Package Selector */}
        <div className="mb-4">
          <label className="block text-sm font-500 text-foreground mb-2">
            Package <span className="text-negative">*</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(Object.keys(PACKAGE_PRICES) as PackageType[]).map((pkg) => (
              <button
                key={`pkg-sel-${pkg}`}
                type="button"
                onClick={() => handlePackageChange(pkg)}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl border text-xs font-500 transition-all duration-150 ${
                  watchedPackage === pkg
                    ? 'bg-primary/10 border-primary text-primary' :'bg-background border-input text-muted-foreground hover:border-muted-foreground'
                }`}
              >
                <span>{pkg}</span>
                <span className="text-xs tabular-nums mt-0.5 font-600">EGP {PACKAGE_PRICES[pkg]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reg-start" className="block text-sm font-500 text-foreground mb-1.5">
              Start Date <span className="text-negative">*</span>
            </label>
            <input
              id="reg-start"
              type="date"
              {...register('startDate', { required: 'Start date is required' })}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150 ${errors.startDate ? 'border-negative' : 'border-input hover:border-muted-foreground'}`}
            />
            {errors.startDate && <p className="text-xs text-negative mt-1 flex items-center gap-1"><Icon name="ExclamationCircleIcon" size={11} />{errors.startDate.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-end" className="block text-sm font-500 text-foreground mb-1.5">
              End Date
            </label>
            <p className="text-xs text-muted-foreground mb-1.5">Auto-calculated from package. Override if needed.</p>
            <input
              id="reg-end"
              type="date"
              {...register('endDate')}
              className="w-full px-3 py-2.5 rounded-xl border border-input text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring hover:border-muted-foreground transition-all duration-150"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Payment */}
      <div>
        <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
          <Icon name="BanknotesIcon" size={15} className="text-primary" />
          Payment Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="reg-total" className="block text-sm font-500 text-foreground mb-1.5">
              Total Amount (EGP) <span className="text-negative">*</span>
            </label>
            <input
              id="reg-total"
              type="number"
              min={0}
              {...register('totalAmount', { required: 'Total amount is required', min: { value: 1, message: 'Amount must be greater than 0' } })}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-background text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150 ${errors.totalAmount ? 'border-negative' : 'border-input hover:border-muted-foreground'}`}
            />
            {errors.totalAmount && <p className="text-xs text-negative mt-1 flex items-center gap-1"><Icon name="ExclamationCircleIcon" size={11} />{errors.totalAmount.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-paid" className="block text-sm font-500 text-foreground mb-1.5">
              Amount Paid (EGP) <span className="text-negative">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-1.5">Enter 0 if payment pending</p>
            <input
              id="reg-paid"
              type="number"
              min={0}
              {...register('amountPaid', {
                required: 'Amount paid is required',
                validate: (v) => Number(v) <= Number(watchedTotal) || 'Cannot exceed total amount',
              })}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-background text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-150 ${errors.amountPaid ? 'border-negative' : 'border-input hover:border-muted-foreground'}`}
            />
            {errors.amountPaid && <p className="text-xs text-negative mt-1 flex items-center gap-1"><Icon name="ExclamationCircleIcon" size={11} />{errors.amountPaid.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-500 text-foreground mb-1.5">Remaining Balance (EGP)</label>
            <p className="text-xs text-muted-foreground mb-1.5">Calculated automatically</p>
            <div className={`w-full px-3 py-2.5 rounded-xl border text-sm tabular-nums font-600 ${remaining > 0 ? 'bg-negative-bg border-negative/20 text-negative' : 'bg-positive-bg border-positive/20 text-positive'}`}>
              {remaining.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Assignment */}
      <div>
        <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
          <Icon name="BuildingOfficeIcon" size={15} className="text-primary" />
          Branch & Assignment
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reg-branch" className="block text-sm font-500 text-foreground mb-1.5">
              Branch <span className="text-negative">*</span>
            </label>
            <select
              id="reg-branch"
              {...register('branch', { required: 'Branch is required' })}
              className="w-full px-3 py-2.5 rounded-xl border border-input text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring hover:border-muted-foreground transition-all duration-150"
            >
              {BRANCHES.map((b) => (
                <option key={`branch-opt-${b}`} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reg-staff" className="block text-sm font-500 text-foreground mb-1.5">
              Assigned Staff <span className="text-negative">*</span>
            </label>
            <select
              id="reg-staff"
              {...register('assignedTo', { required: 'Assigned staff is required' })}
              className="w-full px-3 py-2.5 rounded-xl border border-input text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring hover:border-muted-foreground transition-all duration-150"
            >
              {STAFF.map((s) => (
                <option key={`staff-opt-${s}`} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="reg-notes" className="block text-sm font-500 text-foreground mb-1.5">
          Notes
        </label>
        <p className="text-xs text-muted-foreground mb-1.5">Any special requests, health conditions, or follow-up reminders</p>
        <textarea
          id="reg-notes"
          rows={3}
          placeholder="e.g. Referred by member sub-005. Interested in personal training..."
          {...register('notes')}
          className="w-full px-3 py-2.5 rounded-xl border border-input text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring hover:border-muted-foreground transition-all duration-150 resize-none"
        />
      </div>

      {/* Required fields legend */}
      <p className="text-xs text-muted-foreground">
        Fields marked <span className="text-negative font-600">*</span> are required
      </p>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border sticky bottom-0 bg-card py-4 -mx-6 px-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-muted text-foreground rounded-xl text-sm font-500 hover:bg-border transition-all duration-150"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150"
        >
          {isLoading ? (
            <>
              <Icon name="ArrowPathIcon" size={15} className="animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <Icon name="UserPlusIcon" size={15} />
              Register Subscriber
            </>
          )}
        </button>
      </div>
    </form>
  );
}