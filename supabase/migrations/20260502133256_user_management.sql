-- ============================================================
-- JuiceOps — User Management for Direction Role
-- Adds admin RLS policy + helper function for Direction to manage all users
-- ============================================================

-- 1. Function: check if current user has direction role (using auth metadata to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_direction()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'direction'::public.user_role AND is_active = true
  )
$$;

-- 2. Function: check if current user has direction role via auth metadata (safe for user_profiles RLS)
CREATE OR REPLACE FUNCTION public.is_direction_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      raw_user_meta_data->>'role' = 'direction'
      OR raw_app_meta_data->>'role' = 'direction'
    )
  )
$$;

-- 3. Add Direction admin policy on user_profiles (Direction can manage ALL profiles)
DROP POLICY IF EXISTS "direction_manage_all_user_profiles" ON public.user_profiles;
CREATE POLICY "direction_manage_all_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_direction_from_auth())
WITH CHECK (public.is_direction_from_auth());

-- 4. Function: Admin create user via Supabase Auth (called from server-side)
-- This function allows direction to update profile data for any user
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  target_user_id UUID,
  new_full_name TEXT,
  new_role TEXT,
  new_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only direction can call this
  IF NOT public.is_direction() THEN
    RAISE EXCEPTION 'Access denied: Direction role required';
  END IF;

  UPDATE public.user_profiles
  SET
    full_name = new_full_name,
    role = new_role::public.user_role,
    is_active = new_is_active,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = target_user_id;
END;
$$;
