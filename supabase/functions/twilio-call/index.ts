// @ts-ignore: Deno global is available in Deno runtime
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function updateCallLog(callSid: string, updates: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/call_logs?call_sid=eq.${callSid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(updates),
  });
}

async function insertCallLog(data: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  return res.ok ? await res.json() : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    // ── POST /twilio-call/initiate ──────────────────────────────────────────
    if (req.method === 'POST' && path === 'initiate') {
      const { to, contactName, contactType, leadId, agentId, assignedTo, webhookBaseUrl, demo } = await req.json();

      if (!to) {
        return new Response(JSON.stringify({ error: 'Missing required field: to' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If caller requests demo mode, or Twilio is not configured, insert a demo call log
      if (demo === true || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        // Demo mode: insert a pending call log without real Twilio call
        const demoSid = `CA_demo_${Date.now()}`;
        await insertCallLog({
          lead_id: leadId || null,
          agent_id: agentId || null,
          contact_name: contactName || to,
          contact_phone: to,
          contact_type: contactType || 'lead',
          direction: 'outbound',
          call_sid: demoSid,
          call_status: 'initiated',
          assigned_to: assignedTo || '',
        });
        return new Response(JSON.stringify({ success: true, callSid: demoSid, demo: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const base = webhookBaseUrl || `${SUPABASE_URL}/functions/v1/twilio-call`;
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
      const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

      const formData = new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER,
        Url: `${base}/twiml`,
        StatusCallback: `${base}/status`,
        StatusCallbackMethod: 'POST',
        Record: 'true',
        RecordingStatusCallback: `${base}/recording`,
        RecordingStatusCallbackMethod: 'POST',
      });

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({ error: 'Twilio call failed', details: data }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await insertCallLog({
        lead_id: leadId || null,
        agent_id: agentId || null,
        contact_name: contactName || to,
        contact_phone: to,
        contact_type: contactType || 'lead',
        direction: 'outbound',
        call_sid: data.sid,
        call_status: 'initiated',
        assigned_to: assignedTo || '',
      });

      return new Response(JSON.stringify({ success: true, callSid: data.sid }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── POST /twilio-call/twiml ─────────────────────────────────────────────
    if (req.method === 'POST' && path === 'twiml') {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="ar-SA">مرحباً، يتم توصيلك الآن.</Say>
  <Dial record="record-from-answer" recordingStatusCallback="${SUPABASE_URL}/functions/v1/twilio-call/recording">
    <Number>${TWILIO_PHONE_NUMBER || ''}</Number>
  </Dial>
</Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    // ── POST /twilio-call/status ────────────────────────────────────────────
    if (req.method === 'POST' && path === 'status') {
      const body = await req.text();
      const params = new URLSearchParams(body);
      const callSid = params.get('CallSid') || '';
      const callStatus = params.get('CallStatus') || '';
      const callDuration = parseInt(params.get('CallDuration') || '0', 10);

      await updateCallLog(callSid, {
        call_status: callStatus,
        call_duration: callDuration,
      });

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // ── POST /twilio-call/recording ─────────────────────────────────────────
    if (req.method === 'POST' && path === 'recording') {
      const body = await req.text();
      const params = new URLSearchParams(body);
      const callSid = params.get('CallSid') || '';
      const recordingSid = params.get('RecordingSid') || '';
      const recordingUrl = params.get('RecordingUrl') || '';

      await updateCallLog(callSid, {
        recording_sid: recordingSid,
        recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
      });

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
