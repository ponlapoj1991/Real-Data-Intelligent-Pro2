/**
 * Image Panel Component
 * Properties specific to image elements
 */

import React from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import type { PPTImageElement } from '../../types/slides';
import { FlipHorizontal, FlipVertical } from 'lucide-react';

interface ImagePanelProps {
  element: PPTImageElement;
}

const FILTER_TYPES = [
  { value: '', label: 'None' },
  { value: 'grayscale', label: 'Grayscale' },
  { value: 'blur', label: 'Blur' },
  { value: 'brightness', label: 'Brightness' },
  { value: 'contrast', label: 'Contrast' },
  { value: 'saturate', label: 'Saturate' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'invert', label: 'Invert' },
  { value: 'hue-rotate', label: 'Hue Rotate' },
  { value: 'opacity', label: 'Opacity' },
];

const CLIP_PATHS = [
  { value: '', label: 'None' },
  { value: 'circle', label: 'Circle' },
  { value: 'ellipse', label: 'Ellipse' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'pentagon', label: 'Pentagon' },
  { value: 'hexagon', label: 'Hexagon' },
];

export const ImagePanel: React.FC<ImagePanelProps> = ({ element }) => {
  const { updateElement } = useSlideStore();

  const handleUpdate = (updates: Partial<PPTImageElement>) => {
    updateElement(element.id, updates);
  };

  return (
    <div className="border-b border-gray-200">
      {/* Section Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-600 uppercase">Image</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Image Source */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Image URL</label>
          <input
            type="text"
            value={element.src}
            onChange={(e) => handleUpdate({ src: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        {/* Flip Controls */}
        <div>
          <label className="block text-xs text-gray-600 mb-2">Flip</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleUpdate({ flipH: !element.flipH })}
              className={`flex items-center justify-center gap-2 flex-1 px-3 py-2 text-sm border rounded transition-colors ${
                element.flipH
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FlipHorizontal size={16} />
              Horizontal
            </button>
            <button
              onClick={() => handleUpdate({ flipV: !element.flipV })}
              className={`flex items-center justify-center gap-2 flex-1 px-3 py-2 text-sm border rounded transition-colors ${
                element.flipV
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FlipVertical size={16} />
              Vertical
            </button>
          </div>
        </div>

        {/* Filter Type */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Filter</label>
          <select
            value={element.filters?.type || ''}
            onChange={(e) =>
              handleUpdate({
                filters: e.target.value
                  ? {
                      type: e.target.value as any,
                      value: element.filters?.value || 50,
                    }
                  : undefined,
              })
            }
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FILTER_TYPES.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Value */}
        {element.filters && element.filters.type && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Filter Intensity</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={element.filters.value || 50}
                onChange={(e) =>
                  handleUpdate({
                    filters: {
                      type: element.filters!.type,
                      value: parseInt(e.target.value),
                    },
                  })
                }
                className="flex-1"
              />
              <span className="w-12 text-sm text-gray-600 text-right">
                {element.filters.value || 50}%
              </span>
            </div>
          </div>
        )}

        {/* Opacity */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Opacity</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={element.opacity !== undefined ? element.opacity : 1}
              onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="w-12 text-sm text-gray-600 text-right">
              {Math.round((element.opacity !== undefined ? element.opacity : 1) * 100)}%
            </span>
          </div>
        </div>

        {/* Border Radius */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Border Radius</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="50"
              value={element.radius || 0}
              onChange={(e) => handleUpdate({ radius: parseInt(e.target.value) })}
              className="flex-1"
            />
            <input
              type="number"
              value={element.radius || 0}
              onChange={(e) => handleUpdate({ radius: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="50"
            />
          </div>
        </div>

        {/* Clip Path */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Clip Shape</label>
          <select
            value={element.clip?.shape || ''}
            onChange={(e) =>
              handleUpdate({
                clip: e.target.value ? { shape: e.target.value as any } : undefined,
              })
            }
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CLIP_PATHS.map((clip) => (
              <option key={clip.value} value={clip.value}>
                {clip.label}
              </option>
            ))}
          </select>
        </div>

        {/* Color Overlay */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Color Overlay</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={element.colorMask || '#000000'}
              onChange={(e) => handleUpdate({ colorMask: e.target.value })}
              className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={element.colorMask || ''}
              onChange={(e) => handleUpdate({ colorMask: e.target.value })}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="No overlay"
            />
            {element.colorMask && (
              <button
                onClick={() => handleUpdate({ colorMask: undefined })}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Outline */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Outline</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={element.outline?.color || '#000000'}
              onChange={(e) =>
                handleUpdate({
                  outline: {
                    ...element.outline,
                    color: e.target.value,
                    width: element.outline?.width || 1,
                    style: element.outline?.style || 'solid',
                  },
                })
              }
              className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="number"
              value={element.outline?.width || 0}
              onChange={(e) =>
                handleUpdate({
                  outline: {
                    color: element.outline?.color || '#000000',
                    width: parseInt(e.target.value) || 0,
                    style: element.outline?.style || 'solid',
                  },
                })
              }
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="10"
              placeholder="Width"
            />
            {element.outline && element.outline.width > 0 && (
              <button
                onClick={() => handleUpdate({ outline: undefined })}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
