import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, UploadCloud, RefreshCcw, Pencil, Star, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { DataSource, DataSourceKind, Project, RawRow } from '../types';
import { useToast } from '../components/ToastProvider';
import { useExcelWorker } from '../hooks/useExcelWorker';
import { parseCsvUrl, inferColumns } from '../utils/excel';
import { ensureDataSources, getDataSourcesByKind, setActiveDataSource, updateDataSourceRows, upsertDataSource } from '../utils/dataSources';
import { saveProject } from '../utils/storage-compat';

interface DataIngestProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
  kind: DataSourceKind;
  onNext?: () => void;
}

interface PendingUpload {
  mode: 'new' | 'append' | 'replace';
  sourceId?: string;
  name?: string;
}

const titles: Record<DataSourceKind, { title: string; subtitle: string; empty: string; helper?: string }> = {
  ingestion: {
    title: 'Ingestion Data',
    subtitle: 'Upload raw files as reusable tables. Each feature can pick any table it needs.',
    empty: 'No ingestion tables yet. Upload a file to get started.',
    helper: 'Use the upload button or drop a file below to create a table.',
  },
  prepared: {
    title: 'Preparation Data',
    subtitle: 'Data saved from features like Clean & Prep. Keep curated outputs neatly organized.',
    empty: 'No prepared tables yet. Save from Clean & Prep to populate this list.',
    helper: 'You can still append or replace data for a prepared table from here.',
  },
};

const DataIngest: React.FC<DataIngestProps> = ({ project, onUpdateProject, kind, onNext }) => {
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
  const [importUrl, setImportUrl] = useState('');
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sources = useMemo(() => getDataSourcesByKind(normalizedProject, kind).sort((a, b) => b.updatedAt - a.updatedAt), [kind, normalizedProject]);

  const { parseFile, isProcessing, progress } = useExcelWorker();

  const buildColumns = (rows: RawRow[]): ReturnType<typeof inferColumns> => {
    if (!rows.length) return [];
    return inferColumns(rows[0]);
  };

  const persistProject = async (updated: Project) => {
    onUpdateProject(updated);
    await saveProject(updated);
  };

  const startUpload = (config: PendingUpload) => {
    if (config.mode === 'new') {
      const suggested = kind === 'ingestion' ? `Table ${sources.length + 1}` : `Prepared Table ${sources.length + 1}`;
      const name = prompt('Name this table', suggested) || '';
      if (!name.trim()) return;
      setPendingUpload({ ...config, name });
    } else {
      setPendingUpload(config);
    }
    fileInputRef.current?.click();
  };

  const processIncomingData = async (rows: RawRow[], upload: PendingUpload) => {
    const columns = buildColumns(rows);

    if (upload.mode === 'new') {
      const newSource: DataSource = {
        id: crypto.randomUUID(),
        name: upload.name || 'New Table',
        kind,
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
    const mode = upload.mode === 'append' ? 'append' : 'replace';
    const updatedProject = updateDataSourceRows(normalizedProject, upload.sourceId, rows, columns, mode);
    await persistProject(updatedProject);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const targetUpload: PendingUpload = pendingUpload || { mode: 'new', name: `Table ${sources.length + 1}` };
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
      setPendingUpload(null);
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl) return;
    setIsLoading(true);
    try {
      const newData = await parseCsvUrl(importUrl);
      await processIncomingData(newData, { mode: 'new', name: importUrl.split('/').pop() || 'Linked Table' });
      setImportUrl('');
      showToast('Import Successful', 'Data imported from link.', 'success');
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

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const meta = titles[kind];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{meta.title}</h2>
          <p className="text-gray-500 text-sm">{meta.subtitle}</p>
        </div>
        <div className="flex items-center space-x-3">
          {onNext && (
            <button
              onClick={onNext}
              className="hidden md:inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          )}
          <button
            onClick={() => startUpload({ mode: 'new' })}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" /> Upload
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wide text-gray-400">Overview</span>
            <span className="text-gray-300">•</span>
            <span>{sources.length} table{sources.length === 1 ? '' : 's'}</span>
            {meta.helper && <span className="text-gray-300">•</span>}
            {meta.helper && <span>{meta.helper}</span>}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>Rows per page</span>
            <select className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span className="col-span-1">No.</span>
            <span className="col-span-3">Table name</span>
            <span className="col-span-2">Rows</span>
            <span className="col-span-3">Updated</span>
            <span className="col-span-1">Status</span>
            <span className="col-span-2 text-right">Action</span>
          </div>

          {sources.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">{meta.empty}</div>
          ) : (
            sources.map((source, idx) => {
              const isActive = normalizedProject.activeDataSourceId === source.id;
              return (
                <div key={source.id} className="grid grid-cols-12 px-4 py-3 items-center text-sm hover:bg-gray-50">
                  <span className="col-span-1 text-gray-500">{idx + 1}</span>
                  <div className="col-span-3">
                    <div className="font-semibold text-gray-900">{source.name}</div>
                    <div className="text-xs text-gray-500">{kind === 'ingestion' ? 'Uploaded table' : 'Prepared output'}</div>
                  </div>
                  <span className="col-span-2 text-gray-700">{source.rows.length.toLocaleString()}</span>
                  <span className="col-span-3 text-gray-700">{new Date(source.updatedAt).toLocaleString()}</span>
                  <div className="col-span-1">
                    {isActive ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-50 text-green-700 border border-green-100">Active</span>
                    ) : (
                      <button
                        onClick={() => setActive(source.id)}
                        className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
                      >
                        <Star className="w-3 h-3 mr-1" /> Set active
                      </button>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => startUpload({ mode: 'append', sourceId: source.id })}
                      className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 text-xs hover:border-blue-300 hover:text-blue-700"
                    >
                      <Pencil className="w-4 h-4 mr-1" /> Append
                    </button>
                    <button
                      onClick={() => startUpload({ mode: 'replace', sourceId: source.id })}
                      className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 text-xs hover:border-blue-300 hover:text-blue-700"
                    >
                      <RefreshCcw className="w-4 h-4 mr-1" /> Replace
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out bg-white ${
          isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            {isLoading || isProcessing ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {isLoading || isProcessing ? 'Processing data...' : 'Drag & drop a .xlsx, .xls, or .csv file'}
            </p>
            <p className="text-xs text-gray-500">Files will create or update the selected table action.</p>
          </div>
          {(isProcessing && progress > 0) && (
            <div className="w-full max-w-md mx-auto">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Parsing file...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-3">
            <div className="relative inline-block">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">Browse Files</button>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <LinkIcon className="w-4 h-4" />
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Paste CSV or published Google Sheet link"
                className="w-72 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleUrlImport}
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataIngest;
