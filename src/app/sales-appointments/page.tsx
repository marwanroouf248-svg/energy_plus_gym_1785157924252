'use client';

import React,{useEffect,useState} from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import {createClient} from '@/lib/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {toast} from 'sonner';

type Lead={id:string;name:string;phone:string};
type Appt={id:string;lead_id:string;sales_user_id:string;appointment_at:string;appointment_type:string;status:string;notes:string|null;lead?:Lead};

const STATUSES=['scheduled','confirmed','completed','attended','no_show','cancelled'];

export default function SalesAppointmentsPage(){
 const {user}=useAuth();
 const [apps,setApps]=useState<Appt[]>([]); const [leads,setLeads]=useState<Lead[]>([]);
 const [type,setType]=useState('tour'); const [leadId,setLeadId]=useState(''); const [at,setAt]=useState(''); const [notes,setNotes]=useState(''); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);

 const load=async()=>{
  if(!user)return; setLoading(true); const s=createClient();
  const [{data:a,error:ae},{data:l,error:le}]=await Promise.all([
   s.from('sales_appointments').select('id,lead_id,sales_user_id,appointment_at,appointment_type,status,notes,lead:leads(id,name,phone)').order('appointment_at',{ascending:true}),
   s.from('leads').select('id,name,phone').order('created_at',{ascending:false})
  ]);
  if(ae) toast.error(ae.message); if(le) toast.error(le.message); setApps((a||[]) as any); setLeads((l||[]) as Lead[]); setLoading(false);
 };
 useEffect(()=>{load()},[user?.id]);

 const createAppt=async()=>{
  if(!user||!leadId||!at){toast.error('اختار Lead وميعاد');return} setSaving(true); const s=createClient();
  const iso=new Date(at).toISOString();
  const {error}=await s.from('sales_appointments').insert({lead_id:leadId,sales_user_id:user.id,appointment_at:iso,appointment_type:type,status:'scheduled',notes});
  if(error) toast.error(error.message); else {
   const leadPatch:any={next_action:type==='tour'?'tour':'appointment',next_follow_up_at:iso};
   if(type==='tour'){leadPatch.tour_at=iso;leadPatch.tour_status='scheduled';}
   await s.from('leads').update(leadPatch).eq('id',leadId);
   toast.success('تم إنشاء الموعد'); setLeadId('');setAt('');setNotes('');await load();
  } setSaving(false);
 };
 const updateStatus=async(id:string,status:string)=>{
  const s=createClient(); const {error}=await s.from('sales_appointments').update({status}).eq('id',id);
  if(error) toast.error(error.message); else {toast.success('تم تحديث حالة الموعد');await load();}
  const ap=apps.find(x=>x.id===id); if(ap&&ap.lead_id&&ap.appointment_type==='tour'){
   const patch:any={tour_status:status};
   if(status==='completed'||status==='attended') patch.next_action='follow_up';
   if(status==='no_show') patch.next_action='tour';
   await s.from('leads').update(patch).eq('id',ap.lead_id);
  }
 };

 return <AuthGuard><AppLayout currentPath="/sales-appointments"><div dir="rtl" className="space-y-5">
  <div><h1 className="text-2xl font-700">Appointments & Tours</h1><p className="text-sm text-muted-foreground mt-1">من المكالمة إلى موعد، ثم Tour، ثم Joined</p></div>
  <div className="bg-card border border-border rounded-2xl p-4">
   <h2 className="font-700 mb-3">إنشاء موعد جديد</h2>
   <div className="grid md:grid-cols-4 gap-3">
    <select value={leadId} onChange={e=>setLeadId(e.target.value)} className="px-3 py-3 rounded-lg border border-border bg-background"><option value="">اختار Lead</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}</select>
    <select value={type} onChange={e=>setType(e.target.value)} className="px-3 py-3 rounded-lg border border-border bg-background"><option value="appointment">Appointment</option><option value="tour">Tour</option></select>
    <input type="datetime-local" value={at} onChange={e=>setAt(e.target.value)} className="px-3 py-3 rounded-lg border border-border bg-background"/>
    <button disabled={saving} onClick={createAppt} className="px-4 py-3 rounded-lg bg-primary text-primary-foreground font-700">{saving?'جاري الحفظ...':'حفظ الموعد'}</button>
   </div>
   <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات..." className="w-full mt-3 px-3 py-3 rounded-lg border border-border bg-background"/>
  </div>
  <div className="bg-card border border-border rounded-2xl overflow-hidden">
   {loading?<div className="p-10 text-center">جاري التحميل...</div>:apps.length===0?<div className="p-10 text-center text-muted-foreground">لا توجد مواعيد.</div>:
   <div className="divide-y divide-border">{apps.map(a=><div key={a.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
    <div className="flex-1"><div className="font-700">{a.lead?.name||'Lead'}</div><div className="text-sm text-muted-foreground">{a.lead?.phone} · {a.appointment_type} · {new Date(a.appointment_at).toLocaleString('ar-EG')}</div>{a.notes&&<div className="text-xs mt-1">{a.notes}</div>}</div>
    <select value={a.status} onChange={e=>updateStatus(a.id,e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background">{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>
   </div>)}</div>}
  </div>
 </div></AppLayout></AuthGuard>
}