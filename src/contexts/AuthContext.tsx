'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthMetadata { fullName?: string; avatarUrl?: string; }
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
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (error) { setUserProfile(null); return null; }
    setUserProfile(data);
    return data;
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setSession(null);
      setUser(null);
      setUserProfile(null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) await fetchProfile(nextSession.user.id);
      else setUserProfile(null);
      setLoading(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string, metadata: AuthMetadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: metadata.fullName || '', avatar_url: metadata.avatarUrl || '' }, emailRedirectTo: `${window.location.origin}/auth/callback` }
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
    await supabase.auth.signOut();
    try { localStorage.removeItem('energyplus_manager_demo'); } catch {}
    setSession(null); setUser(null); setUserProfile(null);
  };

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => user?.email_confirmed_at != null;

  const getUserProfile = async (userId?: string) => {
    const id = userId || user?.id;
    if (!id) return null;
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  };

  return <AuthContext.Provider value={{ user, session, loading, userProfile, signUp, signIn, signOut, getCurrentUser, isEmailVerified, getUserProfile }}>{children}</AuthContext.Provider>;
};
