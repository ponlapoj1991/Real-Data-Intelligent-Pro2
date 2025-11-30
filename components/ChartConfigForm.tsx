import React from 'react';
import { Plus, Trash2, Edit as EditIcon } from 'lucide-react';
import { ChartType, AggregateMethod, SeriesConfig, SortOrder } from '../types';
import {
  needsStackBy,
  needsMeasure,
  isMultiSeriesChart,
  isPieChart,
  isLineChart,
  isAreaChart,
  getDefaultOrientation
} from '../utils/chartConfigHelpers';

interface ChartConfigFormProps {
  chartType: ChartType;
  availableColumns: string[];

  // Basic fields
  dimension: string;
  setDimension: (val: string) => void;

  // Stacking
  stackBy: string;
  setStackBy: (val: string) => void;

  // Single measure
  measure: AggregateMethod;
  setMeasure: (val: AggregateMethod) => void;
  measureCol: string;
  setMeasureCol: (val: string) => void;

  // Multi-series
  series: SeriesConfig[];
  onAddSeries: () => void;
  onEditSeries: (s: SeriesConfig) => void;
  onDeleteSeries: (id: string) => void;

  // Bubble/Scatter
  xDimension: string;
  setXDimension: (val: string) => void;
  yDimension: string;
  setYDimension: (val: string) => void;
  sizeDimension: string;
  setSizeDimension: (val: string) => void;
  colorBy: string;
  setColorBy: (val: string) => void;

  // Pie/Donut
  innerRadius: number;
  setInnerRadius: (val: number) => void;
  startAngle: number;
  setStartAngle: (val: number) => void;

  // Line
  curveType: 'linear' | 'monotone' | 'step';
  setCurveType: (val: 'linear' | 'monotone' | 'step') => void;
  strokeWidth: number;
  setStrokeWidth: (val: number) => void;

  // Sort & Filter
  sortBy: SortOrder;
  setSortBy: (val: SortOrder) => void;
  categoryFilter: string[];
  setCategoryFilter: (val: string[]) => void;
  allCategories: string[];
  categorySearch: string;
  setCategorySearch: (val: string) => void;
  onCategoryToggle: (cat: string) => void;
  onSelectAllCategories: () => void;
  onClearAllCategories: () => void;
}

