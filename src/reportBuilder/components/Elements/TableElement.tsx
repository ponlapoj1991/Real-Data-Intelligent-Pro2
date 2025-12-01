/**
 * Table Element Component
 * Renders tables with cell merge, themes, and styling
 */

import React from 'react';
import type { PPTTableElement } from '../../types/slides';

interface TableElementProps {
  element: PPTTableElement;
  isSelected: boolean;
}

export const TableElement: React.FC<TableElementProps> = ({ element, isSelected }) => {
  const { data, colWidths, cellMinHeight, theme, outline } = element;

  const tableStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderCollapse: 'collapse',
    border: outline ? `${outline.width}px ${outline.style} ${outline.color}` : undefined,
  };

  // Calculate if cell should be rendered (handle merged cells)
  const shouldRenderCell = (rowIdx: number, colIdx: number): boolean => {
    // Check if this cell is covered by a previous cell's colspan/rowspan
    for (let r = 0; r <= rowIdx; r++) {
      for (let c = 0; c <= colIdx; c++) {
        if (r === rowIdx && c === colIdx) continue;

        const cell = data[r]?.[c];
        if (!cell) continue;

        const rowSpan = cell.rowspan || 1;
        const colSpan = cell.colspan || 1;

        if (
          r <= rowIdx &&
          rowIdx < r + rowSpan &&
          c <= colIdx &&
          colIdx < c + colSpan
        ) {
          return false;
        }
      }
    }

    return true;
  };

  // Apply theme colors
  const getRowTheme = (rowIdx: number): React.CSSProperties => {
    if (!theme) return {};

    const isFirstRow = rowIdx === 0;
    const isLastRow = rowIdx === data.length - 1;

    if (isFirstRow && theme.rowHeader) {
      return {
        backgroundColor: theme.color,
        color: '#FFFFFF',
        fontWeight: 'bold',
      };
    }

    if (isLastRow && theme.rowFooter) {
      return {
        backgroundColor: theme.color,
        color: '#FFFFFF',
        fontWeight: 'bold',
      };
    }

    return {};
  };

  const getCellTheme = (rowIdx: number, colIdx: number): React.CSSProperties => {
    if (!theme) return {};

    const isFirstCol = colIdx === 0;
    const isLastCol = colIdx === data[rowIdx].length - 1;

    if (isFirstCol && theme.colHeader) {
      return {
        backgroundColor: theme.color,
        color: '#FFFFFF',
        fontWeight: 'bold',
      };
    }

    if (isLastCol && theme.colFooter) {
      return {
        backgroundColor: theme.color,
        color: '#FFFFFF',
        fontWeight: 'bold',
      };
    }

    return {};
  };

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <table style={tableStyle}>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} style={getRowTheme(rowIdx)}>
              {row.map((cell, colIdx) => {
                if (!shouldRenderCell(rowIdx, colIdx)) {
                  return null;
                }

                const cellStyle: React.CSSProperties = {
                  minHeight: cellMinHeight,
                  width: colWidths[colIdx] ? `${colWidths[colIdx] * 100}%` : 'auto',
                  padding: '8px',
                  border: outline
                    ? `${outline.width}px ${outline.style} ${outline.color}`
                    : '1px solid #ddd',
                  textAlign: cell.style?.align || 'left',
                  backgroundColor: cell.style?.backcolor,
                  color: cell.style?.color,
                  fontWeight: cell.style?.bold ? 'bold' : undefined,
                  fontStyle: cell.style?.em ? 'italic' : undefined,
                  textDecoration: [
                    cell.style?.underline ? 'underline' : '',
                    cell.style?.strikethrough ? 'line-through' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined,
                  fontSize: cell.style?.fontsize,
                  fontFamily: cell.style?.fontname,
                  ...getCellTheme(rowIdx, colIdx),
                };

                return (
                  <td
                    key={cell.id}
                    style={cellStyle}
                    rowSpan={cell.rowspan || 1}
                    colSpan={cell.colspan || 1}
                  >
                    {cell.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
