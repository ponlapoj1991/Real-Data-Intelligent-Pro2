/**
 * Line Panel Component
 * Properties specific to line elements
 */

import React from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import type { PPTLineElement } from '../../types/slides';

interface LinePanelProps {
  element: PPTLineElement;
}

export const LinePanel: React.FC<LinePanelProps> = ({ element }) => {
  const { updateElement } = useSlideStore();

  const handleUpdate = (updates: Partial<PPTLineElement>) => {
    updateElement(element.id, updates);
  };

  return (
    <div className="border-b border-gray-200">
      {/* Section Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-600 uppercase">Line</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Line Color */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Line Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={element.color || '#000000'}
              onChange={(e) => handleUpdate({ color: e.target.value })}
              className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={element.color || '#000000'}
              onChange={(e) => handleUpdate({ color: e.target.value })}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Line Width */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Line Width</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="20"
              value={element.width || 2}
              onChange={(e) => handleUpdate({ width: parseInt(e.target.value) })}
              className="flex-1"
            />
            <input
              type="number"
              value={element.width || 2}
              onChange={(e) => handleUpdate({ width: parseInt(e.target.value) || 2 })}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="20"
            />
          </div>
        </div>

        {/* Line Style */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Line Style</label>
          <select
            value={element.style || 'solid'}
            onChange={(e) => handleUpdate({ style: e.target.value as any })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>

        {/* Line Type */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Line Type</label>
          <select
            value={element.lineType || 'straight'}
            onChange={(e) => handleUpdate({ lineType: e.target.value as any })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="straight">Straight</option>
            <option value="curve">Curved</option>
            <option value="polyline">Polyline</option>
          </select>
        </div>

        {/* Start Point Style */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Start Point</label>
          <select
            value={element.points?.[0]?.style || 'none'}
            onChange={(e) =>
              handleUpdate({
                points: [
                  { ...element.points?.[0], style: e.target.value as any },
                  element.points?.[1] || { x: 100, y: 100, style: 'none' },
                ],
              })
            }
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="arrow">Arrow</option>
            <option value="dot">Dot</option>
            <option value="square">Square</option>
          </select>
        </div>

        {/* End Point Style */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">End Point</label>
          <select
            value={element.points?.[1]?.style || 'arrow'}
            onChange={(e) =>
              handleUpdate({
                points: [
                  element.points?.[0] || { x: 0, y: 0, style: 'none' },
                  { ...element.points?.[1], style: e.target.value as any },
                ],
              })
            }
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="arrow">Arrow</option>
            <option value="dot">Dot</option>
            <option value="square">Square</option>
          </select>
        </div>

        {/* Curve Control (if curved) */}
        {element.lineType === 'curve' && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Curve Type</label>
            <select
              value={element.curveType || 'quadratic'}
              onChange={(e) => handleUpdate({ curveType: e.target.value as any })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="quadratic">Quadratic (1 control point)</option>
              <option value="cubic">Cubic (2 control points)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
