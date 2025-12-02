/**
 * PPTX Export Utility
 * Export presentation to PPTX using PptxGenJS
 */

import type {
  Presentation,
  Slide,
  PPTElement,
  MasterSlide,
  PPTTextElement,
  PPTImageElement,
  PPTShapeElement,
  PPTLineElement,
  PPTTableElement,
  PPTChartElement,
} from '../types/slides';

// ============================================
// Main Export Function
// ============================================

export async function exportToPPTX(presentation: Presentation): Promise<void> {
  // @ts-ignore - PptxGenJS from CDN
  const pptx = new window.PptxGenJS();

  // Set presentation properties
  pptx.title = presentation.title;
  pptx.subject = 'Created with Report Builder v2';
  pptx.author = 'Report Builder';

  // Set slide size (convert px to inches: 1px = 1/96 inch)
  const widthInches = presentation.width / 96;
  const heightInches = presentation.height / 96;
  pptx.defineLayout({
    name: 'CUSTOM',
    width: widthInches,
    height: heightInches,
  });
  pptx.layout = 'CUSTOM';

  // Add master slides
  if (presentation.masterSlides && presentation.masterSlides.length > 0) {
    await addMasterSlides(pptx, presentation.masterSlides);
  }

  // Add slides
  for (const slide of presentation.slides) {
    await addSlide(pptx, slide, presentation);
  }

  // Save file
  const filename = `${presentation.title}.pptx`;
  await pptx.writeFile({ fileName: filename });
}

// ============================================
// Add Master Slides
// ============================================

async function addMasterSlides(pptx: any, masterSlides: MasterSlide[]) {
  for (const master of masterSlides) {
    // Create master slide
    const masterSlide = pptx.defineSlideMaster({
      title: master.name,
      background: { color: master.theme.backgroundColor },
    });

    // Add layouts
    for (const layout of master.layouts) {
      const layoutDef: any = {
        name: layout.name,
        background: layout.background
          ? { color: layout.background.color }
          : undefined,
      };

      // Add layout elements as placeholders
      if (layout.elements && layout.elements.length > 0) {
        layoutDef.objects = [];

        for (const element of layout.elements) {
          const obj = await convertElementToPptxObject(element);
          if (obj) {
            layoutDef.objects.push(obj);
          }
        }
      }

      masterSlide.addLayout(layoutDef);
    }
  }
}

// ============================================
// Add Slide
// ============================================

async function addSlide(pptx: any, slide: Slide, presentation: Presentation) {
  const pptxSlide = pptx.addSlide();

  // Set background
  if (slide.background) {
    if (slide.background.type === 'solid' && slide.background.color) {
      pptxSlide.background = { color: slide.background.color.replace('#', '') };
    } else if (slide.background.type === 'image' && slide.background.image) {
      pptxSlide.background = { path: slide.background.image.src };
    } else if (slide.background.type === 'gradient' && slide.background.gradient) {
      // PptxGenJS gradient support is limited
      const { gradient } = slide.background;
      if (gradient.colors.length > 0) {
        pptxSlide.background = { color: gradient.colors[0].color.replace('#', '') };
      }
    }
  }

  // Add elements
  for (const element of slide.elements) {
    await addElement(pptxSlide, element, presentation);
  }
}

// ============================================
// Add Element to Slide
// ============================================

async function addElement(pptxSlide: any, element: PPTElement, presentation: Presentation) {
  const obj = await convertElementToPptxObject(element, presentation);
  if (!obj) return;

  const { type, options } = obj;

  try {
    switch (type) {
      case 'text':
        pptxSlide.addText(options.text, options);
        break;

      case 'image':
        pptxSlide.addImage(options);
        break;

      case 'shape':
        pptxSlide.addShape(options.shape, options);
        break;

      case 'table':
        pptxSlide.addTable(options.rows, options);
        break;

      case 'chart':
        pptxSlide.addChart(options.type, options.data, options);
        break;

      default:
        console.warn('Unsupported element type for export:', type);
    }
  } catch (error) {
    console.error('Error adding element to slide:', error);
  }
}

// ============================================
// Convert Element to PptxGenJS Object
// ============================================

