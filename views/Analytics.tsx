
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Project, DashboardWidget, DashboardFilter, DrillDownState, RawRow } from '../types';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, LabelList, ComposedChart, Legend as RechartsLegend, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Bot, Loader2, Plus, LayoutGrid, Trash2, Pencil, Filter, X, Presentation, FileOutput, Eye, EyeOff, Table, Download, ChevronRight, MousePointer2 } from 'lucide-react';
import { analyzeProjectData, DataSummary } from '../utils/ai';
import { applyTransformation } from '../utils/transform';
import { saveProject } from '../utils/storage-compat';
import { generatePowerPoint } from '../utils/report';
import { exportToExcel } from '../utils/excel';
import { isStackedChart, is100StackedChart, isHorizontalChart, isPieChart, isAreaChart, isLineChart, isMultiSeriesChart } from '../utils/chartConfigHelpers';
import ChartBuilder from '../components/ChartBuilder';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';

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
  
  // Phase 4: Drill Down
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Sync widgets to local state if project changes
  useEffect(() => {
      if (project.dashboard) {
          setWidgets(project.dashboard);
      }
  }, [project.dashboard]);

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

  // Sorting helper function (same as ChartBuilder)
  const applySorting = (data: any[], order: string | undefined, valueKey: string) => {
    const sortBy = order || 'value-desc';
    switch (sortBy) {
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
        return data; // No sorting for timeline/date charts
    }
  };

  const processWidgetData = (widget: DashboardWidget) => {
      const widgetData = applyWidgetFilters(filteredData, widget.filters);
      const measure = widget.measure || 'count';
      const passCategory = (dim: string) => {
        if (!widget.categoryFilter || widget.categoryFilter.length === 0) return true;
        return widget.categoryFilter.includes(dim);
      };

      // 1) Table widget
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

      // 2) Scatter / Bubble
      if ((widget.type === 'scatter' || widget.type === 'bubble') && widget.xDimension && widget.yDimension) {
        const rows = widgetData
          .map(row => {
            const xVal = Number(row[widget.xDimension!]);
            const yVal = Number(row[widget.yDimension!]);
            if (Number.isNaN(xVal) || Number.isNaN(yVal)) return null;
            const sizeVal = widget.sizeDimension ? Number(row[widget.sizeDimension]) : undefined;
            const colorVal = widget.colorBy ? String(row[widget.colorBy]) : undefined;
            const nameVal = widget.dimension ? String(row[widget.dimension] || 'N/A') : undefined;
            return { x: xVal, y: yVal, z: sizeVal, name: nameVal, colorKey: colorVal };
          })
          .filter(Boolean) as any[];
        return { data: rows, isStack: false };
      }

      // 3) Multi-series (Combo)
      if (isMultiSeriesChart(widget.type) && widget.series && widget.series.length > 0 && widget.dimension) {
        const groups: Record<string, any> = {};

        widget.series.forEach(s => {
          let rows = widgetData;
          if (s.filters && s.filters.length > 0) {
            rows = applyWidgetFilters(rows, s.filters);
          }

          rows.forEach(row => {
            const dimValue = String(row[widget.dimension!] || 'N/A');
            if (!passCategory(dimValue)) return;
            if (!groups[dimValue]) groups[dimValue] = { [widget.dimension!]: dimValue };

            if (s.measure === 'count') {
              groups[dimValue][s.id] = (groups[dimValue][s.id] || 0) + 1;
            } else if (s.measure === 'sum' && s.measureCol) {
              const val = parseFloat(String(row[s.measureCol])) || 0;
              groups[dimValue][s.id] = (groups[dimValue][s.id] || 0) + val;
            } else if (s.measure === 'avg' && s.measureCol) {
              const sumKey = `${s.id}_sum`;
              const countKey = `${s.id}_count`;
              if (!groups[dimValue][sumKey]) {
                groups[dimValue][sumKey] = 0;
                groups[dimValue][countKey] = 0;
              }
              const val = parseFloat(String(row[s.measureCol])) || 0;
              groups[dimValue][sumKey] += val;
              groups[dimValue][countKey] += 1;
            }
          });
        });

        Object.values(groups).forEach(item => {
          widget.series!.forEach(s => {
            if (s.measure === 'avg') {
              const count = item[`${s.id}_count`] || 0;
              item[s.id] = count > 0 ? item[`${s.id}_sum`] / count : 0;
              delete item[`${s.id}_sum`];
              delete item[`${s.id}_count`];
            }
          });
        });

        let sorted = applySorting(Object.values(groups), widget.sortBy, widget.series[0].id);
        return { data: sorted, isStack: false };
      }

      // 4) Stacked charts
      if (isStackedChart(widget.type) && widget.stackBy && widget.dimension) {
        const groups: Record<string, Record<string, { sum: number; count: number }>> = {};
        const stackKeys = new Set<string>();

        widgetData.forEach(row => {
          const dimValue = String(row[widget.dimension!] || 'N/A');
          const stackValue = String(row[widget.stackBy!] || 'อื่นๆ');
          if (!passCategory(dimValue)) return;

          stackKeys.add(stackValue);
          if (!groups[dimValue]) groups[dimValue] = {};
          if (!groups[dimValue][stackValue]) groups[dimValue][stackValue] = { sum: 0, count: 0 };

          if (measure === 'count') {
            groups[dimValue][stackValue].sum += 1;
            groups[dimValue][stackValue].count += 1;
          } else if (widget.measureCol) {
            const val = Number(row[widget.measureCol]) || 0;
            groups[dimValue][stackValue].sum += val;
            groups[dimValue][stackValue].count += 1;
          }
        });

        const orderedKeys = Array.from(stackKeys).sort();
        let result = Object.entries(groups).map(([dim, stacks]) => {
          const row: any = { name: dim };
          let total = 0;
          orderedKeys.forEach(k => {
            const entry = stacks[k];
            const val = entry ? (measure === 'avg' ? entry.sum / Math.max(entry.count, 1) : entry.sum) : 0;
            row[k] = val;
            total += val;
          });
          row.total = total;
          return row;
        });

        if (is100StackedChart(widget.type)) {
          result = result.map(r => {
            const total = r.total || 0;
            if (total === 0) return r;
            const next: any = { name: r.name };
            orderedKeys.forEach(k => {
              next[k] = ((r as any)[k] || 0) / total * 100;
            });
            next.total = 100;
            return next;
          });
        }

        result = applySorting(result, widget.sortBy, 'total');
        return { data: result, isStack: true, stackKeys: orderedKeys };
      }

      // 5) Single-series charts
      if (widget.dimension) {
        const groups: Record<string, { sum: number; count: number }> = {};

        widgetData.forEach(row => {
          const dimVal = String(row[widget.dimension!] || 'N/A');
          if (!passCategory(dimVal)) return;
          if (!groups[dimVal]) groups[dimVal] = { sum: 0, count: 0 };

          if (measure === 'count') {
            groups[dimVal].sum += 1;
            groups[dimVal].count += 1;
          } else if (widget.measureCol) {
            const val = Number(row[widget.measureCol]) || 0;
            groups[dimVal].sum += val;
            groups[dimVal].count += 1;
          }
        });

        let result = Object.entries(groups).map(([name, agg]) => ({
          name,
          value: measure === 'avg' ? agg.sum / Math.max(agg.count, 1) : agg.sum
        }));

        result = applySorting(result, widget.sortBy, 'value');
        return { data: result, isStack: false };
      }

      return { data: [], isStack: false };
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

        // Apply category filter
        if (widget.categoryFilter && widget.categoryFilter.length > 0 && !widget.categoryFilter.includes(dimValue)) {
          return;
        }

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

    // Apply sorting based on widget.sortBy
    let sorted = Object.values(result);
    const sortBy = widget.sortBy || 'value-desc';
    const firstSeriesId = widget.series[0]?.id || '';

    switch (sortBy) {
      case 'value-desc':
        sorted = sorted.sort((a, b) => {
          const aVal = widget.series!.reduce((sum, s) => sum + (a[s.id] || 0), 0);
          const bVal = widget.series!.reduce((sum, s) => sum + (b[s.id] || 0), 0);
          return bVal - aVal;
        });
        break;
      case 'value-asc':
        sorted = sorted.sort((a, b) => {
          const aVal = widget.series!.reduce((sum, s) => sum + (a[s.id] || 0), 0);
          const bVal = widget.series!.reduce((sum, s) => sum + (b[s.id] || 0), 0);
          return aVal - bVal;
        });
        break;
      case 'name-asc':
        sorted = sorted.sort((a, b) => String(a[widget.dimension]).localeCompare(String(b[widget.dimension])));
        break;
      case 'name-desc':
        sorted = sorted.sort((a, b) => String(b[widget.dimension]).localeCompare(String(a[widget.dimension])));
        break;
      case 'original':
      default:
        // No sorting for timeline/date charts
        break;
    }

    // Normalize to 100% for stacked bar
    if (widget.type === 'stacked-bar') {
      sorted = sorted.map(row => {
        const total = widget.series!.reduce((sum, s) => sum + (row[s.id] || 0), 0);
        if (total > 0) {
          const normalized: any = { [widget.dimension]: row[widget.dimension] };
          widget.series!.forEach(s => {
            normalized[s.id] = ((row[s.id] || 0) / total) * 100;
          });
          return normalized;
        }
        return row;
      });
    }

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
        const needsDimension = !['kpi', 'table', 'scatter', 'bubble'].includes(widget.type);
        if (needsDimension && !widget.dimension) {
          return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Invalid widget: Missing dimension</div>;
        }

        const { data, isStack, stackKeys } = processWidgetData(widget);
        const palette = getPalette(widget);
        const legendConfig: LegendConfig = widget.legend || { enabled: true, position: 'bottom', fontSize: 12, alignment: 'center' };
        const dataLabelsConfig: DataLabelConfig = widget.dataLabels || { enabled: false, position: 'top', fontSize: 12, fontWeight: 'normal', color: '#111827' };
        const xAxisConfig: AxisConfig = widget.xAxis || { fontSize: 12, fontColor: '#111827' };
        const leftYAxisConfig: AxisConfig = widget.leftYAxis || { fontSize: 12, fontColor: '#111827' };
        const rightYAxisConfig: AxisConfig = widget.rightYAxis || { fontSize: 12, fontColor: '#111827' };

        if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">No Data</div>;

        if (widget.type === 'table') {
          return (
            <div className="h-full overflow-auto w-full relative">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2">{widget.dimension || 'Column'}</th>
                    {widget.measureCol && <th className="px-4 py-2 text-right">{widget.measureCol}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data as RawRow[]).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 text-gray-700">
                      <td className="px-4 py-2 truncate max-w-[180px] font-medium" title={widget.dimension ? String(row[widget.dimension]) : ''}>
                        {widget.dimension ? String(row[widget.dimension]) : ''}
                      </td>
                      {widget.measureCol && (
                        <td className="px-4 py-2 text-right text-gray-500">{String(row[widget.measureCol])}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (widget.type === 'kpi') {
          const total = (data as any[]).reduce((sum, row) => sum + (row.value || 0), 0);
          const formattedTotal = formatWidgetValue(widget, total);
          return (
            <div className="flex flex-col items-center justify-center h-full pb-4">
              <span className="text-4xl font-bold text-blue-600">{formattedTotal}</span>
              <span className="text-gray-400 text-sm mt-2">{widget.title || 'KPI'}</span>
            </div>
          );
        }

        if (widget.type === 'wordcloud') {
          const maxVal = (data as any[]).reduce((max, item) => (item.value > max ? item.value : max), 0);
          const safeMax = maxVal > 0 ? maxVal : 1;
          return (
            <div className="flex flex-wrap content-center justify-center items-center h-full overflow-hidden p-2 gap-2">
              {(data as any[]).map((item, idx) => {
                const size = Math.max(12, Math.min(32, 12 + (item.value / safeMax) * 20));
                const opacity = 0.6 + (item.value / safeMax) * 0.4;
                return (
                  <span
                    key={idx}
                    onClick={(e) => handleChartClick(e, widget, item.name)}
                    className="cursor-pointer hover:scale-110 transition-transform px-1 leading-none select-none"
                    style={{ fontSize: `${size}px`, color: palette[idx % palette.length], opacity }}
                    title={`${item.name}: ${item.value}`}
                  >
                    {item.name}
                  </span>
                );
              })}
            </div>
          );
        }

        if (isPieChart(widget.type)) {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data as any[]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={widget.type === 'donut' ? `${widget.innerRadius || 50}%` : undefined}
                  startAngle={widget.startAngle || 0}
                  endAngle={(widget.startAngle || 0) + 360}
                  label={dataLabelsConfig.enabled}
                  onClick={(d, idx, e) => handleChartClick(e, widget, (d as any).name)}
                >
                  {(data as any[]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getWidgetColor(widget, entry.name, index)} />
                  ))}
                </Pie>
                <Tooltip />
                {legendConfig.enabled && <Legend wrapperStyle={{ fontSize: legendConfig.fontSize }} />}
              </PieChart>
            </ResponsiveContainer>
          );
        }

        if (widget.type === 'scatter' || widget.type === 'bubble') {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="x" type="number" name={widget.xDimension || 'X'} />
                <YAxis dataKey="y" type="number" name={widget.yDimension || 'Y'} />
                {widget.type === 'bubble' && <ZAxis dataKey="z" range={[60, 400]} />}
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                {legendConfig.enabled && <Legend wrapperStyle={{ fontSize: legendConfig.fontSize }} />}
                <Scatter data={data as any[]} fill={palette[0]} />
              </ScatterChart>
            </ResponsiveContainer>
          );
        }

        if (isMultiSeriesChart(widget.type) && widget.series && widget.series.length > 0) {
          const layout = (widget.barOrientation || 'vertical') === 'horizontal' ? 'vertical' : 'horizontal';
          return (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data as any[]} layout={layout} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                {layout === 'horizontal' ? (
                  <>
                    <XAxis dataKey={widget.dimension!} angle={xAxisConfig.slant || 0} textAnchor={xAxisConfig.slant ? 'end' : 'middle'} height={xAxisConfig.slant === 90 ? 100 : xAxisConfig.slant === 45 ? 80 : 60} tick={{ fontSize: xAxisConfig.fontSize, fill: xAxisConfig.fontColor }} />
                    <YAxis tick={{ fontSize: leftYAxisConfig.fontSize, fill: leftYAxisConfig.fontColor }} />
                    {widget.series.some(s => s.yAxis === 'right') && (
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: rightYAxisConfig.fontSize, fill: rightYAxisConfig.fontColor }} />
                    )}
                  </>
                ) : (
                  <>
                    <XAxis type="number" tick={{ fontSize: leftYAxisConfig.fontSize, fill: leftYAxisConfig.fontColor }} />
                    <YAxis type="category" dataKey={widget.dimension!} tick={{ fontSize: xAxisConfig.fontSize, fill: xAxisConfig.fontColor }} />
                  </>
                )}
                <Tooltip />
                {legendConfig.enabled && <Legend wrapperStyle={{ fontSize: legendConfig.fontSize }} />}
                {widget.series.map((s) => {
                  const Component = s.type === 'line' ? Line : s.type === 'area' ? Area : Bar;
                  const stackProps = s.type === 'bar' && isStackedChart(widget.type) ? { stackId: 'stack' } : {};
                  return (
                    <Component
                      key={s.id}
                      dataKey={s.id}
                      name={s.label}
                      type="monotone"
                      yAxisId={layout === 'horizontal' ? s.yAxis : undefined}
                      fill={s.color}
                      stroke={s.color}
                      strokeWidth={s.type === 'line' ? 2 : 1}
                      fillOpacity={s.type === 'area' ? 0.35 : 1}
                      {...stackProps}
                    >
                      {dataLabelsConfig.enabled && (
                        <LabelList dataKey={s.id} position={dataLabelsConfig.position as any} style={{ fontSize: dataLabelsConfig.fontSize, fontWeight: dataLabelsConfig.fontWeight, fill: dataLabelsConfig.color }} />
                      )}
                    </Component>
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          );
        }

        if (isAreaChart(widget.type)) {
          const layout = isHorizontalChart(widget.type) ? 'vertical' : 'horizontal';
          const keys = stackKeys && stackKeys.length > 0 ? stackKeys : ['value'];
          const stackId = isStack ? 'stack' : undefined;
          const curve = widget.curveType || 'monotone';
          const stroke = widget.strokeWidth || 2;
          return (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data as any[]} layout={layout}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                {layout === 'horizontal' ? (
                  <>
                    <XAxis dataKey="name" angle={xAxisConfig.slant || 0} textAnchor={xAxisConfig.slant ? 'end' : 'middle'} height={xAxisConfig.slant === 90 ? 100 : xAxisConfig.slant === 45 ? 80 : 60} tick={{ fontSize: xAxisConfig.fontSize, fill: xAxisConfig.fontColor }} />
                    <YAxis tick={{ fontSize: leftYAxisConfig.fontSize, fill: leftYAxisConfig.fontColor }} />
                  </>
                ) : (
                  <>
                    <XAxis type="number" tick={{ fontSize: leftYAxisConfig.fontSize, fill: leftYAxisConfig.fontColor }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: xAxisConfig.fontSize, fill: xAxisConfig.fontColor }} />
                  </>
                )}
                <Tooltip />
                {legendConfig.enabled && <Legend wrapperStyle={{ fontSize: legendConfig.fontSize }} />}
                {keys.map((key, idx) => (
                  <Area
                    key={key}
                    dataKey={key}
                    stackId={stackId}
                    type={curve}
                    stroke={getWidgetColor(widget, key, idx)}
                    fill={getWidgetColor(widget, key, idx)}
                    fillOpacity={0.35}
                    strokeWidth={stroke}
                  >
                    {dataLabelsConfig.enabled && (
                      <LabelList dataKey={key} position={dataLabelsConfig.position as any} style={{ fontSize: dataLabelsConfig.fontSize, fontWeight: dataLabelsConfig.fontWeight, fill: dataLabelsConfig.color }} />
                    )}
                  </Area>
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
        }

        if (isLineChart(widget.type)) {
          const curve = widget.type === 'smooth-line' ? 'monotone' : widget.curveType || 'linear';
          const stroke = widget.strokeWidth || 2;
          return (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data as any[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" angle={xAxisConfig.slant || 0} textAnchor={xAxisConfig.slant ? 'end' : 'middle'} height={xAxisConfig.slant === 90 ? 100 : xAxisConfig.slant === 45 ? 80 : 60} tick={{ fontSize: xAxisConfig.fontSize, fill: xAxisConfig.fontColor }} />
                <YAxis tick={{ fontSize: leftYAxisConfig.fontSize, fill: leftYAxisConfig.fontColor }} />
                <Tooltip />
                {legendConfig.enabled && <Legend wrapperStyle={{ fontSize: legendConfig.fontSize }} />}
                <Line type={curve} dataKey="value" stroke={palette[0]} strokeWidth={stroke} dot={{ r: 4 }}>
                  {dataLabelsConfig.enabled && (
                    <LabelList dataKey="value" position={dataLabelsConfig.position as any} style={{ fontSize: dataLabelsConfig.fontSize, fontWeight: dataLabelsConfig.fontWeight, fill: dataLabelsConfig.color }} />
                  )}
                </Line>
              </LineChart>
            </ResponsiveContainer>
          );
        }

        const layout = isHorizontalChart(widget.type) ? 'vertical' : 'horizontal';
        const keys = stackKeys && stackKeys.length > 0 ? stackKeys : ['value'];
        const stackId = isStack ? 'stack' : undefined;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data as any[]} layout={layout}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              {layout === 'horizontal' ? (
                <>
                  <XAxis dataKey="name" angle={xAxisConfig.slant || 0} textAnchor={xAxisConfig.slant ? 'end' : 'middle'} height={xAxisConfig.slant === 90 ? 100 : xAxisConfig.slant === 45 ? 80 : 60} tick={{ fontSize: xAxisConfig.fontSize, fill: xAxisConfig.fontColor }} />
                  <YAxis tick={{ fontSize: leftYAxisConfig.fontSize, fill: leftYAxisConfig.fontColor }} />
                </>
              ) : (
                <>
                  <XAxis type="number" tick={{ fontSize: leftYAxisConfig.fontSize, fill: leftYAxisConfig.fontColor }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: xAxisConfig.fontSize, fill: xAxisConfig.fontColor }} />
                </>
              )}
              <Tooltip />
              {legendConfig.enabled && <Legend wrapperStyle={{ fontSize: legendConfig.fontSize }} />}
              {keys.map((key, idx) => (
                <Bar key={key} dataKey={key} stackId={stackId} onClick={(barData: any, index: number, e: any) => handleChartClick(e, widget, barData.name)} fill={getWidgetColor(widget, key, idx)}>
                  {dataLabelsConfig.enabled && (
                    <LabelList dataKey={key} position={dataLabelsConfig.position as any} style={{ fontSize: dataLabelsConfig.fontSize, fontWeight: dataLabelsConfig.fontWeight, fill: dataLabelsConfig.color }} />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
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
      <div ref={dashboardRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
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
