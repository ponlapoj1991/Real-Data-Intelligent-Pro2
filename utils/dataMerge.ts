import { RawRow, RawTable, ColumnMapping } from '../types';

/**
 * Union multiple tables into a single dataset
 * Handles column mismatches by filling with null
 */
export function unionTables(tables: RawTable[]): {
  data: RawRow[];
  columns: string[];
} {
  if (tables.length === 0) {
    return { data: [], columns: [] };
  }

  // Collect all unique columns from all tables
  const allColumnsSet = new Set<string>();
  tables.forEach(table => {
    table.columns.forEach(col => allColumnsSet.add(col));
  });

  const allColumns = Array.from(allColumnsSet).sort();

  // Merge rows with null for missing columns
  const mergedData: RawRow[] = [];

  tables.forEach(table => {
    table.data.forEach(row => {
      const newRow: RawRow = {};

      // Fill all columns
      allColumns.forEach(col => {
        newRow[col] = row[col] !== undefined ? row[col] : null;
      });

      mergedData.push(newRow);
    });
  });

  console.log('✅ Union completed:', {
    tables: tables.length,
    totalRows: mergedData.length,
    totalColumns: allColumns.length,
  });

  return {
    data: mergedData,
    columns: allColumns,
  };
}

/**
 * Apply column mappings to merge columns with different names
 * Example: Merge 'Age' and 'User_Age' into 'age'
 */
export function applyColumnMappings(
  data: RawRow[],
  mappings: ColumnMapping[]
): {
  data: RawRow[];
  columns: string[];
} {
  if (mappings.length === 0) {
    const columns = data.length > 0 ? Object.keys(data[0]).sort() : [];
    return { data, columns };
  }

  const mappedData: RawRow[] = data.map(row => {
    const newRow: RawRow = { ...row };

    mappings.forEach(mapping => {
      // Use first non-null value from source columns
      const value = mapping.sourceColumns
        .map(col => row[col])
        .find(val => val != null && val !== '');

      // Set target column
      newRow[mapping.targetColumn] = value !== undefined ? value : null;

      // Remove source columns if they're being merged
      if (mapping.sourceColumns.length > 1) {
        mapping.sourceColumns.forEach(col => {
          delete newRow[col];
        });
      }
    });

    return newRow;
  });

  // Get final columns
  const finalColumns = mappedData.length > 0
    ? Object.keys(mappedData[0]).sort()
    : [];

  console.log('✅ Column mapping applied:', {
    mappings: mappings.length,
    finalColumns: finalColumns.length,
  });

  return {
    data: mappedData,
    columns: finalColumns,
  };
}

/**
 * Detect columns that might need mapping
 * Returns columns that are similar but not identical
 */
export function detectSimilarColumns(columns: string[]): {
  target: string;
  candidates: string[];
}[] {
  const suggestions: { target: string; candidates: string[] }[] = [];

  // Group similar column names
  const groups = new Map<string, string[]>();

  columns.forEach(col => {
    const normalized = col.toLowerCase().replace(/[_\s-]/g, '');

    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized)!.push(col);
  });

  // Find groups with multiple columns
  groups.forEach((cols, normalized) => {
    if (cols.length > 1) {
      // Suggest mapping to shortest name or first one
      const sorted = [...cols].sort((a, b) => a.length - b.length);
      suggestions.push({
        target: sorted[0],
        candidates: sorted,
      });
    }
  });

  return suggestions;
}

/**
 * Preview merged data (first N rows)
 */
export function previewMergedData(
  tables: RawTable[],
  limit: number = 10
): RawRow[] {
  const { data } = unionTables(tables);
  return data.slice(0, limit);
}

/**
 * Get statistics about merged data
 */
export function getMergeStatistics(tables: RawTable[]): {
  totalRows: number;
  totalColumns: number;
  tableStats: {
    name: string;
    rows: number;
    columns: number;
  }[];
} {
  const { data, columns } = unionTables(tables);

  return {
    totalRows: data.length,
    totalColumns: columns.length,
    tableStats: tables.map(table => ({
      name: table.name,
      rows: table.rowCount,
      columns: table.columns.length,
    })),
  };
}
