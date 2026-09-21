'use client';

import React,{useEffect,useMemo,useState} from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import {createClient} from '@/lib/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {toast} from 'sonner';

type Profile={id:string;full_name:string|null;email:string|null};
type Call={id:string;created_at:string;assigned_user_id:string|null;contact_name:string|null;contact_phone:string|null;outcome:string|null;notes:string|null};
type Lead={id:string;name:string;phone:string;source_category:string|null;status:string;user_id:string|null;last_outcome:string|null;next_follow_up_at:string|null;joined_at:string|null};
type Appointment={id:string;appointment_at:string;sales_user_id:string;lead_id:string;appointment_type:string;status:string;notes:string|null};
type Referral={id:string;created_at:string;referrer_sales_user_id:string;referred_lead_id:string;points:number|null;status:string;reward_status:string|null;joined_at:string|null};

const SOURCES=[['all','كل المصادر'],['expired','Expired'],['old','Old'],['social_media','Social Media'],['invitation','Invitation'],['tour','Tour'],['follow_up','Follow-up']];
const OUTCOMES=[['all','كل النتائج'],['no_answer','No Answer'],['connected','Connected'],['interested','Interested'],['not_interested','Not Interested'],['call_back','Call Back'],['appointment','Appointment'],['tour','Tour'],['joined','Joined'],['price_objection','Price Objection'],['timing_objection','Timing Objection'],['competitor','Competitor'],['wrong_number','Wrong Number'],['do_not_call','Do Not Call']];

