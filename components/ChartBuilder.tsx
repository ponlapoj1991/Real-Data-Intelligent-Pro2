/**
 * ChartBuilder - Google Sheets Style
 *
 * Features:
 * - 3 Tabs: Data, Style, Axes
 * - Multiple Series support
 * - Per-series filters (time comparison)
 * - Data labels customization
 * - Axis configuration
 */

import React, { useState, useEffect } from 'react';
import { X, BarChart3, Save, Plus, Trash2, Type, Sliders } from 'lucide-react';
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

interface ChartBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: DashboardWidget) => void;
  availableColumns: string[];
  initialWidget?: DashboardWidget | null;
  data: RawRow[];
}

const generateId = () => 'widget-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
const generateSeriesId = () => 'series-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

const ChartBuilder: React.FC<ChartBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  availableColumns,
  initialWidget,
  data
}) => {
  const [activeTab, setActiveTab] = useState<'data' | 'style' | 'axes'>('data');

  // Tab 1: Data
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ChartType>('bar');
  const [dimension, setDimension] = useState('');
  const [series, setSeries] = useState<SeriesConfig[]>([]);
  const [limit, setLimit] = useState<number>(10);
  const [width, setWidth] = useState<'half' | 'full'>('half');

  // Tab 2: Style
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

  // Tab 3: Axes
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

  // Initialize from existing widget
  useEffect(() => {
    if (initialWidget) {
      setTitle(initialWidget.title);
      setType(initialWidget.type);
      setDimension(initialWidget.dimension);
      setLimit(initialWidget.limit || 10);
      setWidth(initialWidget.width);

      // Series
      if (initialWidget.series && initialWidget.series.length > 0) {
        setSeries(initialWidget.series);
      } else {
        // Convert legacy format
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

      // Style
      setChartTitle(initialWidget.chartTitle || initialWidget.title);
      setSubtitle(initialWidget.subtitle || '');
      if (initialWidget.legend) {
        setLegend(initialWidget.legend);
      }
      setDataLabels(initialWidget.dataLabels || dataLabels);

      // Axes
      setXAxis(initialWidget.xAxis || xAxis);
      setLeftYAxis(initialWidget.leftYAxis || leftYAxis);
      setRightYAxis(initialWidget.rightYAxis || rightYAxis);
    } else {
      // New widget - smart defaults
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

  // Series Management
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
  };

  const removeSeries = (id: string) => {
    setSeries(series.filter(s => s.id !== id));
  };

  const updateSeries = (id: string, updates: Partial<SeriesConfig>) => {
    setSeries(series.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Per-series filter management
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

  // Get unique values for filter dropdowns
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

  // Save widget
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {initialWidget ? 'Edit Chart' : 'Create Chart'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('data')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'data'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Data
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'style'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Type className="w-4 h-4 inline mr-2" />
            Style
          </button>
          <button
            onClick={() => setActiveTab('axes')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'axes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sliders className="w-4 h-4 inline mr-2" />
            Axes
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab 1: Data */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Widget Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Sales Overview"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ChartType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="area">Area Chart</option>
                    <option value="combo">Combo Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="table">Table</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimension (X-Axis) *
                </label>
                <select
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select column...</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Series */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Series {series.length > 1 && `(${series.length})`}
                  </label>
                  <button
                    onClick={addSeries}
                    className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Series
                  </button>
                </div>

                <div className="space-y-4">
                  {series.map((s, index) => (
                    <div key={s.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Series {index + 1}</h4>
                        {series.length > 1 && (
                          <button
                            onClick={() => removeSeries(s.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Label
                          </label>
                          <input
                            type="text"
                            value={s.label}
                            onChange={(e) => updateSeries(s.id, { label: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Type
                          </label>
                          <select
                            value={s.type}
                            onChange={(e) => updateSeries(s.id, { type: e.target.value as any })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="bar">Bar</option>
                            <option value="line">Line</option>
                            <option value="area">Area</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Measure
                          </label>
                          <select
                            value={s.measure}
                            onChange={(e) => updateSeries(s.id, { measure: e.target.value as AggregateMethod })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="count">Count</option>
                            <option value="sum">Sum</option>
                            <option value="avg">Average</option>
                          </select>
                        </div>

                        {(s.measure === 'sum' || s.measure === 'avg') && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Column
                            </label>
                            <select
                              value={s.measureCol || ''}
                              onChange={(e) => updateSeries(s.id, { measureCol: e.target.value })}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              <option value="">Select...</option>
                              {availableColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Y-Axis
                          </label>
                          <select
                            value={s.yAxis}
                            onChange={(e) => updateSeries(s.id, { yAxis: e.target.value as 'left' | 'right' })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Color
                          </label>
                          <input
                            type="color"
                            value={s.color}
                            onChange={(e) => updateSeries(s.id, { color: e.target.value })}
                            className="w-full h-9 border border-gray-300 rounded cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Per-series filters */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-gray-600">
                            Filters (e.g., year = 2024)
                          </label>
                          <button
                            onClick={() => addSeriesFilter(s.id)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            + Add Filter
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
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limit (Top N)
                  </label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    min="1"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width
                  </label>
                  <select
                    value={width}
                    onChange={(e) => setWidth(e.target.value as 'half' | 'full')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="half">Half Width</option>
                    <option value="full">Full Width</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Style */}
          {activeTab === 'style' && (
            <div className="space-y-6">
              {/* Titles */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Chart & Axis Titles</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Chart Title
                    </label>
                    <input
                      type="text"
                      value={chartTitle}
                      onChange={(e) => setChartTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., Sales Overview"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., Q1 2024"
                    />
                  </div>
                </div>
              </div>

              {/* Data Labels */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Data Labels</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={dataLabels.enabled}
                      onChange={(e) => setDataLabels({ ...dataLabels, enabled: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">Show Data Labels</label>
                  </div>

                  {dataLabels.enabled && (
                    <div className="grid grid-cols-2 gap-3 ml-6">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Position
                        </label>
                        <select
                          value={dataLabels.position}
                          onChange={(e) => setDataLabels({ ...dataLabels, position: e.target.value as any })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        >
                          <option value="top">Top</option>
                          <option value="center">Center</option>
                          <option value="bottom">Bottom</option>
                          <option value="inside">Inside</option>
                          <option value="outside">Outside</option>
                          <option value="end">End</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Font Size
                        </label>
                        <input
                          type="number"
                          value={dataLabels.fontSize}
                          onChange={(e) => setDataLabels({ ...dataLabels, fontSize: parseInt(e.target.value) || 11 })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                          min="8"
                          max="24"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Font Weight
                        </label>
                        <select
                          value={dataLabels.fontWeight}
                          onChange={(e) => setDataLabels({ ...dataLabels, fontWeight: e.target.value as any })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Color
                        </label>
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
              </div>

              {/* Legend */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={legend.enabled}
                      onChange={(e) => setLegend({ ...legend, enabled: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">Show Legend</label>
                  </div>

                  {legend.enabled && (
                    <div className="grid grid-cols-2 gap-3 ml-6">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Position
                        </label>
                        <select
                          value={legend.position}
                          onChange={(e) => setLegend({ ...legend, position: e.target.value as any })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        >
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Font Size
                        </label>
                        <input
                          type="number"
                          value={legend.fontSize}
                          onChange={(e) => setLegend({ ...legend, fontSize: parseInt(e.target.value) || 11 })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                          min="8"
                          max="16"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Alignment
                        </label>
                        <select
                          value={legend.alignment || 'center'}
                          onChange={(e) => setLegend({ ...legend, alignment: e.target.value as any })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Axes */}
          {activeTab === 'axes' && (
            <div className="space-y-6">
              {/* X-Axis */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">X-Axis (Horizontal)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={xAxis.title || ''}
                      onChange={(e) => setXAxis({ ...xAxis, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Date"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Font Size
                      </label>
                      <input
                        type="number"
                        value={xAxis.fontSize || 11}
                        onChange={(e) => setXAxis({ ...xAxis, fontSize: parseInt(e.target.value) || 11 })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        min="8"
                        max="16"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={xAxis.fontColor || '#666666'}
                        onChange={(e) => setXAxis({ ...xAxis, fontColor: e.target.value })}
                        className="w-full h-9 border border-gray-300 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Label Slant
                      </label>
                      <select
                        value={xAxis.slant || 0}
                        onChange={(e) => setXAxis({ ...xAxis, slant: parseInt(e.target.value) as any })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                      >
                        <option value={0}>0°</option>
                        <option value={45}>45°</option>
                        <option value={90}>90°</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={xAxis.showGridlines !== false}
                      onChange={(e) => setXAxis({ ...xAxis, showGridlines: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">Show Gridlines</label>
                  </div>
                </div>
              </div>

              {/* Left Y-Axis */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Left Y-Axis</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={leftYAxis.title || ''}
                      onChange={(e) => setLeftYAxis({ ...leftYAxis, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Sales (THB)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Min
                      </label>
                      <input
                        type="text"
                        value={leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min || 'auto'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLeftYAxis({ ...leftYAxis, min: val === 'auto' ? 'auto' : parseFloat(val) || 0 });
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        placeholder="auto"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Max
                      </label>
                      <input
                        type="text"
                        value={leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max || 'auto'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLeftYAxis({ ...leftYAxis, max: val === 'auto' ? 'auto' : parseFloat(val) || 0 });
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        placeholder="auto"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Font Size
                      </label>
                      <input
                        type="number"
                        value={leftYAxis.fontSize || 11}
                        onChange={(e) => setLeftYAxis({ ...leftYAxis, fontSize: parseInt(e.target.value) || 11 })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        min="8"
                        max="16"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Format
                      </label>
                      <select
                        value={leftYAxis.format || '#,##0'}
                        onChange={(e) => setLeftYAxis({ ...leftYAxis, format: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                      >
                        <option value="#,##0">#,##0</option>
                        <option value="#,##0.00">#,##0.00</option>
                        <option value="0%">0%</option>
                        <option value="$#,##0">$#,##0</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={leftYAxis.showGridlines !== false}
                      onChange={(e) => setLeftYAxis({ ...leftYAxis, showGridlines: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">Show Gridlines</label>
                  </div>
                </div>
              </div>

              {/* Right Y-Axis */}
              {series.some(s => s.yAxis === 'right') && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Right Y-Axis</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={rightYAxis.title || ''}
                        onChange={(e) => setRightYAxis({ ...rightYAxis, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., Orders"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Min
                        </label>
                        <input
                          type="text"
                          value={rightYAxis.min === 'auto' ? 'auto' : rightYAxis.min || 'auto'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRightYAxis({ ...rightYAxis, min: val === 'auto' ? 'auto' : parseFloat(val) || 0 });
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                          placeholder="auto"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Max
                        </label>
                        <input
                          type="text"
                          value={rightYAxis.max === 'auto' ? 'auto' : rightYAxis.max || 'auto'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRightYAxis({ ...rightYAxis, max: val === 'auto' ? 'auto' : parseFloat(val) || 0 });
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                          placeholder="auto"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Font Size
                        </label>
                        <input
                          type="number"
                          value={rightYAxis.fontSize || 11}
                          onChange={(e) => setRightYAxis({ ...rightYAxis, fontSize: parseInt(e.target.value) || 11 })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                          min="8"
                          max="16"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Format
                        </label>
                        <select
                          value={rightYAxis.format || '#,##0'}
                          onChange={(e) => setRightYAxis({ ...rightYAxis, format: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        >
                          <option value="#,##0">#,##0</option>
                          <option value="#,##0.00">#,##0.00</option>
                          <option value="0%">0%</option>
                          <option value="$#,##0">$#,##0</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={rightYAxis.showGridlines === true}
                        onChange={(e) => setRightYAxis({ ...rightYAxis, showGridlines: e.target.checked })}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">Show Gridlines</label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title || !dimension || series.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
