/**
 * ChartBuilder v2 - Live Preview + Click-to-Edit
 *
 * Google Sheets/PowerPoint Style:
 * - 2-column layout: Preview (left) + Config (right)
 * - Live preview with real data
 * - Click-to-edit interaction
 * - Collapsible sections
 * - Visual controls (color pickers, sliders)
 * - UX: เด็กประถมใช้ได้
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Plus, Trash2, ChevronDown, ChevronUp, Palette, Type as TypeIcon, Sliders as SlidersIcon } from 'lucide-react';
import {
  ChartType,
  DashboardWidget,
  AggregateMethod,
  RawRow,
  DashboardFilter,
  SeriesConfig,
  DataLabelConfig,
  AxisConfig,
  LegendConfig
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

const ChartBuilder: React.FC<ChartBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  availableColumns,
  initialWidget,
  data
}) => {
  // Widget state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ChartType>('bar');
  const [dimension, setDimension] = useState('');
  const [series, setSeries] = useState<SeriesConfig[]>([]);
  const [limit, setLimit] = useState<number>(10);
  const [width, setWidth] = useState<'half' | 'full'>('half');

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
    enabled: true,
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
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['chart-type', 'series-0']));
  const [focusedElement, setFocusedElement] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    if (initialWidget) {
      setTitle(initialWidget.title);
      setType(initialWidget.type);
      setDimension(initialWidget.dimension);
      setLimit(initialWidget.limit || 10);
      setWidth(initialWidget.width);

      if (initialWidget.series && initialWidget.series.length > 0) {
        setSeries(initialWidget.series);
      } else {
        // Legacy conversion
        setSeries([{
          id: generateSeriesId(),
          label: initialWidget.title || 'Series 1',
          type: initialWidget.type === 'line' ? 'line' : 'bar',
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

  // Aggregate data for preview
  const previewData = useMemo(() => {
    if (!dimension || series.length === 0 || data.length === 0) return [];

    const result: Record<string, any> = {};

    // For each series
    series.forEach(s => {
      // Apply series filters
      let filtered = data;
      if (s.filters && s.filters.length > 0) {
        filtered = data.filter(row =>
          s.filters!.every(f => String(row[f.column]).toLowerCase() === f.value.toLowerCase())
        );
      }

      // Aggregate
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

    // Sort and limit
    const sorted = Object.values(result)
      .sort((a, b) => {
        const aVal = series.reduce((sum, s) => sum + (a[s.id] || 0), 0);
        const bVal = series.reduce((sum, s) => sum + (b[s.id] || 0), 0);
        return bVal - aVal;
      })
      .slice(0, limit);

    return sorted;
  }, [dimension, series, data, limit]);

  // Series management
  const addSeries = () => {
    const newSeries: SeriesConfig = {
      id: generateSeriesId(),
      label: `Series ${series.length + 1}`,
      type: 'bar',
      measure: 'count',
      yAxis: series.length === 0 ? 'left' : 'right',
      color: COLORS[series.length % COLORS.length],
      dataLabels: dataLabels,
      filters: []
    };
    setSeries([...series, newSeries]);
    toggleSection(`series-${series.length}`);
  };

  const removeSeries = (id: string) => {
    setSeries(series.filter(s => s.id !== id));
  };

  const updateSeries = (id: string, updates: Partial<SeriesConfig>) => {
    setSeries(series.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addSeriesFilter = (seriesId: string) => {
    const s = series.find(s => s.id === seriesId);
    if (!s || !availableColumns.length) return;

    const newFilter: DashboardFilter = {
      id: generateId(),
      column: availableColumns[0],
      value: ''
    };

    updateSeries(seriesId, {
      filters: [...(s.filters || []), newFilter]
    });
  };

  const removeSeriesFilter = (seriesId: string, filterId: string) => {
    const s = series.find(s => s.id === seriesId);
    if (!s) return;

    updateSeries(seriesId, {
      filters: (s.filters || []).filter(f => f.id !== filterId)
    });
  };

  const updateSeriesFilter = (seriesId: string, filterId: string, updates: Partial<DashboardFilter>) => {
    const s = series.find(s => s.id === seriesId);
    if (!s) return;

    updateSeries(seriesId, {
      filters: (s.filters || []).map(f => f.id === filterId ? { ...f, ...updates } : f)
    });
  };

  const getColumnValues = (columnKey: string): string[] => {
    const values = new Set<string>();
    data.slice(0, 100).forEach(row => {
      const val = row[columnKey];
      if (val !== null && val !== undefined && val !== '') {
        values.add(String(val));
      }
    });
    return Array.from(values).slice(0, 20);
  };

  // Section toggle
  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Save
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
      rightYAxis
    };

    onSave(widget);
    onClose();
  };

  if (!isOpen) return null;

  const hasRightAxis = series.some(s => s.yAxis === 'right');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {initialWidget ? 'Edit Chart' : 'Create Chart'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Click on chart elements to customize</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 2-Column Layout */}
        <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden">
          {/* LEFT: Live Preview */}
          <div className="flex flex-col bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-white border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Live Preview</h3>
              <p className="text-xs text-gray-500 mt-1">Real-time chart preview</p>
            </div>

            <div className="flex-1 p-6 overflow-auto">
              {previewData.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 h-full">
                  {/* Chart Title */}
                  {chartTitle && (
                    <div
                      className="text-center mb-2 cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors"
                      onClick={() => {
                        toggleSection('titles');
                        setFocusedElement('title');
                      }}
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
                          onClick={() => toggleSection('axes')}
                        />
                        <XAxis
                          dataKey={dimension}
                          angle={xAxis.slant || 0}
                          textAnchor={xAxis.slant ? 'end' : 'middle'}
                          height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
                          tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                          label={xAxis.title ? { value: xAxis.title, position: 'insideBottom', offset: -5 } : undefined}
                          onClick={() => {
                            toggleSection('x-axis');
                            setFocusedElement('xAxis');
                          }}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                          label={leftYAxis.title ? { value: leftYAxis.title, angle: -90, position: 'insideLeft' } : undefined}
                          domain={[
                            leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                            leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
                          ]}
                          onClick={() => {
                            toggleSection('left-y-axis');
                            setFocusedElement('leftYAxis');
                          }}
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
                            onClick={() => {
                              toggleSection('right-y-axis');
                              setFocusedElement('rightYAxis');
                            }}
                          />
                        )}
                        <Tooltip />
                        {legend.enabled && (
                          <RechartsLegend
                            wrapperStyle={{ fontSize: legend.fontSize }}
                            verticalAlign={legend.position === 'top' || legend.position === 'bottom' ? legend.position : 'bottom'}
                            align={legend.alignment || 'center'}
                            onClick={() => {
                              toggleSection('legend');
                              setFocusedElement('legend');
                            }}
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
                              onClick={() => {
                                toggleSection(`series-${idx}`);
                                setFocusedElement(`series-${idx}`);
                              }}
                            >
                              {dataLabels.enabled && s.dataLabels?.enabled && (
                                <LabelList
                                  dataKey={s.id}
                                  position={dataLabels.position as any}
                                  style={{
                                    fontSize: dataLabels.fontSize,
                                    fontWeight: dataLabels.fontWeight,
                                    fill: dataLabels.color
                                  }}
                                  onClick={() => {
                                    toggleSection('data-labels');
                                    setFocusedElement('dataLabels');
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
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-lg font-medium">No Data Preview</p>
                    <p className="text-sm mt-2">Configure chart settings to see preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Config Panel */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">

              {/* Chart Type & Dimension */}
              <Section
                title="Chart Type & Data"
                icon={<TypeIcon className="w-4 h-4 text-blue-600" />}
                isOpen={openSections.has('chart-type')}
                onToggle={() => toggleSection('chart-type')}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Widget Title *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., Sales Overview"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Chart Type *</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as ChartType)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="area">Area Chart</option>
                        <option value="combo">Combo Chart</option>
                        <option value="pie">Pie Chart</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Width</label>
                      <select
                        value={width}
                        onChange={(e) => setWidth(e.target.value as 'half' | 'full')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="half">Half</option>
                        <option value="full">Full</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">X-Axis (Dimension) *</label>
                    <select
                      value={dimension}
                      onChange={(e) => setDimension(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select...</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Limit (Top N)</label>
                    <input
                      type="number"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </Section>

              {/* Series */}
              {series.map((s, idx) => (
                <Section
                  key={s.id}
                  title={`Series ${idx + 1}: ${s.label}`}
                  icon={<div className="w-4 h-4 rounded" style={{ backgroundColor: s.color }} />}
                  isOpen={openSections.has(`series-${idx}`)}
                  onToggle={() => toggleSection(`series-${idx}`)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-gray-700">Label</label>
                      {series.length > 1 && (
                        <button onClick={() => removeSeries(s.id)} className="text-red-600 hover:text-red-700 text-xs">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={s.label}
                      onChange={(e) => updateSeries(s.id, { label: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={s.type}
                          onChange={(e) => updateSeries(s.id, { type: e.target.value as any })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          <option value="bar">Bar</option>
                          <option value="line">Line</option>
                          <option value="area">Area</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Y-Axis</label>
                        <select
                          value={s.yAxis}
                          onChange={(e) => updateSeries(s.id, { yAxis: e.target.value as 'left' | 'right' })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Measure</label>
                        <select
                          value={s.measure}
                          onChange={(e) => updateSeries(s.id, { measure: e.target.value as AggregateMethod })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          <option value="count">Count</option>
                          <option value="sum">Sum</option>
                          <option value="avg">Average</option>
                        </select>
                      </div>

                      {(s.measure === 'sum' || s.measure === 'avg') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Column</label>
                          <select
                            value={s.measureCol || ''}
                            onChange={(e) => updateSeries(s.id, { measureCol: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
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
                      <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={s.color}
                          onChange={(e) => updateSeries(s.id, { color: e.target.value })}
                          className="w-12 h-9 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={s.color}
                          onChange={(e) => updateSeries(s.id, { color: e.target.value })}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>

                    {/* Filters */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-700">Filters (for comparison)</label>
                        <button
                          onClick={() => addSeriesFilter(s.id)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          + Add
                        </button>
                      </div>

                      {s.filters && s.filters.length > 0 && (
                        <div className="space-y-2">
                          {s.filters.map(f => (
                            <div key={f.id} className="flex items-center gap-2">
                              <select
                                value={f.column}
                                onChange={(e) => updateSeriesFilter(s.id, f.id, { column: e.target.value })}
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                              >
                                {availableColumns.map(col => (
                                  <option key={col} value={col}>{col}</option>
                                ))}
                              </select>

                              <select
                                value={f.value}
                                onChange={(e) => updateSeriesFilter(s.id, f.id, { value: e.target.value })}
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                              >
                                <option value="">All</option>
                                {getColumnValues(f.column).map(val => (
                                  <option key={val} value={val}>{val}</option>
                                ))}
                              </select>

                              <button
                                onClick={() => removeSeriesFilter(s.id, f.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Section>
              ))}

              <button
                onClick={addSeries}
                className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Series
              </button>

              {/* Titles */}
              <Section
                title="Chart Titles"
                icon={<TypeIcon className="w-4 h-4 text-purple-600" />}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g., Sales Overview"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g., Q1 2024"
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">Weight</label>
                        <select
                          value={dataLabels.fontWeight}
                          onChange={(e) => setDataLabels({ ...dataLabels, fontWeight: e.target.value as any })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                        <input
                          type="color"
                          value={dataLabels.color}
                          onChange={(e) => setDataLabels({ ...dataLabels, color: e.target.value })}
                          className="w-full h-9 border border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {/* Legend */}
              <Section
                title="Legend"
                icon={<Palette className="w-4 h-4 text-orange-600" />}
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

              {/* X-Axis */}
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

                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={xAxis.showGridlines !== false}
                      onChange={(e) => setXAxis({ ...xAxis, showGridlines: e.target.checked })}
                      className="mr-2"
                    />
                    Show Gridlines
                  </label>
                </div>
              </Section>

              {/* Left Y-Axis */}
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

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Format</label>
                      <select
                        value={leftYAxis.format || '#,##0'}
                        onChange={(e) => setLeftYAxis({ ...leftYAxis, format: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        <option value="#,##0">#,##0</option>
                        <option value="#,##0.00">#,##0.00</option>
                        <option value="0%">0%</option>
                        <option value="$#,##0">$#,##0</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={leftYAxis.showGridlines !== false}
                      onChange={(e) => setLeftYAxis({ ...leftYAxis, showGridlines: e.target.checked })}
                      className="mr-2"
                    />
                    Show Gridlines
                  </label>
                </div>
              </Section>

              {/* Right Y-Axis */}
              {hasRightAxis && (
                <Section
                  title="Right Y-Axis"
                  icon={<SlidersIcon className="w-4 h-4 text-teal-600" />}
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
                        placeholder="e.g., Orders"
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

                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={rightYAxis.showGridlines === true}
                        onChange={(e) => setRightYAxis({ ...rightYAxis, showGridlines: e.target.checked })}
                        className="mr-2"
                      />
                      Show Gridlines
                    </label>
                  </div>
                </Section>
              )}

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title || !dimension || series.length === 0}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Chart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChartBuilder;