async function convertElementToPptxObject(
  element: PPTElement,
  presentation?: Presentation
): Promise<{ type: string; options: any } | null> {
  // Convert px to inches
  const pxToInch = (px: number) => px / 96;

  const baseOptions = {
    x: pxToInch(element.left),
    y: pxToInch(element.top),
    w: pxToInch(element.width),
    h: pxToInch(element.height),
    rotate: element.rotate || 0,
  };

  switch (element.type) {
    case 'text':
      return convertTextElement(element as PPTTextElement, baseOptions);

    case 'image':
      return convertImageElement(element as PPTImageElement, baseOptions);

    case 'shape':
      return convertShapeElement(element as PPTShapeElement, baseOptions);

    case 'table':
      return convertTableElement(element as PPTTableElement, baseOptions);

    case 'chart':
      return convertChartElement(element as PPTChartElement, baseOptions);

    case 'line':
      return convertLineElement(element as PPTLineElement, baseOptions);

    default:
      return null;
  }
}

// ============================================
// Convert Text Element
// ============================================

function convertTextElement(
  element: PPTTextElement,
  baseOptions: any
): { type: string; options: any } {
  // Parse HTML content to extract formatting
  const parser = new DOMParser();
  const doc = parser.parseFromString(element.content, 'text/html');

  // Extract text with basic formatting
  let text: any[] = [];
  const spans = doc.querySelectorAll('span');

  if (spans.length > 0) {
    spans.forEach(span => {
      const style = span.style;
      const textContent = span.textContent || '';

      // Extract font size from inline style
      let fontSize = 14;
      if (style.fontSize) {
        const match = style.fontSize.match(/(\d+)/);
        if (match) fontSize = parseInt(match[1]);
      }

      // Extract font family
      const fontFace = style.fontFamily || element.defaultFontName || 'Arial';

      // Extract color
      const color = style.color || element.defaultColor || '#000000';

      text.push({
        text: textContent,
        options: {
          fontSize,
          fontFace: fontFace.replace(/['"]/g, ''),
          color: color.replace('#', ''),
          bold: style.fontWeight === 'bold' || span.querySelector('strong') !== null,
          italic: style.fontStyle === 'italic' || span.querySelector('em') !== null,
          underline: style.textDecoration?.includes('underline'),
        }
      });
    });
  } else {
    // Fallback to plain text
    text = doc.body.textContent || element.content.replace(/<[^>]*>/g, '');
  }

  const options = {
    ...baseOptions,
    text,
    fontSize: 14,
    fontFace: element.defaultFontName || 'Arial',
    color: element.defaultColor?.replace('#', ''),
    fill: element.fill ? { color: element.fill.replace('#', '') } : undefined,
    align: 'left',
    valign: 'top',
    line: element.outline
      ? {
          color: element.outline.color?.replace('#', ''),
          width: element.outline.width,
        }
      : undefined,
    shadow: element.shadow
      ? {
          type: 'outer',
          blur: element.shadow.blur / 96,
          offset: element.shadow.h / 96,
          angle: 45,
          color: element.shadow.color?.replace('#', ''),
        }
      : undefined,
  };

  return { type: 'text', options };
}

// ============================================
// Convert Image Element
// ============================================

function convertImageElement(
  element: PPTImageElement,
  baseOptions: any
): { type: string; options: any } {
  const options = {
    ...baseOptions,
    path: element.src,
    sizing: {
      type: element.fixedRatio ? 'contain' : 'cover',
      w: baseOptions.w,
      h: baseOptions.h,
    },
    flip: {
      horizontal: element.flipH || false,
      vertical: element.flipV || false,
    },
    rounding: element.radius ? true : false,
  };

  return { type: 'image', options };
}

// ============================================
// Convert Shape Element
// ============================================

function convertShapeElement(
  element: PPTShapeElement,
  baseOptions: any
): { type: string; options: any } {
  // Map shape types from pathFormula to PptxGenJS shape types
  let shape = 'rect';

  if (element.pathFormula) {
    const formulaMap: Record<string, string> = {
      'roundRect': 'roundRect',
      'ellipse': 'ellipse',
      'triangle': 'triangle',
      'trapezoid': 'trapezoid',
      'parallelogramLeft': 'parallelogram',
      'parallelogramRight': 'parallelogram',
      'plus': 'plus',
      'pentagon': 'pentagon',
      'hexagon': 'hexagon',
      'octagon': 'octagon',
      'star5': 'star5',
      'star6': 'star6',
      'cloud': 'cloud',
      'heart': 'heart',
      'lightning': 'lightning',
      'moon': 'moon',
      'sun': 'sun',
    };
    shape = formulaMap[element.pathFormula] || 'rect';
  }
  // Fallback: analyze path
  else if (element.path) {
    const pathLower = element.path.toLowerCase();
    if (pathLower.includes('a ') && (pathLower.match(/a /g) || []).length > 2) {
      shape = 'ellipse';
    } else if (pathLower.match(/m.*l.*l.*z/) && (pathLower.match(/l/g) || []).length === 2) {
      shape = 'triangle';
    }
  }

  const options = {
    ...baseOptions,
    shape,
    fill: element.fill ? { color: element.fill.replace('#', '') } : undefined,
    line: element.outline
      ? {
          color: element.outline.color?.replace('#', ''),
          width: element.outline.width / 96,
        }
      : undefined,
    opacity: element.opacity !== undefined ? element.opacity / 100 : undefined,
  };

  // Add text if present
  if (element.text) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(element.text.content, 'text/html');
    const text = doc.body.textContent || element.text.content.replace(/<[^>]*>/g, '');

    options.text = [{ text, options: {
      fontSize: 14,
      fontFace: element.text.defaultFontName,
      color: element.text.defaultColor?.replace('#', ''),
      align: element.text.align || 'center',
      valign: element.text.align || 'middle',
    }}];
  }

  return { type: 'shape', options };
}

// ============================================
// Convert Table Element
// ============================================

function convertTableElement(
  element: PPTTableElement,
  baseOptions: any
): { type: string; options: any } {
  const rows: any[][] = [];

  element.data.forEach((row) => {
    const pptxRow: any[] = [];

    row.forEach((cell) => {
      const cellOptions: any = {
        text: cell.text,
        colspan: cell.colspan || 1,
        rowspan: cell.rowspan || 1,
      };

      if (cell.style) {
        cellOptions.bold = cell.style.bold;
        cellOptions.italic = cell.style.em;
        cellOptions.underline = cell.style.underline;
        cellOptions.color = cell.style.color?.replace('#', '');
        cellOptions.fill = cell.style.backcolor?.replace('#', '');
        cellOptions.fontSize = parseInt(cell.style.fontsize || '12');
        cellOptions.align = cell.style.align;
      }

      pptxRow.push(cellOptions);
    });

    rows.push(pptxRow);
  });

  const options = {
    ...baseOptions,
    rows,
    colW: element.colWidths.map((w) => baseOptions.w * w),
    border: element.outline
      ? {
          type: element.outline.style,
          color: element.outline.color?.replace('#', ''),
          pt: element.outline.width,
        }
      : undefined,
  };

  return { type: 'table', options };
}

// ============================================
// Convert Chart Element
// ============================================

function convertChartElement(
  element: PPTChartElement,
  baseOptions: any
): { type: string; options: any } {
  // Convert chart type
  let chartType = 'bar';
  switch (element.chartType) {
    case 'bar':
    case 'column':
      chartType = element.chartType;
      break;
    case 'line':
      chartType = 'line';
      break;
    case 'pie':
    case 'ring':
      chartType = 'pie';
      break;
    case 'area':
      chartType = 'area';
      break;
  }

  // Convert data
  const data: any[] = [];
  element.data.legends.forEach((legend, idx) => {
    const series: any = {
      name: legend,
      labels: element.data.labels,
      values: element.data.series[idx],
    };
    data.push(series);
  });

  const options = {
    ...baseOptions,
    type: chartType,
    data,
    chartColors: element.themeColors.map((c) => c.replace('#', '')),
  };

  return { type: 'chart', options };
}

// ============================================
// Convert Line Element
// ============================================

function convertLineElement(
  element: PPTLineElement,
  baseOptions: any
): { type: string; options: any } {
  // PptxGenJS doesn't have direct line support, use shape
  const options = {
    ...baseOptions,
    shape: 'line',
    line: {
      color: element.color?.replace('#', ''),
      width: element.width || 2,
      dashType: element.style === 'dashed' ? 'dash' : element.style === 'dotted' ? 'dot' : 'solid',
    },
  };

  return { type: 'shape', options };
}
