/**
 * Text Panel Component
 * Properties specific to text elements
 */

import React from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import type { PPTTextElement } from '../../types/slides';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';

interface TextPanelProps {
  element: PPTTextElement;
}

const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Helvetica',
  'Tahoma',
  'Trebuchet MS',
  'Comic Sans MS',
  'Impact',
];

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

export const TextPanel: React.FC<TextPanelProps> = ({ element }) => {
  const { updateElement } = useSlideStore();

  const handleUpdate = (updates: Partial<PPTTextElement>) => {
    updateElement(element.id, updates);
  };

  return (
    <div className="border-b border-gray-200">
      {/* Section Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-600 uppercase">Text</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Font Family */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Font Family</label>
          <select
            value={element.defaultFontName || 'Arial'}
            onChange={(e) => handleUpdate({ defaultFontName: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size & Color */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Font Size</label>
            <select
              value={element.fontSize || 14}
              onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value) })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={element.defaultColor || '#000000'}
                onChange={(e) => handleUpdate({ defaultColor: e.target.value })}
                className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={element.defaultColor || '#000000'}
                onChange={(e) => handleUpdate({ defaultColor: e.target.value })}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>

        {/* Text Style Toggles */}
        <div>
          <label className="block text-xs text-gray-600 mb-2">Text Style</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleUpdate({ bold: !element.bold })}
              className={`flex items-center justify-center w-10 h-8 border rounded transition-colors ${
                element.bold
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => handleUpdate({ em: !element.em })}
              className={`flex items-center justify-center w-10 h-8 border rounded transition-colors ${
                element.em
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => handleUpdate({ underline: !element.underline })}
              className={`flex items-center justify-center w-10 h-8 border rounded transition-colors ${
                element.underline
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              title="Underline"
            >
              <Underline size={16} />
            </button>
          </div>
        </div>

        {/* Text Alignment */}
        <div>
          <label className="block text-xs text-gray-600 mb-2">Alignment</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleUpdate({ align: 'left' })}
              className={`flex items-center justify-center h-8 border rounded transition-colors ${
                element.align === 'left'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              title="Align Left"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => handleUpdate({ align: 'center' })}
              className={`flex items-center justify-center h-8 border rounded transition-colors ${
                element.align === 'center'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              title="Align Center"
            >
              <AlignCenter size={16} />
            </button>
            <button
              onClick={() => handleUpdate({ align: 'right' })}
              className={`flex items-center justify-center h-8 border rounded transition-colors ${
                element.align === 'right'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              title="Align Right"
            >
              <AlignRight size={16} />
            </button>
            <button
              onClick={() => handleUpdate({ align: 'justify' })}
              className={`flex items-center justify-center h-8 border rounded transition-colors ${
                element.align === 'justify'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              title="Justify"
            >
              <AlignJustify size={16} />
            </button>
          </div>
        </div>

        {/* Line Height */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Line Height</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={element.lineHeight || 1.5}
              onChange={(e) => handleUpdate({ lineHeight: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <input
              type="number"
              value={element.lineHeight || 1.5}
              onChange={(e) => handleUpdate({ lineHeight: parseFloat(e.target.value) || 1.5 })}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="3"
              step="0.1"
            />
          </div>
        </div>

        {/* Background Fill */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Background Fill</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={element.fill || '#ffffff'}
              onChange={(e) => handleUpdate({ fill: e.target.value })}
              className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={element.fill || ''}
              onChange={(e) => handleUpdate({ fill: e.target.value })}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Transparent"
            />
            {element.fill && (
              <button
                onClick={() => handleUpdate({ fill: undefined })}
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
          <div className="space-y-2">
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
    </div>
  );
};
