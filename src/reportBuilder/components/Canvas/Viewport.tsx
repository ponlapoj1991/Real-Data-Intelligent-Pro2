/**
 * Viewport Component
 * Main canvas area where slides are rendered
 */

import React, { useRef, useState, useCallback } from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import { GridLines } from './GridLines';
import { AlignmentGuides } from './AlignmentGuides';
import { TransformBox } from './TransformBox';
import { ElementRenderer } from '../Elements';

interface ViewportProps {
  width: number;
  height: number;
}

interface Guide {
  type: 'horizontal' | 'vertical';
  position: number;
}

export const Viewport: React.FC<ViewportProps> = ({ width, height }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<Guide[]>([]);

  const {
    presentation,
    currentSlideId,
    canvasScale,
    showGrid,
    selectedElementIds,
    selectElement,
    clearSelection,
    updateElement,
  } = useSlideStore();

  const currentSlide = presentation?.slides.find(s => s.id === currentSlideId);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  }, [clearSelection]);

  const handleElementClick = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
    selectElement(elementId, isMulti);
  }, [selectElement]);

  if (!currentSlide || !presentation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <p className="text-gray-400">No slide selected</p>
      </div>
    );
  }

  const canvasStyle = {
    width: width,
    height: height,
    transform: `scale(${canvasScale})`,
    transformOrigin: 'center center',
  };

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: currentSlide.background?.type === 'solid'
      ? currentSlide.background.color
      : '#FFFFFF',
  };

  if (currentSlide.background?.type === 'image' && currentSlide.background.image) {
    backgroundStyle.backgroundImage = `url(${currentSlide.background.image.src})`;
    backgroundStyle.backgroundSize = currentSlide.background.image.size;
    backgroundStyle.backgroundPosition = 'center';
    backgroundStyle.backgroundRepeat = currentSlide.background.image.size === 'repeat' ? 'repeat' : 'no-repeat';
  }

  if (currentSlide.background?.type === 'gradient' && currentSlide.background.gradient) {
    const { gradient } = currentSlide.background;
    const colors = gradient.colors
      .map(c => `${c.color} ${c.pos}%`)
      .join(', ');

    if (gradient.type === 'linear') {
      backgroundStyle.backgroundImage = `linear-gradient(${gradient.rotate}deg, ${colors})`;
    } else {
      backgroundStyle.backgroundImage = `radial-gradient(circle, ${colors})`;
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-200 overflow-auto p-12">
      <div
        ref={viewportRef}
        className="relative bg-white shadow-2xl"
        style={canvasStyle}
        onClick={handleCanvasClick}
      >
        {/* Background */}
        <div
          className="absolute inset-0"
          style={backgroundStyle}
        />

        {/* Grid Lines */}
        {showGrid && (
          <GridLines
            width={width}
            height={height}
            visible={showGrid}
          />
        )}

        {/* Elements */}
        <div className="relative w-full h-full">
          {currentSlide.elements.map((element) => (
            <ElementRenderer
              key={element.id}
              element={element}
              isSelected={selectedElementIds.includes(element.id)}
              onClick={(e) => handleElementClick(e, element.id)}
            />
          ))}
        </div>

        {/* Transform Boxes for Selected Elements */}
        {selectedElementIds.map((elementId) => {
          const element = currentSlide.elements.find((el) => el.id === elementId);
          if (!element || element.lock) return null;

          return (
            <TransformBox
              key={`transform-${elementId}`}
              left={element.left}
              top={element.top}
              width={element.width}
              height={element.height}
              rotate={element.rotate}
              locked={element.lock}
              onTransform={(updates) => {
                updateElement(elementId, updates);
              }}
              onTransformEnd={() => {
                useSlideStore.getState().saveHistory();
              }}
            />
          );
        })}

        {/* Alignment Guides */}
        <AlignmentGuides
          guides={alignmentGuides}
          width={width}
          height={height}
        />
      </div>
    </div>
  );
};
