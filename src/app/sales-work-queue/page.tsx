'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Lead = {
  id:string; name:string; phone:string; source:string; source_category:string|null;
  status:string; notes:string; next_action:string|null; next_follow_up_at:string|null;
  tour_at:string|null; tour_status:string|null; assigned_to:string|null; user_id:string|null;
};

const SOURCES = [
  ['all','الكل'],['expired','Expired'],['old','Old'],['social_media','Social Media'],
  ['invitation','Invitation'],['tour','Tour'],['follow_up','Follow-up']
];
const OUTCOMES = [
  ['no_answer','No Answer'],['connected','Connected'],['interested','Interested'],
  ['not_interested','Not Interested'],['call_back','Call Back'],['appointment','Appointment'],
  ['tour','Tour'],['joined','Joined'],['price_objection','Price Objection'],
  ['timing_objection','Timing Objection'],['competitor','Competitor'],['wrong_number','Wrong Number'],
  ['do_not_call','Do Not Call']
];
const SCRIPTS:Record<string,string> = {
 expired:'أهلاً أ/ {name}، معاك من Energy Plus. كنت بتتعامل معانا قبل كده وحابب أتابع معاك لأن عندنا خيارات اشتراك متاحة حالياً. إيه اللي يناسبك أكتر: زيارة سريعة للنادي ولا أعرفك بالأسعار والباقات؟',
 old:'أهلاً أ/ {name}، معاك من Energy Plus. بنراجع العملاء اللي تعاملوا معانا قبل كده وحبيت أعرف هل لسه مهتم ترجع تتمرن؟ أقدر أظبط لك زيارة ونشوف أنسب باقة.',
 social_media:'أهلاً أ/ {name}، معاك من Energy Plus. حضرتك كنت مهتم بالنادي على السوشيال ميديا، فحابب أعرف هدفك في التمرين وأساعدك تختار الباقة المناسبة.',
 invitation:'أهلاً أ/ {name}، معاك من Energy Plus. حضرتك جاي لنا عن طريق دعوة من أحد أعضائنا، وحبيت أرتب لك زيارة وتشوف النادي بنفسك.',
 tour:'أهلاً أ/ {name}، معاك من Energy Plus. بتابع معاك بخصوص الزيارة، هل مناسب نثبت ميعاد اليوم ولا بكرة؟',
 follow_up:'أهلاً أ/ {name}، معاك من Energy Plus. كنت بتابع معاك زي ما اتفقنا. هل نكمل على نفس العرض ونحدد ميعاد للزيارة؟'
};

