'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  roles: string[];
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Sales Dashboard', href: '/', icon: 'ChartBarIcon', roles: ['admin', 'branch_manager', 'sales_staff'] },
  { label: 'Subscribers', href: '/subscriber-management', icon: 'UsersIcon', roles: ['admin', 'branch_manager', 'sales_staff'] },
  { label: 'Leads', href: '/leads', icon: 'UserPlusIcon', badge: 7, roles: ['admin', 'sales_staff'] },
  { label: 'Call Tracking', href: '/call-tracking', icon: 'PhoneIcon', roles: ['admin', 'branch_manager', 'sales_staff'] },
  { label: 'Packages', href: '/packages', icon: 'TagIcon', roles: ['admin'] },
  {
    label: 'Staff',
    href: '/staff-management',
    icon: 'IdentificationIcon',
    roles: ['admin'],
    children: [
      { label: 'HR', href: '/hr', icon: 'UserGroupIcon', roles: ['admin'] },
    ],
  },
  { label: 'Team Performance', href: '/team-performance', icon: 'TrophyIcon', roles: ['admin', 'branch_manager'] },
  { label: 'Branches', href: '/branches', icon: 'BuildingOfficeIcon', roles: ['admin'] },
  { label: 'Reports', href: '/reports', icon: 'DocumentChartBarIcon', roles: ['admin', 'branch_manager'] },
  { label: 'Audit Log', href: '/audit-log', icon: 'ClipboardDocumentListIcon', roles: ['admin', 'branch_manager'] },
  { label: 'Messages', href: '/messages', icon: 'ChatBubbleLeftRightIcon', roles: ['admin', 'sales_staff'] },
  { label: 'Alerts Config', href: '/alerts-configuration', icon: 'BellAlertIcon', roles: ['admin'] },
  { label: 'Settings', href: '/settings', icon: 'Cog6ToothIcon', roles: ['admin'] },
];

interface SidebarProps {
  currentPath: string;
}

