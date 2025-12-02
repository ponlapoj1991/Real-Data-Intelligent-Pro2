/**
 * PPTX Import Utility
 * Based on PPTist's actual implementation
 * Parse PPTX files using pptxtojson
 */

import { parse, type Shape, type Element as PptxElement } from 'pptxtojson';
import { nanoid } from 'nanoid';
import type {
  Presentation,
  Slide,
  PPTElement,
  PPTTextElement,
  PPTImageElement,
  PPTShapeElement,
  PPTLineElement,
  PPTTableElement,
  PPTChartElement,
  ChartType,
  SlideBackground,
  TableCell,
  ChartOptions,
  Gradient,
} from '../types/slides';

const convertFontSizePtToPx = (html: string, ratio: number) => {
  return html.replace(/font-size:\s*([\d.]+)pt/g, (match, p1) => {
    return `font-size: ${(parseFloat(p1) * ratio).toFixed(1)}px`;
  });
};

const rotateLine = (line: PPTLineElement, angleDeg: number) => {
  const { start, end } = line;

  const angleRad = angleDeg * Math.PI / 180;

  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;

  const startTransX = start[0] - midX;
  const startTransY = start[1] - midY;
  const endTransX = end[0] - midX;
  const endTransY = end[1] - midY;

  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const startRotX = startTransX * cosA - startTransY * sinA;
  const startRotY = startTransX * sinA + startTransY * cosA;

  const endRotX = endTransX * cosA - endTransY * sinA;
  const endRotY = endTransX * sinA + endTransY * cosA;

  const startNewX = startRotX + midX;
  const startNewY = startRotY + midY;
  const endNewX = endRotX + midX;
  const endNewY = endRotY + midY;

  const beforeMinX = Math.min(start[0], end[0]);
  const beforeMinY = Math.min(start[1], end[1]);

  const afterMinX = Math.min(startNewX, endNewX);
  const afterMinY = Math.min(startNewY, endNewY);

  const startAdjustedX = startNewX - afterMinX;
  const startAdjustedY = startNewY - afterMinY;
  const endAdjustedX = endNewX - afterMinX;
  const endAdjustedY = endNewY - afterMinY;

  const startAdjusted: [number, number] = [startAdjustedX, startAdjustedY];
  const endAdjusted: [number, number] = [endAdjustedX, endAdjustedY];
  const offset = [afterMinX - beforeMinX, afterMinY - beforeMinY];

  return {
    start: startAdjusted,
    end: endAdjusted,
    offset,
  };
};

const parseLineElement = (el: Shape, ratio: number): PPTLineElement => {
  let start: [number, number] = [0, 0];
  let end: [number, number] = [0, 0];

  if (!el.isFlipV && !el.isFlipH) {
    start = [0, 0];
    end = [el.width, el.height];
  }
  else if (el.isFlipV && el.isFlipH) {
    start = [el.width, el.height];
    end = [0, 0];
  }
  else if (el.isFlipV && !el.isFlipH) {
    start = [0, el.height];
    end = [el.width, 0];
  }
  else {
    start = [el.width, 0];
    end = [0, el.height];
  }

  const data: PPTLineElement = {
    type: 'line',
    id: nanoid(10),
    width: +((el.borderWidth || 1) * ratio).toFixed(2),
    left: el.left,
    top: el.top,
    start,
    end,
    style: el.borderType || 'solid',
    color: el.borderColor || '#000000',
    points: ['', /straightConnector/.test(el.shapType) ? 'arrow' : '']
  };

  if (el.rotate) {
    const { start, end, offset } = rotateLine(data, el.rotate);
    data.start = start;
    data.end = end;
    data.left = data.left + offset[0];
    data.top = data.top + offset[1];
  }

  if (/bentConnector/.test(el.shapType)) {
    data.broken2 = [
      Math.abs(data.start[0] - data.end[0]) / 2,
      Math.abs(data.start[1] - data.end[1]) / 2,
    ];
  }

  if (/curvedConnector/.test(el.shapType)) {
    const cubic: [number, number] = [
      Math.abs(data.start[0] - data.end[0]) / 2,
      Math.abs(data.start[1] - data.end[1]) / 2,
    ];
    data.cubic = [cubic, cubic];
  }

  return data;
};

