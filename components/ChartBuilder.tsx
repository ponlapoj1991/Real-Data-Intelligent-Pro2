
import React, { useState, useEffect, useMemo } from 'react';
import { X, BarChart3, PieChart, LineChart, Hash, Activity, Save, Table, Cloud, Layers, Eye, Palette, Sparkles } from 'lucide-react';
import { ChartType, DashboardWidget, AggregateMethod, RawRow } from '../types';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart as RePieChart, Pie, Cell, LineChart as ReLineChart, Line, AreaChart as ReAreaChart, Area } from 'recharts';
import { analyzeSourceColumn } from '../utils/transform';

interface ChartBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: DashboardWidget) => void;
  availableColumns: string[];
  initialWidget?: DashboardWidget | null;
  data: RawRow[];
}

const THEMES = {
  default: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'],
  ocean: ['#0047BA', '#0063CC', '#007AE5', '#3395FF', '#66ADFF', '#99C6FF'],
  sunset: ['#FF5F6D', '#FFC371', '#FF9068', '#FF7E5F', '#FEB47B'],
  forest: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#D8F3DC'],
  monochrome: ['#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB']
};

// Robust ID generator
const generateId = () => {
  return 'widget-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
};

const ChartBuilder: React.FC<ChartBuilderProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  availableColumns, 
  initialWidget,
  data
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ChartType>('bar');
  const [dimension, setDimension] = useState('');
  const [stackBy, setStackBy] = useState(''); 
  const [measure, setMeasure] = useState<AggregateMethod>('count');
  const [measureCol, setMeasureCol] = useState('');
  const [limit, setLimit] = useState<number | undefined>(undefined);
  const [width, setWidth] = useState<'half' | 'full'>('half');
  const [theme, setTheme] = useState<keyof typeof THEMES>('default');

  // Smart Default Logic
  const detectSmartDefaults = () => {
      if (data.length === 0 || availableColumns.length === 0) return;

      let bestDim = availableColumns[0];
      let bestMeasureCol = '';
      let bestMeasure: AggregateMethod = 'count';
      
      // 1. Find best Dimension (Date or Categorical with low cardinality)
      for (const col of availableColumns) {
          const analysis = analyzeSourceColumn(data, col);
          // Prefer Date
          if (analysis.isDateLikely) {
              bestDim = col;
              break; 
          }
          // Or Categorical (String)
          if (!analysis.isDateLikely && !analysis.isArrayLikely) {
             bestDim = col;
          }
      }

      // 2. Find best Measure (Numeric)
      for (const col of availableColumns) {
          if (col === bestDim) continue;
          const isNumeric = data.slice(0, 20).every(r => {
              const val = r[col];
              return val === null || val === '' || !isNaN(Number(val));
          });
          
          if (isNumeric) {
              bestMeasureCol = col;
              bestMeasure = 'sum';
              break;
          }
      }

      setDimension(bestDim);
      setMeasure(bestMeasure);
      setMeasureCol(bestMeasureCol);
      
      // Auto-title
      setTitle(`${bestMeasure === 'count' ? 'Count' : 'Sum'} by ${bestDim}`);
  };

  useEffect(() => {
    if (isOpen) {
        if (initialWidget) {
            setTitle(initialWidget.title);
            setType(initialWidget.type);
            setDimension(initialWidget.dimension);
            setStackBy(initialWidget.stackBy || '');
            setMeasure(initialWidget.measure);
            setMeasureCol(initialWidget.measureCol || '');
            setLimit(initialWidget.limit);
            setWidth(initialWidget.width);
        } else {
            // Reset and trigger smart defaults
            setTitle('');
            setType('bar');
            setStackBy('');
            setLimit(undefined);
            setWidth('half');
            detectSmartDefaults();
        }
    }
  }, [isOpen, initialWidget]);

  const activeColors = THEMES[theme];

  const getThemeColor = (index: number) => {
      return activeColors[index % activeColors.length];
  };

  const previewData = useMemo(() => {
      if (!dimension || data.length === 0) return { data: [], isStack: false };

      // Logic duplicated from Analytics.tsx to ensure WYSIWYG
      if (type === 'table') {
          let processed = [...data];
          if (measureCol) {
              processed.sort((a, b) => {
                   const valA = a[measureCol];
                   const valB = b[measureCol];
                   if (typeof valA === 'number' && typeof valB === 'number') return valB - valA;
                   return String(valB).localeCompare(String(valA));
              });
          }
          return { data: processed.slice(0, limit || 20), isStack: false };
      }

      if (type === 'bar' && stackBy) {
          const stackKeys = new Set<string>();
          const groups: Record<string, Record<string, number>> = {};
          
          data.forEach(row => {
              const dimVal = String(row[dimension] || '(Empty)');
              const stackVal = String(row[stackBy] || '(Other)');
              stackKeys.add(stackVal);
              if (!groups[dimVal]) groups[dimVal] = {};
              if (!groups[dimVal][stackVal]) groups[dimVal][stackVal] = 0;
              if (measure === 'count') groups[dimVal][stackVal]++;
              else groups[dimVal][stackVal] += Number(row[measureCol || '']) || 0;
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
          result.sort((a, b) => b.total - a.total);
          return { data: limit ? result.slice(0, limit) : result, isStack: true, stackKeys: Array.from(stackKeys).sort() };
      }

      const groups: Record<string, number> = {};
      data.forEach(row => {
          let groupKey = String(row[dimension]);
          if (row[dimension] === null || row[dimension] === undefined) groupKey = "(Empty)";
          
          // Handle Array split for tags
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
              if(!k) return;
              if (!groups[k]) groups[k] = 0;
              if (measure === 'count' || type === 'wordcloud') groups[k]++;
              else groups[k] += Number(row[measureCol || '']) || 0;
          });
      });

      let result = Object.keys(groups).map(k => ({ name: k, value: measure === 'avg' ? (groups[k] / data.filter(r => String(r[dimension]).includes(k)).length) : groups[k] }));
      result.sort((a, b) => b.value - a.value);
      
      if (limit && result.length > limit) {
          if (type === 'wordcloud') result = result.slice(0, limit);
          else {
              const others = result.slice(limit).reduce((acc, curr) => acc + curr.value, 0);
              result = result.slice(0, limit);
              result.push({ name: 'Others', value: others });
          }
      }
      return { data: result, isStack: false };
  }, [data, dimension, stackBy, measure, measureCol, limit, type]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title || !dimension) return;
    const newWidget: DashboardWidget = {
        id: initialWidget?.id || generateId(),
        title, type, dimension,
        stackBy: (type === 'bar' && stackBy) ? stackBy : undefined,
        measure,
        measureCol: measure === 'count' ? undefined : measureCol,
        limit, width,
        color: activeColors[0] // Save primary color of theme
    };
    onSave(newWidget);
  };

  const renderPreview = () => {
      const { data: chartData, isStack, stackKeys } = previewData;
      if (chartData.length === 0) return <div className="text-gray-400 flex flex-col items-center"><Activity className="w-12 h-12 mb-2 opacity-20"/>No Data to Preview</div>;

      if (type === 'bar') {
          return (
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData as any[]} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} interval={0} />
                      <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px'}} />
                      <Legend />
                      {isStack && stackKeys ? stackKeys.map((key, idx) => (
                          <Bar key={key} dataKey={key} stackId="a" fill={getThemeColor(idx)} radius={[0,0,0,0]} barSize={20} />
                      )) : <Bar dataKey="value" fill={getThemeColor(0)} radius={[0, 4, 4, 0]} barSize={20} />}
                  </BarChart>
              </ResponsiveContainer>
          );
      }
      if (type === 'pie') {
          return (
              <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                      <Pie data={chartData as any[]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {(chartData as any[]).map((_, index) => <Cell key={index} fill={getThemeColor(index)} />)}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius: '8px'}} />
                      <Legend />
                  </RePieChart>
              </ResponsiveContainer>
          );
      }
      if (type === 'line' || type === 'area') {
           const sorted = [...(chartData as any[])].sort((a,b) => a.name.localeCompare(b.name));
           const ChartComp = type === 'line' ? ReLineChart : ReAreaChart;
           const DataComp = type === 'line' ? Line : Area;
           return (
              <ResponsiveContainer width="100%" height="100%">
                  <ChartComp data={sorted}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <Tooltip contentStyle={{borderRadius: '8px'}} />
                      <DataComp type="monotone" dataKey="value" stroke={getThemeColor(0)} fill={getThemeColor(0)} fillOpacity={0.2} strokeWidth={2} />
                  </ChartComp>
              </ResponsiveContainer>
           );
      }
      if (type === 'kpi') {
           const total = (chartData as any[]).reduce((acc, curr) => acc + curr.value, 0);
           return <div className="text-5xl font-bold" style={{color: getThemeColor(0)}}>{total.toLocaleString()}</div>;
      }
      if (type === 'wordcloud') {
          return (
             <div className="flex flex-wrap content-center justify-center gap-2 p-4">
                 {(chartData as any[]).map((item, idx) => (
                     <span key={idx} style={{ fontSize: `${Math.max(12, Math.min(32, 12 + (item.value/10)))}px`, color: getThemeColor(idx) }}>{item.name}</span>
                 ))}
             </div>
          );
      }
      return <div className="text-gray-400">Preview not available for Table yet</div>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-bold text-lg text-gray-800 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-600" />
            {initialWidget ? 'Edit Chart' : 'Add New Chart'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Left: Configuration */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50/50 flex flex-col overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* 1. Title */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Chart Title</label>
                    <div className="flex space-x-2">
                        <input 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            placeholder="e.g. Sales by Region"
                            autoFocus
                        />
                        <button 
                            onClick={detectSmartDefaults}
                            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-gray-500 transition-colors"
                            title="Auto-Suggest Configuration"
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 2. Type Selection */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Chart Type</label>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { id: 'bar', icon: BarChart3, label: 'Bar' },
                            { id: 'pie', icon: PieChart, label: 'Pie' },
                            { id: 'line', icon: LineChart, label: 'Line' },
                            { id: 'area', icon: Activity, label: 'Area' },
                            { id: 'kpi', icon: Hash, label: 'KPI' },
                            { id: 'wordcloud', icon: Cloud, label: 'Cloud' },
                            { id: 'table', icon: Table, label: 'Table' },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setType(item.id as ChartType)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${type === item.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                            >
                                <item.icon className="w-5 h-5 mb-1" />
                                <span className="text-[9px] font-medium">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Data Config */}
                <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            {type === 'wordcloud' ? 'Text Source' : 'X-Axis (Group By)'}
                        </label>
                        <select 
                            value={dimension}
                            onChange={e => setDimension(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Select Column...</option>
                            {availableColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                    </div>

                    {type === 'bar' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center">
                                <Layers className="w-3 h-3 mr-1" /> Stack By
                            </label>
                            <select 
                                value={stackBy}
                                onChange={e => setStackBy(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">None</option>
                                {availableColumns.map(col => (
                                    <option key={col} value={col}>{col}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {type !== 'wordcloud' && (
                    <div className="flex space-x-2">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Metric</label>
                            <select 
                                value={measure}
                                onChange={e => setMeasure(e.target.value as AggregateMethod)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="count">Count Rows</option>
                                <option value="sum">Sum</option>
                                <option value="avg">Average</option>
                            </select>
                        </div>
                        {measure !== 'count' && (
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-700 mb-1">Value Col</label>
                                <select 
                                    value={measureCol}
                                    onChange={e => setMeasureCol(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Select...</option>
                                    {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    )}
                </div>

                {/* 4. Display Options */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Display & Theme</label>
                    
                    {/* Theme Selector */}
                    <div className="flex space-x-2 mb-3 overflow-x-auto pb-2">
                        {Object.keys(THEMES).map((t) => (
                            <button 
                                key={t}
                                onClick={() => setTheme(t as any)}
                                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 ${theme === t ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                                style={{ background: `linear-gradient(135deg, ${THEMES[t as keyof typeof THEMES][0]} 50%, ${THEMES[t as keyof typeof THEMES][1]} 50%)` }}
                                title={t}
                            />
                        ))}
                    </div>

                    <div className="flex items-center space-x-3 mb-3">
                         <span className="text-sm text-gray-600">Limit:</span>
                         <select 
                            value={limit || ''}
                            onChange={e => setLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                            <option value="">Default (20)</option>
                            <option value="5">Top 5</option>
                            <option value="10">Top 10</option>
                            <option value="50">Top 50</option>
                        </select>
                    </div>
                    <div className="flex space-x-2">
                         <button onClick={() => setWidth('half')} className={`flex-1 py-2 border rounded text-xs font-medium ${width === 'half' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white'}`}>Half Width</button>
                         <button onClick={() => setWidth('full')} className={`flex-1 py-2 border rounded text-xs font-medium ${width === 'full' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white'}`}>Full Width</button>
                    </div>
                </div>

            </div>

            {/* Right: Live Preview */}
            <div className="flex-1 bg-gray-50 flex flex-col relative">
                {/* Grid Background */}
                <div 
                    className="absolute inset-0 opacity-10 pointer-events-none" 
                    style={{ 
                        backgroundImage: `radial-gradient(#475569 1px, transparent 1px)`,
                        backgroundSize: `20px 20px`
                    }} 
                />
                
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur border border-gray-200 px-3 py-1.5 rounded-full text-xs font-bold text-gray-500 shadow-sm flex items-center">
                    <Eye className="w-3 h-3 mr-1.5" /> Live Preview
                </div>

                <div className="flex-1 flex items-center justify-center p-10">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-2xl aspect-video p-6 flex flex-col">
                         <h4 className="font-bold text-gray-800 mb-4 text-center">{title || 'Untitled Chart'}</h4>
                         <div className="flex-1 min-h-0 flex items-center justify-center">
                             {renderPreview()}
                         </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end space-x-3 z-10">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!title || !dimension || (measure !== 'count' && !measureCol && type !== 'table' && type !== 'wordcloud')}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Widget
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChartBuilder;
