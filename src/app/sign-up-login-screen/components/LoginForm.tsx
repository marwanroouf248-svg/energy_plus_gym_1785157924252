'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormData {
  identifier: string;
  password: string;
}

const employeeEmail = (code: string) =>
  `${code.trim().toLowerCase()}@employee.energyplus.local`;

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'employee' | 'manager'>('employee');
  const router = useRouter();
  const { signIn, signOut, getUserProfile } = useAuth();
  const form = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const identifier = data.identifier.trim();
      const email = mode === 'employee' ? employeeEmail(identifier) : identifier;
      await signIn(email, data.password);

      const profile = await getUserProfile();
      if (profile && profile.is_active === false) {
        await signOut();
        throw new Error('This account is inactive. Please contact the manager.');
      }

      toast.success(mode === 'employee' ? 'Employee login successful' : 'Manager login successful');
      router.push('/');
    } catch (error: any) {
      form.setError('identifier', {
        type: 'manual',
        message: error?.message || 'Invalid credentials. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-2 mb-8 lg:hidden">
        <img
          src="/assets/images/328A1CF7-CBED-4839-A339-01A156563B74-1785160489268.jpg"
          alt="Energy Plus Logo"
          className="w-9 h-9 rounded-xl object-cover"
        />
        <div>
          <span className="font-700 text-xl tracking-tight" style={{ color: '#f0f2f8' }}>Energy Plus</span>
          <p className="text-[10px] tracking-widest uppercase font-500" style={{ color: '#c9a84c' }}>Premium CRM</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-700" style={{ color: '#f0f2f8' }}>Energy Plus Login</h2>
        <p className="text-sm mt-1.5" style={{ color: '#6b7494' }}>
          {mode === 'employee' ? 'Use the employee code and PIN provided by your manager.' : 'Use your manager email and password.'}
        </p>
      </div>

      <div className="flex rounded-xl p-1 mb-6" style={{ background: '#161921', border: '1px solid #1f2335' }}>
        <button
          type="button"
          onClick={() => { setMode('employee'); form.reset(); }}
          className="flex-1 py-2 rounded-lg text-sm font-600"
          style={mode === 'employee' ? { background: '#1f2335', color: '#f0f2f8' } : { color: '#6b7494' }}
        >
          Employee
        </button>
        <button
          type="button"
          onClick={() => { setMode('manager'); form.reset(); }}
          className="flex-1 py-2 rounded-lg text-sm font-600"
          style={mode === 'manager' ? { background: '#1f2335', color: '#f0f2f8' } : { color: '#6b7494' }}
        >
          Manager
        </button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label className="block text-sm font-500 mb-1.5" style={{ color: '#8892aa' }}>
            {mode === 'employee' ? 'Employee Code' : 'Manager Email'}
          </label>
          <input
            type={mode === 'employee' ? 'text' : 'email'}
            autoComplete={mode === 'employee' ? 'username' : 'email'}
            placeholder={mode === 'employee' ? 'EP-1027' : 'manager@email.com'}
            {...form.register('identifier', {
              required: mode === 'employee' ? 'Employee code is required' : 'Email is required',
              pattern: mode === 'employee'
                ? { value: /^[A-Za-z0-9_-]{4,20}$/, message: 'Invalid employee code' }
                : { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
            })}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
            style={{
              background: '#161921',
              border: `1px solid ${form.formState.errors.identifier ? '#f43f5e' : '#1f2335'}`,
              color: '#f0f2f8',
            }}
          />
          {form.formState.errors.identifier && (
            <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#f43f5e' }}>
              <Icon name="ExclamationCircleIcon" size={12} />
              {form.formState.errors.identifier.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-500 mb-1.5" style={{ color: '#8892aa' }}>
            {mode === 'employee' ? 'PIN' : 'Password'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              inputMode={mode === 'employee' ? 'numeric' : undefined}
              autoComplete="current-password"
              placeholder={mode === 'employee' ? '6-8 digit PIN' : 'Enter your password'}
              {...form.register('password', {
                required: mode === 'employee' ? 'PIN is required' : 'Password is required',
                minLength: { value: mode === 'employee' ? 6 : 6, message: mode === 'employee' ? 'PIN must be at least 6 digits' : 'Password must be at least 6 characters' },
              })}
              className="w-full px-4 py-3 pr-12 rounded-xl text-sm focus:outline-none"
              style={{
                background: '#161921',
                border: `1px solid ${form.formState.errors.password ? '#f43f5e' : '#1f2335'}`,
                color: '#f0f2f8',
              }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: '#6b7494' }}>
              <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs mt-1.5" style={{ color: '#f43f5e' }}>{form.formState.errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-700 disabled:opacity-70"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8b84b)', color: '#0d0f14', boxShadow: '0 4px 16px rgba(201,168,76,0.25)' }}
        >
          {isLoading ? <><Icon name="ArrowPathIcon" size={16} className="animate-spin" />Signing in...</> : <><Icon name="ArrowRightOnRectangleIcon" size={16} />Sign In</>}
        </button>

        {mode === 'employee' && (
          <p className="text-xs text-center" style={{ color: '#6b7494' }}>
            Employee accounts are created by the manager. No email is required.
          </p>
        )}
      </form>
    </div>
  );
}
