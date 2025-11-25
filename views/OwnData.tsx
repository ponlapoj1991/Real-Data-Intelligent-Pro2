import React, { useState, useEffect } from 'react';
import { FileCheck, Download, Trash2, Clock, Eye, Database } from 'lucide-react';
import { Project, OwnDataTable } from '../types';
import { saveProject } from '../utils/storage';
import EmptyState from '../components/EmptyState';
import { exportToExcel } from '../utils/excel';

interface Props {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

const OwnData: React.FC<Props> = ({ project, onUpdateProject }) => {
  const [ownDataTables, setOwnDataTables] = useState<OwnDataTable[]>(project.ownDataTables || []);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTable, setPreviewTable] = useState<OwnDataTable | null>(null);

  // Sync with project
  useEffect(() => {
    setOwnDataTables(project.ownDataTables || []);
  }, [project.ownDataTables]);

  const handleDelete = async (tableId: string, tableName: string) => {
    if (!confirm(`Are you sure you want to delete "${tableName}"? This action cannot be undone.`)) {
      return;
    }

    const updated = ownDataTables.filter(t => t.id !== tableId);
    const updatedProject = {
      ...project,
      ownDataTables: updated,
    };

    await saveProject(updatedProject);
    onUpdateProject(updatedProject);
    setOwnDataTables(updated);
  };

  const handleExport = (table: OwnDataTable) => {
    exportToExcel(table.data, `${project.name}_${table.name}`);
  };

  const handlePreview = (table: OwnDataTable) => {
    setPreviewTable(table);
    setShowPreview(true);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <FileCheck className="w-6 h-6 text-green-600" />
              </div>
              Own Data
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Processed and extracted datasets ready for analysis
            </p>
          </div>
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-auto p-8">
        {ownDataTables.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="No processed data yet"
            description="Extract data from your PrepConfig transformations to create processed datasets here."
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dataset Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rows
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Columns
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ownDataTables.map((table, index) => (
                  <tr key={table.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="font-medium text-gray-900">{table.name}</div>
                          {table.description && (
                            <div className="text-xs text-gray-500">{table.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {table.sourceType === 'prepConfig' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          PrepConfig
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {table.rowCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {table.columns.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(table.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePreview(table)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview Data"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExport(table)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Export to Excel"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(table.id, table.name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewTable && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{previewTable.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {previewTable.rowCount.toLocaleString()} rows · {previewTable.columns.length} columns
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    {previewTable.columns.map((col) => (
                      <th key={col.key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {col.label || col.key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewTable.data.slice(0, 100).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-400 font-mono text-xs">{idx + 1}</td>
                      {previewTable.columns.map((col) => (
                        <td key={col.key} className="px-4 py-2 text-gray-700 truncate max-w-xs">
                          {String(row[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewTable.data.length > 100 && (
                <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 border-t">
                  Showing first 100 rows of {previewTable.rowCount.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnData;
