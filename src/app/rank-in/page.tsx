'use client';

import React,{useEffect,useMemo,useState} from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import {createClient} from '@/lib/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {toast} from 'sonner';

type Lead={id:string;name:string;phone:string};
type Ref={id:string;referrer_sales_user_id:string;source_lead_id:string|null;referred_lead_id:string;status:string;joined_at:string|null;points:number;reward_status:string;created_at:string;referrer?:any;referred?:any};

export default function RankInPage(){
 const {user}=useAuth(); const [refs,setRefs]=useState<Ref[]>([]); const [leads,setLeads]=useState<Lead[]>([]); const [staff,setStaff]=useState<any[]>([]);
 const [referrer,setReferrer]=useState(''); const [sourceLead,setSourceLead]=useState(''); const [referredLead,setReferredLead]=useState(''); const [points,setPoints]=useState('1'); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);

 const load=async()=>{if(!user)return;setLoading(true);const s=createClient();
  const [{data:r,error:re},{data:l},{data:p}]=await Promise.all([
   s.from('sales_referrals').select('id,referrer_sales_user_id,source_lead_id,referred_lead_id,status,joined_at,points,reward_status,created_at,referrer:user_profiles!sales_referrals_referrer_sales_user_id_fkey(full_name,email),referred:leads!sales_referrals_referred_lead_id_fkey(name,phone)').order('created_at',{ascending:false}),
   s.from('leads').select('id,name,phone').order('created_at',{ascending:false}),
   s.from('user_profiles').select('id,full_name,email').in('role',['sales_staff','branch_manager']).eq('is_active',true)
  ]);
  if(re) toast.error(re.message); setRefs((r||[]) as any); setLeads((l||[]) as Lead[]); setStaff(p||[]); if(!referrer) setReferrer(user.id);setLoading(false);
 };
 useEffect(()=>{load()},[user?.id]);

 const total=useMemo(()=>refs.filter(r=>r.reward_status==='earned').reduce((n,r)=>n+(r.points||1),0),[refs]);
 const createRef=async()=>{if(!user||!referredLead||!referrer){toast.error('اختار الموظف والـLead');return}setSaving(true);const s=createClient();
  const {error}=await s.from('sales_referrals').insert({referrer_sales_user_id:referrer,source_lead_id:sourceLead||null,referred_lead_id:referredLead,status:'lead',points:Number(points)||1,rank_points:Number(points)||1,reward_status:'pending'});
  if(error)toast.error(error.message);else{await s.from('leads').update({rank_in_referrer_id:referrer,referral_source:'rank_in'}).eq('id',referredLead);toast.success('تم تسجيل الـRank-In');setSourceLead('');setReferredLead('');setPoints('1');await load()}setSaving(false);
 };
 const markJoined=async(r:Ref)=>{const s=createClient();const now=new Date().toISOString();const {error}=await s.from('leads').update({status:'converted',joined_at:now,converted_at:now,next_action:'joined'}).eq('id',r.referred_lead_id);if(error)toast.error(error.message);else{toast.success('تم تسجيل Joined — الـReward هيتحسب تلقائياً');await load();}};
 return <AuthGuard><AppLayout currentPath="/rank-in"><div dir="rtl" className="space-y-5">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><h1 className="text-2xl font-700">Rank-In</h1><p className="text-sm text-muted-foreground mt-1">Referral → Lead → Joined → Reward</p></div><div className="bg-card border border-border rounded-xl px-5 py-3"><div className="text-2xl font-700">{total}</div><div className="text-xs text-muted-foreground">إجمالي النقاط المكتسبة</div></div></div>
  <div className="bg-card border border-border rounded-2xl p-4"><h2 className="font-700 mb-3">تسجيل Referral</h2><div className="grid md:grid-cols-4 gap-3">
   <select value={referrer} onChange={e=>setReferrer(e.target.value)} className="px-3 py-3 rounded-lg border border-border bg-background"><option value="">موظف الإحالة</option>{staff.map(p=><option key={p.id} value={p.id}>{p.full_name||p.email}</option>)}</select>
   <select value={sourceLead} onChange={e=>setSourceLead(e.target.value)} className="px-3 py-3 rounded-lg border border-border bg-background"><option value="">مصدر الإحالة (اختياري)</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}</select>
   <select value={referredLead} onChange={e=>setReferredLead(e.target.value)} className="px-3 py-3 rounded-lg border border-border bg-background"><option value="">الـLead الجديد</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}</select>
   <button disabled={saving} onClick={createRef} className="px-4 py-3 rounded-lg bg-primary text-primary-foreground font-700">{saving?'جاري...':'تسجيل Referral'}</button>
  </div></div>
  <div className="bg-card border border-border rounded-2xl overflow-hidden">{loading?<div className="p-10 text-center">جاري التحميل...</div>:refs.length===0?<div className="p-10 text-center text-muted-foreground">لا يوجد Referrals.</div>:
   <div className="divide-y divide-border">{refs.map(r=><div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1"><div className="font-700">{r.referred?.name||'Lead'}</div><div className="text-sm text-muted-foreground">Referrer: {r.referrer?.full_name||r.referrer?.email||r.referrer_sales_user_id} · {r.points} نقطة · {r.status}</div>{r.joined_at&&<div className="text-xs mt-1 text-positive">Joined: {new Date(r.joined_at).toLocaleString('ar-EG')}</div>}</div>{r.reward_status!=='earned'&&<button onClick={()=>markJoined(r)} className="px-4 py-2 rounded-lg bg-positive text-white">تسجيل Joined</button>}<span className="px-3 py-2 rounded-lg border border-border text-sm">{r.reward_status}</span></div>)}</div>}
  </div>
 </div></AppLayout></AuthGuard>
}