const ChartConfigForm: React.FC<ChartConfigFormProps> = ({
  chartType,
  availableColumns,
  dimension,
  setDimension,
  stackBy,
  setStackBy,
  measure,
  setMeasure,
  measureCol,
  setMeasureCol,
  series,
  onAddSeries,
  onEditSeries,
  onDeleteSeries,
  xDimension,
  setXDimension,
  yDimension,
  setYDimension,
  sizeDimension,
  setSizeDimension,
  colorBy,
  setColorBy,
  innerRadius,
  setInnerRadius,
  startAngle,
  setStartAngle,
  curveType,
  setCurveType,
  strokeWidth,
  setStrokeWidth,
  sortBy,
  setSortBy,
  categoryFilter,
  setCategoryFilter,
  allCategories,
  categorySearch,
  setCategorySearch,
  onCategoryToggle,
  onSelectAllCategories,
  onClearAllCategories
}) => {
  const showStackBy = needsStackBy(chartType);
  const showMeasure = needsMeasure(chartType);
  const showMultiSeries = isMultiSeriesChart(chartType);
  const showBubble = chartType === 'bubble' || chartType === 'scatter';
  const showPie = isPieChart(chartType);
  const showLine = isLineChart(chartType);
  const showArea = isAreaChart(chartType);

  const filteredCategories = allCategories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* ========================================
          BUBBLE / SCATTER - Special Dimensions
          ======================================== */}
      {showBubble && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              X-Axis Dimension
            </label>
            <select
              value={xDimension}
              onChange={(e) => setXDimension(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">Select...</option>
              {availableColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Y-Axis Dimension
            </label>
            <select
              value={yDimension}
              onChange={(e) => setYDimension(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">Select...</option>
              {availableColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {chartType === 'bubble' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size Dimension (Bubble Size)
              </label>
              <select
                value={sizeDimension}
                onChange={(e) => setSizeDimension(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Select...</option>
                {availableColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color By (Optional)
            </label>
            <select
              value={colorBy}
              onChange={(e) => setColorBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">None</option>
              {availableColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* ========================================
          STANDARD DIMENSION (for non-bubble charts)
          ======================================== */}
      {!showBubble && !showPie && chartType !== 'kpi' && chartType !== 'table' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dimension ({getDefaultOrientation(chartType) === 'vertical' ? 'X-Axis' : 'Y-Axis'})
          </label>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="">Select...</option>
            {availableColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
      )}

      {/* ========================================
          PIE CHART - Category
          ======================================== */}
      {showPie && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="">Select...</option>
            {availableColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
      )}

      {/* ========================================
          STACKED CHARTS - Stack By
          ======================================== */}
      {showStackBy && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stack By (Breakdown Dimension)
          </label>
          <select
            value={stackBy}
            onChange={(e) => setStackBy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="">Select...</option>
            {availableColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            แต่ละแท่งจะแบ่งออกเป็นส่วนๆ ตามค่าใน dimension นี้
          </p>
        </div>
      )}

      {/* ========================================
          MULTI-SERIES (Combo Chart)
          ======================================== */}
      {showMultiSeries && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Series ({series.length})
            </label>
            <button
              onClick={onAddSeries}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
            >
              <Plus className="w-3 h-3" />
              Add Series
            </button>
          </div>

          <div className="space-y-2">
            {series.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 p-3 border border-gray-200 rounded bg-gray-50"
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: s.color }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{s.label}</div>
                  <div className="text-xs text-gray-500">
                    {s.type} • {s.yAxis} Y-Axis • {s.measure}
                    {s.measureCol && ` of ${s.measureCol}`}
                  </div>
                </div>
                <button
                  onClick={() => onEditSeries(s)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <EditIcon className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => onDeleteSeries(s.id)}
                  className="p-1 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}

            {series.length === 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                No series added. Click "Add Series" to start.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================
          SINGLE MEASURE (for non-combo, non-bubble)
          ======================================== */}
      {showMeasure && !showMultiSeries && !showBubble && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Measure</label>
            <select
              value={measure}
              onChange={(e) => setMeasure(e.target.value as AggregateMethod)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="count">Count</option>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
            </select>
          </div>

          {(measure === 'sum' || measure === 'avg') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Column</label>
              <select
                value={measureCol}
                onChange={(e) => setMeasureCol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Select...</option>
                {availableColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ========================================
          PIE/DONUT SPECIFIC
          ======================================== */}
      {chartType === 'donut' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Inner Radius: {innerRadius}%
          </label>
          <input
            type="range"
            min="0"
            max="80"
            value={innerRadius}
            onChange={(e) => setInnerRadius(parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            ควบคุมขนาดรูตรงกลาง (0% = Pie chart, 80% = บางมาก)
          </p>
        </div>
      )}

      {showPie && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Angle: {startAngle}°
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={startAngle}
            onChange={(e) => setStartAngle(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* ========================================
          LINE SPECIFIC
          ======================================== */}
      {(showLine || showArea) && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Curve Type</label>
            <select
              value={curveType}
              onChange={(e) => setCurveType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="linear">Linear (ตรง)</option>
              <option value="monotone">Smooth (โค้งนุ่มนวล)</option>
              <option value="step">Step (บันได)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stroke Width: {strokeWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </>
      )}

      {/* ========================================
          SORT OPTIONS (all charts except Table)
          ======================================== */}
      {chartType !== 'table' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOrder)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="value-desc">Value (High to Low)</option>
            <option value="value-asc">Value (Low to High)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="original">Original Order (for Dates)</option>
          </select>
        </div>
      )}

      {/* ========================================
          CATEGORY FILTER (for dimension-based charts)
          ======================================== */}
      {!showBubble && !showPie && chartType !== 'table' && chartType !== 'kpi' && allCategories.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Categories ({categoryFilter.length > 0 ? categoryFilter.length : allCategories.length} of {allCategories.length})
            </label>
            <div className="flex gap-2">
              <button
                onClick={onSelectAllCategories}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                onClick={onClearAllCategories}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
          </div>

          {allCategories.length > 5 && (
            <div className="mb-2">
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          )}

          <div className="border border-gray-200 rounded p-3 max-h-48 overflow-y-auto bg-gray-50">
            {filteredCategories.map((cat, idx) => (
              <label
                key={idx}
                className="flex items-center py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={categoryFilter.length === 0 || categoryFilter.includes(cat)}
                  onChange={() => onCategoryToggle(cat)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-900">{cat}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {categoryFilter.length === 0 ? 'All categories shown' : `${categoryFilter.length} selected`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChartConfigForm;
