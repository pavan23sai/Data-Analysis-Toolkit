'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, Download, Database, Rows3, Columns3, X, Info, ShieldCheck, TrendingUp, Hash, Type, Gauge } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

// Circular Progress Ring Component
function QualityRing({ score, size = 80 }: { score: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return { stroke: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    if (s >= 60) return { stroke: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' };
    return { stroke: '#ef4444', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' };
  };
  const color = getColor(score);

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full ${color.bg} p-2`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={`absolute text-lg font-bold ${color.text}`}>
        {Math.round(score)}
      </span>
    </div>
  );
}

// Mini sparkline-style horizontal bar for column stats
function ColumnStatBar({ label, min, max, mean, isNumeric }: {
  label: string;
  min: number;
  max: number;
  mean: number;
  isNumeric: boolean;
}) {
  const range = max - min || 1;
  const meanPos = ((mean - min) / range) * 100;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs font-medium text-foreground w-28 sm:w-36 truncate shrink-0" title={label}>
        {label}
      </span>
      <div className="flex-1 flex items-center gap-2">
        {isNumeric ? (
          <>
            <span className="text-[10px] text-muted-foreground w-10 text-right shrink-0 tabular-nums">
              {typeof min === 'number' && isFinite(min) ? min.toFixed(1) : '-'}
            </span>
            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, meanPos))}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-500 border border-white dark:border-slate-900 shadow-sm"
                style={{ left: `${Math.min(98, Math.max(1, meanPos))}%` }}
                title={`Mean: ${mean.toFixed(2)}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-10 shrink-0 tabular-nums">
              {typeof max === 'number' && isFinite(max) ? max.toFixed(1) : '-'}
            </span>
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">Categorical</span>
        )}
      </div>
    </div>
  );
}

