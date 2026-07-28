'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';

interface SearchResult {
  id: string;
  type: 'subscriber' | 'lead' | 'staff' | 'branch';
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  iconColor: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  subscriber: 'مشترك',
  lead: 'عميل محتمل',
  staff: 'موظف',
  branch: 'فرع',
};

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const term = `%${q}%`;
      const [subscribersRes, leadsRes, staffRes, branchesRes] = await Promise.all([
        supabase
          .from('subscribers')
          .select('id, name, phone, status')
          .or(`name.ilike.${term},phone.ilike.${term}`)
          .limit(5),
        supabase
          .from('leads')
          .select('id, name, phone, status')
          .or(`name.ilike.${term},phone.ilike.${term}`)
          .limit(5),
        supabase
          .from('user_profiles')
          .select('id, full_name, email, role')
          .or(`full_name.ilike.${term},email.ilike.${term}`)
          .limit(5),
        supabase
          .from('branches')
          .select('id, name, type')
          .ilike('name', term)
          .limit(3),
      ]);

      const mapped: SearchResult[] = [];

      (subscribersRes.data || []).forEach((s: any) => {
        mapped.push({
          id: s.id,
          type: 'subscriber',
          title: s.name || 'بدون اسم',
          subtitle: s.phone || '',
          href: '/subscriber-management',
          icon: 'UserIcon',
          iconColor: 'text-blue-400',
        });
      });

      (leadsRes.data || []).forEach((l: any) => {
        mapped.push({
          id: l.id,
          type: 'lead',
          title: l.name || 'بدون اسم',
          subtitle: l.phone || '',
          href: '/leads',
          icon: 'UserPlusIcon',
          iconColor: 'text-green-400',
        });
      });

      (staffRes.data || []).forEach((u: any) => {
        mapped.push({
          id: u.id,
          type: 'staff',
          title: u.full_name || u.email || 'موظف',
          subtitle: u.role || '',
          href: '/staff-management',
          icon: 'IdentificationIcon',
          iconColor: 'text-purple-400',
        });
      });

      (branchesRes.data || []).forEach((b: any) => {
        mapped.push({
          id: b.id,
          type: 'branch',
          title: b.name || 'فرع',
          subtitle: b.type || '',
          href: '/branches',
          icon: 'BuildingOfficeIcon',
          iconColor: 'text-yellow-400',
        });
      });

      setResults(mapped);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        navigate(results[selectedIndex]);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, results, selectedIndex]);

  const navigate = (result: SearchResult) => {
    onClose();
    router.push(result.href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#13161f', border: '1px solid #1f2335', boxShadow: '0 25px 80px rgba(0,0,0,0.7)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid #1f2335' }}>
          <Icon name="MagnifyingGlassIcon" size={18} className="flex-shrink-0" style={{ color: '#6b7494' } as any} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مشتركين، عملاء، موظفين، فروع..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#f0f2f8', caretColor: '#c9a84c' }}
            dir="rtl"
          />
          {loading && (
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0"
              style={{ borderColor: '#c9a84c', borderTopColor: 'transparent' }}
            />
          )}
          <kbd
            className="hidden sm:flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: '#1f2335', color: '#6b7494', border: '1px solid #2a2f45' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto">
          {!query.trim() && (
            <div className="flex flex-col items-center justify-center py-12 gap-2" style={{ color: '#3a3f55' }}>
              <Icon name="MagnifyingGlassIcon" size={32} />
              <p className="text-sm">ابدأ الكتابة للبحث</p>
            </div>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2" style={{ color: '#3a3f55' }}>
              <Icon name="FaceFrownIcon" size={32} />
              <p className="text-sm">لا توجد نتائج لـ &quot;{query}&quot;</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, idx) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => navigate(result)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100"
                  style={{
                    background: idx === selectedIndex ? '#1a1d2e' : 'transparent',
                    borderLeft: idx === selectedIndex ? '2px solid #c9a84c' : '2px solid transparent',
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: '#1f2335' }}
                  >
                    <Icon name={result.icon as any} size={16} className={result.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0 text-right" dir="rtl">
                    <p className="text-sm font-500 truncate" style={{ color: '#f0f2f8' }}>{result.title}</p>
                    <p className="text-xs truncate" style={{ color: '#6b7494' }}>{result.subtitle}</p>
                  </div>
                  <span
                    className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-500"
                    style={{ background: '#1f2335', color: '#6b7494' }}
                  >
                    {typeLabels[result.type]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2.5 text-[11px]"
          style={{ borderTop: '1px solid #1f2335', color: '#3a3f55' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded" style={{ background: '#1f2335', color: '#6b7494' }}>↑↓</kbd>
              للتنقل
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded" style={{ background: '#1f2335', color: '#6b7494' }}>↵</kbd>
              للفتح
            </span>
          </div>
          <span>{results.length > 0 ? `${results.length} نتيجة` : ''}</span>
        </div>
      </div>
    </div>
  );
}
