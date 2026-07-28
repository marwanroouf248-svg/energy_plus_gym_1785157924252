'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, userProfile } = useAuth();
  const [gymName, setGymName] = useState('Energy Plus');
  const [currency, setCurrency] = useState('EGP');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    toast?.success('تم حفظ الإعدادات');
    setTimeout(() => setSaved(false), 2000);
  };

  const userRole = userProfile?.role || user?.user_metadata?.role || '';
  const isAdmin = userRole === 'admin';

  return (
    <AuthGuard>
      <AppLayout currentPath="/settings">
        <div className="space-y-6 max-w-2xl">
          <div>
            <h1 className="text-2xl font-700 text-foreground">الإعدادات</h1>
            <p className="text-sm text-muted-foreground mt-1">إعدادات النظام والنادي</p>
          </div>

          {/* Gym Info */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-600 text-foreground flex items-center gap-2">
              <Icon name="BuildingOfficeIcon" size={18} className="text-primary" />
              معلومات النادي
            </h2>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">اسم النادي</label>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e?.target?.value)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">العملة</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e?.target?.value)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              >
                <option value="EGP">جنيه مصري (ج)</option>
                <option value="USD">دولار أمريكي ($)</option>
                <option value="SAR">ريال سعودي (ر.س)</option>
              </select>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-600 text-foreground flex items-center gap-2">
              <Icon name="UserCircleIcon" size={18} className="text-primary" />
              معلومات الحساب
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">البريد الإلكتروني</p>
                <p className="font-500 text-foreground">{user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">الدور</p>
                <p className="font-500 text-foreground capitalize">{userRole?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">الاسم</p>
                <p className="font-500 text-foreground">{user?.user_metadata?.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">الفرع</p>
                <p className="font-500 text-foreground">{user?.user_metadata?.branch || 'جميع الفروع'}</p>
              </div>
            </div>
          </div>

          {/* Branches Quick View */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-600 text-foreground flex items-center gap-2 mb-4">
              <Icon name="BuildingOffice2Icon" size={18} className="text-primary" />
              الفروع المسجلة
            </h2>
            <div className="space-y-3">
              {[
                { name: 'فرع فودافون', type: 'رجالي', color: 'text-blue-500 bg-blue-500/10' },
                { name: 'فرع الرخاوي', type: 'نسائي', color: 'text-pink-500 bg-pink-500/10' },
              ]?.map((b) => (
                <div key={b?.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="font-500 text-foreground text-sm">{b?.name}</span>
                  <span className={`text-xs font-500 px-2 py-0.5 rounded-full ${b?.color}`}>{b?.type}</span>
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-600 hover:bg-primary/90 transition-colors"
            >
              <Icon name={saved ? 'CheckIcon' : 'CheckIcon'} size={16} />
              {saved ? 'تم الحفظ' : 'حفظ الإعدادات'}
            </button>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
