import React from 'react';
import { createRoot } from 'react-dom/client';
import ReportBuilderV2Test from './ReportBuilderV2Test';
import '../index.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ReportBuilderV2Test />
    </React.StrictMode>
  );
}
