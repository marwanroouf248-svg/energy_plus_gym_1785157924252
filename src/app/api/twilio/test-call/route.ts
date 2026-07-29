import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const to = String(body?.to ?? "");

    if (!to) {
      return NextResponse.json({ error: "missing 'to' number" }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
    const from = process.env.TWILIO_PHONE_NUMBER ?? "";

    // Twilio removed — return demo response instead
    const demoSid = `CA_demo_${Date.now()}`;
    return NextResponse.json({ ok: true, sid: demoSid, status: 'initiated', demo: true });
  } catch (err: any) {
    console.error("create call error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "failed to create call", data: err },
      { status: 500 }
    );
  }
}
