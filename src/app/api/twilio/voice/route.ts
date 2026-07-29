import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">Hello, connecting your call now.</Say>
  <!-- يمكنك استخدام <Dial> للربط برقم آخر أو <Record> لتسجيل مباشر -->
  <!-- مثال للتسجيل بعد رسالة -->
  <Record action="/api/twilio/recording" method="POST" maxLength="3600" playBeep="true" />
  <Say>Thank you. Goodbye.</Say>
</Response>`;
  return new NextResponse(twiml, { status: 200, headers: { "Content-Type": "text/xml" } });
}
