'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';

export type CallState = 'idle' | 'initiating' | 'ringing' | 'in-progress' | 'ended' | 'failed';

export interface CallContact {
  name: string;
  phone: string;
  type: 'subscriber' | 'lead';
  leadId?: string;
  agentId?: string;
  assignedTo?: string;
  assignedUserId?: string;
}

export interface CallEndedData {
  contact: CallContact;
  durationSeconds: number;
  durationFormatted: string;
  callSid: string | null;
  notes: string;
}

interface SoftphoneWidgetProps {
  contact: CallContact | null;
  onClose: () => void;
  onCallLogged?: () => void;
  onCallEnded?: (data: CallEndedData) => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function normalizeEgyptianPhone(phone: string) {
  const value = phone.replace(/[^0-9+]/g, '');
  if (value.startsWith('+')) return value;
  if (value.startsWith('00')) return '+' + value.slice(2);
  if (value.startsWith('0') && value.length === 11) return '+20' + value.slice(1);
  return value;
}

export default function SoftphoneWidget({ contact, onClose, onCallLogged, onCallEnded }: SoftphoneWidgetProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callSid, setCallSid] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState('');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micReady, setMicReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const callRef = useRef<Call | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const elapsedRef = useRef(0);
  const isMounted = useRef(true);
  const supabase = createClient();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      try { callRef.current?.disconnect(); } catch {}
      try { deviceRef.current?.destroy(); } catch {}
    };
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    startedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000);
      elapsedRef.current = seconds;
      setElapsed(seconds);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const getToken = async () => {
    const identity = `energyplus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const demo = typeof window !== 'undefined' && localStorage.getItem('energyplus_manager_demo') === 'true';
    const { data, error: fnError } = await supabase.functions.invoke('twilio-call/browser-token', {
      body: { identity },
      headers: demo ? { 'x-manager-demo': 'true' } : undefined,
    });
    if (fnError) throw new Error(fnError.message || 'Could not create browser calling token.');
    if (!data?.success || !data?.token) throw new Error(data?.error || 'Browser calling is not configured.');
    return data.token as string;
  };

  const initiateCall = async () => {
    if (!contact) return;
    setError(null);
    setCallState('initiating');
    setElapsed(0);
    elapsedRef.current = 0;
    stopTimer();

    try {
      const destination = normalizeEgyptianPhone(contact.phone);
      if (!destination) throw new Error('Invalid customer phone number.');

      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support microphone calling.');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicReady(true);

      const token = await getToken();
      const device = new Device(token, { logLevel: 1 });
      deviceRef.current = device;

      device.on('error', (deviceError) => {
        if (!isMounted.current) return;
        setCallState('failed');
        setError(deviceError.message || 'Browser calling connection failed.');
        stopTimer();
      });

      device.on('tokenWillExpire', async () => {
        try {
          const nextToken = await getToken();
          device.updateToken(nextToken);
        } catch {}
      });

      const call = await device.connect({ params: { To: destination } });
      callRef.current = call;
      const sid = call.parameters?.CallSid || null;
      setCallSid(sid);
      setCallState('ringing');

      if (sid) {
        await supabase.from('call_logs').upsert({
          lead_id: contact.leadId || null,
          agent_id: contact.agentId || contact.assignedUserId || null,
          contact_name: contact.name || destination,
          contact_phone: contact.phone,
          contact_type: contact.type || 'lead',
          direction: 'outbound',
          call_sid: sid,
          call_status: 'ringing',
          assigned_to: contact.assignedTo || '',
          assigned_user_id: contact.assignedUserId || null,
        }, { onConflict: 'call_sid' });
      }

      call.on('ringing', () => {
        if (isMounted.current) setCallState('ringing');
      });

      call.on('accept', async () => {
        if (!isMounted.current) return;
        setCallState('in-progress');
        startTimer();
        if (sid) await supabase.from('call_logs').update({ call_status: 'in-progress' }).eq('call_sid', sid);
      });

      call.on('disconnect', async () => {
        stopTimer();
        if (!isMounted.current) return;
        const finalSeconds = elapsedRef.current;
        if (sid) {
          await supabase.from('call_logs').update({
            call_status: 'completed',
            call_duration: finalSeconds,
            updated_at: new Date().toISOString(),
          }).eq('call_sid', sid);
        }
        setCallState('ended');
      });

      call.on('cancel', async () => {
        stopTimer();
        if (sid) await supabase.from('call_logs').update({ call_status: 'canceled' }).eq('call_sid', sid);
        if (isMounted.current) setCallState('failed');
      });

      call.on('reject', async () => {
        stopTimer();
        if (sid) await supabase.from('call_logs').update({ call_status: 'failed' }).eq('call_sid', sid);
        if (isMounted.current) setCallState('failed');
      });

      call.on('error', (callError) => {
        stopTimer();
        if (isMounted.current) {
          setCallState('failed');
          setError(callError.message || 'Call failed.');
        }
      });
    } catch (e) {
      stopTimer();
      if (isMounted.current) {
        setCallState('failed');
        setError(e instanceof Error ? e.message : 'Could not start the browser call.');
      }
    }
  };

  const endCall = () => {
    stopTimer();
    try { callRef.current?.disconnect(); } catch {}
    if (isMounted.current && callState !== 'ended') setCallState('ended');
  };

  const toggleMute = () => {
    const next = !muted;
    try { callRef.current?.mute(next); } catch {}
    setMuted(next);
  };

  const handleDone = async () => {
    if (callSid && notes.trim()) {
      await supabase.from('call_logs').update({ notes: notes.trim() }).eq('call_sid', callSid);
    }
    if (contact && onCallEnded) {
      onCallEnded({
        contact,
        durationSeconds: elapsedRef.current,
        durationFormatted: formatDuration(elapsedRef.current),
        callSid,
        notes,
      });
    }
    onCallLogged?.();
    onClose();
  };

  const handleClose = () => {
    stopTimer();
    try { callRef.current?.disconnect(); } catch {}
    try { deviceRef.current?.destroy(); } catch {}
    onClose();
  };

  if (!contact) return null;

  const isActive = callState === 'in-progress';
  const isRinging = callState === 'ringing';
  const isInitiating = callState === 'initiating';
  const isEnded = callState === 'ended' || callState === 'failed';

  const statusLabel = callState === 'failed' ? 'Call Failed'
    : isInitiating ? 'Connecting…'
    : isRinging ? 'Ringing…'
    : isActive ? 'Live Call'
    : isEnded ? 'Call Ended'
    : 'Browser Softphone';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
      <div className={`px-4 py-3 flex items-center justify-between ${isActive ? 'bg-positive/10' : isEnded ? 'bg-muted' : 'bg-primary/10'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-positive animate-pulse' : isRinging || isInitiating ? 'bg-warning animate-pulse' : isEnded ? 'bg-muted-foreground' : 'bg-primary'}`} />
          <span className="text-xs font-600 text-foreground uppercase tracking-wide">{statusLabel}</span>
        </div>
        <button onClick={handleClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
          <Icon name="XMarkIcon" size={16} />
        </button>
      </div>

      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary text-sm font-600">{contact.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
          </div>
          <div className="min-w-0">
            <p className="font-600 text-foreground text-sm truncate">{contact.name}</p>
            <p className="text-xs text-muted-foreground">{contact.phone}</p>
            <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-500 mt-0.5 bg-primary/10 text-primary">
              {contact.type === 'subscriber' ? 'Subscriber' : 'Lead'}
            </span>
          </div>
          {isActive && (
            <div className="ml-auto text-right">
              <p className="text-lg font-700 tabular-nums text-positive">{formatDuration(elapsed)}</p>
              <p className="text-xs text-muted-foreground">Real Duration</p>
            </div>
          )}
        </div>
      </div>

      {error && <div className="mx-4 mt-3 px-3 py-2 bg-negative-bg border border-negative/20 rounded-xl"><p className="text-xs text-negative">{error}</p></div>}

      <div className="px-4 py-4">
        {callState === 'idle' && (
          <button onClick={initiateCall} className="w-full flex items-center justify-center gap-2 py-3 bg-positive text-white rounded-xl font-600 text-sm">
            <Icon name="PhoneIcon" size={18} /> Start Real Call
          </button>
        )}

        {isInitiating && (
          <div className="flex items-center justify-center gap-2 py-3 bg-muted rounded-xl text-sm text-muted-foreground">
            <Icon name="PhoneIcon" size={16} className="animate-pulse" /> Connecting browser to phone network…
          </div>
        )}

        {isRinging && (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center justify-center py-3 bg-muted rounded-xl text-sm text-muted-foreground">Ringing customer…</div>
            <button onClick={endCall} className="w-12 h-12 bg-negative text-white rounded-xl flex items-center justify-center"><Icon name="PhoneXMarkIcon" size={18} /></button>
          </div>
        )}

        {isActive && (
          <div className="space-y-3">
            <div className="text-center py-1 text-xs text-positive">{micReady ? 'Microphone connected' : 'Microphone not connected'}</div>
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-500 ${muted ? 'bg-warning-bg text-warning border border-warning/20' : 'bg-muted text-foreground'}`}>
                <Icon name="MicrophoneIcon" size={16} /> {muted ? 'Unmute' : 'Mute'}
              </button>
              <button onClick={endCall} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-negative text-white rounded-xl text-sm font-600">
                <Icon name="PhoneXMarkIcon" size={16} /> End Call
              </button>
            </div>
          </div>
        )}

        {isEnded && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl">
              <Icon name="CheckCircleIcon" size={16} className="text-positive shrink-0" />
              <p className="text-xs text-muted-foreground">{callState === 'failed' ? 'Call failed — no fake timer was started.' : `Call ended · ${formatDuration(elapsedRef.current)}`}</p>
            </div>
            <textarea rows={2} placeholder="Add call notes…" value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm resize-none" />
            <button onClick={handleDone} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600">Done — Log This Call</button>
          </div>
        )}
      </div>
    </div>
  );
}
