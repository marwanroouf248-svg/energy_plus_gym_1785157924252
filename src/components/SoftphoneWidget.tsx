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
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const isMounted = useRef(true);
  const supabase = createClient();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('softphone_demo_mode', demoMode ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [demoMode]);

  const startTimer = useCallback(() => {
    elapsedRef.current = 0;
    setElapsed(0);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const initiateCall = async () => {
    if (!contact) return;
    // Ensure webhook base URL is available in the client environment
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      if (isMounted.current) {
        setCallState('failed');
        setError('Missing NEXT_PUBLIC_SUPABASE_URL. Set this env var and redeploy.');
      }
      return;
    }
    setCallState('initiating');
    setError(null);

    // Client-side demo mode: insert a demo call log and simulate call lifecycle
    if (demoMode) {
      const demoSid = `CA_demo_${Date.now()}`;
      try {
        await supabase.from('call_logs').insert({
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
      } catch (e) {
        console.error('Failed to insert demo call log:', e);
      }

      if (isMounted.current) {
        setCallSid(demoSid);
        setCallState('ringing');
      }

      setTimeout(() => {
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
          agentId: contact.agentId || null,
          assignedTo: contact.assignedTo || '',
          assignedUserId: contact.assignedUserId || null,
          webhookBaseUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/twilio-call`,
          // Force demo/simulation mode so calls can be initiated without a Twilio account
          demo: true,
        },
      });

      if (fnError) {
        // Log details for debugging and show a more informative message to the user
        // Attempt to extract useful info from the function response
        console.error('twilio-call function error:', fnError, data);
        const serverMsg = (data && (data.error?.details || data.error || data.message)) || fnError.message || 'Failed to initiate call. Check Twilio configuration.';

        if (isMounted.current) {
          setCallState('failed');
          setError(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));
        }

        // Fallback: insert a failed call log record so the call is visible in the UI
        try {
          await supabase.from('call_logs').insert({
            lead_id: contact.leadId || null,
            agent_id: contact.agentId || null,
            contact_name: contact.name || contact.phone,
            contact_phone: contact.phone,
            contact_type: contact.type || 'lead',
            direction: 'outbound',
            call_sid: null,
            call_status: 'failed',
            assigned_to: contact.assignedTo || '',
          });
        } catch (e) {
          console.error('Failed to insert fallback call log:', e);
        }

        return;
      }

      if (isMounted.current) {
        setCallSid(data?.callSid || null);
        setCallState('ringing');
      }

      // Simulate ringing → in-progress after 3s (real status comes via webhook)
      setTimeout(() => {
        if (isMounted.current) {
          setCallState('in-progress');
          startTimer();
        }
      }, 3000);
    } catch {
      if (isMounted.current) {
        setCallState('failed');
        setError('Network error. Please try again.');
      }
    }
  };

  const endCall = async () => {
    stopTimer();
    const finalElapsed = elapsedRef.current;
    if (isMounted.current) setCallState('ended');

    if (callSid) {
      const payload: Record<string, unknown> = {
        call_status: 'completed',
        call_duration: finalElapsed,
      };
      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      await supabase
        .from('call_logs')
        .update(payload)
        .eq('call_sid', callSid);
    }

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
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${isActive ? 'bg-positive/10' : isEnded ? 'bg-muted' : 'bg-primary/10'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-positive animate-pulse' : isRinging || isInitiating ? 'bg-warning animate-pulse' : isEnded ? 'bg-muted-foreground' : 'bg-primary'}`} />
          <span className="text-xs font-600 text-foreground uppercase tracking-wide">
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDemoMode(!demoMode)}
            title={demoMode ? 'Demo mode (click to switch to Live)' : 'Live mode (click to switch to Demo)'}
            className={`px-2 py-1 rounded-md text-xs font-600 border ${demoMode ? 'bg-warning-bg text-warning border-warning/20' : 'bg-card text-foreground border-border'}`}
          >
            {demoMode ? 'Demo' : 'Live'}
          </button>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
          >
            <Icon name="XMarkIcon" size={16} />
          </button>
        </div>
      </div>

      {/* Contact Info */}
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
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-negative-bg border border-negative/20 rounded-xl">
          <p className="text-xs text-negative">{error}</p>
        </div>
      )}

      {/* Call Controls */}
      <div className="px-4 py-4">
        {callState === 'idle' && (
          <button
            onClick={initiateCall}
            className="w-full flex items-center justify-center gap-2 py-3 bg-positive text-white rounded-xl font-600 text-sm hover:bg-positive/90 active:scale-95 transition-all duration-150"
          >
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
            <button
              onClick={endCall}
              className="flex items-center justify-center w-12 h-12 bg-negative text-white rounded-xl hover:bg-negative/90 active:scale-95 transition-all duration-150"
              title="Cancel call"
            >
              <Icon name="PhoneXMarkIcon" size={18} />
            </button>
          </div>
        )}

        {isActive && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMuted(!muted)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-500 transition-all duration-150 ${muted ? 'bg-warning-bg text-warning border border-warning/20' : 'bg-muted text-foreground hover:bg-muted/80'}`}
              >
                <Icon name="MicrophoneIcon" size={16} />
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={endCall}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-negative text-white rounded-xl text-sm font-600 hover:bg-negative/90 active:scale-95 transition-all duration-150"
              >
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
              <textarea
                rows={2}
                placeholder="Add call notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 resize-none"
              />
            </div>
            <button
              onClick={handleDone}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 active:scale-95 transition-all duration-150"
            >
              Done — Log This Call
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
