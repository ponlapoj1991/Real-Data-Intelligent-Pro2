
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Project, ReportSlide, ReportElement, DashboardWidget, RawRow, ShapeType, ReportElementStyle, TableData, ChartData, TableCell } from '../types';
import { 
    Plus, Trash2, Save, Download, Layers,
    Maximize, Monitor, Grid3X3, Type, FileUp, Loader2, MousePointer2,
    Bold, Italic, AlignLeft, AlignCenter, AlignRight, ZoomIn, ZoomOut,
    BringToFront, SendToBack, PaintBucket,
    ChevronLeft, ChevronRight, BarChart3, PieChart, LineChart, Activity, Hash, Cloud, Table,
    Undo2, Redo2, Square, Circle, Triangle, ArrowRight, Minus, Star, Highlighter, Copy, Move, RotateCw, Image as ImageIcon,
    FileText, Settings, Presentation, PanelRightClose, PanelRightOpen, FileInput
} from 'lucide-react';
import { saveProject } from '../utils/storage-compat';
import { generateCustomReport } from '../utils/report';
import { applyTransformation } from '../utils/transform';
import { ResponsiveContainer, BarChart, Bar, PieChart as RePieChart, Pie, Cell, LineChart as ReLineChart, Line, AreaChart as ReAreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useToast } from '../components/ToastProvider';

interface ReportBuilderProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

// --- Constants ---
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540; // 16:9 Aspect Ratio
const SNAP_GRID = 10;
const CANVAS_BG = "#f3f4f6"; // Lighter background to make white canvas pop
const DRAG_ACTIVATION_DISTANCE = 2; // Require slight movement to start drag
const GUIDE_SNAP_THRESHOLD = 4;

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1', '#84cc16', '#14b8a6'];

// --- Helper Functions ---

const getSentimentColor = (key: string, index: number) => {
    const lower = key.toLowerCase();
    if (lower.includes('positive')) return '#10B981';
    if (lower.includes('negative')) return '#EF4444';
    if (lower.includes('neutral')) return '#9CA3AF';
    return COLORS[index % COLORS.length];
};

const processDataForWidget = (widget: DashboardWidget, rawData: RawRow[]) => {
    const groups: Record<string, any> = {};
    if (widget.type === 'bar' && widget.stackBy) {
        const stackKeys = new Set<string>();
        rawData.forEach(row => {
            const dimVal = String(row[widget.dimension] || '(Empty)');
            const stackVal = String(row[widget.stackBy!] || '(Other)');
            stackKeys.add(stackVal);
            if (!groups[dimVal]) groups[dimVal] = { name: dimVal, total: 0 };
            if (!groups[dimVal][stackVal]) groups[dimVal][stackVal] = 0;
            if (widget.measure === 'count') {
                groups[dimVal][stackVal]++;
                groups[dimVal].total++;
            } else {
                const val = Number(row[widget.measureCol || '']) || 0;
                groups[dimVal][stackVal] += val;
                groups[dimVal].total += val;
            }
        });
        return { 
            data: Object.values(groups).sort((a: any, b: any) => b.total - a.total).slice(0, widget.limit || 20),
            isStack: true,
            stackKeys: Array.from(stackKeys).sort()
        };
    }
    rawData.forEach(row => {
        const val = String(row[widget.dimension] || '(Empty)');
        if (!groups[val]) groups[val] = 0;
        if (widget.measure === 'count' || widget.type === 'wordcloud') {
            groups[val]++;
        } else {
            groups[val] += Number(row[widget.measureCol || '']) || 0;
        }
    });
    let result = Object.keys(groups).map(k => ({ name: k, value: groups[k] }));
    result.sort((a, b) => b.value - a.value);
    return { data: result.slice(0, widget.limit || 20), isStack: false };
};

// --- PPTX Parser Helpers ---

// 1 inch = 914400 EMUs -> 96 px (Default screen DPI)
const emuToPx = (emu: string | number | null | undefined): number => {
    if (!emu) return 0;
    const val = parseInt(String(emu), 10);
    if (isNaN(val)) return 0;
    return Math.round(val / 9525);
};

// Convert Hex or System Color
const parsePptxColor = (solidFillNode: Element | null): string | undefined => {
    if (!solidFillNode) return undefined;
    
    // 1. Direct SRGB Color
    const srgb = solidFillNode.getElementsByTagName("a:srgbClr")[0];
    if (srgb) {
        const val = srgb.getAttribute("val");
        return val ? `#${val}` : undefined;
    }

    // 2. Scheme Color (Simplified mapping for now)
    const scheme = solidFillNode.getElementsByTagName("a:schemeClr")[0];
    if (scheme) {
        const val = scheme.getAttribute("val");
        // Simple fallback mapping
        if (val === 'bg1' || val === 'lt1') return '#FFFFFF';
        if (val === 'tx1' || val === 'dk1') return '#000000';
        if (val === 'accent1') return '#4472C4'; 
        if (val === 'accent2') return '#ED7D31'; 
        if (val === 'accent3') return '#A5A5A5';
        if (val === 'accent4') return '#FFC000';
        if (val === 'accent5') return '#5B9BD5';
        if (val === 'accent6') return '#70AD47';
        return '#888888'; 
    }

    return undefined;
};

interface GroupTransform {
    x: number;
    y: number;
    w: number;
    h: number;
    chX: number;
    chY: number;
    chW: number;
    chH: number;
}

// --- Subcomponents ---

// Widget Renderer (Reused in Canvas and Thumbnail)
const WidgetRenderer: React.FC<{ widget: DashboardWidget, data: RawRow[], simplified?: boolean }> = ({ widget, data, simplified = false }) => {
    const { data: chartData, isStack, stackKeys } = useMemo(() => processDataForWidget(widget, data), [widget, data]);

    if (!chartData || chartData.length === 0) return <div className="flex items-center justify-center h-full text-xs text-gray-400 bg-gray-50">No Data</div>;

    if (simplified) {
        // Simplified view for Thumbnails/Preview to improve performance
        if (widget.type === 'kpi') return <div className="flex items-center justify-center h-full text-blue-600 font-bold text-lg">123...</div>;
        return (
             <div className="w-full h-full flex items-end justify-center space-x-1 p-2 bg-white">
                 {[40, 70, 50, 90, 30].map((h, i) => (
                     <div key={i} style={{ height: `${h}%`, width: '15%' }} className="bg-blue-400 rounded-t-sm opacity-60"></div>
                 ))}
             </div>
        );
    }

    if (widget.type === 'bar') {
        return (
             <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{top:0, left:0, right:5, bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 8}} interval={0} />
                      {isStack && stackKeys ? stackKeys.map((key, i) => (
                          <Bar key={key} dataKey={key} stackId="a" fill={getSentimentColor(key, i)} barSize={15} isAnimationActive={false} />
                      )) : (
                          <Bar dataKey="value" fill={widget.color || '#3B82F6'} barSize={15} isAnimationActive={false} />
                      )}
                  </BarChart>
             </ResponsiveContainer>
        );
    }
    if (widget.type === 'pie') {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={10} outerRadius={25} paddingAngle={2} dataKey="value" isAnimationActive={false}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                </RePieChart>
            </ResponsiveContainer>
        );
    }
    if (widget.type === 'line' || widget.type === 'area') {
        const ChartComp = widget.type === 'line' ? ReLineChart : ReAreaChart;
        const DataComp = widget.type === 'line' ? Line : Area;
        return (
            <ResponsiveContainer width="100%" height="100%">
                <ChartComp data={chartData} margin={{top:5, left:0, right:5, bottom:0}}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                     <XAxis dataKey="name" tick={{fontSize: 8}} hide />
                     <YAxis tick={{fontSize: 8}} hide />
                     <DataComp type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} dot={false} strokeWidth={2} isAnimationActive={false} />
                </ChartComp>
            </ResponsiveContainer>
        );
    }
    if (widget.type === 'kpi') {
        const total = (chartData as any[]).reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
        return (
            <div className="flex flex-col items-center justify-center h-full pb-1">
                 <span className="text-xl font-bold text-blue-600">{total.toLocaleString()}</span>
            </div>
        );
    }
    return <div className="flex items-center justify-center h-full text-[8px] text-gray-400">{widget.type}</div>;
};

// Thumbnail Renderer for Sidebar
const SlideThumbnail: React.FC<{ slide: ReportSlide, project: Project, data: RawRow[] }> = ({ slide, project, data }) => {
    // Determine scale based on sidebar width (w-48 approx 192px minus padding ~170px)
    // Canvas is 960px. 170 / 960 ~= 0.177
    const scale = 0.175;
    
    return (
        <div 
            className="bg-white relative overflow-hidden shadow-sm"
            style={{ 
                width: '100%', 
                height: '100%', 
            }}
        >
            <div
                style={{
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    backgroundColor: slide.background && !slide.background.startsWith('data:image') ? slide.background : 'white'
                }}
            >
                {slide.background?.startsWith('data:image') && <img src={slide.background} className="absolute inset-0 w-full h-full object-cover" />}
                {slide.elements.map(el => (
                    <div 
                        key={el.id}
                        style={{
                            position: 'absolute',
                            left: el.x, top: el.y, width: el.w, height: el.h,
                            zIndex: el.zIndex,
                            transform: `rotate(${el.style?.rotation || 0}deg)`,
                        }}
                    >
                        <ElementContent el={el} project={project} data={data} simplified={true} />
                    </div>
                ))}
            </div>
        </div>
    );
};

