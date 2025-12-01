import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, Link as LinkIcon, DownloadCloud, Layers, RefreshCcw, Plus, Database, Table2, Wand2, ArrowRight } from 'lucide-react';
import { parseCsvUrl, inferColumns } from '../utils/excel';
import { DataSource, DataSourceKind, Project, RawRow } from '../types';
import { saveProject } from '../utils/storage-compat';
import { useToast } from '../components/ToastProvider';
import { useExcelWorker } from '../hooks/useExcelWorker';
import {
  ensureDataSources,
  getDataSourcesByKind,
  setActiveDataSource,
  updateDataSourceRows,
  upsertDataSource
} from '../utils/dataSources';

interface DataIngestProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
  onNext?: () => void;
}

interface PendingUpload {
  mode: 'new' | 'append' | 'replace';
  kind: DataSourceKind;
  sourceId?: string;
  name?: string;
}

const DataIngest: React.FC<DataIngestProps> = ({ project, onUpdateProject, onNext }) => {
  const needsNormalization = !project.dataSources?.length || !project.activeDataSourceId;
  const normalizedProject = useMemo(() => (needsNormalization ? ensureDataSources(project).project : project), [needsNormalization, project]);

  useEffect(() => {
    if (needsNormalization) {
      onUpdateProject(normalizedProject);
    }
  }, [needsNormalization, normalizedProject, onUpdateProject]);

  const { showToast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'url'>('file');
  const [sheetUrl, setSheetUrl] = useState('');
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ingestionSources = useMemo(() => getDataSourcesByKind(normalizedProject, 'ingestion'), [normalizedProject]);
  const preparedSources = useMemo(() => getDataSourcesByKind(normalizedProject, 'prepared'), [normalizedProject]);

  // Web Worker for Excel parsing
  const { parseFile, isProcessing, progress, error: workerError } = useExcelWorker();

  const startUpload = (config: PendingUpload) => {
    if (config.mode === 'new') {
      const suggested = `Table ${ingestionSources.length + 1}`;
      const name = prompt('Name this table', suggested) || '';
      if (!name.trim()) return;
      setPendingUpload({ ...config, name });
    } else {
      setPendingUpload(config);
    }
    fileInputRef.current?.click();
  };

  const buildColumns = (rows: RawRow[]): ReturnType<typeof inferColumns> => {
    if (!rows.length) return [];
    return inferColumns(rows[0]);
  };

  const persistProject = async (updated: Project) => {
    onUpdateProject(updated);
    await saveProject(updated);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const targetUpload: PendingUpload = pendingUpload || {
      mode: 'new',
      kind: 'ingestion',
      name: `Table ${ingestionSources.length + 1}`,
    };
    const file = files[0];
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      showToast('Invalid Format', 'Please upload an Excel (.xlsx, .xls) or CSV file.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const newData = await parseFile(file);
      if (newData.length === 0) {
        throw new Error('The file appears to be empty.');
      }
      await processIncomingData(newData, targetUpload);
      showToast('Import Successful', `${file.name} processed successfully.`, 'success');
    } catch (err: any) {
      console.error('[DataManagement] Upload error:', err);
      showToast('Import Failed', err.message || 'Failed to process file.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const processIncomingData = async (rows: RawRow[], upload: PendingUpload) => {
    const columns = buildColumns(rows);
    if (upload.mode === 'new') {
      const newSource: DataSource = {
        id: crypto.randomUUID(),
        name: upload.name || 'New Table',
        kind: upload.kind,
        rows,
        columns,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updatedProject = upsertDataSource(normalizedProject, newSource, { setActive: true });
      await persistProject(updatedProject);
      return;
    }

    if (!upload.sourceId) return;
    const updatedProject = updateDataSourceRows(normalizedProject, upload.sourceId, rows, columns, upload.mode === 'append' ? 'append' : 'replace');
    await persistProject(updatedProject);
  };

  const handleUrlImport = async () => {
    if (!sheetUrl || importMode !== 'url') return;
    setIsLoading(true);
    try {
      const newData = await parseCsvUrl(sheetUrl);
      await processIncomingData(newData, { mode: 'new', kind: 'ingestion', name: `Linked Table ${ingestionSources.length + 1}` });
      setSheetUrl('');
    } catch (err: any) {
      console.error(err);
      showToast('Link Import Failed', 'Ensure the link is a direct CSV or published Google Sheet CSV link.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const setActive = async (id: string) => {
    const updated = setActiveDataSource(normalizedProject, id);
    await persistProject(updated);
    showToast('Active table changed', 'Other features will now use this table.', 'info');
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Management Data</h2>
          <p className="text-gray-500">Upload multiple tables and pick which one fuels Analytics, Clean & Prep, and Reports.</p>
        </div>
        {onNext && (
          <button
            onClick={onNext}
            className="hidden md:inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ingestion Data</h3>
                <p className="text-sm text-gray-500">Raw uploads you bring into the workspace.</p>
              </div>
            </div>
            <button
              onClick={() => startUpload({ mode: 'new', kind: 'ingestion' })}
              className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" /> Upload
            </button>
          </div>

          <div className="space-y-3">
            {ingestionSources.length === 0 && (
              <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500">
                No ingestion tables yet. Upload your first file to get started.
              </div>
            )}
            {ingestionSources.map((source) => (
              <div key={source.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">{source.kind}</span>
                      {normalizedProject.activeDataSourceId === source.id && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700">Active</span>
                      )}
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 mt-2">{source.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{source.rows.length.toLocaleString()} rows • Updated {new Date(source.updatedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActive(source.id)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700"
                    >
                      Set Active
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => startUpload({ mode: 'append', kind: 'ingestion', sourceId: source.id })}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700"
                      >
                        Append
                      </button>
                    </div>
                    <button
                      onClick={() => startUpload({ mode: 'replace', kind: 'ingestion', sourceId: source.id })}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Table2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Preparation Data</h3>
                <p className="text-sm text-gray-500">Structured outputs created across the app.</p>
              </div>
            </div>
            <div className="text-xs text-gray-400 flex items-center space-x-1">
              <Wand2 className="w-4 h-4" />
              <span>Save from Clean & Prep to populate</span>
            </div>
          </div>

          <div className="space-y-3">
            {preparedSources.length === 0 && (
              <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500">
                No prepared tables yet. Use "Save as prepared table" inside Clean & Prep or other features to drop data here.
              </div>
            )}
            {preparedSources.map((source) => (
              <div key={source.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">{source.kind}</span>
                      {normalizedProject.activeDataSourceId === source.id && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700">Active</span>
                      )}
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 mt-2">{source.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{source.rows.length.toLocaleString()} rows • Updated {new Date(source.updatedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActive(source.id)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700"
                    >
                      Set Active
                    </button>
                    <button
                      onClick={() => startUpload({ mode: 'append', kind: 'prepared', sourceId: source.id })}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700"
                    >
                      Append
                    </button>
                    <button
                      onClick={() => startUpload({ mode: 'replace', kind: 'prepared', sourceId: source.id })}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Layers className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Universal Upload</h3>
              <p className="text-sm text-gray-500">Drag & drop or paste a CSV/Excel link to create new tables.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            {(isLoading || isProcessing) && <RefreshCcw className="w-4 h-4 animate-spin" />}
            <span>{isLoading || isProcessing ? 'Processing...' : 'Idle'}</span>
          </div>
        </div>

        <div className="flex space-x-4 mb-6">
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
              {isLoading || isProcessing ? (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              ) : (
                <UploadCloud className="w-10 h-10 text-blue-600" />
              )}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isLoading || isProcessing ? 'Processing Data...' : 'Drag & Drop your file here'}
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
              Supports .xlsx, .xls, .csv. Choose Append/Replace from the cards above or create a new table.
            </p>

            {isProcessing && progress > 0 && (
              <div className="w-full max-w-md mx-auto mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Parsing file...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {!isLoading && (
              <div className="relative inline-block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                  Browse Files
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import from URL</h3>
            <p className="text-gray-500 text-sm mb-6">
              Paste a direct link to a CSV file or a <strong>published Google Sheet CSV link</strong>.
              <br />
              <span className="text-xs text-gray-400">For Google Sheets: File {'>'} Share {'>'} Publish to web {'>'} Select 'CSV'</span>
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
              <button
                onClick={handleUrlImport}
                disabled={isLoading || !sheetUrl}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center"
              >
                {isLoading ? 'Loading...' : (
                  <>
                    <DownloadCloud className="w-4 h-4 mr-2" /> Import
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm uppercase font-medium">Active Table</p>
            <p className="text-xl font-bold text-gray-900 mt-2">{normalizedProject.activeDataSourceId ? 'Selected' : 'None'}</p>
            <p className="text-sm text-gray-500 mt-1">Switch via cards above</p>
          </div>
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm uppercase font-medium">Ingestion Tables</p>
            <p className="text-xl font-bold text-gray-900 mt-2">{ingestionSources.length}</p>
            <p className="text-sm text-gray-500 mt-1">Upload and append anytime</p>
          </div>
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm uppercase font-medium">Prepared Tables</p>
            <p className="text-xl font-bold text-gray-900 mt-2">{preparedSources.length}</p>
            <p className="text-sm text-gray-500 mt-1">Saved outputs from features</p>
          </div>
        </div>
      </div>

      {workerError && <p className="text-sm text-red-600">{workerError}</p>}
    </div>
  );
};

export default DataIngest;
