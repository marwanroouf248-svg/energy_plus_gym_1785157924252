-- Energy Plus: Fix Admin RLS Policies
-- Uses auth.users metadata to avoid recursion on user_profiles

-- 1. Create safe admin check function (reads from auth.users, not user_profiles)
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
$$;

-- 2. Fix user_profiles admin policies (remove self-referencing recursion risk)
DROP POLICY IF EXISTS "admin_insert_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_insert_user_profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin_from_auth()
);

DROP POLICY IF EXISTS "admin_update_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_update_user_profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

DROP POLICY IF EXISTS "admin_delete_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_delete_user_profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_admin_from_auth());

-- 3. Fix packages admin policies
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

-- 4. Fix branches admin policies
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

-- 5. Fix leads admin policies (admin can manage all leads)
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

-- 6. Fix subscribers: admin can manage all subscribers
DROP POLICY IF EXISTS "admin_manage_all_subscribers" ON public.subscribers;
CREATE POLICY "admin_manage_all_subscribers"
ON public.subscribers
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());
