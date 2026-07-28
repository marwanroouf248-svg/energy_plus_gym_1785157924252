-- Staff Management: Admin RLS policies for user_profiles

-- Allow admins to INSERT new user profiles (for creating staff accounts)
DROP POLICY IF EXISTS "admin_insert_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_insert_user_profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'admin'
  )
);

-- Allow admins to UPDATE any user profile (role, status, branch)
DROP POLICY IF EXISTS "admin_update_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_update_user_profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'admin'
  )
);

-- Allow admins to DELETE user profiles
DROP POLICY IF EXISTS "admin_delete_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_delete_user_profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'admin'
  )
);
