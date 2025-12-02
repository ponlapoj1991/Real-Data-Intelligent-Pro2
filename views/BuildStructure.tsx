import React, { useMemo, useState } from 'react';
import { Plus, Save, Play, Loader2 } from 'lucide-react';
import { ColumnConfig, DataSource, Project, RawRow } from '../types';
import { ensureDataSources, getDataSourcesByKind } from '../utils/dataSources';
import { addDerivedDataSource } from '../utils/dataSources';
import { saveProject } from '../utils/storage-compat';
import { useToast } from '../components/ToastProvider';

interface BuildStructureProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

interface MappingRule {
  id: string;
  sourceId: string;
  sourceColumn: string;
  targetName: string;
}

const BuildStructure: React.FC<BuildStructureProps> = ({ project, onUpdateProject }) => {
  const { project: normalizedProject } = useMemo(() => ensureDataSources(project), [project]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [rules, setRules] = useState<MappingRule[]>([]);
  const [resultRows, setResultRows] = useState<RawRow[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const allSources: DataSource[] = useMemo(
    () => getDataSourcesByKind(normalizedProject, 'ingestion').concat(getDataSourcesByKind(normalizedProject, 'prepared')),
    [normalizedProject]
  );

  const selectedSourceObjects = useMemo(
    () => allSources.filter((s) => selectedSources.includes(s.id)),
    [allSources, selectedSources]
  );

  const addRule = () => {
    if (!selectedSources.length) return;
    const first = selectedSources[0];
    const firstSource = allSources.find((s) => s.id === first);
    const firstColumn = firstSource?.columns[0]?.key || '';
    setRules((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sourceId: first, sourceColumn: firstColumn, targetName: 'New Field' },
    ]);
  };

  const updateRule = (id: string, patch: Partial<MappingRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id: string) => setRules((prev) => prev.filter((r) => r.id !== id));

  const runQuery = () => {
    if (!selectedSources.length || !rules.length) {
      showToast('Setup incomplete', 'Choose sources and add mappings before querying.', 'warning');
      return;
    }
    setIsRunning(true);
    const output: RawRow[] = [];

    selectedSources.forEach((sourceId) => {
      const source = allSources.find((s) => s.id === sourceId);
      if (!source) return;
      const applicableRules = rules.filter((r) => r.sourceId === sourceId);
      const cols = applicableRules.length ? applicableRules : rules.filter((r) => !selectedSources.includes(r.sourceId));
      if (!cols.length) return;
      source.rows.forEach((row) => {
        const out: RawRow = {};
        cols.forEach((rule) => {
          const value = row[rule.sourceColumn];
          out[rule.targetName] = value ?? null;
        });
        output.push(out);
      });
    });

    setResultRows(output);
    setTimeout(() => setIsRunning(false), 300);
  };

  const handleSave = async () => {
    if (!resultRows.length) {
      showToast('No results', 'Run Query before saving.', 'warning');
      return;
    }
    setIsSaving(true);
    const columns: ColumnConfig[] = Object.keys(resultRows[0] || {}).map((key) => ({ key, type: 'string', visible: true }));
    const updated = addDerivedDataSource(
      normalizedProject,
      `Structure ${selectedSources.length} files`,
      resultRows,
      columns,
      'prepared'
    );
    await saveProject(updated);
    onUpdateProject(updated);
    showToast('Saved', 'Structured table added to Preparation Data.', 'success');
    setTimeout(() => setIsSaving(false), 400);
  };

  return (
    <div className="h-full flex flex-col px-10 py-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Build Structure</h1>
          <p className="text-sm text-gray-500">Combine columns from multiple tables into one stacked sheet.</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedSources.length > 0 && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save to Preparation
            </button>
          )}
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </button>
        </div>
      </div>

      {!selectedSources.length && (
        <div className="flex-1 border border-dashed border-gray-200 rounded-xl bg-white/60 flex items-center justify-center text-gray-400 text-sm">
          Select one or more tables to configure.
        </div>
      )}

      {selectedSources.length > 0 && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Sources</p>
                <h2 className="font-semibold text-gray-900">{selectedSources.length} tables selected</h2>
              </div>
              <button
                onClick={addRule}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" /> Add column
              </button>
            </div>
            <div className="grid grid-cols-12 gap-3 text-sm font-semibold text-gray-500 px-2">
              <span className="col-span-4">Source</span>
              <span className="col-span-4">Source column</span>
              <span className="col-span-3">Target column</span>
              <span className="col-span-1 text-right">Remove</span>
            </div>
            <div className="space-y-2 mt-2">
              {rules.map((rule) => {
                const source = allSources.find((s) => s.id === rule.sourceId);
                const columns = source?.columns || [];
                return (
                  <div key={rule.id} className="grid grid-cols-12 gap-3 items-center px-2 py-2 rounded-lg hover:bg-gray-50">
                    <select
                      value={rule.sourceId}
                      onChange={(e) => updateRule(rule.id, { sourceId: e.target.value })}
                      className="col-span-4 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {selectedSourceObjects.map((src) => (
                        <option key={src.id} value={src.id}>
                          {src.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={rule.sourceColumn}
                      onChange={(e) => updateRule(rule.id, { sourceColumn: e.target.value })}
                      className="col-span-4 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {columns.map((col) => (
                        <option key={col.key} value={col.key}>
                          {col.label || col.key}
                        </option>
                      ))}
                    </select>
                    <input
                      value={rule.targetName}
                      onChange={(e) => updateRule(rule.id, { targetName: e.target.value })}
                      className="col-span-3 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Target name"
                    />
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="col-span-1 text-xs text-gray-500 hover:text-red-500 text-right"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              {rules.length === 0 && (
                <p className="text-sm text-gray-500 px-2">Add at least one column mapping to proceed.</p>
              )}
            </div>
            {selectedSources.length > 0 && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={runQuery}
                  disabled={isRunning}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Query
                </button>
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Preview</p>
                <h3 className="font-semibold text-gray-900">{resultRows.length.toLocaleString()} rows</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-700">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {Object.keys(resultRows[0] || {}).map((key) => (
                      <th key={key} className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultRows.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      {Object.keys(row).map((key) => (
                        <td key={key} className="px-4 py-2 text-gray-800">
                          {row[key] as any}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {resultRows.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-400" colSpan={Math.max(Object.keys(resultRows[0] || {}).length, 1)}>
                        Run Query to preview structured data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Choose tables for Build Structure</h3>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {allSources.map((src) => {
                const checked = selectedSources.includes(src.id);
                return (
                  <label key={src.id} className={`border rounded-lg px-4 py-3 cursor-pointer transition ${checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{src.name}</p>
                        <p className="text-xs text-gray-500">{src.kind === 'ingestion' ? 'Ingestion' : 'Preparation'} data</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedSources((prev) =>
                            e.target.checked ? [...prev, src.id] : prev.filter((id) => id !== src.id)
                          );
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                  </label>
                );
              })}
              {allSources.length === 0 && <p className="text-sm text-gray-500">Upload data before creating a structure.</p>}
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowPicker(false)} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => setShowPicker(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60"
                disabled={!selectedSources.length}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildStructure;
