import React, { useCallback, useMemo, useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, Link as LinkIcon, DownloadCloud, Plus, MoreVertical, RefreshCw, Layers } from 'lucide-react';
import { parseExcelFile, parseCsvUrl, inferColumns } from '../utils/excel';
import { Project, RawRow, SourceTable, ColumnConfig } from '../types';
import { saveProject } from '../utils/storage';
import { useToast } from '../components/ToastProvider';

interface DataIngestProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
  onNext: () => void;
}

const DataIngest: React.FC<DataIngestProps> = ({ project, onUpdateProject, onNext }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'url'>('file');
  const [sheetUrl, setSheetUrl] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const { showToast } = useToast();

  const database = project.database || [];

  const addOrUpdateTable = async (table: SourceTable) => {
    const existingIndex = database.findIndex((t) => t.id === table.id);
    let updatedDatabase = [...database];
    if (existingIndex >= 0) {
      updatedDatabase[existingIndex] = table;
    } else {
      updatedDatabase.push(table);
    }
    const updatedProject = { ...project, database: updatedDatabase, lastModified: Date.now() };
    await saveProject(updatedProject);
    onUpdateProject(updatedProject);
  };

  const buildColumns = (existing: ColumnConfig[], rows: RawRow[]): ColumnConfig[] => {
    const base = [...existing];
    if (rows.length === 0) return base.length ? base : [];
    const incoming = inferColumns(rows[0]);
    incoming.forEach((col) => {
      if (!base.find((c) => c.key === col.key)) base.push(col);
    });
    return base;
  };

  const processData = async (mode: 'create' | 'append' | 'replace', targetId: string | null, name: string, newData: RawRow[]) => {
    if (newData.length === 0) throw new Error('The dataset appears to be empty.');

    if (mode === 'create') {
      const columns = buildColumns([], newData);
      const newTable: SourceTable = {
        id: targetId || `raw_${crypto.randomUUID()}`,
        name,
        rows: newData,
        columns,
        createdBy: 'You',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await addOrUpdateTable(newTable);
      showToast('Table created', `${name} added with ${newData.length} rows.`, 'success');
      return;
    }

    const existing = database.find((t) => t.id === targetId);
    if (!existing) throw new Error('Target table not found.');

    const mergedRows = mode === 'append' ? [...existing.rows, ...newData] : [...newData];
    const mergedColumns = buildColumns(existing.columns, mergedRows);

    const updatedTable: SourceTable = {
      ...existing,
      rows: mergedRows,
      columns: mergedColumns,
      updatedAt: Date.now(),
    };
    await addOrUpdateTable(updatedTable);
    showToast(mode === 'append' ? 'Data appended' : 'Table replaced', `${newData.length} rows processed.`, 'success');
  };

  const handleFileUpload = async (files: FileList | null, mode: 'create' | 'append' | 'replace', targetId: string | null, nameOverride?: string) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    const file = files[0];
    try {
      if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
        throw new Error('Invalid file format. Please upload an Excel or CSV file.');
      }
      const newData = await parseExcelFile(file);
      await processData(mode, targetId, nameOverride || newTableName || file.name, newData);
      setNewTableName('');
    } catch (err: any) {
      console.error(err);
      showToast('Import Failed', err.message || 'Failed to process file.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlImport = async () => {
    if (!sheetUrl || !newTableName) return;
    setIsLoading(true);
    try {
      const newData = await parseCsvUrl(sheetUrl);
      await processData('create', null, newTableName, newData);
      setSheetUrl('');
      setNewTableName('');
    } catch (err: any) {
      console.error(err);
      showToast('Link Import Failed', 'Ensure the link is a direct CSV or published Google Sheet CSV link.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files, 'create', null);
  }, [handleFileUpload]);

  const totalRows = useMemo(() => database.reduce((acc, t) => acc + (t.rows?.length || 0), 0), [database]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Database (Raw Assets)</h2>
          <p className="text-gray-500">Manage read-only raw data tables. Append or replace files without editing cells.</p>
        </div>
        <div className="text-sm text-gray-500 flex items-center space-x-2">
          <Layers className="w-4 h-4" />
          <span>{database.length} tables / {totalRows.toLocaleString()} rows</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => setImportMode('file')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'file' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            <div className="flex items-center space-x-2">
              <UploadCloud className="w-4 h-4" />
              <span>Upload File</span>
            </div>
          </button>
          <button
            onClick={() => setImportMode('url')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'url' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            <div className="flex items-center space-x-2">
              <LinkIcon className="w-4 h-4" />
              <span>Google Sheets / CSV Link</span>
            </div>
          </button>
        </div>

        {importMode === 'file' ? (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out ${
              isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            } bg-white`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              {isLoading ? (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              ) : (
                <UploadCloud className="w-10 h-10 text-blue-600" />
              )}
            </div>

            <div className="flex items-center justify-center space-x-3 mb-4">
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Table name (e.g., Sales_Q1)"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
              <div className="relative inline-block">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => handleFileUpload(e.target.files, 'create', null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                  Browse Files
                </button>
              </div>
            </div>
            <p className="text-gray-500 mb-2 text-sm">Supports .xlsx, .xls, .csv. Data will be saved as a new table in the Database drawer.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import from URL</h3>
            <p className="text-gray-500 text-sm mb-6">
              Paste a direct link to a CSV file or a <strong>published Google Sheet CSV link</strong>.
            </p>

            <div className="flex space-x-3">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Table name"
                className="px-3 py-2.5 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleUrlImport}
                disabled={isLoading || !sheetUrl || !newTableName}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center"
              >
                {isLoading ? 'Loading...' : (<><DownloadCloud className="w-4 h-4 mr-2" /> Import</>)}
              </button>
            </div>
          </div>
        )}
      </div>

      {database.length > 0 && !isLoading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-gray-800 flex items-center">
              <FileSpreadsheet className="w-5 h-5 mr-2 text-gray-500" />
              Raw Tables
            </h4>
            <button onClick={onNext} className="text-sm font-semibold underline hover:text-blue-700 text-blue-600">
              Go to Prep Configs →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {database.map((table, idx) => (
              <div key={table.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400">No. {idx + 1}</p>
                    <h5 className="text-lg font-bold text-gray-900">{table.name}</h5>
                    <p className="text-sm text-gray-500">{table.rows.length.toLocaleString()} rows • {table.columns.length} columns</p>
                    <p className="text-xs text-gray-400 mt-1">Updated {new Date(table.updatedAt).toLocaleString()}</p>
                  </div>
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </div>

                <div className="flex items-center space-x-3 mt-4">
                  <label className="flex-1 relative inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:border-blue-400">
                    <input type="file" accept=".xlsx, .xls, .csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e.target.files, 'append', table.id, table.name)} />
                    <Plus className="w-4 h-4 mr-2" /> Append Data
                  </label>
                  <label className="flex-1 relative inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:border-red-200">
                    <input type="file" accept=".xlsx, .xls, .csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e.target.files, 'replace', table.id, table.name)} />
                    <RefreshCw className="w-4 h-4 mr-2" /> Replace
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {database.length > 0 && !isLoading && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-green-800 animate-fade-in-up">
          <div className="flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-3" />
            <span>Database ready with <strong>{database.length}</strong> tables.</span>
          </div>
          <button onClick={onNext} className="text-sm font-semibold underline hover:text-green-900">
            Proceed to Prep →
          </button>
        </div>
      )}
    </div>
  );
};

export default DataIngest;
