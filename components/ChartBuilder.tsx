/**
 * ChartBuilder v4 - Simplified (No Manual Series)
 *
 * Features:
 * - 2 tabs: Setup vs Customize
 * - Auto-aggregation from dimension
 * - Per-category color (double-click bar)
 * - No validation - save anytime
 * - No focus ring
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, ChevronDown, ChevronUp, Palette, Type as TypeIcon, Sliders as SlidersIcon, Sparkles, Copy, Wand2, Layers, MousePointer2, Settings2 } from 'lucide-react';
import {
  ChartType,
  DashboardWidget,
  AggregateMethod,
  RawRow,
  DataLabelConfig,
  AxisConfig,
  LegendConfig,
  CategoryConfig,
  InteractionConfig,
  StyleConfig,
  SeriesConfig,
  SortConfig
} from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  Scatter,
  ScatterChart,
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

const chartTemplates = [
  {
    id: 'comparison-bars',
    label: 'Bar Comparison',
    type: 'bar' as ChartType,
    description: 'Stacked bars with sentiment palette',
    config: {
      barMode: 'stacked' as const,
      palette: ['#2563EB', '#10B981', '#F59E0B', '#EF4444'],
      showLegend: true,
      limit: 8,
    }
  },
  {
    id: 'trend-line',
    label: 'Trend Line',
    type: 'line' as ChartType,
    description: 'Smooth line with markers and labels',
    config: {
      showValues: true,
      style: { lineWidth: 3, markerSize: 6 },
      legend: { enabled: true, position: 'top', fontSize: 12, fontColor: '#1F2937', alignment: 'right' } as LegendConfig,
      interaction: { enableBrush: true, enableCrosshair: true, quickRanges: [7, 14, 30] } as InteractionConfig,
    }
  },
  {
    id: 'share-pie',
    label: 'Distribution Pie',
    type: 'pie' as ChartType,
    description: 'Pie with smart labels and legend',
    config: {
      showLegend: true,
      valueFormat: 'percent' as const,
      palette: ['#1D4ED8', '#22C55E', '#F97316', '#0EA5E9', '#EC4899'],
      limit: 6,
    }
  },
  {
    id: 'combo-compare',
    label: 'Combo Compare',
    type: 'combo' as ChartType,
    description: 'Bars + line for target vs actual',
    config: {
      legend: { enabled: true, position: 'bottom', fontSize: 11, fontColor: '#111827', alignment: 'center' } as LegendConfig,
      style: { lineWidth: 2, markerSize: 5, barRadius: 6 },
      interaction: { enableBrush: true, quickRanges: [10, 20] } as InteractionConfig,
    }
  },
  {
    id: 'stacked-share',
    label: 'Stacked Bar',
    type: 'stacked' as ChartType,
    description: 'Layer categories to compare shares',
    config: {
      barMode: 'stacked' as const,
      legend: { enabled: true, position: 'top', fontSize: 11, fontColor: '#1f2937', alignment: 'center' } as LegendConfig,
      style: { barRadius: 8, palette: ['#2563EB', '#10B981', '#F59E0B', '#EF4444'] },
    }
  },
  {
    id: 'scatter-correlation',
    label: 'Scatter Plot',
    type: 'scatter' as ChartType,
    description: 'Plot correlations with crisp markers',
    config: {
      legend: { enabled: true, position: 'bottom', fontSize: 11, fontColor: '#111827', alignment: 'center' } as LegendConfig,
      style: { markerSize: 8, scatterShape: 'diamond' },
    }
  }
];

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

// Category Config Modal
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

const ChartBuilder: React.FC<ChartBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  availableColumns,
  initialWidget,
  data
}) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'customize'>('setup');

  // Widget state
  const [title, setTitle] = useState('New Chart');
  const [type, setType] = useState<ChartType>('bar');
  const [dimension, setDimension] = useState('');
  const [measure, setMeasure] = useState<AggregateMethod>('count');
  const [measureCol, setMeasureCol] = useState('');
  const [limit, setLimit] = useState<number>(10);
  const [width, setWidth] = useState<'half' | 'full'>('half');
  const [seriesList, setSeriesList] = useState<SeriesConfig[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ mode: 'none', key: 'total' });
  const [customSortInput, setCustomSortInput] = useState('');
  const [categoryConfig, setCategoryConfig] = useState<Record<string, CategoryConfig>>({});
  const [templateId, setTemplateId] = useState<string>('');
  const [interaction, setInteraction] = useState<InteractionConfig>({ enableBrush: true, enableCrosshair: true, quickRanges: [10] });
  const defaultStyle: StyleConfig = { lineWidth: 2, markerSize: 4, barRadius: 4, palette: COLORS, smoothLines: true, background: '#ffffff', areaOpacity: 0.3, cardRadius: 12, showShadow: false, scatterShape: 'circle' };
  const [styleConfig, setStyleConfig] = useState<StyleConfig>(defaultStyle);
  const palette = useMemo(() => styleConfig.palette || COLORS, [styleConfig.palette]);

  const createSeries = (index: number, base?: Partial<SeriesConfig>): SeriesConfig => ({
    id: base?.id || `series-${Date.now().toString(36)}-${index}`,
    label: base?.label || `Series ${index + 1}`,
    type: base?.type || (type === 'line' ? 'line' : type === 'area' ? 'area' : type === 'scatter' ? 'scatter' : 'bar'),
    measure: base?.measure || measure,
    measureCol: base?.measureCol || measureCol || undefined,
    dimension: base?.dimension || dimension || undefined,
    filters: base?.filters || [],
    yAxis: base?.yAxis || 'left',
    color: base?.color || palette[index % palette.length],
    dataLabels: base?.dataLabels || dataLabels,
  });

  const resolveSeriesMeasure = (series: SeriesConfig) =>
    series.measureCol && series.measure === 'count' ? 'sum' : series.measure;

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
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; category: string } | null>(null);
  const [selectedElement, setSelectedElement] = useState<{ kind: 'category' | 'series' | 'label'; name: string; seriesId?: string } | null>(null);

  const handleTypeChange = (nextType: ChartType) => {
    setType(nextType);

    if (nextType === 'combo') {
      setSeriesList(prev => {
        const ensureTwo = prev.length >= 2 ? prev : [...prev, createSeries(prev.length, { type: 'line' })];
        return ensureTwo.map((s, idx) => ({ ...s, type: idx === 0 ? 'bar' : s.type, yAxis: idx === 0 ? 'left' : 'right' }));
      });
      return;
    }

    if (nextType === 'stacked') {
      setSeriesList(prev => (prev.length > 0 ? prev : [createSeries(0)]).map(s => ({ ...s, type: 'bar' })));
      return;
    }

    if (nextType === 'scatter') {
      setSeriesList(prev => (prev.length > 0 ? prev : [createSeries(0)]).map(s => ({ ...s, type: 'scatter', yAxis: 'left' })));
      return;
    }

    setSeriesList(prev => prev.map(s => ({ ...s, type: nextType === 'line' ? 'line' : nextType === 'area' ? 'area' : 'bar' }))); 
  };

  // Initialize
  useEffect(() => {
    if (initialWidget) {
      setTitle(initialWidget.title);
      setType(initialWidget.type);
      setDimension(initialWidget.dimension);
      const baseMeasure = initialWidget.measure || 'count';
      setMeasure(baseMeasure);
      setMeasureCol(initialWidget.measureCol || '');
      setLimit(initialWidget.limit || 10);
      setWidth(initialWidget.width);
      setCategoryConfig(initialWidget.categoryConfig || {});
      setTemplateId(initialWidget.templateId || '');
      setInteraction(initialWidget.interaction || { enableBrush: true, enableCrosshair: true, quickRanges: [10] });
      setStyleConfig(initialWidget.style ? { ...defaultStyle, ...initialWidget.style } : defaultStyle);
      setChartTitle(initialWidget.chartTitle || initialWidget.title);
      setSubtitle(initialWidget.subtitle || '');
      if (initialWidget.legend) setLegend(initialWidget.legend);
      if (initialWidget.dataLabels) setDataLabels(initialWidget.dataLabels);
      setXAxis(initialWidget.xAxis || xAxis);
      setLeftYAxis(initialWidget.leftYAxis || leftYAxis);
      setRightYAxis(initialWidget.rightYAxis || rightYAxis);
      if (initialWidget.series && initialWidget.series.length > 0) {
        const normalizedSeries = initialWidget.series.map(s =>
          s.measureCol && s.measure === 'count' ? { ...s, measure: 'sum' as AggregateMethod } : s
        );
        setSeriesList(normalizedSeries);
        const primary = normalizedSeries[0];
        if (primary) {
          setMeasure(resolveSeriesMeasure(primary));
          if (primary.measureCol) {
            setMeasureCol(primary.measureCol);
          }
        }
      } else {
        setSeriesList([
          createSeries(0, {
            id: `series-${initialWidget.id || 'primary'}`,
            label: initialWidget.title || 'Series 1',
            measure: baseMeasure,
            measureCol: initialWidget.measureCol,
            type: initialWidget.type === 'line' ? 'line' : initialWidget.type === 'area' ? 'area' : 'bar',
            color: palette[0],
          })
        ]);
      }
      if (initialWidget.sort) {
        setSortConfig(initialWidget.sort);
        if (initialWidget.sort.customOrder) {
          setCustomSortInput(initialWidget.sort.customOrder.join(', '));
        }
      }
    } else {
      if (availableColumns.length > 0) {
        setDimension(availableColumns[0]);
      }
      setStyleConfig(defaultStyle);
      setSeriesList([createSeries(0)]);
    }
  }, [initialWidget, availableColumns]);

  const parseCustomOrder = (input: string) =>
    input
      .split(/\n|,/)
      .map(item => item.trim())
      .filter(Boolean);

  const applySorting = (rows: any[], seriesKeys: string[], categoryOrder: string[]) => {
    if (sortConfig.persistedOrder && sortConfig.persistedOrder.length > 0) {
      const order = sortConfig.persistedOrder;
      return [...rows].sort((a, b) => {
        const aIdx = order.indexOf(a.name);
        const bIdx = order.indexOf(b.name);
        if (aIdx === -1 && bIdx === -1) {
          return categoryOrder.indexOf(a.name) - categoryOrder.indexOf(b.name);
        }
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    }

    if (!sortConfig || sortConfig.mode === 'none') {
      if (categoryOrder.length === 0) return rows;
      return [...rows].sort((a, b) => categoryOrder.indexOf(a.name) - categoryOrder.indexOf(b.name));
    }

    if (sortConfig.mode === 'custom') {
      const order = (sortConfig.customOrder && sortConfig.customOrder.length > 0)
        ? sortConfig.customOrder
        : parseCustomOrder(customSortInput);
      if (order.length === 0) return rows;
      return [...rows].sort((a, b) => {
        const aIdx = order.indexOf(a.name);
        const bIdx = order.indexOf(b.name);
        if (aIdx === -1 && bIdx === -1) {
          return categoryOrder.indexOf(a.name) - categoryOrder.indexOf(b.name);
        }
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    }

    const direction = sortConfig.mode === 'asc' ? 1 : -1;
    const key = sortConfig.key || 'total';
    const valueOf = (row: any) => {
      if (key === 'dimension') return String(row.name || '');
      return seriesKeys.reduce((sum, sk) => sum + (Number(row[sk]) || 0), 0);
    };

    return [...rows].sort((a, b) => {
      const aVal = valueOf(a);
      const bVal = valueOf(b);
      if (typeof aVal === 'string' || typeof bVal === 'string') {
        return String(aVal).localeCompare(String(bVal)) * direction;
      }
      return (aVal as number - (bVal as number)) * direction;
    });
  };

  // Aggregate data for preview (multi-series aware)
  const previewData = useMemo(() => {
    const normalizedSeries = seriesList.map(s =>
      s.measureCol && s.measure === 'count' ? { ...s, measure: 'sum' as AggregateMethod } : s
    );
    const resolvedDimension = dimension || normalizedSeries.find(s => s.dimension)?.dimension;
    if ((!resolvedDimension && seriesList.every(s => !s.dimension)) || data.length === 0) return [];

    const axisKey = resolvedDimension || 'category';
    const parseNumber = (val: any) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    if (normalizedSeries.length > 0) {
      const buckets: Record<string, any> = {};
      const categoryOrder: string[] = [];
      const seenCategories = new Set<string>();

      // Seed categories from the shared axis dimension to keep X labels stable
      data.forEach(row => {
        const baseKey = String(row[resolvedDimension || ''] ?? 'N/A');
        if (!seenCategories.has(baseKey)) {
          seenCategories.add(baseKey);
          categoryOrder.push(baseKey);
          buckets[baseKey] = { name: baseKey, [axisKey]: baseKey };
        }
      });

      normalizedSeries.forEach(series => {
        const seriesDimension = series.dimension || resolvedDimension;
        if (!seriesDimension) return;
        data.forEach(row => {
          const dimValue = String(row[seriesDimension] ?? 'N/A');
          const axisValue = String(row[resolvedDimension || seriesDimension] ?? dimValue);

          if (!seenCategories.has(axisValue)) {
            seenCategories.add(axisValue);
            categoryOrder.push(axisValue);
            buckets[axisValue] = { name: axisValue, [axisKey]: axisValue };
          }

          const resolvedMeasure = resolveSeriesMeasure(series);
          if (resolvedMeasure === 'count') {
            buckets[axisValue][series.id] = (buckets[axisValue][series.id] || 0) + 1;
          } else if (resolvedMeasure === 'sum' && series.measureCol) {
            const val = parseNumber(row[series.measureCol]);
            buckets[axisValue][series.id] = (buckets[axisValue][series.id] || 0) + val;
          } else if (resolvedMeasure === 'avg' && series.measureCol) {
            if (!buckets[axisValue][`${series.id}_sum`]) {
              buckets[axisValue][`${series.id}_sum`] = 0;
              buckets[axisValue][`${series.id}_count`] = 0;
            }
            const val = parseNumber(row[series.measureCol]);
            buckets[axisValue][`${series.id}_sum`] += val;
            buckets[axisValue][`${series.id}_count`] += 1;
          }
        });
      });

      Object.values(buckets).forEach((bucket: any) => {
        normalizedSeries.forEach(series => {
          const resolvedMeasure = resolveSeriesMeasure(series);
          if (resolvedMeasure === 'avg') {
            const count = bucket[`${series.id}_count`] || 0;
            if (count > 0) {
              bucket[series.id] = bucket[`${series.id}_sum`] / count;
            }
            delete bucket[`${series.id}_sum`];
            delete bucket[`${series.id}_count`];
          }
          if (bucket[series.id] === undefined) {
            bucket[series.id] = 0;
          }
        });
      });

      const sorted = applySorting(Object.values(buckets), normalizedSeries.map(s => s.id), categoryOrder);
      return sorted.slice(0, limit);
    }

    const groups: Record<string, number> = {};
    const categoryOrder: string[] = [];

    data.forEach(row => {
      const dimValue = String(row[axisKey] || 'N/A');

      if (!groups[dimValue]) {
        groups[dimValue] = 0;
        categoryOrder.push(dimValue);
      }

      if (measure === 'count') {
        groups[dimValue]++;
      } else if (measure === 'sum' && measureCol) {
        const val = parseNumber(row[measureCol]);
        groups[dimValue] += val;
      } else if (measure === 'avg' && measureCol) {
        if (!groups[`${dimValue}_sum`]) {
          groups[`${dimValue}_sum`] = 0;
          groups[`${dimValue}_count`] = 0;
        }
        const val = parseNumber(row[measureCol]);
        groups[`${dimValue}_sum`] += val;
        groups[`${dimValue}_count`]++;
      }
    });

    const rows = Object.entries(groups)
      .filter(([key]) => !key.includes('_'))
      .map(([name, value]) => {
        if (measure === 'avg') {
          const sum = groups[`${name}_sum`] || 0;
          const count = groups[`${name}_count`] || 1;
          return { name, [measureCol || 'value']: sum / count };
        }
        return { name, value };
      });

    const sorted = applySorting(rows, seriesList.length ? seriesList.map(s => s.id) : ['value'], categoryOrder);
    return sorted.slice(0, limit);
  }, [dimension, measure, measureCol, data, limit, seriesList, sortConfig, customSortInput]);

  const applyTemplate = (templateIdToApply: string) => {
    const template = chartTemplates.find(t => t.id === templateIdToApply);
    if (!template) return;

    setTemplateId(template.id);
    setType(template.type);
    if (template.config.limit) setLimit(template.config.limit);
    if ((template.config as any).palette) {
      const palette = (template.config as any).palette as string[];
      setStyleConfig(prev => ({ ...prev, palette }));
    }
    if ((template.config as any).legend) setLegend((template.config as any).legend as LegendConfig);
    if ((template.config as any).style) setStyleConfig(prev => ({ ...prev, ...(template.config as any).style }));
    if ((template.config as any).interaction) setInteraction((template.config as any).interaction as InteractionConfig);
    if ((template.config as any).barMode) setBarMode((template.config as any).barMode);
    if ((template.config as any).valueFormat) setValueFormat((template.config as any).valueFormat);
    if ((template.config as any).showLegend !== undefined) setShowLegend((template.config as any).showLegend);
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
    const normalizedSeries = (seriesList.length > 0 ? seriesList : [createSeries(0)]).map(s =>
      s.measureCol && s.measure === 'count' ? { ...s, measure: 'sum' as AggregateMethod } : s
    );
    const widgetDimension = dimension || normalizedSeries.find(s => s.dimension)?.dimension;
    if (!widgetDimension) {
      alert('Please select a dimension for the X-axis (or per-series dimension).');
      return;
    }
    const invalidMeasure = normalizedSeries.some(s => (s.measure === 'sum' || s.measure === 'avg') && !s.measureCol);
    if (invalidMeasure) {
      alert('Select a value column for SUM or AVERAGE series.');
      return;
    }

    const previewOrder = previewData.map(item => (item as any).name).filter(Boolean) as string[];
    const preparedSort: SortConfig = {
      ...sortConfig,
      customOrder: sortConfig.mode === 'custom' ? parseCustomOrder(customSortInput) : undefined,
      persistedOrder: previewOrder,
    };

    // Ensure every series carries the resolved dimension so the dashboard renderer has a stable X key
    const hydratedSeries = normalizedSeries.map(series => ({
      ...series,
      dimension: series.dimension || widgetDimension
    }));

    const primarySeries = hydratedSeries[0];
    const widget: DashboardWidget = {
      id: initialWidget?.id || generateId(),
      title,
      type,
      dimension: widgetDimension,
      measure: primarySeries?.measure || measure,
      measureCol: primarySeries?.measureCol || measureCol || undefined,
      series: hydratedSeries,
      limit,
      width,
      templateId,
      interaction,
      style: styleConfig,
      palette: styleConfig.palette,
      chartTitle,
      subtitle,
      legend,
      dataLabels,
      xAxis,
      leftYAxis,
      rightYAxis,
      categoryConfig,
      sort: preparedSort
    };

    onSave(widget);
    onClose();
  };

  const handleBarDoubleClick = (category: string) => {
    setCategoryModal({ isOpen: true, category });
    setSelectedElement({ kind: 'category', name: category });
  };

  const handleElementPick = (kind: 'category' | 'series' | 'label', name: string, seriesId?: string) => {
    setSelectedElement({ kind, name, seriesId });
  };

  const updateSelectedColor = (color: string) => {
    if (!selectedElement) return;
    if (selectedElement.kind === 'category') {
      setCategoryConfig(prev => ({
        ...prev,
        [selectedElement.name]: { ...(prev[selectedElement.name] || {}), color }
      }));
    }
    if (selectedElement.kind === 'series' && selectedElement.seriesId) {
      setSeriesList(prev => prev.map(s => s.id === selectedElement.seriesId ? { ...s, color } : s));
    }
    if (selectedElement.kind === 'label') {
      setDataLabels(prev => ({ ...prev, color }));
    }
  };

  const updateSelectedLabel = (label: string) => {
    if (!selectedElement) return;
    if (selectedElement.kind === 'category') {
      setCategoryConfig(prev => ({
        ...prev,
        [selectedElement.name]: { ...(prev[selectedElement.name] || {}), label }
      }));
    }
    if (selectedElement.kind === 'series' && selectedElement.seriesId) {
      setSeriesList(prev => prev.map(s => s.id === selectedElement.seriesId ? { ...s, label } : s));
    }
    if (selectedElement.kind === 'label') {
      setDataLabels(prev => ({ ...prev, enabled: true }));
    }
  };

  const showAxes = type !== 'pie' && type !== 'kpi' && type !== 'wordcloud' && type !== 'table';
  const isScatter = type === 'scatter';
  const isStacked = type === 'stacked';

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

        {/* Templates & Wizard */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-200 bg-white">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900">Chart Templates</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Wand2 className="w-4 h-4" />
                Pick a template to start fast
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {chartTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className={`border rounded-lg p-3 text-left hover:border-blue-500 hover:shadow-sm transition bg-gray-50 ${templateId === template.id ? 'border-blue-500 shadow' : 'border-gray-200'}`}
                  style={{ outline: 'none' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-900">{template.label}</div>
                    <Layers className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 leading-snug">{template.description}</p>
                  <div className="mt-3 flex items-center gap-1 flex-wrap">
                    {(template.config as any).palette?.slice(0, 4)?.map((c: string) => (
                      <span key={c} className="w-4 h-4 rounded-full border border-white shadow" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden">
          {/* LEFT: Preview */}
          <div className="flex flex-col bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-white border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Live Preview</h3>
              <p className="text-xs text-gray-500 mt-1">Double-click bars to customize colors</p>
            </div>

            <div className="flex-1 p-6 overflow-auto">
              {previewData.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 h-full" style={{ backgroundColor: styleConfig.background }}>
                  {chartTitle && (
                    <div className="text-center mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{chartTitle}</h3>
                      {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height={400}>
                    {type === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={(seriesList.length > 0 ? previewData.map(d => ({ name: (d as any).name, value: d[seriesList[0].id] || 0 })) : previewData) as any[]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          label={dataLabels.enabled}
                          onDoubleClick={(data: any) => handleBarDoubleClick(data.name)}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        >
                          {previewData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={categoryConfig[(entry as any).name]?.color || palette[index % palette.length]}
                            />
                          ))}
                        </Pie>
                        {legend.enabled && <RechartsLegend />}
                        <Tooltip />
                      </PieChart>
                    ) : isScatter ? (
                      <ScatterChart data={previewData.map((item, idx) => ({ ...item, __xIndex: idx }))} margin={{ top: 10, left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="__xIndex"
                          type="number"
                          tickFormatter={(val) => previewData[val]?.name || val}
                          tick={{ fontSize: xAxis.fontSize, fill: xAxis.fontColor }}
                        />
                        <YAxis
                          tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                          label={leftYAxis.title ? { value: leftYAxis.title, angle: -90, position: 'insideLeft' } : undefined}
                        />
                        <Tooltip />
                        {legend.enabled && <RechartsLegend />}
                        {(seriesList.length > 0 ? seriesList : [{ id: 'value', label: 'Series 1', type: 'scatter' as const, color: palette[0], yAxis: 'left' as const }]).map((series, idx) => (
                          <Scatter
                            key={series.id}
                            dataKey={series.id}
                            name={series.label || `Series ${idx + 1}`}
                            fill={series.color || palette[idx % palette.length]}
                            shape={styleConfig.scatterShape || 'circle'}
                            size={styleConfig.markerSize || 6}
                            onClick={(data: any) => handleElementPick('series', series.label || series.id, series.id)}
                          />
                        ))}
                      </ScatterChart>
                    ) : (
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
                          yAxisId="left"
                          tick={{ fontSize: leftYAxis.fontSize, fill: leftYAxis.fontColor }}
                          domain={[
                            leftYAxis.min === 'auto' ? 'auto' : leftYAxis.min,
                            leftYAxis.max === 'auto' ? 'auto' : leftYAxis.max
                          ]}
                          label={leftYAxis.title ? { value: leftYAxis.title, angle: -90, position: 'insideLeft' } : undefined}
                          style={{ outline: 'none' }}
                        />
                        {seriesList.some(s => s.yAxis === 'right') && (
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: rightYAxis.fontSize, fill: rightYAxis.fontColor }}
                            domain={[
                              rightYAxis.min === 'auto' ? 'auto' : rightYAxis.min,
                              rightYAxis.max === 'auto' ? 'auto' : rightYAxis.max
                            ]}
                            label={rightYAxis.title ? { value: rightYAxis.title, angle: 90, position: 'insideRight' } : undefined}
                            style={{ outline: 'none' }}
                          />
                        )}
                        <Tooltip />
                        {legend.enabled && <RechartsLegend />}
                        {(seriesList.length > 0
                          ? seriesList
                          : [{ id: 'value', label: 'Values', type: type === 'line' ? 'line' : type === 'area' ? 'area' : type === 'scatter' ? 'scatter' : 'bar', color: palette[0], yAxis: 'left' as const }]
                        ).map((series, idx) => {
                          const Component = series.type === 'line' ? Line : series.type === 'area' ? Area : series.type === 'scatter' ? Scatter : Bar;
                          return (
                            <Component
                              key={series.id}
                              yAxisId={series.yAxis || 'left'}
                              dataKey={series.id}
                              name={series.label || `Series ${idx + 1}`}
                              type={styleConfig.smoothLines ? 'monotone' : 'linear'}
                              fill={series.color || palette[idx % palette.length]}
                              stroke={series.color || palette[idx % palette.length]}
                              fillOpacity={series.type === 'area' ? styleConfig.areaOpacity ?? 0.3 : 1}
                              strokeWidth={series.type === 'line' ? (styleConfig.lineWidth || 2) : 0}
                              radius={series.type === 'bar' && styleConfig.barRadius ? [styleConfig.barRadius, styleConfig.barRadius, 0, 0] : undefined}
                              stackId={isStacked && series.type === 'bar' ? 'stack' : undefined}
                              onDoubleClick={(data: any) => handleBarDoubleClick(data.name)}
                              onClick={(data: any) => handleElementPick(series.type === 'bar' ? 'category' : 'series', data?.name || series.label, series.id)}
                            >
                              {dataLabels.enabled && (
                                <LabelList
                                  dataKey={series.id}
                                  position={dataLabels.position as any}
                                  content={(labelProps: any) => (
                                    <text
                                      x={labelProps.x}
                                      y={labelProps.y}
                                      dy={-4}
                                      textAnchor="middle"
                                      fill={dataLabels.color}
                                      fontSize={dataLabels.fontSize}
                                      fontWeight={dataLabels.fontWeight}
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => handleElementPick('label', String(labelProps.value ?? ''), series.id)}
                                    >
                                      {labelProps.value}
                                    </text>
                                  )}
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
                      onChange={(e) => handleTypeChange(e.target.value as ChartType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      style={{ outline: 'none' }}
                    >
                      <option value="bar">Bar</option>
                      <option value="stacked">Stacked</option>
                      <option value="scatter">Scatter</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="combo">Combo (Bar + Line)</option>
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

                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Series</p>
                        <p className="text-xs text-gray-500">Match Google Sheets: multiple value series with per-axis styling</p>
                      </div>
                      <button
                        onClick={() => setSeriesList([...seriesList, createSeries(seriesList.length)])}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                      >
                        Add series
                      </button>
                    </div>

                    <div className="space-y-3">
                      {seriesList.map((series, idx) => (
                        <div key={series.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                                  <input
                                    type="text"
                                    value={series.label}
                                    onChange={(e) => {
                                      const next = [...seriesList];
                                      next[idx] = { ...series, label: e.target.value };
                                      setSeriesList(next);
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Chart type</label>
                                  <select
                                    value={series.type}
                                    onChange={(e) => {
                                      const next = [...seriesList];
                                      next[idx] = { ...series, type: e.target.value as SeriesConfig['type'] };
                                      setSeriesList(next);
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="bar">Bar</option>
                                    <option value="line">Line</option>
                                    <option value="area">Area</option>
                                    <option value="scatter">Scatter</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Aggregation</label>
                                  <select
                                    value={series.measure}
                                    onChange={(e) => {
                                      const next = [...seriesList];
                                      const nextMeasure = e.target.value as AggregateMethod;
                                      next[idx] = { ...series, measure: nextMeasure };
                                      setSeriesList(next);
                                      if (idx === 0) setMeasure(nextMeasure);
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="count">Count</option>
                                    <option value="sum">Sum</option>
                                    <option value="avg">Average</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Value column</label>
                                  <select
                                    value={series.measureCol || ''}
                                    onChange={(e) => {
                                      const next = [...seriesList];
                                      const updatedSeries: SeriesConfig = {
                                        ...series,
                                        measureCol: e.target.value,
                                        measure: series.measure === 'count' && e.target.value ? 'sum' : series.measure,
                                      };
                                      next[idx] = updatedSeries;
                                      setSeriesList(next);
                                      if (idx === 0) {
                                        setMeasure(updatedSeries.measure);
                                        setMeasureCol(e.target.value);
                                      }
                                    }}
                                    disabled={series.measure === 'count'}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                                  >
                                    <option value="">Auto</option>
                                    {availableColumns.map(col => (
                                      <option key={col} value={col}>{col}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Y axis</label>
                                  <select
                                    value={series.yAxis}
                                    onChange={(e) => {
                                      const next = [...seriesList];
                                      next[idx] = { ...series, yAxis: e.target.value as 'left' | 'right' };
                                      setSeriesList(next);
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="left">Left axis</option>
                                    <option value="right">Right axis</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Dimension (optional)</label>
                                  <select
                                    value={series.dimension || ''}
                                    onChange={(e) => {
                                      const next = [...seriesList];
                                      next[idx] = { ...series, dimension: e.target.value || undefined };
                                      setSeriesList(next);
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="">Use chart dimension ({dimension || 'select dimension'})</option>
                                    {availableColumns.map(col => (
                                      <option key={col} value={col}>{col}</option>
                                    ))}
                                  </select>
                                  <p className="text-[11px] text-gray-500 mt-1">Pick a different category for this series when mixing bars and lines.</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <span>Color</span>
                                  <input
                                    type="color"
                                    value={series.color}
                                    onChange={(e) => {
                                      const next = [...seriesList];
                                      next[idx] = { ...series, color: e.target.value };
                                      setSeriesList(next);
                                    }}
                                    className="w-12 h-8 border border-gray-300 rounded"
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-xs text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={series.type === 'line' && styleConfig.smoothLines}
                                    onChange={(e) => setStyleConfig({ ...styleConfig, smoothLines: e.target.checked })}
                                  />
                                  Smooth lines
                                </label>
                              </div>
                            </div>

                            {seriesList.length > 1 && (
                              <button
                                onClick={() => setSeriesList(seriesList.filter((_, sIdx) => sIdx !== idx))}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Limit: {limit} items</label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value))}
                      className="w-full"
                      style={{ outline: 'none' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Sorting</label>
                    <div className="grid grid-cols-3 gap-3">
                      <select
                        value={sortConfig.mode}
                        onChange={(e) => setSortConfig({ ...sortConfig, mode: e.target.value as SortConfig['mode'], persistedOrder: undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="none">Keep data order</option>
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                        <option value="custom">Custom order</option>
                      </select>
                      <select
                        value={sortConfig.key || 'total'}
                        onChange={(e) => setSortConfig({ ...sortConfig, key: e.target.value as SortConfig['key'] })}
                        disabled={sortConfig.mode === 'custom' || sortConfig.mode === 'none'}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                      >
                        <option value="total">By value</option>
                        <option value="dimension">By label</option>
                      </select>
                    </div>
                    {sortConfig.mode === 'custom' && (
                      <div>
                        <textarea
                          value={customSortInput}
                          onChange={(e) => setCustomSortInput(e.target.value)}
                          placeholder="Enter categories in the desired order, separated by commas or new lines"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          rows={2}
                        />
                        <p className="text-xs text-gray-500 mt-1">Example: Facebook, Twitter, Instagram</p>
                      </div>
                    )}
                  </div>

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

                  {/* Show categories preview */}
                  {previewData.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categories ({previewData.length})
                      </label>
                      <div className="border border-gray-200 rounded p-3 max-h-40 overflow-y-auto bg-gray-50">
                        {previewData.map((item: any, idx) => {
                          const aggregatedValue = seriesList.length > 0
                            ? seriesList.reduce((sum, s) => sum + (item[s.id] || 0), 0)
                            : item.value;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer"
                              onDoubleClick={() => handleBarDoubleClick(item.name)}
                            >
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: categoryConfig[item.name]?.color || COLORS[idx % COLORS.length] }}
                              />
                              <span className="text-sm text-gray-900">{item.name}</span>
                              <span className="text-xs text-gray-500 ml-auto">{Math.round(aggregatedValue)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Double-click to change color</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'customize' && (
                <div className="space-y-2">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-wrap gap-3 items-center">
                    <div className="text-xs font-semibold text-gray-700">Quick Options</div>
                    <button
                      onClick={() => setLegend({ ...legend, enabled: !legend.enabled })}
                      className={`px-2.5 py-1 text-xs rounded border ${legend.enabled ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                    >
                      Legend
                    </button>
                    <button
                      onClick={() => setDataLabels({ ...dataLabels, enabled: !dataLabels.enabled })}
                      className={`px-2.5 py-1 text-xs rounded border ${dataLabels.enabled ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                    >
                      Data labels
                    </button>
                    <button
                      onClick={() => setXAxis({ ...xAxis, showGridlines: !xAxis.showGridlines })}
                      className={`px-2.5 py-1 text-xs rounded border ${xAxis.showGridlines ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                    >
                      X gridlines
                    </button>
                    <button
                      onClick={() => setLeftYAxis({ ...leftYAxis, showGridlines: !leftYAxis.showGridlines })}
                      className={`px-2.5 py-1 text-xs rounded border ${leftYAxis.showGridlines ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                    >
                      Y gridlines
                    </button>
                    <button
                      onClick={() => setStyleConfig({ ...styleConfig, smoothLines: !styleConfig.smoothLines })}
                      className={`px-2.5 py-1 text-xs rounded border ${styleConfig.smoothLines ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                    >
                      Smooth lines
                    </button>
                    <div className="flex items-center gap-2 text-xs text-gray-600 ml-auto">
                      <span>Background</span>
                      <input
                        type="color"
                        value={styleConfig.background || '#ffffff'}
                        onChange={(e) => setStyleConfig({ ...styleConfig, background: e.target.value })}
                        className="w-10 h-8 border border-gray-300 rounded"
                        style={{ outline: 'none' }}
                      />
                    </div>
                  </div>
                  <Section
                    title="Inspector"
                    icon={<MousePointer2 className="w-4 h-4 text-blue-600" />}
                    isOpen={openSections.has('inspector') || !selectedElement}
                    onToggle={() => toggleSection('inspector')}
                  >
                    <div className="space-y-2">
                      {selectedElement ? (
                        <>
                          <div className="text-sm font-semibold text-gray-800">
                            Selected {selectedElement.kind === 'category' ? 'Category' : selectedElement.kind === 'series' ? 'Series' : 'Label'}: {selectedElement.name}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                              <input
                                type="color"
                                value={selectedElement.kind === 'series'
                                  ? seriesList.find(s => s.id === selectedElement.seriesId)?.color || palette[0]
                                  : selectedElement.kind === 'category'
                                    ? categoryConfig[selectedElement.name]?.color || palette[0]
                                    : dataLabels.color}
                                onChange={(e) => updateSelectedColor(e.target.value)}
                                className="w-16 h-10 border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                              <input
                                type="text"
                                value={selectedElement.kind === 'category'
                                  ? categoryConfig[selectedElement.name]?.label || selectedElement.name
                                  : selectedElement.kind === 'series'
                                    ? seriesList.find(s => s.id === selectedElement.seriesId)?.label || selectedElement.name
                                    : selectedElement.name}
                                onChange={(e) => updateSelectedLabel(e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </div>
                          {selectedElement.kind === 'label' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Font size</label>
                                <input
                                  type="range"
                                  min={8}
                                  max={24}
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
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-600">Click bars, lines, or labels in the preview to fine-tune style.</p>
                      )}
                    </div>
                  </Section>
                  <Section
                    title="Styling"
                    icon={<Palette className="w-4 h-4 text-blue-600" />}
                    isOpen={openSections.has('styling')}
                    onToggle={() => toggleSection('styling')}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Line Width: {styleConfig.lineWidth}px</label>
                        <input
                          type="range"
                          min={1}
                          max={6}
                          value={styleConfig.lineWidth}
                          onChange={(e) => setStyleConfig({ ...styleConfig, lineWidth: parseInt(e.target.value) })}
                          className="w-full"
                          style={{ outline: 'none' }}
                        />
                      </div>
                      {(type === 'line' || type === 'area' || type === 'combo' || isScatter) && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Marker Size: {styleConfig.markerSize}px</label>
                          <input
                            type="range"
                            min={2}
                            max={14}
                            value={styleConfig.markerSize}
                            onChange={(e) => setStyleConfig({ ...styleConfig, markerSize: parseInt(e.target.value) })}
                            className="w-full"
                            style={{ outline: 'none' }}
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Bar Corner Radius: {styleConfig.barRadius}px</label>
                        <input
                          type="range"
                          min={0}
                          max={12}
                          value={styleConfig.barRadius}
                          onChange={(e) => setStyleConfig({ ...styleConfig, barRadius: parseInt(e.target.value) })}
                          className="w-full"
                          style={{ outline: 'none' }}
                        />
                      </div>
                      {isScatter && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Point shape</label>
                          <select
                            value={styleConfig.scatterShape || 'circle'}
                            onChange={(e) => setStyleConfig({ ...styleConfig, scatterShape: e.target.value as any })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          >
                            <option value="circle">Circle</option>
                            <option value="square">Square</option>
                            <option value="diamond">Diamond</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Custom Palette (comma-separated)</label>
                        <input
                          type="text"
                          value={(styleConfig.palette || COLORS).join(', ')}
                          onChange={(e) => setStyleConfig({ ...styleConfig, palette: e.target.value.split(',').map(c => c.trim()).filter(Boolean) })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          style={{ outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Area Fill Opacity: {(styleConfig.areaOpacity || 0.3).toFixed(2)}</label>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={styleConfig.areaOpacity || 0.3}
                          onChange={(e) => setStyleConfig({ ...styleConfig, areaOpacity: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Card Radius: {styleConfig.cardRadius || 0}px</label>
                        <input
                          type="range"
                          min={4}
                          max={24}
                          value={styleConfig.cardRadius || 0}
                          onChange={(e) => setStyleConfig({ ...styleConfig, cardRadius: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!styleConfig.showShadow}
                          onChange={(e) => setStyleConfig({ ...styleConfig, showShadow: e.target.checked })}
                        />
                        Lift card with subtle shadow
                      </label>
                    </div>
                  </Section>

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
                  )}

                  {showAxes && (
                    <Section
                      title="Y-Axis"
                      icon={<SlidersIcon className="w-4 h-4 text-pink-600" />}
                      isOpen={openSections.has('y-axis')}
                      onToggle={() => toggleSection('y-axis')}
                    >
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Left axis title</label>
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

                        <div className="border-t border-gray-200 pt-3 mt-2">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-700">Right axis title</label>
                            <span className="text-[11px] text-gray-500">For combo / dual metrics</span>
                          </div>
                          <input
                            type="text"
                            value={rightYAxis.title || ''}
                            onChange={(e) => setRightYAxis({ ...rightYAxis, title: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            style={{ outline: 'none' }}
                            placeholder="e.g., Total Engagement"
                          />

                          <div className="grid grid-cols-2 gap-3 mt-3">
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
                      </div>
                    </Section>
                  )}

                  <Section
                    title="Interaction"
                    icon={<SlidersIcon className="w-4 h-4 text-amber-600" />}
                    isOpen={openSections.has('interaction')}
                    onToggle={() => toggleSection('interaction')}
                  >
                    <div className="space-y-3">
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={interaction.enableBrush}
                          onChange={(e) => setInteraction({ ...interaction, enableBrush: e.target.checked })}
                          className="mr-2"
                        />
                        Enable brush / zoom
                      </label>
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={interaction.enableCrosshair}
                          onChange={(e) => setInteraction({ ...interaction, enableCrosshair: e.target.checked })}
                          className="mr-2"
                        />
                        Show crosshair + tooltip
                      </label>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Quick ranges (data points)</label>
                        <input
                          type="text"
                          value={(interaction.quickRanges || []).join(', ')}
                          onChange={(e) => setInteraction({ ...interaction, quickRanges: e.target.value.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n)) })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Example: 7, 14, 30 for quick zoom presets</p>
                      </div>
                    </div>
                  </Section>
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
