import {
  Project,
  RawTable,
  PrepConfig,
  Dashboard,
  MergingStrategy,
  RawRow,
  ColumnConfig,
  TransformationRule,
  DashboardWidget
} from '../types';

/**
 * Legacy Project Interface (before Asset-Based Architecture)
 */
export interface LegacyProject {
  id: string;
  name: string;
  description: string;
  lastModified: number;
  data: RawRow[];
  columns: ColumnConfig[];
  transformRules?: TransformationRule[];
  dashboard?: DashboardWidget[];
  reportConfig?: any;
  aiSettings?: any;
  aiPresets?: any;
}

/**
 * Generate unique ID (same logic as storage.ts)
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Check if a project uses legacy structure
 */
export function isLegacyProject(project: any): boolean {
  // Legacy project has 'data' field but no 'rawTables' field
  return (
    project.data !== undefined &&
    Array.isArray(project.data) &&
    project.rawTables === undefined
  );
}

/**
 * Migrate legacy project to Asset-Based Architecture
 */
export function migrateProjectToAssetBased(legacy: LegacyProject): Project {
  const now = Date.now();

  console.log('🔄 Starting migration for project:', legacy.name);

  // 1. Convert single dataset to Raw Table (Drawer 1)
  const rawTable: RawTable = {
    id: generateId(),
    name: 'Imported Data',
    fileName: 'legacy_data.csv',
    fileType: 'csv',
    data: legacy.data || [],
    columns: (legacy.columns || []).map(c => c.key),
    rowCount: (legacy.data || []).length,
    createdBy: 'System Migration',
    createdAt: legacy.lastModified || now,
    lastModified: now,
  };

  console.log('✅ Created Raw Table:', rawTable.name, `(${rawTable.rowCount} rows)`);

  // 2. Convert transform rules to Prep Config (Drawer 2)
  const prepConfigs: PrepConfig[] = [];
  if (legacy.transformRules && legacy.transformRules.length > 0) {
    const prepConfig: PrepConfig = {
      id: generateId(),
      name: 'Default Configuration',
      description: 'Migrated from legacy project',
      sourceTableIds: [rawTable.id],
      mergingStrategy: MergingStrategy.UNION,
      transformRules: legacy.transformRules,
      outputData: legacy.data || [], // Use original data (will recompute if needed)
      outputColumns: legacy.columns || [],
      createdAt: legacy.lastModified || now,
      lastModified: now,
    };
    prepConfigs.push(prepConfig);
    console.log('✅ Created Prep Config:', prepConfig.name);
  }

  // 3. Convert dashboard widgets to Dashboard
  const dashboards: Dashboard[] = [];
  if (legacy.dashboard && legacy.dashboard.length > 0) {
    // Determine default data source
    const defaultDataSource = prepConfigs.length > 0
      ? { type: 'prepped' as const, id: prepConfigs[0].id }
      : { type: 'raw' as const, id: rawTable.id };

    const dashboard: Dashboard = {
      id: generateId(),
      name: 'Main Dashboard',
      description: 'Migrated from legacy project',
      widgets: legacy.dashboard.map(widget => ({
        ...widget,
        dataSource: widget.dataSource || defaultDataSource, // Add data source binding
      })),
      createdAt: legacy.lastModified || now,
      lastModified: now,
    };
    dashboards.push(dashboard);
    console.log('✅ Created Dashboard:', dashboard.name, `(${dashboard.widgets.length} widgets)`);
  }

  // 4. Create new project structure
  const migratedProject: Project = {
    id: legacy.id,
    name: legacy.name,
    description: legacy.description,
    lastModified: now,

    // NEW: Asset-Based Architecture
    rawTables: [rawTable],
    prepConfigs,
    dashboards,

    // Existing features
    reportConfig: legacy.reportConfig,
    aiSettings: legacy.aiSettings,
    aiPresets: legacy.aiPresets,
  };

  console.log('✅ Migration completed successfully!');
  console.log('📊 Summary:');
  console.log(`   - Raw Tables: ${migratedProject.rawTables?.length || 0}`);
  console.log(`   - Prep Configs: ${migratedProject.prepConfigs?.length || 0}`);
  console.log(`   - Dashboards: ${migratedProject.dashboards?.length || 0}`);

  return migratedProject;
}

/**
 * Validate migrated project structure
 */
export function validateMigratedProject(project: Project): boolean {
  try {
    // Check required fields
    if (!project.id || !project.name) {
      console.error('❌ Validation failed: Missing required fields');
      return false;
    }

    // Check rawTables structure
    if (project.rawTables) {
      for (const table of project.rawTables) {
        if (!table.id || !table.name || !Array.isArray(table.data)) {
          console.error('❌ Validation failed: Invalid rawTable structure');
          return false;
        }
      }
    }

    // Check prepConfigs structure
    if (project.prepConfigs) {
      for (const config of project.prepConfigs) {
        if (!config.id || !config.name || !Array.isArray(config.sourceTableIds)) {
          console.error('❌ Validation failed: Invalid prepConfig structure');
          return false;
        }
      }
    }

    // Check dashboards structure
    if (project.dashboards) {
      for (const dashboard of project.dashboards) {
        if (!dashboard.id || !dashboard.name || !Array.isArray(dashboard.widgets)) {
          console.error('❌ Validation failed: Invalid dashboard structure');
          return false;
        }
      }
    }

    console.log('✅ Project validation passed');
    return true;
  } catch (error) {
    console.error('❌ Validation error:', error);
    return false;
  }
}
