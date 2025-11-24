import React, { useEffect, useMemo, useState } from 'react';
import {
  Database,
  Plus,
  Save,
  RefreshCw,
  Layers,
  Table as TableIcon,
  ListChecks,
  Wand2,
  Filter,
  Repeat,
  Settings,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import {
  ColumnConfig,
  Project,
  PrepConfig,
  RawRow,
  SourceTable,
  TransformationRule,
  TransformMethod,
} from '../types';
import { saveProject } from '../utils/storage';
import { inferColumns, smartParseDate } from '../utils/excel';
import { applyTransformation, analyzeSourceColumn, getAllUniqueValues } from '../utils/transform';
import { useToast } from '../components/ToastProvider';

interface DataPrepProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

interface MergeResult {
  rows: RawRow[];
  columns: ColumnConfig[];
}

type Mode = 'clean' | 'build';

const DataPrep: React.FC<DataPrepProps> = ({ project, onUpdateProject }) => {
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [configName, setConfigName] = useState('');
  const [description, setDescription] = useState('');
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('clean');

  // Clean mode
  const [workingRows, setWorkingRows] = useState<RawRow[]>([]);
  const [workingColumns, setWorkingColumns] = useState<ColumnConfig[]>([]);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [targetCol, setTargetCol] = useState<string>('all');
  const [transformAction, setTransformAction] = useState<'date' | 'explode'>('date');
  const [transformCol, setTransformCol] = useState<string>('');
  const [delimiter, setDelimiter] = useState<string>(',');

  // Build mode
  const [rules, setRules] = useState<TransformationRule[]>([]);
  const [newRuleName, setNewRuleName] = useState('');
  const [selectedSourceCol, setSelectedSourceCol] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<TransformMethod>('copy');
  const [methodParams, setMethodParams] = useState<any>({});
  const [valueMap, setValueMap] = useState<Record<string, string>>({});
  const [valueKey, setValueKey] = useState('');
  const [valueVal, setValueVal] = useState('');
  const [sourceInsight, setSourceInsight] = useState<{ isArrayLikely: boolean; isDateLikely: boolean; sampleValues: string[]; uniqueTags: string[] } | null>(null);

  const { showToast } = useToast();

  const tables = project.database || [];
  const prepConfigs = project.prepConfigs || [];

  // Prefer first config on initial load
  useEffect(() => {
    if (prepConfigs.length > 0 && !activeConfigId) {
      const first = prepConfigs[0];
      setActiveConfigId(first.id);
      setConfigName(first.name);
      setDescription(first.description || '');
      setSelectedTableIds(first.sourceTableIds);
      setWorkingRows(first.outputRows || []);
      setWorkingColumns(first.outputColumns || []);
      setRules(first.transformRules || []);
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

  useEffect(() => {
    if (!activeConfigId) {
      const merged = mergeTables(selectedTables);
      setWorkingRows(merged.rows);
      setWorkingColumns(merged.columns);
    }
  }, [selectedTables, activeConfigId]);

  useEffect(() => {
    const active = prepConfigs.find((c) => c.id === activeConfigId);
    if (active) {
      setConfigName(active.name);
      setDescription(active.description || '');
      setSelectedTableIds(active.sourceTableIds);
      setWorkingRows(active.outputRows || []);
      setWorkingColumns(active.outputColumns || []);
      setRules(active.transformRules || []);
    }
  }, [activeConfigId, prepConfigs]);

  const structuredData = useMemo(() => {
    if (rules.length === 0) return [] as RawRow[];
    return applyTransformation(workingRows, rules);
  }, [workingRows, rules]);

  const updateProjectConfigs = async (configs: PrepConfig[]) => {
    const updated = { ...project, prepConfigs: configs, lastModified: Date.now() };
    await saveProject(updated);
    onUpdateProject(updated);
  };

  const dataForSave = () => {
    if (mode === 'build' && structuredData.length > 0) {
      const cols = inferColumns(structuredData[0] || ({} as RawRow)) || [];
      return { rows: structuredData, columns: cols };
    }
    const columns = workingColumns.length
      ? workingColumns
      : inferColumns(workingRows[0] || ({} as RawRow)) || [];
    return { rows: workingRows, columns };
  };

  const handleSaveNew = async () => {
    const { rows, columns } = dataForSave();
    if (!configName || rows.length === 0) {
      showToast('Missing data', 'เลือกตารางและกรอกชื่อ config ก่อนบันทึก', 'warning');
      return;
    }
    const newConfig: PrepConfig = {
      id: `prep_${crypto.randomUUID()}`,
      name: configName,
      description: description || undefined,
      sourceTableIds: selectedTableIds,
      outputRows: rows,
      outputColumns: columns,
      transformRules: rules,
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
    const { rows, columns } = dataForSave();
    const updatedConfig: PrepConfig = {
      ...prepConfigs[targetIndex],
      name: configName || prepConfigs[targetIndex].name,
      description: description || prepConfigs[targetIndex].description,
      sourceTableIds: selectedTableIds,
      outputRows: rows,
      outputColumns: columns,
      transformRules: rules,
      lastRun: Date.now(),
    };
    const newConfigs = [...prepConfigs];
    newConfigs[targetIndex] = updatedConfig;
    await updateProjectConfigs(newConfigs);
    showToast('Config updated', `${updatedConfig.name} refreshed`, 'success');
  };

  const handleSelectConfig = (config: PrepConfig) => {
    setActiveConfigId(config.id);
  };

  const handleToggleTable = (id: string) => {
    setActiveConfigId(null);
    setSelectedTableIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleRerun = async (config: PrepConfig) => {
    const sources = tables.filter((t) => config.sourceTableIds.includes(t.id));
    const { rows, columns } = mergeTables(sources);
    const nextRows = config.transformRules && config.transformRules.length > 0 ? applyTransformation(rows, config.transformRules) : rows;
    const nextColumns = config.transformRules && config.transformRules.length > 0 ? inferColumns(nextRows[0] || ({} as RawRow)) || columns : columns;
    const updatedConfig: PrepConfig = { ...config, outputRows: nextRows, outputColumns: nextColumns, lastRun: Date.now() };
    const configs = prepConfigs.map((c) => (c.id === config.id ? updatedConfig : c));
    await updateProjectConfigs(configs);
    setWorkingRows(nextRows);
    setWorkingColumns(nextColumns);
    setRules(config.transformRules || []);
    showToast('Re-run complete', `${config.name} refreshed from latest tables`, 'success');
  };

  // --- Clean Mode Actions ---
  const updateColumnType = (key: string, type: ColumnConfig['type']) => {
    const newCols = workingColumns.map((c) => (c.key === key ? { ...c, type } : c));
    setWorkingColumns(newCols);
  };

  const handleFindReplace = () => {
    if (!findText) return;
    const colsToSearch = targetCol === 'all' ? workingColumns.map((c) => c.key) : [targetCol];
    const updatedRows = workingRows.map((row) => {
      const newRow = { ...row } as RawRow;
      colsToSearch.forEach((key) => {
        const val = newRow[key];
        if (typeof val === 'string' && val.includes(findText)) {
          newRow[key] = val.split(findText).join(replaceText);
        }
      });
      return newRow;
    });
    setWorkingRows(updatedRows);
    showToast('Find & Replace', 'ทำการแทนที่ข้อความในชุดข้อมูลแล้ว', 'success');
  };

  const handleTransform = () => {
    if (!transformCol) return;
    let newData = [...workingRows];
    let newCols = [...workingColumns];

    if (transformAction === 'date') {
      newData = newData.map((row) => {
        const val = row[transformCol];
        if (typeof val === 'string') {
          const parsed = smartParseDate(val);
          return { ...row, [transformCol]: parsed || val };
        }
        return row;
      });
      newCols = newCols.map((c) => (c.key === transformCol ? { ...c, type: 'date' } : c));
    } else if (transformAction === 'explode') {
      newData = newData.map((row) => {
        const val = row[transformCol];
        if (typeof val === 'string') {
          const parts = val
            .split(delimiter)
            .map((s) => s.trim())
            .filter((s) => s);
          return { ...row, [transformCol]: JSON.stringify(parts) };
        }
        return row;
      });
      newCols = newCols.map((c) => (c.key === transformCol ? { ...c, type: 'tag_array' } : c));
    }
    setWorkingRows(newData);
    setWorkingColumns(newCols);
    showToast('Transform applied', 'ข้อมูลถูกปรับตามกฎที่เลือกแล้ว', 'success');
  };

  const handleDeleteRow = (index: number) => {
    const newData = workingRows.filter((_, i) => i !== index);
    setWorkingRows(newData);
  };

  // --- Build Mode Actions ---
  const resetRuleForm = () => {
    setNewRuleName('');
    setSelectedSourceCol('');
    setSelectedMethod('copy');
    setMethodParams({});
    setValueMap({});
    setValueKey('');
    setValueVal('');
    setSourceInsight(null);
  };

  const addRule = () => {
    if (!newRuleName || !selectedSourceCol) return;
    const newRule: TransformationRule = {
      id: crypto.randomUUID(),
      targetName: newRuleName,
      sourceKey: selectedSourceCol,
      method: selectedMethod,
      params: methodParams,
      valueMap: Object.keys(valueMap).length ? valueMap : undefined,
    };
    setRules((prev) => [...prev, newRule]);
    resetRuleForm();
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSourceInsight = (col: string) => {
    setSelectedSourceCol(col);
    const insight = analyzeSourceColumn(workingRows, col);
    setSourceInsight(insight);
    if (insight.isDateLikely) {
      setSelectedMethod('date_extract');
      setMethodParams({ datePart: 'date_only' });
    } else if (insight.isArrayLikely) {
      setSelectedMethod('array_count');
      setMethodParams({});
    } else {
      setSelectedMethod('copy');
      setMethodParams({});
    }
  };

  const addValueMap = () => {
    if (!valueKey) return;
    setValueMap((prev) => ({ ...prev, [valueKey]: valueVal }));
    setValueKey('');
    setValueVal('');
  };

  const renderValueMap = () => {
    const entries = Object.entries(valueMap);
    if (entries.length === 0) return null;
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-2">
        <div className="font-semibold text-gray-700">Value Map</div>
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-gray-600">{k}</span>
            <span className="text-gray-900 font-medium">→ {v || '(keep)'}</span>
          </div>
        ))}
      </div>
    );
  };

  const previewRows = mode === 'build' && structuredData.length > 0 ? structuredData : workingRows;
  const previewColumns = mode === 'build' && structuredData.length > 0
    ? inferColumns(structuredData[0] || ({} as RawRow)) || []
    : workingColumns;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clean & Prep Configurations</h2>
          <p className="text-gray-500">เลือกหลายไฟล์ ผสานคอลัมน์ และใช้เครื่องมือ Clean/Build เดิมได้ครบ</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Layers className="w-4 h-4" />
          <span>{prepConfigs.length} configs</span>
        </div>
      </div>

      {/* Source selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Raw Tables</h3>
            </div>
            <span className="text-xs text-gray-400">เลือกมากกว่า 1 ไฟล์เพื่อผสาน</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map((table) => (
              <label
                key={table.id}
                className="flex items-start space-x-3 border border-gray-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedTableIds.includes(table.id)}
                  onChange={() => handleToggleTable(table.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{table.name}</p>
                    <span className="text-xs text-gray-400">{table.rows.length} rows</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {table.columns.length} columns • Updated {new Date(table.updatedAt).toLocaleDateString()}
                  </p>
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

      {/* Mode switch */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center space-x-3">
        <span className="text-sm font-semibold text-gray-700">Mode</span>
        <button
          onClick={() => setMode('clean')}
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${mode === 'clean' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
        >
          <Filter className="w-4 h-4 mr-1" /> Clean
        </button>
        <button
          onClick={() => setMode('build')}
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${mode === 'build' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
        >
          <Wand2 className="w-4 h-4 mr-1" /> Build Structure
        </button>
        <span className="text-xs text-gray-500">ใช้เครื่องมือเดิมได้ทั้งสองโหมด</span>
      </div>

      {/* Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Clean Tools */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Clean Tools</h3>
              </div>
              <span className="text-xs text-gray-400">Find/Replace, Transform</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Find & Replace</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="Find"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Replace with"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Columns</option>
                    {workingColumns.map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.label || col.key}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleFindReplace}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
                  >
                    <Repeat className="w-4 h-4 mr-1" /> Apply
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Quick Transform</label>
                <div className="flex space-x-2">
                  <select
                    value={transformCol}
                    onChange={(e) => setTransformCol(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select column</option>
                    {workingColumns.map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.label || col.key}
                      </option>
                    ))}
                  </select>
                  <select
                    value={transformAction}
                    onChange={(e) => setTransformAction(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="date">Parse Date</option>
                    <option value="explode">Explode Tags</option>
                  </select>
                </div>
                {transformAction === 'explode' && (
                  <input
                    type="text"
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Delimiter (e.g., ,)"
                  />
                )}
                <button
                  onClick={handleTransform}
                  className="inline-flex items-center px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold"
                >
                  <Wand2 className="w-4 h-4 mr-1" /> Transform
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Column Types</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {workingColumns.map((col) => (
                  <div key={col.key} className="border border-gray-200 rounded-lg p-3">
                    <div className="text-sm font-semibold text-gray-800">{col.label || col.key}</div>
                    <select
                      value={col.type}
                      onChange={(e) => updateColumnType(col.key, e.target.value as ColumnConfig['type'])}
                      className="mt-2 w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="tag_array">Tags</option>
                      <option value="sentiment">Sentiment</option>
                      <option value="channel">Channel</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Build Tools */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Build Structure</h3>
              </div>
              <span className="text-xs text-gray-400">สร้างคอลัมน์ใหม่แบบเดิม</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Source Column</label>
                <select
                  value={selectedSourceCol}
                  onChange={(e) => handleSourceInsight(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select column</option>
                  {workingColumns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label || col.key}
                    </option>
                  ))}
                </select>
                {sourceInsight && (
                  <p className="text-xs text-gray-500">Insight: {sourceInsight.isArrayLikely ? 'Array-like' : sourceInsight.isDateLikely ? 'Date-like' : 'Plain text/number'}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Target Column Name</label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Cleaned_Date"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Method</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value as TransformMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="copy">Copy</option>
                  <option value="array_count">Array Count</option>
                  <option value="array_join">Array Join</option>
                  <option value="array_extract">Array Extract (Index 0)</option>
                  <option value="array_includes">Array Includes (keyword)</option>
                  <option value="date_extract">Date Extract</option>
                  <option value="date_format">Date Format</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Parameters</label>
                {selectedMethod === 'array_join' && (
                  <input
                    type="text"
                    value={methodParams.delimiter || ', '}
                    onChange={(e) => setMethodParams({ ...methodParams, delimiter: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Delimiter"
                  />
                )}
                {selectedMethod === 'array_extract' && (
                  <input
                    type="number"
                    value={methodParams.index ?? 0}
                    onChange={(e) => setMethodParams({ ...methodParams, index: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Index"
                  />
                )}
                {selectedMethod === 'array_includes' && (
                  <input
                    type="text"
                    value={methodParams.keyword || ''}
                    onChange={(e) => setMethodParams({ ...methodParams, keyword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Keyword"
                  />
                )}
                {selectedMethod === 'date_extract' && (
                  <select
                    value={methodParams.datePart || 'date_only'}
                    onChange={(e) => setMethodParams({ ...methodParams, datePart: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="date_only">Date Only</option>
                    <option value="time_only">Time Only</option>
                    <option value="year">Year</option>
                    <option value="month">Month</option>
                    <option value="day">Day</option>
                  </select>
                )}
                {(selectedMethod === 'copy' || selectedMethod === 'date_format') && (
                  <p className="text-xs text-gray-500">ไม่ต้องตั้งค่าเพิ่มเติม</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Value Map (optional)</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={valueKey}
                    onChange={(e) => setValueKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="from"
                  />
                  <input
                    type="text"
                    value={valueVal}
                    onChange={(e) => setValueVal(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="to"
                  />
                  <button
                    onClick={addValueMap}
                    className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {renderValueMap()}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={addRule}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Rule
              </button>
              {selectedSourceCol && (
                <button
                  onClick={() => {
                    const candidates = getAllUniqueValues(workingRows, selectedSourceCol, selectedMethod);
                    showToast('Value samples', `พบตัวอย่าง ${candidates.length} ค่าแรก`, 'info');
                  }}
                  className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm border border-gray-200"
                >
                  <ChevronRight className="w-4 h-4 mr-1" /> View unique samples
                </button>
              )}
            </div>

            {rules.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-800">Rules</h4>
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{rule.targetName}</p>
                        <p className="text-xs text-gray-500">
                          from <strong>{rule.sourceKey}</strong> via <strong>{rule.method}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="text-red-500 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <TableIcon className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Preview ({previewRows.length} rows)</h3>
              </div>
              <span className="text-xs text-gray-400">{mode === 'build' ? 'Structured' : 'Merged'} data</span>
            </div>
            {previewColumns.length === 0 ? (
              <p className="text-sm text-gray-500">Select tables to preview merged output.</p>
            ) : (
              <div className="overflow-x-auto max-h-[420px]">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewColumns.slice(0, 6).map((col) => (
                        <th key={col.key} className="px-3 py-2 text-left text-gray-600 font-semibold">
                          {col.label || col.key}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                        {previewColumns.slice(0, 6).map((col) => (
                          <td key={col.key} className="px-3 py-2 text-gray-700">
                            {String(row[col.key] ?? '')}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleDeleteRow(idx)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
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
              <div className="grid grid-cols-1 gap-3">
                {prepConfigs.map((config) => (
                  <div
                    key={config.id}
                    className={`border rounded-lg p-4 ${activeConfigId === config.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  >
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
      </div>
    </div>
  );
};

export default DataPrep;
