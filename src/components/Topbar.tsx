'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GlobalSearch from '@/components/GlobalSearch';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  info:    { icon: 'InformationCircleIcon', color: 'text-blue-400',   bg: 'bg-blue-950/60' },
  warning: { icon: 'ExclamationTriangleIcon', color: 'text-yellow-400', bg: 'bg-yellow-950/60' },
  success: { icon: 'CheckCircleIcon',       color: 'text-green-400',  bg: 'bg-green-950/60' },
  error:   { icon: 'XCircleIcon',           color: 'text-red-400',    bg: 'bg-red-950/60' },
};

export default function Topbar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const userBranch = user?.user_metadata?.branch || 'All Branches';

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error.message);
      } else {
        setNotifications((data as Notification[]) || []);
      }
    } catch (err) {
      console.error('Notifications fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n)));
        } else if (payload.eventType === 'DELETE') {
          setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notifId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)));
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
  };

  const deleteNotification = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    await supabase.from('notifications').delete().eq('id', notifId);
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.is_read) await markAsRead(notif.id);
    if (notif.link) { setNotifOpen(false); router.push(notif.link); }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/sign-up-login-screen');
    } catch (e) {
      console.error('Sign out error', e);
    }
  };

  return (
    <header
      className="h-16 flex items-center justify-between px-6 lg:px-8 shrink-0"
      style={{
        background: 'rgba(13, 15, 20, 0.95)',
        borderBottom: '1px solid #1a1d2e',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-600" style={{ color: '#f0f2f8' }}>Energy Plus</span>
          <span style={{ color: '#2a2f45' }}>·</span>
          <span className="text-sm font-400" style={{ color: '#6b7494' }}>{userBranch}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 rounded-lg px-3 py-2 text-sm w-52 cursor-pointer transition-all duration-200"
          style={{ background: '#161921', border: '1px solid #1f2335', color: '#6b7494' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.3)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1f2335'; }}
        >
          <Icon name="MagnifyingGlassIcon" size={14} />
          <span className="text-xs flex-1 text-left">Search... ⌘K</span>
        </button>

        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150"
            style={{ color: '#6b7494', background: 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#161921'; (e.currentTarget as HTMLButtonElement).style.color = '#f0f2f8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7494'; }}
            aria-label="Notifications"
          >
            <Icon name="BellIcon" size={18} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[16px] h-4 text-[9px] font-700 rounded-full flex items-center justify-center px-0.5"
                style={{ background: '#c9a84c', color: '#0d0f14', boxShadow: '0 0 8px rgba(201,168,76,0.5)' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-96 rounded-xl shadow-2xl z-50 fade-in overflow-hidden"
              style={{ background: '#13161f', border: '1px solid #1f2335', boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.08)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1f2335' }}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-600" style={{ color: '#f0f2f8' }}>Notifications</p>
                  {unreadCount > 0 && (
                    <span
                      className="text-xs rounded-full px-1.5 py-0.5 tabular-nums font-700"
                      style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-500 transition-colors"
                    style={{ color: '#c9a84c' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="max-h-[380px] overflow-y-auto scrollbar-thin divide-y" style={{ borderColor: '#1a1d2e' }}>
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#c9a84c', borderTopColor: 'transparent' }} />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2" style={{ color: '#3a3f55' }}>
                    <Icon name="BellSlashIcon" size={28} />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const cfg = typeConfig[n.type] || typeConfig.info;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`group px-4 py-3 transition-colors duration-150 cursor-pointer flex items-start gap-3`}
                        style={{
                          background: n.is_read ? 'transparent' : 'rgba(201,168,76,0.04)',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#161921'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'rgba(201,168,76,0.04)'; }}
                      >
                        <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${cfg.bg}`}>
                          <span className={cfg.color}>
                            <Icon name={cfg.icon as any} size={14} />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-600 leading-snug" style={{ color: n.is_read ? '#6b7494' : '#f0f2f8' }}>
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1" style={{ background: '#c9a84c' }} />
                            )}
                          </div>
                          <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: '#6b7494' }}>
                            {n.message}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: '#3a3f55' }}>
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteNotification(n.id, e)}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                          style={{ color: '#6b7494' }}
                          aria-label="Delete notification"
                        >
                          <Icon name="XMarkIcon" size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid #1f2335' }}>
                  <span className="text-xs" style={{ color: '#3a3f55' }}>
                    {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={async () => {
                      if (!user) return;
                      setNotifications([]);
                      await supabase.from('notifications').delete().eq('user_id', user.id);
                    }}
                    className="text-xs font-500 transition-colors"
                    style={{ color: '#6b7494' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#f43f5e'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7494'; }}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div
          className="relative flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-1.5 transition-all duration-150"
          onClick={handleSignOut}
          title="Sign Out"
          style={{ color: '#8892aa' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#161921'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-700"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8b84b)', color: '#0d0f14' }}
          >
            {userInitials}
          </div>
          <span className="hidden sm:block text-sm font-500 max-w-[100px] truncate" style={{ color: '#f0f2f8' }}>
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}