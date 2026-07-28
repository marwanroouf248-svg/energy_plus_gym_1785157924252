-- Energy Plus: Leads, Branches, Packages Migration

-- 1. Types
DROP TYPE IF EXISTS public.lead_status CASCADE;
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'interested', 'not_interested', 'converted', 'lost');

DROP TYPE IF EXISTS public.lead_source CASCADE;
CREATE TYPE public.lead_source AS ENUM ('walk_in', 'phone', 'social_media', 'referral', 'website', 'other');

-- 2. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'mixed',
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    manager_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Packages Table
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT DEFAULT '',
    duration_days INTEGER NOT NULL DEFAULT 30,
    price NUMERIC NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT DEFAULT '',
    branch TEXT NOT NULL DEFAULT '',
    source public.lead_source DEFAULT 'phone'::public.lead_source,
    status public.lead_status DEFAULT 'new'::public.lead_status,
    interested_package TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    assigned_to TEXT DEFAULT '',
    follow_up_date TEXT DEFAULT '',
    converted_at TIMESTAMPTZ,
    subscriber_id UUID REFERENCES public.subscribers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON public.branches(is_active);
CREATE INDEX IF NOT EXISTS idx_packages_branch_id ON public.packages(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_branch ON public.leads(branch);

-- 6. Functions
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_branches_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_packages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 7. Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- Branches: all authenticated users can read, only admins can write
DROP POLICY IF EXISTS "branches_select_all" ON public.branches;
CREATE POLICY "branches_select_all"
ON public.branches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "branches_insert_admin" ON public.branches;
CREATE POLICY "branches_insert_admin"
ON public.branches FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);

DROP POLICY IF EXISTS "branches_update_admin" ON public.branches;
CREATE POLICY "branches_update_admin"
ON public.branches FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);

DROP POLICY IF EXISTS "branches_delete_admin" ON public.branches;
CREATE POLICY "branches_delete_admin"
ON public.branches FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);

-- Packages: all authenticated users can read, only admins can write
DROP POLICY IF EXISTS "packages_select_all" ON public.packages;
CREATE POLICY "packages_select_all"
ON public.packages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "packages_insert_admin" ON public.packages;
CREATE POLICY "packages_insert_admin"
ON public.packages FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);

DROP POLICY IF EXISTS "packages_update_admin" ON public.packages;
CREATE POLICY "packages_update_admin"
ON public.packages FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);

DROP POLICY IF EXISTS "packages_delete_admin" ON public.packages;
CREATE POLICY "packages_delete_admin"
ON public.packages FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);

-- Leads: users manage own, admins see all
DROP POLICY IF EXISTS "leads_select_all" ON public.leads;
CREATE POLICY "leads_select_all"
ON public.leads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "leads_insert_own" ON public.leads;
CREATE POLICY "leads_insert_own"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "leads_update_own" ON public.leads;
CREATE POLICY "leads_update_own"
ON public.leads FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'))
WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'));

DROP POLICY IF EXISTS "leads_delete_own" ON public.leads;
CREATE POLICY "leads_delete_own"
ON public.leads FOR DELETE TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'));

-- 9. Triggers
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_leads_updated_at();

DROP TRIGGER IF EXISTS update_branches_updated_at ON public.branches;
CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION public.update_branches_updated_at();

DROP TRIGGER IF EXISTS update_packages_updated_at ON public.packages;
CREATE TRIGGER update_packages_updated_at
    BEFORE UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION public.update_packages_updated_at();

-- 10. Seed Data: Two branches
DO $$
BEGIN
    INSERT INTO public.branches (id, name, name_ar, type, address, phone, is_active)
    VALUES
        (gen_random_uuid(), 'فرع فودافون', 'فرع فودافون', 'male', 'شارع فودافون', '01000000001', true),
        (gen_random_uuid(), 'فرع الرخاوي', 'فرع الرخاوي', 'female', 'شارع الرخاوي', '01000000002', true)
    ON CONFLICT DO NOTHING;

    -- Seed default packages
    INSERT INTO public.packages (name, name_ar, duration_days, price, is_active)
    VALUES
        ('Monthly', 'شهري', 30, 350, true),
        ('Quarterly', 'ربع سنوي', 90, 950, true),
        ('6-Month', 'نصف سنوي', 180, 1800, true),
        ('Annual', 'سنوي', 365, 3200, true),
        ('Student', 'طلاب', 30, 200, true)
    ON CONFLICT DO NOTHING;
END $$;
