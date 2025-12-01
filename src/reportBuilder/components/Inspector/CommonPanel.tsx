/**
 * Common Panel Component
 * Properties common to all elements (position, size, rotation, layer, lock)
 */

import React from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import type { PPTElement } from '../../types/slides';
import {
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface CommonPanelProps {
  element?: PPTElement;
  elements?: PPTElement[];
}

export const CommonPanel: React.FC<CommonPanelProps> = ({ element, elements }) => {
  const { updateElement, getCurrentSlide } = useSlideStore();
  const currentSlide = getCurrentSlide();

  const isSingleSelect = !!element;
  const isMultiSelect = !!elements && elements.length > 1;

  // For multi-select, use first element as reference
  const referenceElement = element || elements?.[0];

  if (!referenceElement) return null;

  const handleUpdate = (updates: Partial<PPTElement>) => {
    if (isSingleSelect && element) {
      updateElement(element.id, updates);
    } else if (isMultiSelect && elements) {
      // Apply to all selected elements
      elements.forEach((el) => {
        updateElement(el.id, updates);
      });
    }
  };

  const handleLayerChange = (direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (!currentSlide || !element) return;

    const currentIndex = currentSlide.elements.findIndex((el) => el.id === element.id);
    if (currentIndex === -1) return;

    const store = useSlideStore.getState();

    switch (direction) {
      case 'top':
        store.moveElementToTop(element.id);
        break;
      case 'bottom':
        store.moveElementToBottom(element.id);
        break;
      case 'up':
        store.moveElementUp(element.id);
        break;
      case 'down':
        store.moveElementDown(element.id);
        break;
    }
  };

  return (
    <div className="border-b border-gray-200">
      {/* Section Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-600 uppercase">Common</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Position & Size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">X Position</label>
            <input
              type="number"
              value={Math.round(referenceElement.left)}
              onChange={(e) => handleUpdate({ left: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isMultiSelect}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Y Position</label>
            <input
              type="number"
              value={Math.round(referenceElement.top)}
              onChange={(e) => handleUpdate({ top: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isMultiSelect}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Width</label>
            <input
              type="number"
              value={Math.round(referenceElement.width)}
              onChange={(e) => handleUpdate({ width: parseFloat(e.target.value) || 20 })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="20"
              disabled={isMultiSelect}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Height</label>
            <input
              type="number"
              value={Math.round(referenceElement.height)}
              onChange={(e) => handleUpdate({ height: parseFloat(e.target.value) || 20 })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="20"
              disabled={isMultiSelect}
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Rotation (degrees)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="360"
              value={referenceElement.rotate || 0}
              onChange={(e) => handleUpdate({ rotate: parseInt(e.target.value) })}
              className="flex-1"
            />
            <input
              type="number"
              value={referenceElement.rotate || 0}
              onChange={(e) => handleUpdate({ rotate: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="360"
            />
          </div>
        </div>

        {/* Layer Order */}
        {isSingleSelect && (
          <div>
            <label className="block text-xs text-gray-600 mb-2">Layer Order</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLayerChange('top')}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                <ChevronUp size={14} />
                To Top
              </button>
              <button
                onClick={() => handleLayerChange('bottom')}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                <ChevronDown size={14} />
                To Bottom
              </button>
              <button
                onClick={() => handleLayerChange('up')}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                <ArrowUp size={14} />
                Move Up
              </button>
              <button
                onClick={() => handleLayerChange('down')}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                <ArrowDown size={14} />
                Move Down
              </button>
            </div>
          </div>
        )}

        {/* Lock/Unlock */}
        <div>
          <label className="block text-xs text-gray-600 mb-2">Lock Element</label>
          <button
            onClick={() => handleUpdate({ lock: !referenceElement.lock })}
            className={`flex items-center justify-center gap-2 w-full px-3 py-2 text-sm rounded transition-colors ${
              referenceElement.lock
                ? 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {referenceElement.lock ? (
              <>
                <Lock size={16} />
                Locked
              </>
            ) : (
              <>
                <Unlock size={16} />
                Unlocked
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
