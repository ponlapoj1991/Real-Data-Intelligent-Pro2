/**
 * Report Builder v2 Entry Point
 * PPTist-inspired presentation builder in React
 */

import React from 'react';
import { Editor } from './components/Editor';

// Wrapper component for compatibility with old Project interface
// New Report Builder v2 manages its own state via Zustand
export const ReportBuilder: React.FC<any> = () => {
  return <Editor />;
};

export { useSlideStore } from './store/useSlideStore';
export * from './types/slides';
