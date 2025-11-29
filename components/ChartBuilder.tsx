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
import { X, Save, ChevronDown, ChevronUp, Palette, Type as TypeIcon, Sliders as SlidersIcon, Sparkles, Copy, Wand2, Layers, MoveHorizontal } from 'lucide-react';
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
  StyleConfig
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
  const [categoryConfig, setCategoryConfig] = useState<Record<string, CategoryConfig>>({});
  const [templateId, setTemplateId] = useState<string>('');
  const [interaction, setInteraction] = useState<InteractionConfig>({ enableBrush: true, enableCrosshair: true, quickRanges: [10] });
  const [styleConfig, setStyleConfig] = useState<StyleConfig>({ lineWidth: 2, markerSize: 4, barRadius: 4, palette: COLORS });
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const palette = useMemo(() => styleConfig.palette || COLORS, [styleConfig.palette]);

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

  // UI state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; category: string } | null>(null);

  // Initialize
  useEffect(() => {
    if (initialWidget) {
      setTitle(initialWidget.title);
      setType(initialWidget.type);
      setDimension(initialWidget.dimension);
      setMeasure(initialWidget.measure || 'count');
      setMeasureCol(initialWidget.measureCol || '');
      setLimit(initialWidget.limit || 10);
      setWidth(initialWidget.width);
      setCategoryConfig(initialWidget.categoryConfig || {});
      setTemplateId(initialWidget.templateId || '');
      setInteraction(initialWidget.interaction || { enableBrush: true, enableCrosshair: true, quickRanges: [10] });
      setStyleConfig(initialWidget.style || { lineWidth: 2, markerSize: 4, barRadius: 4, palette: COLORS });
      setChartTitle(initialWidget.chartTitle || initialWidget.title);
      setSubtitle(initialWidget.subtitle || '');
      if (initialWidget.legend) setLegend(initialWidget.legend);
      if (initialWidget.dataLabels) setDataLabels(initialWidget.dataLabels);
      setXAxis(initialWidget.xAxis || xAxis);
      setLeftYAxis(initialWidget.leftYAxis || leftYAxis);
    } else {
      if (availableColumns.length > 0) {
        setDimension(availableColumns[0]);
      }
    }
  }, [initialWidget, availableColumns]);

  // Aggregate data for preview
  const previewData = useMemo(() => {
    if (!dimension || data.length === 0) return [];

    const groups: Record<string, number> = {};

    data.forEach(row => {
      const dimValue = String(row[dimension] || 'N/A');

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

  const result = Object.keys(groups)
      .filter(k => !k.includes('_'))
      .map(k => ({
        name: k,
        value: groups[k]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

  return result;
}, [dimension, measure, measureCol, data, limit]);

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
    const widget: DashboardWidget = {
      id: initialWidget?.id || generateId(),
      title,
      type,
      dimension,
      measure,
      measureCol: measureCol || undefined,
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
      categoryConfig
    };

    onSave(widget);
    onClose();
  };

  const handleBarDoubleClick = (category: string) => {
    setCategoryModal({ isOpen: true, category });
  };

  const showAxes = type !== 'pie' && type !== 'kpi' && type !== 'wordcloud' && type !== 'table';

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
                เลือกแม่แบบเพื่อเริ่มต้นเร็วขึ้น
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

            <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${wizardStep === step ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
                  >
                    {step}
                  </div>
                  <div className="text-sm text-gray-700">
                    {step === 1 && 'เลือก Dimension'}
                    {step === 2 && 'เลือก Measure'}
                    {step === 3 && 'ตั้งค่ากราฟ'}
                  </div>
                  {step < 3 && <MoveHorizontal className="w-4 h-4 text-gray-300" />}
                </div>
              ))}
              <div className="ml-auto flex items-center gap-2">
                {wizardStep > 1 && (
                  <button
                    onClick={() => setWizardStep((prev) => (prev === 2 ? 1 : 2))}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100"
                  >
                    ย้อนกลับ
                  </button>
                )}
                {wizardStep < 3 && (
                  <button
                    onClick={() => setWizardStep((prev) => (prev === 1 ? 2 : 3))}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                  >
                    ขั้นถัดไป
                  </button>
                )}
              </div>
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
                <div className="bg-white rounded-lg shadow-sm p-6 h-full">
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
                          data={previewData}
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
                              fill={categoryConfig[entry.name]?.color || palette[index % palette.length]}
                            />
                          ))}
                        </Pie>
                        {legend.enabled && <RechartsLegend />}
                        <Tooltip />
                      </PieChart>
                    ) : type === 'line' ? (
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
                          type="monotone"
                          dataKey="value"
                          stroke={palette[0]}
                          strokeWidth={styleConfig.lineWidth || 2}
                          dot={{ r: styleConfig.markerSize || 4 }}
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
                    ) : (
                      <BarChart data={previewData}>
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
                        <Bar
                          dataKey="value"
                          onDoubleClick={(data: any) => handleBarDoubleClick(data.name)}
                          radius={styleConfig.barRadius ? [styleConfig.barRadius, styleConfig.barRadius, 0, 0] : undefined}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        >
                          {previewData.map((entry, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={categoryConfig[entry.name]?.color || palette[idx % palette.length]}
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
                      onChange={(e) => {
                        setDimension(e.target.value);
                        setWizardStep(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      disabled={wizardStep < 1}
                      style={{ outline: 'none' }}
                    >
                      <option value="">Select...</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Measure</label>
                      <select
                        value={measure}
                        onChange={(e) => {
                          setMeasure(e.target.value as AggregateMethod);
                          setWizardStep(2);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        disabled={wizardStep < 2}
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
                          disabled={wizardStep < 2}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Limit: {limit} items</label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={limit}
                      onChange={(e) => {
                        setLimit(parseInt(e.target.value));
                        setWizardStep(3);
                      }}
                      className="w-full"
                      style={{ outline: 'none' }}
                    />
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
                        {previewData.map((item, idx) => (
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
                            <span className="text-xs text-gray-500 ml-auto">{item.value.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Double-click to change color</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'customize' && (
                <div className="space-y-2">
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
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Marker Size: {styleConfig.markerSize}px</label>
                        <input
                          type="range"
                          min={2}
                          max={10}
                          value={styleConfig.markerSize}
                          onChange={(e) => setStyleConfig({ ...styleConfig, markerSize: parseInt(e.target.value) })}
                          className="w-full"
                          style={{ outline: 'none' }}
                        />
                      </div>
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
                        เปิด Brush/Zoom
                      </label>
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={interaction.enableCrosshair}
                          onChange={(e) => setInteraction({ ...interaction, enableCrosshair: e.target.checked })}
                          className="mr-2"
                        />
                        แสดง Crosshair/Tooltip ชัดขึ้น
                      </label>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Quick ranges (จำนวนจุดข้อมูล)</label>
                        <input
                          type="text"
                          value={(interaction.quickRanges || []).join(', ')}
                          onChange={(e) => setInteraction({ ...interaction, quickRanges: e.target.value.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n)) })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">ตั้งค่าช่วงเลือกเร็ว เช่น 7, 14, 30 จุด</p>
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
