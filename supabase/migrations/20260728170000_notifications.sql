-- Notifications table for real-time notification system
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- info, warning, success, error
    is_read BOOLEAN NOT NULL DEFAULT false,
    link TEXT, -- optional navigation link
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
CREATE POLICY "users_read_own_notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins and managers can insert notifications for any user
DROP POLICY IF EXISTS "admins_insert_notifications" ON public.notifications;
CREATE POLICY "admins_insert_notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin_from_auth()
    OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'branch_manager')
    )
    OR user_id = auth.uid()
);

-- Admins can delete notifications
DROP POLICY IF EXISTS "admins_delete_notifications" ON public.notifications;
CREATE POLICY "admins_delete_notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin_from_auth()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_updated_at ON public.notifications;
CREATE TRIGGER notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notifications_updated_at();

-- Seed some sample notifications for existing users
DO $$
DECLARE
    admin_user_id UUID;
    sales_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM public.user_profiles WHERE role = 'admin' LIMIT 1;
    SELECT id INTO sales_user_id FROM public.user_profiles WHERE role IN ('sales', 'branch_manager') LIMIT 1;

    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read, created_at)
        VALUES
            (admin_user_id, 'Welcome to Energy Plus', 'Your notification system is now live and connected to the database.', 'success', false, NOW() - INTERVAL '2 minutes'),
            (admin_user_id, 'System Ready', 'All modules are operational. You can now receive real-time notifications.', 'info', false, NOW() - INTERVAL '5 minutes')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF sales_user_id IS NOT NULL AND sales_user_id != admin_user_id THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read, created_at)
        VALUES
            (sales_user_id, 'New Lead Assigned', 'A new lead has been assigned to you. Check your contacts.', 'info', false, NOW() - INTERVAL '10 minutes')
        ON CONFLICT (id) DO NOTHING;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Sample notifications insertion skipped: %', SQLERRM;
END $$;
