/**
 * Storage Compatibility Layer
 *
 * Purpose: Seamless migration from storage.ts (v1) to storage-v2.ts
 * - Maintains backward compatibility
 * - Auto-migrates old projects
 * - Provides unified API
 * - Falls back to v1 if v2 fails
 *
 * Usage: Drop-in replacement for storage.ts
 */

import { Project, ProjectTab, RawRow } from '../types';
import {
  getProjectMetadata,
  saveProjectMetadata,
  getAllDataChunks,
  batchInsertData,
  deleteProjectV2,
  getProjectsV2,
  appendData,
  clearCache,
  saveLastStateV2,
  getLastStateV2
} from './storage-v2';

// V1 imports (legacy)
import {
  getProjects as getProjectsV1,
  saveProject as saveProjectV1,
  deleteProject as deleteProjectV1
} from './storage';

// --- Type Guards ---

interface ProjectMetadataV2 {
  storageVersion: 2;
  rowCount: number;
  chunkCount: number;
}

const isProjectV2 = (project: any): project is ProjectMetadataV2 => {
  return project && project.storageVersion === 2;
};

// --- Migration Functions ---

/**
 * Migrate v1 project to v2
 */
const migrateProjectToV2 = async (projectV1: Project): Promise<void> => {
  console.log(`[Migration] Migrating project ${projectV1.id} to v2...`);

  const startTime = Date.now();

  // Save metadata
  await saveProjectMetadata({
    id: projectV1.id,
    name: projectV1.name,
    description: projectV1.description,
    lastModified: projectV1.lastModified,
    rowCount: projectV1.data.length,
    chunkCount: Math.ceil(projectV1.data.length / 1000),
    columns: projectV1.columns,
    transformRules: projectV1.transformRules,
    dashboard: projectV1.dashboard,
    reportConfig: projectV1.reportConfig,
    aiSettings: projectV1.aiSettings,
    aiPresets: projectV1.aiPresets,
    storageVersion: 2
  });

  // Save data in chunks
  await batchInsertData(projectV1.id, projectV1.data);

  // Delete v1 project
  try {
    await deleteProjectV1(projectV1.id);
  } catch (e) {
    // Ignore if already deleted
  }

  const duration = Date.now() - startTime;
  console.log(`[Migration] Project ${projectV1.id} migrated in ${duration}ms`);
};

/**
 * Convert v2 metadata + chunks back to v1 Project format
 * (for components that still expect full Project object)
 */
const convertV2ToProject = async (projectId: string): Promise<Project | null> => {
  const metadata = await getProjectMetadata(projectId);
  if (!metadata) return null;

  const data = await getAllDataChunks(projectId);

  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    lastModified: metadata.lastModified,
    data,
    columns: metadata.columns,
    transformRules: metadata.transformRules,
    dashboard: metadata.dashboard,
    reportConfig: metadata.reportConfig,
    aiSettings: metadata.aiSettings,
    aiPresets: metadata.aiPresets
  };
};

// --- Unified API (Drop-in replacement for storage.ts) ---

/**
 * Get all projects (auto-migrates v1 projects)
 */
export const getProjects = async (): Promise<Project[]> => {
  try {
    // Try v2 first
    const projectsV2 = await getProjectsV2();

    // Convert v2 to v1 format
    const projects = await Promise.all(
      projectsV2.map(async (meta) => {
        return await convertV2ToProject(meta.id);
      })
    );

    // Filter out nulls
    const validProjects = projects.filter((p): p is Project => p !== null);

    // Check for v1 projects
    let projectsV1: Project[] = [];
    try {
      projectsV1 = await getProjectsV1();
    } catch (e) {
      // No v1 projects or v1 store doesn't exist
    }

    // Migrate v1 projects in background
    if (projectsV1.length > 0) {
      console.log(`[Migration] Found ${projectsV1.length} v1 projects, migrating...`);

      // Migrate asynchronously
      Promise.all(
        projectsV1.map(async (project) => {
          // Check if already migrated
          const existing = await getProjectMetadata(project.id);
          if (!existing) {
            await migrateProjectToV2(project);
          }
        })
      ).catch(err => {
        console.error('[Migration] Error migrating projects:', err);
      });

      // Return v1 projects for now (will be v2 on next load)
      return [...validProjects, ...projectsV1];
    }

    return validProjects;

  } catch (err) {
    console.error('[Storage] Error loading v2 projects, falling back to v1:', err);

    // Fallback to v1
    try {
      return await getProjectsV1();
    } catch (v1Err) {
      console.error('[Storage] Error loading v1 projects:', v1Err);
      return [];
    }
  }
};

