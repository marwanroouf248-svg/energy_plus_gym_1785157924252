'use client';

import React,{useEffect,useMemo,useState} from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import {createClient} from '@/lib/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {toast} from 'sonner';

type Lead={id:string;name:string;phone:string;source_category:string|null;status:string;user_id:string|null;last_outcome:string|null;next_follow_up_at:string|null;next_action:string|null};
type Call={id:string;created_at:string;contact_name:string|null;contact_phone:string|null;outcome:string|null;call_duration:number|null;call_status:string|null;lead_id:string|null;notes:string|null};
type App={id:string;appointment_at:string;appointment_type:string;status:string;lead_id:string|null};

const SOURCES=['expired','old','social_media','invitation','tour','follow_up'];
const label=(s:string)=>({expired:'Expired',old:'Old',social_media:'Social Media',invitation:'Invitation',tour:'Tour',follow_up:'Follow-up'}[s]||s);
const bad=(o:string|null)=>['no_answer','busy','failed','wrong_number','canceled'].includes(o||'');
const nextAction=(l:Lead)=>l.next_follow_up_at&&new Date(l.next_follow_up_at)<new Date()?'متابعة متأخرة — اتصل الآن':l.status==='new'?'اتصال أولي + تحديد احتياج':l.status==='interested'?'حجز Appointment / Tour':l.status==='contacted'?'Follow-up + اعتراض السعر/التوقيت':l.next_action||'مراجعة الحالة';

