/**
 * Line Element Component
 * Renders lines with curves, arrows, and styles
 */

import React from 'react';
import type { PPTLineElement } from '../../types/slides';

interface LineElementProps {
  element: PPTLineElement;
  isSelected: boolean;
}

export const LineElement: React.FC<LineElementProps> = ({ element, isSelected }) => {
  const [startX, startY] = element.start;
  const [endX, endY] = element.end;

  // Calculate bounding box
  const minX = Math.min(startX, endX, element.broken?.[0] ?? Infinity, element.curve?.[0] ?? Infinity);
  const minY = Math.min(startY, endY, element.broken?.[1] ?? Infinity, element.curve?.[1] ?? Infinity);
  const maxX = Math.max(startX, endX, element.broken?.[0] ?? -Infinity, element.curve?.[0] ?? -Infinity);
  const maxY = Math.max(startY, endY, element.broken?.[1] ?? -Infinity, element.curve?.[1] ?? -Infinity);

  const width = maxX - minX + 20;
  const height = maxY - minY + 20;

  // Adjust coordinates relative to bounding box
  const relStartX = startX - minX + 10;
  const relStartY = startY - minY + 10;
  const relEndX = endX - minX + 10;
  const relEndY = endY - minY + 10;

  // Generate path
  let pathD = `M ${relStartX} ${relStartY}`;

  if (element.curve) {
    // Quadratic curve
    const [ctrlX, ctrlY] = element.curve;
    const relCtrlX = ctrlX - minX + 10;
    const relCtrlY = ctrlY - minY + 10;
    pathD += ` Q ${relCtrlX} ${relCtrlY} ${relEndX} ${relEndY}`;
  } else if (element.cubic) {
    // Cubic Bezier curve
    const [[ctrl1X, ctrl1Y], [ctrl2X, ctrl2Y]] = element.cubic;
    const relCtrl1X = ctrl1X - minX + 10;
    const relCtrl1Y = ctrl1Y - minY + 10;
    const relCtrl2X = ctrl2X - minX + 10;
    const relCtrl2Y = ctrl2Y - minY + 10;
    pathD += ` C ${relCtrl1X} ${relCtrl1Y} ${relCtrl2X} ${relCtrl2Y} ${relEndX} ${relEndY}`;
  } else if (element.broken) {
    // Broken line (polyline)
    const [brokenX, brokenY] = element.broken;
    const relBrokenX = brokenX - minX + 10;
    const relBrokenY = brokenY - minY + 10;
    pathD += ` L ${relBrokenX} ${relBrokenY}`;

    if (element.broken2) {
      const [broken2X, broken2Y] = element.broken2;
      const relBroken2X = broken2X - minX + 10;
      const relBroken2Y = broken2Y - minY + 10;
      pathD += ` L ${relBroken2X} ${relBroken2Y}`;
    }

    pathD += ` L ${relEndX} ${relEndY}`;
  } else {
    // Straight line
    pathD += ` L ${relEndX} ${relEndY}`;
  }

  const strokeDasharray =
    element.style === 'dashed'
      ? '8,4'
      : element.style === 'dotted'
      ? '2,2'
      : undefined;

  // Arrow markers
  const [startPoint, endPoint] = element.points;
  const markerId = `line-${element.id}`;

  return (
    <svg
      width={width}
      height={height}
      style={{
        overflow: 'visible',
        filter: element.shadow
          ? `drop-shadow(${element.shadow.h}px ${element.shadow.v}px ${element.shadow.blur}px ${element.shadow.color})`
          : undefined,
      }}
    >
      <defs>
        {/* Arrow marker for end */}
        {endPoint === 'arrow' && (
          <marker
            id={`${markerId}-end-arrow`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={element.color} />
          </marker>
        )}

        {/* Dot marker for end */}
        {endPoint === 'dot' && (
          <marker
            id={`${markerId}-end-dot`}
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            markerUnits="strokeWidth"
          >
            <circle cx="4" cy="4" r="3" fill={element.color} />
          </marker>
        )}

        {/* Arrow marker for start */}
        {startPoint === 'arrow' && (
          <marker
            id={`${markerId}-start-arrow`}
            markerWidth="10"
            markerHeight="10"
            refX="0"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M9,0 L9,6 L0,3 z" fill={element.color} />
          </marker>
        )}

        {/* Dot marker for start */}
        {startPoint === 'dot' && (
          <marker
            id={`${markerId}-start-dot`}
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            markerUnits="strokeWidth"
          >
            <circle cx="4" cy="4" r="3" fill={element.color} />
          </marker>
        )}
      </defs>

      <path
        d={pathD}
        stroke={element.color}
        strokeWidth={element.width || 2}
        strokeDasharray={strokeDasharray}
        fill="none"
        markerEnd={
          endPoint === 'arrow'
            ? `url(#${markerId}-end-arrow)`
            : endPoint === 'dot'
            ? `url(#${markerId}-end-dot)`
            : undefined
        }
        markerStart={
          startPoint === 'arrow'
            ? `url(#${markerId}-start-arrow)`
            : startPoint === 'dot'
            ? `url(#${markerId}-start-dot)`
            : undefined
        }
      />
    </svg>
  );
};
