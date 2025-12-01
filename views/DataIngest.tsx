import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCcw, Pencil, Star } from 'lucide-react';
import { DataSource, DataSourceKind, Project, RawRow } from '../types';
import { useToast } from '../components/ToastProvider';
import { useExcelWorker } from '../hooks/useExcelWorker';
import { inferColumns } from '../utils/excel';
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
    helper: 'Use the upload button to create a table.',
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
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sources = useMemo(() => getDataSourcesByKind(normalizedProject, kind).sort((a, b) => b.updatedAt - a.updatedAt), [kind, normalizedProject]);

  const { parseFile } = useExcelWorker();

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

  const setActive = async (id: string) => {
    const updated = setActiveDataSource(normalizedProject, id);
    await persistProject(updated);
    showToast('Active table changed', 'Other features will now use this table.', 'info');
  };

  const meta = titles[kind];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{meta.title}</h2>
          <p className="text-gray-500 text-sm">{meta.subtitle}</p>
        </div>
        <div className="flex items-center space-x-3">
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

    </div>
  );
};

export default DataIngest;
