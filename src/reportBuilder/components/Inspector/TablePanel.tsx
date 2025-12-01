/**
 * Table Panel Component
 * Properties specific to table elements
 */

import React from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import type { PPTTableElement } from '../../types/slides';

interface TablePanelProps {
  element: PPTTableElement;
}

const TABLE_THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'striped', label: 'Striped Rows' },
  { value: 'grid', label: 'Grid' },
  { value: 'minimal', label: 'Minimal' },
];

export const TablePanel: React.FC<TablePanelProps> = ({ element }) => {
  const { updateElement } = useSlideStore();

  const handleUpdate = (updates: Partial<PPTTableElement>) => {
    updateElement(element.id, updates);
  };

  return (
    <div className="border-b border-gray-200">
      {/* Section Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-600 uppercase">Table</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Table Theme */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Theme</label>
          <select
            value={element.theme || 'default'}
            onChange={(e) => handleUpdate({ theme: e.target.value as any })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TABLE_THEMES.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cell Min Height */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Min Cell Height</label>
          <input
            type="number"
            value={element.cellMinHeight || 40}
            onChange={(e) => handleUpdate({ cellMinHeight: parseInt(e.target.value) || 40 })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="20"
            max="200"
          />
        </div>

        {/* Outline */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Table Outline</label>
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
                value={element.outline?.width || 1}
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
              <select
                value={element.outline?.style || 'solid'}
                onChange={(e) =>
                  handleUpdate({
                    outline: {
                      color: element.outline?.color || '#000000',
                      width: element.outline?.width || 1,
                      style: e.target.value as any,
                    },
                  })
                }
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Column Widths */}
        <div>
          <label className="block text-xs text-gray-600 mb-2">Column Widths</label>
          <div className="text-xs text-gray-500 mb-2">
            {element.colWidths.length} columns
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {element.colWidths.map((width, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-12">Col {idx + 1}:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={width}
                  onChange={(e) => {
                    const newWidths = [...element.colWidths];
                    newWidths[idx] = parseFloat(e.target.value);
                    // Normalize to ensure sum = 1
                    const sum = newWidths.reduce((a, b) => a + b, 0);
                    const normalized = newWidths.map((w) => w / sum);
                    handleUpdate({ colWidths: normalized });
                  }}
                  className="flex-1"
                />
                <span className="text-xs text-gray-600 w-12 text-right">
                  {Math.round(width * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Table Info */}
        <div className="pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div>Rows: {element.data.length}</div>
            <div>Columns: {element.colWidths.length}</div>
            <div>
              Total Cells:{' '}
              {element.data.reduce((sum, row) => sum + row.length, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
