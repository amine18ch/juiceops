-- Migration: Fix chambres_froides RLS policies
-- Timestamp: 20260502202000
-- Issue: FOR ALL policy with USING clause was blocking INSERT/UPDATE/DELETE
-- Fix: Replace with explicit separate policies per operation

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "chambres_froides_read_all" ON public.chambres_froides;
DROP POLICY IF EXISTS "chambres_froides_write_direction_manager" ON public.chambres_froides;

-- Re-enable RLS (idempotent)
ALTER TABLE public.chambres_froides ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can read chambres_froides
CREATE POLICY "chambres_froides_select_authenticated"
ON public.chambres_froides
FOR SELECT
TO authenticated
USING (true);

-- INSERT: only direction and manager_production can create chambres_froides
CREATE POLICY "chambres_froides_insert_direction_manager"
ON public.chambres_froides
FOR INSERT
TO authenticated
WITH CHECK (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']));

-- UPDATE: only direction and manager_production can update chambres_froides
CREATE POLICY "chambres_froides_update_direction_manager"
ON public.chambres_froides
FOR UPDATE
TO authenticated
USING (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']))
WITH CHECK (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']));

-- DELETE: only direction and manager_production can delete chambres_froides
CREATE POLICY "chambres_froides_delete_direction_manager"
ON public.chambres_froides
FOR DELETE
TO authenticated
USING (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']));
