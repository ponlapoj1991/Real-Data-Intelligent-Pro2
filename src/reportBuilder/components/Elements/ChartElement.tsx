/**
 * Chart Element Component
 * Renders charts using Recharts (bar, line, pie, etc.)
 */

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
} from 'recharts';
import type { PPTChartElement } from '../../types/slides';

interface ChartElementProps {
  element: PPTChartElement;
  isSelected: boolean;
}

export const ChartElement: React.FC<ChartElementProps> = ({ element, isSelected }) => {
  const { chartType, data, themeColors, options, textColor, lineColor, fill, outline } =
    element;

  // Prepare data for Recharts
  const chartData = data.labels.map((label, idx) => {
    const dataPoint: any = { name: label };
    data.legends.forEach((legend, legendIdx) => {
      dataPoint[legend] = data.series[legendIdx][idx];
    });
    return dataPoint;
  });

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: fill,
    border: outline
      ? `${outline.width}px ${outline.style} ${outline.color}`
      : undefined,
    borderRadius: '4px',
    padding: '8px',
  };

  const commonProps = {
    data: chartData,
    margin: { top: 5, right: 5, bottom: 5, left: 5 },
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
      case 'column':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps} layout={chartType === 'bar' ? 'vertical' : 'horizontal'}>
              <CartesianGrid strokeDasharray="3 3" stroke={lineColor || '#ccc'} />
              <XAxis
                type={chartType === 'bar' ? 'number' : 'category'}
                dataKey={chartType === 'bar' ? undefined : 'name'}
                stroke={textColor || '#666'}
                style={{ fontSize: 10 }}
              />
              <YAxis
                type={chartType === 'bar' ? 'category' : 'number'}
                dataKey={chartType === 'bar' ? 'name' : undefined}
                stroke={textColor || '#666'}
                style={{ fontSize: 10 }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {data.legends.map((legend, idx) => (
                <Bar
                  key={legend}
                  dataKey={legend}
                  fill={themeColors[idx % themeColors.length]}
                  stackId={options?.stack ? 'stack' : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={lineColor || '#ccc'} />
              <XAxis dataKey="name" stroke={textColor || '#666'} style={{ fontSize: 10 }} />
              <YAxis stroke={textColor || '#666'} style={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {data.legends.map((legend, idx) => (
                <Line
                  key={legend}
                  type={options?.lineSmooth ? 'monotone' : 'linear'}
                  dataKey={legend}
                  stroke={themeColors[idx % themeColors.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={lineColor || '#ccc'} />
              <XAxis dataKey="name" stroke={textColor || '#666'} style={{ fontSize: 10 }} />
              <YAxis stroke={textColor || '#666'} style={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {data.legends.map((legend, idx) => (
                <Area
                  key={legend}
                  type="monotone"
                  dataKey={legend}
                  fill={themeColors[idx % themeColors.length]}
                  stroke={themeColors[idx % themeColors.length]}
                  stackId={options?.stack ? 'stack' : undefined}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'ring':
        const pieData = data.labels.map((label, idx) => ({
          name: label,
          value: data.series[0][idx],
        }));

        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'ring' ? '40%' : 0}
                outerRadius="70%"
                dataKey="value"
                label={(entry) => entry.name}
                labelStyle={{ fontSize: 10 }}
              >
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={themeColors[idx % themeColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart {...commonProps}>
              <PolarGrid stroke={lineColor || '#ccc'} />
              <PolarAngleAxis dataKey="name" style={{ fontSize: 10 }} />
              <PolarRadiusAxis style={{ fontSize: 10 }} />
              {data.legends.map((legend, idx) => (
                <Radar
                  key={legend}
                  name={legend}
                  dataKey={legend}
                  stroke={themeColors[idx % themeColors.length]}
                  fill={themeColors[idx % themeColors.length]}
                  fillOpacity={0.6}
                />
              ))}
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={lineColor || '#ccc'} />
              <XAxis dataKey="name" stroke={textColor || '#666'} style={{ fontSize: 10 }} />
              <YAxis stroke={textColor || '#666'} style={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {data.legends.map((legend, idx) => (
                <Scatter
                  key={legend}
                  name={legend}
                  dataKey={legend}
                  fill={themeColors[idx % themeColors.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Chart type: {chartType}
          </div>
        );
    }
  };

  return <div style={containerStyle}>{renderChart()}</div>;
};
