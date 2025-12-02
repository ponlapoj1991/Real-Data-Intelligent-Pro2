/**
 * Group Element Component
 * Renders a group of elements as a single unit
 */

import React from 'react';
import type { PPTGroupElement } from '../../types/slides';
import { ElementRenderer } from './index';

interface GroupElementProps {
  element: PPTGroupElement;
  isSelected: boolean;
}

export const GroupElement: React.FC<GroupElementProps> = ({ element, isSelected }) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Render child elements */}
      {element.elements.map((childElement) => (
        <div
          key={childElement.id}
          style={{
            position: 'absolute',
            left: childElement.left,
            top: childElement.top,
            width: childElement.width,
            height: 'height' in childElement ? childElement.height : 'auto',
            transform: `rotate(${childElement.rotate || 0}deg)`,
          }}
        >
          <ElementRenderer
            element={childElement}
            isSelected={false}
            onClick={() => {}}
          />
        </div>
      ))}

      {/* Group selection outline */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px dashed #4A90E2',
            pointerEvents: 'none',
            borderRadius: '2px',
          }}
        />
      )}
    </div>
  );
};
