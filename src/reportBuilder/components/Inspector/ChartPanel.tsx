/**
 * Chart Panel Component
 * Properties specific to chart elements
 */

import React from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import type { PPTChartElement } from '../../types/slides';

interface ChartPanelProps {
  element: PPTChartElement;
}

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'column', label: 'Column Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'ring', label: 'Donut Chart' },
  { value: 'radar', label: 'Radar Chart' },
  { value: 'scatter', label: 'Scatter Chart' },
];

const DEFAULT_COLORS = [
  '#5B8FF9',
  '#5AD8A6',
  '#5D7092',
  '#F6BD16',
  '#E86452',
  '#6DC8EC',
  '#945FB9',
  '#FF9845',
];

export const ChartPanel: React.FC<ChartPanelProps> = ({ element }) => {
  const { updateElement } = useSlideStore();

  const handleUpdate = (updates: Partial<PPTChartElement>) => {
    updateElement(element.id, updates);
  };

  return (
    <div className="border-b border-gray-200">
      {/* Section Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-600 uppercase">Chart</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Chart Type */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Chart Type</label>
          <select
            value={element.chartType}
            onChange={(e) => handleUpdate({ chartType: e.target.value as any })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CHART_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Theme Colors */}
        <div>
          <label className="block text-xs text-gray-600 mb-2">Theme Colors</label>
          <div className="grid grid-cols-4 gap-2">
            {element.themeColors.map((color, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    const newColors = [...element.themeColors];
                    newColors[idx] = e.target.value;
                    handleUpdate({ themeColors: newColors });
                  }}
                  className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => handleUpdate({ themeColors: DEFAULT_COLORS })}
            className="mt-2 w-full px-3 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
          >
            Reset to Default
          </button>
        </div>

        {/* Chart Options */}
        <div>
          <label className="block text-xs text-gray-600 mb-2">Options</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.options?.showLegend !== false}
                onChange={(e) =>
                  handleUpdate({
                    options: {
                      ...element.options,
                      showLegend: e.target.checked,
                    },
                  })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Show Legend</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.options?.showGrid !== false}
                onChange={(e) =>
                  handleUpdate({
                    options: {
                      ...element.options,
                      showGrid: e.target.checked,
                    },
                  })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Show Grid</span>
            </label>
            {(element.chartType === 'bar' || element.chartType === 'column' || element.chartType === 'area') && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={element.options?.stack || false}
                  onChange={(e) =>
                    handleUpdate({
                      options: {
                        ...element.options,
                        stack: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Stack Series</span>
              </label>
            )}
            {element.chartType === 'line' && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={element.options?.lineSmooth || false}
                  onChange={(e) =>
                    handleUpdate({
                      options: {
                        ...element.options,
                        lineSmooth: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Smooth Line</span>
              </label>
            )}
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Text Color</label>
            <input
              type="color"
              value={element.textColor || '#666666'}
              onChange={(e) => handleUpdate({ textColor: e.target.value })}
              className="w-full h-8 border border-gray-300 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grid Color</label>
            <input
              type="color"
              value={element.lineColor || '#cccccc'}
              onChange={(e) => handleUpdate({ lineColor: e.target.value })}
              className="w-full h-8 border border-gray-300 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Background */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Background Color</label>
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
