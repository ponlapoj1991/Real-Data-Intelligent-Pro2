import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Play, Loader2, Table2, Layers, ChevronUp, ChevronDown, X } from 'lucide-react';
import {
  BuildStructureConfig,
  ColumnConfig,
  DataSource,
  Project,
  RawRow,
  StructureRule,
  TransformMethod,
} from '../types';
import { ensureDataSources, getDataSourcesByKind, addDerivedDataSource } from '../utils/dataSources';
import { saveProject } from '../utils/storage-compat';
import { inferColumns } from '../utils/excel';
import { analyzeSourceColumn, applyTransformation, getAllUniqueValues } from '../utils/transform';
import { useToast } from '../components/ToastProvider';
import EmptyState from '../components/EmptyState';

interface BuildStructureProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

const BuildStructure: React.FC<BuildStructureProps> = ({ project, onUpdateProject }) => {
  const needsNormalization = !project.dataSources?.length || !project.activeDataSourceId;
  const { project: normalizedProject } = useMemo(() => ensureDataSources(project), [project]);
  useEffect(() => {
    if (needsNormalization) {
      onUpdateProject(normalizedProject);
    }
  }, [needsNormalization, normalizedProject, onUpdateProject]);

  const ingestionSources = useMemo(() => getDataSourcesByKind(normalizedProject, 'ingestion'), [normalizedProject]);
  const preparedSources = useMemo(() => getDataSourcesByKind(normalizedProject, 'prepared'), [normalizedProject]);
  const allSources: DataSource[] = useMemo(
    () => [...ingestionSources, ...preparedSources].sort((a, b) => b.updatedAt - a.updatedAt),
    [ingestionSources, preparedSources]
  );

  const [configs, setConfigs] = useState<BuildStructureConfig[]>(normalizedProject.buildStructureConfigs || []);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(normalizedProject.activeBuildConfigId || null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configName, setConfigName] = useState('');

  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const [rules, setRules] = useState<StructureRule[]>([]);
  const [resultRows, setResultRows] = useState<RawRow[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [newRuleName, setNewRuleName] = useState('');
  const [selectedRuleSource, setSelectedRuleSource] = useState<string>('');
  const [selectedSourceCol, setSelectedSourceCol] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<TransformMethod>('copy');
  const [methodParams, setMethodParams] = useState<any>({});
  const [valueMap, setValueMap] = useState<Record<string, string>>({});
  const [manualMapKey, setManualMapKey] = useState('');
  const [manualMapValue, setManualMapValue] = useState('');
  const [sourceAnalysis, setSourceAnalysis] = useState<{
    isArrayLikely: boolean;
    isDateLikely: boolean;
    uniqueTags: string[];
    sampleValues: string[];
  } | null>(null);

  const { showToast } = useToast();

  // Sync configs from project changes
  useEffect(() => {
    setConfigs(normalizedProject.buildStructureConfigs || []);
    setActiveConfigId(normalizedProject.activeBuildConfigId || normalizedProject.buildStructureConfigs?.[0]?.id || null);
  }, [normalizedProject.buildStructureConfigs, normalizedProject.activeBuildConfigId]);

  const activeConfig = useMemo(
    () => configs.find((c) => c.id === activeConfigId) || configs[0] || null,
    [configs, activeConfigId]
  );

  useEffect(() => {
    if (activeConfig) {
      setSelectedSources(activeConfig.sourceIds);
      setRules(activeConfig.rules);
    } else {
      setSelectedSources([]);
      setRules([]);
    }
    setResultRows([]);
  }, [activeConfig]);

  const persistConfigs = async (nextConfigs: BuildStructureConfig[], nextActiveId?: string | null) => {
    setConfigs(nextConfigs);
    const updatedProject = {
      ...normalizedProject,
      buildStructureConfigs: nextConfigs,
      activeBuildConfigId: nextActiveId ?? activeConfigId ?? nextConfigs[0]?.id,
    } as Project;
    onUpdateProject(updatedProject);
    await saveProject(updatedProject);
  };

  const submitNewConfig = async () => {
    const name = configName.trim() || `Structure ${configs.length + 1}`;
    if (selectedSources.length === 0) return;
    const newConfig: BuildStructureConfig = {
      id: crypto.randomUUID(),
      name,
      sourceIds: selectedSources,
      rules: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const nextConfigs = [...configs, newConfig];
    setActiveConfigId(newConfig.id);
    setShowConfigModal(false);
    await persistConfigs(nextConfigs, newConfig.id);
  };

  const updateActiveConfig = async (nextSources = selectedSources, nextRules = rules) => {
    if (!activeConfig) return;
    const updatedConfig: BuildStructureConfig = {
      ...activeConfig,
      sourceIds: nextSources,
      rules: nextRules,
      updatedAt: Date.now(),
    };
    const nextConfigs = configs.map((c) => (c.id === activeConfig.id ? updatedConfig : c));
    await persistConfigs(nextConfigs, activeConfig.id);
  };

  const handleSourceToggle = (id: string, checked: boolean) => {
    setSelectedSources((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const openAddRule = () => {
    if (!selectedSources.length) {
      showToast('Select sources first', 'Choose one or more tables before adding columns.', 'warning');
      return;
    }
    setEditingRuleId(null);
    setNewRuleName('');
    setSelectedRuleSource(selectedSources[0]);
    const firstColumns = allSources.find((s) => s.id === selectedSources[0])?.columns || [];
    setSelectedSourceCol(firstColumns[0]?.key || '');
    setSelectedMethod('copy');
    setMethodParams({});
    setValueMap({});
    setManualMapKey('');
    setManualMapValue('');
    setSourceAnalysis(null);
    setIsRuleModalOpen(true);
  };

  const openEditRule = (rule: StructureRule) => {
    setEditingRuleId(rule.id);
    setNewRuleName(rule.targetName);
    setSelectedRuleSource(rule.sourceId);
    setSelectedSourceCol(rule.sourceKey);
    setSelectedMethod(rule.method);
    setMethodParams(rule.params || {});
    setValueMap(rule.valueMap || {});
    const src = allSources.find((s) => s.id === rule.sourceId);
    if (src) {
      const analysis = analyzeSourceColumn(src.rows, rule.sourceKey);
      setSourceAnalysis(analysis);
    }
    setIsRuleModalOpen(true);
  };

  const handleRuleSourceChange = (srcId: string) => {
    setSelectedRuleSource(srcId);
    const src = allSources.find((s) => s.id === srcId);
    setSelectedSourceCol(src?.columns[0]?.key || '');
    if (src && src.columns[0]) {
      const analysis = analyzeSourceColumn(src.rows, src.columns[0].key);
      setSourceAnalysis(analysis);
    } else {
      setSourceAnalysis(null);
    }
  };

  const handleSourceColSelect = (colKey: string) => {
    setSelectedSourceCol(colKey);
    const src = allSources.find((s) => s.id === selectedRuleSource);
    if (!src) return;
    const analysis = analyzeSourceColumn(src.rows, colKey);
    setSourceAnalysis(analysis);
    if (!editingRuleId) {
      if (analysis.isDateLikely) {
        setSelectedMethod('date_extract');
        setMethodParams({ datePart: 'date_only' });
      } else if (analysis.isArrayLikely) {
        setSelectedMethod('array_count');
        setMethodParams({});
      } else {
        setSelectedMethod('copy');
        setMethodParams({});
      }
      setValueMap({});
    }
  };

  const saveRule = async () => {
    if (!newRuleName || !selectedSourceCol || !selectedRuleSource) return;
    const newRule: StructureRule = {
      id: editingRuleId || crypto.randomUUID(),
      sourceId: selectedRuleSource,
      targetName: newRuleName,
      sourceKey: selectedSourceCol,
      method: selectedMethod,
      params: methodParams,
      valueMap: Object.keys(valueMap).length ? valueMap : undefined,
    };
    const nextRules = editingRuleId
      ? rules.map((r) => (r.id === editingRuleId ? newRule : r))
      : [...rules, newRule];
    setRules(nextRules);
    setIsRuleModalOpen(false);
    await updateActiveConfig(selectedSources, nextRules);
  };

  const removeRule = async (id: string) => {
    const nextRules = rules.filter((r) => r.id !== id);
    setRules(nextRules);
    await updateActiveConfig(selectedSources, nextRules);
  };

  const moveRule = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === rules.length - 1)) return;
    const next = [...rules];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setRules(next);
    await updateActiveConfig(selectedSources, next);
  };

  const uniqueValuesForMapping = useMemo(() => {
    const src = allSources.find((s) => s.id === selectedRuleSource);
    if (!src || !selectedSourceCol) return [] as string[];
    return getAllUniqueValues(src.rows, selectedSourceCol, selectedMethod, 5000);
  }, [allSources, selectedRuleSource, selectedSourceCol, selectedMethod]);

  const runQuery = async () => {
    if (!selectedSources.length || !rules.length) {
      showToast('Setup incomplete', 'Choose sources and add mappings before querying.', 'warning');
      return;
    }
    setIsRunning(true);
    const output: RawRow[] = [];
    selectedSources.forEach((sourceId) => {
      const source = allSources.find((s) => s.id === sourceId);
      if (!source) return;
      const scopedRules = rules.filter((r) => r.sourceId === sourceId);
      if (!scopedRules.length) return;
      const baseRules = scopedRules.map(({ sourceId: _sid, ...rest }) => rest);
      const structured = applyTransformation(source.rows, baseRules);
      output.push(...structured);
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
    const columns: ColumnConfig[] = inferColumns(resultRows[0]);
    const updated = addDerivedDataSource(normalizedProject, `Structure ${selectedSources.length} files`, resultRows, columns, 'prepared');
    await saveProject(updated);
    onUpdateProject(updated);
    showToast('Saved', 'Structured table added to Preparation Data.', 'success');
    setTimeout(() => setIsSaving(false), 400);
  };

  const hasConfig = Boolean(activeConfig);

  return (
    <div className="h-full flex flex-col px-10 py-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-semibold text-gray-900">Build Structure</h1>
          {configs.length > 0 && (
            <select
              value={activeConfig?.id || ''}
              onChange={async (e) => {
                setActiveConfigId(e.target.value);
                await persistConfigs(configs, e.target.value);
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm"
            >
              {configs.map((cfg) => (
                <option key={cfg.id} value={cfg.id}>
                  {cfg.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {hasConfig && (
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
            onClick={() => {
              setConfigName(`Structure ${configs.length + 1}`);
              setShowConfigModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </button>
        </div>
      </div>

      {!hasConfig && (
        <div className="flex-1 border border-dashed border-gray-200 rounded-xl bg-white/60 flex items-center justify-center text-gray-400 text-sm">
          Create a configuration to start.
        </div>
      )}

      {hasConfig && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <p className="text-sm text-gray-500">Sources</p>
                <h2 className="font-semibold text-gray-900">{selectedSources.length} tables selected</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSourcePicker(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Choose tables
                </button>
                <button
                  onClick={openAddRule}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add column
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-3 text-sm font-semibold text-gray-500 px-2">
              <span className="col-span-3">Source</span>
              <span className="col-span-3">Source column</span>
              <span className="col-span-4">Target column</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>
            <div className="space-y-2 mt-2">
              {rules.map((rule, idx) => {
                const source = allSources.find((s) => s.id === rule.sourceId);
                return (
                  <div key={rule.id} className="grid grid-cols-12 gap-3 items-center px-2 py-2 rounded-lg hover:bg-gray-50">
                    <div className="col-span-3 text-sm text-gray-800 truncate">{source?.name || 'Source removed'}</div>
                    <div className="col-span-3 text-sm text-gray-800 truncate">{rule.sourceKey}</div>
                    <div className="col-span-4">
                      <p className="font-medium text-gray-900 truncate">{rule.targetName}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{rule.method.replace('_', ' ')}</p>
                    </div>
                    <div className="col-span-2 flex items-center justify-end space-x-2 text-xs text-gray-500">
                      <button onClick={() => openEditRule(rule)} className="hover:text-blue-600">Edit</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => moveRule(idx, 'up')} disabled={idx === 0} className="hover:text-gray-700 disabled:opacity-30">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveRule(idx, 'down')}
                        disabled={idx === rules.length - 1}
                        className="hover:text-gray-700 disabled:opacity-30"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => removeRule(rule.id)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {rules.length === 0 && (
                <div className="px-2 py-6">
                  <EmptyState
                    icon={Table2}
                    title="No columns"
                    description="Add mappings for each source before querying."
                    actionLabel="Add column"
                    onAction={openAddRule}
                    className="border-0 bg-transparent"
                  />
                </div>
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

      {showSourcePicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Choose tables for Build Structure</h3>
              <button onClick={() => setShowSourcePicker(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {allSources.map((src) => {
                const checked = selectedSources.includes(src.id);
                return (
                  <label
                    key={src.id}
                    className={`border rounded-lg px-4 py-3 cursor-pointer transition ${
                      checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{src.name}</p>
                        <p className="text-xs text-gray-500">{src.kind === 'ingestion' ? 'Ingestion' : 'Preparation'} data</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => handleSourceToggle(src.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                  </label>
                );
              })}
              {allSources.length === 0 && <p className="text-sm text-gray-500">Upload data before creating a structure.</p>}
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowSourcePicker(false)} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowSourcePicker(false);
                  await updateActiveConfig(selectedSources, rules.filter((r) => selectedSources.includes(r.sourceId)));
                  setRules((prev) => prev.filter((r) => selectedSources.includes(r.sourceId)));
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60"
                disabled={!selectedSources.length}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">New structure config</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <input
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Structure config"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Tables</p>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {allSources.map((src) => {
                    const checked = selectedSources.includes(src.id);
                    return (
                      <label
                        key={src.id}
                        className={`border rounded-lg px-4 py-3 cursor-pointer transition ${
                          checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{src.name}</p>
                            <p className="text-xs text-gray-500">{src.kind === 'ingestion' ? 'Ingestion' : 'Preparation'} data</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => handleSourceToggle(src.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        </div>
                      </label>
                    );
                  })}
                  {allSources.length === 0 && <p className="text-sm text-gray-500">Upload data before creating a structure.</p>}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={submitNewConfig}
                disabled={!selectedSources.length}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-blue-600 font-semibold">{editingRuleId ? 'Edit' : 'Add'} column</p>
                <h3 className="text-xl font-bold text-gray-900">Mapping</h3>
              </div>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Source table</label>
                <select
                  value={selectedRuleSource}
                  onChange={(e) => handleRuleSourceChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {selectedSources.map((id) => {
                    const src = allSources.find((s) => s.id === id);
                    if (!src) return null;
                    return (
                      <option key={id} value={id}>
                        {src.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Source column</label>
                <select
                  value={selectedSourceCol}
                  onChange={(e) => handleSourceColSelect(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {(
                    allSources.find((s) => s.id === selectedRuleSource)?.columns || []
                  ).map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.key}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Target column</label>
                <input
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Target name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Method</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value as TransformMethod)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="copy">Copy</option>
                  <option value="array_count">Array count</option>
                  <option value="array_join">Array join</option>
                  <option value="array_extract">Array extract</option>
                  <option value="array_includes">Array includes</option>
                  <option value="date_extract">Date extract</option>
                  <option value="date_format">Date format</option>
                </select>
              </div>
            </div>

            {selectedMethod === 'array_join' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Delimiter</label>
                  <input
                    value={methodParams.delimiter || ', '}
                    onChange={(e) => setMethodParams({ ...methodParams, delimiter: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {selectedMethod === 'array_extract' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Index</label>
                  <input
                    type="number"
                    value={methodParams.index ?? 0}
                    onChange={(e) => setMethodParams({ ...methodParams, index: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {selectedMethod === 'array_includes' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Keyword</label>
                  <input
                    value={methodParams.keyword || ''}
                    onChange={(e) => setMethodParams({ ...methodParams, keyword: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {selectedMethod === 'date_extract' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date part</label>
                  <select
                    value={methodParams.datePart || 'date_only'}
                    onChange={(e) => setMethodParams({ ...methodParams, datePart: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="date_only">Date only</option>
                    <option value="time_only">Time only</option>
                    <option value="year">Year</option>
                    <option value="month">Month</option>
                  </select>
                </div>
              </div>
            )}

            {selectedMethod === 'date_format' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Format</label>
                  <input
                    value={methodParams.format || 'YYYY-MM-DD'}
                    onChange={(e) => setMethodParams({ ...methodParams, format: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Value mapping</span>
                <button
                  onClick={() => setValueMap({})}
                  className="text-xs text-gray-500 hover:text-red-500"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 items-start">
                <input
                  value={manualMapKey}
                  onChange={(e) => setManualMapKey(e.target.value)}
                  className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Match value"
                />
                <input
                  value={manualMapValue}
                  onChange={(e) => setManualMapValue(e.target.value)}
                  className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Mapped to"
                />
                <button
                  onClick={() => {
                    if (manualMapKey && manualMapValue) {
                      setValueMap({ ...valueMap, [manualMapKey]: manualMapValue });
                      setManualMapKey('');
                      setManualMapValue('');
                    }
                  }}
                  className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg"
                >
                  Add
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-700 max-h-24 overflow-y-auto">
                {Object.entries(valueMap).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2 bg-white rounded border">
                    <span className="truncate">{k}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold truncate">{v}</span>
                  </div>
                ))}
                {Object.keys(valueMap).length === 0 && sourceAnalysis && uniqueValuesForMapping.slice(0, 6).map((val) => (
                  <button
                    key={val}
                    onClick={() => setValueMap({ ...valueMap, [val]: val })}
                    className="px-3 py-2 bg-white rounded border text-left hover:border-blue-400"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setIsRuleModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={saveRule}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildStructure;
