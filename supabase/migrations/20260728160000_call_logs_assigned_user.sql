-- Migration: Add assigned_user_id to call_logs for proper user-based filtering
-- Also add outcome column for storing call outcome separately from call_status

-- 1. Add assigned_user_id column to call_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'call_logs'
      AND column_name = 'assigned_user_id'
  ) THEN
    ALTER TABLE public.call_logs
      ADD COLUMN assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 2. Add outcome column for call outcome (separate from Twilio call_status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'call_logs'
      AND column_name = 'outcome'
  ) THEN
    ALTER TABLE public.call_logs
      ADD COLUMN outcome TEXT DEFAULT 'interested';
  END IF;
END$$;

-- 3. Index on assigned_user_id for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_call_logs_assigned_user_id ON public.call_logs(assigned_user_id);

-- 4. Update RLS: sales staff see only their own calls; admins/managers see all
-- Drop existing open-access policy
DROP POLICY IF EXISTS "call_logs_open_access" ON public.call_logs;

-- Select: own calls OR admin/manager
DROP POLICY IF EXISTS "call_logs_select" ON public.call_logs;
CREATE POLICY "call_logs_select"
ON public.call_logs FOR SELECT TO authenticated
USING (
  assigned_user_id = auth.uid()
  OR public.is_admin_from_auth()
  OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'branch_manager')
  )
);

-- Insert: authenticated users can insert (their own calls)
DROP POLICY IF EXISTS "call_logs_insert" ON public.call_logs;
CREATE POLICY "call_logs_insert"
ON public.call_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Update: own calls OR admin
DROP POLICY IF EXISTS "call_logs_update" ON public.call_logs;
CREATE POLICY "call_logs_update"
ON public.call_logs FOR UPDATE TO authenticated
USING (
  assigned_user_id = auth.uid()
  OR public.is_admin_from_auth()
  OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'branch_manager')
  )
);

-- Delete: own calls OR admin
DROP POLICY IF EXISTS "call_logs_delete" ON public.call_logs;
CREATE POLICY "call_logs_delete"
ON public.call_logs FOR DELETE TO authenticated
USING (
  assigned_user_id = auth.uid()
  OR public.is_admin_from_auth()
  OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'branch_manager')
  )
);

-- Also allow service role (Twilio webhook) to update/insert without auth
DROP POLICY IF EXISTS "call_logs_service_role" ON public.call_logs;
CREATE POLICY "call_logs_service_role"
ON public.call_logs FOR ALL TO service_role
USING (true)
WITH CHECK (true);
