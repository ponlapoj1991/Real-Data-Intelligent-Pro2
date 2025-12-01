/**
 * Inspector Panel Component
 * Right sidebar for editing element properties (PPTist-style)
 */

import React from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import { CommonPanel } from './CommonPanel';
import { TextPanel } from './TextPanel';
import { ImagePanel } from './ImagePanel';
import { ShapePanel } from './ShapePanel';
import { ChartPanel } from './ChartPanel';
import { TablePanel } from './TablePanel';
import { LinePanel } from './LinePanel';

export const Inspector: React.FC = () => {
  const { selectedElementIds, getCurrentSlide } = useSlideStore();
  const currentSlide = getCurrentSlide();

  // Get selected elements
  const selectedElements = currentSlide?.elements.filter((el) =>
    selectedElementIds.includes(el.id)
  ) || [];

  // Single selection
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

  // Multiple selection
  const isMultiSelect = selectedElements.length > 1;

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center px-4">
        <h2 className="text-sm font-semibold text-gray-700">
          {selectedElement
            ? `${selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)} Properties`
            : isMultiSelect
            ? `${selectedElements.length} Elements Selected`
            : 'No Selection'}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedElement ? (
          <>
            {/* Common properties - always shown */}
            <CommonPanel element={selectedElement} />

            {/* Element-specific properties */}
            {selectedElement.type === 'text' && <TextPanel element={selectedElement} />}
            {selectedElement.type === 'image' && <ImagePanel element={selectedElement} />}
            {selectedElement.type === 'shape' && <ShapePanel element={selectedElement} />}
            {selectedElement.type === 'chart' && <ChartPanel element={selectedElement} />}
            {selectedElement.type === 'table' && <TablePanel element={selectedElement} />}
            {selectedElement.type === 'line' && <LinePanel element={selectedElement} />}
          </>
        ) : isMultiSelect ? (
          <div className="p-4">
            <CommonPanel elements={selectedElements} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Select an element to edit properties
          </div>
        )}
      </div>
    </div>
  );
};
