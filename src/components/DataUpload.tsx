'use client';

import { useCallback, useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, Download, Database, Rows3, Columns3, X } from 'lucide-react';
import { useDataset, type Dataset } from '@/hooks/useDataset';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Sample dataset: student scores
const SAMPLE_DATA: Dataset = {
  headers: ['Student_ID', 'Math_Score', 'Science_Score', 'English_Score', 'Age', 'Hours_Studied', 'Gender'],
  rows: [
    ['S001', 85, 92, 78, 16, 12, 'Female'],
    ['S002', 72, 68, 85, 17, 8, 'Male'],
    ['S003', 91, 88, 72, 16, 15, 'Female'],
    ['S004', 63, 75, 90, 18, 6, 'Male'],
    ['S005', 78, 82, 69, 17, 10, 'Female'],
    ['S006', 95, 90, 88, 16, 18, 'Male'],
    ['S007', 56, 62, 74, 18, 4, 'Female'],
    ['S008', 88, 85, 91, 17, 14, 'Male'],
    ['S009', 74, 70, 66, 16, 9, 'Female'],
    ['S010', 82, 78, 80, 17, 11, 'Male'],
    ['S011', 69, 73, 77, 18, 7, 'Female'],
    ['S012', 93, 96, 84, 16, 16, 'Male'],
    ['S013', 61, 58, 71, 17, 5, 'Female'],
    ['S014', 79, 84, 86, 18, 10, 'Male'],
    ['S015', 87, 91, 73, 16, 13, 'Female'],
    ['S016', 70, 66, 82, 17, 8, 'Male'],
    ['S017', 96, 94, 90, 16, 20, 'Female'],
    ['S018', 55, 60, 68, 18, 3, 'Male'],
    ['S019', 83, 79, 75, 17, 12, 'Female'],
    ['S020', 76, 72, 88, 16, 9, 'Male'],
    ['S021', 90, 87, 83, 17, 15, 'Female'],
    ['S022', 64, 69, 65, 18, 5, 'Male'],
    ['S023', 81, 83, 79, 16, 11, 'Female'],
    ['S024', 73, 76, 87, 17, 8, 'Male'],
    ['S025', 98, 95, 92, 16, 19, 'Female'],
    ['S026', 58, 55, 63, 18, 4, 'Male'],
    ['S027', 86, 89, 81, 17, 14, 'Female'],
    ['S028', 68, 71, 76, 16, 7, 'Male'],
    ['S029', 92, 88, 85, 17, 16, 'Female'],
    ['S030', 75, 77, 70, 18, 9, 'Male'],
  ],
  rawRows: [],
  fileName: 'sample_student_scores.csv',
};

// Fill rawRows for sample data
SAMPLE_DATA.rawRows = SAMPLE_DATA.rows.map(row => {
  const obj: Record<string, string | number | null> = {};
  SAMPLE_DATA.headers.forEach((h, i) => {
    obj[h] = row[i] ?? null;
  });
  return obj;
});

