/**
 * Toolbar Component
 * Main toolbar with element insertion and tools
 */

import React, { useRef } from 'react';
import { useSlideStore } from '../../store/useSlideStore';
import { importPPTX } from '../../utils/pptxImport';
import { exportToPPTX } from '../../utils/pptxExport';
import {
  Type,
  Image as ImageIcon,
  Square,
  Minus,
  BarChart3,
  Table,
  Video,
  Music,
  Undo2,
  Redo2,
  Save,
  Download,
  Upload,
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const { undo, redo, presentation, loadPresentation } = useSlideStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImportPPTX = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importPPTX(file);
      loadPresentation(imported);
      console.log('PPTX imported successfully:', imported);
      alert('PPTX imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import PPTX file. See console for details.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportPPTX = async () => {
    if (!presentation) {
      alert('No presentation to export');
      return;
    }

    try {
      await exportToPPTX(presentation);
      console.log('PPTX exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export PPTX file. See console for details.');
    }
  };

  const handleAddText = () => {
    useSlideStore.getState().addElement({
      type: 'text',
      left: 100,
      top: 100,
      width: 300,
      height: 100,
      rotate: 0,
      content: '<p>Double-click to edit</p>',
      defaultFontName: 'Arial',
      defaultColor: '#000000',
    });
  };

  const handleAddShape = () => {
    useSlideStore.getState().addElement({
      type: 'shape',
      left: 200,
      top: 200,
      width: 200,
      height: 200,
      rotate: 0,
      viewBox: [100, 100],
      path: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
      fixedRatio: false,
      fill: '#3B82F6',
    });
  };

  const handleAddTable = () => {
    useSlideStore.getState().addElement({
      type: 'table',
      left: 150,
      top: 150,
      width: 400,
      height: 200,
      rotate: 0,
      outline: { width: 1, color: '#000000', style: 'solid' },
      colWidths: [0.33, 0.33, 0.34],
      cellMinHeight: 40,
      data: [
        [
          { id: '1', colspan: 1, rowspan: 1, text: 'Header 1', style: { bold: true } },
          { id: '2', colspan: 1, rowspan: 1, text: 'Header 2', style: { bold: true } },
          { id: '3', colspan: 1, rowspan: 1, text: 'Header 3', style: { bold: true } },
        ],
        [
          { id: '4', colspan: 1, rowspan: 1, text: 'Cell 1' },
          { id: '5', colspan: 1, rowspan: 1, text: 'Cell 2' },
          { id: '6', colspan: 1, rowspan: 1, text: 'Cell 3' },
        ],
      ],
    });
  };

  const handleAddImage = () => {
    imageInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) {
        useSlideStore.getState().addElement({
          type: 'image',
          left: 100,
          top: 100,
          width: 300,
          height: 200,
          rotate: 0,
          src,
          fixedRatio: true,
        });
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleAddLine = () => {
    useSlideStore.getState().addElement({
      type: 'line',
      left: 200,
      top: 200,
      width: 2,
      start: [0, 0],
      end: [200, 0],
      color: '#000000',
      style: 'solid',
      points: ['', 'arrow'],
    });
  };

  const handleAddChart = () => {
    useSlideStore.getState().addElement({
      type: 'chart',
      left: 150,
      top: 150,
      width: 400,
      height: 300,
      rotate: 0,
      chartType: 'bar',
      data: {
        labels: ['A', 'B', 'C', 'D'],
        legends: ['Series 1'],
        series: [[10, 20, 30, 40]],
      },
      options: {},
      fill: '#3B82F6',
    });
  };

  const handleAddVideo = () => {
    const src = prompt('Enter video URL:');
    if (src) {
      useSlideStore.getState().addElement({
        type: 'video',
        left: 150,
        top: 150,
        width: 400,
        height: 225,
        rotate: 0,
        src,
      });
    }
  };

  const handleAddAudio = () => {
    const src = prompt('Enter audio URL:');
    if (src) {
      useSlideStore.getState().addElement({
        type: 'audio',
        left: 300,
        top: 300,
        width: 60,
        height: 60,
        rotate: 0,
        src,
        color: '#3B82F6',
      });
    }
  };

  const handleSave = () => {
    if (!presentation) {
      alert('No presentation to save');
      return;
    }

    try {
      // Save to localStorage
      localStorage.setItem('pptist-presentation', JSON.stringify(presentation));
      console.log('Presentation saved to localStorage');
      alert('Presentation saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save presentation. See console for details.');
    }
  };

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-2">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pptx"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />

      {/* File Actions */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
        <button
          onClick={handleImportPPTX}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Upload PPTX"
        >
          <Upload size={18} />
        </button>
        <button
          onClick={handleSave}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Save"
        >
          <Save size={18} />
        </button>
        <button
          onClick={handleExportPPTX}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Export PPTX"
        >
          <Download size={18} />
        </button>
      </div>

      {/* History */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
        <button
          onClick={undo}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Undo"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={redo}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Redo"
        >
          <Redo2 size={18} />
        </button>
      </div>

      {/* Insert Elements */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleAddText}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Add Text"
        >
          <Type size={18} />
        </button>
        <button
          onClick={handleAddImage}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Add Image"
        >
          <ImageIcon size={18} />
        </button>
        <button
          onClick={handleAddShape}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Add Shape"
        >
          <Square size={18} />
        </button>
        <button
          onClick={handleAddLine}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Add Line"
        >
          <Minus size={18} />
        </button>
        <button
          onClick={handleAddChart}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Add Chart"
        >
          <BarChart3 size={18} />
        </button>
        <button
          onClick={handleAddTable}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Add Table"
        >
          <Table size={18} />
        </button>
        <button
          onClick={handleAddVideo}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Add Video"
        >
          <Video size={18} />
        </button>
        <button
          onClick={handleAddAudio}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="Add Audio"
        >
          <Music size={18} />
        </button>
      </div>

      {/* Right Side Info */}
      <div className="ml-auto text-sm text-gray-500">
        {presentation && `${presentation.slides.length} slides`}
      </div>
    </div>
  );
};
