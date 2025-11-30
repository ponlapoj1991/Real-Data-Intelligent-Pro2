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

import React, { useState, useEffect, useMemo } from 'react';
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
import {
  getDefaultOrientation,
  isStackedChart,
  is100StackedChart,
  isHorizontalChart,
  isVerticalChart,
  isAreaChart,
  isPieChart,
  isLineChart
} from '../utils/chartConfigHelpers';
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
  BarChart,
  ScatterChart,
  Scatter,
  ZAxis
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
    showGridlines: true
  });

  // UI state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [seriesModal, setSeriesModal] = useState<{ isOpen: boolean; series: SeriesConfig | null }>({ isOpen: false, series: null });
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; category: string } | null>(null);

  // Initialize
  useEffect(() => {
    if (initialWidget) {
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
      if (initialWidget.legend) setLegend(initialWidget.legend);
      if (initialWidget.dataLabels) setDataLabels(initialWidget.dataLabels);
      setXAxis(initialWidget.xAxis || xAxis);
      setLeftYAxis(initialWidget.leftYAxis || leftYAxis);
      setRightYAxis(initialWidget.rightYAxis || rightYAxis);
    } else {
      if (availableColumns.length > 0) {
        setDimension(availableColumns[0]);
      }
    }
  }, [initialWidget, availableColumns]);

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

  // Aggregate data for preview (รองรับ 23 ประเภทใหม่)
  const previewData = useMemo(() => {
    if (!type) return [];
    const rows = data || [];

    // Category filter helper
    const passCategory = (dimValue: string) => {
      if (categoryFilter.length === 0) return true;
      return categoryFilter.includes(dimValue);
    };

    // 1) Multi-series (Combo)
    if (type === 'combo' && series.length > 0 && dimension) {
      const groups: Record<string, any> = {};

      series.forEach(s => {
        rows.forEach(row => {
          const dimValue = String(row[dimension] || 'N/A');
          if (!passCategory(dimValue)) return;
          if (!groups[dimValue]) groups[dimValue] = { name: dimValue };

          if (s.measure === 'count') {
            groups[dimValue][s.id] = (groups[dimValue][s.id] || 0) + 1;
          } else if (s.measure === 'sum' && s.measureCol) {
            const val = parseFloat(String(row[s.measureCol])) || 0;
            groups[dimValue][s.id] = (groups[dimValue][s.id] || 0) + val;
          } else if (s.measure === 'avg' && s.measureCol) {
            const keySum = `${s.id}_sum`;
            const keyCount = `${s.id}_count`;
            if (!groups[dimValue][keySum]) {
              groups[dimValue][keySum] = 0;
              groups[dimValue][keyCount] = 0;
            }
            const val = parseFloat(String(row[s.measureCol])) || 0;
            groups[dimValue][keySum] += val;
            groups[dimValue][keyCount] += 1;
          }
        });
      });

      Object.values(groups).forEach((row: any) => {
        series.forEach(s => {
          if (s.measure === 'avg') {
            const keySum = `${s.id}_sum`;
            const keyCount = `${s.id}_count`;
            const count = row[keyCount] || 0;
            row[s.id] = count > 0 ? row[keySum] / count : 0;
            delete row[keySum];
            delete row[keyCount];
          }
        });
      });

      return applySorting(Object.values(groups), sortBy, series[0]?.id || 'value');
    }

    // 2) Scatter / Bubble
    if ((type === 'scatter' || type === 'bubble') && xDimension && yDimension) {
      return rows
        .map(row => {
          const xVal = Number(row[xDimension]);
          const yVal = Number(row[yDimension]);
          if (Number.isNaN(xVal) || Number.isNaN(yVal)) return null;
          const sizeVal = sizeDimension ? Number(row[sizeDimension]) : undefined;
          const colorVal = colorBy ? String(row[colorBy]) : undefined;
          const nameVal = dimension ? String(row[dimension] || 'N/A') : undefined;
          return {
            x: xVal,
            y: yVal,
            z: sizeVal,
            name: nameVal,
            colorKey: colorVal
          };
        })
        .filter(Boolean) as any[];
    }

    // 3) Stacked charts
    if (isStackedChart(type) && dimension && stackBy) {
      const groups: Record<string, Record<string, { sum: number; count: number }>> = {};
      const stackKeys = new Set<string>();

      rows.forEach(row => {
        const dimValue = String(row[dimension] || 'N/A');
        const stackValue = String(row[stackBy] || 'อื่นๆ');
        if (!passCategory(dimValue)) return;

        stackKeys.add(stackValue);
        if (!groups[dimValue]) groups[dimValue] = {};
        if (!groups[dimValue][stackValue]) groups[dimValue][stackValue] = { sum: 0, count: 0 };

        if (measure === 'count') {
          groups[dimValue][stackValue].sum += 1;
          groups[dimValue][stackValue].count += 1;
        } else if (measureCol) {
          const val = Number(row[measureCol]) || 0;
          groups[dimValue][stackValue].sum += val;
          groups[dimValue][stackValue].count += 1;
        }
      });

      const orderedKeys = Array.from(stackKeys).sort();
      let result = Object.entries(groups).map(([dim, stacks]) => {
        const row: any = { name: dim };
        let total = 0;
        orderedKeys.forEach(key => {
          const entry = stacks[key];
          const val = entry ? (measure === 'avg' ? entry.sum / Math.max(entry.count, 1) : entry.sum) : 0;
          row[key] = val;
          total += val;
        });
        row.total = total;
        return row;
      });

      if (is100StackedChart(type)) {
        result = result.map(r => {
          const total = r.total || 0;
          if (total === 0) return r;
          const next: any = { name: r.name };
          orderedKeys.forEach(key => {
            next[key] = ((r as any)[key] || 0) / total * 100;
          });
          next.total = 100;
          return next;
        });
      }

      return applySorting(result, sortBy, 'total');
    }

    // 4) Single-series charts (column/line/area/pie/donut/kpi/wordcloud)
    if (dimension) {
      const groups: Record<string, { sum: number; count: number }> = {};

      rows.forEach(row => {
        const dimValue = String(row[dimension] || 'N/A');
        if (!passCategory(dimValue)) return;
        if (!groups[dimValue]) groups[dimValue] = { sum: 0, count: 0 };

        if (measure === 'count') {
          groups[dimValue].sum += 1;
          groups[dimValue].count += 1;
        } else if (measureCol) {
          const val = Number(row[measureCol]) || 0;
          groups[dimValue].sum += val;
          groups[dimValue].count += 1;
        }
      });

      let result = Object.entries(groups).map(([name, agg]) => ({
        name,
        value: measure === 'avg' ? agg.sum / Math.max(agg.count, 1) : agg.sum
      }));

      result = applySorting(result, sortBy, 'value');
      return result;
    }

    return [];
  }, [
    type,
    data,
    series,
    dimension,
    measure,
    measureCol,
    stackBy,
    categoryFilter,
    sortBy,
    xDimension,
    yDimension,
    sizeDimension,
    colorBy
  ]);

  const previewStackKeys = useMemo(() => {
    if (!isStackedChart(type || 'column')) return [] as string[];
    const keys = new Set<string>();
    (previewData as any[]).forEach(row => {
      Object.keys(row).forEach(k => {
        if (k !== 'name' && k !== 'total') keys.add(k);
      });
    });
    return Array.from(keys).sort();
  }, [previewData, type]);

  const renderPreviewChart = () => {
    if (!type) return null;

    if (type === 'kpi') {
      const total = (previewData as any[]).reduce((sum, row) => sum + (row.value || 0), 0);
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-4xl font-bold text-blue-600">{total.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">KPI Preview</p>
        </div>
      );
    }

    if (type === 'wordcloud') {
      const maxVal = (previewData as any[]).reduce((max, item) => (item.value > max ? item.value : max), 0);
      const safeMax = maxVal > 0 ? maxVal : 1;
      return (
        <div className="flex flex-wrap gap-2 p-2 items-center justify-center">
          {(previewData as any[]).map((item, idx) => {
            const size = Math.max(12, Math.min(30, 12 + (item.value / safeMax) * 18));
            return (
              <span
                key={idx}
                className="select-none"
                style={{ fontSize: `${size}px`, color: COLORS[idx % COLORS.length] }}
              >
                {item.name}
              </span>
            );
          })}
        </div>
      );
    }

    if (type === 'table') {
      return (
        <div className="overflow-auto max-h-80">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">{dimension || 'Column'}</th>
                {measureCol && <th className="px-3 py-2 text-right">{measureCol}</th>}
              </tr>
            </thead>
            <tbody>
              {(previewData as any[]).slice(0, 8).map((row, idx) => (
                <tr key={idx} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2">{row.name}</td>
                  {measureCol && <td className="px-3 py-2 text-right">{row.value}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Pie / Donut
    if (isPieChart(type)) {
      return (
        <PieChart>
          <Pie
            data={previewData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={type === 'donut' ? `${innerRadius}%` : undefined}
            startAngle={startAngle}
            endAngle={startAngle + 360}
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
      );
    }

    // Scatter / Bubble
    if (type === 'scatter' || type === 'bubble') {
      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="x" type="number" name={xDimension || 'X'} />
          <YAxis dataKey="y" type="number" name={yDimension || 'Y'} />
          {type === 'bubble' && <ZAxis dataKey="z" range={[60, 400]} />}
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          {legend.enabled && <RechartsLegend />}
          <Scatter
            data={previewData}
            name={dimension || 'Series'}
            fill={COLORS[0]}
          >
            {dataLabels.enabled && (
              <LabelList
                dataKey="name"
                position="top"
                style={{
                  fontSize: dataLabels.fontSize,
                  fontWeight: dataLabels.fontWeight,
                  fill: dataLabels.color
                }}
              />
            )}
          </Scatter>
        </ScatterChart>
      );
    }

    // Combo (multi-series)
    if (type === 'combo' && series.length > 0) {
      const layout = barOrientation === 'horizontal' ? 'vertical' : 'horizontal';
      return (
        <ComposedChart data={previewData} layout={layout}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          {layout === 'horizontal' ? (
            <>
              <XAxis
                dataKey="name"
                angle={xAxis.slant || 0}
                textAnchor={xAxis.slant ? 'end' : 'middle'}
                height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
                tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                domain={[
                  leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                  leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
                ]}
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
                />
              )}
            </>
          ) : (
            <>
              <XAxis type="number" tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
              />
            </>
          )}
          <Tooltip />
          {legend.enabled && <RechartsLegend />}

          {series.map((s) => {
            const Component = s.type === 'line' ? Line : s.type === 'area' ? Area : Bar;
            const extraProps = s.type === 'bar' && isStackedChart(type) ? { stackId: 'stack' } : {};
            return (
              <Component
                key={s.id}
                yAxisId={layout === 'horizontal' ? s.yAxis : undefined}
                type="monotone"
                dataKey={s.id}
                name={s.label}
                fill={s.color}
                stroke={s.color}
                strokeWidth={s.type === 'line' ? 2 : 1}
                fillOpacity={s.type === 'area' ? 0.35 : 1}
                {...extraProps}
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
      );
    }

    // Area charts
    if (isAreaChart(type)) {
      const layout = isHorizontalChart(type) ? 'vertical' : 'horizontal';
      const stackId = isStackedChart(type) ? 'stack' : undefined;
      return (
        <AreaChart data={previewData} layout={layout}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          {layout === 'horizontal' ? (
            <>
              <XAxis
                dataKey="name"
                angle={xAxis.slant || 0}
                textAnchor={xAxis.slant ? 'end' : 'middle'}
                height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
                tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
              />
              <YAxis
                tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                domain={[
                  leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                  leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
                ]}
              />
            </>
          ) : (
            <>
              <XAxis type="number" tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }} />
            </>
          )}
          <Tooltip />
          {legend.enabled && <RechartsLegend />}
          {previewStackKeys.length === 0 ? (
            <Area
              type={curveType}
              dataKey="value"
              stroke={COLORS[0]}
              fill={COLORS[0]}
              fillOpacity={0.3}
              strokeWidth={strokeWidth}
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
          ) : (
            previewStackKeys.map((key, idx) => (
              <Area
                key={key}
                type={curveType}
                dataKey={key}
                stackId={stackId}
                stroke={categoryConfig[key]?.color || COLORS[idx % COLORS.length]}
                fill={categoryConfig[key]?.color || COLORS[idx % COLORS.length]}
                fillOpacity={0.35}
                strokeWidth={strokeWidth}
              >
                {dataLabels.enabled && (
                  <LabelList
                    dataKey={key}
                    position={dataLabels.position as any}
                    style={{
                      fontSize: dataLabels.fontSize,
                      fontWeight: dataLabels.fontWeight,
                      fill: dataLabels.color
                    }}
                  />
                )}
              </Area>
            ))
          )}
        </AreaChart>
      );
    }

    // Line charts
    if (isLineChart(type)) {
      const lineType = type === 'smooth-line' ? 'monotone' : curveType;
      return (
        <LineChart data={previewData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            angle={xAxis.slant || 0}
            textAnchor={xAxis.slant ? 'end' : 'middle'}
            height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
            tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
          />
          <YAxis
            tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
            domain={[
              leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
              leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
            ]}
          />
          <Tooltip />
          {legend.enabled && <RechartsLegend />}
          <Line
            type={lineType}
            dataKey="value"
            stroke={COLORS[0]}
            strokeWidth={strokeWidth}
            dot={{ r: 4 }}
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
        </LineChart>
      );
    }

    // Column / Bar charts
    const layout = isHorizontalChart(type) ? 'vertical' : 'horizontal';
    const stackId = isStackedChart(type) ? 'stack' : undefined;
    const keys = previewStackKeys.length > 0 ? previewStackKeys : ['value'];

    return (
      <BarChart data={previewData} layout={layout}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        {layout === 'horizontal' ? (
          <>
            <XAxis
              dataKey="name"
              angle={xAxis.slant || 0}
              textAnchor={xAxis.slant ? 'end' : 'middle'}
              height={xAxis.slant === 90 ? 100 : xAxis.slant === 45 ? 80 : 60}
              tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
            />
            <YAxis
              tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
              domain={[
                leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
              ]}
            />
          </>
        ) : (
          <>
            <XAxis type="number" tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }} />
          </>
        )}
        <Tooltip />
        {legend.enabled && <RechartsLegend />}
        {keys.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            stackId={stackId}
            onDoubleClick={(d: any) => handleBarDoubleClick(d.name)}
            style={{ cursor: 'pointer', outline: 'none' }}
            fill={categoryConfig[key]?.color || COLORS[idx % COLORS.length]}
          >
            {dataLabels.enabled && (
              <LabelList
                dataKey={key}
                position={dataLabels.position as any}
                style={{
                  fontSize: dataLabels.fontSize,
                  fontWeight: dataLabels.fontWeight,
                  fill: dataLabels.color
                }}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    );
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
      categoryConfig
    };

    // Add series for combo chart
    if (type === 'combo' && series.length > 0) {
      widget.series = series;
    } else {
      // Legacy single-series
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

  const showAxes = type !== 'pie' && type !== 'kpi' && type !== 'wordcloud' && type !== 'table';
  const isComboChart = type === 'combo';
  const isMultiSeriesChart = type === 'combo' || type === 'stacked-bar';

  const filteredCategories = allCategories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

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
                    {renderPreviewChart()}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as ChartType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      style={{ outline: 'none' }}
                    >
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="combo">Combo (Bar + Line)</option>
                      <option value="stacked-bar">Stacked Bar (100%)</option>
                      <option value="bubble">Bubble Chart</option>
                      <option value="pie">Pie</option>
                      <option value="kpi">KPI</option>
                      <option value="wordcloud">Word Cloud</option>
                      <option value="table">Table</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dimension (X-Axis)</label>
                    <select
                      value={dimension}
                      onChange={(e) => setDimension(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      style={{ outline: 'none' }}
                    >
                      <option value="">Select...</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  {/* Series Management for Multi-Series Charts */}
                  {isMultiSeriesChart && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Series ({series.length})
                        </label>
                        <button
                          onClick={handleAddSeries}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                          style={{ outline: 'none' }}
                        >
                          <Plus className="w-3 h-3" />
                          Add Series
                        </button>
                      </div>

                      <div className="space-y-2">
                        {series.map((s, idx) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-2 p-3 border border-gray-200 rounded bg-gray-50"
                          >
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: s.color }}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{s.label}</div>
                              <div className="text-xs text-gray-500">
                                {s.type} • {s.yAxis} Y-Axis • {s.measure}
                                {s.measureCol && ` of ${s.measureCol}`}
                              </div>
                            </div>
                            <button
                              onClick={() => handleEditSeries(s)}
                              className="p-1 hover:bg-gray-200 rounded"
                              style={{ outline: 'none' }}
                            >
                              <EditIcon className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteSeries(s.id)}
                              className="p-1 hover:bg-red-100 rounded"
                              style={{ outline: 'none' }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        ))}

                        {series.length === 0 && (
                          <div className="text-center py-4 text-sm text-gray-500">
                            No series added. Click "Add Series" to start.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Single Series Config (for non-multi-series charts) */}
                  {!isMultiSeriesChart && (
                    <div className="space-y-3">
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

                      {(measure === 'sum' || measure === 'avg') && (
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
                    </div>
                  )}

                  {/* Sort Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOrder)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      style={{ outline: 'none' }}
                    >
                      <option value="value-desc">Value (High to Low)</option>
                      <option value="value-asc">Value (Low to High)</option>
                      <option value="name-asc">Name (A-Z)</option>
                      <option value="name-desc">Name (Z-A)</option>
                      <option value="original">Original Order (for Dates)</option>
                    </select>
                  </div>

                  {/* Bar Orientation */}
                  {(type === 'bar' || isMultiSeriesChart) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bar Orientation</label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="orientation"
                            value="vertical"
                            checked={barOrientation === 'vertical'}
                            onChange={(e) => setBarOrientation('vertical')}
                            className="mr-2"
                            style={{ outline: 'none' }}
                          />
                          <span className="text-sm">Vertical</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="orientation"
                            value="horizontal"
                            checked={barOrientation === 'horizontal'}
                            onChange={(e) => setBarOrientation('horizontal')}
                            className="mr-2"
                            style={{ outline: 'none' }}
                          />
                          <span className="text-sm">Horizontal</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Category Filter */}
                  {allCategories.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Categories ({categoryFilter.length > 0 ? categoryFilter.length : allCategories.length} of {allCategories.length})
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSelectAllCategories}
                            className="text-xs text-blue-600 hover:text-blue-800"
                            style={{ outline: 'none' }}
                          >
                            Select All
                          </button>
                          <button
                            onClick={handleClearAllCategories}
                            className="text-xs text-gray-600 hover:text-gray-800"
                            style={{ outline: 'none' }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {allCategories.length > 5 && (
                        <div className="mb-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                              placeholder="Search categories..."
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm"
                              style={{ outline: 'none' }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="border border-gray-200 rounded p-3 max-h-48 overflow-y-auto bg-gray-50">
                        {filteredCategories.map((cat, idx) => (
                          <label
                            key={idx}
                            className="flex items-center py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={categoryFilter.length === 0 || categoryFilter.includes(cat)}
                              onChange={() => handleCategoryToggle(cat)}
                              className="mr-2"
                              style={{ outline: 'none' }}
                            />
                            <span className="text-sm text-gray-900">{cat}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {categoryFilter.length === 0 ? 'All categories shown' : `${categoryFilter.length} selected`}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Widget Width</label>
                    <select
                      value={width}
                      onChange={(e) => setWidth(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      style={{ outline: 'none' }}
                    >
                      <option value="half">Half (50%)</option>
                      <option value="full">Full (100%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Widget Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter widget title"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      style={{ outline: 'none' }}
                    />
                  </div>
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
