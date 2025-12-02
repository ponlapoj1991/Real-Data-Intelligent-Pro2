/**
 * Shape Element Component
 * Renders SVG shapes with fills, gradients, and text
 */

import React from 'react';
import type { PPTShapeElement } from '../../types/slides';

interface ShapeElementProps {
  element: PPTShapeElement;
  isSelected: boolean;
}

export const ShapeElement: React.FC<ShapeElementProps> = ({ element, isSelected }) => {
  const [viewBoxWidth, viewBoxHeight] = element.viewBox;

  // Generate fill style
  let fill = element.fill;
  let fillId: string | undefined;

  if (element.gradient) {
    fillId = `gradient-${element.id}`;
  } else if (element.pattern) {
    fillId = `pattern-${element.id}`;
  }

  const svgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'visible',
  };

  const pathStyle: React.CSSProperties = {
    transform: `${element.flipH ? 'scaleX(-1)' : ''} ${element.flipV ? 'scaleY(-1)' : ''}`,
    transformOrigin: 'center',
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        opacity: element.opacity ?? 1,
        filter: element.shadow
          ? `drop-shadow(${element.shadow.h}px ${element.shadow.v}px ${element.shadow.blur}px ${element.shadow.color})`
          : undefined,
      }}
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio={element.fixedRatio ? 'xMidYMid meet' : 'none'}
        style={svgStyle}
      >
        {/* Definitions */}
        {(element.gradient || element.pattern) && (
          <defs>
            {/* Gradient */}
            {element.gradient && (
              element.gradient.type === 'linear' ? (
                <linearGradient
                  id={fillId}
                  gradientTransform={`rotate(${element.gradient.rotate})`}
                >
                  {element.gradient.colors.map((color, idx) => (
                    <stop
                      key={idx}
                      offset={`${color.pos}%`}
                      stopColor={color.color}
                    />
                  ))}
                </linearGradient>
              ) : (
                <radialGradient id={fillId}>
                  {element.gradient.colors.map((color, idx) => (
                    <stop
                      key={idx}
                      offset={`${color.pos}%`}
                      stopColor={color.color}
                    />
                  ))}
                </radialGradient>
              )
            )}

            {/* Pattern (Image Fill) */}
            {element.pattern && (
              <pattern
                id={fillId}
                patternUnits="objectBoundingBox"
                width="1"
                height="1"
              >
                <image
                  href={element.pattern}
                  x="0"
                  y="0"
                  width={viewBoxWidth}
                  height={viewBoxHeight}
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            )}
          </defs>
        )}

        {/* Shape Path */}
        <path
          d={element.path}
          fill={fillId ? `url(#${fillId})` : fill}
          stroke={element.outline?.color}
          strokeWidth={element.outline?.width}
          strokeDasharray={
            element.outline?.style === 'dashed'
              ? '5,5'
              : element.outline?.style === 'dotted'
              ? '2,2'
              : undefined
          }
          style={pathStyle}
        />
      </svg>

      {/* Shape Text */}
      {element.text && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems:
              element.text.align === 'top'
                ? 'flex-start'
                : element.text.align === 'bottom'
                ? 'flex-end'
                : 'center',
            justifyContent: 'center',
            padding: '12px',
            fontFamily: element.text.defaultFontName,
            color: element.text.defaultColor,
            pointerEvents: 'none',
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: element.text.content }}
            className="text-center"
          />
        </div>
      )}
    </div>
  );
};
