import { Project, ProjectTab } from '../types';
import { supabase } from './supabase';

const CONFIG_KEY = 'real_data_config_v1';

// Helper: Convert database row to Project type
const dbToProject = (row: any): Project => {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lastModified: row.last_modified,
    data: row.data || [],
    columns: row.columns || [],
    transformRules: row.transform_rules || undefined,
    dashboard: row.dashboard || undefined,
    reportConfig: row.report_config || undefined,
    aiSettings: row.ai_settings || undefined,
    aiPresets: row.ai_presets || undefined,
  };
};

// Helper: Convert Project to database row
const projectToDb = (project: Project) => {
  // Limit data to prevent timeout on large datasets
  // Store max 5000 rows for preview/dashboard purposes
  const limitedData = project.data.slice(0, 5000);

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    last_modified: project.lastModified,
    data: limitedData,  // Limited to 5000 rows
    columns: project.columns,
    transform_rules: project.transformRules,
    dashboard: project.dashboard,
    report_config: project.reportConfig,
    ai_settings: project.aiSettings,
    ai_presets: project.aiPresets,
    updated_at: new Date().toISOString(),
  };
};

// --- CRUD Operations with Supabase ---

export const getProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('last_modified', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw new Error(error.message);
  }

  return (data || []).map(dbToProject);
};

export const saveProject = async (project: Project): Promise<void> => {
  // Ensure lastModified is updated
  const updatedProject = {
    ...project,
    lastModified: Date.now()
  };

  const dbProject = projectToDb(updatedProject);

  const { error } = await supabase
    .from('projects')
    .upsert(dbProject, { onConflict: 'id' });

  if (error) {
    console.error('Error saving project:', error);
    throw new Error(error.message);
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting project:', error);
    throw new Error(error.message);
  }
};

// --- LocalStorage for UI Config (unchanged) ---

export const saveLastState = (projectId: string, tab: ProjectTab) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ projectId, tab }));
};

export const getLastState = (): { projectId: string | null, tab: ProjectTab } => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return { projectId: null, tab: ProjectTab.UPLOAD };
};