export default function DataUpload() {
  const { dataset, setDataset } = useDataset();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ size: string; lastModified: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    setError(null);
    setIsProcessing(true);
    // Store file info
    const sizeBytes = file.size;
    const sizeStr = sizeBytes < 1024 ? `${sizeBytes} B`
      : sizeBytes < 1024 * 1024 ? `${(sizeBytes / 1024).toFixed(1)} KB`
      : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    const lastMod = file.lastModified
      ? new Date(file.lastModified).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Unknown';
    setFileInfo({ size: sizeStr, lastModified: lastMod });

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
    setFileInfo({ size: '1.2 KB', lastModified: 'Sample Data' });
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
    setFileInfo(null);
  }, [setDataset]);

  const previewRows = dataset ? dataset.rows.slice(0, 10) : [];

  // ===== Data Quality Score =====
  const qualityScore = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return null;

    const totalCells = dataset.rows.length * dataset.headers.length;

    // Missing values
    let missingCount = 0;
    dataset.rows.forEach(row => {
      row.forEach(cell => {
        if (cell === null || cell === undefined || cell === '' || (typeof cell === 'number' && isNaN(cell))) {
          missingCount++;
        }
      });
    });
    const missingPct = (missingCount / totalCells) * 100;

    // Duplicates
    const seen = new Map<string, number>();
    dataset.rows.forEach(row => {
      const key = JSON.stringify(row);
      seen.set(key, (seen.get(key) || 0) + 1);
    });
    const dupCount = [...seen.values()].reduce((sum, count) => sum + (count > 1 ? count - 1 : 0), 0);
    const dupPct = (dupCount / dataset.rows.length) * 100;

    // Data type consistency: for each column, check if non-null values are consistent type
    let consistentCols = 0;
    dataset.headers.forEach((_, idx) => {
      const values = dataset.rows.map(r => r[idx]).filter(v => v !== null && v !== undefined && v !== '');
      if (values.length === 0) { consistentCols++; return; }
      const numericCount = values.filter(v => typeof v === 'number' || (!isNaN(Number(v)))).length;
      const isMostlyNumeric = numericCount > values.length * 0.8;
      const isMostlyString = numericCount < values.length * 0.2;
      if (isMostlyNumeric || isMostlyString) consistentCols++;
    });
    const consistencyPct = (consistentCols / dataset.headers.length) * 100;

    // Overall score: weighted average (missing: 40%, dup: 30%, consistency: 30%)
    const score = (100 - missingPct) * 0.4 + (100 - dupPct) * 0.3 + consistencyPct * 0.3;

    return {
      score: Math.max(0, Math.min(100, score)),
      missingPct: Math.round(missingPct * 10) / 10,
      dupPct: Math.round(dupPct * 10) / 10,
      consistencyPct: Math.round(consistencyPct * 10) / 10,
      missingCount,
      dupCount,
      totalCells,
    };
  }, [dataset]);

  // ===== Quick Stats =====
  const quickStats = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return null;

    const totalCells = dataset.rows.length * dataset.headers.length;
    let numericCells = 0;
    let categoricalCells = 0;

    dataset.rows.forEach(row => {
      row.forEach(cell => {
        if (cell === null || cell === undefined || cell === '') return;
        if (typeof cell === 'number' || (!isNaN(Number(cell)) && cell !== '')) {
          numericCells++;
        } else {
          categoricalCells++;
        }
      });
    });

    return {
      totalCells,
      numericPct: totalCells > 0 ? Math.round((numericCells / totalCells) * 1000) / 10 : 0,
      categoricalPct: totalCells > 0 ? Math.round((categoricalCells / totalCells) * 1000) / 10 : 0,
    };
  }, [dataset]);

  // ===== Column-Level Statistics =====
  const columnStats = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return [];

    return dataset.headers.map((header, idx) => {
      const values = dataset.rows.map(r => r[idx]);
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      const numericValues = nonNull.filter(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '')).map(Number);

      if (numericValues.length > nonNull.length * 0.5 && numericValues.length > 0) {
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        const mean = numericValues.reduce((s, v) => s + v, 0) / numericValues.length;
        return { header, isNumeric: true, min, max, mean };
      }
      return { header, isNumeric: false, min: 0, max: 0, mean: 0 };
    });
  }, [dataset]);

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-dashed overflow-hidden">
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
              relative cursor-pointer rounded-xl border-2 transition-all duration-300
              flex flex-col items-center justify-center gap-3 py-10 px-6
              ${isDragOver
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 scale-[1.01]'
                : 'border-muted-foreground/25 bg-muted/30 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
              }
              ${isProcessing ? 'pointer-events-none opacity-60' : ''}
            `}
            style={{
              backgroundImage: isDragOver
                ? 'none'
                : `repeating-linear-gradient(0deg, transparent, transparent 9px, rgba(16,185,129,0.08) 9px, rgba(16,185,129,0.08) 10px),
                   repeating-linear-gradient(90deg, transparent, transparent 9px, rgba(16,185,129,0.08) 9px, rgba(16,185,129,0.08) 10px)`,
              backgroundSize: '10px 10px',
              animation: !isDragOver && !isProcessing ? 'dashMove 20s linear infinite' : 'none',
            }}
          >
            {/* Animated dashed border overlay */}
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                border: '2px dashed',
                borderColor: isDragOver ? 'transparent' : 'rgba(16,185,129,0.25)',
                animation: !isDragOver && !isProcessing ? 'dashRotate 8s linear infinite' : 'none',
              }}
            />
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <FileSpreadsheet className="size-5" />
                    Dataset Overview
                  </CardTitle>
                  <CardDescription>
                    Summary of your loaded dataset
                  </CardDescription>
                </div>
                {fileInfo && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        <div className="space-y-1">
                          <p>File size: {fileInfo.size}</p>
                          <p>Modified: {fileInfo.lastModified}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
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
                  {fileInfo && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{fileInfo.size} • {fileInfo.lastModified}</p>
                  )}
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

          {/* Data Quality Score & Quick Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Quality Score Card */}
            {qualityScore && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="size-5" />
                    Data Quality Score
                  </CardTitle>
                  <CardDescription>Quick assessment of your dataset quality</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <QualityRing score={qualityScore.score} />
                    <div className="flex-1 space-y-3">
                      {/* Missing Values */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <X className="size-3" />
                            Missing Values
                          </span>
                          <span className={`text-xs font-semibold ${qualityScore.missingPct === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {qualityScore.missingPct}%
                          </span>
                        </div>
                        <Progress
                          value={100 - qualityScore.missingPct}
                          className="h-1.5"
                        />
                      </div>
                      {/* Duplicate Rows */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Database className="size-3" />
                            Duplicate Rows
                          </span>
                          <span className={`text-xs font-semibold ${qualityScore.dupPct === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {qualityScore.dupPct}%
                          </span>
                        </div>
                        <Progress
                          value={100 - qualityScore.dupPct}
                          className="h-1.5"
                        />
                      </div>
                      {/* Type Consistency */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <TrendingUp className="size-3" />
                            Type Consistency
                          </span>
                          <span className={`text-xs font-semibold ${qualityScore.consistencyPct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {qualityScore.consistencyPct}%
                          </span>
                        </div>
                        <Progress
                          value={qualityScore.consistencyPct}
                          className="h-1.5"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats Card */}
            {quickStats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Gauge className="size-5" />
                    Quick Stats
                  </CardTitle>
                  <CardDescription>Data composition at a glance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-lg border bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-800/50 dark:to-slate-800/30 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {quickStats.totalCells.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Total Cells</p>
                    </div>
                    <div className="rounded-lg border bg-gradient-to-br from-teal-50 to-emerald-50 p-4 dark:from-teal-950/30 dark:to-emerald-950/30 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Hash className="size-4 text-teal-600 dark:text-teal-400" />
                        <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">
                          {quickStats.numericPct}%
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Numeric Cells</p>
                    </div>
                    <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/30 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Type className="size-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                          {quickStats.categoricalPct}%
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Categorical Cells</p>
                    </div>
                  </div>

                  {/* Composition bar */}
                  <div className="mt-4">
                    <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <div
                        className="bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500"
                        style={{ width: `${quickStats.numericPct}%` }}
                        title={`Numeric: ${quickStats.numericPct}%`}
                      />
                      <div
                        className="bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                        style={{ width: `${quickStats.categoricalPct}%` }}
                        title={`Categorical: ${quickStats.categoricalPct}%`}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-teal-400 to-emerald-500" />
                        Numeric
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-amber-400 to-orange-400" />
                        Categorical
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-700" />
                        Missing/Empty
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Column-Level Statistics */}
          {columnStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <TrendingUp className="size-5" />
                  Column Statistics
                </CardTitle>
                <CardDescription>
                  Range and mean overview for each numeric column
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5">
                  {columnStats.map(stat => (
                    <ColumnStatBar
                      key={stat.header}
                      label={stat.header}
                      min={stat.min}
                      max={stat.max}
                      mean={stat.mean}
                      isNumeric={stat.isNumeric}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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

      {/* CSS animations for dashed border */}
      <style jsx>{`
        @keyframes dashRotate {
          from { border-color: rgba(16,185,129,0.25); }
          50% { border-color: rgba(16,185,129,0.4); }
          to { border-color: rgba(16,185,129,0.25); }
        }
        @keyframes dashMove {
          from { background-position: 0 0; }
          to { background-position: 100px 100px; }
        }
      `}</style>
    </div>
  );
}
