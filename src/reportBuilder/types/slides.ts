/**
 * PPTist-inspired Type System for Report Builder v2
 * Based on PPTist (https://github.com/pipipi-pikachu/PPTist)
 * Adapted for React + TypeScript
 */

// ============================================
// Element Types
// ============================================

export enum ElementTypes {
  TEXT = 'text',
  IMAGE = 'image',
  SHAPE = 'shape',
  LINE = 'line',
  CHART = 'chart',
  TABLE = 'table',
  LATEX = 'latex',
  VIDEO = 'video',
  AUDIO = 'audio',
  GROUP = 'group',
}

export enum ShapePathFormulasKeys {
  ROUND_RECT = 'roundRect',
  CUT_RECT_DIAGONAL = 'cutRectDiagonal',
  CUT_RECT_SINGLE = 'cutRectSingle',
  CUT_RECT_SAMESIDE = 'cutRectSameside',
  ROUND_RECT_DIAGONAL = 'roundRectDiagonal',
  ROUND_RECT_SINGLE = 'roundRectSingle',
  ROUND_RECT_SAMESIDE = 'roundRectSameside',
  CUT_ROUND_RECT = 'cutRoundRect',
  MESSAGE = 'message',
  ROUND_MESSAGE = 'roundMessage',
  L = 'L',
  RING_RECT = 'ringRect',
  PLUS = 'plus',
  TRIANGLE = 'triangle',
  PARALLELOGRAM_LEFT = 'parallelogramLeft',
  PARALLELOGRAM_RIGHT = 'parallelogramRight',
  TRAPEZOID = 'trapezoid',
  BULLET = 'bullet',
  INDICATOR = 'indicator',
}

// ============================================
// Style Types
// ============================================

export type LineStyleType = 'solid' | 'dashed' | 'dotted';
export type GradientType = 'linear' | 'radial';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type ShapeTextAlign = 'top' | 'middle' | 'bottom';

export interface GradientColor {
  pos: number;
  color: string;
}

export interface Gradient {
  type: GradientType;
  colors: GradientColor[];
  rotate: number;
}

export interface PPTElementShadow {
  h: number;
  v: number;
  blur: number;
  color: string;
}

export interface PPTElementOutline {
  style?: LineStyleType;
  width?: number;
  color?: string;
}

export type ElementLinkType = 'web' | 'slide';

export interface PPTElementLink {
  type: ElementLinkType;
  target: string;
}

// ============================================
// Base Element
// ============================================

interface PPTBaseElement {
  id: string;
  left: number;
  top: number;
  lock?: boolean;
  groupId?: string;
  width: number;
  height: number;
  rotate: number;
  link?: PPTElementLink;
  name?: string;
}

// ============================================
// Text Element
// ============================================

export type TextType = 'title' | 'subtitle' | 'content' | 'item' | 'itemTitle' | 'notes' | 'header' | 'footer' | 'partNumber' | 'itemNumber';

export interface PPTTextElement extends PPTBaseElement {
  type: 'text';
  content: string;
  defaultFontName: string;
  defaultColor: string;
  outline?: PPTElementOutline;
  fill?: string;
  lineHeight?: number;
  wordSpace?: number;
  opacity?: number;
  shadow?: PPTElementShadow;
  paragraphSpace?: number;
  vertical?: boolean;
  textType?: TextType;
}

// ============================================
// Image Element
// ============================================

export type ImageElementFilterKeys = 'blur' | 'brightness' | 'contrast' | 'grayscale' | 'saturate' | 'hue-rotate' | 'opacity' | 'sepia' | 'invert';

export interface ImageElementFilters {
  type: ImageElementFilterKeys;
  value: number;
}

export type ImageClipDataRange = [[number, number], [number, number]];

export interface ImageElementClip {
  range?: ImageClipDataRange;
  shape: string;
}

export type ImageType = 'pageFigure' | 'itemFigure' | 'background';

