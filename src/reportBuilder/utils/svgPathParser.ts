/**
 * SVG Path Parser Utilities
 * Based on PPTist implementation
 */

import { SVGPathData } from 'svg-pathdata';

/**
 * Get the bounding box range of an SVG path
 * @param path SVG path d attribute
 * @returns Object with minX, minY, maxX, maxY
 */
export const getSvgPathRange = (path: string) => {
  try {
    const pathData = new SVGPathData(path);
    const xList: number[] = [];
    const yList: number[] = [];

    for (const item of pathData.commands) {
      const x = ('x' in item) ? item.x : 0;
      const y = ('y' in item) ? item.y : 0;
      xList.push(x as number);
      yList.push(y as number);
    }

    return {
      minX: Math.min(...xList),
      minY: Math.min(...yList),
      maxX: Math.max(...xList),
      maxY: Math.max(...yList),
    };
  }
  catch {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
  }
};
