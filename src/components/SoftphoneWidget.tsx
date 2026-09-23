'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SoftphoneWidget({ contact, onClose, onCallLogged, onCallEnded }: SoftphoneWidgetProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callSid, setCallSid] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState('');
  const [muted, setMuted] = useState(false);
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('softphone_demo_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const isMounted = useRef(true);
  const supabase = createClient();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('softphone_demo_mode', demoMode ? 'true' : 'false');
    } catch {}
  }, [demoMode]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    startedAtRef.current = Date.now();
    elapsedRef.current = 0;
    setElapsed(0);
    timerRef.current = setInterval(() => {
      const seconds = Math.max(0, Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000));
      elapsedRef.current = seconds;
      setElapsed(seconds);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollCallStatus = useCallback((sid: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('call_logs')
        .select('call_status,call_duration,recording_url')
        .eq('call_sid', sid)
        .maybeSingle();

      if (!data || !isMounted.current) return;

      const status = String(data.call_status || '').toLowerCase();
      if (['in-progress', 'answered'].includes(status)) {
        if (callState !== 'in-progress') setCallState('in-progress');
        if (!timerRef.current) startTimer();
      }

      if (['completed', 'busy', 'no-answer', 'canceled', 'failed'].includes(status)) {
        stopPolling();
        stopTimer();
        if (typeof data.call_duration === 'number' && data.call_duration > 0) {
          elapsedRef.current = data.call_duration;
          setElapsed(data.call_duration);
        }
        setCallState(status === 'completed' ? 'ended' : 'failed');
      }
    }, 1000);
  }, [callState, startTimer, stopPolling, stopTimer, supabase]);

  const initiateCall = async () => {
    if (!contact) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setCallState('failed');
      setError('Missing NEXT_PUBLIC_SUPABASE_URL.');
      return;
    }

    setCallState('initiating');
    setError(null);
    stopTimer();
    stopPolling();
    elapsedRef.current = 0;
    setElapsed(0);

    if (demoMode) {
      const demoSid = `CA_demo_${Date.now()}`;
      const { error: logError } = await supabase.from('call_logs').insert({
        lead_id: contact.leadId || null,
        agent_id: contact.agentId || null,
        contact_name: contact.name || contact.phone,
        contact_phone: contact.phone,
        contact_type: contact.type || 'lead',
        direction: 'outbound',
        call_sid: demoSid,
        call_status: 'initiated',
        assigned_to: contact.assignedTo || '',
      });
      if (logError) {
        setCallState('failed');
        setError(logError.message);
        return;
      }
      setCallSid(demoSid);
      setCallState('ringing');
      window.setTimeout(() => {
        if (isMounted.current) {
          setCallState('in-progress');
          startTimer();
        }
      }, 3000);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('twilio-call/initiate', {
        body: {
          to: contact.phone,
          contactName: contact.name,
          contactType: contact.type,
          leadId: contact.leadId || null,
          agentId: contact.agentId || contact.assignedUserId || null,
          assignedTo: contact.assignedTo || '',
          assignedUserId: contact.assignedUserId || null,
          webhookBaseUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/twilio-call`,
        },
      });

      if (fnError) {
        setCallState('failed');
        setError(fnError.message || 'Failed to initiate call.');
        return;
      }

      if (!data?.success || !data?.callSid) {
        setCallState('failed');
        const details = data?.details?.message || data?.details?.code || data?.error || 'Call could not be started.';
        setError(String(details));
        return;
      }

      setCallSid(data.callSid);
      setCallState('ringing');
      pollCallStatus(data.callSid);
    } catch (e) {
      setCallState('failed');
      setError(e instanceof Error ? e.message : 'Network error. Please try again.');
    }
  };

  const endCall = async () => {
    stopPolling();
    stopTimer();
    const sid = callSid;
    const finalElapsed = elapsedRef.current;

    if (sid && !sid.startsWith('CA_demo_') && !sid.startsWith('CA_failed_')) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('twilio-call/end', {
          body: { callSid: sid },
        });
        if (fnError || data?.success === false) {
          setError(fnError?.message || data?.error || 'Could not end the live call.');
        }
      } catch {
        setError('Could not end the live call.');
      }
    }

    if (sid?.startsWith('CA_demo_')) {
      await supabase.from('call_logs').update({
        call_status: 'completed',
        call_duration: finalElapsed,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }).eq('call_sid', sid);
    }

    if (isMounted.current) setCallState('ended');
    onCallLogged?.();
  };

  const handleDone = () => {
    if (contact && onCallEnded) {
      onCallEnded({
        contact,
        durationSeconds: elapsedRef.current,
        durationFormatted: formatDuration(elapsedRef.current),
        callSid,
        notes,
      });
    }
    onClose();
  };

  const handleClose = () => {
    stopTimer();
    stopPolling();
    onClose();
  };

  if (!contact) return null;

  const isActive = callState === 'in-progress';
  const isRinging = callState === 'ringing';
  const isInitiating = callState === 'initiating';
  const isEnded = callState === 'ended' || callState === 'failed';
  const statusLabel = callState === 'failed'
    ? 'Call Failed'
    : isInitiating
      ? 'Initiating…'
      : isRinging
        ? 'Ringing…'
        : isActive
          ? 'Live Call'
          : isEnded
            ? 'Call Ended'
            : 'Softphone';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
      <div className={`px-4 py-3 flex items-center justify-between ${isActive ? 'bg-positive/10' : isEnded ? 'bg-muted' : 'bg-primary/10'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-positive animate-pulse' : isRinging || isInitiating ? 'bg-warning animate-pulse' : isEnded ? 'bg-muted-foreground' : 'bg-primary'}`} />
          <span className="text-xs font-600 text-foreground uppercase tracking-wide">{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDemoMode(!demoMode)}
            title={demoMode ? 'Demo mode (click to switch to Live)' : 'Live mode (click to switch to Demo)'}
            className={`px-2 py-1 rounded-md text-xs font-600 border ${demoMode ? 'bg-warning-bg text-warning border-warning/20' : 'bg-card text-foreground border-border'}`}
          >
            {demoMode ? 'Demo' : 'Live'}
          </button>
          <button onClick={handleClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150">
            <Icon name="XMarkIcon" size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary text-sm font-600">
              {contact.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-600 text-foreground text-sm truncate">{contact.name}</p>
            <p className="text-xs text-muted-foreground">{contact.phone}</p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-500 mt-0.5 ${contact.type === 'subscriber' ? 'bg-primary/10 text-primary' : 'bg-warning-bg text-warning'}`}>
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

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-negative-bg border border-negative/20 rounded-xl">
          <p className="text-xs text-negative">{error}</p>
        </div>
      )}

      <div className="px-4 py-4">
        {callState === 'idle' && (
          <button onClick={initiateCall} className="w-full flex items-center justify-center gap-2 py-3 bg-positive text-white rounded-xl font-600 text-sm hover:bg-positive/90 active:scale-95 transition-all duration-150">
            <Icon name="PhoneIcon" size={18} />
            Start Call
          </button>
        )}

        {(isInitiating || isRinging) && (
          <div className="flex items-center justify-center gap-3">
            <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-muted rounded-xl text-sm text-muted-foreground">
              <Icon name="PhoneIcon" size={16} className="animate-pulse" />
              {isInitiating ? 'Connecting…' : 'Ringing…'}
            </div>
            <button onClick={endCall} className="flex items-center justify-center w-12 h-12 bg-negative text-white rounded-xl hover:bg-negative/90 active:scale-95" title="Cancel call">
              <Icon name="PhoneXMarkIcon" size={18} />
            </button>
          </div>
        )}

        {isActive && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setMuted(!muted)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-500 ${muted ? 'bg-warning-bg text-warning border border-warning/20' : 'bg-muted text-foreground hover:bg-muted/80'}`}>
                <Icon name="MicrophoneIcon" size={16} />
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button onClick={endCall} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-negative text-white rounded-xl text-sm font-600">
                <Icon name="PhoneXMarkIcon" size={16} />
                End Call
              </button>
            </div>
          </div>
        )}

        {isEnded && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl">
              <Icon name="CheckCircleIcon" size={16} className="text-positive shrink-0" />
              <p className="text-xs text-muted-foreground">
                {callState === 'failed' ? 'Call failed.' : `Call ended · ${formatDuration(elapsedRef.current)}`}
              </p>
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Notes</label>
              <textarea rows={2} placeholder="Add call notes…" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
            </div>
            <button onClick={handleDone} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600">
              Done — Log This Call
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
