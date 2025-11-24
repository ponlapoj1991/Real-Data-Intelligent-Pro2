import { Project, RawRow, SourceTable, PrepConfig } from '../types';

export interface DataSource {
  id: string;
  label: string;
  kind: 'raw' | 'prep';
  rows: RawRow[];
  columns: string[];
}

const columnsFromRows = (rows: RawRow[]): string[] => {
  if (rows.length === 0) return [];
  return Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );
};

export const toDataSources = (project: Project): DataSource[] => {
  const rawSources: DataSource[] = (project.database || []).map((table: SourceTable) => ({
    id: table.id,
    label: table.name,
    kind: 'raw',
    rows: table.rows || [],
    columns: table.columns?.map((c) => c.key) || columnsFromRows(table.rows || []),
  }));

  const prepSources: DataSource[] = (project.prepConfigs || []).map((config: PrepConfig) => ({
    id: config.id,
    label: config.name,
    kind: 'prep',
    rows: config.outputRows || [],
    columns: config.outputColumns?.map((c) => c.key) || columnsFromRows(config.outputRows || []),
  }));

  return [...rawSources, ...prepSources];
};

export const getDefaultSource = (project: Project): DataSource | null => {
  const sources = toDataSources(project);
  return sources.length > 0 ? sources[0] : null;
};

export const getSourceById = (project: Project, sourceId?: string): DataSource | null => {
  if (!sourceId) return getDefaultSource(project);
  const sources = toDataSources(project);
  return sources.find((s) => s.id === sourceId) || null;
};
