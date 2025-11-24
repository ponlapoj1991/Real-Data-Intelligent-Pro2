import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Edit2, Trash2, Clock, Database, Settings, Layers, Download } from 'lucide-react';
import { Project, PrepConfig, MergingStrategy, RawTable } from '../types';
import { saveProject } from '../utils/storage';
import { unionTables, getMergeStatistics } from '../utils/dataMerge';
import EmptyState from '../components/EmptyState';
import { exportToExcel, inferColumns } from '../utils/excel';

interface Props {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

const DataPrep: React.FC<Props> = ({ project, onUpdateProject }) => {
  const [prepConfigs, setPrepConfigs] = useState<PrepConfig[]>(project.prepConfigs || []);
  const [rawTables] = useState<RawTable[]>(project.rawTables || []);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<PrepConfig | null>(null);

  // Sync prepConfigs with project
  useEffect(() => {
    setPrepConfigs(project.prepConfigs || []);
  }, [project.prepConfigs]);

  const handleCreateConfig = async (
    name: string,
    description: string,
    selectedTableIds: string[]
  ) => {
    setLoading(true);
    try {
      // Get selected tables
      const selectedTables = rawTables.filter(t => selectedTableIds.includes(t.id));

      if (selectedTables.length === 0) {
        alert('Please select at least one table');
        setLoading(false);
        return;
      }

      // Union tables
      const { data, columns } = unionTables(selectedTables);

      // Create column configs
      const columnConfigs = columns.map(col => ({
        key: col,
        type: 'string' as const,
        visible: true,
        label: col,
      }));

      // Create new PrepConfig
      const newConfig: PrepConfig = {
        id: crypto.randomUUID(),
        name,
        description,
        sourceTableIds: selectedTableIds,
        mergingStrategy: MergingStrategy.UNION,
        transformRules: [],
        outputData: data,
        outputColumns: columnConfigs,
        createdAt: Date.now(),
        lastModified: Date.now(),
      };

      // Update project
      const updatedConfigs = [...prepConfigs, newConfig];
      const updatedProject = {
        ...project,
        prepConfigs: updatedConfigs,
      };

      await saveProject(updatedProject);
      onUpdateProject(updatedProject);
      setPrepConfigs(updatedConfigs);
      setShowCreateModal(false);

      console.log('✅ Config created:', name, `(${data.length} rows, ${columns.length} columns)`);
    } catch (error) {
      console.error('Failed to create config:', error);
      alert('Failed to create configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (
    configId: string,
    selectedTableIds: string[]
  ) => {
    setLoading(true);
    try {
      const selectedTables = rawTables.filter(t => selectedTableIds.includes(t.id));

      if (selectedTables.length === 0) {
        alert('Please select at least one table');
        setLoading(false);
        return;
      }

      // Union tables
      const { data, columns } = unionTables(selectedTables);

      // Create column configs
      const columnConfigs = columns.map(col => ({
        key: col,
        type: 'string' as const,
        visible: true,
        label: col,
      }));

      // Update config
      const updatedConfigs = prepConfigs.map(config => {
        if (config.id === configId) {
          return {
            ...config,
            sourceTableIds: selectedTableIds,
            outputData: data,
            outputColumns: columnConfigs,
            lastModified: Date.now(),
          };
        }
        return config;
      });

      const updatedProject = {
        ...project,
        prepConfigs: updatedConfigs,
      };

      await saveProject(updatedProject);
      onUpdateProject(updatedProject);
      setPrepConfigs(updatedConfigs);
      setShowEditModal(false);

      console.log('✅ Config updated:', configId);
    } catch (error) {
      console.error('Failed to update config:', error);
      alert('Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfig = async (configId: string, configName: string) => {
    if (!confirm(`Are you sure you want to delete "${configName}"? This action cannot be undone.`)) {
      return;
    }

    const updatedConfigs = prepConfigs.filter(c => c.id !== configId);
    const updatedProject = {
      ...project,
      prepConfigs: updatedConfigs,
    };

    await saveProject(updatedProject);
    onUpdateProject(updatedProject);
    setPrepConfigs(updatedConfigs);

    console.log('✅ Config deleted:', configName);
  };

  const handleExportConfig = (config: PrepConfig) => {
    exportToExcel(config.outputData, `${project.name}_${config.name}`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              </div>
              Clean & Prep Configurations
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Processing factory - Create recipes to transform and merge your data
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={loading || rawTables.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Create Configuration
          </button>
        </div>
      </div>

      {/* Config List */}
      <div className="flex-1 overflow-auto p-8">
        {rawTables.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No data sources available"
            description="Please add tables in the Database tab first before creating configurations."
            actionLabel="Go to Database"
            onAction={() => {
              // Navigation handled by parent
            }}
          />
        ) : prepConfigs.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="No configurations yet"
            description="Create your first configuration to start processing and transforming your data."
            actionLabel="Create Configuration"
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
                    Configuration Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source Tables
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Output Rows
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Output Columns
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
                {prepConfigs.map((config, index) => (
                  <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-medium text-gray-900">{config.name}</div>
                          {config.description && (
                            <div className="text-xs text-gray-500">{config.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {config.sourceTableIds.length} table{config.sourceTableIds.length > 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {config.outputData.length.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {config.outputColumns.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(config.lastModified).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleExportConfig(config)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Export to Excel"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedConfig(config);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Configuration"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(config.id, config.name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Configuration"
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

      {/* Create Config Modal */}
      {showCreateModal && (
        <CreateConfigModal
          rawTables={rawTables}
          loading={loading}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateConfig}
        />
      )}

      {/* Edit Config Modal */}
      {showEditModal && selectedConfig && (
        <EditConfigModal
          config={selectedConfig}
          rawTables={rawTables}
          loading={loading}
          onClose={() => {
            setShowEditModal(false);
            setSelectedConfig(null);
          }}
          onUpdate={(selectedTableIds) => handleUpdateConfig(selectedConfig.id, selectedTableIds)}
        />
      )}
    </div>
  );
};

// ==========================================
// Create Config Modal Component
// ==========================================

interface CreateConfigModalProps {
  rawTables: RawTable[];
  loading: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, selectedTableIds: string[]) => void;
}

const CreateConfigModal: React.FC<CreateConfigModalProps> = ({
  rawTables,
  loading,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);

  const toggleTable = (tableId: string) => {
    if (selectedTableIds.includes(tableId)) {
      setSelectedTableIds(selectedTableIds.filter(id => id !== tableId));
    } else {
      setSelectedTableIds([...selectedTableIds, tableId]);
    }
  };

  const selectAll = () => {
    setSelectedTableIds(rawTables.map(t => t.id));
  };

  const deselectAll = () => {
    setSelectedTableIds([]);
  };

  const stats = getMergeStatistics(
    rawTables.filter(t => selectedTableIds.includes(t.id))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedTableIds.length === 0) {
      alert('Please provide a name and select at least one table');
      return;
    }
    onCreate(name.trim(), description.trim(), selectedTableIds);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Create New Configuration</h3>
        <p className="text-sm text-gray-500 mb-6">
          Select source tables to merge and process
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Configuration Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. Q1 2024 Combined Data"
                autoFocus
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-20"
                placeholder="Describe what this configuration does..."
                disabled={loading}
              />
            </div>
          </div>

          {/* Source Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Select Source Tables
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
              {rawTables.map((table) => (
                <label
                  key={table.id}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTableIds.includes(table.id)}
                    onChange={() => toggleTable(table.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={loading}
                  />
                  <Database className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">{table.name}</div>
                    <div className="text-xs text-gray-500">
                      {table.rowCount.toLocaleString()} rows · {table.columns.length} columns
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Preview Stats */}
          {selectedTableIds.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  Merge Preview
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Total Rows:</span>
                  <div className="text-blue-900 font-bold text-lg">
                    {stats.totalRows.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Total Columns:</span>
                  <div className="text-blue-900 font-bold text-lg">
                    {stats.totalColumns}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Source Tables:</span>
                  <div className="text-blue-900 font-bold text-lg">
                    {selectedTableIds.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
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
              disabled={loading || !name.trim() || selectedTableIds.length === 0}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// Edit Config Modal Component
// ==========================================

interface EditConfigModalProps {
  config: PrepConfig;
  rawTables: RawTable[];
  loading: boolean;
  onClose: () => void;
  onUpdate: (selectedTableIds: string[]) => void;
}

const EditConfigModal: React.FC<EditConfigModalProps> = ({
  config,
  rawTables,
  loading,
  onClose,
  onUpdate,
}) => {
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>(config.sourceTableIds);

  const toggleTable = (tableId: string) => {
    if (selectedTableIds.includes(tableId)) {
      setSelectedTableIds(selectedTableIds.filter(id => id !== tableId));
    } else {
      setSelectedTableIds([...selectedTableIds, tableId]);
    }
  };

  const stats = getMergeStatistics(
    rawTables.filter(t => selectedTableIds.includes(t.id))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTableIds.length === 0) {
      alert('Please select at least one table');
      return;
    }
    onUpdate(selectedTableIds);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Edit Configuration</h3>
        <p className="text-sm text-gray-500 mb-2">
          {config.name}
        </p>
        <div className="text-xs text-gray-400 mb-6">
          Current: {config.outputData.length.toLocaleString()} rows · {config.outputColumns.length} columns
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Update Source Tables
            </label>

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-80 overflow-y-auto">
              {rawTables.map((table) => (
                <label
                  key={table.id}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTableIds.includes(table.id)}
                    onChange={() => toggleTable(table.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={loading}
                  />
                  <Database className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">{table.name}</div>
                    <div className="text-xs text-gray-500">
                      {table.rowCount.toLocaleString()} rows · {table.columns.length} columns
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Preview Stats */}
          {selectedTableIds.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  New Merge Preview
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Total Rows:</span>
                  <div className="text-blue-900 font-bold text-lg">
                    {stats.totalRows.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Total Columns:</span>
                  <div className="text-blue-900 font-bold text-lg">
                    {stats.totalColumns}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Source Tables:</span>
                  <div className="text-blue-900 font-bold text-lg">
                    {selectedTableIds.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
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
              disabled={loading || selectedTableIds.length === 0}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DataPrep;
