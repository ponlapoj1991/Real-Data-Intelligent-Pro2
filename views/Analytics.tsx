
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Project, DashboardWidget, DashboardFilter, DrillDownState, RawRow } from '../types';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, LabelList, ComposedChart, Legend as RechartsLegend
} from 'recharts';
import { Bot, Loader2, Plus, LayoutGrid, Trash2, Pencil, Filter, X, Presentation, FileOutput, Eye, EyeOff, Table, Download, ChevronRight, MousePointer2 } from 'lucide-react';
import { analyzeProjectData, DataSummary } from '../utils/ai';
import { applyTransformation } from '../utils/transform';
import { saveProject } from '../utils/storage-compat';
import { generatePowerPoint } from '../utils/report';
import { exportToExcel } from '../utils/excel';
import ChartBuilder from '../components/ChartBuilder';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';

interface SavedView {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  createdAt: number;
}

interface AnalyticsProps {
  project: Project;
  onUpdateProject?: (p: Project) => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1', '#84cc16', '#14b8a6'];

// Helper for Sentiment colors
const getSentimentColor = (key: string, index: number) => {
    const lower = key.toLowerCase();
    if (lower.includes('positive') || lower.includes('good') || lower.includes('happy')) return '#10B981'; // Green
    if (lower.includes('negative') || lower.includes('bad') || lower.includes('angry')) return '#EF4444'; // Red
    if (lower.includes('neutral') || lower.includes('average')) return '#9CA3AF'; // Gray
    return COLORS[index % COLORS.length];
};

const getPalette = (widget: DashboardWidget) => {
    if (widget.palette && widget.palette.length > 0) return widget.palette;
    return COLORS;
};

const getWidgetColor = (widget: DashboardWidget, key: string, index: number) => {
    if (widget.seriesColors && widget.seriesColors[key]) return widget.seriesColors[key];
    if (widget.stackBy) return getSentimentColor(key, index);
    const palette = getPalette(widget);
    return palette[index % palette.length] || widget.color || COLORS[0];
};

const formatWidgetValue = (widget: DashboardWidget, val: number) => {
    if (widget.valueFormat === 'percent') return `${(val * 100).toFixed(1)}%`;
    if (widget.valueFormat === 'currency') return new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', maximumFractionDigits: 1 }).format(val);
    if (widget.valueFormat === 'compact') return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
    return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(val);
};

const Analytics: React.FC<AnalyticsProps> = ({ project, onUpdateProject }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Dashboard State
  const [widgets, setWidgets] = useState<DashboardWidget[]>(project.dashboard || []);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  
  // Phase 3 & 5: Filters, Presentation & Interaction Modes
  const [filters, setFilters] = useState<DashboardFilter[]>([]);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'drill' | 'filter'>('filter');
  const [isExporting, setIsExporting] = useState(false);
  const [newFilterCol, setNewFilterCol] = useState('');
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [comparisonLayout, setComparisonLayout] = useState<'balanced' | 'dense'>('balanced');
  const [widgetRanges, setWidgetRanges] = useState<Record<string, { start: number; end: number }>>({});
  
  // Phase 4: Drill Down
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Sync widgets to local state if project changes
  useEffect(() => {
      if (project.dashboard) {
          setWidgets(project.dashboard);
      }
  }, [project.dashboard]);

  useEffect(() => {
    const stored = localStorage.getItem('analytics-saved-views');
    if (stored) {
      try {
        setSavedViews(JSON.parse(stored));
      } catch (e) {
        setSavedViews([]);
      }
    }
  }, []);

  // 1. Prepare Base Data (Raw or Structured)
  const baseData = useMemo(() => {
      if (project.transformRules && project.transformRules.length > 0) {
          return applyTransformation(project.data, project.transformRules);
      }
      return project.data;
  }, [project]);

  const availableColumns = useMemo(() => {
      if (baseData.length === 0) return [];
      return Object.keys(baseData[0]);
  }, [baseData]);

  // 2. Apply Global Filters
  const filteredData = useMemo(() => {
      if (filters.length === 0) return baseData;

      return baseData.filter(row => {
          return filters.every(f => {
              if (!f.value) return true;
              const val = String(row[f.column]);
              return val === f.value;
          });
      });
  }, [baseData, filters]);

  const applyWidgetFilters = (rows: RawRow[], widgetFilters?: DashboardFilter[]) => {
      if (!widgetFilters || widgetFilters.length === 0) return rows;
      return rows.filter(row => widgetFilters.every(f => {
          if (!f.column || f.value === '') return true;
          return String(row[f.column] ?? '') === f.value;
      }));
  };

  // --- Filter Logic ---

  const addFilter = (column: string, value: string = '') => {
      if (!column) return;
      // Check if exists
      const exists = filters.find(f => f.column === column);
      if (exists) {
          if (value) updateFilterValue(exists.id, value);
          return;
      }

      const newFilter: DashboardFilter = {
          id: crypto.randomUUID(),
          column,
          value
      };
      setFilters([...filters, newFilter]);
      setNewFilterCol('');
  };

  const removeFilter = (id: string) => {
      setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilterValue = (id: string, val: string) => {
      setFilters(filters.map(f => f.id === id ? { ...f, value: val } : f));
  };

  const getUniqueValues = (col: string) => {
      const unique = new Set(baseData.map(row => String(row[col] || '')));
      return Array.from(unique).filter(Boolean).sort().slice(0, 100); // Limit dropdown size
  };

  const persistSavedViews = (views: SavedView[]) => {
    setSavedViews(views);
    localStorage.setItem('analytics-saved-views', JSON.stringify(views));
  };

  const handleSaveViewConfig = () => {
    const name = window.prompt('ตั้งชื่อ Saved View');
    if (!name) return;
    const newView: SavedView = {
      id: crypto.randomUUID(),
      name,
      widgets,
      filters,
      createdAt: Date.now(),
    };
    persistSavedViews([...savedViews, newView]);
  };

  const applySavedView = (id: string) => {
    const view = savedViews.find(v => v.id === id);
    if (!view) return;
    setWidgets(view.widgets);
    setFilters(view.filters || []);
  };

  const deleteSavedView = (id: string) => {
    const next = savedViews.filter(v => v.id !== id);
    persistSavedViews(next);
  };

  const updateRange = (widgetId: string, start: number, end: number) => {
    setWidgetRanges(prev => ({ ...prev, [widgetId]: { start, end } }));
  };

  const clearRange = (widgetId: string) => {
    setWidgetRanges(prev => {
      const next = { ...prev };
      delete next[widgetId];
      return next;
    });
  };

  const applyRangeToData = <T,>(widgetId: string, data: T[]) => {
    const range = widgetRanges[widgetId];
    if (!range || data.length === 0) return data;
    const end = Math.min(range.end, data.length - 1);
    const start = Math.max(0, Math.min(range.start, end));
    return data.slice(start, end + 1);
  };

  // --- Dashboard Logic ---

  const handleAddWidget = () => {
      setEditingWidget(null);
      setIsBuilderOpen(true);
  };

  const handleEditWidget = (e: React.MouseEvent, widget: DashboardWidget) => {
      e.stopPropagation(); // Critical: Prevent triggering parent clicks
      setEditingWidget(widget);
      setIsBuilderOpen(true);
  };

  const handleSaveWidget = async (newWidget: DashboardWidget) => {
      let updatedWidgets = [...widgets];
      if (editingWidget) {
          updatedWidgets = updatedWidgets.map(w => w.id === newWidget.id ? newWidget : w);
      } else {
          updatedWidgets.push(newWidget);
      }
      
      setWidgets(updatedWidgets);
      setIsBuilderOpen(false);
      setEditingWidget(null);

      if (onUpdateProject) {
          const updatedProject = { ...project, dashboard: updatedWidgets };
          onUpdateProject(updatedProject);
          await saveProject(updatedProject);
      }
  };

  const handleDeleteWidget = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Critical: Prevent triggering parent clicks
      if(!window.confirm("Remove this chart?")) return;
      
      const updatedWidgets = widgets.filter(w => w.id !== id);
      setWidgets(updatedWidgets);
      
      if (onUpdateProject) {
          const updatedProject = { ...project, dashboard: updatedWidgets };
          onUpdateProject(updatedProject);
          await saveProject(updatedProject);
      }
  };

  const handleExportPPT = async () => {
      if (!dashboardRef.current) return;
      setIsExporting(true);
      setTimeout(async () => {
          const filterStr = filters.map(f => `${f.column}=${f.value}`).join(', ');
          await generatePowerPoint(project, dashboardRef.current!, filterStr);
          setIsExporting(false);
      }, 100);
  };

  // --- Interaction Handler (Drill vs Filter) ---
  const handleChartClick = (e: any, widget: DashboardWidget, activeLabel?: string) => {
      // Stop propagation to prevent double firing or bubbling
      if (e && e.stopPropagation) e.stopPropagation();
      if (!activeLabel) return;
      
      // Special handling for Stacked Bar: activeLabel might be the stack key (e.g. 'Positive') or the category (e.g. 'Facebook')
      // Recharts click event provides 'activeLabel' as the X-axis value (Category).
      // If clicked on a specific stack, we might get data from `e`.
      
      const filterColumn = widget.dimension;
      const filterValue = activeLabel; // This is typically the X-axis value

      if (interactionMode === 'filter') {
          // Add/Update global filter
          addFilter(filterColumn, filterValue);
      } else {
          // Drill Down Logic
          const clickedData = filteredData.filter(row => {
             // Simple check, might need refinement for array values
             return String(row[filterColumn]).includes(filterValue);
          });

          setDrillDown({
              isOpen: true,
              title: `${widget.title} - ${filterValue}`,
              filterCol: filterColumn,
              filterVal: filterValue,
              data: clickedData
          });
      }
  };

  // --- Data Processing for Widgets ---

  const processWidgetData = (widget: DashboardWidget) => {
      const widgetData = applyWidgetFilters(filteredData, widget.filters);
      // 1. TABLE WIDGET
      if (widget.type === 'table') {
          let processed = [...widgetData];
          if (widget.measureCol) {
              processed.sort((a, b) => {
                   const valA = a[widget.measureCol!];
                   const valB = b[widget.measureCol!];
                   if (typeof valA === 'number' && typeof valB === 'number') return valB - valA;
                   return String(valB).localeCompare(String(valA));
              });
          }
          return { data: processed.slice(0, widget.limit || 20), isStack: false };
      }

      // 2. BAR CHART LOGIC
      if (widget.type === 'bar' && widget.stackBy) {
          const barMode = widget.barMode || 'stacked';
          const isPercentMode = barMode === 'percent';
          const stackKeys = new Set<string>();
          const groups: Record<string, Record<string, number>> = {};

          widgetData.forEach(row => {
              const dimVal = String(row[widget.dimension] || '(Empty)');
              const stackVal = String(row[widget.stackBy!] || '(Other)');
              
              stackKeys.add(stackVal);
              
              if (!groups[dimVal]) groups[dimVal] = {};
              if (!groups[dimVal][stackVal]) groups[dimVal][stackVal] = 0;

              if (widget.measure === 'count') {
                  groups[dimVal][stackVal]++;
              } else {
                  groups[dimVal][stackVal] += Number(row[widget.measureCol || '']) || 0;
              }
          });

          const result = Object.keys(groups).map(dim => {
              const row: any = { name: dim };
              let total = 0;
              Object.keys(groups[dim]).forEach(stack => {
                  row[stack] = groups[dim][stack];
                  total += groups[dim][stack];
              });
              row.total = total;
              return row;
          });

          // Sort by total desc
          result.sort((a, b) => b.total - a.total);

          const normalized = isPercentMode
            ? result.map(row => {
                const total = row.total || 0;
                const next = { ...row } as Record<string, number | string>;
                if (total > 0) {
                  Array.from(stackKeys).forEach(key => {
                    const val = (row as any)[key] || 0;
                    next[key] = (val / total) * 100;
                  });
                  next.total = 100;
                }
                return next;
            })
            : result;

          return {
              data: widget.limit ? normalized.slice(0, widget.limit) : normalized,
              isStack: barMode !== 'grouped',
              stackKeys: Array.from(stackKeys).sort()
          };
      }
      
      // 3. STANDARD CHARTS
      const groups: Record<string, number> = {};
      
      widgetData.forEach(row => {
          let groupKey = String(row[widget.dimension]);
          if (row[widget.dimension] === null || row[widget.dimension] === undefined) groupKey = "(Empty)";

          // Handle Array values: explode them for count
          let keysToProcess = [groupKey];
          if (groupKey.startsWith('[') || groupKey.includes(',')) {
             try {
                if (groupKey.startsWith('[')) {
                     const parsed = JSON.parse(groupKey.replace(/'/g, '"'));
                     if (Array.isArray(parsed)) keysToProcess = parsed.map(String);
                } else {
                     keysToProcess = groupKey.split(',').map(s => s.trim());
                }
             } catch(e) {}
          }

          keysToProcess.forEach(k => {
              if (!k) return;
              if (!groups[k]) groups[k] = 0;
              
              if (widget.measure === 'count' || widget.type === 'wordcloud') {
                  groups[k]++;
              } else {
                  const val = Number(row[widget.measureCol || '']) || 0;
                  groups[k] += val;
              }
          });
      });

      let result = Object.keys(groups).map(k => ({
          name: k,
          value: widget.measure === 'avg'
            ? (groups[k] / widgetData.filter(r => String(r[widget.dimension]).includes(k)).length)
            : groups[k]
      }));

      result.sort((a, b) => b.value - a.value);

      if (widget.barMode === 'percent') {
          const total = result.reduce((acc, curr) => acc + (curr.value || 0), 0);
          if (total > 0) {
              result = result.map(item => ({ ...item, value: (item.value / total) * 100 }));
          }
      }
      
      const limit = widget.limit || 20;

      if (result.length > limit) {
          if (widget.type === 'wordcloud') {
               result = result.slice(0, limit); 
          } else {
               const others = result.slice(limit).reduce((acc, curr) => acc + curr.value, 0);
               result = result.slice(0, limit);
               result.push({ name: 'Others', value: others });
          }
      }

      return { data: result, isStack: false };
  };

  // --- Multi-Series Data Processing (Google Sheets Style) ---
  const processMultiSeriesData = (widget: DashboardWidget) => {
    if (!widget.series || widget.series.length === 0 || !widget.dimension) {
      return [];
    }

    const result: Record<string, any> = {};

    // For each series
    widget.series.forEach(s => {
      // Apply widget-level filters first
      let data = applyWidgetFilters(filteredData, widget.filters);

      // Then apply series-specific filters
      if (s.filters && s.filters.length > 0) {
        data = data.filter(row =>
          s.filters!.every(f => String(row[f.column]).toLowerCase() === f.value.toLowerCase())
        );
      }

      // Aggregate
      data.forEach(row => {
        const dimValue = String(row[widget.dimension] || 'N/A');

        if (!result[dimValue]) {
          result[dimValue] = { [widget.dimension]: dimValue };
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
      widget.series!.forEach(s => {
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
        const aVal = widget.series!.reduce((sum, s) => sum + (a[s.id] || 0), 0);
        const bVal = widget.series!.reduce((sum, s) => sum + (b[s.id] || 0), 0);
        return bVal - aVal;
      })
      .slice(0, widget.limit || 20);

    return sorted;
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
        const summary: DataSummary = {
            totalRows: filteredData.length,
            projectName: project.name,
            channelDistribution: {},
            sentimentDistribution: {},
            topTags: []
        };
        // Pass AI Settings
        const result = await analyzeProjectData(summary, project.aiSettings);
        setAiAnalysis(result);
    } catch (e) {
        setAiAnalysis("Analysis unavailable at this moment. Check Settings.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
      try {
        // Validation: Ensure widget has required fields
        if (!widget.dimension && widget.type !== 'kpi') {
          return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Invalid widget: Missing dimension</div>;
        }

        // NEW: Multi-Series Chart Rendering (Google Sheets Style)
      if (widget.series && widget.series.length > 0 && widget.type !== 'pie' && widget.type !== 'kpi' && widget.type !== 'wordcloud' && widget.type !== 'table') {
        const rawData = processMultiSeriesData(widget);
        const data = applyRangeToData(widget.id, rawData);
        if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">No Data</div>;

        const hasRightAxis = widget.series.some(s => s.yAxis === 'right');
        const legendConfig = widget.legend || { enabled: true, position: 'bottom', fontSize: 11, fontColor: '#666666', alignment: 'center' };
        const xAxisConfig = widget.xAxis || { fontSize: 11, fontColor: '#666666', slant: 0, showGridlines: true };
        const leftYAxisConfig = widget.leftYAxis || { fontSize: 11, fontColor: '#666666', min: 'auto', max: 'auto', format: '#,##0', showGridlines: true };
        const rightYAxisConfig = widget.rightYAxis || { fontSize: 11, fontColor: '#666666', min: 'auto', max: 'auto', format: '#,##0', showGridlines: false };
        const dataLabelsConfig = widget.dataLabels || { enabled: false, position: 'top', fontSize: 11, fontWeight: 'normal', color: '#000000' };
        const quickRanges = widget.interaction?.quickRanges || [];

        return (
          <div className="h-full flex flex-col">
            {/* Chart Title */}
            {widget.chartTitle && (
              <div className="text-center mb-2">
                <h3 className="text-base font-bold text-gray-900">{widget.chartTitle}</h3>
                {widget.subtitle && <p className="text-xs text-gray-600">{widget.subtitle}</p>}
              </div>
            )}

            {quickRanges.length > 0 && (
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-600 flex-wrap">
                <span>ช่วงเร็ว:</span>
                {quickRanges.map(rangeVal => (
                  <button
                    key={rangeVal}
                    onClick={() => updateRange(widget.id, Math.max(0, rawData.length - rangeVal), rawData.length - 1)}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    ล่าสุด {rangeVal}
                  </button>
                ))}
                <button
                  onClick={() => clearRange(widget.id)}
                  className="px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
                >
                  ทั้งหมด
                </button>
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey={widget.dimension}
                  angle={xAxisConfig.slant || 0}
                  textAnchor={xAxisConfig.slant ? 'end' : 'middle'}
                  height={xAxisConfig.slant === 90 ? 100 : xAxisConfig.slant === 45 ? 80 : 60}
                  tick={{ fontSize: xAxisConfig.fontSize, fill: xAxisConfig.fontColor }}
                  label={xAxisConfig.title ? { value: xAxisConfig.title, position: 'insideBottom', offset: -5 } : undefined}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: leftYAxisConfig.fontSize, fill: leftYAxisConfig.fontColor }}
                  label={leftYAxisConfig.title ? { value: leftYAxisConfig.title, angle: -90, position: 'insideLeft' } : undefined}
                  domain={[
                    leftYAxisConfig.min === 'auto' ? 'auto' : leftYAxisConfig.min,
                    leftYAxisConfig.max === 'auto' ? 'auto' : leftYAxisConfig.max
                  ]}
                />
                {hasRightAxis && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: rightYAxisConfig.fontSize, fill: rightYAxisConfig.fontColor }}
                    label={rightYAxisConfig.title ? { value: rightYAxisConfig.title, angle: 90, position: 'insideRight' } : undefined}
                    domain={[
                      rightYAxisConfig.min === 'auto' ? 'auto' : rightYAxisConfig.min,
                      rightYAxisConfig.max === 'auto' ? 'auto' : rightYAxisConfig.max
                    ]}
                  />
                )}
                <Tooltip cursor={widget.interaction?.enableCrosshair ? { stroke: '#94a3b8', strokeWidth: 1 } : undefined} />
                {legendConfig.enabled && (
                  <RechartsLegend
                    wrapperStyle={{ fontSize: legendConfig.fontSize }}
                    verticalAlign={legendConfig.position === 'top' || legendConfig.position === 'bottom' ? legendConfig.position : 'bottom'}
                    align={legendConfig.alignment || 'center'}
                  />
                )}

                {widget.series.map((s, idx) => {
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
                        strokeWidth={s.type === 'line' ? (widget.style?.lineWidth || 2) : 0}
                        radius={widget.style?.barRadius ? [widget.style.barRadius, widget.style.barRadius, 0, 0] : undefined}
                      onClick={(barData: any) => handleChartClick(null, widget, barData[widget.dimension])}
                      className="cursor-pointer"
                    >
                      {dataLabelsConfig.enabled && (
                        <LabelList
                          dataKey={s.id}
                          position={dataLabelsConfig.position as any}
                          style={{
                            fontSize: dataLabelsConfig.fontSize,
                            fontWeight: dataLabelsConfig.fontWeight,
                            fill: dataLabelsConfig.color
                          }}
                        />
                      )}
                    </Component>
                  );
                })}
                {widget.interaction?.enableBrush && (
                  <Brush
                    dataKey={widget.dimension}
                    height={24}
                    travellerWidth={10}
                    stroke="#cbd5e1"
                    onChange={(range) => {
                      if (range?.startIndex !== undefined && range?.endIndex !== undefined) {
                        updateRange(widget.id, range.startIndex, range.endIndex);
                      }
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );
      }

      // LEGACY: Single-series chart rendering
      const { data, isStack, stackKeys } = processWidgetData(widget);
      const palette = getPalette(widget);
      const showLegend = widget.showLegend !== false;
      const showValues = widget.showValues !== false;
      const isPercentMode = widget.barMode === 'percent';
      const formatTick = (val: number) => isPercentMode ? `${val.toFixed(1)}%` : formatWidgetValue(widget, val);
      const labelFormatter = (val: number) => isPercentMode ? `${val.toFixed(1)}%` : formatWidgetValue(widget, Number(val) || 0);

      if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">No Data</div>;

      switch (widget.type) {
          case 'bar':
              const isHorizontal = (widget.barOrientation || 'horizontal') === 'horizontal';
              const layout = isHorizontal ? 'vertical' : 'horizontal';
              const legendConfig = {
                  top: { verticalAlign: 'top' as const, align: 'center' as const },
                  bottom: { verticalAlign: 'bottom' as const, align: 'center' as const },
                  left: { verticalAlign: 'middle' as const, align: 'left' as const, layout: 'vertical' as const },
                  right: { verticalAlign: 'middle' as const, align: 'right' as const, layout: 'vertical' as const },
              };
              const legendPlacement = legendConfig[widget.legendPosition || 'bottom'];
              return (
                  <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data as any[]}
                            layout={layout}
                            margin={{ left: 20, right: 20 }}
                          >
                              {widget.showGrid !== false && (
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    horizontal={!isHorizontal}
                                    vertical={isHorizontal}
                                    stroke="#f3f4f6"
                                />
                              )}
                          {isHorizontal ? (
                            <>
                              <XAxis type="number" tickFormatter={formatTick} />
                              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} interval={0} />
                            </>
                          ) : (
                            <>
                              <XAxis dataKey="name" type="category" tick={{fontSize: 11}} interval={0} />
                              <YAxis type="number" tickFormatter={formatTick} width={80} />
                            </>
                          )}
                          <Tooltip contentStyle={{borderRadius: '8px'}} cursor={{fill: '#f3f4f6'}} formatter={(val: any, name: any) => [labelFormatter(Number(val) || 0), name]} />
                          {showLegend && <Legend {...legendPlacement} iconType="circle" wrapperStyle={{fontSize: '11px'}} />}

                          {stackKeys && stackKeys.length ? (
                              stackKeys.map((key, idx) => (
                                  <Bar
                                    key={key}
                                    dataKey={key}
                                    stackId={isStack ? 'a' : undefined}
                                    fill={getWidgetColor(widget, key, idx)}
                                    radius={isHorizontal ? [0,0,0,0] : [4,4,0,0]}
                                    barSize={22}
                                    onClick={(barData: any, index: number, e: any) => handleChartClick(e, widget, barData.name)}
                                    className="cursor-pointer"
                                  >
                                      {showValues && <LabelList dataKey={key} position={isHorizontal ? 'right' : 'top'} formatter={labelFormatter} />}
                                  </Bar>
                              ))
                          ) : (
                                <Bar
                                    dataKey="value"
                                    fill={widget.color || palette[0] || '#3B82F6'}
                                    radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                                    barSize={22}
                                    className="cursor-pointer"
                                    onClick={(barData: any, index: number, e: any) => handleChartClick(e, widget, barData.name)}
                                >
                                    {(data as any[]).map((entry, idx) => (
                                        <Cell key={entry.name} fill={getWidgetColor(widget, entry.name, idx)} />
                                    ))}
                                    {showValues && <LabelList dataKey="value" position={isHorizontal ? 'right' : 'top'} formatter={labelFormatter} />}
                                </Bar>
                          )}
                      </BarChart>
                  </ResponsiveContainer>
              );
          case 'pie':
              return (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={data as any[]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              className="cursor-pointer outline-none"
                              onClick={(data, index, e) => handleChartClick(e, widget, data.name)}
                              label={showValues ? ({ name, value }) => `${name}: ${formatWidgetValue(widget, Number(value) || 0)}` : false}
                              labelLine={showValues}
                          >
                              {(data as any[]).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={getWidgetColor(widget, entry.name, index)} />
                              ))}
                          </Pie>
                          <Tooltip contentStyle={{borderRadius: '8px'}} />
                          {showLegend && <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />}
                      </PieChart>
                  </ResponsiveContainer>
              );
          case 'line':
          case 'area':
               const sortedData = [...(data as any[])].sort((a,b) => a.name.localeCompare(b.name));
               const rangedData = applyRangeToData(widget.id, sortedData);
               const quickRanges = widget.interaction?.quickRanges || [];
                const ChartComp = widget.type === 'line' ? LineChart : AreaChart;
                const DataComp = widget.type === 'line' ? Line : Area;
                const primaryColor = widget.color || palette[0] || '#3B82F6';
                return (
                  <div className="h-full flex flex-col">
                    {quickRanges.length > 0 && (
                      <div className="flex items-center gap-2 mb-2 text-xs text-gray-600 flex-wrap">
                        <span>ช่วงเร็ว:</span>
                        {quickRanges.map(rangeVal => (
                          <button
                            key={rangeVal}
                            onClick={() => updateRange(widget.id, Math.max(0, sortedData.length - rangeVal), sortedData.length - 1)}
                            className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            ล่าสุด {rangeVal}
                          </button>
                        ))}
                        <button
                          onClick={() => clearRange(widget.id)}
                          className="px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
                        >
                          ทั้งหมด
                        </button>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                        <ChartComp
                        data={rangedData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        onClick={(e) => e && e.activeLabel && handleChartClick(null, widget, e.activeLabel)}
                      >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="name" tick={{fontSize: 11}} />
                          <YAxis tick={{fontSize: 11}} tickFormatter={(val) => formatWidgetValue(widget, Number(val) || 0)} />
                          <Tooltip contentStyle={{borderRadius: '8px'}} cursor={widget.interaction?.enableCrosshair ? { stroke: '#94a3b8', strokeWidth: 1 } : undefined} />
                          <DataComp
                            type="monotone"
                            dataKey="value"
                            stroke={primaryColor}
                            fill={primaryColor}
                            fillOpacity={0.2}
                            strokeWidth={widget.style?.lineWidth || 2}
                            dot={{r: widget.style?.markerSize || 4}}
                            activeDot={{r: (widget.style?.markerSize || 4) + 2}}
                            className="cursor-pointer"
                          >
                              {showValues && <LabelList dataKey="value" position="top" formatter={(val: number) => formatWidgetValue(widget, Number(val) || 0)} />}
                          </DataComp>
                          {widget.interaction?.enableBrush && (
                            <Brush
                              dataKey="name"
                              height={22}
                              travellerWidth={10}
                              stroke="#cbd5e1"
                              onChange={(range) => {
                                if (range?.startIndex !== undefined && range?.endIndex !== undefined) {
                                  updateRange(widget.id, range.startIndex, range.endIndex);
                                }
                              }}
                            />
                          )}
                          {showLegend && <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />}
                      </ChartComp>
                   </ResponsiveContainer>
                  </div>
                );
           case 'kpi':
               const total = (data as any[]).reduce((acc, curr) => acc + curr.value, 0);
               const formattedTotal = formatWidgetValue(widget, total);
               return (
                   <div className="flex flex-col items-center justify-center h-full pb-4">
                       <span className="text-4xl font-bold text-blue-600">{formattedTotal}</span>
                       <span className="text-gray-400 text-sm mt-2">
                          {widget.dimension ? `${widget.measure} of ${widget.dimension}` : `Total ${widget.measure === 'count' ? 'Rows' : 'Value'}`}
                       </span>
                   </div>
               );
           case 'wordcloud':
               // Use reduce to avoid stack overflow on large arrays
               const maxVal = (data as any[]).reduce((max, item) => (item.value > max ? item.value : max), 0);
               
               return (
                   <div className="flex flex-wrap content-center justify-center items-center h-full overflow-hidden p-2 gap-2">
                       {(data as any[]).map((item, idx) => {
                           // Avoid division by zero
                           const safeMax = maxVal > 0 ? maxVal : 1;
                           const size = Math.max(12, Math.min(32, 12 + (item.value / safeMax) * 20));
                           const opacity = 0.6 + (item.value / safeMax) * 0.4;
                           
                           return (
                               <span 
                                   key={idx} 
                                   onClick={(e) => handleChartClick(e, widget, item.name)}
                                   className="cursor-pointer hover:scale-110 transition-transform px-1 leading-none select-none"
                                   style={{ 
                                       fontSize: `${size}px`, 
                                       color: COLORS[idx % COLORS.length],
                                       opacity 
                                   }}
                                   title={`${item.name}: ${item.value}`}
                               >
                                   {item.name}
                               </span>
                           );
                       })}
                   </div>
               );
           case 'table':
               return (
                   <div className="h-full overflow-auto w-full relative">
                       <table className="w-full text-left text-sm">
                           <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0 z-10">
                               <tr>
                                   <th className="px-4 py-2">{widget.dimension}</th>
                                   {widget.measureCol && <th className="px-4 py-2 text-right">{widget.measureCol}</th>}
                                   <th className="px-4 py-2 text-right">...</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                               {(data as RawRow[]).map((row, idx) => (
                                   <tr key={idx} className="hover:bg-gray-50 text-gray-700">
                                       <td className="px-4 py-2 truncate max-w-[150px] font-medium" title={String(row[widget.dimension])}>
                                           {String(row[widget.dimension])}
                                       </td>
                                       {widget.measureCol && (
                                           <td className="px-4 py-2 text-right text-gray-500">
                                               {String(row[widget.measureCol])}
                                           </td>
                                       )}
                                       <td className="px-4 py-2 text-right">
                                           <button onClick={(e) => {
                                               e.stopPropagation();
                                               setDrillDown({
                                                   isOpen: true, 
                                                   title: 'Record Details', 
                                                   filterCol: 'ID', 
                                                   filterVal: String(idx), 
                                                   data: [row]
                                               });
                                           }} className="text-blue-500 hover:underline text-xs">View</button>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               );
          default:
              return null;
      }
    } catch (error) {
      console.error('Error rendering widget:', widget.id, error);
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-500 text-sm p-4">
          <p className="font-bold mb-2">Error rendering chart</p>
          <p className="text-xs text-gray-600 mb-4">{widget.title}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('This chart has errors. Delete it?')) {
                handleDeleteWidget(e, widget.id);
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            Delete Chart
          </button>
        </div>
      );
    }
  };

  if (baseData.length === 0) {
      return (
        <div className="p-12">
            <EmptyState
                icon={Table}
                title="Data is not ready"
                description="Please go to Data Prep and structure your data before creating analytics."
            />
        </div>
      );
  }

  const gridColumns = comparisonLayout === 'dense' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2';

  return (
    <div className="p-8 bg-[#F8F9FA] min-h-full overflow-y-auto flex flex-col">
      
      {/* Top Controls */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                Analytics Dashboard
                {isPresentationMode && <span className="ml-3 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium flex items-center"><Presentation className="w-3 h-3 mr-1"/> Live Mode</span>}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
                {filteredData.length} rows matching filters
            </p>
        </div>

        <div className="flex flex-wrap gap-3">
            
            {/* Interaction Toggle */}
            <div className="bg-white border border-gray-300 rounded-lg flex p-1 shadow-sm">
                <button 
                    onClick={() => setInteractionMode('filter')}
                    className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-all ${interactionMode === 'filter' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Click charts to filter dashboard"
                >
                    <Filter className="w-3.5 h-3.5 mr-2" />
                    Filter
                </button>
                <button 
                    onClick={() => setInteractionMode('drill')}
                    className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-all ${interactionMode === 'drill' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Click charts to see data rows"
                >
                    <MousePointer2 className="w-3.5 h-3.5 mr-2" />
                    Drill
                </button>
            </div>

            <div className="h-9 w-px bg-gray-300 mx-1 self-center hidden md:block"></div>

            {!isPresentationMode && (
                <>
                    <button onClick={handleAddWidget} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">Add Chart</span>
                    </button>
                </>
            )}
            
            <button 
                onClick={() => setIsPresentationMode(!isPresentationMode)}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm ${isPresentationMode ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
                {isPresentationMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden md:inline">{isPresentationMode ? 'Edit' : 'Present'}</span>
            </button>
            
            <button 
                onClick={handleExportPPT}
                disabled={isExporting}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-orange-200 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-50 transition-colors shadow-sm"
            >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileOutput className="w-4 h-4" />}
                <span className="hidden md:inline">PPTX</span>
            </button>
        </div>
      </div>

      {!isPresentationMode && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900">Saved Views & Layout</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                onChange={(e) => e.target.value && applySavedView(e.target.value)}
                defaultValue=""
              >
                <option value="">เลือก Saved View</option>
                {savedViews.map(view => (
                  <option key={view.id} value={view.id}>{view.name}</option>
                ))}
              </select>
              <button
                onClick={handleSaveViewConfig}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                บันทึกมุมมอง
              </button>
              {savedViews.length > 0 && (
                <button
                  onClick={() => {
                    const id = window.prompt('ลบ Saved View ชื่อไหน? (ใส่ชื่อให้ตรง)');
                    const target = savedViews.find(v => v.name === id);
                    if (target) deleteSavedView(target.id);
                  }}
                  className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                >
                  ลบ Saved View
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-500">Layout</span>
              <button
                onClick={() => setComparisonLayout('balanced')}
                className={`px-3 py-1.5 border rounded-lg text-sm ${comparisonLayout === 'balanced' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                สองคอลัมน์
              </button>
              <button
                onClick={() => setComparisonLayout('dense')}
                className={`px-3 py-1.5 border rounded-lg text-sm ${comparisonLayout === 'dense' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                เปรียบเทียบหลายกราฟ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI INSIGHTS (Optional) */}
      {!isPresentationMode && (
         <div className="mb-8">
             <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full md:w-auto px-6 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-sm font-medium flex items-center justify-center transition-all group shadow-sm"
             >
                {isAnalyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing...</>
                ) : (
                    <><Bot className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" /> Get AI Executive Summary</>
                )}
             </button>
         </div>
      )}

      {/* Global Filter Bar */}
      {(filters.length > 0 || !isPresentationMode) && (
      <div className={`bg-white border border-gray-200 rounded-xl p-4 mb-8 shadow-sm transition-all ${isPresentationMode ? 'opacity-80 hover:opacity-100' : ''}`}>
          <div className="flex items-center space-x-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-bold text-gray-700">Global Filters</span>
              <span className="text-xs text-gray-400">(Applies to all charts)</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
              {filters.map(filter => (
                  <div key={filter.id} className="flex items-center bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 animate-in fade-in zoom-in duration-200">
                      <span className="text-xs font-bold text-blue-800 mr-2">{filter.column}:</span>
                      <select 
                          className="bg-transparent text-sm text-blue-900 border-none focus:ring-0 p-0 pr-6 cursor-pointer font-medium"
                          value={filter.value || ''}
                          onChange={(e) => updateFilterValue(filter.id, e.target.value)}
                      >
                          <option value="">All</option>
                          {getUniqueValues(filter.column).map(val => (
                              <option key={val} value={val}>{val}</option>
                          ))}
                      </select>
                      
                      <button onClick={() => removeFilter(filter.id)} className="ml-2 text-blue-400 hover:text-blue-600">
                            <X className="w-3 h-3" />
                      </button>
                  </div>
              ))}

              {!isPresentationMode && (
                  <div className="flex items-center">
                    <select 
                        className="text-sm border border-gray-300 rounded-l-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={newFilterCol}
                        onChange={(e) => setNewFilterCol(e.target.value)}
                    >
                        <option value="">+ Add Filter</option>
                        {availableColumns.filter(c => !filters.find(f => f.column === c)).map(col => (
                            <option key={col} value={col}>{col}</option>
                        ))}
                    </select>
                    <button 
                        disabled={!newFilterCol}
                        onClick={() => addFilter(newFilterCol)}
                        className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg px-3 py-1.5 hover:bg-gray-200 disabled:opacity-50 text-sm"
                    >
                        Add
                    </button>
                  </div>
              )}
          </div>
      </div>
      )}

      {/* AI Section (Insight Report) */}
      {(aiAnalysis || isAnalyzing) && (
         <div className="bg-white border border-blue-100 rounded-xl p-6 mb-8 shadow-sm animate-in fade-in relative">
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center text-blue-700 font-semibold">
                    <Bot className="w-5 h-5 mr-2" /> AI Executive Summary
                </div>
                {aiAnalysis && <button onClick={() => setAiAnalysis(null)} className="text-gray-400 hover:text-gray-600"><Trash2 className="w-4 h-4" /></button>}
             </div>
             <div className="prose prose-sm max-w-none text-gray-700">
                 {isAnalyzing ? (
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/6" />
                    </div>
                 ) : (
                    aiAnalysis
                 )}
             </div>
         </div>
      )}

      {/* Dashboard Grid */}
      <div ref={dashboardRef} className={`grid ${gridColumns} gap-6 pb-10`}>
          {widgets.map((widget) => (
              <div 
                key={widget.id} 
                className={`report-widget bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col ${widget.width === 'full' ? 'lg:col-span-2' : ''} transition-all hover:shadow-md group relative`}
                style={{ minHeight: '320px' }}
              >
                  {/* Widget Header */}
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="widget-title font-bold text-gray-800">{widget.title}</h3>
                          <p className="widget-meta text-xs text-gray-400 mt-0.5 capitalize">
                            {widget.type === 'wordcloud' ? 'Word Cloud' : `${widget.dimension} ${widget.stackBy ? `by ${widget.stackBy}` : ''} • ${widget.measure}`}
                          </p>
                      </div>
                      {!isPresentationMode && (
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity no-print z-20 bg-white pl-2">
                            <button 
                                onClick={(e) => handleEditWidget(e, widget)} 
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={(e) => handleDeleteWidget(e, widget.id)} 
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                      )}
                  </div>

                  {/* Chart Body */}
                  <div className="flex-1 w-full h-full min-h-0 relative z-10">
                      {renderWidget(widget)}
                  </div>
                  
                  {/* Hint for interactivity */}
                  {!isPresentationMode && widget.type !== 'kpi' && widget.type !== 'table' && (
                      <div className="absolute bottom-2 right-4 text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 pointer-events-none flex items-center">
                          <MousePointer2 className="w-3 h-3 mr-1" />
                          {interactionMode === 'filter' ? 'Filter' : 'Drill'}
                      </div>
                  )}
              </div>
          ))}
          
          {!isPresentationMode && widgets.length === 0 && (
              <div className="col-span-full">
                  <EmptyState
                    icon={LayoutGrid}
                    title="Your dashboard is empty"
                    description="Click 'Add Chart' to create your first visualization."
                    actionLabel="Add Chart"
                    onAction={handleAddWidget}
                  />
              </div>
          )}
      </div>

      <ChartBuilder 
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={handleSaveWidget}
        availableColumns={availableColumns}
        initialWidget={editingWidget}
        data={filteredData}
      />

      {/* Drill Down Modal */}
      {drillDown && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-5xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 flex items-center">
                            Drill Down: {drillDown.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                            Filtered by <span className="font-semibold">{drillDown.filterCol} = {drillDown.filterVal}</span> ({drillDown.data.length} rows)
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                            onClick={() => exportToExcel(drillDown.data, `DrillDown_${drillDown.title}`)}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                        >
                            <Download className="w-4 h-4" /> <span>Export Excel</span>
                        </button>
                        <button onClick={() => setDrillDown(null)} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded">
                            <X className="w-5 h-5" />
                        </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-0">
                      <table className="w-full text-left text-sm border-collapse">
                           <thead className="bg-white text-gray-500 text-xs uppercase sticky top-0 z-10 shadow-sm">
                               <tr>
                                   <th className="px-6 py-3 border-b border-gray-200 w-12">#</th>
                                   {availableColumns.map(col => (
                                       <th key={col} className="px-6 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">{col}</th>
                                   ))}
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                               {drillDown.data.slice(0, 200).map((row, idx) => (
                                   <tr key={idx} className="hover:bg-blue-50">
                                       <td className="px-6 py-3 text-gray-400 font-mono text-xs bg-gray-50/50">{idx + 1}</td>
                                       {availableColumns.map(col => (
                                           <td key={col} className="px-6 py-3 text-gray-700 truncate max-w-xs" title={String(row[col])}>
                                               {String(row[col])}
                                           </td>
                                       ))}
                                   </tr>
                               ))}
                           </tbody>
                      </table>
                      {drillDown.data.length > 200 && (
                          <div className="p-4 text-center text-gray-500 text-sm bg-gray-50 border-t">
                              Showing first 200 rows. Export to see all {drillDown.data.length} rows.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Analytics;
