

export enum AppView {
  LANDING = 'LANDING',
  PROJECT = 'PROJECT',
}

export enum ProjectTab {
  DATABASE = 'DATABASE', // New: Raw Material Library
  PREP = 'PREP',
  OWN_DATA = 'OWN_DATA', // New: Processed/Extracted Data
  VISUALIZE = 'VISUALIZE',
  REPORT = 'REPORT',
  AI_AGENT = 'AI_AGENT',
  SETTINGS = 'SETTINGS',
}

export enum AIProvider {
  GEMINI = 'GEMINI',
  OPENAI = 'OPENAI',
  CLAUDE = 'CLAUDE'
}

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AIPresets {
  ask: string[];
  action: string[];
}

// --- Toast Types ---
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export interface ToastContextType {
  showToast: (title: string, message?: string, type?: ToastType) => void;
}

export type CellValue = string | number | boolean | null;

export interface RawRow {
  [key: string]: CellValue;
}

export interface ColumnConfig {
  key: string;
  type: 'string' | 'number' | 'date' | 'tag_array' | 'sentiment' | 'channel';
  visible: boolean;
  label?: string;
}

// --- New Transformation Types ---

export type TransformMethod = 
  | 'copy'              // Direct copy
  | 'array_count'       // Count items in array string
  | 'array_join'        // Join items "A, B"
  | 'array_extract'     // Extract specific item (e.g., Index 0)
  | 'array_includes'    // Boolean if contains X
  | 'date_extract'      // Extract specific date part (Date only, Time only, Year, Month)
  | 'date_format';      // Re-format date

export interface TransformationRule {
  id: string;
  targetName: string;   // Name of the new column
  sourceKey: string;    // Key from RawRow
  method: TransformMethod;
  params?: any;         // e.g. { delimiter: ',', index: 0, keyword: 'Service', datePart: 'date' }
  valueMap?: Record<string, string>; // New: Map result values to new labels (e.g. 'isComment' -> 'Comment')
}

// ==========================================
// NEW: Asset-Based Architecture Types
// ==========================================

// --- Raw Assets (Drawer 1) ---

export interface RawTable {
  id: string;
  name: string;
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'gsheet';
  data: RawRow[];           // Immutable original data
  columns: string[];        // Auto-detected column names
  rowCount: number;
  createdBy: string;
  createdAt: number;
  lastModified: number;
}

// --- Prep Configurations (Drawer 2) ---

export enum MergingStrategy {
  UNION = 'UNION',          // Combine all tables (Union All)
  APPEND = 'APPEND',        // Append sequentially
  JOIN = 'JOIN'             // Join by key (future feature)
}

export interface ColumnMapping {
  targetColumn: string;     // New column name
  sourceColumns: string[];  // Source columns to map from
}

// Per-Table Transformation Mapping (for multi-source configs)
export interface PerTableMapping {
  tableId: string;              // Source RawTable ID
  sourceColumn: string;         // Column from this table
  method: TransformMethod;      // Transform method for this table
  params?: any;                 // Method-specific parameters
  valueMap?: Record<string, string>; // Value mapping for this table
}

export interface PrepConfig {
  id: string;
  name: string;
  description?: string;

  // Source Selection
  sourceTableIds: string[];        // Multiple Raw Table IDs
  mergingStrategy: MergingStrategy;
  columnMappings?: ColumnMapping[]; // Map columns with different names

  // Transformation Rules (existing)
  transformRules: TransformationRule[];

  // NEW: Per-table mapping rules (for multi-source transformation)
  perTableMappings?: {
    [targetColumn: string]: PerTableMapping[]; // Target column → array of per-table configs
  };

  // Output (Cached Result)
  outputData: RawRow[];
  outputColumns: ColumnConfig[];

  // Metadata
  createdAt: number;
  lastModified: number;
}

// --- Own Data (Processed/Extracted Tables) ---

export interface OwnDataTable {
  id: string;
  name: string;
  description?: string;

  // Source Reference
  sourceType: 'prepConfig' | 'manual';  // Created from PrepConfig or manual upload
  sourcePrepConfigId?: string;          // If created from PrepConfig

  // Data
  data: RawRow[];
  columns: ColumnConfig[];
  rowCount: number;

  // Metadata
  createdBy: string;
  createdAt: number;
  lastModified: number;
}

