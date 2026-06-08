import { create } from 'zustand';

export interface Dataset {
  headers: string[];
  rows: (string | number | null)[][];
  rawRows: Record<string, string | number | null>[];
  fileName: string;
}

interface DatasetState {
  dataset: Dataset | null;
  setDataset: (dataset: Dataset | null) => void;
  getNumericColumns: () => string[];
  getColumnData: (column: string) => number[];
  getCategoricalColumns: () => string[];
  getCategoricalData: (column: string) => string[];
}

export const useDataset = create<DatasetState>((set, get) => ({
  dataset: null,
  setDataset: (dataset) => set({ dataset }),
  getNumericColumns: () => {
    const { dataset } = get();
    if (!dataset) return [];
    return dataset.headers.filter(header => {
      const values = dataset.rows.map(row => {
        const idx = dataset.headers.indexOf(header);
        return row[idx];
      });
      const numericValues = values.filter(v => v !== null && v !== '' && !isNaN(Number(v)));
      return numericValues.length > values.filter(v => v === null || v === '').length * 0.5;
    });
  },
  getColumnData: (column: string) => {
    const { dataset } = get();
    if (!dataset) return [];
    const idx = dataset.headers.indexOf(column);
    if (idx === -1) return [];
    return dataset.rows
      .map(row => Number(row[idx]))
      .filter(v => !isNaN(v));
  },
  getCategoricalColumns: () => {
    const { dataset } = get();
    if (!dataset) return [];
    const numericCols = get().getNumericColumns();
    return dataset.headers.filter(h => !numericCols.includes(h));
  },
  getCategoricalData: (column: string) => {
    const { dataset } = get();
    if (!dataset) return [];
    const idx = dataset.headers.indexOf(column);
    if (idx === -1) return [];
    return dataset.rows
      .map(row => String(row[idx] ?? ''))
      .filter(v => v !== '');
  },
}));
