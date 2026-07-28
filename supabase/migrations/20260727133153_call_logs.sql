-- Call Logs Migration: Click-to-Call & Cloud Recording
-- Creates call_logs table for storing Twilio call data

-- 1. Types (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.call_status AS ENUM ('initiated', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled');
  END IF;
END$$;

-- 2. Core Table
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT,
  agent_id TEXT,
  contact_name TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_type TEXT NOT NULL DEFAULT 'lead',
  direction TEXT NOT NULL DEFAULT 'outbound',
  call_sid TEXT UNIQUE,
  call_duration INTEGER DEFAULT 0,
  recording_url TEXT,
  recording_sid TEXT,
  notes TEXT DEFAULT '',
  assigned_to TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add call_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'call_logs'
      AND column_name = 'call_status'
  ) THEN
    ALTER TABLE public.call_logs
      ADD COLUMN call_status public.call_status DEFAULT 'initiated'::public.call_status;
  END IF;
END$$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_id ON public.call_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON public.call_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON public.call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_status ON public.call_logs(call_status);

-- 5. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_call_logs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 6. Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - open access for preview mode (no auth required)
DROP POLICY IF EXISTS "call_logs_open_access" ON public.call_logs;
CREATE POLICY "call_logs_open_access"
ON public.call_logs
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 8. Trigger for updated_at
DROP TRIGGER IF EXISTS call_logs_updated_at ON public.call_logs;
CREATE TRIGGER call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_logs_updated_at();
