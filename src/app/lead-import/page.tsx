'use client';

import React,{useState} from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/components/AuthGuard';
import {createClient} from '@/lib/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {toast} from 'sonner';

function normPhone(v:string){return v.replace(/\D/g,'').replace(/^20/,'').replace(/^0/,'');}
function parseCSV(text:string){
 const lines=text.split(/\r?\n/).filter(Boolean); if(!lines.length)return [];
 const split=(s:string)=>s.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x=>x.trim().replace(/^"|"$/g,''));
 const headers=split(lines[0]).map(x=>x.toLowerCase().trim());
 return lines.slice(1).map((line,i)=>{const vals=split(line);const r:any={row:i+2};headers.forEach((h,j)=>r[h]=vals[j]||'');return r});
}
function sourceFor(r:any){const s=Object.values(r).join(' ').toLowerCase(); if(/expired|منته|expired data/.test(s))return 'expired';if(/social|instagram|facebook|سوش/.test(s))return 'social_media';if(/invitation|invite|دعوة|referr/.test(s))return 'invitation';if(/tour|زيارة/.test(s))return 'tour';if(/follow|متابع/.test(s))return 'follow_up';return 'old'}
export default function LeadImportPage(){
 const {user}=useAuth();const [file,setFile]=useState<File|null>(null);const [rows,setRows]=useState<any[]>([]);const [busy,setBusy]=useState(false);const [result,setResult]=useState<any>(null);
 const load=(f:File)=>{setFile(f);const reader=new FileReader();reader.onload=()=>setRows(parseCSV(String(reader.result||'')));reader.readAsText(f,'UTF-8')};
 const importNow=async()=>{if(!user||!rows.length||!file)return;setBusy(true);const s=createClient();let imported=0,dupes=0,failed=0;
  const {data:batch,error:be}=await s.from('lead_import_batches').insert({user_id:user.id,file_name:file.name,total_rows:rows.length}).select().single();if(be){toast.error(be.message);setBusy(false);return}
  for(const r of rows){try{const name=r.name||r.fullname||r['full name']||r['الاسم']||'Lead';const phone=r.phone||r.mobile||r['phone number']||r['رقم الهاتف']||'';const np=normPhone(phone);if(!np){failed++;continue}
   const {data:existing}=await s.from('leads').select('id').eq('normalized_phone',np).limit(1);if(existing?.length){dupes++;continue}
   const src=sourceFor(r);const {data:lead,error}=await s.from('leads').insert({user_id:user.id,name,phone,email:r.email||'',branch:r.branch||'',source:src==='social_media'?'social_media':src==='invitation'?'referral':'other',source_category:src,status:'new',notes:r.notes||''}).select('id').single();if(error)throw error;
   imported++;await s.from('lead_import_rows').insert({batch_id:batch.id,row_number:r.row,raw_data:r,normalized_phone:np,status:'imported',lead_id:lead?.id});
  }catch(e:any){failed++;await s.from('lead_import_rows').insert({batch_id:batch.id,row_number:r.row,raw_data:r,status:'failed',error_message:e.message})}}
  await s.from('lead_import_batches').update({imported_rows:imported,duplicate_rows:dupes,failed_rows:failed}).eq('id',batch.id);setResult({imported,dupes,failed});setBusy(false);toast.success('تم استيراد البيانات');};
 return <AuthGuard><AppLayout currentPath="/lead-import"><div dir="rtl" className="space-y-6">
 <div><h1 className="text-2xl font-700">استيراد Leads</h1><p className="text-sm text-muted-foreground mt-1">ارفع CSV وسيتم اكتشاف المصدر ومنع تكرار أرقام الهاتف.</p></div>
 <div className="bg-card border border-border rounded-2xl p-6"><input type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&load(e.target.files[0])} className="w-full"/>
 {file&&<div className="mt-4 text-sm">الملف: <b>{file.name}</b> — {rows.length} صف</div>}
 <button disabled={!rows.length||busy} onClick={importNow} className="mt-4 px-5 py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-50">{busy?'جاري الاستيراد...':'استيراد الآن'}</button></div>
 {result&&<div className="grid grid-cols-3 gap-3">{[['تم الاستيراد',result.imported],['مكرر',result.dupes],['فشل',result.failed]].map(x=><div key={String(x[0])} className="bg-card border border-border rounded-xl p-4 text-center"><div className="text-2xl font-700">{x[1]}</div><div className="text-xs text-muted-foreground">{x[0]}</div></div>)}</div>}
 <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted-foreground">الصيغة المقترحة للأعمدة: <b>name, phone, email, branch, source, notes</b>. ويمكن للنظام التعامل مع أسماء أعمدة شائعة بالعربي والإنجليزي.</div>
 </div></AppLayout></AuthGuard>
}