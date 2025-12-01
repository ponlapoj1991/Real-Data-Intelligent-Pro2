/**
 * Shape Panel Component
 * Properties specific to shape elements
 */

import React from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import type { PPTShapeElement } from '../../types/slides';

interface ShapePanelProps {
  element: PPTShapeElement;
}

export const ShapePanel: React.FC<ShapePanelProps> = ({ element }) => {
  const { updateElement } = useSlideStore();

  const handleUpdate = (updates: Partial<PPTShapeElement>) => {
    updateElement(element.id, updates);
  };

  const hasGradient = element.gradient && element.gradient.colors.length > 0;

  return (
    <div className="border-b border-gray-200">
      {/* Section Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-600 uppercase">Shape</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Fill Type */}
        <div>
          <label className="block text-xs text-gray-600 mb-2">Fill Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                handleUpdate({
                  fill: element.fill || '#3B82F6',
                  gradient: undefined,
                })
              }
              className={`px-3 py-2 text-sm border rounded transition-colors ${
                !hasGradient
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Solid
            </button>
            <button
              onClick={() =>
                handleUpdate({
                  gradient: {
                    type: 'linear',
                    angle: 90,
                    colors: [
                      { pos: 0, color: '#3B82F6' },
                      { pos: 100, color: '#8B5CF6' },
                    ],
                  },
                  fill: undefined,
                })
              }
              className={`px-3 py-2 text-sm border rounded transition-colors ${
                hasGradient
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Gradient
            </button>
          </div>
        </div>

        {/* Solid Fill */}
        {!hasGradient && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fill Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={element.fill || '#3B82F6'}
                onChange={(e) => handleUpdate({ fill: e.target.value })}
                className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={element.fill || '#3B82F6'}
                onChange={(e) => handleUpdate({ fill: e.target.value })}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#3B82F6"
              />
            </div>
          </div>
        )}

        {/* Gradient Fill */}
        {hasGradient && element.gradient && (
          <>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Gradient Type</label>
              <select
                value={element.gradient.type}
                onChange={(e) =>
                  handleUpdate({
                    gradient: {
                      ...element.gradient!,
                      type: e.target.value as 'linear' | 'radial',
                    },
                  })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </div>

            {element.gradient.type === 'linear' && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Gradient Angle</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={element.gradient.angle || 90}
                    onChange={(e) =>
                      handleUpdate({
                        gradient: {
                          ...element.gradient!,
                          angle: parseInt(e.target.value),
                        },
                      })
                    }
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={element.gradient.angle || 90}
                    onChange={(e) =>
                      handleUpdate({
                        gradient: {
                          ...element.gradient!,
                          angle: parseInt(e.target.value) || 90,
                        },
                      })
                    }
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="360"
                  />
                </div>
              </div>
            )}

            {/* Gradient Colors */}
            <div>
              <label className="block text-xs text-gray-600 mb-2">Gradient Colors</label>
              <div className="space-y-2">
                {element.gradient.colors.map((colorStop, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorStop.color}
                      onChange={(e) => {
                        const newColors = [...element.gradient!.colors];
                        newColors[idx] = { ...colorStop, color: e.target.value };
                        handleUpdate({
                          gradient: {
                            ...element.gradient!,
                            colors: newColors,
                          },
                        });
                      }}
                      className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="number"
                      value={colorStop.pos}
                      onChange={(e) => {
                        const newColors = [...element.gradient!.colors];
                        newColors[idx] = { ...colorStop, pos: parseInt(e.target.value) || 0 };
                        handleUpdate({
                          gradient: {
                            ...element.gradient!,
                            colors: newColors,
                          },
                        });
                      }}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                      placeholder="0"
                    />
                    <span className="text-xs text-gray-500">%</span>
                    {element.gradient.colors.length > 2 && (
                      <button
                        onClick={() => {
                          const newColors = element.gradient!.colors.filter((_, i) => i !== idx);
                          handleUpdate({
                            gradient: {
                              ...element.gradient!,
                              colors: newColors,
                            },
                          });
                        }}
                        className="ml-auto px-2 py-1 text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {element.gradient.colors.length < 5 && (
                  <button
                    onClick={() => {
                      const newColors = [
                        ...element.gradient!.colors,
                        { pos: 100, color: '#FFFFFF' },
                      ];
                      handleUpdate({
                        gradient: {
                          ...element.gradient!,
                          colors: newColors,
                        },
                      });
                    }}
                    className="w-full px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                  >
                    + Add Color Stop
                  </button>
                )}
              </div>
            </div>
          </>
        )}

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
            {element.outline && element.outline.width > 0 && (
              <button
                onClick={() => handleUpdate({ outline: undefined })}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
              >
                Clear Outline
              </button>
            )}
          </div>
        </div>

        {/* Shadow */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Shadow</label>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  value={element.shadow?.h || 0}
                  onChange={(e) =>
                    handleUpdate({
                      shadow: {
                        ...element.shadow,
                        h: parseInt(e.target.value) || 0,
                        v: element.shadow?.v || 0,
                        blur: element.shadow?.blur || 5,
                        color: element.shadow?.color || '#00000040',
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="H offset"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={element.shadow?.v || 0}
                  onChange={(e) =>
                    handleUpdate({
                      shadow: {
                        ...element.shadow,
                        h: element.shadow?.h || 0,
                        v: parseInt(e.target.value) || 0,
                        blur: element.shadow?.blur || 5,
                        color: element.shadow?.color || '#00000040',
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="V offset"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={element.shadow?.blur || 0}
                onChange={(e) =>
                  handleUpdate({
                    shadow: {
                      ...element.shadow,
                      h: element.shadow?.h || 0,
                      v: element.shadow?.v || 0,
                      blur: parseInt(e.target.value) || 0,
                      color: element.shadow?.color || '#00000040',
                    },
                  })
                }
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                placeholder="Blur"
              />
              <input
                type="color"
                value={element.shadow?.color?.slice(0, 7) || '#000000'}
                onChange={(e) =>
                  handleUpdate({
                    shadow: {
                      ...element.shadow,
                      h: element.shadow?.h || 0,
                      v: element.shadow?.v || 0,
                      blur: element.shadow?.blur || 5,
                      color: e.target.value + '40',
                    },
                  })
                }
                className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
              />
            </div>
            {element.shadow && (element.shadow.h !== 0 || element.shadow.v !== 0 || element.shadow.blur !== 0) && (
              <button
                onClick={() => handleUpdate({ shadow: undefined })}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
              >
                Clear Shadow
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
