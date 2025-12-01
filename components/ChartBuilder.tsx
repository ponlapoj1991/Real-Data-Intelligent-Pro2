/**
 * ChartBuilder v6.0 - Complete Chart System Redesign
 *
 * NEW FEATURES:
 * - Chart Type Selector Screen (Google Sheets style)
 * - Chart-specific configuration forms
 * - 23 chart types with proper metadata
 * - Stack By field for stacked charts
 * - Bubble chart support (3D scatter)
 * - Pie/Donut specific configs
 * - Line curve types
 *
 * PREVIOUS FIXES (v5.1):
 * 1. Column Field shows in Series Modal
 * 2. Sort Options (5 types)
 * 3. Bar Orientation
 * 4. Category Filter
 * 5. Double-click colors
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save, ChevronDown, ChevronUp, Palette, Type as TypeIcon, Sliders as SlidersIcon, Plus, Trash2, Edit as EditIcon, Search } from 'lucide-react';
import {
  ChartType,
  DashboardWidget,
  AggregateMethod,
  RawRow,
  DataLabelConfig,
  AxisConfig,
  LegendConfig,
  CategoryConfig,
  SeriesConfig,
  SortOrder
} from '../types';
import ChartTypeSelector from './ChartTypeSelector';
import ChartConfigForm from './ChartConfigForm';
import { getDefaultOrientation } from '../utils/chartConfigHelpers';
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
  Cell,
  BarChart
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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

const createDefaultLegend = (): LegendConfig => ({
  enabled: true,
  position: 'bottom',
  fontSize: 11,
  fontColor: '#666666',
  alignment: 'center'
});

const createDefaultDataLabels = (): DataLabelConfig => ({
  enabled: false,
  position: 'top',
  fontSize: 11,
  fontWeight: 'normal',
  color: '#000000'
});

const createDefaultAxis = (overrides: Partial<AxisConfig> = {}): AxisConfig => ({
  title: '',
  min: 'auto',
  max: 'auto',
  fontSize: 11,
  fontColor: '#666666',
  format: '#,##0',
  showGridlines: true,
  slant: 0,
  ...overrides
});

// Collapsible Section
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

// Category Config Modal (for double-click)
const CategoryConfigModal: React.FC<{
  isOpen: boolean;
  category: string;
  config: CategoryConfig;
  onClose: () => void;
  onSave: (config: CategoryConfig) => void;
}> = ({ isOpen, category, config, onClose, onSave }) => {
  const [color, setColor] = useState(config.color || COLORS[0]);
  const [label, setLabel] = useState(config.label || category);

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
                style={{ outline: 'none' }}
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-mono"
                style={{ outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={category}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              style={{ outline: 'none' }}
            />
          </div>
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
              onSave({ color, label: label !== category ? label : undefined });
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

// Series Config Modal (FIXED: Column field shows full width)
const SeriesConfigModal: React.FC<{
  isOpen: boolean;
  series: SeriesConfig | null;
  availableColumns: string[];
  onClose: () => void;
  onSave: (series: SeriesConfig) => void;
}> = ({ isOpen, series, availableColumns, onClose, onSave }) => {
  const [label, setLabel] = useState(series?.label || '');
  const [type, setType] = useState<'bar' | 'line' | 'area'>(series?.type || 'bar');
  const [measure, setMeasure] = useState<AggregateMethod>(series?.measure || 'count');
  const [measureCol, setMeasureCol] = useState(series?.measureCol || '');
  const [yAxis, setYAxis] = useState<'left' | 'right'>(series?.yAxis || 'left');
  const [color, setColor] = useState(series?.color || COLORS[0]);

  const needsColumn = measure === 'sum' || measure === 'avg';

  if (!isOpen) return null;

  const handleSave = () => {
    const newSeries: SeriesConfig = {
      id: series?.id || `s-${Date.now()}`,
      label: label || 'Untitled Series',
      type,
      measure,
      measureCol: needsColumn ? measureCol : undefined,
      yAxis,
      color
    };
    onSave(newSeries);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px]" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {series ? 'Edit Series' : 'Add Series'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Series Name</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Post Count, Engagement Rate"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              style={{ outline: 'none' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                style={{ outline: 'none' }}
              >
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="area">Area</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Y-Axis</label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                style={{ outline: 'none' }}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Measure</label>
            <select
              value={measure}
              onChange={(e) => setMeasure(e.target.value as AggregateMethod)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              style={{ outline: 'none' }}
            >
              <option value="count">Count</option>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
            </select>
          </div>

          {/* FIXED: Column field shows full width when needed */}
          {needsColumn && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Column</label>
              <select
                value={measureCol}
                onChange={(e) => setMeasureCol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                style={{ outline: 'none' }}
              >
                <option value="">Select...</option>
                {availableColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                style={{ outline: 'none' }}
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-mono"
                style={{ outline: 'none' }}
              />
            </div>
          </div>
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
            onClick={handleSave}
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

const ChartBuilder: React.FC<ChartBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  availableColumns,
  initialWidget,
  data
}) => {
  // UI State
  const [showTypeSelector, setShowTypeSelector] = useState(true); // Show type selector first
  const [activeTab, setActiveTab] = useState<'setup' | 'customize'>('setup');

  // Widget state
  const [title, setTitle] = useState('New Chart');
  const [type, setType] = useState<ChartType | null>(null); // null until selected
  const [dimension, setDimension] = useState('');
  const [width, setWidth] = useState<'half' | 'full'>('half');

  // Stacked Charts
  const [stackBy, setStackBy] = useState('');

  // Bubble/Scatter
  const [xDimension, setXDimension] = useState('');
  const [yDimension, setYDimension] = useState('');
  const [sizeDimension, setSizeDimension] = useState('');
  const [colorBy, setColorBy] = useState('');

  // Pie/Donut
  const [innerRadius, setInnerRadius] = useState(0);
  const [startAngle, setStartAngle] = useState(0);

  // Line
  const [curveType, setCurveType] = useState<'linear' | 'monotone' | 'step'>('linear');
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Sort & Filter
  const [sortBy, setSortBy] = useState<SortOrder>('value-desc');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');

  // Bar Orientation (deprecated - now determined by chart type)
  const [barOrientation, setBarOrientation] = useState<'vertical' | 'horizontal'>('vertical');

  // Multiple Series (for Combo charts)
  const [series, setSeries] = useState<SeriesConfig[]>([]);

  // Legacy single-series (for backward compatibility)
  const [measure, setMeasure] = useState<AggregateMethod>('count');
  const [measureCol, setMeasureCol] = useState('');
  const [categoryConfig, setCategoryConfig] = useState<Record<string, CategoryConfig>>({});

  // Style state
  const [chartTitle, setChartTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [legend, setLegend] = useState<LegendConfig>(createDefaultLegend);
  const [dataLabels, setDataLabels] = useState<DataLabelConfig>(createDefaultDataLabels);

  // Axes state
  const [xAxis, setXAxis] = useState<AxisConfig>(() => createDefaultAxis({ min: undefined, max: undefined, format: undefined }));
  const [leftYAxis, setLeftYAxis] = useState<AxisConfig>(createDefaultAxis);
  const [rightYAxis, setRightYAxis] = useState<AxisConfig>(createDefaultAxis);

  // UI state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [seriesModal, setSeriesModal] = useState<{ isOpen: boolean; series: SeriesConfig | null }>({ isOpen: false, series: null });
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; category: string } | null>(null);

  const resetBuilderState = useCallback(() => {
    setShowTypeSelector(true);
    setActiveTab('setup');
    setTitle('New Chart');
    setType(null);
    setDimension(availableColumns[0] || '');
    setWidth('half');
    setStackBy('');
    setXDimension('');
    setYDimension('');
    setSizeDimension('');
    setColorBy('');
    setInnerRadius(0);
    setStartAngle(0);
    setCurveType('linear');
    setStrokeWidth(2);
    setSortBy('value-desc');
    setCategoryFilter([]);
    setCategorySearch('');
    setBarOrientation('vertical');
    setSeries([]);
    setMeasure('count');
    setMeasureCol('');
    setCategoryConfig({});
    setChartTitle('');
    setSubtitle('');
    setLegend(createDefaultLegend());
    setDataLabels(createDefaultDataLabels());
    setXAxis(createDefaultAxis({ min: undefined, max: undefined, format: undefined }));
    setLeftYAxis(createDefaultAxis());
    setRightYAxis(createDefaultAxis());
    setOpenSections(new Set());
    setSeriesModal({ isOpen: false, series: null });
    setCategoryModal(null);
  }, [availableColumns]);

  // Initialize
  useEffect(() => {
    if (!isOpen) return;

    if (initialWidget) {
      setShowTypeSelector(false);
      setActiveTab('setup');
      setTitle(initialWidget.title);
      setType(initialWidget.type);
      setDimension(initialWidget.dimension);
      setWidth(initialWidget.width);
      setSortBy(initialWidget.sortBy || 'value-desc');
      setBarOrientation(initialWidget.barOrientation || 'vertical');
      setCategoryFilter(initialWidget.categoryFilter || []);
      setChartTitle(initialWidget.chartTitle || initialWidget.title);
      setSubtitle(initialWidget.subtitle || '');

      if (initialWidget.series && initialWidget.series.length > 0) {
        setSeries(initialWidget.series);
      } else {
        setMeasure(initialWidget.measure || 'count');
        setMeasureCol(initialWidget.measureCol || '');
      }

      setCategoryConfig(initialWidget.categoryConfig || {});
      setLegend(initialWidget.legend || createDefaultLegend());
      setDataLabels(initialWidget.dataLabels || createDefaultDataLabels());
      setXAxis(initialWidget.xAxis || createDefaultAxis({ min: undefined, max: undefined, format: undefined }));
      setLeftYAxis(initialWidget.leftYAxis || createDefaultAxis());
      setRightYAxis(initialWidget.rightYAxis || createDefaultAxis());
    } else {
      resetBuilderState();
    }
  }, [isOpen, initialWidget, availableColumns, resetBuilderState]);

  // Sorting function (must be declared before useMemo that uses it)
  const applySorting = (data: any[], order: SortOrder, valueKey: string) => {
    switch (order) {
      case 'value-desc':
        return [...data].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));
      case 'value-asc':
        return [...data].sort((a, b) => (a[valueKey] || 0) - (b[valueKey] || 0));
      case 'name-asc':
        return [...data].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      case 'name-desc':
        return [...data].sort((a, b) => String(b.name).localeCompare(String(a.name)));
      case 'original':
      default:
        return data; // No sorting
    }
  };

  // Get all unique categories from data
  const allCategories = useMemo(() => {
    if (!dimension || data.length === 0) return [];
    const unique = new Set<string>();
    data.forEach(row => {
      const val = String(row[dimension] || 'N/A');
      unique.add(val);
    });
    return Array.from(unique).sort();
  }, [dimension, data]);

  // Aggregate data for preview
  const previewData = useMemo(() => {
    if (!type) return [];

    // ========================================
    // BUBBLE / SCATTER CHARTS
    // ========================================
    if (type === 'bubble' || type === 'scatter') {
      if (!xDimension || !yDimension) return [];
      if (type === 'bubble' && !sizeDimension) return [];

      return data.map((row, idx) => ({
        name: `Point ${idx + 1}`,
        x: parseFloat(String(row[xDimension])) || 0,
        y: parseFloat(String(row[yDimension])) || 0,
        size: type === 'bubble' ? (parseFloat(String(row[sizeDimension])) || 1) : 1,
        color: colorBy ? String(row[colorBy]) : 'default'
      }));
    }

    // ========================================
    // STACKED CHARTS WITH STACK BY
    // ========================================
    const isStackedChart = [
      'stacked-column', '100-stacked-column',
      'stacked-bar', '100-stacked-bar',
      'stacked-area', '100-stacked-area'
    ].includes(type);

    const is100Stacked = [
      '100-stacked-column', '100-stacked-bar', '100-stacked-area'
    ].includes(type);

    if (isStackedChart && stackBy) {
      if (!dimension) return [];

      // Group by dimension, then by stackBy value
      const groups: Record<string, Record<string, number>> = {};

      data.forEach(row => {
        const dimValue = String(row[dimension] || 'N/A');
        const stackValue = String(row[stackBy] || 'N/A');

        // Apply category filter
        if (categoryFilter.length > 0 && !categoryFilter.includes(dimValue)) {
          return;
        }

        if (!groups[dimValue]) {
          groups[dimValue] = {};
        }

        if (!groups[dimValue][stackValue]) {
          groups[dimValue][stackValue] = 0;
        }

        // Calculate based on measure
        if (measure === 'count') {
          groups[dimValue][stackValue]++;
        } else if (measure === 'sum' && measureCol) {
          const val = parseFloat(String(row[measureCol])) || 0;
          groups[dimValue][stackValue] += val;
        } else if (measure === 'avg' && measureCol) {
          // For avg in stacked, use sum (avg doesn't make sense in stacked context)
          const val = parseFloat(String(row[measureCol])) || 0;
          groups[dimValue][stackValue] += val;
        }
      });

      // Convert to array format
      let result = Object.keys(groups).map(dimKey => {
        const row: any = { name: dimKey };
        Object.keys(groups[dimKey]).forEach(stackKey => {
          row[stackKey] = groups[dimKey][stackKey];
        });
        return row;
      });

      // Normalize to 100% if needed
      if (is100Stacked) {
        result = result.map(row => {
          const total = Object.keys(row)
            .filter(k => k !== 'name')
            .reduce((sum, k) => sum + (row[k] || 0), 0);

          if (total > 0) {
            const normalized: any = { name: row.name };
            Object.keys(row).forEach(k => {
              if (k !== 'name') {
                normalized[k] = ((row[k] || 0) / total) * 100;
              }
            });
            return normalized;
          }
          return row;
        });
      }

      // Apply sorting (sort by first stack value)
      const firstStackKey = result.length > 0 ? Object.keys(result[0]).find(k => k !== 'name') : undefined;
      if (firstStackKey) {
        result = applySorting(result, sortBy, firstStackKey);
      }

      return result;
    }

    // ========================================
    // MULTI-SERIES CHARTS (Combo)
    // ========================================
    if (type === 'combo' && series.length > 0) {
      if (!dimension) return [];

      const groups: Record<string, any> = {};

      data.forEach(row => {
        const dimValue = String(row[dimension] || 'N/A');

        // Apply category filter
        if (categoryFilter.length > 0 && !categoryFilter.includes(dimValue)) {
          return;
        }

        if (!groups[dimValue]) {
          groups[dimValue] = { name: dimValue };
        }

        // Calculate each series
        series.forEach(s => {
          if (s.measure === 'count') {
            groups[dimValue][s.id] = (groups[dimValue][s.id] || 0) + 1;
          } else if (s.measure === 'sum' && s.measureCol) {
            const val = parseFloat(String(row[s.measureCol])) || 0;
            groups[dimValue][s.id] = (groups[dimValue][s.id] || 0) + val;
          } else if (s.measure === 'avg' && s.measureCol) {
            if (!groups[dimValue][`${s.id}_sum`]) {
              groups[dimValue][`${s.id}_sum`] = 0;
              groups[dimValue][`${s.id}_count`] = 0;
            }
            const val = parseFloat(String(row[s.measureCol])) || 0;
            groups[dimValue][`${s.id}_sum`] += val;
            groups[dimValue][`${s.id}_count`]++;
          }
        });
      });

      // Finalize averages
      series.forEach(s => {
        if (s.measure === 'avg') {
          Object.keys(groups).forEach(k => {
            const count = groups[k][`${s.id}_count`] || 0;
            if (count > 0) {
              groups[k][s.id] = groups[k][`${s.id}_sum`] / count;
            }
          });
        }
      });

      let result = Object.values(groups);

      // Apply sorting
      result = applySorting(result, sortBy, series.length > 0 ? series[0].id : 'value');

      return result;
    }

    // ========================================
    // SINGLE-SERIES CHARTS (column, bar, line, area, pie, donut)
    // ========================================
    if (!dimension) return [];

    const groups: Record<string, number> = {};

    data.forEach(row => {
      const dimValue = String(row[dimension] || 'N/A');

      // Apply category filter
      if (categoryFilter.length > 0 && !categoryFilter.includes(dimValue)) {
        return;
      }

      if (!groups[dimValue]) groups[dimValue] = 0;

      if (measure === 'count') {
        groups[dimValue]++;
      } else if (measure === 'sum' && measureCol) {
        const val = parseFloat(String(row[measureCol])) || 0;
        groups[dimValue] += val;
      } else if (measure === 'avg' && measureCol) {
        if (!groups[`${dimValue}_sum`]) {
          groups[`${dimValue}_sum`] = 0;
          groups[`${dimValue}_count`] = 0;
        }
        const val = parseFloat(String(row[measureCol])) || 0;
        groups[`${dimValue}_sum`] += val;
        groups[`${dimValue}_count`]++;
      }
    });

    // Finalize averages
    if (measure === 'avg') {
      Object.keys(groups).filter(k => !k.includes('_')).forEach(k => {
        const count = groups[`${k}_count`] || 0;
        if (count > 0) {
          groups[k] = groups[`${k}_sum`] / count;
        }
      });
    }

    let result = Object.keys(groups)
      .filter(k => !k.includes('_'))
      .map(k => ({
        name: k,
        value: groups[k]
      }));

    // Apply sorting
    result = applySorting(result, sortBy, 'value');

    return result;
  }, [dimension, measure, measureCol, data, type, series, categoryFilter, sortBy, stackBy, xDimension, yDimension, sizeDimension, colorBy]);

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
      type: type!,
      dimension,
      width,
      sortBy,
      barOrientation,
      categoryFilter: categoryFilter.length > 0 ? categoryFilter : undefined,
      chartTitle,
      subtitle,
      legend,
      dataLabels,
      xAxis,
      leftYAxis,
      rightYAxis,
      categoryConfig,

      // Stacked charts
      stackBy: stackBy || undefined,

      // Bubble/Scatter
      xDimension: xDimension || undefined,
      yDimension: yDimension || undefined,
      sizeDimension: sizeDimension || undefined,
      colorBy: colorBy || undefined,

      // Pie/Donut
      innerRadius: type === 'donut' ? innerRadius : undefined,
      startAngle: (type === 'pie' || type === 'donut') ? startAngle : undefined,

      // Line
      curveType: (type === 'line' || type === 'smooth-line' || type?.includes('area')) ? curveType : undefined,
      strokeWidth: (type === 'line' || type === 'smooth-line' || type?.includes('area')) ? strokeWidth : undefined
    };

    // Add series for multi-series charts
    if ((type === 'combo' || type === 'stacked-bar' || type === '100-stacked-bar') && series.length > 0) {
      widget.series = series;
    } else {
      // Single-series
      widget.measure = measure;
      widget.measureCol = measureCol || undefined;
    }

    onSave(widget);
    onClose();
  };

  const handleAddSeries = () => {
    setSeriesModal({ isOpen: true, series: null });
  };

  const handleEditSeries = (s: SeriesConfig) => {
    setSeriesModal({ isOpen: true, series: s });
  };

  const handleDeleteSeries = (id: string) => {
    setSeries(series.filter(s => s.id !== id));
  };

  const handleSaveSeries = (newSeries: SeriesConfig) => {
    const existing = series.find(s => s.id === newSeries.id);
    if (existing) {
      setSeries(series.map(s => s.id === newSeries.id ? newSeries : s));
    } else {
      setSeries([...series, newSeries]);
    }
  };

  const handleCategoryToggle = (cat: string) => {
    if (categoryFilter.includes(cat)) {
      setCategoryFilter(categoryFilter.filter(c => c !== cat));
    } else {
      setCategoryFilter([...categoryFilter, cat]);
    }
  };

  const handleSelectAllCategories = () => {
    setCategoryFilter([...allCategories]);
  };

  const handleClearAllCategories = () => {
    setCategoryFilter([]);
  };

  const handleBarDoubleClick = (category: string) => {
    setCategoryModal({ isOpen: true, category });
  };

  // Handle chart type selection
  const handleChartTypeSelect = (selectedType: ChartType) => {
    setType(selectedType);
    setShowTypeSelector(false);
    setActiveTab('setup');

    // Set default orientation based on chart type
    const defaultOrientation = getDefaultOrientation(selectedType);
    setBarOrientation(defaultOrientation);

    // Reset specific fields based on type
    if (selectedType === 'donut') {
      setInnerRadius(50);
    }
  };

  const handleCloseTypeSelector = () => {
    if (!type) {
      onClose();
      return;
    }

    setShowTypeSelector(false);
  };

  const showAxes = type && type !== 'pie' && type !== 'donut' && type !== 'kpi' && type !== 'wordcloud' && type !== 'table';
  const isComboChart = type === 'combo';
  const isMultiSeriesChart = type === 'combo' || type === 'stacked-bar' || type === '100-stacked-bar';

  const filteredCategories = allCategories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  if (!isOpen) return null;

  // Show ChartTypeSelector if no type selected
  if (showTypeSelector || type === null) {
    return (
      <ChartTypeSelector
        isOpen={true}
        onSelect={handleChartTypeSelect}
        onClose={handleCloseTypeSelector}
      />
    );
  }

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
          {/* LEFT: Preview */}
          <div className="flex flex-col bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-white border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Live Preview</h3>
              <p className="text-xs text-gray-500 mt-1">
                {isMultiSeriesChart ? (type === 'stacked-bar' ? 'Stacked bar chart (100%)' : 'Multi-series combo chart') : 'Single series chart'}
                {' • '}
                {categoryFilter.length > 0 ? `${categoryFilter.length} categories` : 'All categories'}
              </p>
            </div>

            <div className="flex-1 p-6 overflow-auto">
              {previewData.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 h-full">
                  {chartTitle && (
                    <div className="text-center mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{chartTitle}</h3>
                      {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height={400}>
                    {/* PIE CHART */}
                    {type === 'pie' || type === 'donut' ? (
                      <PieChart>
                        <Pie
                          data={previewData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={type === 'donut' ? `${innerRadius}%` : 0}
                          outerRadius="80%"
                          startAngle={startAngle}
                          label={dataLabels.enabled}
                          onDoubleClick={(data: any) => handleBarDoubleClick(data.name)}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        >
                          {previewData.map((entry: any, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={categoryConfig[entry.name]?.color || COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        {legend.enabled && <RechartsLegend />}
                        <Tooltip />
                      </PieChart>
                    ) : /* STACKED CHARTS WITH STACK BY */ [
                      'stacked-column', '100-stacked-column',
                      'stacked-bar', '100-stacked-bar',
                      'stacked-area', '100-stacked-area'
                    ].includes(type) && stackBy ? (
                      <ComposedChart data={previewData} layout={barOrientation === 'horizontal' ? 'vertical' : 'horizontal'}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        {barOrientation === 'vertical' ? (
                          <>
                            <XAxis
                              dataKey="name"
                              angle={xAxis.slant || 0}
                              textAnchor={xAxis.slant ? 'end' : 'middle'}
                              height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
                              tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                              style={{ outline: 'none' }}
                            />
                            <YAxis
                              tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                              domain={[
                                leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                                leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
                              ]}
                              style={{ outline: 'none' }}
                            />
                          </>
                        ) : (
                          <>
                            <XAxis
                              type="number"
                              tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                              style={{ outline: 'none' }}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                              style={{ outline: 'none' }}
                            />
                          </>
                        )}
                        <Tooltip />
                        {legend.enabled && <RechartsLegend />}

                        {/* Render stacked bars/areas */}
                        {previewData.length > 0 &&
                          Object.keys(previewData[0])
                            .filter(key => key !== 'name')
                            .map((stackKey, idx) => {
                              if (type.includes('area')) {
                                return (
                                  <Area
                                    key={stackKey}
                                    dataKey={stackKey}
                                    name={stackKey}
                                    fill={COLORS[idx % COLORS.length]}
                                    stroke={COLORS[idx % COLORS.length]}
                                    stackId="stack"
                                    type={curveType}
                                    style={{ outline: 'none' }}
                                  />
                                );
                              } else {
                                return (
                                  <Bar
                                    key={stackKey}
                                    dataKey={stackKey}
                                    name={stackKey}
                                    fill={COLORS[idx % COLORS.length]}
                                    stackId="stack"
                                    style={{ outline: 'none' }}
                                  />
                                );
                              }
                            })}
                      </ComposedChart>
                    ) : /* COMBO CHART */ type === 'combo' && series.length > 0 ? (
                      <ComposedChart data={previewData} layout={barOrientation === 'horizontal' ? 'vertical' : 'horizontal'}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        {barOrientation === 'vertical' ? (
                          <>
                            <XAxis
                              dataKey="name"
                              angle={xAxis.slant || 0}
                              textAnchor={xAxis.slant ? 'end' : 'middle'}
                              height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
                              tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                              style={{ outline: 'none' }}
                            />
                            <YAxis
                              yAxisId="left"
                              tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                              domain={[
                                leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                                leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
                              ]}
                              style={{ outline: 'none' }}
                            />
                            {series.some(s => s.yAxis === 'right') && (
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: rightYAxis.fontSize, fill: rightYAxis.fontColor }}
                                domain={[
                                  rightYAxis.min === 'auto' ? 'auto' : rightYAxis.min,
                                  rightYAxis.max === 'auto' ? 'auto' : rightYAxis.max
                                ]}
                                style={{ outline: 'none' }}
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <XAxis
                              type="number"
                              tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                              style={{ outline: 'none' }}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                              style={{ outline: 'none' }}
                            />
                          </>
                        )}
                        <Tooltip />
                        {legend.enabled && <RechartsLegend />}

                        {series.map((s) => {
                          if (s.type === 'bar') {
                            return (
                              <Bar
                                key={s.id}
                                dataKey={s.id}
                                name={s.label}
                                fill={s.color}
                                yAxisId={barOrientation === 'vertical' ? s.yAxis : undefined}
                                style={{ outline: 'none' }}
                              />
                            );
                          } else if (s.type === 'line') {
                            return (
                              <Line
                                key={s.id}
                                dataKey={s.id}
                                name={s.label}
                                stroke={s.color}
                                strokeWidth={strokeWidth || 2}
                                yAxisId={barOrientation === 'vertical' ? s.yAxis : undefined}
                                type={curveType}
                                dot={{ r: 4 }}
                                style={{ outline: 'none' }}
                              />
                            );
                          } else if (s.type === 'area') {
                            return (
                              <Area
                                key={s.id}
                                dataKey={s.id}
                                name={s.label}
                                fill={s.color}
                                stroke={s.color}
                                yAxisId={barOrientation === 'vertical' ? s.yAxis : undefined}
                                type={curveType}
                                style={{ outline: 'none' }}
                              />
                            );
                          }
                          return null;
                        })}
                      </ComposedChart>
                    ) : /* LINE / SMOOTH-LINE CHARTS */ type === 'line' || type === 'smooth-line' ? (
                      <ComposedChart data={previewData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          angle={xAxis.slant || 0}
                          textAnchor={xAxis.slant ? 'end' : 'middle'}
                          height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
                          tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                          style={{ outline: 'none' }}
                        />
                        <YAxis
                          tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                          domain={[
                            leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                            leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
                          ]}
                          style={{ outline: 'none' }}
                        />
                        <Tooltip />
                        {legend.enabled && <RechartsLegend />}
                        <Line
                          type={type === 'smooth-line' ? 'monotone' : curveType}
                          dataKey="value"
                          stroke={COLORS[0]}
                          strokeWidth={strokeWidth}
                          dot={{ r: 4 }}
                          style={{ outline: 'none' }}
                        >
                          {dataLabels.enabled && (
                            <LabelList
                              dataKey="value"
                              position={dataLabels.position as any}
                              style={{
                                fontSize: dataLabels.fontSize,
                                fontWeight: dataLabels.fontWeight,
                                fill: dataLabels.color
                              }}
                            />
                          )}
                        </Line>
                      </ComposedChart>
                    ) : /* AREA CHART (non-stacked) */ type === 'area' ? (
                      <ComposedChart data={previewData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          angle={xAxis.slant || 0}
                          textAnchor={xAxis.slant ? 'end' : 'middle'}
                          height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
                          tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                          style={{ outline: 'none' }}
                        />
                        <YAxis
                          tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                          domain={[
                            leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                            leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
                          ]}
                          style={{ outline: 'none' }}
                        />
                        <Tooltip />
                        {legend.enabled && <RechartsLegend />}
                        <Area
                          type={curveType}
                          dataKey="value"
                          fill={COLORS[0]}
                          stroke={COLORS[0]}
                          fillOpacity={0.6}
                          style={{ outline: 'none' }}
                        >
                          {dataLabels.enabled && (
                            <LabelList
                              dataKey="value"
                              position={dataLabels.position as any}
                              style={{
                                fontSize: dataLabels.fontSize,
                                fontWeight: dataLabels.fontWeight,
                                fill: dataLabels.color
                              }}
                            />
                          )}
                        </Area>
                      </ComposedChart>
                    ) : /* BAR / COLUMN CHARTS */ (
                      <BarChart
                        data={previewData}
                        layout={barOrientation === 'horizontal' ? 'vertical' : 'horizontal'}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        {barOrientation === 'vertical' ? (
                          <>
                            <XAxis
                              dataKey="name"
                              angle={xAxis.slant || 0}
                              textAnchor={xAxis.slant ? 'end' : 'middle'}
                              height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
                              tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                              style={{ outline: 'none' }}
                            />
                            <YAxis
                              tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                              domain={[
                                leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                                leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
                              ]}
                              style={{ outline: 'none' }}
                            />
                          </>
                        ) : (
                          <>
                            <XAxis
                              type="number"
                              tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                              style={{ outline: 'none' }}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                              style={{ outline: 'none' }}
                            />
                          </>
                        )}
                        <Tooltip />
                        {legend.enabled && <RechartsLegend />}
                        <Bar
                          dataKey="value"
                          onDoubleClick={(data: any) => handleBarDoubleClick(data.name)}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        >
                          {previewData.map((entry: any, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={categoryConfig[entry.name]?.color || COLORS[idx % COLORS.length]}
                            />
                          ))}
                          {dataLabels.enabled && (
                            <LabelList
                              dataKey="value"
                              position={dataLabels.position as any}
                              style={{
                                fontSize: dataLabels.fontSize,
                                fontWeight: dataLabels.fontWeight,
                                fill: dataLabels.color
                              }}
                            />
                          )}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>Select dimension to see preview</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Config */}
          <div className="flex flex-col bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab('setup')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'setup'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
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
                    : 'text-gray-600 hover:text-gray-900'
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
                  {/* Chart Type Info with Change Button */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Chart Type</p>
                        <p className="text-base font-semibold text-gray-900 mt-1">
                          {type && type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowTypeSelector(true)}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        Change Type
                      </button>
                    </div>
                  </div>

                  {/* Chart Config Form */}
                  <ChartConfigForm
                    chartType={type!}
                    availableColumns={availableColumns}
                    dimension={dimension}
                    setDimension={setDimension}
                    stackBy={stackBy}
                    setStackBy={setStackBy}
                    measure={measure}
                    setMeasure={setMeasure}
                    measureCol={measureCol}
                    setMeasureCol={setMeasureCol}
                    series={series}
                    onAddSeries={handleAddSeries}
                    onEditSeries={handleEditSeries}
                    onDeleteSeries={handleDeleteSeries}
                    xDimension={xDimension}
                    setXDimension={setXDimension}
                    yDimension={yDimension}
                    setYDimension={setYDimension}
                    sizeDimension={sizeDimension}
                    setSizeDimension={setSizeDimension}
                    colorBy={colorBy}
                    setColorBy={setColorBy}
                    innerRadius={innerRadius}
                    setInnerRadius={setInnerRadius}
                    startAngle={startAngle}
                    setStartAngle={setStartAngle}
                    curveType={curveType}
                    setCurveType={setCurveType}
                    strokeWidth={strokeWidth}
                    setStrokeWidth={setStrokeWidth}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    categoryFilter={categoryFilter}
                    setCategoryFilter={setCategoryFilter}
                    allCategories={allCategories}
                    categorySearch={categorySearch}
                    setCategorySearch={setCategorySearch}
                    onCategoryToggle={handleCategoryToggle}
                    onSelectAllCategories={handleSelectAllCategories}
                    onClearAllCategories={handleClearAllCategories}
                  />
                </div>
              )}


              {activeTab === 'customize' && (
                <div className="space-y-2">
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
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          style={{ outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Subtitle</label>
                        <input
                          type="text"
                          value={subtitle}
                          onChange={(e) => setSubtitle(e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          style={{ outline: 'none' }}
                        />
                      </div>
                    </div>
                  </Section>

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
                          style={{ outline: 'none' }}
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
                              style={{ outline: 'none' }}
                            >
                              <option value="top">Top</option>
                              <option value="center">Center</option>
                              <option value="bottom">Bottom</option>
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
                              style={{ outline: 'none' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Section>

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
                          style={{ outline: 'none' }}
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
                              style={{ outline: 'none' }}
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
                              style={{ outline: 'none' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Section>

                  {showAxes && (
                    <>
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
                              style={{ outline: 'none' }}
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
                                style={{ outline: 'none' }}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Label Slant</label>
                              <select
                                value={xAxis.slant || 0}
                                onChange={(e) => setXAxis({ ...xAxis, slant: parseInt(e.target.value) as any })}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                style={{ outline: 'none' }}
                              >
                                <option value={0}>0°</option>
                                <option value={45}>45°</option>
                                <option value={90}>90°</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </Section>

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
                              style={{ outline: 'none' }}
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
                                style={{ outline: 'none' }}
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
                                style={{ outline: 'none' }}
                              />
                            </div>
                          </div>
                        </div>
                      </Section>

                      {isComboChart && (
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
                                style={{ outline: 'none' }}
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
                                  style={{ outline: 'none' }}
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
                                  style={{ outline: 'none' }}
                                />
                              </div>
                            </div>
                          </div>
                        </Section>
                      )}
                    </>
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
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            style={{ outline: 'none' }}
          >
            <Save className="w-4 h-4" />
            Save Chart
          </button>
        </div>
      </div>

      {seriesModal.isOpen && (
        <SeriesConfigModal
          isOpen={seriesModal.isOpen}
          series={seriesModal.series}
          availableColumns={availableColumns}
          onClose={() => setSeriesModal({ isOpen: false, series: null })}
          onSave={handleSaveSeries}
        />
      )}

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
    </div>
  );
};

export default ChartBuilder;
