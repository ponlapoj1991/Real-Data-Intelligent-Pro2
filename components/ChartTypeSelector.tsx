import React from 'react';
import {
  X,
  BarChart3, BarChartHorizontal, Layers, Percent,
  LineChart, TrendingUp, AreaChart,
  PieChart, Circle,
  Combine, Table, Hash, Cloud
} from 'lucide-react';
import { ChartType } from '../types';
import {
  CHART_DEFINITIONS,
  getChartsByCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER
} from '../constants/chartDefinitions';

interface ChartTypeSelectorProps {
  isOpen: boolean;
  onSelect: (chartType: ChartType) => void;
  onClose: () => void;
}

// Map icon names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  'BarChart3': BarChart3,
  'BarChartHorizontal': BarChartHorizontal,
  'Layers': Layers,
  'Percent': Percent,
  'LineChart': LineChart,
  'TrendingUp': TrendingUp,
  'AreaChart': AreaChart,
  'PieChart': PieChart,
  'Circle': Circle,
  'Scatter': Circle, // Using Circle for scatter
  'Combine': Combine,
  'Table': Table,
  'Hash': Hash,
  'Cloud': Cloud
};

const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
  isOpen,
  onSelect,
  onClose
}) => {
  if (!isOpen) return null;

  const handleSelect = (chartType: ChartType) => {
    onSelect(chartType);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">เลือกรูปแบบกราฟ</h2>
            <p className="text-sm text-gray-600 mt-1">เลือกประเภทกราฟที่เหมาะสมกับข้อมูลของคุณ</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {CATEGORY_ORDER.map(category => {
            const charts = getChartsByCategory(category);
            if (charts.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                {/* Category Header */}
                <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  {CATEGORY_LABELS[category]}
                </h3>

                {/* Chart Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {charts.map(chart => {
                    const IconComponent = ICON_MAP[chart.icon] || BarChart3;

                    return (
                      <button
                        key={chart.type}
                        onClick={() => handleSelect(chart.type)}
                        className="group relative flex flex-col items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all duration-200 bg-white hover:bg-blue-50"
                      >
                        {/* Icon */}
                        <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
                          <IconComponent className="w-7 h-7 text-blue-600" />
                        </div>

                        {/* Label */}
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                            {chart.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {chart.description}
                          </p>
                        </div>

                        {/* Hover Effect */}
                        <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            <span className="font-medium">💡 เคล็ดลับ:</span> เลือกกราฟที่เหมาะสมกับข้อมูล - Column/Bar สำหรับเปรียบเทียบ, Line สำหรับแนวโน้ม, Pie สำหรับสัดส่วน
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChartTypeSelector;
