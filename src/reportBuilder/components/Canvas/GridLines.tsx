/**
 * GridLines Component
 * Renders canvas grid for alignment
 */

import React from 'react';

interface GridLinesProps {
  width: number;
  height: number;
  gridSize?: number;
  color?: string;
  visible?: boolean;
}

export const GridLines: React.FC<GridLinesProps> = ({
  width,
  height,
  gridSize = 10,
  color = '#e5e7eb',
  visible = true,
}) => {
  if (!visible) return null;

  const horizontalLines: number[] = [];
  const verticalLines: number[] = [];

  // Generate grid lines
  for (let i = 0; i <= height; i += gridSize) {
    horizontalLines.push(i);
  }

  for (let i = 0; i <= width; i += gridSize) {
    verticalLines.push(i);
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ zIndex: 0 }}
    >
      {/* Horizontal lines */}
      {horizontalLines.map((y) => (
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke={color}
          strokeWidth={y % 50 === 0 ? 0.5 : 0.25}
          opacity={y % 50 === 0 ? 0.4 : 0.2}
        />
      ))}

      {/* Vertical lines */}
      {verticalLines.map((x) => (
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke={color}
          strokeWidth={x % 50 === 0 ? 0.5 : 0.25}
          opacity={x % 50 === 0 ? 0.4 : 0.2}
        />
      ))}
    </svg>
  );
};
