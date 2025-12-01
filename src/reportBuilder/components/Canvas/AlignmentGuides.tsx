/**
 * AlignmentGuides Component
 * Shows alignment guides when dragging elements
 */

import React from 'react';

interface Guide {
  type: 'horizontal' | 'vertical';
  position: number;
}

interface AlignmentGuidesProps {
  guides: Guide[];
  width: number;
  height: number;
}

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({
  guides,
  width,
  height,
}) => {
  if (guides.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ zIndex: 9999 }}
    >
      {guides.map((guide, idx) => {
        if (guide.type === 'horizontal') {
          return (
            <line
              key={`h-${idx}`}
              x1={0}
              y1={guide.position}
              x2={width}
              y2={guide.position}
              stroke="#FF4081"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          );
        }

        return (
          <line
            key={`v-${idx}`}
            x1={guide.position}
            y1={0}
            x2={guide.position}
            y2={height}
            stroke="#FF4081"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        );
      })}
    </svg>
  );
};