export default function SalesMyWork(){
 const {user}=useAuth();
 const [leads,setLeads]=useState<Lead[]>([]),[calls,setCalls]=useState<Call[]>([]),[apps,setApps]=useState<App[]>([]),[loading,setLoading]=useState(true);
 const [date]=useState(()=>new Date().toISOString().slice(0,10)),[selectedSource,setSelectedSource]=useState('all'),[showAll,setShowAll]=useState(false);

 const load=async()=>{
  if(!user?.id)return;setLoading(true);const s=createClient();
  const start=new Date(date+'T00:00:00').toISOString(),end=new Date(date+'T23:59:59.999').toISOString();
  const [{data:l,error:le},{data:c,error:ce},{data:a,error:ae}]=await Promise.all([
   s.from('leads').select('id,name,phone,source_category,status,user_id,last_outcome,next_follow_up_at,next_action').eq('user_id',user.id).order('created_at',{ascending:false}).range(0,9999),
   s.from('call_logs').select('id,created_at,contact_name,contact_phone,outcome,call_duration,call_status,lead_id,notes').eq('assigned_user_id',user.id).gte('created_at',start).lte('created_at',end).order('created_at',{ascending:false}).range(0,9999),
   s.from('sales_appointments').select('id,appointment_at,appointment_type,status,lead_id').eq('sales_user_id',user.id).gte('appointment_at',start).lte('appointment_at',end).order('appointment_at',{ascending:true}).range(0,9999)
  ]);
  const err=le||ce||ae;if(err){toast.error(err.message);setLoading(false);return}
  setLeads((l||[]) as Lead[]);setCalls((c||[]) as Call[]);setApps((a||[]) as App[]);setLoading(false);
 };
 useEffect(()=>{load();const t=setInterval(load,30000);return()=>clearInterval(t)},[user?.id,date]);

 const pace=useMemo(()=>{const h=new Date().getHours()+new Date().getMinutes()/60;return Math.min(90,Math.max(0,Math.round(((Math.max(0,Math.min(16,h)-8))/8)*90)))},[]);
 const connected=calls.filter(c=>!bad(c.outcome)).length;
 const joined=calls.filter(c=>['joined','converted'].includes(c.outcome||'')).length;
 const overdue=leads.filter(l=>l.next_follow_up_at&&new Date(l.next_follow_up_at)<new Date()&&!['converted','lost'].includes(l.status));
 const queue=useMemo(()=>leads.filter(l=>!['converted','lost'].includes(l.status)).filter(l=>selectedSource==='all'||(l.source_category||'old')===selectedSource).sort((a,b)=>{
  const overdueA=a.next_follow_up_at&&new Date(a.next_follow_up_at)<new Date()?0:1,overdueB=b.next_follow_up_at&&new Date(b.next_follow_up_at)<new Date()?0:1;
  if(overdueA!==overdueB)return overdueA-overdueB;
  return (a.next_follow_up_at?new Date(a.next_follow_up_at).getTime():Infinity)-(b.next_follow_up_at?new Date(b.next_follow_up_at).getTime():Infinity);
 }),[leads,selectedSource]);
 const visibleQueue=showAll?queue:queue.slice(0,12);

 return <AuthGuard><AppLayout currentPath="/sales-my-work"><div dir="rtl" className="space-y-5">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h1 className="text-2xl font-800">My Sales Work</h1><p className="text-sm text-muted-foreground mt-1">صفحة الموظف اليومية: هدفك، مكالماتك، المتابعات وأفضل إجراء تالي.</p></div><button onClick={load} className="px-4 py-2 rounded-lg border border-border">تحديث الآن</button></div>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
   <div className="bg-card border border-border rounded-xl p-4"><div className="text-2xl font-800">{calls.length}<span className="text-sm text-muted-foreground"> / 90</span></div><div className="text-xs text-muted-foreground mt-1">Calls Today</div><div className="text-xs mt-2">{calls.length>=pace?'داخل الـpace':'متأخر '+(pace-calls.length)+' عن الـpace'}</div></div>
   <div className="bg-card border border-border rounded-xl p-4"><div className="text-2xl font-800">{connected}</div><div className="text-xs text-muted-foreground mt-1">Connected</div><div className="text-xs mt-2">{calls.length?Math.round(connected/calls.length*100):0}% answer rate</div></div>
   <div className="bg-card border border-border rounded-xl p-4"><div className="text-2xl font-800">{overdue.length}</div><div className="text-xs text-muted-foreground mt-1">Overdue</div><div className="text-xs mt-2">متابعات لازم تتعمل الآن</div></div>
   <div className="bg-card border border-border rounded-xl p-4"><div className="text-2xl font-800">{joined}</div><div className="text-xs text-muted-foreground mt-1">Joined</div><div className="text-xs mt-2">من مكالمات اليوم</div></div>
  </div>

  <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
   <section className="bg-card border border-border rounded-xl overflow-hidden">
    <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-2"><div><b>⚡ Priority Call Queue</b><p className="text-xs text-muted-foreground mt-1">ابدأ بالأعلى أولوية. اضغط اتصال لفتح الهاتف مباشرة.</p></div><div className="flex gap-2"><select value={selectedSource} onChange={e=>setSelectedSource(e.target.value)} className="px-2 py-1.5 rounded-lg border border-border bg-background text-xs"><option value="all">كل المصادر</option>{SOURCES.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></div></div>
    {loading?<div className="p-10 text-center">جاري التحميل...</div>:visibleQueue.map((l,i)=><div key={l.id} className="p-4 border-b border-border/60 flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-800">{i+1}</div>
      <div className="flex-1 min-w-0"><div className="font-700 truncate">{l.name}</div><div className="text-xs text-muted-foreground">{l.phone} · {label(l.source_category||'old')}</div><div className="text-xs mt-1">{nextAction(l)}</div></div>
      <a href={'tel:'+l.phone} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-700">اتصال</a>
    </div>)}
    {!loading&&!visibleQueue.length&&<div className="p-10 text-center text-muted-foreground">مفيش Leads محتاجة إجراء حالياً.</div>}
    {queue.length>12&&<div className="p-3 text-center"><button onClick={()=>setShowAll(!showAll)} className="text-sm font-700">{showAll?'عرض أقل':'عرض كل الـqueue'}</button></div>}
   </section>

   <section className="space-y-4">
    <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="p-4 border-b border-border"><b>📅 Today Appointments</b></div>{apps.length?apps.map(a=><div key={a.id} className="p-3 border-b border-border/60"><b className="text-sm">{a.appointment_type}</b><div className="text-xs text-muted-foreground mt-1">{new Date(a.appointment_at).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})} · {a.status}</div></div>):<div className="p-6 text-center text-muted-foreground text-sm">لا توجد مواعيد اليوم.</div>}</div>
    <div className="bg-card border border-border rounded-xl p-4"><b>🎯 Closing Checklist</b><div className="space-y-2 mt-3 text-sm">{['أكمل 90 محاولة اتصال','سجل Outcome لكل مكالمة','سجل Notes بعد المكالمة','حدد Next Follow-up لكل Lead محتاج متابعة','راجع مواعيد الـTours قبل نهاية الشيفت'].map(x=><label key={x} className="flex items-center gap-2"><input type="checkbox" className="accent-primary"/><span>{x}</span></label>)}</div></div>
   </section>
  </div>

  <section className="bg-card border border-border rounded-xl overflow-hidden"><div className="p-4 border-b border-border"><b>🧾 My Call Log</b><p className="text-xs text-muted-foreground mt-1">آخر مكالماتك اليوم.</p></div>{calls.slice(0,30).map(c=><div key={c.id} className="p-3 border-b border-border/60 flex items-center gap-3 text-sm"><div className="flex-1"><b>{c.contact_name||'Unknown'}</b><div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleTimeString('ar-EG')} · {c.contact_phone||''}</div></div><span className="text-xs">{c.outcome||'بدون Outcome'}</span><span className="text-xs">{c.call_duration||0}s</span></div>)}{!calls.length&&<div className="p-8 text-center text-muted-foreground">لم يتم تسجيل مكالمات اليوم.</div>}</section>
 </div></AppLayout></AuthGuard>
}
