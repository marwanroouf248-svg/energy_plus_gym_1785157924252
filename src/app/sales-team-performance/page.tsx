'use client';

import React,{useEffect,useMemo,useState} from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import {createClient} from '@/lib/supabase/client';
import {useAuth} from '@/contexts/AuthContext';

type Row={id:string;name:string;email:string;calls:number;connected:number;appointments:number;tours:number;joined:number;rankin:number};
export default function SalesManagerPage(){
 const {user}=useAuth(); const [rows,setRows]=useState<Row[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{if(!user)return;const s=createClient();const {data:profiles}=await s.from('user_profiles').select('id,full_name,email').in('role',['sales_staff','branch_manager']).eq('is_active',true);const ids=(profiles||[]).map((p:any)=>p.id);if(!ids.length){setLoading(false);return;}
 const start=new Date();start.setHours(0,0,0,0);
 const [{data:calls},{data:apps},{data:refs}]=await Promise.all([
  s.from('call_logs').select('assigned_user_id,outcome').in('assigned_user_id',ids).gte('created_at',start.toISOString()),
  s.from('sales_appointments').select('sales_user_id,status,appointment_type').in('sales_user_id',ids).gte('created_at',start.toISOString()),
  s.from('sales_referrals').select('referrer_sales_user_id,reward_status').in('referrer_sales_user_id',ids)
 ]);
 setRows((profiles||[]).map((p:any)=>{const c=(calls||[]).filter((x:any)=>x.assigned_user_id===p.id);const a=(apps||[]).filter((x:any)=>x.sales_user_id===p.id);const r=(refs||[]).filter((x:any)=>x.referrer_sales_user_id===p.id&&x.reward_status==='earned');return {id:p.id,name:p.full_name||p.email,email:p.email,calls:c.length,connected:c.filter((x:any)=>!['no_answer','busy','failed','wrong_number'].includes(x.outcome)).length,appointments:a.filter((x:any)=>x.status==='scheduled'||x.appointment_type==='appointment').length,tours:a.filter((x:any)=>x.appointment_type==='tour'&&['scheduled','completed','attended'].includes(x.status)).length,joined:c.filter((x:any)=>x.outcome==='joined').length,rankin:r.length};}));setLoading(false);})()},[user?.id]);
 const totals=useMemo(()=>rows.reduce((a,r)=>({calls:a.calls+r.calls,connected:a.connected+r.connected,appointments:a.appointments+r.appointments,tours:a.tours+r.tours,joined:a.joined+r.joined,rankin:a.rankin+r.rankin}),{calls:0,connected:0,appointments:0,tours:0,joined:0,rankin:0}),[rows]);
 return <AuthGuard><AppLayout currentPath="/sales-team-performance"><div dir="rtl" className="space-y-6">
 <div><h1 className="text-2xl font-700">إدارة أداء المبيعات</h1><p className="text-sm text-muted-foreground mt-1">متابعة الفريق اليوم: المكالمات → التواصل → المواعيد → الزيارات → الاشتراكات → Rank-In</p></div>
 <div className="grid grid-cols-2 md:grid-cols-6 gap-3">{[['المكالمات',totals.calls],['Connected',totals.connected],['Appointments',totals.appointments],['Tours',totals.tours],['Joined',totals.joined],['Rank-In',totals.rankin]].map(([k,v])=><div key={String(k)} className="bg-card border border-border rounded-xl p-4"><div className="text-2xl font-700">{v}</div><div className="text-xs text-muted-foreground mt-1">{k}</div></div>)}</div>
 <div className="bg-card border border-border rounded-xl overflow-hidden">{loading?<div className="p-10 text-center">جاري التحميل...</div>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/30"><th className="text-right p-4">الموظف</th><th className="p-4">Calls / 90</th><th className="p-4">Connected</th><th className="p-4">Appointments</th><th className="p-4">Tours</th><th className="p-4">Joined</th><th className="p-4">Rank-In</th></tr></thead><tbody className="divide-y divide-border">{rows.map(r=><tr key={r.id}><td className="p-4 text-right font-600">{r.name}</td><td className="p-4 text-center">{r.calls} / 90</td><td className="p-4 text-center">{r.connected}</td><td className="p-4 text-center">{r.appointments}</td><td className="p-4 text-center">{r.tours}</td><td className="p-4 text-center">{r.joined}</td><td className="p-4 text-center">{r.rankin}</td></tr>)}</tbody></table></div>}</div>
 </div></AppLayout></AuthGuard>
}
