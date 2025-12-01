/**
 * Element Renderer
 * Routes element types to appropriate components
 */

import React, { useState } from 'react';
import type { PPTElement } from '../../types/slides';
import { TextElement } from './TextElement';
import { ImageElement } from './ImageElement';
import { ShapeElement } from './ShapeElement';
import { LineElement } from './LineElement';
import { TableElement } from './TableElement';
import { ChartElement } from './ChartElement';

interface ElementRendererProps {
  element: PPTElement;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

export const ElementRenderer: React.FC<ElementRendererProps> = ({
  element,
  isSelected,
  onClick,
  onDoubleClick,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.left,
    top: element.top,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotate}deg)`,
    cursor: element.lock ? 'default' : 'move',
    pointerEvents: element.lock ? 'none' : 'auto',
    border: isSelected ? '2px solid #2F88FF' : '1px solid transparent',
    boxShadow: isSelected ? '0 0 0 1px #2F88FF' : undefined,
    outline: 'none',
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!element.lock) {
      onClick(e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!element.lock && element.type === 'text') {
      e.stopPropagation();
      setIsEditing(true);
    }
    onDoubleClick?.(e);
  };

  const renderElement = () => {
    switch (element.type) {
      case 'text':
        return (
          <TextElement
            element={element}
            isSelected={isSelected}
            isEditing={isEditing}
            onStartEdit={() => setIsEditing(true)}
            onStopEdit={() => setIsEditing(false)}
          />
        );

      case 'image':
        return <ImageElement element={element} isSelected={isSelected} />;

      case 'shape':
        return <ShapeElement element={element} isSelected={isSelected} />;

      case 'line':
        return <LineElement element={element} isSelected={isSelected} />;

      case 'table':
        return <TableElement element={element} isSelected={isSelected} />;

      case 'chart':
        return <ChartElement element={element} isSelected={isSelected} />;

      case 'latex':
        return (
          <div className="flex items-center justify-center h-full bg-gray-50 text-sm text-gray-500">
            LaTeX: {element.latex}
          </div>
        );

      case 'video':
        return (
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            {element.poster ? (
              <img src={element.poster} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-white text-sm">Video: {element.src}</div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div
            className="flex items-center justify-center h-full rounded-full"
            style={{ backgroundColor: element.color }}
          >
            <div className="text-white text-sm">♪</div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full bg-gray-100 text-xs text-gray-500">
            Unknown element
          </div>
        );
    }
  };

  return (
    <div
      style={commonStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="hover:ring-2 hover:ring-blue-300 transition-all"
    >
      {renderElement()}
    </div>
  );
};
