/**
 * Image Element Component
 * Renders images with filters, clip, and effects
 */

import React from 'react';
import type { PPTImageElement } from '../../types/slides';

interface ImageElementProps {
  element: PPTImageElement;
  isSelected: boolean;
}

export const ImageElement: React.FC<ImageElementProps> = ({ element, isSelected }) => {
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: element.radius ? `${element.radius}px` : undefined,
    border: element.outline
      ? `${element.outline.width}px ${element.outline.style} ${element.outline.color}`
      : undefined,
    boxShadow: element.shadow
      ? `${element.shadow.h}px ${element.shadow.v}px ${element.shadow.blur}px ${element.shadow.color}`
      : undefined,
    position: 'relative',
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: element.fixedRatio ? 'contain' : 'fill',
    transform: `${element.flipH ? 'scaleX(-1)' : ''} ${element.flipV ? 'scaleY(-1)' : ''}`,
  };

  // Apply filters
  if (element.filters) {
    const filterStrings: string[] = [];

    if (element.filters.blur) filterStrings.push(`blur(${element.filters.blur})`);
    if (element.filters.brightness) filterStrings.push(`brightness(${element.filters.brightness})`);
    if (element.filters.contrast) filterStrings.push(`contrast(${element.filters.contrast})`);
    if (element.filters.grayscale) filterStrings.push(`grayscale(${element.filters.grayscale})`);
    if (element.filters.saturate) filterStrings.push(`saturate(${element.filters.saturate})`);
    if (element.filters['hue-rotate']) filterStrings.push(`hue-rotate(${element.filters['hue-rotate']})`);
    if (element.filters.sepia) filterStrings.push(`sepia(${element.filters.sepia})`);
    if (element.filters.invert) filterStrings.push(`invert(${element.filters.invert})`);
    if (element.filters.opacity) filterStrings.push(`opacity(${element.filters.opacity})`);

    if (filterStrings.length > 0) {
      imageStyle.filter = filterStrings.join(' ');
    }
  }

  // Color mask overlay
  const colorMaskStyle: React.CSSProperties | undefined = element.colorMask
    ? {
        position: 'absolute',
        inset: 0,
        backgroundColor: element.colorMask,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }
    : undefined;

  // Clip path
  if (element.clip) {
    const { range, shape } = element.clip;
    const [[x1, y1], [x2, y2]] = range;

    // Simple rectangular clip (can be extended for shapes)
    containerStyle.clipPath = `inset(${y1}% ${100 - x2}% ${100 - y2}% ${x1}%)`;
  }

  return (
    <div style={containerStyle}>
      <img
        src={element.src}
        alt=""
        style={imageStyle}
        draggable={false}
      />
      {colorMaskStyle && <div style={colorMaskStyle} />}
    </div>
  );
};
