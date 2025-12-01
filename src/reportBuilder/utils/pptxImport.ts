/**
 * PPTX Import Utility
 * Parse PPTX files using pptxtojson and convert to our format
 */

import { nanoid } from 'nanoid';
import type {
  Presentation,
  Slide,
  PPTElement,
  MasterSlide,
  MasterSlideLayout,
  SlideTheme,
  PPTTextElement,
  PPTImageElement,
  PPTShapeElement,
  PPTTableElement,
} from '../types/slides';

// ============================================
// PPTX Parser using pptxtojson
// ============================================

export async function importPPTX(file: File): Promise<Presentation> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        // Use pptxtojson to parse
        // @ts-ignore - pptxtojson types
        const pptxToJson = await import('pptxtojson');
        const result = await pptxToJson.parse(arrayBuffer);

        console.log('PPTX Parsed:', result);

        // Convert to our format
        const presentation = convertPptxToPresentation(result);
        resolve(presentation);
      } catch (error) {
        console.error('PPTX Import Error:', error);
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// ============================================
// Convert pptxtojson output to our format
// ============================================

function convertPptxToPresentation(pptxData: any): Presentation {
  const slides: Slide[] = [];
  const masterSlides: MasterSlide[] = [];

  // Parse dimensions
  const width = pptxData.size?.width || 960;
  const height = pptxData.size?.height || 540;

  // Parse master slides first
  if (pptxData.masterSlides && Array.isArray(pptxData.masterSlides)) {
    pptxData.masterSlides.forEach((master: any) => {
      const masterSlide = parseMasterSlide(master);
      if (masterSlide) {
        masterSlides.push(masterSlide);
      }
    });
  }

  // Parse slides
  if (pptxData.slides && Array.isArray(pptxData.slides)) {
    pptxData.slides.forEach((slideData: any, index: number) => {
      const slide = parseSlide(slideData, index);
      if (slide) {
        slides.push(slide);
      }
    });
  }

  // Parse theme
  const theme: SlideTheme = {
    backgroundColor: '#FFFFFF',
    themeColors: ['#2F88FF', '#52C41A', '#FA8C16', '#F5222D', '#722ED1', '#13C2C2'],
    fontColor: '#000000',
    fontName: 'Arial',
    outline: {
      width: 2,
      color: '#000000',
      style: 'solid',
    },
    shadow: {
      h: 0,
      v: 0,
      blur: 10,
      color: 'rgba(0, 0, 0, 0.5)',
    },
  };

  return {
    id: nanoid(),
    title: pptxData.title || 'Imported Presentation',
    slides,
    theme,
    masterSlides,
    width,
    height,
  };
}

// ============================================
// Parse Master Slide
// ============================================

function parseMasterSlide(masterData: any): MasterSlide | null {
  if (!masterData) return null;

  const layouts: MasterSlideLayout[] = [];

  if (masterData.layouts && Array.isArray(masterData.layouts)) {
    masterData.layouts.forEach((layoutData: any) => {
      const layout = parseLayout(layoutData);
      if (layout) {
        layouts.push(layout);
      }
    });
  }

  const theme: SlideTheme = {
    backgroundColor: masterData.background?.color || '#FFFFFF',
    themeColors: masterData.colors || ['#2F88FF', '#52C41A', '#FA8C16', '#F5222D', '#722ED1', '#13C2C2'],
    fontColor: masterData.fontColor || '#000000',
    fontName: masterData.fontName || 'Arial',
    outline: {
      width: 2,
      color: '#000000',
      style: 'solid',
    },
    shadow: {
      h: 0,
      v: 0,
      blur: 10,
      color: 'rgba(0, 0, 0, 0.5)',
    },
  };

  return {
    id: masterData.id || nanoid(),
    name: masterData.name || 'Master Slide',
    theme,
    layouts,
  };
}

// ============================================
// Parse Layout
// ============================================

function parseLayout(layoutData: any): MasterSlideLayout | null {
  if (!layoutData) return null;

  const elements: PPTElement[] = [];

  if (layoutData.elements && Array.isArray(layoutData.elements)) {
    layoutData.elements.forEach((elData: any) => {
      const element = parseElement(elData);
      if (element) {
        elements.push(element);
      }
    });
  }

  return {
    id: layoutData.id || nanoid(),
    name: layoutData.name || 'Layout',
    type: 'content',
    elements,
    background: layoutData.background
      ? {
          type: 'solid',
          color: layoutData.background.color || '#FFFFFF',
        }
      : undefined,
  };
}

// ============================================
// Parse Slide
// ============================================

function parseSlide(slideData: any, index: number): Slide | null {
  if (!slideData) return null;

  const elements: PPTElement[] = [];

  // Parse elements
  if (slideData.elements && Array.isArray(slideData.elements)) {
    slideData.elements.forEach((elData: any) => {
      const element = parseElement(elData);
      if (element) {
        elements.push(element);
      }
    });
  }

  return {
    id: slideData.id || nanoid(),
    elements,
    background: slideData.background
      ? {
          type: 'solid',
          color: slideData.background.color || '#FFFFFF',
        }
      : undefined,
  };
}

// ============================================
// Parse Element
// ============================================

function parseElement(elData: any): PPTElement | null {
  if (!elData || !elData.type) return null;

  const baseProps = {
    id: elData.id || nanoid(),
    left: elData.x || elData.left || 0,
    top: elData.y || elData.top || 0,
    width: elData.width || elData.cx || 100,
    height: elData.height || elData.cy || 100,
    rotate: elData.rotate || 0,
    lock: elData.lock || false,
    name: elData.name,
  };

  switch (elData.type) {
    case 'text':
      return parseTextElement(elData, baseProps);

    case 'image':
      return parseImageElement(elData, baseProps);

    case 'shape':
      return parseShapeElement(elData, baseProps);

    case 'table':
      return parseTableElement(elData, baseProps);

    case 'line':
      // TODO: Parse line element
      return null;

    case 'chart':
      // TODO: Parse chart element
      return null;

    default:
      console.warn('Unknown element type:', elData.type);
      return null;
  }
}

// ============================================
// Parse Text Element
// ============================================

function parseTextElement(elData: any, baseProps: any): PPTTextElement {
  // Convert text content to HTML
  let content = '<p>Double-click to edit</p>';

  if (elData.text) {
    if (typeof elData.text === 'string') {
      content = `<p>${elData.text}</p>`;
    } else if (elData.text.paragraphs && Array.isArray(elData.text.paragraphs)) {
      content = elData.text.paragraphs
        .map((p: any) => {
          if (typeof p === 'string') {
            return `<p>${p}</p>`;
          }
          if (p.text) {
            let text = p.text;
            if (p.bold) text = `<strong>${text}</strong>`;
            if (p.italic) text = `<em>${text}</em>`;
            if (p.underline) text = `<u>${text}</u>`;
            return `<p>${text}</p>`;
          }
          return '';
        })
        .join('');
    }
  }

  return {
    type: 'text',
    ...baseProps,
    content,
    defaultFontName: elData.fontFamily || elData.fontName || 'Arial',
    defaultColor: elData.color || elData.fontColor || '#000000',
    fill: elData.fill || elData.backgroundColor,
    lineHeight: elData.lineHeight || 1.5,
    opacity: elData.opacity ?? 1,
  };
}

// ============================================
// Parse Image Element
// ============================================

function parseImageElement(elData: any, baseProps: any): PPTImageElement {
  return {
    type: 'image',
    ...baseProps,
    fixedRatio: elData.fixedRatio ?? true,
    src: elData.src || elData.url || '',
    flipH: elData.flipH || false,
    flipV: elData.flipV || false,
  };
}

// ============================================
// Parse Shape Element
// ============================================

function parseShapeElement(elData: any, baseProps: any): PPTShapeElement {
  // Default rectangle path
  let path = 'M 0 0 L 100 0 L 100 100 L 0 100 Z';
  let viewBox: [number, number] = [100, 100];

  if (elData.path) {
    path = elData.path;
  }

  if (elData.viewBox && Array.isArray(elData.viewBox)) {
    viewBox = [elData.viewBox[0] || 100, elData.viewBox[1] || 100];
  }

  return {
    type: 'shape',
    ...baseProps,
    viewBox,
    path,
    fixedRatio: elData.fixedRatio ?? false,
    fill: elData.fill || elData.color || '#3B82F6',
    flipH: elData.flipH || false,
    flipV: elData.flipV || false,
  };
}

// ============================================
// Parse Table Element
// ============================================

function parseTableElement(elData: any, baseProps: any): PPTTableElement {
  const data: any[][] = [];

  if (elData.rows && Array.isArray(elData.rows)) {
    elData.rows.forEach((row: any) => {
      const cells: any[] = [];

      if (row.cells && Array.isArray(row.cells)) {
        row.cells.forEach((cell: any) => {
          cells.push({
            id: nanoid(),
            colspan: cell.colspan || 1,
            rowspan: cell.rowspan || 1,
            text: cell.text || '',
            style: cell.style || {},
          });
        });
      }

      data.push(cells);
    });
  }

  // Generate default 3x3 table if no data
  if (data.length === 0) {
    for (let r = 0; r < 3; r++) {
      const row: any[] = [];
      for (let c = 0; c < 3; c++) {
        row.push({
          id: nanoid(),
          colspan: 1,
          rowspan: 1,
          text: `Cell ${r}-${c}`,
        });
      }
      data.push(row);
    }
  }

  return {
    type: 'table',
    ...baseProps,
    outline: {
      width: 1,
      color: '#000000',
      style: 'solid',
    },
    colWidths: elData.colWidths || [0.33, 0.33, 0.34],
    cellMinHeight: elData.cellMinHeight || 40,
    data,
  };
}