function parseCSVToDataset(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rawRows = results.data as Record<string, string | number | null>[];
        const rows = rawRows.map(row =>
          headers.map(h => row[h] ?? null)
        );
        resolve({
          headers,
          rows,
          rawRows,
          fileName: file.name,
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

function exportDatasetToCSV(dataset: Dataset) {
  const csvRows: string[] = [];
  csvRows.push(dataset.headers.join(','));
  for (const row of dataset.rows) {
    csvRows.push(
      row.map(cell => {
        const val = cell === null || cell === undefined ? '' : String(cell);
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    );
  }
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = dataset.fileName || 'export.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function DataUpload() {
  const { dataset, setDataset } = useDataset();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    setError(null);
    setIsProcessing(true);
    try {
      const parsed = await parseCSVToDataset(file);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError('The CSV file appears to be empty or could not be parsed.');
        setIsProcessing(false);
        return;
      }
      setDataset(parsed);
    } catch {
      setError('Failed to parse CSV file. Please check the format.');
    } finally {
      setIsProcessing(false);
    }
  }, [setDataset]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input value so same file can be re-selected
    e.target.value = '';
  }, [handleFile]);

  const handleLoadSample = useCallback(() => {
    setError(null);
    setDataset(SAMPLE_DATA);
  }, [setDataset]);

  const handleExport = useCallback(() => {
    if (dataset) {
      exportDatasetToCSV(dataset);
    }
  }, [dataset]);

  const handleClear = useCallback(() => {
    setDataset(null);
    setError(null);
  }, [setDataset]);

  const previewRows = dataset ? dataset.rows.slice(0, 10) : [];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Upload className="size-5" />
            Data Upload
          </CardTitle>
          <CardDescription>
            Upload a CSV file by dragging it below or clicking to browse. Your data will be parsed and ready for analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative cursor-pointer rounded-xl border-2 transition-all duration-200
              flex flex-col items-center justify-center gap-3 py-10 px-6
              ${isDragOver
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 scale-[1.01]'
                : 'border-muted-foreground/25 bg-muted/30 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
              }
              ${isProcessing ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              aria-label="Upload CSV file"
            />
            <div className={`rounded-full p-3 transition-colors ${isDragOver ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-muted'}`}>
              <FileSpreadsheet className={`size-8 ${isDragOver ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">
                {isDragOver ? 'Drop your file here' : 'Drag & drop your CSV file here'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                or click to browse from your device
              </p>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span className="text-sm font-medium">Processing...</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              onClick={handleLoadSample}
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <Database className="size-4" />
              Load Sample Dataset
            </Button>
            {dataset && (
              <>
                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button
                  onClick={handleClear}
                  variant="ghost"
                  className="text-muted-foreground hover:text-red-600"
                >
                  <X className="size-4" />
                  Clear Data
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dataset Info & Preview */}
      {dataset && (
        <>
          {/* Dataset Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <FileSpreadsheet className="size-5" />
                Dataset Overview
              </CardTitle>
              <CardDescription>
                Summary of your loaded dataset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald-950/30 dark:to-teal-950/30">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="size-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">File</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground" title={dataset.fileName}>
                    {dataset.fileName}
                  </p>
                </div>
                <div className="rounded-lg border bg-gradient-to-br from-teal-50 to-cyan-50 p-4 dark:from-teal-950/30 dark:to-cyan-950/30">
                  <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                    <Rows3 className="size-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Rows</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {dataset.rows.length.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/30">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Columns3 className="size-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Columns</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {dataset.headers.length}
                  </p>
                </div>
                <div className="rounded-lg border bg-gradient-to-br from-rose-50 to-pink-50 p-4 dark:from-rose-950/30 dark:to-pink-950/30">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <Database className="size-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Status</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      Ready
                    </Badge>
                  </p>
                </div>
              </div>

              {/* Column Tags */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {dataset.headers.map((header, idx) => {
                    // Determine if column is numeric by checking sample values
                    const sampleValues = dataset.rows.slice(0, 10).map(r => r[idx]);
                    const isNumeric = sampleValues.filter(v => v !== null && v !== '' && !isNaN(Number(v))).length > sampleValues.filter(v => v === null || v === '').length;
                    return (
                      <Badge
                        key={header}
                        variant={isNumeric ? 'default' : 'secondary'}
                        className={
                          isNumeric
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900/70'
                        }
                      >
                        {header}
                        <span className="ml-1 opacity-60 text-[10px]">{isNumeric ? '#' : 'Aa'}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Rows3 className="size-5" />
                Data Preview
              </CardTitle>
              <CardDescription>
                Showing first {Math.min(10, dataset.rows.length)} of {dataset.rows.length.toLocaleString()} rows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96 w-full rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-12 text-center text-xs font-semibold text-muted-foreground">#</TableHead>
                      {dataset.headers.map(header => (
                        <TableHead key={header} className="text-xs font-semibold whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {rowIdx + 1}
                        </TableCell>
                        {row.map((cell, cellIdx) => (
                          <TableCell key={cellIdx} className="text-sm whitespace-nowrap">
                            {cell === null || cell === undefined ? (
                              <span className="text-muted-foreground/50 italic">null</span>
                            ) : (
                              String(cell)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {dataset.rows.length > 10 && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  and {dataset.rows.length - 10} more rows...
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
