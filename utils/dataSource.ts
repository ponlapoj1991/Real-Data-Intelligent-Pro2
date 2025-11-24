import { Project, DataSourceBinding, RawRow, RawTable, PrepConfig } from '../types';

/**
 * Resolve data from DataSourceBinding
 * Returns data array from either rawTables or prepConfigs
 */
export function resolveDataSource(
  binding: DataSourceBinding | undefined,
  project: Project
): RawRow[] {
  // No binding = use legacy data (for backward compatibility)
  if (!binding) {
    // Try prepConfig first (if has transform rules)
    if (project.prepConfigs && project.prepConfigs.length > 0) {
      return project.prepConfigs[0].outputData;
    }
    // Then try rawTables
    if (project.rawTables && project.rawTables.length > 0) {
      return project.rawTables[0].data;
    }
    // Fallback to legacy data field
    return project.data || [];
  }

  // Resolve from rawTables
  if (binding.type === 'raw') {
    const table = project.rawTables?.find(t => t.id === binding.id);
    return table?.data || [];
  }

  // Resolve from prepConfigs
  if (binding.type === 'prepped') {
    const config = project.prepConfigs?.find(c => c.id === binding.id);
    return config?.outputData || [];
  }

  return [];
}

/**
 * Get available columns from a data source
 */
export function getDataSourceColumns(
  binding: DataSourceBinding | undefined,
  project: Project
): string[] {
  const data = resolveDataSource(binding, project);
  if (data.length === 0) return [];
  return Object.keys(data[0]);
}

/**
 * Get all available data sources for selection
 */
export interface DataSourceOption {
  type: 'raw' | 'prepped';
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
}

export function getAvailableDataSources(project: Project): {
  raw: DataSourceOption[];
  prepped: DataSourceOption[];
} {
  const raw: DataSourceOption[] = (project.rawTables || []).map(table => ({
    type: 'raw' as const,
    id: table.id,
    name: table.name,
    rowCount: table.rowCount,
    columnCount: table.columns.length,
  }));

  const prepped: DataSourceOption[] = (project.prepConfigs || []).map(config => ({
    type: 'prepped' as const,
    id: config.id,
    name: config.name,
    rowCount: config.outputData.length,
    columnCount: config.outputColumns.length,
  }));

  return { raw, prepped };
}

/**
 * Get data source display name
 */
export function getDataSourceName(
  binding: DataSourceBinding | undefined,
  project: Project
): string {
  if (!binding) return 'Default Data';

  if (binding.type === 'raw') {
    const table = project.rawTables?.find(t => t.id === binding.id);
    return table?.name || 'Unknown Table';
  }

  if (binding.type === 'prepped') {
    const config = project.prepConfigs?.find(c => c.id === binding.id);
    return config?.name || 'Unknown Config';
  }

  return 'Unknown Source';
}

/**
 * Create default data source binding
 * Prioritize: prepConfigs > rawTables > legacy data
 */
export function getDefaultDataSource(project: Project): DataSourceBinding | undefined {
  // Prefer first prep config
  if (project.prepConfigs && project.prepConfigs.length > 0) {
    return {
      type: 'prepped',
      id: project.prepConfigs[0].id,
    };
  }

  // Then first raw table
  if (project.rawTables && project.rawTables.length > 0) {
    return {
      type: 'raw',
      id: project.rawTables[0].id,
    };
  }

  // No binding (legacy mode)
  return undefined;
}
