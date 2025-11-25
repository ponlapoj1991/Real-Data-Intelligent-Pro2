import React, { useState } from 'react';
import { Database, Library, Sparkles, ArrowRight, Bot, BarChart3, FileOutput, Table2 } from 'lucide-react';
import { ProjectTab } from '../types';
import { useDataLibrary } from './DataLibraryContext';

interface DataLibraryBarProps {
  onNavigate: (tab: ProjectTab) => void;
}

const DataLibraryBar: React.FC<DataLibraryBarProps> = ({ onNavigate }) => {
  const { assets } = useDataLibrary();
  const [open, setOpen] = useState(false);

  const badge = (
    <button
      onClick={() => setOpen(!open)}
      className="flex items-center px-3 py-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
      title="ดูรายการชุดข้อมูลที่แชร์ข้ามฟีเจอร์"
    >
      <Library className="w-4 h-4 mr-2" />
      Data Library
      <span className="ml-2 px-2 py-0.5 bg-white rounded-full border border-blue-200 text-xs font-semibold">
        {assets.length}
      </span>
    </button>
  );

  return (
    <div className="relative flex items-center space-x-4">
      {badge}

      <div className="hidden md:flex items-center space-x-2 text-sm">
        <span className="text-gray-500 font-medium">เปิดใช้งานอิสระ:</span>
        <button
          onClick={() => onNavigate(ProjectTab.PREP)}
          className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Table2 className="w-4 h-4 mr-2" /> เตรียมข้อมูล
        </button>
        <button
          onClick={() => onNavigate(ProjectTab.VISUALIZE)}
          className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <BarChart3 className="w-4 h-4 mr-2" /> วิเคราะห์
        </button>
        <button
          onClick={() => onNavigate(ProjectTab.AI_AGENT)}
          className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Bot className="w-4 h-4 mr-2" /> AI Agent
        </button>
        <button
          onClick={() => onNavigate(ProjectTab.REPORT)}
          className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <FileOutput className="w-4 h-4 mr-2" /> Report
        </button>
      </div>

      {open && (
        <div className="absolute top-12 left-0 w-[460px] bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-gray-800">ชุดข้อมูลที่พร้อมใช้ทันที</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              ปิด
            </button>
          </div>

          {assets.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4">
              ยังไม่มี asset ใน Library ให้เริ่มอัปโหลดหรือเผยแพร่จากแต่ละฟีเจอร์ได้เลย
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset) => (
                <div key={asset.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{asset.name}</p>
                      <p className="text-xs text-gray-500">{asset.description || 'พร้อมให้ทุกแท็บเรียกใช้'}</p>
                    </div>
                    <span className="text-[11px] text-gray-500">{asset.rowCount.toLocaleString()} แถว</span>
                  </div>
                  <div className="mt-2 flex items-center text-xs text-gray-500 space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-semibold text-gray-700">{asset.source}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="truncate" title={asset.schema.join(', ')}>
                      {asset.schema.slice(0, 5).join(', ')}{asset.schema.length > 5 ? ' ...' : ''}
                    </span>
                  </div>
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {asset.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-[11px] text-gray-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-[11px] text-gray-500">
            บันทึก Snapshot จาก Data Prep / Analytics / AI Agent / Report เพื่อแชร์ทรัพยากรโดยไม่ต้องรัน pipeline
          </div>
        </div>
      )}
    </div>
  );
};

export default DataLibraryBar;