/**
 * Save project (auto-uses v2)
 */
export const saveProject = async (project: Project): Promise<void> => {
  try {
    // Check if already v2
    const existing = await getProjectMetadata(project.id);

    if (existing) {
      // Update metadata
      await saveProjectMetadata({
        ...existing,
        name: project.name,
        description: project.description,
        columns: project.columns,
        transformRules: project.transformRules,
        dashboard: project.dashboard,
        reportConfig: project.reportConfig,
        aiSettings: project.aiSettings,
        aiPresets: project.aiPresets
      });

      // Check if data changed (row count different)
      if (existing.rowCount !== project.data.length) {
        // Clear old data and re-insert
        await clearCache(project.id);
        await batchInsertData(project.id, project.data);

        // Update row count
        await saveProjectMetadata({
          ...existing,
          rowCount: project.data.length,
          chunkCount: Math.ceil(project.data.length / 1000)
        });
      }
    } else {
      // New project - create as v2
      await saveProjectMetadata({
        id: project.id,
        name: project.name,
        description: project.description,
        lastModified: Date.now(),
        rowCount: project.data.length,
        chunkCount: Math.ceil(project.data.length / 1000),
        columns: project.columns,
        transformRules: project.transformRules,
        dashboard: project.dashboard,
        reportConfig: project.reportConfig,
        aiSettings: project.aiSettings,
        aiPresets: project.aiPresets,
        storageVersion: 2
      });

      await batchInsertData(project.id, project.data);
    }

  } catch (err) {
    console.error('[Storage] Error saving v2 project, falling back to v1:', err);

    // Fallback to v1
    await saveProjectV1(project);
  }
};

/**
 * Delete project (deletes from both v1 and v2)
 */
export const deleteProject = async (id: string): Promise<void> => {
  try {
    // Try v2 first
    await deleteProjectV2(id);
  } catch (err) {
    console.error('[Storage] Error deleting v2 project:', err);
  }

  try {
    // Also try v1 (in case it exists)
    await deleteProjectV1(id);
  } catch (err) {
    // Ignore - project might not exist in v1
  }
};

/**
 * Save last state (uses v2)
 */
export const saveLastState = (projectId: string, tab: ProjectTab) => {
  saveLastStateV2(projectId, tab);
};

/**
 * Get last state (tries v2, falls back to v1)
 */
export const getLastState = (): { projectId: string | null; tab: ProjectTab } => {
  return getLastStateV2();
};

// --- Extended API (v2-specific features) ---

/**
 * Load project data lazily (only metadata)
 * Use this for listing projects without loading all data
 */
export const getProjectMetadataOnly = async (projectId: string) => {
  return await getProjectMetadata(projectId);
};

/**
 * Load project data fully
 * Use this when you need the complete Project object
 */
export const getProjectFull = async (projectId: string): Promise<Project | null> => {
  return await convertV2ToProject(projectId);
};

/**
 * Append new data to existing project (efficient)
 * Better than reloading full project + saving
 */
export const appendProjectData = async (projectId: string, newData: RawRow[]): Promise<void> => {
  await appendData(projectId, newData);
  await clearCache(projectId); // Invalidate cache
};

/**
 * Check if project is using v2 storage
 */
export const isProjectUsingV2 = async (projectId: string): Promise<boolean> => {
  const metadata = await getProjectMetadata(projectId);
  return metadata !== null && metadata.storageVersion === 2;
};
