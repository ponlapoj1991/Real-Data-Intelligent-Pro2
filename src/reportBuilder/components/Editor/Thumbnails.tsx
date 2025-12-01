/**
 * Thumbnails Panel
 * Shows slide thumbnails for navigation
 */

import React from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import { Plus, Copy, Trash2 } from 'lucide-react';

export const Thumbnails: React.FC = () => {
  const {
    presentation,
    currentSlideId,
    setCurrentSlide,
    addSlide,
    duplicateSlide,
    deleteSlide,
  } = useSlideStore();

  if (!presentation) return null;

  const { slides } = presentation;

  return (
    <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-gray-200 flex items-center justify-between px-3">
        <span className="text-sm font-medium text-gray-700">Slides</span>
        <button
          onClick={() => addSlide()}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
          title="Add Slide"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Slide List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {slides.map((slide, index) => {
          const isActive = slide.id === currentSlideId;

          return (
            <div
              key={slide.id}
              className={`group relative rounded border-2 cursor-pointer transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
              }`}
              onClick={() => setCurrentSlide(slide.id)}
            >
              {/* Slide Number */}
              <div className="absolute top-1 left-1 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>

              {/* Slide Preview */}
              <div className="aspect-video bg-white rounded overflow-hidden">
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                  Preview
                </div>
              </div>

              {/* Actions */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateSlide(slide.id);
                  }}
                  className="p-1 bg-white rounded shadow hover:bg-gray-100"
                  title="Duplicate"
                >
                  <Copy size={12} />
                </button>
                {slides.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSlide(slide.id);
                    }}
                    className="p-1 bg-white rounded shadow hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
