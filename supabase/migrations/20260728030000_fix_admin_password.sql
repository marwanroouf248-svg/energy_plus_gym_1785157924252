-- Fix admin account: force update password and confirm email for marwanroouf248@gmail.com

DO $$
DECLARE
    admin_uuid UUID;
BEGIN
    -- Get existing user ID if exists
    SELECT id INTO admin_uuid FROM auth.users WHERE email = 'marwanroouf248@gmail.com' LIMIT 1;

    IF admin_uuid IS NOT NULL THEN
        -- User exists — update password, confirm email, and ensure active
        UPDATE auth.users
        SET
            encrypted_password    = crypt('Marwan12345@', gen_salt('bf', 10)),
            email_confirmed_at    = COALESCE(email_confirmed_at, now()),
            confirmation_token    = '',
            recovery_token        = '',
            raw_user_meta_data    = jsonb_build_object('full_name', 'Marwan', 'role', 'admin'),
            raw_app_meta_data     = jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
            updated_at            = now(),
            is_sso_user           = false,
            is_anonymous          = false
        WHERE id = admin_uuid;

        RAISE NOTICE 'Admin user password updated for existing account: %', admin_uuid;
    ELSE
        -- User does not exist — create fresh
        admin_uuid := gen_random_uuid();

        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
            created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
            is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
            recovery_token, recovery_sent_at, email_change_token_new, email_change,
            email_change_sent_at, email_change_token_current, email_change_confirm_status,
            reauthentication_token, reauthentication_sent_at, phone, phone_change,
            phone_change_token, phone_change_sent_at
        ) VALUES (
            admin_uuid,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'marwanroouf248@gmail.com',
            crypt('Marwan12345@', gen_salt('bf', 10)),
            now(),
            now(),
            now(),
            jsonb_build_object('full_name', 'Marwan', 'role', 'admin'),
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
            false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
        );

        RAISE NOTICE 'Admin user created fresh with id: %', admin_uuid;
    END IF;

    -- Ensure user_profiles row exists with role = admin
    INSERT INTO public.user_profiles (id, email, full_name, role, is_active, created_at, updated_at)
    VALUES (
        admin_uuid,
        'marwanroouf248@gmail.com',
        'Marwan',
        'admin'::public.user_role,
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE
        SET role      = 'admin'::public.user_role,
            full_name = CASE WHEN EXCLUDED.full_name = '' OR public.user_profiles.full_name IS NULL
                             THEN 'Marwan'
                             ELSE public.user_profiles.full_name END,
            is_active = true,
            updated_at = now();

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Admin fix migration failed: %', SQLERRM;
END $$;
