-- Energy Plus: Fix admin check to also read from user_profiles table
-- This ensures admin role stored in user_profiles is respected by RLS policies

-- Update is_admin_from_auth() to check BOTH auth.users metadata AND user_profiles table
CREATE OR REPLACE FUNCTION public.is_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
        raw_user_meta_data->>'role' = 'admin'
        OR raw_app_meta_data->>'role' = 'admin'
    )
)
OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
)
$$;

-- Also create a helper for branch_manager role check
CREATE OR REPLACE FUNCTION public.is_manager_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'branch_manager')
)
$$;

-- Re-apply packages policies to use updated function
DROP POLICY IF EXISTS "packages_insert_admin" ON public.packages;
CREATE POLICY "packages_insert_admin"
ON public.packages
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_from_auth());

DROP POLICY IF EXISTS "packages_update_admin" ON public.packages;
CREATE POLICY "packages_update_admin"
ON public.packages
FOR UPDATE
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

DROP POLICY IF EXISTS "packages_delete_admin" ON public.packages;
CREATE POLICY "packages_delete_admin"
ON public.packages
FOR DELETE
TO authenticated
USING (public.is_admin_from_auth());

-- Re-apply branches policies
DROP POLICY IF EXISTS "branches_insert_admin" ON public.branches;
CREATE POLICY "branches_insert_admin"
ON public.branches
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_from_auth());

DROP POLICY IF EXISTS "branches_update_admin" ON public.branches;
CREATE POLICY "branches_update_admin"
ON public.branches
FOR UPDATE
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

DROP POLICY IF EXISTS "branches_delete_admin" ON public.branches;
CREATE POLICY "branches_delete_admin"
ON public.branches
FOR DELETE
TO authenticated
USING (public.is_admin_from_auth());

-- Re-apply user_profiles admin policies
DROP POLICY IF EXISTS "admin_insert_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_insert_user_profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin_from_auth() OR id = auth.uid()
);

DROP POLICY IF EXISTS "admin_update_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_update_user_profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_from_auth() OR id = auth.uid())
WITH CHECK (public.is_admin_from_auth() OR id = auth.uid());

DROP POLICY IF EXISTS "admin_delete_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_delete_user_profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_admin_from_auth());

-- Re-apply leads policies
DROP POLICY IF EXISTS "leads_insert_own" ON public.leads;
CREATE POLICY "leads_insert_own"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() OR public.is_admin_from_auth()
);

DROP POLICY IF EXISTS "leads_update_own" ON public.leads;
CREATE POLICY "leads_update_own"
ON public.leads
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_from_auth())
WITH CHECK (user_id = auth.uid() OR public.is_admin_from_auth());

DROP POLICY IF EXISTS "leads_delete_own" ON public.leads;
CREATE POLICY "leads_delete_own"
ON public.leads
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_from_auth());

-- Re-apply subscribers admin policy
DROP POLICY IF EXISTS "admin_manage_all_subscribers" ON public.subscribers;
CREATE POLICY "admin_manage_all_subscribers"
ON public.subscribers
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Ensure audit_logs policies allow admin full access
DROP POLICY IF EXISTS "admin_read_audit_logs" ON public.audit_logs;
CREATE POLICY "admin_read_audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin_from_auth() OR public.is_manager_from_auth());

DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_insert_audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);
