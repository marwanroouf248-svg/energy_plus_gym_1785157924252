'use client';

import React,{useEffect,useMemo,useState} from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import {createClient} from '@/lib/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {toast} from 'sonner';

type Profile={id:string;full_name:string|null;email:string|null;employee_code:string|null;branch:string|null};
type Call={id:string;created_at:string;assigned_user_id:string|null;contact_name:string|null;contact_phone:string|null;outcome:string|null;call_status:string|null;call_duration:number|null;notes:string|null;contact_type:string|null;source?:string|null};
type App={sales_user_id:string;appointment_at:string;appointment_type:string;status:string};
const SOURCES=['expired','old','social_media','invitation','tour','follow_up'];

const label=(s:string)=>({expired:'Expired',old:'Old',social_media:'Social Media',invitation:'Invitation',tour:'Tour',follow_up:'Follow-up'}[s]||s);
const badOutcome=(o:string|null)=>['no_answer','busy','failed','wrong_number','canceled'].includes(o||'');

export default function SalesControlRoom(){
 const {user,userProfile}=useAuth();
 const [profiles,setProfiles]=useState<Profile[]>([]); const [calls,setCalls]=useState<Call[]>([]); const [apps,setApps]=useState<App[]>([]);
 const [tab,setTab]=useState<'live'|'team'|'sources'|'followups'|'quality'>('live');
 const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10)); const [employee,setEmployee]=useState('all'); const [source,setSource]=useState('all');
 const [loading,setLoading]=useState(true);

 const load=async()=>{
  if(!user)return; setLoading(true); const s=createClient(); const start=new Date(date+'T00:00:00').toISOString(),end=new Date(date+'T23:59:59.999').toISOString();
  const [{data:p,error:pe},{data:c,error:ce},{data:a,error:ae}]=await Promise.all([
   s.from('user_profiles').select('id,full_name,email,employee_code,branch').in('role',['sales_staff','branch_manager']).eq('is_active',true),
   s.from('call_logs').select('id,created_at,assigned_user_id,contact_name,contact_phone,outcome,call_status,call_duration,notes,contact_type').gte('created_at',start).lte('created_at',end).order('created_at',{ascending:false}).range(0,9999),
   s.from('sales_appointments').select('sales_user_id,appointment_at,appointment_type,status').gte('appointment_at',start).lte('appointment_at',end)
  ]);
  const err=pe||ce||ae;if(err){toast.error(err.message);setLoading(false);return;} setProfiles((p||[]) as Profile[]);setCalls((c||[]) as Call[]);setApps((a||[]) as App[]);setLoading(false);
 };
 useEffect(()=>{load();const t=setInterval(load,30000);return()=>clearInterval(t)},[user?.id,date]);

 const name=(id:string|null)=>{const p=profiles.find(x=>x.id===id);return p?.full_name||p?.email||'غير محدد'};
 const rows=useMemo(()=>profiles.map(p=>{const cs=calls.filter(c=>c.assigned_user_id===p.id),as=apps.filter(a=>a.sales_user_id===p.id);const connected=cs.filter(c=>!badOutcome(c.outcome)).length,talk=cs.reduce((n,c)=>n+(c.call_duration||0),0);return {p,cs,as,connected,talk,answered:cs.filter(c=>['in-progress','completed'].includes(c.call_status||'')||!badOutcome(c.outcome)).length,appointments:as.filter(a=>a.appointment_type==='appointment').length,tours:as.filter(a=>a.appointment_type==='tour').length,joined:cs.filter(c=>c.outcome==='joined'||c.outcome==='converted').length};}),[profiles,calls,apps]);
 const filteredCalls=useMemo(()=>calls.filter(c=>(employee==='all'||c.assigned_user_id===employee)&&(source==='all'||(c.source||'old')===source)),[calls,employee,source]);
 const totals=useMemo(()=>({calls:filteredCalls.length,connected:filteredCalls.filter(c=>!badOutcome(c.outcome)).length,talk:filteredCalls.reduce((n,c)=>n+(c.call_duration||0),0),joined:filteredCalls.filter(c=>['joined','converted'].includes(c.outcome||'')).length}),[filteredCalls]);
 const pct=(n:number,d:number)=>d?Math.round(n/d*100):0;
 const exportSheet=async()=>{
  try{const XLSX=await import('xlsx');const wb=XLSX.utils.book_new();
   const team=rows.map(r=>({Employee:name(r.p.id),Code:r.p.employee_code||'',Branch:r.p.branch||'',Calls:r.cs.length,Target:90,TargetPct:pct(r.cs.length,90),Connected:r.connected,AnswerRate:pct(r.connected,r.cs.length),TalkMinutes:Math.round(r.talk/60),Appointments:r.appointments,Tours:r.tours,Joined:r.joined,Conversion:pct(r.joined,r.cs.length)}));
   const logs=filteredCalls.map(c=>({Time:new Date(c.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),Employee:name(c.assigned_user_id),Lead:c.contact_name||'',Phone:c.contact_phone||'',Status:c.call_status||'',Outcome:c.outcome||'',Duration:c.call_duration||0,Notes:c.notes||''}));
   const sources=SOURCES.map(s=>({Source:label(s),Calls:filteredCalls.filter(c=>(c.source||'old')===s).length,Connected:filteredCalls.filter(c=>(c.source||'old')===s&&!badOutcome(c.outcome)).length,Joined:filteredCalls.filter(c=>(c.source||'old')===s&&['joined','converted'].includes(c.outcome||'')).length}));
   [['Team Sheet',team],['Call Log',logs],['Source Sheet',sources]].forEach(([n,data])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data as any[]),String(n)));XLSX.writeFile(wb,'Energy-Plus-Team-Sheet-'+date+'.xlsx');toast.success('تم تصدير شيت الفريق');}catch(e){toast.error('تعذر تصدير الشيت');}
 };

 return <AuthGuard><AppLayout currentPath="/sales-control-room"><div dir="rtl" className="space-y-5">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h1 className="text-2xl font-700">Sales Control Room</h1><p className="text-sm text-muted-foreground mt-1">مراقبة الفريق والمكالمات والشيتات في شاشة واحدة · تحديث تلقائي كل 30 ثانية</p></div><div className="flex gap-2"><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background"/><button onClick={exportSheet} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-700">Export Team Sheet</button></div></div>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Calls',totals.calls],['Connected',totals.connected],['Talk Time',Math.floor(totals.talk/60)+'m'],['Joined',totals.joined]].map(([k,v])=><div key={String(k)} className="bg-card border border-border rounded-xl p-4"><div className="text-2xl font-700">{v}</div><div className="text-xs text-muted-foreground mt-1">{k}</div></div>)}</div>
  <div className="flex flex-wrap gap-2 bg-muted/40 p-2 rounded-xl"><button onClick={()=>setTab('live')} className={`px-4 py-2 rounded-lg text-sm ${tab==='live'?'bg-card shadow font-700':''}`}>Live Monitor</button><button onClick={()=>setTab('team')} className={`px-4 py-2 rounded-lg text-sm ${tab==='team'?'bg-card shadow font-700':''}`}>Team Sheet</button><button onClick={()=>setTab('sources')} className={`px-4 py-2 rounded-lg text-sm ${tab==='sources'?'bg-card shadow font-700':''}`}>Source Sheet</button><button onClick={()=>setTab('followups')} className={`px-4 py-2 rounded-lg text-sm ${tab==='followups'?'bg-card shadow font-700':''}`}>Follow-up Sheet</button><button onClick={()=>setTab('quality')} className={`px-4 py-2 rounded-lg text-sm ${tab==='quality'?'bg-card shadow font-700':''}`}>Quality Control</button></div>
  <div className="flex gap-2"><select value={employee} onChange={e=>setEmployee(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background"><option value="all">كل الموظفين</option>{profiles.map(p=><option key={p.id} value={p.id}>{name(p.id)}</option>)}</select><select value={source} onChange={e=>setSource(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background"><option value="all">كل المصادر</option>{SOURCES.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></div>

  {tab==='team'&&<div className="bg-card border border-border rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-muted/30 border-b border-border"><th className="p-3 text-right">الموظف</th><th>Calls / 90</th><th>Target %</th><th>Connected</th><th>Answer %</th><th>Talk</th><th>Appt.</th><th>Tours</th><th>Joined</th><th>Conversion</th></tr></thead><tbody>{rows.filter(r=>employee==='all'||r.p.id===employee).map(r=><tr key={r.p.id} className="border-b border-border/60"><td className="p-3 text-right font-600">{name(r.p.id)}</td><td className="text-center">{r.cs.length}/90</td><td className="text-center">{pct(r.cs.length,90)}%</td><td className="text-center">{r.connected}</td><td className="text-center">{pct(r.connected,r.cs.length)}%</td><td className="text-center">{Math.floor(r.talk/60)}m</td><td className="text-center">{r.appointments}</td><td className="text-center">{r.tours}</td><td className="text-center">{r.joined}</td><td className="text-center">{pct(r.joined,r.cs.length)}%</td></tr>)}</tbody></table></div>}

  {tab==='live'&&<div className="bg-card border border-border rounded-xl overflow-hidden"><div className="p-4 border-b border-border font-700">آخر المكالمات</div>{loading?<div className="p-10 text-center">جاري التحميل...</div>:filteredCalls.slice(0,50).map(c=><div key={c.id} className="p-4 border-b border-border/60 flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1"><div className="font-600">{c.contact_name||'Unknown'} <span className="text-xs text-muted-foreground">· {name(c.assigned_user_id)}</span></div><div className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleTimeString('ar-EG')} · {c.contact_phone||''}</div></div><span className="px-2 py-1 rounded-lg bg-muted text-xs">{c.call_status||'—'}</span><span className="px-2 py-1 rounded-lg bg-primary/10 text-xs">{c.outcome||'بدون نتيجة'}</span><span className="text-sm tabular-nums">{c.call_duration||0}s</span></div>)}{!loading&&!filteredCalls.length&&<div className="p-10 text-center text-muted-foreground">لا توجد مكالمات في هذا اليوم.</div>}</div>}

  {tab==='sources'&&<div className="grid md:grid-cols-2 gap-4">{SOURCES.map(s=>{const cs=filteredCalls.filter(c=>(c.source||'old')===s),con=cs.filter(c=>!badOutcome(c.outcome)).length,j=cs.filter(c=>['joined','converted'].includes(c.outcome||'')).length;return <div key={s} className="bg-card border border-border rounded-xl p-5"><div className="font-700">{label(s)}</div><div className="grid grid-cols-3 gap-2 mt-4 text-center"><div><b>{cs.length}</b><p className="text-xs text-muted-foreground">Calls</p></div><div><b>{con}</b><p className="text-xs text-muted-foreground">Connected</p></div><div><b>{j}</b><p className="text-xs text-muted-foreground">Joined</p></div></div></div>})}</div>}

  {tab==='quality'&&<div className="bg-card border border-border rounded-xl overflow-hidden"><div className="p-4 border-b border-border"><b>Quality Control</b><p className="text-xs text-muted-foreground mt-1">المكالمات التي تحتاج مراجعة: بدون نتيجة، بدون ملاحظات، أو مدة قصيرة جداً.</p></div>{filteredCalls.filter(c=>!c.outcome||!c.notes||(c.call_duration||0)<20).slice(0,100).map(c=><div key={c.id} className="p-4 border-b border-border/60 flex flex-col md:flex-row gap-2 md:items-center"><div className="flex-1"><b>{c.contact_name||'Unknown'}</b><span className="text-xs text-muted-foreground"> · {name(c.assigned_user_id)}</span></div><span className="text-xs">مدة: {c.call_duration||0}s</span><span className="text-xs">{c.outcome?'Outcome ✓':'Outcome ناقص'}</span><span className="text-xs">{c.notes?'Notes ✓':'Notes ناقصة'}</span></div>)}{!filteredCalls.some(c=>!c.outcome||!c.notes||(c.call_duration||0)<20)&&<div className="p-10 text-center text-positive">لا توجد مكالمات تحتاج مراجعة.</div>}</div>}

  {tab==='followups'&&<div className="bg-card border border-border rounded-xl p-5"><p className="text-sm text-muted-foreground">شيت المتابعات مرتبط حالياً ببيانات الـLeads؛ افتح Sales Reports للحصول على فلترة وتصدير تفاصيل المتابعات.</p><a href="/sales-reports" className="inline-block mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground">فتح Sales Reports</a></div>}
 </div></AppLayout></AuthGuard>
}
