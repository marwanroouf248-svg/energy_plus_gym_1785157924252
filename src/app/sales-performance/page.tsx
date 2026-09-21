"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TARGETS = [
  ["expired", "Expired Data", 25],
  ["old", "Old Data", 15],
  ["social_media", "Social Media", 15],
  ["invitation", "Invitation", 10],
  ["tour", "Tour", 10],
  ["follow_up", "Follow-up", 15],
] as const;

type Call = { contact_type: string | null; outcome: string | null; created_at: string };

export default function SalesPerformancePage() {
  const supabase = createClient();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const start = new Date(); start.setHours(0,0,0,0);
    const { data } = await supabase
      .from("call_logs")
      .select("contact_type,outcome,created_at")
      .eq("assigned_user_id", user.id)
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false });
    setCalls(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const count = (type: string) => calls.filter(c => c.contact_type === type).length;
  const connected = calls.filter(c => !["no_answer","wrong_number"].includes(c.outcome ?? "")).length;
  const appointments = calls.filter(c => ["appointment","tour"].includes(c.outcome ?? "")).length;
  const joined = calls.filter(c => c.outcome === "joined").length;
  const total = calls.length;

  const conversion = useMemo(() => total ? Math.round((joined / total) * 100) : 0, [total, joined]);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold">Sales Performance</h1><p className="text-sm text-slate-400">هدف الشيفت: 90 مكالمة خلال 8 ساعات</p></div>
          <button onClick={load} className="rounded-xl bg-blue-600 px-4 py-2 font-bold">تحديث</button>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Calls", total, "/ 90"],
            ["Connected", connected, ""],
            ["Appointments / Tours", appointments, ""],
            ["Joined", joined, ""],
            ["Conversion", conversion, "%"],
          ].map(([label, value, suffix]) => (
            <div key={label as string} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}{suffix}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-lg font-bold">Daily Call Target</h2>
          <div className="space-y-4">
            {TARGETS.map(([key, label, target]) => {
              const actual = count(key); const pct = Math.min(100, Math.round((actual / target) * 100));
              return <div key={key}>
                <div className="mb-1 flex justify-between text-sm"><span>{label}</span><b>{actual} / {target}</b></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: pct + "%" }} /></div>
              </div>;
            })}
          </div>
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-3 text-lg font-bold">KPI Flow</h2>
            <div className="space-y-2 text-sm text-slate-300">
              <p>Calls → Connected → Appointments → Tours → Joined → Rank-In</p>
              <p className="text-slate-500">المكالمات وحدها ليست التقييم النهائي؛ السيستم يتابع التحويل عبر المراحل.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-3 text-lg font-bold">Shift Status</h2>
            <p className="text-3xl font-bold">{Math.min(100, Math.round(total / 90 * 100))}%</p>
            <p className="mt-1 text-sm text-slate-400">{loading ? "جاري التحميل..." : total >= 90 ? "Target reached" : "Target in progress"}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