export default function Sidebar({ currentPath }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const userRole = user?.user_metadata?.role || 'sales_staff';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));
  const mainItems = visibleItems.slice(0, 6);
  const bottomItems = visibleItems.slice(6);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/sign-up-login-screen');
    } catch (e) {
      console.error('Sign out error', e);
    }
  };

  return (
    <aside
      className={`relative flex flex-col shrink-0 sidebar-transition overflow-hidden ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0f1118 0%, #0d0f14 100%)',
        borderRight: '1px solid #1a1d2e',
      }}
    >
      {/* Logo */}
      <div
        className={`flex items-center h-16 shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-3 px-5'}`}
        style={{ borderBottom: '1px solid #1a1d2e' }}
      >
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-xl blur-sm opacity-40" style={{ background: 'radial-gradient(circle, #c9a84c, transparent)' }} />
          <Image
            src="/assets/images/328A1CF7-CBED-4839-A339-01A156563B74-1785160489268.jpg"
            alt="Energy Plus Logo"
            width={34}
            height={34}
            className="relative rounded-xl object-cover w-[34px] h-[34px] ring-1 ring-yellow-500/20"
            priority
          />
        </div>
        {!collapsed && (
          <div>
            <span className="font-700 text-base tracking-tight" style={{ color: '#f0f2f8' }}>Energy Plus</span>
            <p className="text-[10px] tracking-widest uppercase font-500" style={{ color: '#c9a84c', letterSpacing: '0.12em' }}>Premium CRM</p>
          </div>
        )}
      </div>

      {/* User Badge */}
      {!collapsed && (
        <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #1a1d2e' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-700 text-xs"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8b84b)', color: '#0d0f14' }}
            >
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-600 truncate" style={{ color: '#f0f2f8' }}>{userName}</p>
              <p className="text-xs capitalize font-500" style={{ color: '#6b7494' }}>{userRole.replace('_', ' ')}</p>
            </div>
            <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <div className={`space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
          {mainItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <div key={`nav-group-${item.href}`}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center gap-3 rounded-lg transition-all duration-200 ${
                    collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 py-2.5'
                  }`}
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(90deg, rgba(201,168,76,0.14) 0%, rgba(201,168,76,0.04) 100%)',
                          borderLeft: collapsed ? 'none' : '2px solid #c9a84c',
                          paddingLeft: collapsed ? undefined : '10px',
                        }
                      : {}
                  }
                >
                  <Icon
                    name={item.icon as any}
                    size={17}
                    className="shrink-0 transition-colors duration-200"
                    style={{ color: isActive ? '#c9a84c' : '#6b7494' } as React.CSSProperties}
                  />
                  {!collapsed && (
                    <>
                      <span
                        className="text-sm font-500 flex-1 truncate transition-colors duration-200"
                        style={{ color: isActive ? '#f0f2f8' : '#8892aa' }}
                      >
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className="text-xs font-700 rounded-full px-1.5 py-0.5 tabular-nums"
                          style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', fontSize: '10px' }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
                {item.children && !collapsed && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children
                      .filter((c) => c.roles.includes(userRole))
                      .map((child) => {
                        const childActive = currentPath === child.href;
                        return (
                          <Link
                            key={`nav-child-${child.href}`}
                            href={child.href}
                            className={`group flex items-center gap-2 rounded-md transition-all duration-150 px-2 py-1 ${
                              childActive ? 'bg-gradient-to-r from-yellow-400/10 to-transparent border-l-2 border-yellow-400' : ''
                            }`}
                          >
                            <Icon name={child.icon as any} size={14} className="shrink-0" style={{ color: childActive ? '#c9a84c' : '#6b7494' } as React.CSSProperties} />
                            <span className="text-xs font-500 truncate" style={{ color: childActive ? '#f0f2f8' : '#8892aa' }}>{child.label}</span>
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!collapsed && (
          <div className="mt-5 mb-2 px-6">
            <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: '#3a3f55', letterSpacing: '0.14em' }}>Management</p>
          </div>
        )}
        {collapsed && <div className="my-3 mx-3 h-px" style={{ background: '#1a1d2e' }} />}

        <div className={`space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
          {bottomItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={`nav-bottom-${item.href}`}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-lg transition-all duration-200 ${
                  collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 py-2.5'
                }`}
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(90deg, rgba(201,168,76,0.14) 0%, rgba(201,168,76,0.04) 100%)',
                        borderLeft: collapsed ? 'none' : '2px solid #c9a84c',
                        paddingLeft: collapsed ? undefined : '10px',
                      }
                    : {}
                }
              >
                <Icon
                  name={item.icon as any}
                  size={17}
                  className="shrink-0 transition-colors duration-200"
                  style={{ color: isActive ? '#c9a84c' : '#6b7494' } as React.CSSProperties}
                />
                {!collapsed && (
                  <span
                    className="text-sm font-500 flex-1 truncate transition-colors duration-200"
                    style={{ color: isActive ? '#f0f2f8' : '#8892aa' }}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="px-3 py-2" style={{ borderTop: '1px solid #1a1d2e' }}>
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={`flex items-center gap-2 w-full rounded-lg px-2 py-2 transition-all duration-150 group ${collapsed ? 'justify-center' : ''}`}
          style={{ color: '#6b7494' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#f43f5e'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7494'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Icon name="ArrowRightOnRectangleIcon" size={16} />
          {!collapsed && <span className="text-xs font-500">Sign Out</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="px-3 py-2.5" style={{ borderTop: '1px solid #1a1d2e' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center gap-2 w-full rounded-lg px-2 py-2 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          style={{ color: '#3a3f55' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#c9a84c'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,0.06)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#3a3f55'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Icon name={collapsed ? 'ChevronRightIcon' : 'ChevronLeftIcon'} size={15} />
          {!collapsed && <span className="text-xs font-500">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