// --- Multiple Dashboards ---

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  filters?: DashboardFilter[];
  createdAt: number;
  lastModified: number;
}

// --- Data Source Binding ---

export interface DataSourceBinding {
  type: 'raw' | 'prepped';
  id: string;  // RawTable.id or PrepConfig.id
}

// ==========================================
// Dashboard & Widget Types (Phase 2 & 3 & 4)
// ==========================================

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'kpi' | 'wordcloud' | 'table';
export type AggregateMethod = 'count' | 'sum' | 'avg';

export interface DashboardFilter {
  id: string;
  column: string;
  value: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: ChartType;

  // NEW: Data Source Binding
  dataSource?: DataSourceBinding; // Optional for backward compatibility

  // Data Configuration
  dimension: string;      // X-Axis (Group By) or Text Col for Wordcloud/Table
  stackBy?: string;       // New: For Stacked Bar Charts (e.g. Stack by Sentiment)
  measure: AggregateMethod; // Method e.g., "Count"
  measureCol?: string;    // Y-Axis (Value) or Sort By for Table
  limit?: number;         // Limit rows (Top 10, 20, etc)

  // Visuals
  color?: string;
  width: 'half' | 'full'; // Grid span
}

export interface DrillDownState {
  isOpen: boolean;
  title: string;
  filterCol: string;
  filterVal: string;
  data: RawRow[];
}

// --- Report Builder Types (Phase 5) ---

export type ShapeType = 'rect' | 'circle' | 'triangle' | 'line' | 'arrow' | 'star';
export type ElementType = 'widget' | 'text' | 'image' | 'shape' | 'table' | 'chart';

// Table Cell Data
export interface TableCell {
  text: string;
  rowSpan?: number;
  colSpan?: number;
  style?: ReportElementStyle;
}

// Table Data Structure
export interface TableData {
  rows: TableCell[][];
  columnWidths?: number[];
  rowHeights?: number[];
}

// Chart Data (for embedded charts from PPTX)
export interface ChartData {
  chartType: 'bar' | 'line' | 'pie' | 'area';
  data: any[];
  title?: string;
}

export interface ReportElementStyle {
  // Typography
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string; // Text color
  
  // Appearance
  backgroundColor?: string;
  fill?: string; // Shape fill
  stroke?: string; // Border color
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  shadow?: boolean;
}

export interface ReportElement {
  id: string;
  type: ElementType;
  shapeType?: ShapeType; // Only if type === 'shape'
  widgetId?: string;     // Only if type === 'widget'
  content?: string;      // Text content or Image Base64
  tableData?: TableData; // Only if type === 'table'
  chartData?: ChartData; // Only if type === 'chart'
  style?: ReportElementStyle;

  // Positioning
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
}

export interface ReportSlide {
  id: string;
  background?: string; // Hex or Base64
  elements: ReportElement[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  lastModified: number;

  // NEW: Asset-Based Architecture
  rawTables?: RawTable[];        // Drawer 1: Raw Material Library
  prepConfigs?: PrepConfig[];    // Drawer 2: Processing Factory
  ownDataTables?: OwnDataTable[]; // Drawer 3: Processed/Extracted Data
  dashboards?: Dashboard[];      // Multiple Dashboards

  // Legacy fields (for backward compatibility & migration)
  data?: RawRow[];               // Deprecated: Use rawTables instead
  columns?: ColumnConfig[];      // Deprecated: Use rawTables instead
  transformRules?: TransformationRule[]; // Deprecated: Use prepConfigs instead
  dashboard?: DashboardWidget[]; // Deprecated: Use dashboards instead

  // Existing features
  reportConfig?: ReportSlide[];  // Report Builder Config
  aiSettings?: AISettings;       // Per-project AI Settings
  aiPresets?: AIPresets;         // Saved Prompt Presets
}

// Interface for the globally available XLSX object from CDN
export interface XLSXLibrary {
  read: (data: any, options?: any) => any;
  utils: {
    sheet_to_json: (worksheet: any, options?: any) => any[];
    json_to_sheet: (data: any[]) => any;
    book_new: () => any;
    book_append_sheet: (workbook: any, worksheet: any, name: string) => void;
  };
  writeFile: (workbook: any, filename: string) => void;
}

declare global {
  interface Window {
    XLSX: XLSXLibrary;
    html2canvas: any;
    PptxGenJS: any;
    JSZip: any;
  }
}
