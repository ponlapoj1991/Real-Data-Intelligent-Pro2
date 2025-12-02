import React, { useMemo, useState } from 'react';
import { Plus, Save, Loader2 } from 'lucide-react';
import { ColumnConfig, DataSource, Project, RawRow } from '../types';
import { ensureDataSources, getDataSourcesByKind } from '../utils/dataSources';
import { addDerivedDataSource } from '../utils/dataSources';
import { saveProject } from '../utils/storage-compat';
import { useToast } from '../components/ToastProvider';

interface CleansingDataProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

const CleansingData: React.FC<CleansingDataProps> = ({ project, onUpdateProject }) => {
  const { project: normalizedProject } = useMemo(() => ensureDataSources(project), [project]);
  const ingestionSources = useMemo(() => getDataSourcesByKind(normalizedProject, 'ingestion'), [normalizedProject]);
  const preparedSources = useMemo(() => getDataSourcesByKind(normalizedProject, 'prepared'), [normalizedProject]);

  const allSources: DataSource[] = useMemo(
    () => [...ingestionSources, ...preparedSources].sort((a, b) => b.updatedAt - a.updatedAt),
    [ingestionSources, preparedSources]
  );

  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const handleSelect = (source: DataSource) => {
    setSelectedSource(source);
    setShowPicker(false);
  };

  const handleSave = async () => {
    if (!selectedSource) return;
    setIsSaving(true);
    const newName = `${selectedSource.name} - Cleansed`;
    const updated = addDerivedDataSource(normalizedProject, newName, selectedSource.rows, selectedSource.columns, 'prepared');
    await saveProject(updated);
    onUpdateProject(updated);
    showToast('Saved', 'Table stored under Preparation Data.', 'success');
    setTimeout(() => setIsSaving(false), 400);
  };

  const renderTable = (rows: RawRow[], columns: ColumnConfig[]) => {
    const preview = rows.slice(0, 10);
    return (
      <div className="mt-6 border border-gray-200 rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-700">
            <thead>
              <tr className="bg-gray-50 text-left">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">
                    {col.label || col.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2 text-gray-800">
                      {row[col.key] as any}
                    </td>
                  ))}
                </tr>
              ))}
              {preview.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-400" colSpan={columns.length}>
                    No data in this source.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col px-10 py-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cleansing Data</h1>
          <p className="text-sm text-gray-500">Attach a table from Management Data to start cleansing.</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedSource && (
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

      {!selectedSource && (
        <div className="flex-1 border border-dashed border-gray-200 rounded-xl bg-white/60 flex items-center justify-center text-gray-400 text-sm">
          Select a table to begin cleansing.
        </div>
      )}

      {selectedSource && (
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Working source</p>
              <h2 className="text-lg font-semibold text-gray-900">{selectedSource.name}</h2>
            </div>
            <div className="text-sm text-gray-500">Rows: {selectedSource.rows.length.toLocaleString()}</div>
          </div>
          {renderTable(selectedSource.rows, selectedSource.columns)}
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Select a source table</h3>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {allSources.map((src) => (
                <button
                  key={src.id}
                  onClick={() => handleSelect(src)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-left hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{src.name}</p>
                      <p className="text-xs text-gray-500">{src.kind === 'ingestion' ? 'Ingestion' : 'Preparation'} data</p>
                    </div>
                    <span className="text-xs text-gray-500">{src.rows.length.toLocaleString()} rows</span>
                  </div>
                </button>
              ))}
              {allSources.length === 0 && <p className="text-sm text-gray-500">No tables available. Upload data first.</p>}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPicker(false)}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleansingData;
