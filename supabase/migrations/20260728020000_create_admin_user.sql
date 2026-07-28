-- Create admin account for marwanroouf248@gmail.com

DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
BEGIN
    -- Insert into auth.users (only if email does not already exist)
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
    )
    ON CONFLICT (email) DO NOTHING;

    -- Ensure the user_profiles row has role = admin
    -- (trigger handle_new_user creates it on INSERT, but update in case it already exists)
    UPDATE public.user_profiles
    SET role = 'admin'::public.user_role,
        full_name = CASE WHEN full_name = '' OR full_name IS NULL THEN 'Marwan' ELSE full_name END,
        is_active = true,
        updated_at = now()
    WHERE email = 'marwanroouf248@gmail.com';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Admin user creation failed: %', SQLERRM;
END $$;
