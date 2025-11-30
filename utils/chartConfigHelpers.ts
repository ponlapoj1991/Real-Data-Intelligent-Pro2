import { ChartType } from '../types';

/**
 * Helper functions to determine chart configuration requirements
 */

/**
 * Check if chart type uses stacking
 */
export const isStackedChart = (type: ChartType): boolean => {
  return [
    'stacked-column',
    '100-stacked-column',
    'stacked-bar',
    '100-stacked-bar',
    'stacked-area',
    '100-stacked-area'
  ].includes(type);
};

/**
 * Check if chart type is normalized (100%)
 */
export const is100StackedChart = (type: ChartType): boolean => {
  return [
    '100-stacked-column',
    '100-stacked-bar',
    '100-stacked-area'
  ].includes(type);
};

/**
 * Check if chart type is vertical (column-based)
 */
export const isVerticalChart = (type: ChartType): boolean => {
  return [
    'column',
    'stacked-column',
    '100-stacked-column'
  ].includes(type);
};

/**
 * Check if chart type is horizontal (bar-based)
 */
export const isHorizontalChart = (type: ChartType): boolean => {
  return [
    'bar',
    'stacked-bar',
    '100-stacked-bar'
  ].includes(type);
};

/**
 * Check if chart type uses multi-series (combo chart)
 */
export const isMultiSeriesChart = (type: ChartType): boolean => {
  return type === 'combo';
};

/**
 * Check if chart type uses single dimension
 */
export const isSingleDimensionChart = (type: ChartType): boolean => {
  return ![
    'scatter',
    'bubble'
  ].includes(type);
};

/**
 * Check if chart type has axes
 */
export const hasAxes = (type: ChartType): boolean => {
  return ![
    'pie',
    'donut',
    'kpi',
    'wordcloud',
    'table'
  ].includes(type);
};

/**
 * Check if chart needs Stack By field
 */
export const needsStackBy = (type: ChartType): boolean => {
  return isStackedChart(type) && !isMultiSeriesChart(type);
};

/**
 * Check if chart needs measure configuration
 */
export const needsMeasure = (type: ChartType): boolean => {
  return ![
    'combo', // Combo uses series-level measures
    'table'
  ].includes(type);
};

/**
 * Check if chart type is line-based
 */
export const isLineChart = (type: ChartType): boolean => {
  return [
    'line',
    'smooth-line'
  ].includes(type);
};

/**
 * Check if chart type is area-based
 */
export const isAreaChart = (type: ChartType): boolean => {
  return [
    'area',
    'stacked-area',
    '100-stacked-area'
  ].includes(type);
};

/**
 * Check if chart type is pie-based
 */
export const isPieChart = (type: ChartType): boolean => {
  return [
    'pie',
    'donut'
  ].includes(type);
};

/**
 * Check if chart needs orientation setting
 */
export const needsOrientation = (type: ChartType): boolean => {
  // Stacked charts don't need orientation - they're fixed by type
  return false;
};

/**
 * Get default orientation for chart type
 */
export const getDefaultOrientation = (type: ChartType): 'vertical' | 'horizontal' => {
  if (isHorizontalChart(type)) return 'horizontal';
  return 'vertical';
};

/**
 * Get required fields for chart type
 */
export const getRequiredFields = (type: ChartType): string[] => {
  const fields: string[] = [];

  // Dimension requirements
  if (type === 'bubble' || type === 'scatter') {
    fields.push('xDimension', 'yDimension');
    if (type === 'bubble') {
      fields.push('sizeDimension');
    }
  } else if (isSingleDimensionChart(type) && type !== 'kpi' && type !== 'table') {
    fields.push('dimension');
  }

  // Stack By for stacked charts
  if (needsStackBy(type)) {
    fields.push('stackBy');
  }

  // Measure for non-combo charts
  if (needsMeasure(type) && type !== 'wordcloud') {
    fields.push('measure');
  }

  // Series for combo
  if (isMultiSeriesChart(type)) {
    fields.push('series');
  }

  return fields;
};

/**
 * Validate chart configuration
 */
export const validateChartConfig = (type: ChartType, config: any): string[] => {
  const errors: string[] = [];
  const required = getRequiredFields(type);

  required.forEach(field => {
    if (field === 'series') {
      if (!config.series || config.series.length === 0) {
        errors.push('กรุณาเพิ่มอย่างน้อย 1 series');
      }
    } else if (!config[field]) {
      errors.push(`กรุณาเลือก ${field}`);
    }
  });

  // Validate measure column for sum/avg
  if (config.measure && ['sum', 'avg'].includes(config.measure) && !config.measureCol) {
    errors.push('กรุณาเลือก Column สำหรับการคำนวณ');
  }

  return errors;
};