export default function SalesWorkQueuePage(){
  const {user}=useAuth();
  const [leads,setLeads]=useState<Lead[]>([]);
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<Lead|null>(null);
  const [outcome,setOutcome]=useState('connected');
  const [notes,setNotes]=useState('');
  const [followUp,setFollowUp]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=async()=>{
    if(!user)return;
    setLoading(true);
    const supabase=createClient();
    const {data,error}=await supabase.from('leads').select('id,name,phone,source,source_category,status,notes,next_action,next_follow_up_at,tour_at,tour_status,assigned_to,user_id').eq('user_id',user.id).order('next_follow_up_at',{ascending:true,nullsFirst:false}).order('created_at',{ascending:false});
    if(error) toast.error(error.message); else setLeads((data||[]) as Lead[]);
    setLoading(false);
  };
  useEffect(()=>{load()},[user?.id]);

  const filtered=useMemo(()=>leads.filter(l=>{
    const src=l.source_category||'old';
    return (filter==='all'||src===filter) && (!search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search));
  }),[leads,filter,search]);

  const openLead=(l:Lead)=>{
    setSelected(l); setOutcome('connected'); setNotes(l.notes||''); setFollowUp(l.next_follow_up_at?new Date(l.next_follow_up_at).toISOString().slice(0,16):'');
  };

  const saveCall=async()=>{
    if(!selected||!user)return;
    setSaving(true);
    const supabase=createClient();
    const now=new Date().toISOString();
    const update:any={last_contacted_at:now,last_outcome:outcome,notes, next_follow_up_at:followUp?new Date(followUp).toISOString():null};
    if(outcome==='tour'||outcome==='appointment') { update.tour_status='scheduled'; update.next_action='tour'; }
    else if(outcome==='joined') { update.status='converted'; update.joined_at=now; update.next_action='joined'; }
    else if(outcome==='interested') { update.status='interested'; update.next_action='follow_up'; }
    else if(outcome==='not_interested'||outcome==='do_not_call') { update.status=outcome==='not_interested'?'not_interested':'lost'; }
    else { update.status='contacted'; update.next_action=followUp?'follow_up':'call_back'; }

    const {error:e1}=await supabase.from('call_logs').insert({lead_id:selected.id,agent_id:user.id,assigned_user_id:user.id,contact_name:selected.name,contact_phone:selected.phone,direction:'outbound',call_status:'completed',outcome,notes,assigned_to:selected.assigned_to||''});
    if(e1){toast.error(e1.message);setSaving(false);return;}
    const {error:e2}=await supabase.from('leads').update(update).eq('id',selected.id).eq('user_id',user.id);
    if(e2) toast.error(e2.message); else {toast.success('تم تسجيل المكالمة وتحديث الليد');setSelected(null);await load();}
    setSaving(false);
  };

  const script=(SCRIPTS[selected?.source_category||'old']||SCRIPTS.old).replace('{name}',selected?.name||'');

  return <AuthGuard><AppLayout currentPath="/sales-work-queue">
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-700 text-foreground">شغل المبيعات</h1><p className="text-sm text-muted-foreground">قائمة المكالمات اليومية — كل مكالمة تتحول إلى خطوة في الـCRM</p></div>
        <div className="flex gap-2"><a href="/sales-performance" className="px-4 py-2 rounded-lg border border-border text-sm">أدائي اليوم</a><button onClick={load} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">تحديث</button></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {SOURCES.map(([k,v])=><button key={k} onClick={()=>setFilter(k)} className={`rounded-xl border p-3 text-sm ${filter===k?'border-primary bg-primary/10':'border-border bg-card'}`}><div className="font-700">{v}</div><div className="text-xs text-muted-foreground mt-1">{k==='all'?leads.length:leads.filter(x=>(x.source_category||'old')===k).length} Lead</div></button>)}
      </div>

      <div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالاسم أو الهاتف..." className="flex-1 px-4 py-3 rounded-xl border border-border bg-background"/><a href="/call-tracking" className="px-4 py-3 rounded-xl border border-border">المكالمات</a></div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading?<div className="p-10 text-center">جاري التحميل...</div>:filtered.length===0?<div className="p-10 text-center text-muted-foreground">لا توجد Leads في القائمة.</div>:
        <div className="divide-y divide-border">{filtered.map(l=><div key={l.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><b>{l.name}</b><span className="text-[11px] px-2 py-1 rounded-full bg-primary/10">{l.source_category||'old'}</span></div><div className="text-sm text-muted-foreground mt-1">{l.phone} · {l.status}</div>{l.next_follow_up_at&&<div className="text-xs text-warning mt-1">متابعة: {new Date(l.next_follow_up_at).toLocaleString('ar-EG')}</div>}</div>
          <div className="flex gap-2"><a href={`tel:${l.phone}`} className="px-4 py-2 rounded-lg bg-positive text-white">اتصال</a><button onClick={()=>openLead(l)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">تسجيل المكالمة</button></div>
        </div>)}</div>}
      </div>
    </div>

    {selected&&<div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-3">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5" dir="rtl">
        <div className="flex justify-between gap-3"><div><h2 className="text-xl font-700">{selected.name}</h2><p className="text-sm text-muted-foreground">{selected.phone} · {selected.source_category||'old'}</p></div><button onClick={()=>setSelected(null)} className="text-muted-foreground">إغلاق</button></div>
        <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border"><div className="text-xs text-muted-foreground mb-2">سكريبت المكالمة</div><p className="text-sm leading-7">{script}</p></div>
        <div className="grid md:grid-cols-2 gap-3 mt-4"><div><label className="text-xs text-muted-foreground">نتيجة المكالمة</label><select value={outcome} onChange={e=>setOutcome(e.target.value)} className="w-full mt-1 px-3 py-3 rounded-lg border border-border bg-background">{OUTCOMES.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div><div><label className="text-xs text-muted-foreground">موعد المتابعة</label><input type="datetime-local" value={followUp} onChange={e=>setFollowUp(e.target.value)} className="w-full mt-1 px-3 py-3 rounded-lg border border-border bg-background"/></div></div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات المكالمة..." className="w-full mt-3 min-h-28 px-3 py-3 rounded-lg border border-border bg-background"/>
        <div className="flex gap-2 mt-4"><button disabled={saving} onClick={saveCall} className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-700">{saving?'جاري الحفظ...':'حفظ المكالمة'}</button><a href={`tel:${selected.phone}`} className="px-5 py-3 rounded-lg bg-positive text-white">اتصال الآن</a></div>
      </div>
    </div>}
  </AppLayout></AuthGuard>
}
