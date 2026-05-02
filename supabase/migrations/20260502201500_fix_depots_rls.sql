-- Migration: Fix depots RLS policies
-- Timestamp: 20260502201500
-- Issue: FOR ALL policy with USING clause was blocking INSERT/UPDATE/DELETE
-- Fix: Replace with explicit separate policies per operation

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "depots_read_all" ON public.depots;
DROP POLICY IF EXISTS "depots_write_direction_manager" ON public.depots;

-- Re-enable RLS (idempotent)
ALTER TABLE public.depots ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can read depots
CREATE POLICY "depots_select_authenticated"
ON public.depots
FOR SELECT
TO authenticated
USING (true);

-- INSERT: only direction and manager_production can create depots
CREATE POLICY "depots_insert_direction_manager"
ON public.depots
FOR INSERT
TO authenticated
WITH CHECK (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']));

-- UPDATE: only direction and manager_production can update depots
CREATE POLICY "depots_update_direction_manager"
ON public.depots
FOR UPDATE
TO authenticated
USING (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']))
WITH CHECK (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']));

-- DELETE: only direction and manager_production can delete depots
CREATE POLICY "depots_delete_direction_manager"
ON public.depots
FOR DELETE
TO authenticated
USING (public.has_role_direction_or_manager(ARRAY['direction', 'manager_production']));
