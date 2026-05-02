-- ============================================================
-- JuiceOps — User Roles Migration
-- Roles: operateur, responsable_qualite, manager_production, direction
-- ============================================================

-- 1. ENUM TYPE
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM (
  'operateur',
  'responsable_qualite',
  'manager_production',
  'direction'
);

-- 2. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'operateur'::public.user_role,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 4. TRIGGER FUNCTION — auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operateur')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 6. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow reading all profiles (needed for admin/manager views)
DROP POLICY IF EXISTS "authenticated_read_all_profiles" ON public.user_profiles;
CREATE POLICY "authenticated_read_all_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

-- 8. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_user_profiles_updated ON public.user_profiles;
CREATE TRIGGER on_user_profiles_updated
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. MOCK DATA — 4 demo users, one per role
DO $$
DECLARE
  op_uuid UUID := gen_random_uuid();
  rq_uuid UUID := gen_random_uuid();
  mp_uuid UUID := gen_random_uuid();
  dir_uuid UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    (
      op_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'operateur@juiceops.fr', crypt('juiceops123', gen_salt('bf', 10)), now(), now(), now(),
      jsonb_build_object('full_name', 'Ahmed Benali', 'role', 'operateur'),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
      false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
    ),
    (
      rq_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'qualite@juiceops.fr', crypt('juiceops123', gen_salt('bf', 10)), now(), now(), now(),
      jsonb_build_object('full_name', 'Marie Leconte', 'role', 'responsable_qualite'),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
      false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
    ),
    (
      mp_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'manager@juiceops.fr', crypt('juiceops123', gen_salt('bf', 10)), now(), now(), now(),
      jsonb_build_object('full_name', 'Karim Ouali', 'role', 'manager_production'),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
      false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
    ),
    (
      dir_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'direction@juiceops.fr', crypt('juiceops123', gen_salt('bf', 10)), now(), now(), now(),
      jsonb_build_object('full_name', 'Sophie Durand', 'role', 'direction'),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
      false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
    )
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
