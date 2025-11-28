-- Fix RLS Policy for projects table
-- Run this in Supabase SQL Editor

-- Drop existing policy
DROP POLICY IF EXISTS "Allow public access to projects" ON projects;

-- Recreate policy with proper permissions
CREATE POLICY "Enable all access for anon users"
ON projects
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Also allow authenticated users (for future)
CREATE POLICY "Enable all access for authenticated users"
ON projects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
