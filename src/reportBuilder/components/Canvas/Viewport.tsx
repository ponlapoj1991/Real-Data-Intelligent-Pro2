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
import { ContextMenu } from './ContextMenu';

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
  const [temporaryTransforms, setTemporaryTransforms] = useState<Record<string, { left?: number; top?: number; width?: number; height?: number; rotate?: number }>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const {
    presentation,
    currentSlideId,
    canvasScale,
    showGrid,
    selectedElementIds,
    selectElement,
    clearSelection,
    updateElement,
    copyElements,
    cutElements,
    deleteElement,
    groupElements,
    ungroupElement,
    bringToFront,
    sendToBack,
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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (selectedElementIds.length > 0) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  }, [selectedElementIds]);

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
        onContextMenu={handleContextMenu}
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
          {currentSlide.elements.map((element) => {
            // Apply temporary transforms if element is being dragged
            const tempTransform = temporaryTransforms[element.id];
            const displayElement = tempTransform ? { ...element, ...tempTransform } : element;

            return (
              <ElementRenderer
                key={element.id}
                element={displayElement as typeof element}
                isSelected={selectedElementIds.includes(element.id)}
                onClick={(e) => handleElementClick(e, element.id)}
              />
            );
          })}
        </div>

        {/* Transform Boxes for Selected Elements */}
        {selectedElementIds.map((elementId) => {
          const element = currentSlide.elements.find((el) => el.id === elementId);
          if (!element || element.lock) return null;

          // Line elements don't have height/rotate - skip TransformBox
          if (element.type === 'line') return null;

          // For elements with height/rotate
          const height = 'height' in element ? element.height : 100;
          const rotate = 'rotate' in element ? element.rotate : 0;

          // Apply temporary transforms if dragging
          const tempTransform = temporaryTransforms[elementId];
          const displayLeft = tempTransform?.left !== undefined ? tempTransform.left : element.left;
          const displayTop = tempTransform?.top !== undefined ? tempTransform.top : element.top;
          const displayWidth = tempTransform?.width !== undefined ? tempTransform.width : element.width;
          const displayHeight = tempTransform?.height !== undefined ? tempTransform.height : height;
          const displayRotate = tempTransform?.rotate !== undefined ? tempTransform.rotate : rotate;

          return (
            <TransformBox
              key={`transform-${elementId}`}
              left={displayLeft}
              top={displayTop}
              width={displayWidth}
              height={displayHeight}
              rotate={displayRotate}
              locked={element.lock}
              onTransform={(updates) => {
                // Store temporary transforms without updating Zustand state
                setTemporaryTransforms(prev => ({
                  ...prev,
                  [elementId]: {
                    ...prev[elementId],
                    ...updates,
                  },
                }));
              }}
              onTransformEnd={() => {
                // Commit all temporary transforms to store
                const tempTransform = temporaryTransforms[elementId];
                if (tempTransform) {
                  updateElement(elementId, tempTransform);
                }
                // Clear temporary state
                setTemporaryTransforms(prev => {
                  const newState = { ...prev };
                  delete newState[elementId];
                  return newState;
                });
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

      {/* Context Menu */}
      {contextMenu && selectedElementIds.length > 0 && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedCount={selectedElementIds.length}
          isGroup={currentSlide?.elements.find(el => el.id === selectedElementIds[0])?.type === 'group'}
          isLocked={currentSlide?.elements.find(el => el.id === selectedElementIds[0])?.lock || false}
          onClose={() => setContextMenu(null)}
          onCopy={() => copyElements()}
          onCut={() => cutElements()}
          onDelete={() => selectedElementIds.forEach(id => deleteElement(id))}
          onLock={() => {
            const element = currentSlide?.elements.find(el => el.id === selectedElementIds[0]);
            if (element) {
              updateElement(element.id, { lock: !element.lock });
            }
          }}
          onGroup={() => groupElements(selectedElementIds)}
          onUngroup={() => ungroupElement(selectedElementIds[0])}
          onBringToFront={() => selectedElementIds.forEach(id => bringToFront(id))}
          onSendToBack={() => selectedElementIds.forEach(id => sendToBack(id))}
        />
      )}
    </div>
  );
};
