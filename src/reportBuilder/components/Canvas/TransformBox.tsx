/**
 * TransformBox Component
 * Selection box with resize handles and rotation
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { RotateCw } from 'lucide-react';

interface TransformBoxProps {
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  onTransform: (updates: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    rotate?: number;
  }) => void;
  onTransformEnd?: () => void;
  locked?: boolean;
}

type ResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate';

export const TransformBox: React.FC<TransformBoxProps> = ({
  left,
  top,
  width,
  height,
  rotate,
  onTransform,
  onTransformEnd,
  locked = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);

  const startPos = useRef({ x: 0, y: 0 });
  const startBounds = useRef({ left: 0, top: 0, width: 0, height: 0, rotate: 0 });

  // ============================================
  // Drag Handlers
  // ============================================

  const handleMouseDownDrag = useCallback((e: React.MouseEvent) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();

    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startBounds.current = { left, top, width, height, rotate };
  }, [left, top, width, height, rotate, locked]);

  // ============================================
  // Resize Handlers
  // ============================================

  const handleMouseDownResize = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      if (locked || e.button !== 0) return;
      e.stopPropagation();

      setIsResizing(true);
      setActiveHandle(handle);
      startPos.current = { x: e.clientX, y: e.clientY };
      startBounds.current = { left, top, width, height, rotate };
    },
    [left, top, width, height, rotate, locked]
  );

  // ============================================
  // Rotate Handlers
  // ============================================

  const handleMouseDownRotate = useCallback(
    (e: React.MouseEvent) => {
      if (locked || e.button !== 0) return;
      e.stopPropagation();

      setIsRotating(true);
      startPos.current = { x: e.clientX, y: e.clientY };
      startBounds.current = { left, top, width, height, rotate };
    },
    [left, top, width, height, rotate, locked]
  );

  // ============================================
  // Mouse Move Handler
  // ============================================

  useEffect(() => {
    if (!isDragging && !isResizing && !isRotating) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;

      if (isDragging) {
        onTransform({
          left: startBounds.current.left + dx,
          top: startBounds.current.top + dy,
        });
      } else if (isResizing && activeHandle) {
        handleResize(dx, dy, activeHandle);
      } else if (isRotating) {
        handleRotate(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setIsRotating(false);
      setActiveHandle(null);
      onTransformEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, isRotating, activeHandle, onTransform, onTransformEnd]);

  // ============================================
  // Resize Logic
  // ============================================

  const handleResize = (dx: number, dy: number, handle: ResizeHandle) => {
    const { left: l, top: t, width: w, height: h } = startBounds.current;

    let newLeft = l;
    let newTop = t;
    let newWidth = w;
    let newHeight = h;

    switch (handle) {
      case 'nw':
        newLeft = l + dx;
        newTop = t + dy;
        newWidth = w - dx;
        newHeight = h - dy;
        break;
      case 'n':
        newTop = t + dy;
        newHeight = h - dy;
        break;
      case 'ne':
        newTop = t + dy;
        newWidth = w + dx;
        newHeight = h - dy;
        break;
      case 'e':
        newWidth = w + dx;
        break;
      case 'se':
        newWidth = w + dx;
        newHeight = h + dy;
        break;
      case 's':
        newHeight = h + dy;
        break;
      case 'sw':
        newLeft = l + dx;
        newWidth = w - dx;
        newHeight = h + dy;
        break;
      case 'w':
        newLeft = l + dx;
        newWidth = w - dx;
        break;
    }

    // Minimum size
    if (newWidth < 20) newWidth = 20;
    if (newHeight < 20) newHeight = 20;

    onTransform({
      left: newLeft,
      top: newTop,
      width: newWidth,
      height: newHeight,
    });
  };

  // ============================================
  // Rotate Logic
  // ============================================

  const handleRotate = (clientX: number, clientY: number) => {
    const centerX = startBounds.current.left + startBounds.current.width / 2;
    const centerY = startBounds.current.top + startBounds.current.height / 2;

    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    const degrees = (angle * 180) / Math.PI + 90;

    onTransform({
      rotate: Math.round(degrees),
    });
  };

  // ============================================
  // Render
  // ============================================

  if (locked) return null;

  const boxStyle: React.CSSProperties = {
    position: 'absolute',
    left: left,
    top: top,
    width: width,
    height: height,
    transform: `rotate(${rotate}deg)`,
    transformOrigin: 'center center',
    border: '2px solid #2F88FF',
    boxShadow: '0 0 0 1px rgba(47, 136, 255, 0.3)',
    pointerEvents: 'none',
    zIndex: 9998,
  };

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    width: '10px',
    height: '10px',
    backgroundColor: '#FFFFFF',
    border: '2px solid #2F88FF',
    borderRadius: '50%',
    pointerEvents: 'auto',
    cursor: 'pointer',
  };

  const rotateHandleStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-40px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '24px',
    height: '24px',
    backgroundColor: '#FFFFFF',
    border: '2px solid #2F88FF',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    pointerEvents: 'auto',
  };

  return (
    <div style={boxStyle}>
      {/* Drag Area */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          cursor: 'move',
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDownDrag}
      />

      {/* Resize Handles */}
      <div
        style={{ ...handleStyle, top: '-5px', left: '-5px', cursor: 'nw-resize' }}
        onMouseDown={(e) => handleMouseDownResize(e, 'nw')}
      />
      <div
        style={{ ...handleStyle, top: '-5px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' }}
        onMouseDown={(e) => handleMouseDownResize(e, 'n')}
      />
      <div
        style={{ ...handleStyle, top: '-5px', right: '-5px', cursor: 'ne-resize' }}
        onMouseDown={(e) => handleMouseDownResize(e, 'ne')}
      />
      <div
        style={{ ...handleStyle, top: '50%', right: '-5px', transform: 'translateY(-50%)', cursor: 'e-resize' }}
        onMouseDown={(e) => handleMouseDownResize(e, 'e')}
      />
      <div
        style={{ ...handleStyle, bottom: '-5px', right: '-5px', cursor: 'se-resize' }}
        onMouseDown={(e) => handleMouseDownResize(e, 'se')}
      />
      <div
        style={{ ...handleStyle, bottom: '-5px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' }}
        onMouseDown={(e) => handleMouseDownResize(e, 's')}
      />
      <div
        style={{ ...handleStyle, bottom: '-5px', left: '-5px', cursor: 'sw-resize' }}
        onMouseDown={(e) => handleMouseDownResize(e, 'sw')}
      />
      <div
        style={{ ...handleStyle, top: '50%', left: '-5px', transform: 'translateY(-50%)', cursor: 'w-resize' }}
        onMouseDown={(e) => handleMouseDownResize(e, 'w')}
      />

      {/* Rotate Handle */}
      <div
        style={rotateHandleStyle}
        onMouseDown={handleMouseDownRotate}
      >
        <RotateCw size={14} className="text-blue-600" />
      </div>

      {/* Rotation Line */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          left: '50%',
          width: '2px',
          height: '35px',
          backgroundColor: '#2F88FF',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
