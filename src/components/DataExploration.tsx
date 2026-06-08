'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import {
  Search,
  AlertTriangle,
  Copy,
  Trash2,
  Droplets,
  BarChart3,
  TableProperties,
  FileWarning,
  CheckCircle2,
  XCircle,
  ArrowDown,
  ArrowUp,
  Info,
  Hash,
  Type,
  Calendar,
  Fingerprint,
  Zap,
  Ruler,
  Scaling,
  SquareRadical,
  Sparkles,
  Loader2,
  RefreshCw,
  BrainCircuit,
  ShieldCheck,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDataset } from '@/hooks/useDataset';
import {
  analyzeMissingValues,
  findDuplicates,
  detectOutliersIQR,
  quartiles,
  mean,
  median,
  mode,
  min as statMin,
  max as statMax,
  standardDeviation,
  computeColumnSummary,
  skewness,
  kurtosis,
  correlation,
} from '@/lib/statistics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

type ColumnType = 'numeric' | 'categorical' | 'date-like' | 'id/unique';

function detectColumnType(values: (string | number | null | undefined)[]): ColumnType {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'categorical';

  // Check if all unique -> ID/unique
  const unique = new Set(nonNull.map(String));
  if (unique.size === nonNull.length && nonNull.length > 3) {
    // Additional check: IDs often have patterns like S001, S002 or are sequential
    const strValues = nonNull.map(String);
    const hasIdPattern = strValues.some(v => /^[A-Za-z]+\d+$/.test(v));
    if (hasIdPattern) return 'id/unique';
  }

  // Check numeric
  const numericCount = nonNull.filter(v => typeof v === 'number' || (!isNaN(Number(v)))).length;
  if (numericCount > nonNull.length * 0.8) return 'numeric';

  // Check date-like
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,       // 2024-01-15
    /^\d{2}\/\d{2}\/\d{4}$/,     // 01/15/2024
    /^\d{2}-\d{2}-\d{4}$/,       // 15-01-2024
    /^\w{3}\s+\d{1,2},?\s*\d{4}$/, // Jan 15, 2024
  ];
  const dateLikeCount = nonNull.filter(v => {
    const s = String(v);
    return datePatterns.some(p => p.test(s));
  }).length;
  if (dateLikeCount > nonNull.length * 0.5) return 'date-like';

  // Default: categorical
  return 'categorical';
}

function TypeIcon({ type }: { type: ColumnType }) {
  switch (type) {
    case 'numeric': return <Hash className="size-3.5" />;
    case 'categorical': return <Type className="size-3.5" />;
    case 'date-like': return <Calendar className="size-3.5" />;
    case 'id/unique': return <Fingerprint className="size-3.5" />;
  }
}

