'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormData { identifier: string; password?: string; }
const employeeEmail = (code: string) => `${code.trim().toLowerCase()}@employee.energyplus.local`;

export default function LoginForm({ mode = 'employee' }: { mode?: 'employee' | 'manager' }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signIn, signOut, getUserProfile } = useAuth();
  const form = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const code = data.identifier.trim().toUpperCase();
      const email = mode === 'employee' ? employeeEmail(code) : `${code.toLowerCase()}@manager.energyplus.local`;
      const authData = await signIn(email, data.password || code);
      const profile = await getUserProfile(authData?.user?.id);
      if (!profile) throw new Error('Manager profile was not found. Please contact the manager.');
      if (profile.is_active === false) { await signOut(); throw new Error('This account is inactive. Please contact the manager.'); }
      if (mode === 'manager' && !['admin','super_admin','administrator','branch_manager'].includes(profile.role)) {
        await signOut(); throw new Error('This account does not have manager access.');
      }
      toast.success(mode === 'employee' ? 'Employee login successful' : 'Manager login successful');
      router.push('/');
    } catch (error: any) {
      form.setError('identifier', { type: 'manual', message: error?.message || 'Invalid credentials. Please try again.' });
    } finally { setIsLoading(false); }
  };

  return <div className="w-full max-w-md">
    <div className="mb-8">
      <h2 className="text-2xl font-700" style={{color:'#f0f2f8'}}>{mode === 'employee' ? 'Employee Login' : 'Manager Login'}</h2>
      <p className="text-sm mt-1.5" style={{color:'#6b7494'}}>{mode === 'employee' ? 'Enter your employee code and PIN.' : 'Enter the fixed manager access code. No password required.'}</p>
    </div>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label className="block text-sm font-500 mb-1.5" style={{color:'#8892aa'}}>{mode === 'employee' ? 'Employee Code' : 'Manager Code'}</label>
        <input type="text" autoComplete="username" placeholder={mode === 'employee' ? 'EP-1027' : 'MARWAN-ADMIN'} {...form.register('identifier',{required:'Code is required',pattern:{value:/^[A-Za-z0-9_-]{4,20}$/,message:'Invalid code'}})} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={{background:'#161921',border:`1px solid ${form.formState.errors.identifier?'#f43f5e':'#1f2335'}`,color:'#f0f2f8'}} />
        {form.formState.errors.identifier && <p className="text-xs mt-1.5" style={{color:'#f43f5e'}}><Icon name="ExclamationCircleIcon" size={12}/> {form.formState.errors.identifier.message}</p>}
      </div>
      {mode === 'employee' && <div>
        <label className="block text-sm font-500 mb-1.5" style={{color:'#8892aa'}}>PIN</label>
        <input type="password" inputMode="numeric" autoComplete="current-password" placeholder="6-8 digit PIN" {...form.register('password',{required:'PIN is required',minLength:{value:6,message:'PIN must be at least 6 digits'},maxLength:{value:8,message:'PIN must be at most 8 digits'},pattern:{value:/^\d+$/,message:'PIN must contain digits only'}})} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={{background:'#161921',border:`1px solid ${form.formState.errors.password?'#f43f5e':'#1f2335'}`,color:'#f0f2f8'}} />
        {form.formState.errors.password && <p className="text-xs mt-1.5" style={{color:'#f43f5e'}}>{form.formState.errors.password.message}</p>}
      </div>}
      <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-700 disabled:opacity-70" style={{background:'linear-gradient(135deg,#c9a84c,#e8b84b)',color:'#0d0f14'}}>
        {isLoading ? <><Icon name="ArrowPathIcon" size={16} className="animate-spin"/>Signing in...</> : <><Icon name="ArrowRightOnRectangleIcon" size={16}/>Sign In</>}
      </button>
      <div className="flex justify-center gap-4 text-xs" style={{color:'#6b7494'}}>
        {mode === 'employee' ? <a href="/manager-login" className="hover:underline">Manager Login</a> : <a href="/employee-login" className="hover:underline">Employee Login</a>}
      </div>
    </form>
  </div>;
}
