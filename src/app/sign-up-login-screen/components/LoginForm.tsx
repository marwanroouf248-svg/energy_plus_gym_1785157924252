'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const loginForm = useForm<LoginFormData>({ defaultValues: { remember: false } });
  const signUpForm = useForm<SignUpFormData>();

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      toast.success('Welcome back!');
      router.push('/');
    } catch (error: any) {
      loginForm.setError('email', {
        type: 'manual',
        message: error?.message || 'Invalid credentials. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignUp = async (data: SignUpFormData) => {
    if (data.password !== data.confirmPassword) {
      signUpForm.setError('confirmPassword', { type: 'manual', message: 'Passwords do not match' });
      return;
    }
    setIsLoading(true);
    try {
      await signUp(data.email, data.password, { fullName: data.fullName });
      toast.success('Account created! Welcome to Energy Plus.');
      router.push('/');
    } catch (error: any) {
      signUpForm.setError('email', {
        type: 'manual',
        message: error?.message || 'Failed to create account. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const autofill = (email: string, password: string) => {
    loginForm.setValue('email', email, { shouldValidate: true });
    loginForm.setValue('password', password, { shouldValidate: true });
  };

  return (
    <div className="w-full max-w-md">
      {/* Mobile Logo */}
      <div className="flex items-center gap-2 mb-8 lg:hidden">
        <img
          src="/assets/images/328A1CF7-CBED-4839-A339-01A156563B74-1785160489268.jpg"
          alt="Energy Plus Logo"
          className="w-9 h-9 rounded-xl object-cover"
          style={{ boxShadow: '0 0 12px rgba(201,168,76,0.3)' }}
        />
        <div>
          <span className="font-700 text-xl tracking-tight" style={{ color: '#f0f2f8' }}>Energy Plus</span>
          <p className="text-[10px] tracking-widest uppercase font-500" style={{ color: '#c9a84c' }}>Premium CRM</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-700" style={{ color: '#f0f2f8' }}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-sm mt-1.5" style={{ color: '#6b7494' }}>
          {mode === 'login' ? 'Enter your staff credentials to continue' : 'Join the Energy Plus sales team'}
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex rounded-xl p-1 mb-6" style={{ background: '#161921', border: '1px solid #1f2335' }}>
        <button
          type="button"
          onClick={() => setMode('login')}
          className="flex-1 py-2 rounded-lg text-sm font-600 transition-all duration-150"
          style={mode === 'login' ? { background: '#1f2335', color: '#f0f2f8', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' } : { color: '#6b7494' }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className="flex-1 py-2 rounded-lg text-sm font-600 transition-all duration-150"
          style={mode === 'signup' ? { background: '#1f2335', color: '#f0f2f8', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' } : { color: '#6b7494' }}
        >
          Create Account
        </button>
      </div>

      {mode === 'login' ? (
        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-500 mb-1.5" style={{ color: '#8892aa' }}>Work Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@energyplus.io"
              {...loginForm.register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
              })}
              className="w-full px-4 py-3 rounded-xl text-sm placeholder:text-opacity-40 focus:outline-none transition-all duration-150"
              style={{
                background: '#161921',
                border: `1px solid ${loginForm.formState.errors.email ? '#f43f5e' : '#1f2335'}`,
                color: '#f0f2f8',
              }}
              onFocus={(e) => { if (!loginForm.formState.errors.email) (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.4)'; }}
              onBlur={(e) => { if (!loginForm.formState.errors.email) (e.target as HTMLInputElement).style.borderColor = '#1f2335'; }}
            />
            {loginForm.formState.errors.email && (
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#f43f5e' }}>
                <Icon name="ExclamationCircleIcon" size={12} />
                {loginForm.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-500 mb-1.5" style={{ color: '#8892aa' }}>Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                {...loginForm.register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' },
                })}
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm focus:outline-none transition-all duration-150"
                style={{
                  background: '#161921',
                  border: `1px solid ${loginForm.formState.errors.password ? '#f43f5e' : '#1f2335'}`,
                  color: '#f0f2f8',
                }}
                onFocus={(e) => { if (!loginForm.formState.errors.password) (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.4)'; }}
                onBlur={(e) => { if (!loginForm.formState.errors.password) (e.target as HTMLInputElement).style.borderColor = '#1f2335'; }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150 p-1" style={{ color: '#6b7494' }}>
                <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
              </button>
            </div>
            {loginForm.formState.errors.password && (
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#f43f5e' }}>
                <Icon name="ExclamationCircleIcon" size={12} />
                {loginForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-700 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8b84b)', color: '#0d0f14', boxShadow: '0 4px 16px rgba(201,168,76,0.25)' }}
          >
            {isLoading ? (
              <><Icon name="ArrowPathIcon" size={16} className="animate-spin" />Signing in...</>
            ) : (
              <><Icon name="ArrowRightOnRectangleIcon" size={16} />Sign In</>
            )}
          </button>

        </form>
      ) : (
        <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-5" noValidate>
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-500 mb-1.5" style={{ color: '#8892aa' }}>Full Name</label>
            <input
              id="fullName"
              type="text"
              placeholder="Your full name"
              {...signUpForm.register('fullName', { required: 'Full name is required' })}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all duration-150"
              style={{
                background: '#161921',
                border: `1px solid ${signUpForm.formState.errors.fullName ? '#f43f5e' : '#1f2335'}`,
                color: '#f0f2f8',
              }}
              onFocus={(e) => { if (!signUpForm.formState.errors.fullName) (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.4)'; }}
              onBlur={(e) => { if (!signUpForm.formState.errors.fullName) (e.target as HTMLInputElement).style.borderColor = '#1f2335'; }}
            />
            {signUpForm.formState.errors.fullName && (
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#f43f5e' }}>
                <Icon name="ExclamationCircleIcon" size={12} />
                {signUpForm.formState.errors.fullName.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="signup-email" className="block text-sm font-500 mb-1.5" style={{ color: '#8892aa' }}>Work Email</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@energyplus.io"
              {...signUpForm.register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
              })}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all duration-150"
              style={{
                background: '#161921',
                border: `1px solid ${signUpForm.formState.errors.email ? '#f43f5e' : '#1f2335'}`,
                color: '#f0f2f8',
              }}
              onFocus={(e) => { if (!signUpForm.formState.errors.email) (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.4)'; }}
              onBlur={(e) => { if (!signUpForm.formState.errors.email) (e.target as HTMLInputElement).style.borderColor = '#1f2335'; }}
            />
            {signUpForm.formState.errors.email && (
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#f43f5e' }}>
                <Icon name="ExclamationCircleIcon" size={12} />
                {signUpForm.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="signup-password" className="block text-sm font-500 mb-1.5" style={{ color: '#8892aa' }}>Password</label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                {...signUpForm.register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' },
                })}
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm focus:outline-none transition-all duration-150"
                style={{
                  background: '#161921',
                  border: `1px solid ${signUpForm.formState.errors.password ? '#f43f5e' : '#1f2335'}`,
                  color: '#f0f2f8',
                }}
                onFocus={(e) => { if (!signUpForm.formState.errors.password) (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.4)'; }}
                onBlur={(e) => { if (!signUpForm.formState.errors.password) (e.target as HTMLInputElement).style.borderColor = '#1f2335'; }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150 p-1" style={{ color: '#6b7494' }}>
                <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
              </button>
            </div>
            {signUpForm.formState.errors.password && (
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#f43f5e' }}>
                <Icon name="ExclamationCircleIcon" size={12} />
                {signUpForm.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-500 mb-1.5" style={{ color: '#8892aa' }}>Confirm Password</label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repeat your password"
                {...signUpForm.register('confirmPassword', { required: 'Please confirm your password' })}
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm focus:outline-none transition-all duration-150"
                style={{
                  background: '#161921',
                  border: `1px solid ${signUpForm.formState.errors.confirmPassword ? '#f43f5e' : '#1f2335'}`,
                  color: '#f0f2f8',
                }}
                onFocus={(e) => { if (!signUpForm.formState.errors.confirmPassword) (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.4)'; }}
                onBlur={(e) => { if (!signUpForm.formState.errors.confirmPassword) (e.target as HTMLInputElement).style.borderColor = '#1f2335'; }}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150 p-1" style={{ color: '#6b7494' }}>
                <Icon name={showConfirmPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
              </button>
            </div>
            {signUpForm.formState.errors.confirmPassword && (
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#f43f5e' }}>
                <Icon name="ExclamationCircleIcon" size={12} />
                {signUpForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-700 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8b84b)', color: '#0d0f14', boxShadow: '0 4px 16px rgba(201,168,76,0.25)' }}
          >
            {isLoading ? (
              <><Icon name="ArrowPathIcon" size={16} className="animate-spin" />Creating account...</>
            ) : (
              <><Icon name="UserPlusIcon" size={16} />Create Account</>
            )}
          </button>
        </form>
      )}
    </div>
  );
}