/**
 * ChartBuilder v3 - Google Sheets Style (2-Tabs + Double-Click)
 *
 * Features:
 * - 2 tabs: Setup vs Customize
 * - Per-category color configuration
 * - Double-click to edit chart elements
 * - Smart UI (conditional rendering)
 * - Series list with menu buttons
 * - Combo chart support
 * - No focus ring on click
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Plus, Trash2, ChevronDown, ChevronUp, MoreVertical, Palette, Type as TypeIcon, Sliders as SlidersIcon } from 'lucide-react';
import {
  ChartType,
  DashboardWidget,
  AggregateMethod,
  RawRow,
  DashboardFilter,
  SeriesConfig,
  DataLabelConfig,
  AxisConfig,
  LegendConfig,
  CategoryConfig
} from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend as RechartsLegend,
  LabelList,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ChartBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: DashboardWidget) => void;
  availableColumns: string[];
  initialWidget?: DashboardWidget | null;
  data: RawRow[];
}

const generateId = () => 'w-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
const generateSeriesId = () => 's-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

// Collapsible Section Component
const Section: React.FC<{
  title: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, children }) => (
  <div className="border border-gray-200 rounded-lg mb-2 bg-white">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      style={{ outline: 'none' }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-gray-900">{title}</span>
      </div>
      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
    </button>
    {isOpen && <div className="px-4 pb-4 pt-2">{children}</div>}
  </div>
);

// Category Config Modal
const CategoryConfigModal: React.FC<{
  isOpen: boolean;
  category: string;
  config: CategoryConfig;
  onClose: () => void;
  onSave: (config: CategoryConfig) => void;
}> = ({ isOpen, category, config, onClose, onSave }) => {
  const [color, setColor] = useState(config.color || '#3B82F6');
  const [label, setLabel] = useState(config.label || category);
  const [hidden, setHidden] = useState(config.hidden || false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Edit "{category}"</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Label (Optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={category}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>

          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
              className="mr-2"
            />
            Hide this category
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            style={{ outline: 'none' }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({ color, label: label !== category ? label : undefined, hidden });
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            style={{ outline: 'none' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Series Config Modal
const SeriesConfigModal: React.FC<{
  isOpen: boolean;
  series: SeriesConfig | null;
  chartType: ChartType;
  availableColumns: string[];
  onClose: () => void;
  onSave: (series: SeriesConfig) => void;
  onDelete: () => void;
}> = ({ isOpen, series, chartType, availableColumns, onClose, onSave, onDelete }) => {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'bar' | 'line' | 'area'>('bar');
  const [yAxis, setYAxis] = useState<'left' | 'right'>('left');
  const [measure, setMeasure] = useState<AggregateMethod>('count');
  const [measureCol, setMeasureCol] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [filters, setFilters] = useState<DashboardFilter[]>([]);

  useEffect(() => {
    if (series) {
      setLabel(series.label);
      setType(series.type);
      setYAxis(series.yAxis);
      setMeasure(series.measure);
      setMeasureCol(series.measureCol || '');
      setColor(series.color);
      setFilters(series.filters || []);
    }
  }, [series]);

  if (!isOpen || !series) return null;

  const isComboChart = chartType === 'combo';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Configure Series</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Series 1"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>

          {isComboChart && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="area">Area</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Y-Axis</label>
            <select
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Measure</label>
              <select
                value={measure}
                onChange={(e) => setMeasure(e.target.value as AggregateMethod)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="count">Count</option>
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
              </select>
            </div>

            {(measure === 'sum' || measure === 'avg') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Column</label>
                <select
                  value={measureCol}
                  onChange={(e) => setMeasureCol(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">Select...</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filters (Per-Series)</label>
            <div className="space-y-2">
              {filters.map((filter, idx) => (
                <div key={filter.id} className="flex items-center gap-2">
                  <select
                    value={filter.column}
                    onChange={(e) => {
                      const newFilters = [...filters];
                      newFilters[idx].column = e.target.value;
                      setFilters(newFilters);
                    }}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => {
                      const newFilters = [...filters];
                      newFilters[idx].value = e.target.value;
                      setFilters(newFilters);
                    }}
                    placeholder="Value"
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => setFilters(filters.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700"
                    style={{ outline: 'none' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setFilters([...filters, { id: generateId(), column: availableColumns[0] || '', value: '' }])}
                className="text-sm text-blue-600 hover:text-blue-700"
                style={{ outline: 'none' }}
              >
                + Add Filter
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={onDelete}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
            style={{ outline: 'none' }}
          >
            Delete Series
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              style={{ outline: 'none' }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave({
                  ...series,
                  label,
                  type,
                  yAxis,
                  measure,
                  measureCol: measureCol || undefined,
                  color,
                  filters
                });
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              style={{ outline: 'none' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChartBuilder: React.FC<ChartBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  availableColumns,
  initialWidget,
  data
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'setup' | 'customize'>('setup');

  // Widget state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ChartType>('bar');
  const [dimension, setDimension] = useState('');
  const [series, setSeries] = useState<SeriesConfig[]>([]);
  const [limit, setLimit] = useState<number>(10);
  const [width, setWidth] = useState<'half' | 'full'>('half');
  const [categoryConfig, setCategoryConfig] = useState<Record<string, CategoryConfig>>({});

  // Stacking (for bar charts)
  const [barMode, setBarMode] = useState<'grouped' | 'stacked' | 'percent'>('grouped');

  // Style state
  const [chartTitle, setChartTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [legend, setLegend] = useState<LegendConfig>({
    enabled: true,
    position: 'bottom',
    fontSize: 11,
    fontColor: '#666666',
    alignment: 'center'
  });
  const [dataLabels, setDataLabels] = useState<DataLabelConfig>({
    enabled: false,
    position: 'top',
    fontSize: 11,
    fontWeight: 'normal',
    color: '#000000'
  });

  // Axes state
  const [xAxis, setXAxis] = useState<AxisConfig>({
    title: '',
    fontSize: 11,
    fontColor: '#666666',
    slant: 0,
    showGridlines: true
  });
  const [leftYAxis, setLeftYAxis] = useState<AxisConfig>({
    title: '',
    min: 'auto',
    max: 'auto',
    fontSize: 11,
    fontColor: '#666666',
    format: '#,##0',
    showGridlines: true
  });
  const [rightYAxis, setRightYAxis] = useState<AxisConfig>({
    title: '',
    min: 'auto',
    max: 'auto',
    fontSize: 11,
    fontColor: '#666666',
    format: '#,##0',
    showGridlines: false
  });

  // UI state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['data-labels', 'legend']));
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; category: string } | null>(null);
  const [seriesModal, setSeriesModal] = useState<{ isOpen: boolean; series: SeriesConfig | null }>({ isOpen: false, series: null });

  // Initialize
  useEffect(() => {
    if (initialWidget) {
      setTitle(initialWidget.title);
      setType(initialWidget.type);
      setDimension(initialWidget.dimension);
      setLimit(initialWidget.limit || 10);
      setWidth(initialWidget.width);
      setBarMode(initialWidget.barMode || 'grouped');
      setCategoryConfig(initialWidget.categoryConfig || {});

      if (initialWidget.series && initialWidget.series.length > 0) {
        setSeries(initialWidget.series);
      } else {
        // Legacy conversion
        setSeries([{
          id: generateSeriesId(),
          label: initialWidget.title || 'Series 1',
          type: initialWidget.type === 'line' ? 'line' : initialWidget.type === 'area' ? 'area' : 'bar',
          measure: initialWidget.measure || 'count',
          measureCol: initialWidget.measureCol,
          filters: initialWidget.filters || [],
          yAxis: 'left',
          color: COLORS[0],
          dataLabels: dataLabels
        }]);
      }

      setChartTitle(initialWidget.chartTitle || initialWidget.title);
      setSubtitle(initialWidget.subtitle || '');
      if (initialWidget.legend) setLegend(initialWidget.legend);
      if (initialWidget.dataLabels) setDataLabels(initialWidget.dataLabels);
      setXAxis(initialWidget.xAxis || xAxis);
      setLeftYAxis(initialWidget.leftYAxis || leftYAxis);
      setRightYAxis(initialWidget.rightYAxis || rightYAxis);
    } else {
      if (availableColumns.length > 0) {
        setDimension(availableColumns[0]);
        setSeries([{
          id: generateSeriesId(),
          label: 'Series 1',
          type: 'bar',
          measure: 'count',
          yAxis: 'left',
          color: COLORS[0],
          dataLabels: dataLabels,
          filters: []
        }]);
      }
    }
  }, [initialWidget, availableColumns]);

  // Aggregate data for preview (multi-series or single-series)
  const previewData = useMemo(() => {
    if (!dimension || data.length === 0) return [];

    // Multi-series mode
    if (series.length > 0) {
      const result: Record<string, any> = {};

      series.forEach(s => {
        let filtered = data;
        if (s.filters && s.filters.length > 0) {
          filtered = data.filter(row =>
            s.filters!.every(f => String(row[f.column]).toLowerCase() === f.value.toLowerCase())
          );
        }

        filtered.forEach(row => {
          const dimValue = String(row[dimension] || 'N/A');

          if (!result[dimValue]) {
            result[dimValue] = { [dimension]: dimValue };
          }

          if (s.measure === 'count') {
            result[dimValue][s.id] = (result[dimValue][s.id] || 0) + 1;
          } else if (s.measure === 'sum' && s.measureCol) {
            const val = parseFloat(String(row[s.measureCol])) || 0;
            result[dimValue][s.id] = (result[dimValue][s.id] || 0) + val;
          } else if (s.measure === 'avg' && s.measureCol) {
            if (!result[dimValue][`${s.id}_sum`]) {
              result[dimValue][`${s.id}_sum`] = 0;
              result[dimValue][`${s.id}_count`] = 0;
            }
            const val = parseFloat(String(row[s.measureCol])) || 0;
            result[dimValue][`${s.id}_sum`] += val;
            result[dimValue][`${s.id}_count`] += 1;
          }
        });
      });

      // Finalize averages
      Object.values(result).forEach(item => {
        series.forEach(s => {
          if (s.measure === 'avg') {
            const count = item[`${s.id}_count`] || 0;
            if (count > 0) {
              item[s.id] = item[`${s.id}_sum`] / count;
            }
            delete item[`${s.id}_sum`];
            delete item[`${s.id}_count`];
          }
        });
      });

      const sorted = Object.values(result)
        .sort((a, b) => {
          const aVal = series.reduce((sum, s) => sum + (a[s.id] || 0), 0);
          const bVal = series.reduce((sum, s) => sum + (b[s.id] || 0), 0);
          return bVal - aVal;
        })
        .slice(0, limit);

      return sorted;
    }

    return [];
  }, [dimension, series, data, limit]);

  // Series management
  const addSeries = () => {
    const newSeries: SeriesConfig = {
      id: generateSeriesId(),
      label: `Series ${series.length + 1}`,
      type: type === 'combo' ? 'bar' : (type === 'line' ? 'line' : type === 'area' ? 'area' : 'bar'),
      measure: 'count',
      yAxis: series.length === 0 ? 'left' : 'right',
      color: COLORS[series.length % COLORS.length],
      dataLabels: dataLabels,
      filters: []
    };
    setSeries([...series, newSeries]);
  };

  const removeSeries = (id: string) => {
    setSeries(series.filter(s => s.id !== id));
  };

  const updateSeries = (id: string, updates: Partial<SeriesConfig>) => {
    setSeries(series.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const toggleSection = (section: string) => {
    const newSections = new Set(openSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setOpenSections(newSections);
  };

  const handleSave = () => {
    const widget: DashboardWidget = {
      id: initialWidget?.id || generateId(),
      title,
      type,
      dimension,
      series,
      limit,
      width,
      chartTitle,
      subtitle,
      legend,
      dataLabels,
      xAxis,
      leftYAxis,
      rightYAxis,
      categoryConfig,
      barMode: (type === 'bar' || type === 'combo') ? barMode : undefined
    };

    onSave(widget);
    onClose();
  };

  // Double-click handler for bar chart
  const handleBarDoubleClick = (category: string) => {
    setCategoryModal({ isOpen: true, category });
  };

  // Smart UI: Should show axes?
  const showAxes = type !== 'pie' && type !== 'kpi' && type !== 'wordcloud' && type !== 'table';
  const hasRightAxis = series.some(s => s.yAxis === 'right');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {initialWidget ? 'Edit Chart' : 'Create Chart'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Configure your visualization</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" style={{ outline: 'none' }}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 2-Column Layout */}
        <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden">
          {/* LEFT: Live Preview */}
          <div className="flex flex-col bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-white border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Live Preview</h3>
              <p className="text-xs text-gray-500 mt-1">Double-click elements to edit</p>
            </div>

            <div className="flex-1 p-6 overflow-auto">
              {previewData.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 h-full">
                  {/* Chart Title */}
                  {chartTitle && (
                    <div
                      className="text-center mb-2 cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors"
                      onDoubleClick={() => {
                        setActiveTab('customize');
                        if (!openSections.has('titles')) {
                          toggleSection('titles');
                        }
                      }}
                      style={{ outline: 'none' }}
                    >
                      <h3 className="text-lg font-bold text-gray-900">{chartTitle}</h3>
                      {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
                    </div>
                  )}

                  {/* Chart */}
                  <ResponsiveContainer width="100%" height={400}>
                    {type === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={previewData}
                          dataKey={series[0]?.id}
                          nameKey={dimension}
                          cx="50%"
                          cy="50%"
                          label={dataLabels.enabled}
                        >
                          {previewData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={series[0]?.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        {legend.enabled && <RechartsLegend />}
                        <Tooltip />
                      </PieChart>
                    ) : (
                      <ComposedChart data={previewData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f0f0f0"
                        />
                        <XAxis
                          dataKey={dimension}
                          angle={xAxis.slant || 0}
                          textAnchor={xAxis.slant ? 'end' : 'middle'}
                          height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
                          tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                          label={xAxis.title ? { value: xAxis.title, position: 'insideBottom', offset: -5 } : undefined}
                          onDoubleClick={() => {
                            setActiveTab('customize');
                            if (!openSections.has('x-axis')) {
                              toggleSection('x-axis');
                            }
                          }}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                          label={leftYAxis.title ? { value: leftYAxis.title, angle: -90, position: 'insideLeft' } : undefined}
                          domain={[
                            leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                            leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
                          ]}
                          onDoubleClick={() => {
                            setActiveTab('customize');
                            if (!openSections.has('left-y-axis')) {
                              toggleSection('left-y-axis');
                            }
                          }}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        />
                        {hasRightAxis && (
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: rightYAxis.fontSize, fill: rightYAxis.fontColor }}
                            label={rightYAxis.title ? { value: rightYAxis.title, angle: 90, position: 'insideRight' } : undefined}
                            domain={[
                              rightYAxis.min === 'auto' ? 'auto' : rightYAxis.min,
                              rightYAxis.max === 'auto' ? 'auto' : rightYAxis.max
                            ]}
                            onDoubleClick={() => {
                              setActiveTab('customize');
                              if (!openSections.has('right-y-axis')) {
                                toggleSection('right-y-axis');
                              }
                            }}
                            style={{ cursor: 'pointer', outline: 'none' }}
                          />
                        )}
                        <Tooltip />
                        {legend.enabled && (
                          <RechartsLegend
                            wrapperStyle={{ fontSize: legend.fontSize }}
                            verticalAlign={legend.position === 'top' || legend.position === 'bottom' ? legend.position : 'bottom'}
                            align={legend.alignment || 'center'}
                            onDoubleClick={() => {
                              setActiveTab('customize');
                              if (!openSections.has('legend')) {
                                toggleSection('legend');
                              }
                            }}
                            style={{ cursor: 'pointer', outline: 'none' }}
                          />
                        )}

                        {series.map((s, idx) => {
                          const Component = s.type === 'line' ? Line : s.type === 'area' ? Area : Bar;
                          return (
                            <Component
                              key={s.id}
                              yAxisId={s.yAxis}
                              type="monotone"
                              dataKey={s.id}
                              name={s.label}
                              fill={s.color}
                              stroke={s.color}
                              fillOpacity={s.type === 'area' ? 0.3 : 1}
                              strokeWidth={s.type === 'line' ? 2 : 0}
                              onDoubleClick={(data: any) => {
                                if (data && data[dimension]) {
                                  handleBarDoubleClick(data[dimension]);
                                }
                              }}
                              style={{ cursor: 'pointer', outline: 'none' }}
                            >
                              {dataLabels.enabled && (
                                <LabelList
                                  dataKey={s.id}
                                  position={dataLabels.position as any}
                                  style={{
                                    fontSize: dataLabels.fontSize,
                                    fontWeight: dataLabels.fontWeight,
                                    fill: dataLabels.color
                                  }}
                                />
                              )}
                            </Component>
                          );
                        })}
                      </ComposedChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>Select dimension and configure series to see preview</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Config Panel */}
          <div className="flex flex-col bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab('setup')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'setup'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                style={{ outline: 'none' }}
              >
                Setup
              </button>
              <button
                onClick={() => setActiveTab('customize')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'customize'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                style={{ outline: 'none' }}
              >
                Customize
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'setup' && (
                <div className="space-y-4">
                  {/* Chart Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as ChartType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="pie">Pie</option>
                      <option value="combo">Combo</option>
                      <option value="kpi">KPI</option>
                      <option value="wordcloud">Word Cloud</option>
                      <option value="table">Table</option>
                    </select>
                  </div>

                  {/* Dimension */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dimension (X-Axis)</label>
                    <select
                      value={dimension}
                      onChange={(e) => setDimension(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select...</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stacking Mode (for bar charts) */}
                  {(type === 'bar' || type === 'combo') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stacking</label>
                      <select
                        value={barMode}
                        onChange={(e) => setBarMode(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="grouped">Standard</option>
                        <option value="stacked">Stacked</option>
                        <option value="percent">Percent</option>
                      </select>
                    </div>
                  )}

                  {/* Series List */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Series</label>
                    <div className="space-y-2">
                      {series.map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="text-sm font-medium text-gray-900">{s.label}</span>
                          </div>
                          <button
                            onClick={() => setSeriesModal({ isOpen: true, series: s })}
                            className="text-gray-400 hover:text-gray-600"
                            style={{ outline: 'none' }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addSeries}
                        className="w-full px-3 py-2 border border-dashed border-gray-300 rounded text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                        style={{ outline: 'none' }}
                      >
                        + Add Series
                      </button>
                    </div>
                  </div>

                  {/* Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Limit: {limit} rows
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Width */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Widget Width</label>
                    <select
                      value={width}
                      onChange={(e) => setWidth(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="half">Half (50%)</option>
                      <option value="full">Full (100%)</option>
                    </select>
                  </div>

                  {/* Widget Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Widget Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter widget title"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'customize' && (
                <div className="space-y-2">
                  {/* Titles */}
                  <Section
                    title="Titles"
                    icon={<TypeIcon className="w-4 h-4 text-blue-600" />}
                    isOpen={openSections.has('titles')}
                    onToggle={() => toggleSection('titles')}
                  >
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Chart Title</label>
                        <input
                          type="text"
                          value={chartTitle}
                          onChange={(e) => setChartTitle(e.target.value)}
                          placeholder="e.g., Sales by Channel"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Subtitle</label>
                        <input
                          type="text"
                          value={subtitle}
                          onChange={(e) => setSubtitle(e.target.value)}
                          placeholder="e.g., Q1 2024"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </Section>

                  {/* Data Labels */}
                  <Section
                    title="Data Labels"
                    icon={<TypeIcon className="w-4 h-4 text-green-600" />}
                    isOpen={openSections.has('data-labels')}
                    onToggle={() => toggleSection('data-labels')}
                  >
                    <div className="space-y-3">
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={dataLabels.enabled}
                          onChange={(e) => setDataLabels({ ...dataLabels, enabled: e.target.checked })}
                          className="mr-2"
                        />
                        Show Data Labels
                      </label>

                      {dataLabels.enabled && (
                        <div className="grid grid-cols-2 gap-3 ml-6">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
                            <select
                              value={dataLabels.position}
                              onChange={(e) => setDataLabels({ ...dataLabels, position: e.target.value as any })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            >
                              <option value="top">Top</option>
                              <option value="center">Center</option>
                              <option value="bottom">Bottom</option>
                              <option value="inside">Inside</option>
                              <option value="outside">Outside</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Font Size: {dataLabels.fontSize}px</label>
                            <input
                              type="range"
                              min="8"
                              max="24"
                              value={dataLabels.fontSize}
                              onChange={(e) => setDataLabels({ ...dataLabels, fontSize: parseInt(e.target.value) })}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={dataLabels.color}
                                onChange={(e) => setDataLabels({ ...dataLabels, color: e.target.value })}
                                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={dataLabels.color}
                                onChange={(e) => setDataLabels({ ...dataLabels, color: e.target.value })}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Section>

                  {/* Legend */}
                  <Section
                    title="Legend"
                    icon={<Palette className="w-4 h-4 text-purple-600" />}
                    isOpen={openSections.has('legend')}
                    onToggle={() => toggleSection('legend')}
                  >
                    <div className="space-y-3">
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={legend.enabled}
                          onChange={(e) => setLegend({ ...legend, enabled: e.target.checked })}
                          className="mr-2"
                        />
                        Show Legend
                      </label>

                      {legend.enabled && (
                        <div className="grid grid-cols-2 gap-3 ml-6">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
                            <select
                              value={legend.position}
                              onChange={(e) => setLegend({ ...legend, position: e.target.value as any })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            >
                              <option value="top">Top</option>
                              <option value="bottom">Bottom</option>
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Font Size: {legend.fontSize}px</label>
                            <input
                              type="range"
                              min="8"
                              max="16"
                              value={legend.fontSize}
                              onChange={(e) => setLegend({ ...legend, fontSize: parseInt(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Section>

                  {/* X-Axis (hide for pie/kpi/wordcloud/table) */}
                  {showAxes && (
                    <Section
                      title="X-Axis"
                      icon={<SlidersIcon className="w-4 h-4 text-indigo-600" />}
                      isOpen={openSections.has('x-axis')}
                      onToggle={() => toggleSection('x-axis')}
                    >
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={xAxis.title || ''}
                            onChange={(e) => setXAxis({ ...xAxis, title: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            placeholder="e.g., Date"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Font Size: {xAxis.fontSize}px</label>
                            <input
                              type="range"
                              min="8"
                              max="16"
                              value={xAxis.fontSize || 11}
                              onChange={(e) => setXAxis({ ...xAxis, fontSize: parseInt(e.target.value) })}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Label Slant</label>
                            <select
                              value={xAxis.slant || 0}
                              onChange={(e) => setXAxis({ ...xAxis, slant: parseInt(e.target.value) as any })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            >
                              <option value={0}>0°</option>
                              <option value={45}>45°</option>
                              <option value={90}>90°</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Left Y-Axis (hide for pie/kpi/wordcloud/table) */}
                  {showAxes && (
                    <Section
                      title="Left Y-Axis"
                      icon={<SlidersIcon className="w-4 h-4 text-pink-600" />}
                      isOpen={openSections.has('left-y-axis')}
                      onToggle={() => toggleSection('left-y-axis')}
                    >
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={leftYAxis.title || ''}
                            onChange={(e) => setLeftYAxis({ ...leftYAxis, title: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            placeholder="e.g., Sales (THB)"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Min</label>
                            <input
                              type="text"
                              value={leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min || 'auto'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLeftYAxis({ ...leftYAxis, min: val === 'auto' ? 'auto' : parseFloat(val) || 0 });
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="auto"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Max</label>
                            <input
                              type="text"
                              value={leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max || 'auto'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLeftYAxis({ ...leftYAxis, max: val === 'auto' ? 'auto' : parseFloat(val) || 0 });
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="auto"
                            />
                          </div>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Right Y-Axis (show only if has right axis series) */}
                  {showAxes && hasRightAxis && (
                    <Section
                      title="Right Y-Axis"
                      icon={<SlidersIcon className="w-4 h-4 text-orange-600" />}
                      isOpen={openSections.has('right-y-axis')}
                      onToggle={() => toggleSection('right-y-axis')}
                    >
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={rightYAxis.title || ''}
                            onChange={(e) => setRightYAxis({ ...rightYAxis, title: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            placeholder="e.g., Conversion Rate (%)"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Min</label>
                            <input
                              type="text"
                              value={rightYAxis.min === 'auto' ? 'auto' : rightYAxis.min || 'auto'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRightYAxis({ ...rightYAxis, min: val === 'auto' ? 'auto' : parseFloat(val) || 0 });
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="auto"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Max</label>
                            <input
                              type="text"
                              value={rightYAxis.max === 'auto' ? 'auto' : rightYAxis.max || 'auto'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRightYAxis({ ...rightYAxis, max: val === 'auto' ? 'auto' : parseFloat(val) || 0 });
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="auto"
                            />
                          </div>
                        </div>
                      </div>
                    </Section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            style={{ outline: 'none' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!dimension || !title}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ outline: 'none' }}
          >
            <Save className="w-4 h-4" />
            Save Chart
          </button>
        </div>
      </div>

      {/* Modals */}
      {categoryModal && (
        <CategoryConfigModal
          isOpen={categoryModal.isOpen}
          category={categoryModal.category}
          config={categoryConfig[categoryModal.category] || {}}
          onClose={() => setCategoryModal(null)}
          onSave={(config) => {
            setCategoryConfig({
              ...categoryConfig,
              [categoryModal.category]: config
            });
          }}
        />
      )}

      <SeriesConfigModal
        isOpen={seriesModal.isOpen}
        series={seriesModal.series}
        chartType={type}
        availableColumns={availableColumns}
        onClose={() => setSeriesModal({ isOpen: false, series: null })}
        onSave={(updatedSeries) => {
          updateSeries(updatedSeries.id, updatedSeries);
        }}
        onDelete={() => {
          if (seriesModal.series) {
            removeSeries(seriesModal.series.id);
            setSeriesModal({ isOpen: false, series: null });
          }
        }}
      />
    </div>
  );
};

export default ChartBuilder;
