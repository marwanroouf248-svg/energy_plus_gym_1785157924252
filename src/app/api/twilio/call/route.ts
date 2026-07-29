import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const to = String(body.to ?? "");
    if (!to) {
      return NextResponse.json({ error: "missing 'to' number" }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    // Twilio integration removed — return a demo call response instead.
    // The client will simulate the call lifecycle when it receives a demo callSid.
    const demoSid = `CA_demo_${Date.now()}`;
    return NextResponse.json({ ok: true, sid: demoSid, status: 'initiated', demo: true });
  } catch (err: any) {
    console.error("twilio call error:", err);
    const msg = err?.message ?? "failed to create call";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