export async function importPPTX(file: File): Promise<Presentation> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        // Parse using pptxtojson (same as PPTist)
        const json = await parse(arrayBuffer);

        console.log('PPTX Parsed:', json);

        // pt to px conversion for elements (PPTist uses 96/72)
        const ratio = 96 / 72;

        // Canvas size - json.size is already in correct units (px)
        // PPTist doesn't multiply canvas size by ratio, only elements!
        const width = json.size.width;
        const height = json.size.height;

        const slides: Slide[] = [];

        for (const item of json.slides) {
          // Parse background
          const { type, value } = item.fill;
          let background: SlideBackground;

          if (type === 'image') {
            background = {
              type: 'image',
              image: {
                src: value.picBase64,
                size: 'cover',
              },
            };
          }
          else if (type === 'gradient') {
            background = {
              type: 'gradient',
              gradient: {
                type: value.path === 'line' ? 'linear' : 'radial',
                colors: value.colors.map((item: any) => ({
                  ...item,
                  pos: parseInt(item.pos),
                })),
                rotate: value.rot + 90,
              },
            };
          }
          else {
            background = {
              type: 'solid',
              color: value || '#ffffff',
            };
          }

          const slide: Slide = {
            id: nanoid(10),
            elements: [],
            background,
          };

          // Parse all elements (includes both elements and layoutElements like PPTist)
          const sortedElements = [...item.elements, ...item.layoutElements].sort((a: any, b: any) => a.order - b.order);

          for (const el of sortedElements) {
            // Scale all dimensions by ratio
            el.width = el.width * ratio;
            el.height = el.height * ratio;
            el.left = el.left * ratio;
            el.top = el.top * ratio;

            // Parse by element type
            if (el.type === 'text') {
              const textEl: PPTTextElement = {
                type: 'text',
                id: nanoid(10),
                width: el.width,
                height: el.height,
                left: el.left,
                top: el.top,
                rotate: el.rotate || 0,
                defaultFontName: 'Arial',
                defaultColor: '#000000',
                content: convertFontSizePtToPx(el.content, ratio),
                lineHeight: 1.2,
              };

              if (el.fill?.type === 'color') {
                textEl.fill = el.fill.value;
              }

              if (el.borderWidth) {
                textEl.outline = {
                  color: el.borderColor || '#000000',
                  width: +(el.borderWidth * ratio).toFixed(2),
                  style: el.borderType || 'solid',
                };
              }

              if (el.shadow) {
                textEl.shadow = {
                  h: el.shadow.h * ratio,
                  v: el.shadow.v * ratio,
                  blur: el.shadow.blur * ratio,
                  color: el.shadow.color,
                };
              }

              slide.elements.push(textEl);
            }
            else if (el.type === 'image') {
              const element: PPTImageElement = {
                type: 'image',
                id: nanoid(10),
                src: el.src,
                width: el.width,
                height: el.height,
                left: el.left,
                top: el.top,
                fixedRatio: true,
                rotate: el.rotate || 0,
                flipH: el.isFlipH,
                flipV: el.isFlipV,
              };

              if (el.borderWidth) {
                element.outline = {
                  color: el.borderColor,
                  width: +(el.borderWidth * ratio).toFixed(2),
                  style: el.borderType,
                };
              }

              // Clip shapes (PPTist logic)
              const clipShapeTypes = ['roundRect', 'ellipse', 'triangle', 'rhombus', 'pentagon', 'hexagon'];
              if (el.rect) {
                element.clip = {
                  shape: (el.geom && clipShapeTypes.includes(el.geom)) ? el.geom : 'rect',
                  range: [
                    [el.rect.l || 0, el.rect.t || 0],
                    [100 - (el.rect.r || 0), 100 - (el.rect.b || 0)],
                  ]
                };
              }
              else if (el.geom && clipShapeTypes.includes(el.geom)) {
                element.clip = {
                  shape: el.geom,
                  range: [[0, 0], [100, 100]]
                };
              }

              slide.elements.push(element);
            }
            else if (el.type === 'shape') {
              // Check if it's a line/connector
              if (el.shapType === 'line' || /Connector/.test(el.shapType)) {
                const lineElement = parseLineElement(el, ratio);
                slide.elements.push(lineElement);
              }
              else {
                // Regular shape
                const gradient: Gradient | undefined = el.fill?.type === 'gradient' ? {
                  type: el.fill.value.path === 'line' ? 'linear' : 'radial',
                  colors: el.fill.value.colors.map((item: any) => ({
                    ...item,
                    pos: parseInt(item.pos),
                  })),
                  rotate: el.fill.value.rot,
                } : undefined;

                const fill = el.fill?.type === 'color' ? el.fill.value : '';

                const element: PPTShapeElement = {
                  type: 'shape',
                  id: nanoid(10),
                  width: el.width,
                  height: el.height,
                  left: el.left,
                  top: el.top,
                  viewBox: [200, 200],
                  path: el.path || 'M 0 0 L 200 0 L 200 200 L 0 200 Z',
                  fill,
                  gradient,
                  fixedRatio: false,
                  rotate: el.rotate || 0,
                  flipH: el.isFlipH,
                  flipV: el.isFlipV,
                };

                if (el.borderWidth) {
                  element.outline = {
                    color: el.borderColor || '#000000',
                    width: +(el.borderWidth * ratio).toFixed(2),
                    style: el.borderType || 'solid',
                  };
                }

                if (el.shadow) {
                  element.shadow = {
                    h: el.shadow.h * ratio,
                    v: el.shadow.v * ratio,
                    blur: el.shadow.blur * ratio,
                    color: el.shadow.color,
                  };
                }

                if (el.content) {
                  element.text = {
                    content: convertFontSizePtToPx(el.content, ratio),
                    defaultFontName: 'Arial',
                    defaultColor: '#000000',
                    align: 'middle',
                  };
                }

                slide.elements.push(element);
              }
            }
            else if (el.type === 'table') {
              const row = el.data.length;
              const col = el.data[0].length;

              const data: TableCell[][] = [];
              for (let i = 0; i < row; i++) {
                const rowCells: TableCell[] = [];
                for (let j = 0; j < col; j++) {
                  const cellData = el.data[i][j];

                  const textDiv = document.createElement('div');
                  textDiv.innerHTML = cellData.text;
                  const p = textDiv.querySelector('p');
                  const align = p?.style.textAlign || 'left';

                  const span = textDiv.querySelector('span');
                  const fontsize = span?.style.fontSize ? (parseInt(span?.style.fontSize) * ratio).toFixed(1) + 'px' : '';
                  const fontname = span?.style.fontFamily || '';
                  const color = span?.style.color || cellData.fontColor;

                  rowCells.push({
                    id: nanoid(10),
                    colspan: cellData.colSpan || 1,
                    rowspan: cellData.rowSpan || 1,
                    text: textDiv.innerText,
                    style: {
                      fontname: fontname || 'Arial',
                      color: color || '#000000',
                      align: ['left', 'right', 'center'].includes(align) ? (align as 'left' | 'right' | 'center') : 'left',
                      fontsize,
                      bold: cellData.fontBold,
                      backcolor: cellData.fillColor,
                    },
                  });
                }
                data.push(rowCells);
              }

              const allWidth = el.colWidths.reduce((a: number, b: number) => a + b, 0);
              const colWidths: number[] = el.colWidths.map((item: number) => item / allWidth);

              const firstCell = el.data[0][0];
              const border = firstCell.borders?.top ||
                firstCell.borders?.bottom ||
                el.borders?.top ||
                el.borders?.bottom;
              const borderWidth = border?.borderWidth || 2;
              const borderStyle = border?.borderType || 'solid';
              const borderColor = border?.borderColor || '#eeece1';

              const tableEl: PPTTableElement = {
                type: 'table',
                id: nanoid(10),
                width: el.width,
                height: el.height,
                left: el.left,
                top: el.top,
                rotate: 0,
                colWidths,
                data,
                outline: {
                  width: +(borderWidth * ratio).toFixed(2),
                  style: borderStyle,
                  color: borderColor,
                },
                cellMinHeight: el.rowHeights?.[0] ? el.rowHeights[0] * ratio : 36,
              };

              slide.elements.push(tableEl);
            }
            else if (el.type === 'chart') {
              let labels: string[];
              let legends: string[];
              let series: number[][];

              if (el.chartType === 'scatterChart' || el.chartType === 'bubbleChart') {
                labels = el.data[0].map((_: any, index: number) => `Point ${index + 1}`);
                legends = ['X', 'Y'];
                series = el.data;
              }
              else {
                const data = el.data;
                labels = Object.values(data[0].xlabels);
                legends = data.map((item: any) => item.key);
                series = data.map((item: any) => item.values.map((v: any) => v.y));
              }

              const options: ChartOptions = {};
              let chartType: ChartType = 'bar';

              // Map chart types (PPTist logic)
              switch (el.chartType) {
                case 'barChart':
                case 'bar3DChart':
                  chartType = 'bar';
                  if (el.barDir === 'bar') chartType = 'column';
                  if (el.grouping === 'stacked' || el.grouping === 'percentStacked') options.stack = true;
                  break;
                case 'lineChart':
                case 'line3DChart':
                  chartType = 'line';
                  if (el.grouping === 'stacked' || el.grouping === 'percentStacked') options.stack = true;
                  break;
                case 'areaChart':
                case 'area3DChart':
                  chartType = 'area';
                  if (el.grouping === 'stacked' || el.grouping === 'percentStacked') options.stack = true;
                  break;
                case 'scatterChart':
                case 'bubbleChart':
                  chartType = 'scatter';
                  break;
                case 'pieChart':
                case 'pie3DChart':
                  chartType = 'pie';
                  break;
                case 'radarChart':
                  chartType = 'radar';
                  break;
                case 'doughnutChart':
                  chartType = 'ring';
                  break;
              }

              const chartEl: PPTChartElement = {
                type: 'chart',
                id: nanoid(10),
                chartType,
                width: el.width,
                height: el.height,
                left: el.left,
                top: el.top,
                rotate: 0,
                themeColors: el.colors?.length ? el.colors : ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E86452'],
                textColor: '#666666',
                data: {
                  labels,
                  legends,
                  series,
                },
                options,
              };

              slide.elements.push(chartEl);
            }
          }

          slides.push(slide);
        }

        const presentation: Presentation = {
          id: nanoid(10),
          title: file.name.replace('.pptx', ''),
          slides,
          theme: {
            backgroundColor: '#FFFFFF',
            themeColors: json.themeColors || ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E86452'],
            fontColor: '#000000',
            fontName: 'Arial',
            outline: { width: 2, color: '#000000', style: 'solid' },
            shadow: { h: 0, v: 0, blur: 10, color: 'rgba(0, 0, 0, 0.5)' },
          },
          masterSlides: [],
          width,
          height,
        };

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
