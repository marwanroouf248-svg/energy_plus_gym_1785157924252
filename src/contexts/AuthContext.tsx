'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthMetadata {
  fullName?: string;
  avatarUrl?: string;
}

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      setUserProfile(data || null);
      return data || null;
    } catch {
      setUserProfile(null);
      return null;
    }
  };

  useEffect(() => {
    const managerDemo = localStorage.getItem('energyplus_manager_demo') === 'true';
    const demoUser = {
      id: 'manager-demo',
      email: 'marwan-admin@manager.energyplus.local',
      user_metadata: { full_name: 'Marwan Roouf' },
      email_confirmed_at: new Date().toISOString(),
    };
    const demoProfile = {
      id: 'manager-demo',
      email: demoUser.email,
      full_name: 'Marwan Roouf',
      role: 'admin',
      employee_code: 'MARWAN-ADMIN',
      is_active: true,
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (managerDemo && !session) {
        setSession(null);
        setUser(demoUser);
        setUserProfile(demoProfile);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (managerDemo && !session) {
        setSession(null);
        setUser(demoUser);
        setUserProfile(demoProfile);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        else setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: AuthMetadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: metadata.fullName || '', avatar_url: metadata.avatarUrl || '' },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => user?.email_confirmed_at !== null;

  const getUserProfile = async (userId?: string) => {
    const id = userId || user?.id;
    if (!id) return null;
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  };

  return <AuthContext.Provider value={{
    user, session, loading, userProfile, signUp, signIn, signOut,
    getCurrentUser, isEmailVerified, getUserProfile
  }}>{children}</AuthContext.Provider>;
};
