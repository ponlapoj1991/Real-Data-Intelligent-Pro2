import React, { useState, useEffect } from 'react';
import { Database, Plus, Edit2, Trash2, FileSpreadsheet, Clock, Upload, Download } from 'lucide-react';
import { Project, RawTable } from '../types';
import { saveProject } from '../utils/storage';
import { parseExcelFile } from '../utils/excel';
import EmptyState from '../components/EmptyState';

interface Props {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

const DatabaseManager: React.FC<Props> = ({ project, onUpdateProject }) => {
  const [rawTables, setRawTables] = useState<RawTable[]>(project.rawTables || []);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RawTable | null>(null);

  // Sync rawTables with project
  useEffect(() => {
    setRawTables(project.rawTables || []);
  }, [project.rawTables]);

  const handleCreateTable = async (name: string, file: File) => {
    setLoading(true);
    try {
      // Parse file
      const data = await parseExcelFile(file);

      if (data.length === 0) {
        alert('File is empty or could not be parsed');
        setLoading(false);
        return;
      }

      // Extract columns from first row
      const columns = Object.keys(data[0]);

      // Create new RawTable
      const newTable: RawTable = {
        id: crypto.randomUUID(),
        name,
        fileName: file.name,
        fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx',
        data,
        columns,
        rowCount: data.length,
        createdBy: 'User',
        createdAt: Date.now(),
        lastModified: Date.now(),
      };

      // Update project
      const updatedTables = [...rawTables, newTable];
      const updatedProject = {
        ...project,
        rawTables: updatedTables,
      };

      await saveProject(updatedProject);
      onUpdateProject(updatedProject);
      setRawTables(updatedTables);
      setShowCreateModal(false);

      console.log('✅ Table created:', name, `(${data.length} rows)`);
    } catch (error) {
      console.error('Failed to create table:', error);
      alert('Failed to create table. Please check the file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppendData = async (tableId: string, file: File) => {
    setLoading(true);
    try {
      const newData = await parseExcelFile(file);

      if (newData.length === 0) {
        alert('File is empty');
        setLoading(false);
        return;
      }

      // Find table and append data
      const updatedTables = rawTables.map(table => {
        if (table.id === tableId) {
          const mergedData = [...table.data, ...newData];
          return {
            ...table,
            data: mergedData,
            rowCount: mergedData.length,
            lastModified: Date.now(),
          };
        }
        return table;
      });

      const updatedProject = {
        ...project,
        rawTables: updatedTables,
      };

      await saveProject(updatedProject);
      onUpdateProject(updatedProject);
      setRawTables(updatedTables);
      setShowEditModal(false);

      console.log('✅ Data appended:', newData.length, 'new rows');
    } catch (error) {
      console.error('Failed to append data:', error);
      alert('Failed to append data');
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceData = async (tableId: string, file: File) => {
    setLoading(true);
    try {
      const newData = await parseExcelFile(file);

      if (newData.length === 0) {
        alert('File is empty');
        setLoading(false);
        return;
      }

      const newColumns = Object.keys(newData[0]);

      // Replace data completely
      const updatedTables = rawTables.map(table => {
        if (table.id === tableId) {
          return {
            ...table,
            data: newData,
            columns: newColumns,
            rowCount: newData.length,
            fileName: file.name,
            lastModified: Date.now(),
          };
        }
        return table;
      });

      const updatedProject = {
        ...project,
        rawTables: updatedTables,
      };

      await saveProject(updatedProject);
      onUpdateProject(updatedProject);
      setRawTables(updatedTables);
      setShowEditModal(false);

      console.log('✅ Data replaced:', newData.length, 'rows');
    } catch (error) {
      console.error('Failed to replace data:', error);
      alert('Failed to replace data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (tableId: string, tableName: string) => {
    if (!confirm(`Are you sure you want to delete "${tableName}"? This action cannot be undone.`)) {
      return;
    }

    const updatedTables = rawTables.filter(t => t.id !== tableId);
    const updatedProject = {
      ...project,
      rawTables: updatedTables,
    };

    await saveProject(updatedProject);
    onUpdateProject(updatedProject);
    setRawTables(updatedTables);

    console.log('✅ Table deleted:', tableName);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              Database Management
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Raw material library - Upload and manage your data sources
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Create Table
          </button>
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-auto p-8">
        {rawTables.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No tables yet"
            description="Create your first table to start importing data. Tables are immutable storage for your raw data files."
            actionLabel="Create Table"
            onAction={() => setShowCreateModal(true)}
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
                    Table Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rows
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rawTables.map((table, index) => (
                  <tr key={table.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">{table.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {table.fileName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {table.rowCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {table.createdBy}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(table.lastModified).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedTable(table);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Manage Data"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table.id, table.name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Table"
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

      {/* Create Table Modal */}
      {showCreateModal && (
        <CreateTableModal
          loading={loading}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTable}
        />
      )}

      {/* Edit Table Modal */}
      {showEditModal && selectedTable && (
        <EditTableModal
          table={selectedTable}
          loading={loading}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTable(null);
          }}
          onAppend={(file) => handleAppendData(selectedTable.id, file)}
          onReplace={(file) => handleReplaceData(selectedTable.id, file)}
        />
      )}
    </div>
  );
};

// ==========================================
// Create Table Modal Component
// ==========================================

interface CreateTableModalProps {
  loading: boolean;
  onClose: () => void;
  onCreate: (name: string, file: File) => void;
}

const CreateTableModal: React.FC<CreateTableModalProps> = ({ loading, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !file) {
      alert('Please provide both table name and file');
      return;
    }
    onCreate(name.trim(), file);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Create New Table</h3>
        <p className="text-sm text-gray-500 mb-6">
          Upload an Excel or CSV file to create a new data table
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Table Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g. Sales Q1 2024"
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Click to upload
                </span>
                <span className="text-sm text-gray-500"> or drag and drop</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  disabled={loading}
                />
              </label>
              {file && (
                <div className="mt-3 text-sm text-gray-700 font-medium">
                  {file.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !file}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// Edit Table Modal Component
// ==========================================

interface EditTableModalProps {
  table: RawTable;
  loading: boolean;
  onClose: () => void;
  onAppend: (file: File) => void;
  onReplace: (file: File) => void;
}

const EditTableModal: React.FC<EditTableModalProps> = ({
  table,
  loading,
  onClose,
  onAppend,
  onReplace,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [action, setAction] = useState<'append' | 'replace' | null>(null);

  const handleSubmit = (selectedAction: 'append' | 'replace') => {
    if (!file) {
      alert('Please select a file');
      return;
    }
    if (selectedAction === 'append') {
      onAppend(file);
    } else {
      onReplace(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Manage Table Data</h3>
        <p className="text-sm text-gray-500 mb-2">
          {table.name}
        </p>
        <div className="text-xs text-gray-400 mb-6">
          Current: {table.rowCount.toLocaleString()} rows
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Click to upload
                </span>
                <span className="text-sm text-gray-500"> or drag and drop</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  disabled={loading}
                />
              </label>
              {file && (
                <div className="mt-3 text-sm text-gray-700 font-medium">
                  {file.name}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Choose Action:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSubmit('append')}
                disabled={loading || !file}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-900">Append Data</div>
                <div className="text-xs text-gray-500 mt-1">Add rows to existing data</div>
              </button>
              <button
                onClick={() => handleSubmit('replace')}
                disabled={loading || !file}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5 text-orange-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-900">Replace Data</div>
                <div className="text-xs text-gray-500 mt-1">Replace all existing data</div>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManager;
