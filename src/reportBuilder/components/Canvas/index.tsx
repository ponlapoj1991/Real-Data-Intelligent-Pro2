/**
 * Canvas Component
 * Main canvas container with rulers and viewport
 */

import React from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import { Ruler } from './Ruler';
import { Viewport } from './Viewport';
import { ZoomIn, ZoomOut, Maximize2, Grid3X3 } from 'lucide-react';

export const Canvas: React.FC = () => {
  const {
    presentation,
    canvasScale,
    showGrid,
    showRuler,
    setCanvasScale,
    toggleGrid,
    toggleRuler,
  } = useSlideStore();

  if (!presentation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <p className="text-gray-400">No presentation loaded</p>
      </div>
    );
  }

  const { width, height } = presentation;

  const handleZoomIn = () => {
    setCanvasScale(Math.min(canvasScale + 0.1, 3));
  };

  const handleZoomOut = () => {
    setCanvasScale(Math.max(canvasScale - 0.1, 0.1));
  };

  const handleZoomReset = () => {
    setCanvasScale(1);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {presentation.title}
          </span>
          <span className="text-xs text-gray-400">
            {width} × {height}
          </span>
        </div>

        {/* Canvas Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleGrid}
            className={`p-2 rounded hover:bg-gray-100 ${
              showGrid ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
            title="Toggle Grid"
          >
            <Grid3X3 size={18} />
          </button>

          <button
            onClick={toggleRuler}
            className={`p-2 rounded hover:bg-gray-100 ${
              showRuler ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
            title="Toggle Ruler"
          >
            <Maximize2 size={18} />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={handleZoomOut}
            className="p-2 rounded hover:bg-gray-100 text-gray-600"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>

          <button
            onClick={handleZoomReset}
            className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
            title="Reset Zoom"
          >
            {Math.round(canvasScale * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            className="p-2 rounded hover:bg-gray-100 text-gray-600"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      {/* Canvas Area with Rulers */}
      <div className="flex-1 flex overflow-hidden">
        {/* Ruler Corner */}
        {showRuler && (
          <div className="w-5 h-5 bg-gray-100 border-r border-b border-gray-300 flex-shrink-0" />
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Horizontal Ruler */}
          {showRuler && (
            <Ruler
              direction="horizontal"
              length={width}
              scale={canvasScale}
            />
          )}

          {/* Canvas with Vertical Ruler */}
          <div className="flex-1 flex overflow-hidden">
            {/* Vertical Ruler */}
            {showRuler && (
              <Ruler
                direction="vertical"
                length={height}
                scale={canvasScale}
              />
            )}

            {/* Viewport */}
            <Viewport width={width} height={height} />
          </div>
        </div>
      </div>
    </div>
  );
};
