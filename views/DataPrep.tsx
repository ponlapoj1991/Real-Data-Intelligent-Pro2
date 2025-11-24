import React, { useEffect, useMemo, useState } from 'react';
import { Database, Plus, Save, RefreshCw, Layers, Play, Table as TableIcon, ListChecks } from 'lucide-react';
import { ColumnConfig, Project, PrepConfig, RawRow, SourceTable } from '../types';
import { saveProject } from '../utils/storage';
import { inferColumns } from '../utils/excel';
import { useToast } from '../components/ToastProvider';

interface DataPrepProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

interface MergeResult {
  rows: RawRow[];
  columns: ColumnConfig[];
}

const DataPrep: React.FC<DataPrepProps> = ({ project, onUpdateProject }) => {
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [configName, setConfigName] = useState('');
  const [description, setDescription] = useState('');
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const { showToast } = useToast();

  const tables = project.database || [];
  const prepConfigs = project.prepConfigs || [];

  useEffect(() => {
    if (prepConfigs.length > 0 && !activeConfigId) {
      const first = prepConfigs[0];
      setActiveConfigId(first.id);
      setConfigName(first.name);
      setDescription(first.description || '');
      setSelectedTableIds(first.sourceTableIds);
    }
  }, [prepConfigs, activeConfigId]);

  const mergeTables = (sourceTables: SourceTable[]): MergeResult => {
    if (sourceTables.length === 0) return { rows: [], columns: [] };

    const columnKeys = Array.from(
      sourceTables.reduce((set, tbl) => {
        (tbl.columns || []).forEach((c) => set.add(c.key));
        tbl.rows.forEach((row) => Object.keys(row || {}).forEach((k) => set.add(k)));
        return set;
      }, new Set<string>())
    );

    const columns: ColumnConfig[] = columnKeys.map((key) => ({ key, type: 'string', visible: true, label: key }));
    const rows: RawRow[] = sourceTables.flatMap((tbl) =>
      tbl.rows.map((row) => {
        const normalized: RawRow = {};
        columnKeys.forEach((key) => {
          normalized[key] = key in row ? row[key] : null;
        });
        return normalized;
      })
    );

    return { rows, columns };
  };

  const selectedTables = useMemo(() => tables.filter((t) => selectedTableIds.includes(t.id)), [tables, selectedTableIds]);
  const mergePreview = useMemo(() => mergeTables(selectedTables), [selectedTables]);

  const updateProjectConfigs = async (configs: PrepConfig[]) => {
    const updated = { ...project, prepConfigs: configs, lastModified: Date.now() };
    await saveProject(updated);
    onUpdateProject(updated);
  };

  const handleSaveNew = async () => {
    if (!configName || selectedTables.length === 0) return;
    const { rows, columns } = mergePreview.rows.length ? mergePreview : mergeTables(selectedTables);
    const newConfig: PrepConfig = {
      id: `prep_${crypto.randomUUID()}`,
      name: configName,
      description: description || undefined,
      sourceTableIds: selectedTableIds,
      outputRows: rows,
      outputColumns: columns.length ? columns : inferColumns(rows[0] || {} as RawRow) || [],
      lastRun: Date.now(),
    };
    await updateProjectConfigs([...prepConfigs, newConfig]);
    setActiveConfigId(newConfig.id);
    showToast('Config saved', `${configName} created with ${rows.length} rows`, 'success');
  };

  const handleUpdate = async () => {
    if (!activeConfigId) return;
    const targetIndex = prepConfigs.findIndex((c) => c.id === activeConfigId);
    if (targetIndex === -1) return;
    const { rows, columns } = mergePreview.rows.length ? mergePreview : mergeTables(selectedTables);
    const updatedConfig: PrepConfig = {
      ...prepConfigs[targetIndex],
      name: configName || prepConfigs[targetIndex].name,
      description: description || prepConfigs[targetIndex].description,
      sourceTableIds: selectedTableIds,
      outputRows: rows,
      outputColumns: columns,
      lastRun: Date.now(),
    };
    const newConfigs = [...prepConfigs];
    newConfigs[targetIndex] = updatedConfig;
    await updateProjectConfigs(newConfigs);
    showToast('Config updated', `${updatedConfig.name} refreshed from selected tables`, 'success');
  };

  const handleSelectConfig = (config: PrepConfig) => {
    setActiveConfigId(config.id);
    setConfigName(config.name);
    setDescription(config.description || '');
    setSelectedTableIds(config.sourceTableIds);
  };

  const handleToggleTable = (id: string) => {
    setSelectedTableIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleRerun = async (config: PrepConfig) => {
    const sources = tables.filter((t) => config.sourceTableIds.includes(t.id));
    const { rows, columns } = mergeTables(sources);
    const updatedConfig: PrepConfig = { ...config, outputRows: rows, outputColumns: columns, lastRun: Date.now() };
    const configs = prepConfigs.map((c) => (c.id === config.id ? updatedConfig : c));
    await updateProjectConfigs(configs);
    showToast('Re-run complete', `${config.name} refreshed from latest tables`, 'success');
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clean & Prep Configurations</h2>
          <p className="text-gray-500">Select multiple raw tables, merge mismatched columns with nulls, and save as reusable configs.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Layers className="w-4 h-4" />
          <span>{prepConfigs.length} configs</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Raw Tables</h3>
            </div>
            <span className="text-xs text-gray-400">Select more than one to merge</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map((table) => (
              <label key={table.id} className="flex items-start space-x-3 border border-gray-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedTableIds.includes(table.id)}
                  onChange={() => handleToggleTable(table.id)}
                />
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{table.name}</p>
                    <span className="text-xs text-gray-400">{table.rows.length} rows</span>
                  </div>
                  <p className="text-xs text-gray-500">{table.columns.length} columns • Updated {new Date(table.updatedAt).toLocaleDateString()}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Config Name</label>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="e.g., Sales_Merged"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="What does this config combine?"
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSaveNew}
              className="flex-1 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Save as New
            </button>
            <button
              onClick={handleUpdate}
              disabled={!activeConfigId}
              className="flex-1 inline-flex items-center justify-center bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-semibold border border-gray-200 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" /> Update Current
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TableIcon className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Merge Preview</h3>
          </div>
          <span className="text-xs text-gray-400">{mergePreview.rows.length} rows</span>
        </div>
        {mergePreview.columns.length === 0 ? (
          <p className="text-sm text-gray-500">Select tables to preview merged output. Columns with missing values are padded with null.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {mergePreview.columns.slice(0, 6).map((col) => (
                    <th key={col.key} className="px-3 py-2 text-left text-gray-600 font-semibold">{col.label || col.key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mergePreview.rows.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    {mergePreview.columns.slice(0, 6).map((col) => (
                      <td key={col.key} className="px-3 py-2 text-gray-700">{String(row[col.key] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ListChecks className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Prep Configs</h3>
          </div>
          <span className="text-xs text-gray-400">Re-run after appending raw data</span>
        </div>
        {prepConfigs.length === 0 ? (
          <p className="text-sm text-gray-500">No configs yet. Select tables and save your first configuration.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prepConfigs.map((config) => (
              <div key={config.id} className={`border rounded-lg p-4 ${activeConfigId === config.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{config.name}</p>
                    <p className="text-xs text-gray-500">Sources: {config.sourceTableIds.length} • Rows: {config.outputRows.length}</p>
                    {config.description && <p className="text-xs text-gray-500 mt-1">{config.description}</p>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSelectConfig(config)}
                      className="px-3 py-2 text-xs bg-gray-100 rounded-md border border-gray-200 hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRerun(config)}
                      className="px-3 py-2 text-xs bg-blue-600 text-white rounded-md flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Re-run</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Last run: {new Date(config.lastRun).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPrep;