export interface PPTImageElement extends PPTBaseElement {
  type: 'image';
  fixedRatio: boolean;
  src: string;
  outline?: PPTElementOutline;
  filters?: ImageElementFilters;
  clip?: ImageElementClip;
  flipH?: boolean;
  flipV?: boolean;
  shadow?: PPTElementShadow;
  radius?: number;
  colorMask?: string;
  imageType?: ImageType;
  opacity?: number;
}

// ============================================
// Shape Element
// ============================================

export enum ShapePathFormulasKeys {
  ROUND_RECT = 'roundRect',
  ROUND_RECT_DIAGONAL = 'roundRectDiagonal',
  ROUND_RECT_SINGLE = 'roundRectSingle',
  ROUND_RECT_SAMESIDE = 'roundRectSameSide',
  CUT_RECT_DIAGONAL = 'cutRectDiagonal',
  CUT_RECT_SINGLE = 'cutRectSingle',
  CUT_RECT_SAMESIDE = 'cutRectSameSide',
  CUT_ROUND_RECT = 'cutRoundRect',
  MESSAGE = 'message',
  ROUND_MESSAGE = 'roundMessage',
  L = 'L',
  RING_RECT = 'ringRect',
  PLUS = 'plus',
  TRIANGLE = 'triangle',
  PARALLELOGRAM_LEFT = 'parallelogramLeft',
  PARALLELOGRAM_RIGHT = 'parallelogramRight',
  TRAPEZOID = 'trapezoid',
  BULLET = 'bullet',
  INDICATOR = 'indicator',
}

export interface ShapeText {
  content: string;
  defaultFontName: string;
  defaultColor: string;
  align: ShapeTextAlign;
  type?: TextType;
}

export interface PPTShapeElement extends PPTBaseElement {
  type: 'shape';
  viewBox: [number, number];
  path: string;
  fixedRatio: boolean;
  fill: string;
  gradient?: Gradient;
  pattern?: string;
  outline?: PPTElementOutline;
  opacity?: number;
  flipH?: boolean;
  flipV?: boolean;
  shadow?: PPTElementShadow;
  special?: boolean;
  text?: ShapeText;
  pathFormula?: ShapePathFormulasKeys;
  keypoints?: number[];
}

// ============================================
// Line Element
// ============================================

export type LinePoint = '' | 'arrow' | 'dot' | 'none' | 'square';

export interface PPTLineElement extends Omit<PPTBaseElement, 'height' | 'rotate'> {
  type: 'line';
  start: [number, number];
  end: [number, number];
  style: LineStyleType;
  color: string;
  width?: number;
  points: [LinePoint, LinePoint];
  shadow?: PPTElementShadow;
  broken?: [number, number];
  broken2?: [number, number];
  curve?: [number, number];
  cubic?: [[number, number], [number, number]];
  lineType?: 'straight' | 'curve' | 'polyline';
  curveType?: 'quadratic' | 'cubic';
}

// ============================================
// Chart Element
// ============================================

export type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'ring' | 'area' | 'radar' | 'scatter';

export interface ChartOptions {
  lineSmooth?: boolean;
  stack?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
}

export interface ChartData {
  labels: string[];
  legends: string[];
  series: number[][];
}

export interface PPTChartElement extends PPTBaseElement {
  type: 'chart';
  fill?: string;
  chartType: ChartType;
  data: ChartData;
  options?: ChartOptions;
  outline?: PPTElementOutline;
  themeColors: string[];
  textColor?: string;
  lineColor?: string;
}

// ============================================
// Table Element
// ============================================

export interface TableCellStyle {
  bold?: boolean;
  em?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  backcolor?: string;
  fontsize?: string;
  fontname?: string;
  align?: TextAlign;
}

export interface TableCell {
  id: string;
  colspan: number;
  rowspan: number;
  text: string;
  style?: TableCellStyle;
}

export interface TableTheme {
  color: string;
  rowHeader: boolean;
  rowFooter: boolean;
  colHeader: boolean;
  colFooter: boolean;
}