// Static renderer used for exporting PPT slides without editor chrome
const ExportSlideView: React.FC<{ slide: ReportSlide, project: Project, data: RawRow[] }> = ({ slide, project, data }) => {
    return (
        <div
            style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                position: 'relative',
                backgroundColor: slide.background && !slide.background.startsWith('data:image') ? slide.background : 'white',
                overflow: 'hidden'
            }}
        >
            {slide.background?.startsWith('data:image') && (
                <img src={slide.background} className="absolute inset-0 w-full h-full object-cover" />
            )}
            {slide.elements.map(el => (
                <div
                    key={el.id}
                    style={{
                        position: 'absolute',
                        left: el.x, top: el.y, width: el.w, height: el.h,
                        zIndex: el.zIndex,
                        transform: `rotate(${el.style?.rotation || 0}deg)`
                    }}
                >
                    <ElementContent el={el} project={project} data={data} />
                </div>
            ))}
        </div>
    );
};

// Extracted Content Renderer to share between Main Canvas and Thumbnail
const ElementContent: React.FC<{ el: ReportElement, project: Project, data: RawRow[], simplified?: boolean }> = ({ el, project, data, simplified = false }) => {
    const commonStyle: React.CSSProperties = {
        width: '100%', height: '100%',
        opacity: el.style?.opacity,
        overflow: 'hidden', // Essential for PPT fidelity
    };

    if (el.type === 'text') {
        return (
            <div style={{
                ...commonStyle,
                display: 'flex',
                flexDirection: 'column',
                // Use Flex alignment to emulate PPT Text Alignment
                justifyContent: 'flex-start',
                alignItems: el.style?.textAlign === 'center' ? 'center' : el.style?.textAlign === 'right' ? 'flex-end' : 'flex-start',
                fontSize: el.style?.fontSize,
                fontFamily: el.style?.fontFamily,
                fontWeight: el.style?.fontWeight,
                fontStyle: el.style?.fontStyle,
                textDecoration: el.style?.textDecoration,
                color: el.style?.color,
                textAlign: el.style?.textAlign,
                backgroundColor: el.style?.backgroundColor,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: '1.2', // Prevent text overflow
                padding: '4px', // Slight padding to prevent font clipping
            }}>
                 {el.content}
            </div>
        );
    } else if (el.type === 'image') {
        return <img src={el.content} style={{...commonStyle, objectFit: 'contain'}} alt="" />;
    } else if (el.type === 'shape') {
        const fill = el.style?.fill || '#ccc';
        const stroke = el.style?.stroke || 'none';
        const sw = el.style?.strokeWidth || 0;
        
        if (el.shapeType === 'rect') {
            return <div style={{...commonStyle, backgroundColor: fill, border: `${sw}px solid ${stroke}`}} />;
        } else if (el.shapeType === 'circle') {
            return <div style={{...commonStyle, backgroundColor: fill, border: `${sw}px solid ${stroke}`, borderRadius: '50%'}} />;
        } else if (el.shapeType === 'line') {
            // Center the line vertically
            return <div style={{position: 'absolute', top: '50%', left: 0, width: '100%', height: Math.max(1, sw), backgroundColor: stroke || fill, transform: 'translateY(-50%)'}} />;
        } else {
           return (
               <svg width="100%" height="100%" style={commonStyle} viewBox="0 0 100 100" preserveAspectRatio="none">
                   {el.shapeType === 'triangle' && <polygon points="50,0 100,100 0,100" fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke" />}
                   {el.shapeType === 'star' && <polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke" />}
                   {el.shapeType === 'arrow' && (
                       <g>
                           <line x1="0" y1="50" x2="90" y2="50" stroke={stroke || fill} strokeWidth={Math.max(10, sw * 2)} />
                           <polygon points="100,50 85,35 85,65" fill={stroke || fill} />
                       </g>
                   )}
               </svg>
           );
        }
    } else if (el.type === 'widget') {
        const widget = project.dashboard?.find(w => w.id === el.widgetId);
        if (widget) {
            return (
                <div className="w-full h-full bg-white border border-gray-100 p-2 flex flex-col pointer-events-none overflow-hidden">
                     {!simplified && <h5 className="text-[10px] uppercase font-bold text-gray-400 mb-1 truncate">{widget.title}</h5>}
                     <div className="flex-1 min-h-0">
                         <WidgetRenderer widget={widget} data={data} simplified={simplified} />
                     </div>
                </div>
            );
        } else {
            return <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-red-400">Missing</div>;
        }
    } else if (el.type === 'table' && el.tableData) {
        // Render Table
        const { rows, columnWidths } = el.tableData;
        return (
            <div style={{...commonStyle, backgroundColor: '#fff', border: '1px solid #ccc'}}>
                <table className="w-full h-full border-collapse" style={{fontSize: simplified ? '6px' : '8px'}}>
                    <tbody>
                        {rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                                {row.map((cell, cIdx) => (
                                    <td
                                        key={cIdx}
                                        rowSpan={cell.rowSpan}
                                        colSpan={cell.colSpan}
                                        style={{
                                            border: '1px solid #ddd',
                                            padding: '2px 4px',
                                            backgroundColor: cell.style?.backgroundColor || 'transparent',
                                            color: cell.style?.color || '#333',
                                            fontWeight: cell.style?.fontWeight || 'normal',
                                            textAlign: cell.style?.textAlign || 'left',
                                            fontSize: cell.style?.fontSize,
                                            width: columnWidths?.[cIdx] ? `${columnWidths[cIdx]}%` : 'auto',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {cell.text}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    } else if (el.type === 'chart' && el.chartData) {
        // Render Embedded Chart
        const { chartType, data: chartData, title } = el.chartData;
        if (simplified) {
            return <div className="w-full h-full bg-white border border-gray-200 flex items-center justify-center">
                {chartType === 'bar' && <BarChart3 className="w-8 h-8 text-blue-400" />}
                {chartType === 'pie' && <PieChart className="w-8 h-8 text-green-400" />}
                {chartType === 'line' && <LineChart className="w-8 h-8 text-purple-400" />}
                {chartType === 'area' && <Activity className="w-8 h-8 text-orange-400" />}
            </div>;
        }
        return (
            <div className="w-full h-full bg-white border border-gray-100 p-2 flex flex-col">
                {title && <div className="text-[10px] font-bold text-gray-700 mb-1">{title}</div>}
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' && (
                            <BarChart data={chartData} margin={{top:5, left:0, right:5, bottom:0}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="name" tick={{fontSize: 8}} hide />
                                <YAxis tick={{fontSize: 8}} hide />
                                <Bar dataKey="value" fill="#3B82F6" isAnimationActive={false} />
                            </BarChart>
                        )}
                        {chartType === 'pie' && (
                            <RePieChart>
                                <Pie data={chartData} cx="50%" cy="50%" outerRadius={40} dataKey="value" isAnimationActive={false}>
                                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                            </RePieChart>
                        )}
                        {(chartType === 'line' || chartType === 'area') && (
                            chartType === 'line' ? (
                                <ReLineChart data={chartData} margin={{top:5, left:0, right:5, bottom:0}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{fontSize: 8}} hide />
                                    <YAxis tick={{fontSize: 8}} hide />
                                    <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} isAnimationActive={false} />
                                </ReLineChart>
                            ) : (
                                <ReAreaChart data={chartData} margin={{top:5, left:0, right:5, bottom:0}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{fontSize: 8}} hide />
                                    <YAxis tick={{fontSize: 8}} hide />
                                    <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} isAnimationActive={false} />
                                </ReAreaChart>
                            )
                        )}
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }
    return null;
}

// --- Main Component ---

const ReportBuilder: React.FC<ReportBuilderProps> = ({ project, onUpdateProject }) => {
  // State
  const [slides, setSlides] = useState<ReportSlide[]>(project.reportConfig || [{ id: 'slide-1', elements: [] }]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [showGrid, setShowGrid] = useState(false); 
  
  // Sidebar States
  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(true);

  const [activeMenu, setActiveMenu] = useState<string | null>(null); // For Top Bar Menus
  const [isProcessingPptx, setIsProcessingPptx] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [guides, setGuides] = useState<{ vertical?: number; horizontal?: number }>({});
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Drag & Resize Refs
  const dragRef = useRef<{
    active: boolean;
    mode: 'drag' | 'resize' | 'rotate';
    handle: string | null;
    startX: number;
    startY: number;
    initialElements: Record<string, { x: number, y: number, w: number, h: number, rotation?: number }>;
    dragOffset: { x: number, y: number };
    pointerDown?: boolean;
    dragStarted?: boolean;
  }>({
    active: false,
    mode: 'drag',
    handle: null,
    startX: 0,
    startY: 0,
    initialElements: {},
    dragOffset: { x: 0, y: 0 },
    pointerDown: false,
    dragStarted: false
  });

  // History State
  const [history, setHistory] = useState<ReportSlide[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Prepare Data
  const finalData = useMemo(() => {
     return project.transformRules && project.transformRules.length > 0 
        ? applyTransformation(project.data, project.transformRules) 
        : project.data;
  }, [project]);

  const activeSlide = slides[activeSlideIdx];
  const primarySelectedId = Array.from(selectedElementIds)[0];
  const selectionCount = selectedElementIds.size;
  const primaryElement = activeSlide.elements.find(el => el.id === primarySelectedId);

  // --- Click Outside to Close Menu ---
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setActiveMenu(null);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Actions ---

  const saveToHistory = (newSlides: ReportSlide[]) => {
      const newHistory = history.slice(0, historyIdx + 1);
      newHistory.push(JSON.parse(JSON.stringify(newSlides)));
      if (newHistory.length > 20) newHistory.shift();
      setHistory(newHistory);
      setHistoryIdx(newHistory.length - 1);
  };

  const updateSlides = (newSlides: ReportSlide[], saveHistory = true) => {
      setSlides(newSlides);
      if (saveHistory) saveToHistory(newSlides);
  };

  const undo = () => {
      if (historyIdx > 0) {
          setHistoryIdx(historyIdx - 1);
          setSlides(JSON.parse(JSON.stringify(history[historyIdx - 1])));
      }
  };

  const redo = () => {
      if (historyIdx < history.length - 1) {
          setHistoryIdx(historyIdx + 1);
          setSlides(JSON.parse(JSON.stringify(history[historyIdx + 1])));
      }
  };

  // --- Element Management ---

  const addElement = (type: 'text' | 'shape' | 'image' | 'widget', subType?: any, extra?: any) => {
      const newElement: ReportElement = {
          id: `${type}-${Date.now()}`,
          type,
          x: CANVAS_WIDTH / 2 - 150,
          y: CANVAS_HEIGHT / 2 - 100,
          w: 300,
          h: 200,
          zIndex: activeSlide.elements.length + 1,
          style: {
             opacity: 1,
             rotation: 0
          }
      };

      if (type === 'text') {
          newElement.content = 'Double click to edit';
          newElement.h = 60;
          newElement.style = { ...newElement.style, fontSize: '24px', color: '#333333', fontFamily: 'Arial' };
      } else if (type === 'shape') {
          newElement.shapeType = subType as ShapeType;
          newElement.w = 150;
          newElement.h = 150;
          newElement.style = { ...newElement.style, fill: '#3B82F6', stroke: '#2563EB', strokeWidth: 2 };
          if (subType === 'line' || subType === 'arrow') {
              newElement.h = 10;
              newElement.w = 200;
          }
      } else if (type === 'widget') {
          newElement.widgetId = subType;
          newElement.style = { ...newElement.style, backgroundColor: '#ffffff' };
      } else if (type === 'image') {
          newElement.content = extra; // Base64
      }

      const newSlides = [...slides];
      newSlides[activeSlideIdx].elements.push(newElement);
      updateSlides(newSlides);
      setSelectedElementIds(new Set([newElement.id]));
  };

  const updateElementStyle = (key: keyof ReportElementStyle, value: any) => {
      if (selectedElementIds.size === 0) return;
      const newSlides = [...slides];
      newSlides[activeSlideIdx].elements = newSlides[activeSlideIdx].elements.map(el => {
          if (selectedElementIds.has(el.id)) {
              return { ...el, style: { ...el.style, [key]: value } };
          }
          return el;
      });
      updateSlides(newSlides);
  };

  const deleteSelection = () => {
      if (selectedElementIds.size === 0) return;
      const newSlides = [...slides];
      newSlides[activeSlideIdx].elements = newSlides[activeSlideIdx].elements.filter(el => !selectedElementIds.has(el.id));
      updateSlides(newSlides);
      setSelectedElementIds(new Set());
  };

  const bringToFront = () => {
      if (selectedElementIds.size === 0) return;
      const newSlides = [...slides];
      const currentSlide = newSlides[activeSlideIdx];
      let maxZ = Math.max(...currentSlide.elements.map(e => e.zIndex || 0));
      
      currentSlide.elements.forEach(el => {
          if (selectedElementIds.has(el.id)) {
              el.zIndex = maxZ + 1;
          }
      });
      // Normalize Z
      currentSlide.elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      currentSlide.elements.forEach((e, i) => e.zIndex = i + 1);
      updateSlides(newSlides);
  };

  const sendToBack = () => {
      if (selectedElementIds.size === 0) return;
      const newSlides = [...slides];
      const currentSlide = newSlides[activeSlideIdx];
      
      currentSlide.elements.forEach(el => {
          if (selectedElementIds.has(el.id)) {
              el.zIndex = 0;
          }
      });
      // Normalize Z
      currentSlide.elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      currentSlide.elements.forEach((e, i) => e.zIndex = i + 1);
      updateSlides(newSlides);
  };

  const alignSelected = (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedElementIds.size < 2) return;
      const newSlides = [...slides];
      const slide = newSlides[activeSlideIdx];
      const selected = slide.elements.filter(el => selectedElementIds.has(el.id));
      if (!selected.length) return;

      const bounds = selected.reduce((acc, el) => ({
          minX: Math.min(acc.minX, el.x),
          maxX: Math.max(acc.maxX, el.x + el.w),
          minY: Math.min(acc.minY, el.y),
          maxY: Math.max(acc.maxY, el.y + el.h)
      }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

      slide.elements = slide.elements.map(el => {
          if (!selectedElementIds.has(el.id)) return el;
          let nextX = el.x;
          let nextY = el.y;
          if (mode === 'left') nextX = bounds.minX;
          if (mode === 'center') nextX = (bounds.minX + bounds.maxX) / 2 - el.w / 2;
          if (mode === 'right') nextX = bounds.maxX - el.w;
          if (mode === 'top') nextY = bounds.minY;
          if (mode === 'middle') nextY = (bounds.minY + bounds.maxY) / 2 - el.h / 2;
          if (mode === 'bottom') nextY = bounds.maxY - el.h;
          if (showGrid) {
              nextX = Math.round(nextX / SNAP_GRID) * SNAP_GRID;
              nextY = Math.round(nextY / SNAP_GRID) * SNAP_GRID;
          }
          return { ...el, x: nextX, y: nextY };
      });

      updateSlides(newSlides);
  };

  const distributeSelected = (axis: 'horizontal' | 'vertical') => {
      if (selectedElementIds.size < 3) return;
      const newSlides = [...slides];
      const slide = newSlides[activeSlideIdx];
      const selected = slide.elements.filter(el => selectedElementIds.has(el.id));
      if (selected.length < 3) return;

      const sorted = [...selected].sort((a, b) => axis === 'horizontal' ? a.x - b.x : a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const firstCenter = axis === 'horizontal' ? first.x + first.w / 2 : first.y + first.h / 2;
      const lastCenter = axis === 'horizontal' ? last.x + last.w / 2 : last.y + last.h / 2;
      const gap = (lastCenter - firstCenter) / (sorted.length - 1);

      const idToElement: Record<string, ReportElement> = {};
      slide.elements.forEach(el => { idToElement[el.id] = el; });

      sorted.forEach((el, idx) => {
          const center = firstCenter + gap * idx;
          if (axis === 'horizontal') {
              idToElement[el.id] = { ...idToElement[el.id], x: center - el.w / 2 };
          } else {
              idToElement[el.id] = { ...idToElement[el.id], y: center - el.h / 2 };
          }
      });

      if (showGrid) {
          Object.keys(idToElement).forEach(id => {
              const el = idToElement[id];
              if (!selectedElementIds.has(id)) return;
              idToElement[id] = {
                  ...el,
                  x: Math.round(el.x / SNAP_GRID) * SNAP_GRID,
                  y: Math.round(el.y / SNAP_GRID) * SNAP_GRID
              };
          });
      }

      slide.elements = slide.elements.map(el => idToElement[el.id]);
      updateSlides(newSlides);
  };

  const matchSize = (mode: 'width' | 'height' | 'both') => {
      if (selectedElementIds.size < 2) return;
      const newSlides = [...slides];
      const slide = newSlides[activeSlideIdx];
      const [baseId] = Array.from(selectedElementIds);
      const base = slide.elements.find(el => el.id === baseId);
      if (!base) return;

      slide.elements = slide.elements.map(el => {
          if (!selectedElementIds.has(el.id) || el.id === baseId) return el;
          let nextW = el.w;
          let nextH = el.h;
          if (mode === 'width' || mode === 'both') nextW = base.w;
          if (mode === 'height' || mode === 'both') nextH = base.h;
          return { ...el, w: nextW, h: nextH };
      });

      updateSlides(newSlides);
  };

  // --- Interaction Handlers ---

  const handleStageMouseDown = (e: React.MouseEvent) => {
      // If clicked on empty space, deselect
      if (e.target === e.currentTarget || (e.target as HTMLElement).id === 'canvas-bg') {
          setSelectedElementIds(new Set());
      }
  };

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      
      const isMulti = e.shiftKey || e.ctrlKey;
      let newSelection = new Set(selectedElementIds);
      
      if (isMulti) {
          if (newSelection.has(id)) newSelection.delete(id);
          else newSelection.add(id);
      } else {
          if (!newSelection.has(id)) {
              newSelection = new Set([id]);
          }
      }
      setSelectedElementIds(newSelection);

      // Setup Drag
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = zoomLevel;
      
      const initialElements: any = {};
      slides[activeSlideIdx].elements.forEach(el => {
          if (newSelection.has(el.id)) {
              initialElements[el.id] = { ...el, rotation: el.style?.rotation || 0 };
          }
      });

      dragRef.current = {
          active: false,
          mode: 'drag',
          handle: null,
          startX: e.clientX,
          startY: e.clientY,
          initialElements,
          dragOffset: { x: (e.clientX - rect.left)/scale, y: (e.clientY - rect.top)/scale },
          pointerDown: true,
          dragStarted: false
      };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
      e.stopPropagation();
      const id = primarySelectedId;
      if (!id) return;

      const el = slides[activeSlideIdx].elements.find(x => x.id === id);
      if (!el) return;

      dragRef.current = {
          active: false,
          mode: 'resize',
          handle,
          startX: e.clientX,
          startY: e.clientY,
          initialElements: { [id as string]: { ...el, rotation: el.style?.rotation || 0 } },
          dragOffset: { x: 0, y: 0 },
          pointerDown: true,
          dragStarted: false
      };
  };

  const handleRotateMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      const id = primarySelectedId;
      if (!id || !canvasRef.current) return;

      const el = slides[activeSlideIdx].elements.find(x => x.id === id);
      if (!el) return;
      
      dragRef.current = {
          active: false,
          mode: 'rotate',
          handle: null,
          startX: e.clientX,
          startY: e.clientY,
          initialElements: { [id as string]: { ...el, rotation: el.style?.rotation || 0 } },
          dragOffset: { x: 0, y: 0 },
          pointerDown: true,
          dragStarted: false
      };
  };

  // Global Mouse Move / Up
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!canvasRef.current || !dragRef.current.pointerDown || e.buttons === 0) {
              dragRef.current.active = false;
              dragRef.current.pointerDown = false;
              dragRef.current.dragStarted = false;
              return;
          }
          const { mode, startX, startY, initialElements, handle } = dragRef.current;
          const scale = zoomLevel;
          const deltaXRaw = (e.clientX - startX) / scale;
          const deltaYRaw = (e.clientY - startY) / scale;

          if (!dragRef.current.active) {
              const distanceMoved = Math.max(Math.abs(deltaXRaw), Math.abs(deltaYRaw));
              if (distanceMoved < DRAG_ACTIVATION_DISTANCE) return;
              dragRef.current.active = true;
              dragRef.current.dragStarted = true;
          }

          const newSlides = [...slides];
          const slide = newSlides[activeSlideIdx];

          if (mode === 'drag') {
              const selectedInitials = Object.keys(initialElements).map(id => initialElements[id]);
              if (selectedInitials.length === 0) return;

              const selectionBox = selectedInitials.reduce((box, el) => ({
                  minX: Math.min(box.minX, el.x),
                  minY: Math.min(box.minY, el.y),
                  maxX: Math.max(box.maxX, el.x + el.w),
                  maxY: Math.max(box.maxY, el.y + el.h),
              }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

              let deltaX = deltaXRaw;
              let deltaY = deltaYRaw;
              const nextGuides: { vertical?: number; horizontal?: number } = {};

              const selectionWidth = selectionBox.maxX - selectionBox.minX;
              const selectionHeight = selectionBox.maxY - selectionBox.minY;

              const checkSnap = (target: number, current: number, axis: 'x' | 'y') => {
                  const diff = target - current;
                  if (Math.abs(diff) <= GUIDE_SNAP_THRESHOLD) {
                      if (axis === 'x') {
                          deltaX += diff;
                          nextGuides.vertical = target;
                      } else {
                          deltaY += diff;
                          nextGuides.horizontal = target;
                      }
                  }
              };

              const others = slide.elements.filter(el => !initialElements[el.id]);

              const selectionLeft = selectionBox.minX + deltaX;
              const selectionRight = selectionBox.minX + selectionWidth + deltaX;
              const selectionCenterX = selectionBox.minX + selectionWidth / 2 + deltaX;
              const selectionTop = selectionBox.minY + deltaY;
              const selectionBottom = selectionBox.minY + selectionHeight + deltaY;
              const selectionCenterY = selectionBox.minY + selectionHeight / 2 + deltaY;

              const snapTargetsX: number[] = [CANVAS_WIDTH / 2];
              const snapTargetsY: number[] = [CANVAS_HEIGHT / 2];

              others.forEach(other => {
                  snapTargetsX.push(other.x, other.x + other.w / 2, other.x + other.w);
                  snapTargetsY.push(other.y, other.y + other.h / 2, other.y + other.h);
              });

              snapTargetsX.forEach(target => {
                  checkSnap(target, selectionLeft, 'x');
                  checkSnap(target, selectionCenterX, 'x');
                  checkSnap(target, selectionRight, 'x');
              });

              snapTargetsY.forEach(target => {
                  checkSnap(target, selectionTop, 'y');
                  checkSnap(target, selectionCenterY, 'y');
                  checkSnap(target, selectionBottom, 'y');
              });

              slide.elements = slide.elements.map(el => {
                  if (initialElements[el.id]) {
                      const init = initialElements[el.id];
                      let newX = init.x + deltaX;
                      let newY = init.y + deltaY;
                      if (showGrid) {
                          newX = Math.round(newX / SNAP_GRID) * SNAP_GRID;
                          newY = Math.round(newY / SNAP_GRID) * SNAP_GRID;
                      }
                      return { ...el, x: newX, y: newY };
                  }
                  return el;
              });

              setGuides(nextGuides);
          } else if (mode === 'resize') {
              const id = Object.keys(initialElements)[0];
              const init = initialElements[id];
              const deltaX = deltaXRaw;
              const deltaY = deltaYRaw;

              const elIdx = slide.elements.findIndex(x => x.id === id);
              if (elIdx === -1) return;

              let { x, y, w, h } = init;

              if (handle?.includes('e')) w = Math.max(10, w + deltaX);
              if (handle?.includes('s')) h = Math.max(10, h + deltaY);
              if (handle?.includes('w')) {
                  const newW = Math.max(10, w - deltaX);
                  x = x + (w - newW);
                  w = newW;
              }
              if (handle?.includes('n')) {
                  const newH = Math.max(10, h - deltaY);
                  y = y + (h - newH);
                  h = newH;
              }

              if (showGrid) {
                  w = Math.round(w / SNAP_GRID) * SNAP_GRID;
                  h = Math.round(h / SNAP_GRID) * SNAP_GRID;
                  x = Math.round(x / SNAP_GRID) * SNAP_GRID;
                  y = Math.round(y / SNAP_GRID) * SNAP_GRID;
              }

              slide.elements[elIdx] = { ...slide.elements[elIdx], x, y, w, h };
          } else if (mode === 'rotate') {
             const id = Object.keys(initialElements)[0];
             const init = initialElements[id];
             const elIdx = slide.elements.findIndex(x => x.id === id);
             if (elIdx === -1) return;

             const rect = canvasRef.current.getBoundingClientRect();
             const elCenterX = (init.x + init.w/2) * scale + rect.left;
             const elCenterY = (init.y + init.h/2) * scale + rect.top;

             const angle = Math.atan2(e.clientY - elCenterY, e.clientX - elCenterX) * (180 / Math.PI);
             const rotation = (angle + 90) % 360;

             slide.elements[elIdx].style = { ...slide.elements[elIdx].style, rotation };
          } else {
              setGuides({});
          }

          setSlides(newSlides);
      };

      const handleMouseUp = () => {
          const wasDragging = dragRef.current.active && dragRef.current.dragStarted;
          dragRef.current.active = false;
          dragRef.current.pointerDown = false;
          dragRef.current.dragStarted = false;
          setGuides({});
          if (wasDragging) {
              saveToHistory(slides); // Save state after drag end
          }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [slides, activeSlideIdx, zoomLevel, showGrid]);


  // --- DEEP PPTX IMPORT (Recursive & Async) ---
  const handlePptxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPptx(true);
    
    try {
        if (!window.JSZip) throw new Error("JSZip library not loaded");

        const zip = await window.JSZip.loadAsync(file);
        
        // 1. GET PRESENTATION SIZE - Use UNIFORM SCALE to prevent distortion
        let scale = 1;
        const presentationXml = await zip.file("ppt/presentation.xml")?.async("string");
        if (presentationXml) {
             const parser = new DOMParser();
             const xmlDoc = parser.parseFromString(presentationXml, "text/xml");
             const sldSz = xmlDoc.getElementsByTagName("p:sldSz")[0];
             if (sldSz) {
                 const cx = parseInt(sldSz.getAttribute("cx") || "0");
                 const cy = parseInt(sldSz.getAttribute("cy") || "0");
                 const pptWidthPx = emuToPx(cx);
                 const pptHeightPx = emuToPx(cy);
                 if (pptWidthPx > 0 && pptHeightPx > 0) {
                     // Use MINIMUM scale to ensure everything fits within canvas (letterbox if needed)
                     const scaleX = CANVAS_WIDTH / pptWidthPx;
                     const scaleY = CANVAS_HEIGHT / pptHeightPx;
                     scale = Math.min(scaleX, scaleY);
                 }
             }
        }

        const slideFiles = Object.keys(zip.files).filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/));
        slideFiles.sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)\.xml/)![1]);
            const numB = parseInt(b.match(/slide(\d+)\.xml/)![1]);
            return numA - numB;
        });

        const newSlides: ReportSlide[] = [];

        const parseRelMap = (relsXml?: string | null) => {
            const relMap: Record<string, string> = {};
            if (!relsXml) return relMap;
            const relsDoc = new DOMParser().parseFromString(relsXml, "text/xml");
            const rels = relsDoc.getElementsByTagName("Relationship");
            for (let r = 0; r < rels.length; r++) {
                const id = rels[r].getAttribute("Id");
                const target = rels[r].getAttribute("Target");
                if (id && target) relMap[id] = target;
            }
            return relMap;
        };

        const normalizeTarget = (targetPath: string, base: 'slide' | 'layout' | 'master') => {
            if (targetPath.startsWith("..")) return targetPath.replace("..", "ppt");
            if (base === 'slide') return `ppt/slides/${targetPath}`;
            if (base === 'layout') return `ppt/slideLayouts/${targetPath}`;
            return `ppt/slideMasters/${targetPath}`;
        };

        const extractBackground = async (xmlDoc: Document, relMap: Record<string, string>) => {
            const bgElements = xmlDoc.getElementsByTagName("p:bg");
            if (bgElements.length > 0) {
                const bgFill = bgElements[0].getElementsByTagName("p:bgPr")[0];
                if (bgFill) {
                    // Solid color background
                    const solidFill = bgFill.getElementsByTagName("a:solidFill")[0];
                    const colorFill = parsePptxColor(solidFill);
                    if (colorFill) return colorFill;

                    // Image background
                    const blipFill = bgFill.getElementsByTagName("a:blipFill")[0];
                    if (blipFill) {
                        const blip = blipFill.getElementsByTagName("a:blip")[0];
                        const embedId = blip?.getAttribute("r:embed");
                        if (embedId && relMap[embedId]) {
                            const targetPath = normalizeTarget(relMap[embedId], 'slide');
                            const bgFile = zip.file(targetPath);
                            if (bgFile) {
                                const base64 = await bgFile.async("base64");
                                const ext = targetPath.split('.').pop() || 'png';
                                const mime = ext === 'jpg' ? 'jpeg' : ext;
                                return `data:image/${mime};base64,${base64}`;
                            }
                        }
                    }
                }
            }
            return undefined;
        };

        // Async Recursive Function
        const traverseShapesAsync = async (
            nodeList: Element[],
            relMap: Record<string, string>,
            groupFrame: GroupTransform | null,
            accumulatedZIndex: { val: number }
        ): Promise<ReportElement[]> => {
            const elements: ReportElement[] = [];

            for (let i = 0; i < nodeList.length; i++) {
                const node = nodeList[i];
                const nodeName = node.nodeName;

                let spPr = node.getElementsByTagName("p:spPr")[0];
                if (nodeName === 'p:grpSp') spPr = node.getElementsByTagName("p:grpSpPr")[0];
                if (nodeName === 'p:cxnSp') spPr = node.getElementsByTagName("p:spPr")[0];

                if (!spPr) continue;

                const xFrm = spPr.getElementsByTagName("a:xfrm")[0];
                let x = 0, y = 0, w = 0, h = 0;
                let rot = 0;
                
                if (xFrm) {
                    const off = xFrm.getElementsByTagName("a:off")[0];
                    const ext = xFrm.getElementsByTagName("a:ext")[0];
                    if (off) {
                        x = emuToPx(off.getAttribute("x"));
                        y = emuToPx(off.getAttribute("y"));
                    }
                    if (ext) {
                        w = emuToPx(ext.getAttribute("cx"));
                        h = emuToPx(ext.getAttribute("cy"));
                    }
                    const rotAttr = xFrm.getAttribute("rot");
                    if (rotAttr) rot = parseInt(rotAttr) / 60000;
                }

                // Coordinate Mapping (Group Handling)
                let screenX = x;
                let screenY = y;
                let screenW = w;
                let screenH = h;

                if (groupFrame) {
                    const scaleW = groupFrame.w / groupFrame.chW;
                    const scaleH = groupFrame.h / groupFrame.chH;
                    screenX = groupFrame.x + (x - groupFrame.chX) * scaleW;
                    screenY = groupFrame.y + (y - groupFrame.chY) * scaleH;
                    screenW = w * scaleW;
                    screenH = h * scaleH;
                }

                // Apply Global Scale (Canvas Fitting)
                // Note: If inside a group, the GroupFrame logic already converts it to "Canvas Space" relative to parent.
                // But the raw X/Y inputs to GroupFrame should be unscaled by canvas first?
                // Actually, the simplest way is to treat groupFrame in "Target Pixel Space" (Post-ScaleX/Y).
                // Let's check:
                // If Top Level: x, y are raw pixels. We multiply by scaleX/Y to fit canvas.
                // If Child: x, y are raw pixels relative to group.
                //
                // Correct Logic:
                // 1. If groupFrame is NULL (Top Level):
                //    FinalX = x * scaleX
                //    FinalY = y * scaleY
                //    FinalW = w * scaleX
                // 2. If groupFrame EXISTS (Child):
                //    We calculate screenX based on groupFrame (which is already in Final Canvas Space).
                
                let finalX, finalY, finalW, finalH;

                if (groupFrame) {
                   // groupFrame is already in Final Canvas Coordinates
                   const scaleW = groupFrame.w / groupFrame.chW;
                   const scaleH = groupFrame.h / groupFrame.chH;
                   finalX = groupFrame.x + (x - groupFrame.chX) * scaleW;
                   finalY = groupFrame.y + (y - groupFrame.chY) * scaleH;
                   finalW = w * scaleW;
                   finalH = h * scaleH;
                } else {
                   // Top Level - Use uniform scale
                   finalX = x * scale;
                   finalY = y * scale;
                   finalW = w * scale;
                   finalH = h * scale;
                }

                // BOUNDS CHECKING - Clamp to canvas boundaries
                finalX = Math.max(0, Math.min(finalX, CANVAS_WIDTH));
                finalY = Math.max(0, Math.min(finalY, CANVAS_HEIGHT));
                finalW = Math.max(1, Math.min(finalW, CANVAS_WIDTH - finalX));
                finalH = Math.max(1, Math.min(finalH, CANVAS_HEIGHT - finalY));

                accumulatedZIndex.val += 1;
                const zIndex = accumulatedZIndex.val;

                // --- RECURSIVE GROUP ---
                if (nodeName === "p:grpSp") {
                    const chOff = xFrm?.getElementsByTagName("a:chOff")[0];
                    const chExt = xFrm?.getElementsByTagName("a:chExt")[0];
                    let chX = 0, chY = 0, chW = 1, chH = 1;
                    if (chOff) { chX = emuToPx(chOff.getAttribute("x")); chY = emuToPx(chOff.getAttribute("y")); }
                    if (chExt) { chW = emuToPx(chExt.getAttribute("cx")); chH = emuToPx(chExt.getAttribute("cy")); }

                    const childNodes = Array.from(node.childNodes).filter(n => n.nodeType === 1) as Element[];
                    
                    // Pass the FINAL CANVAS COORDS of this group as the frame for children
                    const newFrame: GroupTransform = {
                        x: finalX, y: finalY, w: finalW, h: finalH,
                        chX, chY, chW, chH
                    };

                    const children = await traverseShapesAsync(childNodes, relMap, newFrame, accumulatedZIndex);
                    elements.push(...children);
                    continue;
                }

                // --- TABLE ---
                if (nodeName === "p:graphicFrame") {
                    const graphic = node.getElementsByTagName("a:graphic")[0];
                    const graphicData = graphic?.getElementsByTagName("a:graphicData")[0];
                    const tbl = graphicData?.getElementsByTagName("a:tbl")[0];

                    if (tbl) {
                        // Parse Table
                        const tblGrid = tbl.getElementsByTagName("a:tblGrid")[0];
                        const gridCols = tblGrid?.getElementsByTagName("a:gridCol");
                        const columnWidths: number[] = [];
                        let totalWidth = 0;

                        if (gridCols) {
                            for (let c = 0; c < gridCols.length; c++) {
                                const w = emuToPx(gridCols[c].getAttribute("w"));
                                columnWidths.push(w);
                                totalWidth += w;
                            }
                        }

                        // Convert to percentages
                        const colWidthsPercent = columnWidths.map(w => (w / totalWidth) * 100);

                        const tableRows: TableCell[][] = [];
                        const trs = tbl.getElementsByTagName("a:tr");

                        for (let r = 0; r < trs.length; r++) {
                            const tr = trs[r];
                            const rowCells: TableCell[] = [];
                            const tcs = tr.getElementsByTagName("a:tc");

                            for (let c = 0; c < tcs.length; c++) {
                                const tc = tcs[c];
                                const txBody = tc.getElementsByTagName("a:txBody")[0];
                                let cellText = "";

                                if (txBody) {
                                    const paragraphs = Array.from(txBody.getElementsByTagName("a:p"));
                                    cellText = paragraphs.map(p => {
                                        return Array.from(p.getElementsByTagName("a:t")).map(t => t.textContent).join("");
                                    }).join("\n");
                                }

                                // Get cell properties
                                const gridSpan = tc.getAttribute("gridSpan");
                                const rowSpan = tc.getAttribute("rowSpan");
                                const tcPr = tc.getElementsByTagName("a:tcPr")[0];
                                const solidFill = tcPr?.getElementsByTagName("a:solidFill")[0];
                                const bgColor = parsePptxColor(solidFill);

                                rowCells.push({
                                    text: cellText,
                                    colSpan: gridSpan ? parseInt(gridSpan) : undefined,
                                    rowSpan: rowSpan ? parseInt(rowSpan) : undefined,
                                    style: {
                                        backgroundColor: bgColor,
                                        fontSize: `${8 * scale}px`,
                                        color: '#333'
                                    }
                                });
                            }
                            tableRows.push(rowCells);
                        }

                        elements.push({
                            id: `table-${Date.now()}-${zIndex}`,
                            type: 'table',
                            tableData: {
                                rows: tableRows,
                                columnWidths: colWidthsPercent
                            },
                            x: finalX, y: finalY, w: finalW, h: finalH,
                            zIndex,
                            style: { opacity: 1, rotation: rot }
                        });
                        continue;
                    }

                    // --- EMBEDDED CHART (Simplified Fallback) ---
                    const chart = graphicData?.getElementsByTagName("c:chart")[0];
                    if (chart) {
                        // For now, create a placeholder - full chart parsing is complex
                        // Would need to parse xl/charts/chart1.xml and xl/worksheets/sheet1.xml
                        elements.push({
                            id: `chart-${Date.now()}-${zIndex}`,
                            type: 'chart',
                            chartData: {
                                chartType: 'bar',
                                data: [
                                    { name: 'A', value: 100 },
                                    { name: 'B', value: 200 },
                                    { name: 'C', value: 150 }
                                ],
                                title: 'Embedded Chart'
                            },
                            x: finalX, y: finalY, w: finalW, h: finalH,
                            zIndex,
                            style: { opacity: 1, rotation: rot }
                        });
                        continue;
                    }
                }
                // --- PICTURE ---
                else if (nodeName === "p:pic") {
                    const blipFill = node.getElementsByTagName("p:blipFill")[0];
                    const blip = blipFill?.getElementsByTagName("a:blip")[0];
                    const embedId = blip?.getAttribute("r:embed");

                    if (embedId && relMap[embedId]) {
                        let targetPath = relMap[embedId];
                        if (targetPath.startsWith("..")) targetPath = targetPath.replace("..", "ppt");
                        else targetPath = "ppt/slides/" + targetPath;

                        const imgFile = zip.file(targetPath);
                        if (imgFile) {
                            const base64 = await imgFile.async("base64");
                            const ext = targetPath.split('.').pop() || 'png';
                            const mime = ext === 'jpg' ? 'jpeg' : ext;

                            elements.push({
                                id: `img-${Date.now()}-${zIndex}`,
                                type: 'image',
                                content: `data:image/${mime};base64,${base64}`,
                                x: finalX, y: finalY, w: finalW, h: finalH,
                                zIndex,
                                style: { opacity: 1, rotation: rot }
                            });
                        }
                    }
                }
                // --- TEXT & SHAPES ---
                else if (nodeName === "p:sp" || nodeName === "p:cxnSp") {
                    const txBody = node.getElementsByTagName("p:txBody")[0];
                    const spSolidFill = spPr.getElementsByTagName("a:solidFill")[0];
                    const bgCol = parsePptxColor(spSolidFill);
                    
                    const ln = spPr.getElementsByTagName("a:ln")[0];
                    const lnFill = ln?.getElementsByTagName("a:solidFill")[0];
                    const stroke = parsePptxColor(lnFill);
                    const strokeW = ln ? (emuToPx(ln.getAttribute("w")) || 1) * scale : 0;

                    const prstGeom = spPr.getElementsByTagName("a:prstGeom")[0];
                    const geomType = prstGeom?.getAttribute("prst");

                    if (txBody) {
                        const paragraphs = Array.from(txBody.getElementsByTagName("a:p"));
                        let fullText = "";
                        let fontSize = 16 * scale;
                        let fontColor = "#333333";
                        let isBold = false;
                        let fontFamily: string | undefined = undefined;
                        let align = 'left';

                        if (paragraphs.length > 0) {
                            const pPr = paragraphs[0].getElementsByTagName("a:pPr")[0];
                            if (pPr) {
                                const algn = pPr.getAttribute("algn");
                                if (algn === 'ctr') align = 'center';
                                if (algn === 'r') align = 'right';
                                if (algn === 'j') align = 'justify';
                            }
                            const runs = Array.from(paragraphs[0].getElementsByTagName("a:r"));
                            if (runs.length > 0) {
                                const rPr = runs[0].getElementsByTagName("a:rPr")[0];
                                if (rPr) {
                                    const sz = rPr.getAttribute("sz");
                                    if (sz) fontSize = (parseInt(sz) / 100) * scale;
                                    const solidFill = rPr.getElementsByTagName("a:solidFill")[0];
                                    const color = parsePptxColor(solidFill);
                                    if (color) fontColor = color;
                                    if (rPr.getAttribute("b") === "1") isBold = true;
                                    const latin = rPr.getElementsByTagName("a:latin")[0];
                                    const typeface = latin?.getAttribute("typeface");
                                    if (typeface) fontFamily = typeface;
                                }
                            }
                        }

                        fullText = paragraphs.map(p => {
                            return Array.from(p.getElementsByTagName("a:t")).map(t => t.textContent).join("");
                        }).join("\n");

                        if (fullText.trim()) {
                            elements.push({
                                id: `txt-${Date.now()}-${zIndex}`,
                                type: 'text',
                                content: fullText,
                                x: finalX, y: finalY, w: finalW, h: finalH,
                                zIndex,
                                style: {
                                    fontSize: `${Math.max(10, fontSize)}px`,
                                    color: fontColor,
                                    fontWeight: isBold ? 'bold' : 'normal',
                                    backgroundColor: bgCol,
                                    fontFamily,
                                    textAlign: align as any,
                                    rotation: rot
                                }
                            });
                        } else {
                            if (bgCol || stroke) {
                                elements.push({
                                    id: `shp-box-${Date.now()}-${zIndex}`,
                                    type: 'shape',
                                    shapeType: 'rect',
                                    x: finalX, y: finalY, w: finalW, h: finalH,
                                    zIndex,
                                    style: { fill: bgCol || 'transparent', stroke, strokeWidth: strokeW, rotation: rot }
                                });
                            }
                        }
                    } else {
                        let shapeType: ShapeType = 'rect';
                        if (geomType === 'ellipse') shapeType = 'circle';
                        if (geomType === 'triangle') shapeType = 'triangle';
                        if (geomType === 'line' || geomType === 'straightConnector1') shapeType = 'line';
                        
                        elements.push({
                            id: `shp-${Date.now()}-${zIndex}`,
                            type: 'shape',
                            shapeType,
                            x: finalX, y: finalY, w: finalW, h: finalH,
                            zIndex,
                            style: {
                                fill: bgCol || (shapeType === 'line' ? stroke : '#cccccc'),
                                stroke: stroke || 'none',
                                strokeWidth: strokeW,
                                rotation: rot
                            }
                        });
                    }
                }
            }
            return elements;
        };

        const extractElementsFromDoc = async (
            xmlDoc: Document,
            relMap: Record<string, string>,
            zOffset: number
        ) => {
            const shapeTree = xmlDoc.getElementsByTagName("p:spTree")[0];
            if (!shapeTree) return [] as ReportElement[];
            const children = Array.from(shapeTree.childNodes).filter(n => n.nodeType === 1) as Element[];
            const elements = await traverseShapesAsync(children, relMap, null, { val: zOffset });
            return elements;
        };

        for (const fileName of slideFiles) {
            const slideXmlStr = await zip.file(fileName)?.async("string");
            if (!slideXmlStr) continue;

            const slideNum = fileName.match(/slide(\d+)\.xml/)![1];
            const relsName = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
            const relsXmlStr = await zip.file(relsName)?.async("string");
            const relMap = parseRelMap(relsXmlStr);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(slideXmlStr, "text/xml");

            // Layout + Master
            const relsDoc = relsXmlStr ? new DOMParser().parseFromString(relsXmlStr, "text/xml") : null;
            const layoutRel = relsDoc?.querySelector("Relationship[Type$='slideLayout']");
            const layoutTarget = layoutRel ? normalizeTarget(layoutRel.getAttribute("Target") || '', 'layout') : null;

            const layoutXmlStr = layoutTarget ? await zip.file(layoutTarget)?.async("string") : null;
            const layoutRelsStr = layoutTarget ? await zip.file(`${layoutTarget.replace('ppt/slideLayouts/', 'ppt/slideLayouts/_rels/')}.rels`)?.async("string") : null;
            const layoutRelMap = parseRelMap(layoutRelsStr);

            let masterXmlStr: string | null = null;
            let masterRelMap: Record<string, string> = {};
            if (layoutRelsStr) {
                const layoutRelsDoc = new DOMParser().parseFromString(layoutRelsStr, "text/xml");
                const masterRel = layoutRelsDoc.querySelector("Relationship[Type$='slideMaster']");
                const masterTarget = masterRel ? normalizeTarget(masterRel.getAttribute("Target") || '', 'master') : null;
                if (masterTarget) {
                    masterXmlStr = await zip.file(masterTarget)?.async("string") || null;
                    const masterRelsStr = await zip.file(`${masterTarget.replace('ppt/slideMasters/', 'ppt/slideMasters/_rels/')}.rels`)?.async("string");
                    masterRelMap = parseRelMap(masterRelsStr);
                }
            }

            // Resolve Background Priority: slide -> layout -> master
            let slideBackground = await extractBackground(xmlDoc, relMap);
            if (!slideBackground && layoutXmlStr) {
                slideBackground = await extractBackground(new DOMParser().parseFromString(layoutXmlStr, "text/xml"), layoutRelMap);
            }
            if (!slideBackground && masterXmlStr) {
                slideBackground = await extractBackground(new DOMParser().parseFromString(masterXmlStr, "text/xml"), masterRelMap);
            }

            // Gather elements from master/layout/slide to keep brand assets
            let aggregatedElements: ReportElement[] = [];
            if (masterXmlStr) {
                const masterDoc = new DOMParser().parseFromString(masterXmlStr, "text/xml");
                aggregatedElements = aggregatedElements.concat(await extractElementsFromDoc(masterDoc, masterRelMap, aggregatedElements.length));
            }
            if (layoutXmlStr) {
                const layoutDoc = new DOMParser().parseFromString(layoutXmlStr, "text/xml");
                aggregatedElements = aggregatedElements.concat(await extractElementsFromDoc(layoutDoc, layoutRelMap, aggregatedElements.length));
            }

            const slideElements = await extractElementsFromDoc(xmlDoc, relMap, aggregatedElements.length);
            aggregatedElements = aggregatedElements.concat(slideElements);

            aggregatedElements = aggregatedElements.map((el, idx) => ({ ...el, zIndex: idx + 1 }));

            if (aggregatedElements.length > 0 || slideBackground) {
                newSlides.push({
                    id: `slide-${Date.now()}-${newSlides.length}`,
                    elements: aggregatedElements,
                    background: slideBackground
                });
            }
        }
        
        if (newSlides.length > 0) {
            updateSlides([...slides, ...newSlides]);
            setActiveSlideIdx(slides.length); 
            showToast("Deep Import Successful", `Extracted ${newSlides.length} slides with complex layout support.`, "success");
        } else {
             showToast("Import Warning", "No valid slides found.", "warning");
        }

    } catch (err: any) {
        console.error("PPTX Deep Import Error:", err);
        showToast("Import Failed", `Parsing Error: ${err.message}`, "error");
    } finally {
        setIsProcessingPptx(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Handlers ---
  const handleSave = async () => {
      const updated = { ...project, reportConfig: slides };
      onUpdateProject(updated);
      await saveProject(updated);
      showToast("Saved", "Report configuration saved.", "success");
  };

  const handleExport = async () => {
      setIsExporting(true);
      showToast("Exporting...", "Generating PowerPoint file...", "info");
      try {
          await generateCustomReport(project, slides, CANVAS_WIDTH, CANVAS_HEIGHT);
          showToast("Export Complete", "Download started.", "success");
      } catch (err: any) {
          console.error('Export failed', err);
          const message = err?.issues?.[0] || err?.message || "Unable to generate PPTX.";
          showToast("Export Failed", message, "error");
      } finally {
          setIsExporting(false);
      }
  };

  // --- Renderers ---

  const renderElement = (el: ReportElement) => {
      const isSelected = selectedElementIds.has(el.id);
      const isPrimary = el.id === primarySelectedId;
      const rot = el.style?.rotation || 0;

      return (
          <div
            key={el.id}
            id={`element-${el.id}`} // Critical for Export finding the element
            onMouseDown={(e) => handleElementMouseDown(e, el.id)}
            style={{
                position: 'absolute',
                left: el.x, top: el.y, width: el.w, height: el.h,
                zIndex: el.zIndex,
                transform: `rotate(${rot}deg)`,
                cursor: 'move'
            }}
            className={`group ${isSelected ? 'z-[100]' : ''}`}
          >
              <div className={`w-full h-full relative ${isSelected ? 'outline outline-2 outline-blue-500' : 'hover:outline hover:outline-1 hover:outline-blue-300'}`}>
                  
                  <ElementContent el={el} project={project} data={finalData} />
                  
                  {/* Text Edit Overlay */}
                  {el.type === 'text' && isSelected && (
                      <textarea
                        value={el.content}
                        onChange={(e) => {
                             const newSlides = [...slides];
                             const target = newSlides[activeSlideIdx].elements.find(x => x.id === el.id);
                             if (target) target.content = e.target.value;
                             setSlides(newSlides);
                        }}
                        className="absolute inset-0 bg-transparent resize-none outline-none text-transparent caret-black cursor-text z-20"
                        style={{
                            fontSize: el.style?.fontSize,
                            fontFamily: el.style?.fontFamily,
                            textAlign: el.style?.textAlign,
                            lineHeight: 'normal'
                        }}
                        spellCheck={false}
                      />
                  )}

                  {/* Controls (Only Primary Selection) */}
                  {isPrimary && (
                      <>
                        <div onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nw-resize z-50" />
                        <div onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 cursor-ne-resize z-50" />
                        <div onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 cursor-sw-resize z-50" />
                        <div onMouseDown={(e) => handleResizeMouseDown(e, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 cursor-se-resize z-50" />
                        <div onMouseDown={(e) => handleRotateMouseDown(e)} className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-blue-500 rounded-full cursor-grab z-50 flex items-center justify-center shadow-sm">
                            <RotateCw className="w-3 h-3 text-blue-600" />
                        </div>
                      </>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 font-sans" onClick={() => setActiveMenu(null)}>

      {/* 1. Main Toolbar (Google Slides style) */}
      <div className="bg-white border-b border-gray-200 flex flex-col z-20 shadow-sm flex-shrink-0" ref={menuRef}>
          
          {/* Top Row: Menus & File Name */}
          <div className="h-10 flex items-center px-4 border-b border-gray-100">
              <div className="flex items-center mr-6">
                 <div className="bg-orange-500 p-1 rounded text-white mr-2">
                     <Presentation className="w-4 h-4" />
                 </div>
                 <span className="font-semibold text-gray-700 text-sm">{project.name}</span>
              </div>
              
              {/* Menu Bar */}
              <div className="flex space-x-1 text-xs text-gray-700">
                  {/* FILE MENU */}
                  <div className="relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}
                        className={`px-3 py-1.5 rounded hover:bg-gray-100 transition-colors ${activeMenu === 'file' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        File
                      </button>
                      {activeMenu === 'file' && (
                          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 shadow-xl rounded-lg py-1 z-50 animate-in fade-in zoom-in duration-100">
                              <button onClick={handleSave} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center">
                                  <Save className="w-4 h-4 mr-3 text-gray-500" /> Save Project
                              </button>
                              <div className="border-t border-gray-100 my-1"></div>
                              <button onClick={handleExport} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center">
                                  <Download className="w-4 h-4 mr-3 text-gray-500" /> Download as PPTX
                              </button>
                          </div>
                      )}
                  </div>

                  {/* Other Placeholder Menus */}
                  {['Edit', 'View', 'Insert', 'Format', 'Slide', 'Arrange', 'Tools'].map(menu => (
                      <button key={menu} className="px-3 py-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600">
                          {menu}
                      </button>
                  ))}
              </div>

              <div className="flex-1"></div>
              
              {/* Quick Save/Export Actions */}
              <div className="flex items-center space-x-2">
                   {isProcessingPptx && <span className="text-xs text-blue-600 animate-pulse mr-2">Importing Slides...</span>}
                   <button onClick={handleSave} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="Save">
                       <Cloud className="w-5 h-5" />
                   </button>
                   <button onClick={handleExport} className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium shadow-sm transition-colors">
                       Export
                   </button>
              </div>
          </div>

          {/* Bottom Row: Actions */}
          <div className="h-10 flex items-center px-2 space-x-1 bg-gray-50/50">
             
             {/* History */}
             <button onClick={undo} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30" title="Undo"><Undo2 className="w-4 h-4" /></button>
             <button onClick={redo} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30" title="Redo"><Redo2 className="w-4 h-4" /></button>
             <div className="w-px h-5 bg-gray-300 mx-1"></div>

             {/* Insert */}
             <button onClick={() => addElement('text')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Text Box"><Type className="w-4 h-4" /></button>
             <label className="p-1.5 hover:bg-gray-200 rounded text-gray-600 cursor-pointer" title="Image">
                 <ImageIcon className="w-4 h-4" />
                 <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                     const file = e.target.files?.[0];
                     if(file) {
                         const reader = new FileReader();
                         reader.onload = () => addElement('image', null, reader.result);
                         reader.readAsDataURL(file);
                     }
                 }} />
             </label>
             
             <div className="relative group">
                 <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 flex items-center"><Square className="w-4 h-4" /></button>
                 <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-lg rounded p-1 hidden group-hover:grid grid-cols-3 gap-1 z-50">
                     <button onClick={() => addElement('shape', 'rect')} className="p-1 hover:bg-blue-50 rounded"><Square className="w-4 h-4" /></button>
                     <button onClick={() => addElement('shape', 'circle')} className="p-1 hover:bg-blue-50 rounded"><Circle className="w-4 h-4" /></button>
                     <button onClick={() => addElement('shape', 'triangle')} className="p-1 hover:bg-blue-50 rounded"><Triangle className="w-4 h-4" /></button>
                     <button onClick={() => addElement('shape', 'star')} className="p-1 hover:bg-blue-50 rounded"><Star className="w-4 h-4" /></button>
                 </div>
             </div>
             
             <button onClick={() => addElement('shape', 'line')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Line"><Minus className="w-4 h-4" /></button>
             <button onClick={() => addElement('shape', 'arrow')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Arrow"><ArrowRight className="w-4 h-4" /></button>

             <div className="w-px h-5 bg-gray-300 mx-1"></div>

             {/* Style Controls (Contextual) */}
             <div className="flex items-center space-x-1">
                 {primaryElement && (
                    <>
                        {/* Fill Color */}
                        <div className="relative group">
                            <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 flex items-center border-b-2" style={{borderBottomColor: primaryElement.style?.fill || '#000'}}>
                                <PaintBucket className="w-4 h-4" />
                            </button>
                            <input 
                                type="color" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => updateElementStyle('fill', e.target.value)}
                            />
                        </div>

                        {/* Stroke Color */}
                        <div className="relative group">
                            <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 flex items-center border-b-2" style={{borderBottomColor: primaryElement.style?.stroke || '#000'}}>
                                <Highlighter className="w-4 h-4" />
                            </button>
                            <input 
                                type="color" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => updateElementStyle('stroke', e.target.value)}
                            />
                        </div>

                        <div className="w-px h-5 bg-gray-300 mx-1"></div>
                        
                        {/* Text Styles */}
                        {primaryElement.type === 'text' && (
                            <>
                                <select 
                                    className="h-6 text-xs border border-gray-300 rounded bg-white"
                                    value={primaryElement.style?.fontSize}
                                    onChange={(e) => updateElementStyle('fontSize', e.target.value)}
                                >
                                    {[10,12,14,16,18,24,36,48,72].map(s => <option key={s} value={`${s}px`}>{s}</option>)}
                                </select>
                                <button onClick={() => updateElementStyle('fontWeight', primaryElement.style?.fontWeight === 'bold' ? 'normal' : 'bold')} className={`p-1 rounded ${primaryElement.style?.fontWeight === 'bold' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}><Bold className="w-3 h-3" /></button>
                                <button onClick={() => updateElementStyle('fontStyle', primaryElement.style?.fontStyle === 'italic' ? 'normal' : 'italic')} className={`p-1 rounded ${primaryElement.style?.fontStyle === 'italic' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}><Italic className="w-3 h-3" /></button>
                                <input type="color" className="w-6 h-6 border-0 p-0" value={primaryElement.style?.color} onChange={(e) => updateElementStyle('color', e.target.value)} />
                            </>
                        )}
                        
                        <div className="w-px h-5 bg-gray-300 mx-1"></div>

                        {/* Ordering */}
                        <button onClick={bringToFront} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Bring to Front"><BringToFront className="w-4 h-4" /></button>
                        <button onClick={sendToBack} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Send to Back"><SendToBack className="w-4 h-4" /></button>

                        <div className="w-px h-5 bg-gray-300 mx-1"></div>

                        {/* Align & Distribute */}
                        <button disabled={selectionCount < 2} onClick={() => alignSelected('left')} className={`p-1.5 rounded ${selectionCount < 2 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Align Left"><AlignLeft className="w-4 h-4" /></button>
                        <button disabled={selectionCount < 2} onClick={() => alignSelected('center')} className={`p-1.5 rounded ${selectionCount < 2 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Align Center"><AlignCenter className="w-4 h-4" /></button>
                        <button disabled={selectionCount < 2} onClick={() => alignSelected('right')} className={`p-1.5 rounded ${selectionCount < 2 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Align Right"><AlignRight className="w-4 h-4" /></button>
                        <button disabled={selectionCount < 2} onClick={() => alignSelected('top')} className={`p-1.5 rounded ${selectionCount < 2 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Align Top"><Move className="w-4 h-4 rotate-90" /></button>
                        <button disabled={selectionCount < 2} onClick={() => alignSelected('middle')} className={`p-1.5 rounded ${selectionCount < 2 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Align Middle"><Move className="w-4 h-4 rotate-45" /></button>
                        <button disabled={selectionCount < 2} onClick={() => alignSelected('bottom')} className={`p-1.5 rounded ${selectionCount < 2 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Align Bottom"><Move className="w-4 h-4" /></button>
                        <button disabled={selectionCount < 3} onClick={() => distributeSelected('horizontal')} className={`px-2 py-1 rounded text-[11px] font-medium ${selectionCount < 3 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Distribute Horizontally">H⇆</button>
                        <button disabled={selectionCount < 3} onClick={() => distributeSelected('vertical')} className={`px-2 py-1 rounded text-[11px] font-medium ${selectionCount < 3 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Distribute Vertically">V⇆</button>

                        <div className="w-px h-5 bg-gray-300 mx-1"></div>

                        {/* Match Size */}
                        <button disabled={selectionCount < 2} onClick={() => matchSize('width')} className={`px-2 py-1 rounded text-[11px] font-medium ${selectionCount < 2 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Match Width">W=</button>
                        <button disabled={selectionCount < 2} onClick={() => matchSize('height')} className={`px-2 py-1 rounded text-[11px] font-medium ${selectionCount < 2 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Match Height">H=</button>
                        <button disabled={selectionCount < 2} onClick={() => matchSize('both')} className={`px-2 py-1 rounded text-[11px] font-medium ${selectionCount < 2 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Match Width & Height">W/H</button>

                        <div className="w-px h-5 bg-gray-300 mx-1"></div>

                        <button onClick={deleteSelection} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </>
                 )}
                 {!primaryElement && (
                    <div className="text-xs text-gray-400 italic px-2">Select an element to edit</div>
                 )}
             </div>

             <div className="flex-1"></div>

             {/* Zoom & View */}
             <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded ${showGrid ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200 text-gray-600'}`} title="Toggle Grid"><Grid3X3 className="w-4 h-4" /></button>
             <button onClick={() => setZoomLevel(z => Math.max(0.2, z - 0.1))} className="p-1.5 hover:bg-gray-200 rounded text-gray-600"><ZoomOut className="w-4 h-4" /></button>
             <span className="text-xs text-gray-500 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
             <button onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.1))} className="p-1.5 hover:bg-gray-200 rounded text-gray-600"><ZoomIn className="w-4 h-4" /></button>
          </div>
      </div>

      {/* 2. Workspace */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Slide Sorter */}
          <div className={`${isLeftSidebarOpen ? 'w-48' : 'w-12'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
              
              {/* Header with Collapser and Actions */}
              <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  {isLeftSidebarOpen && (
                      <div className="flex space-x-1">
                          <button 
                            onClick={() => {
                                const newSlide = { id: `slide-${Date.now()}`, elements: [] };
                                updateSlides([...slides, newSlide]);
                                setActiveSlideIdx(slides.length);
                            }} 
                            className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            title="Add New Slide"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          
                          <label 
                            className="p-1.5 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-100 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Import PPTX Slides"
                          >
                            {isProcessingPptx ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileUp className="w-4 h-4" />}
                            <input 
                                type="file" 
                                accept=".pptx" 
                                className="hidden" 
                                onChange={(e) => { handlePptxUpload(e); }} 
                                disabled={isProcessingPptx} 
                                ref={fileInputRef}
                            />
                          </label>
                      </div>
                  )}
                  <button onClick={() => setLeftSidebarOpen(!isLeftSidebarOpen)} className="p-1 text-gray-400 hover:bg-gray-100 rounded ml-auto">
                      {isLeftSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
              </div>

              {/* Slide List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-gray-50/50">
                  {slides.map((slide, idx) => (
                      <div 
                        key={slide.id}
                        onClick={() => setActiveSlideIdx(idx)}
                        className={`group relative cursor-pointer ${activeSlideIdx === idx ? 'ring-2 ring-blue-500 rounded' : ''}`}
                      >
                          <div className="flex items-center justify-between mb-1 px-1">
                              <span className="text-[10px] font-bold text-gray-500">{idx + 1}</span>
                              {isLeftSidebarOpen && slides.length > 1 && <button 
                                onClick={(e) => { e.stopPropagation(); const n = [...slides]; n.splice(idx, 1); if(n.length) updateSlides(n); }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 text-red-500 rounded"
                              ><Trash2 className="w-3 h-3" /></button>}
                          </div>
                          
                          {/* IMPROVED PREVIEW: Render Real Slide Thumbnail */}
                          <div className="aspect-video bg-white border border-gray-300 shadow-sm relative overflow-hidden">
                              <SlideThumbnail slide={slide} project={project} data={finalData} />
                          </div>

                      </div>
                  ))}
                  
                  {/* Add Button if Collapsed */}
                  {!isLeftSidebarOpen && (
                      <button 
                        onClick={() => {
                            const newSlide = { id: `slide-${Date.now()}`, elements: [] };
                            updateSlides([...slides, newSlide]);
                            setActiveSlideIdx(slides.length);
                        }} 
                        className="w-full py-2 border border-dashed border-gray-300 rounded text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-white transition-colors flex justify-center"
                        title="Add Slide"
                      >
                        <Plus className="w-4 h-4" />
                    </button>
                  )}
              </div>
          </div>

          {/* Center: Canvas */}
          <div 
            className="flex-1 bg-gray-200 overflow-auto relative flex items-center justify-center p-10 custom-scrollbar" 
            onMouseDown={handleStageMouseDown}
          >
              <div
                  className="bg-white shadow-2xl relative transition-transform duration-200 ease-linear origin-center overflow-hidden"
                  style={{
                      width: CANVAS_WIDTH,
                      height: CANVAS_HEIGHT,
                      transform: `scale(${zoomLevel})`,
                      backgroundColor: activeSlide.background && !activeSlide.background.startsWith('data:image') ? activeSlide.background : 'white'
                  }}
                  ref={canvasRef}
              >
                  {activeSlide.background?.startsWith('data:image') && (
                      <img src={activeSlide.background} className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
                  )}
                  {/* Grid - Only show if enabled */}
                  {showGrid && (
                      <div
                        className="absolute inset-0 pointer-events-none z-0"
                        style={{
                            backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`,
                            backgroundSize: `${SNAP_GRID*2}px ${SNAP_GRID*2}px`
                        }}
                      />
                  )}

                  {/* Snap Guides */}
                  {guides.vertical !== undefined && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-blue-400/60 pointer-events-none"
                        style={{ left: guides.vertical, zIndex: 999 }}
                      />
                  )}
                  {guides.horizontal !== undefined && (
                      <div
                        className="absolute left-0 right-0 h-px bg-blue-400/60 pointer-events-none"
                        style={{ top: guides.horizontal, zIndex: 999 }}
                      />
                  )}

                  {/* Elements */}
                  {activeSlide.elements.map(renderElement)}

                  {/* Empty State */}
                  {activeSlide.elements.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none">
                          <div className="text-center">
                              <MousePointer2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p>Add elements from the toolbar</p>
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* Right: Asset Library */}
          <div className={`${isRightSidebarOpen ? 'w-60' : 'w-0'} bg-white border-l border-gray-200 flex flex-col z-10 shadow-sm transition-all duration-300 overflow-hidden relative`}>
              
              {/* Floating Toggle Button (Always Visible) */}
              <button 
                onClick={() => setRightSidebarOpen(!isRightSidebarOpen)} 
                className="absolute top-2 -left-3 z-50 bg-white border border-gray-200 rounded-full p-0.5 shadow-sm text-gray-500 hover:text-gray-900"
                title={isRightSidebarOpen ? "Collapse Assets" : "Expand Assets"}
              >
                 {isRightSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </button>

              <div className="h-10 border-b border-gray-100 flex items-center px-4 bg-gray-50 flex-shrink-0">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Saved Charts</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {project.dashboard?.map(widget => (
                      <div 
                          key={widget.id}
                          className="bg-white border border-gray-200 rounded p-2 hover:border-blue-400 cursor-pointer shadow-sm group"
                          onClick={() => addElement('widget', widget.id)}
                      >
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-[10px] font-bold text-gray-600 truncate">{widget.title}</span>
                             <Plus className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100" />
                          </div>
                          <div className="h-16 bg-gray-50 rounded flex items-center justify-center pointer-events-none">
                              {widget.type === 'bar' && <BarChart3 className="w-6 h-6 text-blue-300" />}
                              {widget.type === 'pie' && <PieChart className="w-6 h-6 text-green-300" />}
                              {widget.type === 'line' && <LineChart className="w-6 h-6 text-purple-300" />}
                              {widget.type === 'kpi' && <Hash className="w-6 h-6 text-orange-300" />}
                          </div>
                      </div>
                  ))}
                  {(!project.dashboard || project.dashboard.length === 0) && (
                      <div className="text-center py-4 text-xs text-gray-400">
                          No charts found. Create some in Analytics.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
