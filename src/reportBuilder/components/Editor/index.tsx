/**
 * Main Editor Component
 * Complete editor layout with thumbnails, canvas, and toolbar
 */

import React, { useEffect } from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboard';
import { Toolbar } from './Toolbar';
import { Thumbnails } from './Thumbnails';
import { Canvas } from '../Canvas';
import { Inspector } from '../Inspector/Inspector';

export const Editor: React.FC = () => {
  const { presentation, createPresentation } = useSlideStore();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  useEffect(() => {
    // Initialize presentation if none exists
    if (!presentation) {
      createPresentation('Untitled Presentation', 960, 540);
    }
  }, [presentation, createPresentation]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Slide Thumbnails */}
        <Thumbnails />

        {/* Center: Canvas */}
        <Canvas />

        {/* Right: Inspector Panel */}
        <Inspector />
      </div>
    </div>
  );
};