export interface PPTTableElement extends PPTBaseElement {
  type: 'table';
  outline: PPTElementOutline;
  theme?: TableTheme;
  colWidths: number[];
  cellMinHeight: number;
  data: TableCell[][];
}

// ============================================
// LaTeX Element
// ============================================

export interface PPTLatexElement extends PPTBaseElement {
  type: 'latex';
  latex: string;
  path: string;
  color: string;
  strokeWidth: number;
  viewBox: [number, number];
  fixedRatio: boolean;
}

// ============================================
// Video Element
// ============================================

export interface PPTVideoElement extends PPTBaseElement {
  type: 'video';
  src: string;
  autoplay: boolean;
  poster?: string;
  ext?: string;
}

// ============================================
// Audio Element
// ============================================

export interface PPTAudioElement extends PPTBaseElement {
  type: 'audio';
  fixedRatio: boolean;
  color: string;
  loop: boolean;
  autoplay: boolean;
  src: string;
  ext?: string;
}

// ============================================
// Group Element
// ============================================

export interface PPTGroupElement {
  id: string;
  type: 'group';
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  elements: PPTElement[];
  lock?: boolean;
  name?: string;
}

// ============================================
// Union Type
// ============================================

export type PPTElement =
  | PPTTextElement
  | PPTImageElement
  | PPTShapeElement
  | PPTLineElement
  | PPTChartElement
  | PPTTableElement
  | PPTLatexElement
  | PPTVideoElement
  | PPTAudioElement
  | PPTGroupElement;

// ============================================
// Slide Background
// ============================================

export type SlideBackgroundType = 'solid' | 'image' | 'gradient';
export type SlideBackgroundImageSize = 'cover' | 'contain' | 'repeat';

export interface SlideBackgroundImage {
  src: string;
  size: SlideBackgroundImageSize;
}

export interface SlideBackground {
  type: SlideBackgroundType;
  color?: string;
  image?: SlideBackgroundImage;
  gradient?: Gradient;
}

// ============================================
// Animations
// ============================================

export type AnimationType = 'in' | 'out' | 'attention';
export type AnimationTrigger = 'click' | 'meantime' | 'auto';

export interface PPTAnimation {
  id: string;
  elId: string;
  effect: string;
  type: AnimationType;
  duration: number;
  trigger: AnimationTrigger;
}

// ============================================
// Notes & Sections
// ============================================

export interface NoteReply {
  id: string;
  content: string;
  time: number;
  user: string;
}

export interface Note {
  id: string;
  content: string;
  time: number;
  user: string;
  elId?: string;
  replies?: NoteReply[];
}

export interface SectionTag {
  id: string;
  title?: string;
}

export type TurningMode = 'no' | 'fade' | 'slideX' | 'slideY' | 'random' | 'slideX3D' | 'slideY3D' | 'rotate' | 'scaleY' | 'scaleX' | 'scale' | 'scaleReverse';
export type SlideType = 'cover' | 'contents' | 'transition' | 'content' | 'end';

// ============================================
// Slide
// ============================================

export interface Slide {
  id: string;
  elements: PPTElement[];
  notes?: Note[];
  remark?: string;
  background?: SlideBackground;
  animations?: PPTAnimation[];
  turningMode?: TurningMode;
  sectionTag?: SectionTag;
  type?: SlideType;
}

// ============================================
// Slide Theme
// ============================================

export interface SlideTheme {
  backgroundColor: string;
  themeColors: string[];
  fontColor: string;
  fontName: string;
  outline: PPTElementOutline;
  shadow: PPTElementShadow;
}

// ============================================
// Master Slide (NEW - Critical for Import/Export)
// ============================================

export interface MasterSlideLayout {
  id: string;
  name: string;
  type: SlideType;
  elements: PPTElement[];
  background?: SlideBackground;
}

export interface MasterSlide {
  id: string;
  name: string;
  theme: SlideTheme;
  layouts: MasterSlideLayout[];
}

// ============================================
// Presentation (with Master Slides)
// ============================================

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  theme: SlideTheme;
  masterSlides: MasterSlide[];
  width: number;
  height: number;
}