export default function SalesReportsPage(){
 const {user}=useAuth();
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [calls,setCalls]=useState<Call[]>([]);
 const [leads,setLeads]=useState<Lead[]>([]);
 const [apps,setApps]=useState<Appointment[]>([]);
 const [refs,setRefs]=useState<Referral[]>([]);
 const [loading,setLoading]=useState(true);
 const [from,setFrom]=useState(()=>{const d=new Date();d.setDate(d.getDate()-6);return d.toISOString().slice(0,10)});
 const [to,setTo]=useState(()=>new Date().toISOString().slice(0,10));
 const [employee,setEmployee]=useState('all');
 const [source,setSource]=useState('all');
 const [outcome,setOutcome]=useState('all');

 const load=async()=>{
  if(!user)return;
  setLoading(true);
  const s=createClient();
  const start=new Date(from+'T00:00:00').toISOString(), end=new Date(to+'T23:59:59.999').toISOString();
  const [{data:p,error:pe},{data:c,error:ce},{data:l,error:le},{data:a,error:ae},{data:r,error:re}]=await Promise.all([
   s.from('user_profiles').select('id,full_name,email').in('role',['sales_staff','branch_manager']).eq('is_active',true),
   s.from('call_logs').select('id,created_at,assigned_user_id,contact_name,contact_phone,outcome,notes').gte('created_at',start).lte('created_at',end).order('created_at',{ascending:false}).range(0,9999),
   s.from('leads').select('id,name,phone,source_category,status,user_id,last_outcome,next_follow_up_at,joined_at').order('created_at',{ascending:false}).range(0,9999),
   s.from('sales_appointments').select('id,appointment_at,sales_user_id,lead_id,appointment_type,status,notes').gte('appointment_at',start).lte('appointment_at',end).order('appointment_at',{ascending:false}).range(0,9999),
   s.from('sales_referrals').select('id,created_at,referrer_sales_user_id,referred_lead_id,points,status,reward_status,joined_at').gte('created_at',start).lte('created_at',end).order('created_at',{ascending:false}).range(0,9999)
  ]);
  const err=[pe,ce,le,ae,re].find(Boolean); if(err){toast.error((err as any).message);setLoading(false);return;}
  setProfiles((p||[]) as Profile[]);setCalls((c||[]) as Call[]);setLeads((l||[]) as Lead[]);setApps((a||[]) as Appointment[]);setRefs((r||[]) as Referral[]);setLoading(false);
 };
 useEffect(()=>{load()},[user?.id,from,to]);

 const name=(id:string|null)=>{const p=profiles.find(x=>x.id===id);return p?.full_name||p?.email||id||'غير محدد'};
 const filteredCalls=useMemo(()=>calls.filter(c=>(employee==='all'||c.assigned_user_id===employee)&&(outcome==='all'||c.outcome===outcome)),[calls,employee,outcome]);
 const filteredLeads=useMemo(()=>leads.filter(l=>(employee==='all'||l.user_id===employee)&&(source==='all'||(l.source_category||'old')===source)),[leads,employee,source]);
 const filteredApps=useMemo(()=>apps.filter(a=>employee==='all'||a.sales_user_id===employee),[apps,employee]);
 const filteredRefs=useMemo(()=>refs.filter(r=>employee==='all'||r.referrer_sales_user_id===employee),[refs,employee]);

 const stats=useMemo(()=>({
  calls:filteredCalls.length,
  connected:filteredCalls.filter(c=>!['no_answer','busy','failed','wrong_number'].includes(c.outcome||'')).length,
  appointments:filteredApps.filter(a=>a.appointment_type==='appointment').length,
  tours:filteredApps.filter(a=>a.appointment_type==='tour').length,
  joined:filteredCalls.filter(c=>c.outcome==='joined').length,
  rankin:filteredRefs.length,
  rankinJoined:filteredRefs.filter(r=>r.reward_status==='earned'||r.status==='joined').length
 }),[filteredCalls,filteredApps,filteredRefs]);

 const exportExcel=async()=>{
  try{
   const XLSX=await import('xlsx');
   const wb=XLSX.utils.book_new();
   const callRows=filteredCalls.map(c=>({Date:new Date(c.created_at).toLocaleString('en-GB'),Employee:name(c.assigned_user_id),Lead:c.contact_name||'',Phone:c.contact_phone||'',Outcome:c.outcome||'',Notes:c.notes||''}));
   const kpiRows=profiles.filter(p=>employee==='all'||p.id===employee).map(p=>{const cs=filteredCalls.filter(c=>c.assigned_user_id===p.id),as=filteredApps.filter(a=>a.sales_user_id===p.id),rs=filteredRefs.filter(r=>r.referrer_sales_user_id===p.id);return {Employee:name(p.id),Calls:cs.length,Target:90,Connected:cs.filter(c=>!['no_answer','busy','failed','wrong_number'].includes(c.outcome||'')).length,Appointments:as.filter(a=>a.appointment_type==='appointment').length,Tours:as.filter(a=>a.appointment_type==='tour').length,Joined:cs.filter(c=>c.outcome==='joined').length,RankIn:rs.length,RankInJoined:rs.filter(r=>r.reward_status==='earned'||r.status==='joined').length};});
   const leadRows=filteredLeads.map(l=>({Lead:l.name,Phone:l.phone,Source:l.source_category||'old',Status:l.status,Employee:name(l.user_id),LastOutcome:l.last_outcome||'',NextFollowUp:l.next_follow_up_at?new Date(l.next_follow_up_at).toLocaleString('en-GB'):'',Joined:l.joined_at?'Yes':'No'}));
   const appRows=filteredApps.map(a=>({Date:new Date(a.appointment_at).toLocaleString('en-GB'),Type:a.appointment_type,Status:a.status,Employee:name(a.sales_user_id),Lead:(leads.find(l=>l.id===a.lead_id)?.name||a.lead_id),Notes:a.notes||''}));
   const refRows=filteredRefs.map(r=>({Date:new Date(r.created_at).toLocaleString('en-GB'),Referrer:name(r.referrer_sales_user_id),ReferredLead:(leads.find(l=>l.id===r.referred_lead_id)?.name||r.referred_lead_id),Points:r.points||1,Status:r.status,Reward:r.reward_status||'',Joined:r.joined_at?'Yes':'No'}));
   const funnel=[{Metric:'Calls',Value:stats.calls},{Metric:'Connected',Value:stats.connected},{Metric:'Appointments',Value:stats.appointments},{Metric:'Tours',Value:stats.tours},{Metric:'Joined',Value:stats.joined},{Metric:'Rank-In',Value:stats.rankin},{Metric:'Rank-In Joined',Value:stats.rankinJoined}];
   [['Daily KPI',kpiRows],['Call Logs',callRows],['Leads',leadRows],['Appointments Tours',appRows],['Rank-In',refRows],['Funnel',funnel]].forEach(([n,rows])=>{const ws=XLSX.utils.json_to_sheet(rows as any[]);XLSX.utils.book_append_sheet(wb,ws,String(n).slice(0,31));});
   XLSX.writeFile(wb,`Energy-Plus-Sales-Report-${from}-to-${to}.xlsx`);
   toast.success('تم تصدير تقرير Excel');
  }catch(e){toast.error('تعذر إنشاء ملف Excel');console.error(e);}
 };

 return <AuthGuard><AppLayout currentPath="/sales-reports"><div dir="rtl" className="space-y-5">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h1 className="text-2xl font-700">تقارير المبيعات</h1><p className="text-sm text-muted-foreground mt-1">تقارير يومية وأسبوعية وشهرية قابلة للتصدير إلى Excel</p></div><button onClick={exportExcel} disabled={loading} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-700">تصدير Excel</button></div>
  <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
   <div><label className="text-xs text-muted-foreground">من</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background"/></div>
   <div><label className="text-xs text-muted-foreground">إلى</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background"/></div>
   <div><label className="text-xs text-muted-foreground">الموظف</label><select value={employee} onChange={e=>setEmployee(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background"><option value="all">كل الموظفين</option>{profiles.map(p=><option key={p.id} value={p.id}>{name(p.id)}</option>)}</select></div>
   <div><label className="text-xs text-muted-foreground">المصدر</label><select value={source} onChange={e=>setSource(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background">{SOURCES.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
   <div><label className="text-xs text-muted-foreground">نتيجة المكالمة</label><select value={outcome} onChange={e=>setOutcome(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background">{OUTCOMES.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
  </div>
  <div className="grid grid-cols-2 md:grid-cols-7 gap-3">{[['Calls',stats.calls],['Connected',stats.connected],['Appointments',stats.appointments],['Tours',stats.tours],['Joined',stats.joined],['Rank-In',stats.rankin],['Rank-In Joined',stats.rankinJoined]].map(([k,v])=><div key={String(k)} className="bg-card border border-border rounded-xl p-4"><div className="text-2xl font-700">{v}</div><div className="text-xs text-muted-foreground mt-1">{k}</div></div>)}</div>
  <div className="bg-card border border-border rounded-xl p-4"><h2 className="font-700 mb-3">ملخص الموظفين</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-right p-3">الموظف</th><th>Calls</th><th>Connected</th><th>Appointments</th><th>Tours</th><th>Joined</th><th>Rank-In</th></tr></thead><tbody>{profiles.filter(p=>employee==='all'||p.id===employee).map(p=>{const cs=filteredCalls.filter(c=>c.assigned_user_id===p.id),as=filteredApps.filter(a=>a.sales_user_id===p.id),rs=filteredRefs.filter(r=>r.referrer_sales_user_id===p.id);return <tr key={p.id} className="border-b border-border/60"><td className="p-3 text-right font-600">{name(p.id)}</td><td className="text-center">{cs.length}</td><td className="text-center">{cs.filter(c=>!['no_answer','busy','failed','wrong_number'].includes(c.outcome||'')).length}</td><td className="text-center">{as.filter(a=>a.appointment_type==='appointment').length}</td><td className="text-center">{as.filter(a=>a.appointment_type==='tour').length}</td><td className="text-center">{cs.filter(c=>c.outcome==='joined').length}</td><td className="text-center">{rs.length}</td></tr>})}</tbody></table></div></div>
 </div></AppLayout></AuthGuard>
}