function TypeBadge({ type }: { type: ColumnType }) {
  const config: Record<ColumnType, { label: string; className: string }> = {
    'numeric': {
      label: 'Numeric',
      className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    },
    'categorical': {
      label: 'Categorical',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    'date-like': {
      label: 'Date-like',
      className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    },
    'id/unique': {
      label: 'ID/Unique',
      className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    },
  };
  const c = config[type];
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${c.className}`}>
      <TypeIcon type={type} />
      {c.label}
    </Badge>
  );
}

export default function DataExploration() {
  const { dataset, setDataset, getNumericColumns, getColumnData } = useDataset();

  // ===== Missing Value Analysis =====
  const missingAnalysis = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return [];
    const columnData: Record<string, (string | number | null | undefined)[]> = {};
    dataset.headers.forEach((header, idx) => {
      columnData[header] = dataset.rows.map((row) => row[idx] ?? null);
    });
    return analyzeMissingValues(columnData);
  }, [dataset]);

  const totalMissing = useMemo(
    () => missingAnalysis.reduce((sum, col) => sum + col.missingCount, 0),
    [missingAnalysis]
  );

  // ===== Duplicate Analysis =====
  const duplicateResult = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return null;
    const rowsAsObjects: Record<string, string | number | null | undefined>[] =
      dataset.rows.map((row) => {
        const obj: Record<string, string | number | null | undefined> = {};
        dataset.headers.forEach((header, idx) => {
          obj[header] = row[idx] ?? null;
        });
        return obj;
      });
    return findDuplicates(rowsAsObjects);
  }, [dataset]);

  // ===== Data Type Detection =====
  const columnTypes = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return [];
    return dataset.headers.map((header, idx) => {
      const values = dataset.rows.map(r => r[idx]);
      const type = detectColumnType(values);
      return { header, type, idx };
    });
  }, [dataset]);

  // ===== Data Cleaning =====
  const [cleaningMessage, setCleaningMessage] = useState<string | null>(null);

  const handleDropMissingRows = useCallback(() => {
    if (!dataset || dataset.rows.length === 0) return;
    const filtered = dataset.rows.filter((row) =>
      row.every((val) => val !== null && val !== undefined && val !== '')
    );
    const dropped = dataset.rows.length - filtered.length;
    setDataset({ ...dataset, rows: filtered, rawRows: filtered.map((row) => {
      const obj: Record<string, string | number | null> = {};
      dataset.headers.forEach((header, idx) => {
        obj[header] = row[idx] ?? null;
      });
      return obj;
    })});
    setCleaningMessage(`Dropped ${dropped} row(s) with missing values.`);
    setTimeout(() => setCleaningMessage(null), 3000);
  }, [dataset, setDataset]);

  const handleFillMissing = useCallback(
    (strategy: 'mean' | 'median' | 'mode') => {
      if (!dataset || dataset.rows.length === 0) return;
      const numericCols = getNumericColumns();
      const newRows = dataset.rows.map((row) => {
        return row.map((val, idx) => {
          const header = dataset.headers[idx];
          if (
            (val === null || val === undefined || val === '') &&
            numericCols.includes(header)
          ) {
            const colData = getColumnData(header);
            if (colData.length === 0) return val;
            switch (strategy) {
              case 'mean':
                return Number(mean(colData).toFixed(4));
              case 'median':
                return Number(median(colData).toFixed(4));
              case 'mode': {
                const modeVals = mode(colData);
                return modeVals.length > 0 ? modeVals[0] : val;
              }
            }
          }
          return val;
        });
      });
      let filledCount = 0;
      dataset.rows.forEach((row, rowIdx) => {
        row.forEach((val, colIdx) => {
          if (
            (val === null || val === undefined || val === '') &&
            numericCols.includes(dataset.headers[colIdx]) &&
            newRows[rowIdx][colIdx] !== val
          ) {
            filledCount++;
          }
        });
      });
      setDataset({ ...dataset, rows: newRows, rawRows: newRows.map((row) => {
        const obj: Record<string, string | number | null> = {};
        dataset.headers.forEach((header, idx) => {
          obj[header] = row[idx] ?? null;
        });
        return obj;
      })});
      setCleaningMessage(
        `Filled ${filledCount} missing value(s) with ${strategy}.`
      );
      setTimeout(() => setCleaningMessage(null), 3000);
    },
    [dataset, setDataset, getNumericColumns, getColumnData]
  );

  const handleRemoveDuplicates = useCallback(() => {
    if (!dataset || !duplicateResult || dataset.rows.length === 0) return;
    const indicesToRemove = new Set(duplicateResult.duplicateRowIndices);
    const filtered = dataset.rows.filter(
      (_, idx) => !indicesToRemove.has(idx)
    );
    const removed = dataset.rows.length - filtered.length;
    setDataset({ ...dataset, rows: filtered, rawRows: filtered.map((row) => {
      const obj: Record<string, string | number | null> = {};
      dataset.headers.forEach((header, idx) => {
        obj[header] = row[idx] ?? null;
      });
      return obj;
    })});
    setCleaningMessage(`Removed ${removed} duplicate row(s).`);
    setTimeout(() => setCleaningMessage(null), 3000);
  }, [dataset, setDataset, duplicateResult]);

  // ===== AI Insights =====
  const [insightsText, setInsightsText] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const insightsRef = useRef<HTMLDivElement>(null);

  const buildDatasetSummary = useCallback(() => {
    if (!dataset || dataset.rows.length === 0) return '';
    const numCols = getNumericColumns();
    const lines: string[] = [];

    lines.push(`Dataset: ${dataset.fileName}`);
    lines.push(`Rows: ${dataset.rows.length}, Columns: ${dataset.headers.length}`);
    lines.push('');

    // Numeric column summaries
    if (numCols.length > 0) {
      lines.push('=== Numeric Columns ===');
      for (const col of numCols) {
        const colData = getColumnData(col);
        if (colData.length === 0) continue;
        const summary = computeColumnSummary(col, colData);
        lines.push(`Column: ${col}`);
        lines.push(`  Count: ${summary.count}, Missing: ${summary.missing}`);
        lines.push(`  Mean: ${summary.mean.toFixed(4)}, Std Dev: ${summary.stdDev.toFixed(4)}`);
        lines.push(`  Min: ${summary.min.toFixed(4)}, Max: ${summary.max.toFixed(4)}`);
        lines.push(`  Median: ${summary.median.toFixed(4)}, Q1: ${summary.q1.toFixed(4)}, Q3: ${summary.q3.toFixed(4)}`);
        lines.push(`  IQR: ${summary.iqr.toFixed(4)}`);
        lines.push(`  Skewness: ${summary.skewness.toFixed(4)}, Kurtosis: ${summary.kurtosis.toFixed(4)}`);
        lines.push('');
      }
    }

    // Categorical column summaries
    const catCols = dataset.headers.filter(h => !numCols.includes(h));
    if (catCols.length > 0) {
      lines.push('=== Categorical Columns ===');
      for (const col of catCols) {
        const idx = dataset.headers.indexOf(col);
        const values = dataset.rows.map(row => String(row[idx] ?? '')).filter(v => v !== '');
        const freq = new Map<string, number>();
        values.forEach(v => freq.set(v, (freq.get(v) || 0) + 1));
        const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
        lines.push(`Column: ${col}`);
        lines.push(`  Unique Values: ${freq.size}, Total Count: ${values.length}`);
        lines.push(`  Top 5 Values: ${sorted.slice(0, 5).map(([val, cnt]) => `${val} (${cnt})`).join(', ')}`);
        lines.push('');
      }
    }

    // Correlation highlights
    if (numCols.length >= 2) {
      lines.push('=== Correlation Highlights ===');
      const corrPairs: { col1: string; col2: string; r: number }[] = [];
      for (let i = 0; i < numCols.length; i++) {
        for (let j = i + 1; j < numCols.length; j++) {
          const data1 = getColumnData(numCols[i]);
          const data2 = getColumnData(numCols[j]);
          const minLen = Math.min(data1.length, data2.length);
          if (minLen >= 3) {
            const r = correlation(data1.slice(0, minLen), data2.slice(0, minLen));
            if (!isNaN(r)) {
              corrPairs.push({ col1: numCols[i], col2: numCols[j], r });
            }
          }
        }
      }
      corrPairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
      for (const pair of corrPairs.slice(0, 10)) {
        lines.push(`  ${pair.col1} vs ${pair.col2}: r = ${pair.r.toFixed(4)}`);
      }
      if (corrPairs.length === 0) {
        lines.push('  Not enough data for correlation analysis');
      }
      lines.push('');
    }

    // Data quality summary
    lines.push('=== Data Quality ===');
    lines.push(`Total Missing Values: ${totalMissing}`);
    if (duplicateResult) {
      lines.push(`Duplicate Rows: ${duplicateResult.duplicateCount}`);
    }

    return lines.join('\n');
  }, [dataset, getNumericColumns, getColumnData, totalMissing, duplicateResult]);

  const handleGenerateInsights = useCallback(async () => {
    const summary = buildDatasetSummary();
    if (!summary) return;

    setInsightsLoading(true);
    setInsightsError(null);

    try {
      const basePath = process.env.NEXT_PUBLIC_REPO_NAME ? `/${process.env.NEXT_PUBLIC_REPO_NAME}` : '';
      const response = await fetch(`${basePath}/api/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to generate insights' }));
        throw new Error(data.error || 'Failed to generate insights');
      }

      const data = await response.json();
      setInsightsText(data.insights);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate insights';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('404')) {
        setInsightsError('AI Insights requires a server backend. This feature is not available on static hosting (GitHub Pages). Run the app locally with `bun run dev` to use AI Insights.');
      } else {
        setInsightsError(msg);
      }
    } finally {
      setInsightsLoading(false);
    }
  }, [buildDatasetSummary]);

  // Simple inline markdown renderer for a single line
  const renderInlineMarkdown = useCallback((text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    // Process bold first, then italic
    const boldParts = text.split(/(\*\*.+?\*\*)/);
    let keyIdx = 0;
    for (const part of boldParts) {
      const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
      if (boldMatch) {
        nodes.push(<strong key={`b${keyIdx++}`} className="font-semibold text-slate-900 dark:text-slate-100">{boldMatch[1]}</strong>);
      } else {
        // Process italic within non-bold parts
        const italicParts = part.split(/(\*.+?\*)/);
        for (const ip of italicParts) {
          const italicMatch = ip.match(/^\*(.+?)\*$/);
          if (italicMatch) {
            nodes.push(<em key={`i${keyIdx++}`} className="italic">{italicMatch[1]}</em>);
          } else {
            nodes.push(<span key={`t${keyIdx++}`}>{ip}</span>);
          }
        }
      }
    }
    return nodes;
  }, []);

  // Simple markdown renderer for AI insights
  const renderInsightsMarkdown = useCallback((text: string) => {
    const blocks = text.split(/\n\n+/);
    return blocks.map((block, blockIdx) => {
      // Headers
      if (block.startsWith('## ')) {
        return (
          <h3 key={blockIdx} className="text-base font-bold text-teal-700 dark:text-teal-300 mt-4 mb-2 first:mt-0">
            {block.replace(/^##\s+/, '')}
          </h3>
        );
      }
      if (block.startsWith('# ')) {
        return (
          <h2 key={blockIdx} className="text-lg font-bold text-teal-700 dark:text-teal-300 mt-4 mb-2 first:mt-0">
            {block.replace(/^#\s+/, '')}
          </h2>
        );
      }

      // List items
      const lines = block.split('\n');
      const renderedLines = lines.map((line, lineIdx) => {
        // Bullet list items
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.replace(/^[-*]\s+/, '');
          return (
            <li key={lineIdx} className="ml-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed list-disc">
              {renderInlineMarkdown(content)}
            </li>
          );
        }

        // Numbered list items
        const numberedMatch = line.match(/^\d+\.\s+/);
        if (numberedMatch) {
          const content = line.replace(/^\d+\.\s+/, '');
          return (
            <li key={lineIdx} className="ml-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed list-decimal">
              {renderInlineMarkdown(content)}
            </li>
          );
        }

        // Regular text line
        return (
          <p key={lineIdx} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {renderInlineMarkdown(line)}
          </p>
        );
      });

      return (
        <div key={blockIdx} className="mb-2">
          {renderedLines}
        </div>
      );
    });
  }, [renderInlineMarkdown]);

  // ===== Outlier Detection =====
  const numericCols = getNumericColumns();
  const [selectedOutlierCol, setSelectedOutlierCol] = useState<string>('');

  // ===== Data Transformation =====
  const [selectedLogCol, setSelectedLogCol] = useState<string>('');
  const [selectedZscoreCol, setSelectedZscoreCol] = useState<string>('');
  const [selectedNormCol, setSelectedNormCol] = useState<string>('');
  const [selectedSqrtCol, setSelectedSqrtCol] = useState<string>('');
  const [transformMessage, setTransformMessage] = useState<string | null>(null);

  const applyTransformation = useCallback(
    (columnName: string, suffix: string, transformFn: (val: number) => number) => {
      if (!dataset || dataset.rows.length === 0) return;
      const colIdx = dataset.headers.indexOf(columnName);
      if (colIdx === -1) return;

      const newHeader = `${columnName}${suffix}`;
      // Check if column already exists
      if (dataset.headers.includes(newHeader)) {
        setTransformMessage(`Column "${newHeader}" already exists. Remove it first to re-apply.`);
        setTimeout(() => setTransformMessage(null), 4000);
        return;
      }

      const newHeaders = [...dataset.headers, newHeader];
      const newRows = dataset.rows.map((row) => {
        const val = row[colIdx];
        if (val === null || val === undefined || val === '' || isNaN(Number(val))) {
          return [...row, null];
        }
        const numVal = Number(val);
        const transformed = transformFn(numVal);
        if (transformed === null || isNaN(transformed) || !isFinite(transformed)) {
          return [...row, null];
        }
        return [...row, Number(transformed.toFixed(6))];
      });

      const newRawRows = newRows.map((row) => {
        const obj: Record<string, string | number | null> = {};
        newHeaders.forEach((header, idx) => {
          obj[header] = row[idx] ?? null;
        });
        return obj;
      });

      setDataset({ ...dataset, headers: newHeaders, rows: newRows, rawRows: newRawRows });
      setTransformMessage(`Created column "${newHeader}" with ${suffix.replace('_', '')} transformation.`);
      setTimeout(() => setTransformMessage(null), 4000);
    },
    [dataset, setDataset]
  );

  const handleLogTransform = useCallback(() => {
    if (!selectedLogCol) return;
    applyTransformation(selectedLogCol, '_log', (val) => {
      if (val <= 0) return null as unknown as number;
      return Math.log10(val);
    });
  }, [selectedLogCol, applyTransformation]);

  const handleZScoreTransform = useCallback(() => {
    if (!selectedZscoreCol) return;
    const colData = getColumnData(selectedZscoreCol);
    const m = mean(colData);
    const sd = standardDeviation(colData);
    if (sd === 0) {
      setTransformMessage('Cannot standardize: column has zero standard deviation.');
      setTimeout(() => setTransformMessage(null), 4000);
      return;
    }
    applyTransformation(selectedZscoreCol, '_zscore', (val) => (val - m) / sd);
  }, [selectedZscoreCol, applyTransformation, getColumnData]);

  const handleMinMaxNormalize = useCallback(() => {
    if (!selectedNormCol) return;
    const colData = getColumnData(selectedNormCol);
    const minVal = statMin(colData);
    const maxVal = statMax(colData);
    if (maxVal === minVal) {
      setTransformMessage('Cannot normalize: column has zero range (all values identical).');
      setTimeout(() => setTransformMessage(null), 4000);
      return;
    }
    applyTransformation(selectedNormCol, '_norm', (val) => (val - minVal) / (maxVal - minVal));
  }, [selectedNormCol, applyTransformation, getColumnData]);

  const handleSqrtTransform = useCallback(() => {
    if (!selectedSqrtCol) return;
    applyTransformation(selectedSqrtCol, '_sqrt', (val) => {
      if (val < 0) return null as unknown as number;
      return Math.sqrt(val);
    });
  }, [selectedSqrtCol, applyTransformation]);

  const outlierResult = useMemo(() => {
    if (!selectedOutlierCol) return null;
    const colData = getColumnData(selectedOutlierCol);
    if (colData.length === 0) return null;
    const result = detectOutliersIQR(colData);
    const q = quartiles(colData);
    return {
      ...result,
      min: statMin(colData),
      max: statMax(colData),
      q1: q.q1,
      q2: q.q2,
      q3: q.q3,
    };
  }, [selectedOutlierCol, getColumnData]);

  // Better approach: 5-number summary as individual bars for visualization
  const fiveNumberData = useMemo(() => {
    if (!outlierResult) return [];
    return [
      { label: 'Min', value: outlierResult.min, type: 'whisker' },
      { label: 'Q1', value: outlierResult.q1, type: 'box' },
      { label: 'Median', value: outlierResult.q2, type: 'median' },
      { label: 'Q3', value: outlierResult.q3, type: 'box' },
      { label: 'Max', value: outlierResult.max, type: 'whisker' },
    ];
  }, [outlierResult]);

  // Compute data health score (before early return to avoid conditional hook call)
  const healthScore = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return 0;
    let score = 100;
    // Deduct for missing values
    const missingPct = totalMissing / (dataset.rows.length * dataset.headers.length);
    score -= missingPct * 40; // up to 40 points for missing
    // Deduct for duplicates
    if (duplicateResult && duplicateResult.duplicateCount > 0) {
      const dupPct = duplicateResult.duplicateCount / dataset.rows.length;
      score -= dupPct * 30; // up to 30 points for duplicates
    }
    return Math.max(0, Math.round(score));
  }, [dataset, totalMissing, duplicateResult]);

  // Numeric column quick summary data for sparklines (before early return)
  const numericQuickStats = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return [];
    return numericCols.map((col) => {
      const data = getColumnData(col);
      if (data.length === 0) return null;
      const colSummary = computeColumnSummary(col, data);
      return {
        name: col,
        mean: colSummary.mean,
        stdDev: colSummary.stdDev,
        min: colSummary.min,
        max: colSummary.max,
        skewness: colSummary.skewness,
      };
    }).filter(Boolean);
  }, [dataset, numericCols, getColumnData]);

  if (!dataset || dataset.rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileWarning className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-sm">
            No dataset loaded. Upload a CSV file to explore data quality.
          </p>
        </CardContent>
      </Card>
    );
  }

  const noMissing = totalMissing === 0;
  const noDuplicates = !duplicateResult || duplicateResult.duplicateCount === 0;

  return (
    <div className="space-y-6">
      {/* ===== Data Health Dashboard ===== */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Data Health Dashboard
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-mono shrink-0 ${
                  healthScore >= 90
                    ? 'border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                    : healthScore >= 70
                      ? 'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
                      : 'border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'
                }`}>
                  {healthScore}/100
                </Badge>
              </CardTitle>
              <CardDescription>Quick overview of your dataset&apos;s quality and composition</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Health Score Ring */}
            <div className="rounded-lg border bg-muted/30 dark:bg-slate-800/50 p-3 flex flex-col items-center justify-center">
              <svg viewBox="0 0 80 80" className="w-16 h-16">
                <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-200 dark:text-slate-700" />
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke={healthScore >= 90 ? '#10b981' : healthScore >= 70 ? '#f59e0b' : '#f43f5e'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 201} 201`}
                  transform="rotate(-90 40 40)"
                  className="transition-all duration-700"
                />
                <text x="40" y="36" textAnchor="middle" fontSize="18" fontWeight="700" className="fill-foreground">{healthScore}</text>
                <text x="40" y="50" textAnchor="middle" fontSize="8" className="fill-muted-foreground">/100</text>
              </svg>
              <span className="text-xs font-medium text-muted-foreground mt-1">Health Score</span>
            </div>

            {/* Missing Values */}
            <div className="rounded-lg border bg-muted/30 dark:bg-slate-800/50 p-3 flex flex-col items-center justify-center">
              <div className={`text-2xl font-bold ${noMissing ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {totalMissing}
              </div>
              <span className="text-xs font-medium text-muted-foreground mt-0.5">Missing Values</span>
              <Badge variant="outline" className={`mt-1 text-[9px] px-1.5 py-0 ${
                noMissing
                  ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
                  : 'border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400'
              }`}>
                {noMissing ? 'Clean' : 'Needs Fix'}
              </Badge>
            </div>

            {/* Duplicates */}
            <div className="rounded-lg border bg-muted/30 dark:bg-slate-800/50 p-3 flex flex-col items-center justify-center">
              <div className={`text-2xl font-bold ${noDuplicates ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {duplicateResult?.duplicateCount ?? 0}
              </div>
              <span className="text-xs font-medium text-muted-foreground mt-0.5">Duplicate Rows</span>
              <Badge variant="outline" className={`mt-1 text-[9px] px-1.5 py-0 ${
                noDuplicates
                  ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
                  : 'border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400'
              }`}>
                {noDuplicates ? 'Unique' : 'Has Duplicates'}
              </Badge>
            </div>

            {/* Column Types */}
            <div className="rounded-lg border bg-muted/30 dark:bg-slate-800/50 p-3 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{numericCols.length}</span>
                <span className="text-xs text-muted-foreground">num</span>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{dataset.headers.length - numericCols.length}</span>
                <span className="text-xs text-muted-foreground">cat</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground mt-0.5">Column Types</span>
              <Badge variant="outline" className="mt-1 text-[9px] px-1.5 py-0 border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                {dataset.headers.length} total
              </Badge>
            </div>
          </div>

          {/* Numeric column mini-bars */}
          {numericQuickStats.length > 0 && (
            <div className="mt-4 pt-3 border-t dark:border-slate-700">
              <div className="flex items-center gap-1.5 mb-2">
                <Ruler className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Numeric Column Quick Stats</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {numericQuickStats.map((stat) => {
                  if (!stat) return null;
                  const range = stat.max - stat.min || 1;
                  const meanPct = ((stat.mean - stat.min) / range) * 100;
                  return (
                    <div key={stat.name} className="rounded-md border bg-background/50 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground truncate">{stat.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          μ={stat.mean.toFixed(1)} σ={stat.stdDev.toFixed(1)}
                        </span>
                      </div>
                      <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400 to-emerald-400 dark:from-teal-600 dark:to-emerald-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, meanPct))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-muted-foreground font-mono">{stat.min.toFixed(1)}</span>
                        <span className={`text-[9px] font-mono ${
                          Math.abs(stat.skewness) > 0.5
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          skew={stat.skewness.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono">{stat.max.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== AI Data Insights ===== */}
      <div ref={insightsRef} id="ai-insights-card">
        <Card className="overflow-hidden">
          {/* Gradient accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
                  <Sparkles className={`size-5 text-white ${insightsLoading ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    AI-Powered Insights
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 font-mono shrink-0">
                      AI
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Get AI-powered analysis and recommendations for your dataset
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {insightsText && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateInsights}
                    disabled={insightsLoading}
                    className="gap-1.5 text-teal-700 border-teal-300 hover:bg-teal-50 hover:text-teal-800 dark:text-teal-300 dark:border-teal-700 dark:hover:bg-teal-950/50 transition-all duration-200"
                  >
                    <RefreshCw className={`size-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Regenerate</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleGenerateInsights}
                  disabled={insightsLoading}
                  className="gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-50"
                >
                  {insightsLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span className="hidden sm:inline">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      <span className="hidden sm:inline">Generate Insights</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Loading skeleton */}
            {insightsLoading && !insightsText && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-teal-50/50 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-100 dark:border-teal-900/50">
                  <BrainCircuit className="size-8 text-teal-500 dark:text-teal-400 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Analyzing your dataset...</p>
                    <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-0.5">AI is examining patterns, correlations, and data quality</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted/60 rounded w-1/3" />
                      <div className="h-3 bg-muted/40 rounded w-full" />
                      <div className="h-3 bg-muted/40 rounded w-4/5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {insightsError && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">Failed to generate insights</p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">{insightsError}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateInsights}
                  className="text-red-700 border-red-200 hover:bg-red-50 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-950/30 shrink-0"
                >
                  <RefreshCw className="size-3.5 mr-1" />
                  Retry
                </Button>
              </div>
            )}

            {/* Insights content */}
            {insightsText && (
              <div className="space-y-1 rounded-lg border border-teal-100 dark:border-teal-900/50 bg-gradient-to-br from-teal-50/30 via-transparent to-emerald-50/30 dark:from-teal-950/10 dark:via-transparent dark:to-emerald-950/10 p-4">
                {renderInsightsMarkdown(insightsText)}
              </div>
            )}

            {/* Empty state */}
            {!insightsText && !insightsLoading && !insightsError && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 mb-3">
                  <BrainCircuit className="size-7 text-teal-600 dark:text-teal-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ready for AI Analysis</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Click "Generate Insights" to get AI-powered analysis of your dataset including patterns, correlations, and recommendations
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Data Type Detection ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="size-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-lg">Data Type Detection</CardTitle>
          </div>
          <CardDescription>
            Automatically detected types for each column in your dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {columnTypes.map(({ header, type }) => {
              const colIdx = dataset.headers.indexOf(header);
              const sampleValues = dataset.rows.slice(0, 3).map(r => r[colIdx]).filter(v => v !== null && v !== undefined && v !== '');
              return (
                <div
                  key={header}
                  className="rounded-lg border dark:border-slate-700 bg-muted/30 dark:bg-slate-800/50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate" title={header}>
                      {header}
                    </span>
                    <TypeBadge type={type} />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {sampleValues.slice(0, 3).map((val, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-muted-foreground truncate max-w-[80px]">
                        {String(val)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t dark:border-slate-700">
            {(['numeric', 'categorical', 'date-like', 'id/unique'] as ColumnType[]).map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <TypeBadge type={t} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ===== Missing Value Analysis ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="size-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-lg">Missing Value Analysis</CardTitle>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <CardDescription>
              Overview of missing data across all columns
            </CardDescription>
            {totalMissing > 0 && (
              <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                {totalMissing} missing total
              </Badge>
            )}
            {totalMissing === 0 && (
              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                No missing values
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
            <ScrollArea className="max-h-80">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 dark:bg-slate-800/50">
                    <TableHead className="whitespace-nowrap">Column</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Missing</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Missing %</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Present</TableHead>
                    <TableHead className="w-32 whitespace-nowrap">Completeness</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingAnalysis.map((col) => {
                    const presentPct = col.totalCount > 0 ? (col.presentCount / col.totalCount) * 100 : 100;
                    return (
                      <TableRow key={col.column}>
                        <TableCell className="font-medium whitespace-nowrap">{col.column}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{col.totalCount}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {col.missingCount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">{col.missingCount}</span>
                          ) : (
                            <span>{col.missingCount}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {col.missingPercent > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {col.missingPercent.toFixed(1)}%
                            </span>
                          ) : (
                            <span>0%</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{col.presentCount}</TableCell>
                        {/* Mini progress bar */}
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  presentPct >= 90 ? 'bg-emerald-500' :
                                  presentPct >= 70 ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${presentPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right">
                              {presentPct.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {col.missingCount === 0 ? (
                            <CheckCircle2 className="size-4 text-emerald-500 inline-block" />
                          ) : col.missingPercent > 30 ? (
                            <XCircle className="size-4 text-red-500 inline-block" />
                          ) : (
                            <AlertTriangle className="size-4 text-amber-500 inline-block" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* ===== Duplicate Analysis ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Copy className="size-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-lg">Duplicate Analysis</CardTitle>
          </div>
          <CardDescription>
            Identify and quantify duplicate rows in your dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          {duplicateResult && (
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-lg border dark:border-slate-700 bg-muted/30 dark:bg-slate-800/50 p-3 sm:p-4 text-center min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-foreground truncate">
                  {dataset.rows.length.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Total Rows</p>
              </div>
              <div className="rounded-lg border dark:border-slate-700 bg-muted/30 dark:bg-slate-800/50 p-3 sm:p-4 text-center min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 truncate">
                  {duplicateResult.duplicateCount.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Duplicates</p>
              </div>
              <div className="rounded-lg border dark:border-slate-700 bg-muted/30 dark:bg-slate-800/50 p-3 sm:p-4 text-center min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  {duplicateResult.uniqueCount.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Unique Rows</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Data Cleaning Options ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Droplets className="size-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-lg">Data Cleaning</CardTitle>
          </div>
          <CardDescription>
            Clean your dataset by handling missing values and duplicates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Missing Value Handling */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                Handle Missing Values
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDropMissingRows}
                          disabled={noMissing}
                          className="border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-800 w-full justify-start"
                        >
                          <Trash2 className="size-3.5 mr-1.5 shrink-0" />
                          Drop Rows with Missing
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{noMissing ? 'No missing values found — option disabled' : `Drop ${totalMissing} row(s) with missing values`}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFillMissing('mean')}
                          disabled={noMissing}
                          className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-800 w-full justify-start"
                        >
                          Fill with Mean
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{noMissing ? 'No missing values found — option disabled' : 'Fill missing numeric values with column mean'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFillMissing('median')}
                          disabled={noMissing}
                          className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-800 w-full justify-start"
                        >
                          Fill with Median
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{noMissing ? 'No missing values found — option disabled' : 'Fill missing numeric values with column median'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFillMissing('mode')}
                          disabled={noMissing}
                          className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-800 w-full justify-start"
                        >
                          Fill with Mode
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{noMissing ? 'No missing values found — option disabled' : 'Fill missing numeric values with column mode'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/* Visible hint text for disabled state */}
              {noMissing && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                  All columns have complete data — no missing values to handle
                </p>
              )}
            </div>

            <div className="border-t dark:border-slate-700" />

            {/* Duplicate Handling */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Copy className="size-4 text-amber-500 shrink-0" />
                Handle Duplicates
              </h4>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveDuplicates}
                        disabled={noDuplicates}
                        className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-800"
                      >
                        <Trash2 className="size-3.5 mr-1.5 shrink-0" />
                        Remove Duplicate Rows
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{noDuplicates ? 'No duplicate rows found — option disabled' : `Remove ${duplicateResult?.duplicateCount} duplicate row(s)`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {noDuplicates && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                  All rows are unique — no duplicates to remove
                </p>
              )}
            </div>

            {/* Cleaning Message */}
            {cleaningMessage && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0" />
                {cleaningMessage}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Outlier Detection (IQR) ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-lg">Outlier Detection (IQR)</CardTitle>
          </div>
          <CardDescription>
            Select a numeric column to detect outliers using the Interquartile Range method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Column Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Numeric Column:
              </label>
              <Select
                value={selectedOutlierCol}
                onValueChange={setSelectedOutlierCol}
              >
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Select a column..." />
                </SelectTrigger>
                <SelectContent>
                  {numericCols.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {outlierResult && (
              <>
                {/* IQR Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="rounded-lg border dark:border-slate-700 bg-muted/30 dark:bg-slate-800/50 p-2.5 sm:p-3 min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Lower Bound</p>
                    <p className="text-sm sm:text-lg font-bold text-amber-600 dark:text-amber-400 truncate">
                      {outlierResult.lowerBound.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border dark:border-slate-700 bg-muted/30 dark:bg-slate-800/50 p-2.5 sm:p-3 min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Upper Bound</p>
                    <p className="text-sm sm:text-lg font-bold text-amber-600 dark:text-amber-400 truncate">
                      {outlierResult.upperBound.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border dark:border-slate-700 bg-muted/30 dark:bg-slate-800/50 p-2.5 sm:p-3 min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">IQR</p>
                    <p className="text-sm sm:text-lg font-bold text-foreground truncate">
                      {(outlierResult.q3 - outlierResult.q1).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border dark:border-slate-700 bg-muted/30 dark:bg-slate-800/50 p-2.5 sm:p-3 min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Outliers Found</p>
                    <p className={`text-sm sm:text-lg font-bold truncate ${outlierResult.outliers.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {outlierResult.outliers.length}
                    </p>
                  </div>
                </div>

                {/* Five-Number Summary */}
                <div className="rounded-lg border dark:border-slate-700 p-3 sm:p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <TableProperties className="size-4 shrink-0" />
                    Five-Number Summary
                  </h4>
                  <div className="flex items-center justify-between text-sm gap-1 sm:gap-2 overflow-x-auto">
                    <div className="text-center min-w-[3rem]">
                      <p className="font-bold text-foreground text-xs sm:text-sm">{outlierResult.min.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Min</p>
                    </div>
                    <ArrowUp className="size-3 text-muted-foreground rotate-90 shrink-0" />
                    <div className="text-center min-w-[3rem]">
                      <p className="font-bold text-foreground text-xs sm:text-sm">{outlierResult.q1.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Q1</p>
                    </div>
                    <ArrowUp className="size-3 text-muted-foreground rotate-90 shrink-0" />
                    <div className="text-center min-w-[3rem]">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">{outlierResult.q2.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Median</p>
                    </div>
                    <ArrowUp className="size-3 text-muted-foreground rotate-90 shrink-0" />
                    <div className="text-center min-w-[3rem]">
                      <p className="font-bold text-foreground text-xs sm:text-sm">{outlierResult.q3.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Q3</p>
                    </div>
                    <ArrowUp className="size-3 text-muted-foreground rotate-90 shrink-0" />
                    <div className="text-center min-w-[3rem]">
                      <p className="font-bold text-foreground text-xs sm:text-sm">{outlierResult.max.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Max</p>
                    </div>
                  </div>
                </div>

                {/* Boxplot Visualization using BarChart */}
                <div className="rounded-lg border dark:border-slate-700 p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <BarChart3 className="size-4" />
                    Boxplot Visualization
                  </h4>
                  <div className="h-64">
                    <BarChart
                      data={fiveNumberData}
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="opacity-30" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={60}
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => [value.toFixed(4), 'Value']}
                        contentStyle={{
                          borderRadius: '8px',
                          fontSize: '12px',
                          border: '1px solid hsl(var(--border))',
                          backgroundColor: 'hsl(var(--card))',
                          color: 'hsl(var(--card-foreground))',
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={36}>
                        {fiveNumberData.map((entry, index) => {
                          let fill = '#10b981'; // emerald-500
                          if (entry.type === 'whisker') fill = '#6ee7b7'; // emerald-300
                          if (entry.type === 'median') fill = '#f59e0b'; // amber-500
                          if (entry.type === 'box') fill = '#34d399'; // emerald-400
                          return <Cell key={index} fill={fill} />;
                        })}
                      </Bar>
                      {outlierResult.lowerBound !== -Infinity && (
                        <ReferenceLine
                          x={outlierResult.lowerBound}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          label={{
                            value: 'Lower',
                            position: 'top',
                            fill: '#f59e0b',
                            fontSize: 10,
                          }}
                        />
                      )}
                      {outlierResult.upperBound !== Infinity && (
                        <ReferenceLine
                          x={outlierResult.upperBound}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          label={{
                            value: 'Upper',
                            position: 'top',
                            fill: '#f59e0b',
                            fontSize: 10,
                          }}
                        />
                      )}
                    </BarChart>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded-sm bg-emerald-300" />
                      Whiskers (Min/Max)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded-sm bg-emerald-400" />
                      Quartiles (Q1/Q3)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded-sm bg-amber-500" />
                      Median (Q2)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 border-t-2 border-dashed border-amber-500" />
                      IQR Bounds
                    </div>
                  </div>
                </div>

                {/* Outlier Values List */}
                {outlierResult.outliers.length > 0 && (
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4">
                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="size-4" />
                      Outlier Values ({outlierResult.outliers.length} detected)
                    </h4>
                    <ScrollArea className="max-h-40">
                      <div className="flex flex-wrap gap-2">
                        {outlierResult.outliers.map((val, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                          >
                            Row {outlierResult.indices[idx] + 1}: {typeof val === 'number' ? val.toFixed(4) : val}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {outlierResult.outliers.length === 0 && (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-4 shrink-0" />
                    No outliers detected in this column.
                  </div>
                )}
              </>
            )}

            {!selectedOutlierCol && numericCols.length > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 dark:bg-slate-800/50 border dark:border-slate-700 px-3 py-4 text-sm text-muted-foreground justify-center">
                <Info className="size-4 shrink-0" />
                Select a numeric column to detect outliers
              </div>
            )}

            {numericCols.length === 0 && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 dark:bg-slate-800/50 border dark:border-slate-700 px-3 py-4 text-sm text-muted-foreground justify-center">
                <Info className="size-4 shrink-0" />
                No numeric columns available for outlier detection
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Data Transformation ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-lg">Data Transformation</CardTitle>
          </div>
          <CardDescription>
            Apply mathematical transformations to numeric columns, creating new columns with the result
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {/* Transform Message */}
            {transformMessage && (
              <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm border ${
                transformMessage.includes('already exists') || transformMessage.includes('Cannot')
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              }`}>
                {transformMessage.includes('already exists') || transformMessage.includes('Cannot') ? (
                  <AlertTriangle className="size-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="size-4 shrink-0" />
                )}
                {transformMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Log Transform */}
              <div className="rounded-lg border-2 border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-md bg-teal-100 dark:bg-teal-900/50">
                    <Zap className="size-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Log Transform</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Apply log₁₀ transformation. Use for right-skewed data to normalize distribution. Requires positive values (&gt; 0).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedLogCol} onValueChange={setSelectedLogCol}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {numericCols.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleLogTransform}
                    disabled={!selectedLogCol}
                    className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                  >
                    Transform
                  </Button>
                </div>
                {selectedLogCol && (
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    <Info className="size-3 shrink-0" />
                    New column: <span className="font-mono font-medium">{selectedLogCol}_log</span>
                  </p>
                )}
              </div>

              {/* Z-Score Standardization */}
              <div className="rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-md bg-amber-100 dark:bg-amber-900/50">
                    <Ruler className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Standardization (Z-Score)</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Transform to mean = 0, std = 1. Use to compare variables on different scales or for algorithms assuming normality.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedZscoreCol} onValueChange={setSelectedZscoreCol}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {numericCols.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleZScoreTransform}
                    disabled={!selectedZscoreCol}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                  >
                    Transform
                  </Button>
                </div>
                {selectedZscoreCol && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Info className="size-3 shrink-0" />
                    New column: <span className="font-mono font-medium">{selectedZscoreCol}_zscore</span>
                  </p>
                )}
              </div>

              {/* Min-Max Normalization */}
              <div className="rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-md bg-emerald-100 dark:bg-emerald-900/50">
                    <Scaling className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Min-Max Normalization</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Scale values to [0, 1] range. Use when you need bounded values or for neural network inputs.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedNormCol} onValueChange={setSelectedNormCol}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {numericCols.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleMinMaxNormalize}
                    disabled={!selectedNormCol}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    Transform
                  </Button>
                </div>
                {selectedNormCol && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Info className="size-3 shrink-0" />
                    New column: <span className="font-mono font-medium">{selectedNormCol}_norm</span>
                  </p>
                )}
              </div>

              {/* Square Root Transform */}
              <div className="rounded-lg border-2 border-rose-200 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-md bg-rose-100 dark:bg-rose-900/50">
                    <SquareRadical className="size-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Square Root Transform</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Apply √ transformation. A milder alternative to log for reducing right skew. Requires non-negative values (≥ 0).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedSqrtCol} onValueChange={setSelectedSqrtCol}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {numericCols.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleSqrtTransform}
                    disabled={!selectedSqrtCol}
                    className="bg-rose-600 hover:bg-rose-700 text-white shrink-0"
                  >
                    Transform
                  </Button>
                </div>
                {selectedSqrtCol && (
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <Info className="size-3 shrink-0" />
                    New column: <span className="font-mono font-medium">{selectedSqrtCol}_sqrt</span>
                  </p>
                )}
              </div>
            </div>

            {/* No numeric columns warning */}
            {numericCols.length === 0 && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 dark:bg-slate-800/50 border dark:border-slate-700 px-3 py-4 text-sm text-muted-foreground justify-center">
                <Info className="size-4 shrink-0" />
                No numeric columns available for transformation
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
