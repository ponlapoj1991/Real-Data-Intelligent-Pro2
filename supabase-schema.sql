-- ============================================
-- Simple Schema for Migration from IndexedDB
-- ============================================

-- Projects table (เก็บทั้งก้อนเหมือนเดิม)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  last_modified BIGINT NOT NULL,

  -- Store all data as JSONB (เหมือนเดิม)
  data JSONB DEFAULT '[]'::jsonb,
  columns JSONB DEFAULT '[]'::jsonb,
  transform_rules JSONB DEFAULT '[]'::jsonb,
  dashboard JSONB DEFAULT '[]'::jsonb,
  report_config JSONB DEFAULT '[]'::jsonb,
  ai_settings JSONB,
  ai_presets JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_last_modified ON projects(last_modified DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- Enable Row Level Security (RLS) - ตอนนี้ปิดไว้ก่อน เพื่อให้ทดสอบง่าย
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (public access)
CREATE POLICY "Allow public access to projects" ON projects
  FOR ALL USING (true) WITH CHECK (true);
