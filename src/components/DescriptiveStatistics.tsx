'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  BarChart3,
  BoxSelect,
  Hash,
  TrendingUp,
  AlertTriangle,
  GitCompare,
  Activity,
  ShieldCheck,
  Info,
  AudioWaveform,
} from 'lucide-react';
import { useDataset } from '@/hooks/useDataset';
import {
  computeColumnSummary,
  histogramData,
  detectOutliersIQR,
  correlation,
  confidenceIntervalMean,
  type ColumnSummary,
} from '@/lib/statistics';

// Teal/emerald color palette
const COLORS = {
  teal: '#14b8a6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  orange: '#f97316',
  cyan: '#06b6d4',
  lime: '#84cc16',
  pink: '#ec4899',
};

const BAR_COLORS = [
  '#14b8a6',
  '#10b981',
  '#06b6d4',
  '#f59e0b',
  '#f97316',
  '#ec4899',
  '#84cc16',
  '#f43f5e',
];

// Category config for stat cards
const STAT_CATEGORIES = {
  centralTendency: {
    label: 'Central Tendency',
    gradient: 'from-teal-50/80 to-teal-100/40 dark:from-teal-900/20 dark:to-teal-800/10',
    border: 'border-l-teal-500',
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  dispersion: {
    label: 'Dispersion',
    gradient: 'from-amber-50/80 to-amber-100/40 dark:from-amber-900/20 dark:to-amber-800/10',
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  position: {
    label: 'Position',
    gradient: 'from-cyan-50/80 to-cyan-100/40 dark:from-cyan-900/20 dark:to-cyan-800/10',
    border: 'border-l-cyan-500',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  shape: {
    label: 'Shape',
    gradient: 'from-rose-50/80 to-rose-100/40 dark:from-rose-900/20 dark:to-rose-800/10',
    border: 'border-l-rose-500',
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
} as const;

type CategoryKey = keyof typeof STAT_CATEGORIES;

function formatNumber(val: number, decimals = 4): string {
  if (Number.isNaN(val) || !Number.isFinite(val)) return 'N/A';
  return val.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

// Distribution shape classifier
type DistributionShape = 'Normal' | 'Right-Skewed' | 'Left-Skewed' | 'Uniform';

function classifyDistribution(skewness: number, kurtosis: number): DistributionShape {
  // Uniform: very low kurtosis (platykurtic, kurtosis << 3 for excess kurtosis << 0)
  // Our kurtosis is excess kurtosis (centered on 0 for normal)
  if (Math.abs(kurtosis) < 0.5 && Math.abs(skewness) < 0.3) {
    // Check for very flat distribution (low excess kurtosis)
    if (kurtosis < -1) return 'Uniform';
  }
  if (kurtosis < -1.2 && Math.abs(skewness) < 0.5) return 'Uniform';
  if (Math.abs(skewness) < 0.5) return 'Normal';
  if (skewness >= 0.5) return 'Right-Skewed';
  if (skewness <= -0.5) return 'Left-Skewed';
  return 'Normal';
}

const SHAPE_CONFIG: Record<DistributionShape, { color: string; bgClass: string; textClass: string; badgeClass: string; svgColor: string }> = {
  Normal: {
    color: '#10b981',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/10',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    svgColor: '#10b981',
  },
  'Right-Skewed': {
    color: '#f59e0b',
    bgClass: 'bg-amber-50 dark:bg-amber-900/10',
    textClass: 'text-amber-700 dark:text-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    svgColor: '#f59e0b',
  },
  'Left-Skewed': {
    color: '#f43f5e',
    bgClass: 'bg-rose-50 dark:bg-rose-900/10',
    textClass: 'text-rose-700 dark:text-rose-400',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    svgColor: '#f43f5e',
  },
  Uniform: {
    color: '#64748b',
    bgClass: 'bg-slate-50 dark:bg-slate-800/30',
    textClass: 'text-slate-700 dark:text-slate-300',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300',
    svgColor: '#64748b',
  },
};

// Mini SVG bell curve component
function DistributionCurveSVG({ shape, color }: { shape: DistributionShape; color: string }) {
  const w = 200;
  const h = 80;
  const padX = 10;
  const padY = 10;
  const plotW = w - 2 * padX;
  const plotH = h - 2 * padY;

  // Generate curve points based on shape
  const points: string[] = [];
  const steps = 60;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 to 1
    const x = padX + t * plotW;

    let y: number;
    if (shape === 'Normal') {
      // Symmetric bell curve
      const z = (t - 0.5) * 6; // -3 to 3
      y = Math.exp(-0.5 * z * z);
    } else if (shape === 'Right-Skewed') {
      // Log-normal-like shape: peak shifted left, long right tail
      const z = (t - 0.25) * 4;
      y = t < 0.05 ? 0.01 : Math.exp(-0.5 * z * z) * (1 + 0.3 * Math.max(0, t - 0.5));
    } else if (shape === 'Left-Skewed') {
      // Reverse of right-skewed
      const z = (t - 0.75) * 4;
      y = t > 0.95 ? 0.01 : Math.exp(-0.5 * z * z) * (1 + 0.3 * Math.max(0, 0.5 - t));
    } else {
      // Uniform: relatively flat
      y = 0.6 + 0.1 * Math.sin(t * Math.PI * 4);
    }

    const py = padY + plotH - y * plotH * 0.9;
    points.push(`${x.toFixed(1)},${py.toFixed(1)}`);
  }

  // Build path: move to first point, then line through all, then close at bottom
  const linePath = `M ${points[0]} ${points.slice(1).map((p) => `L ${p}`).join(' ')}`;
  // Fill path: same line path + close along bottom
  const fillPath = `${linePath} L ${(padX + plotW).toFixed(1)},${(padY + plotH).toFixed(1)} L ${padX.toFixed(1)},${(padY + plotH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[200px]" role="img" aria-label={`${shape} distribution curve`}>
      <path d={fillPath} fill={color} fillOpacity={0.15} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Baseline */}
      <line x1={padX} y1={padY + plotH} x2={padX + plotW} y2={padY + plotH} stroke={color} strokeWidth={1} strokeOpacity={0.3} />
    </svg>
  );
}

// Percentile helper function
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (idx - lower) * (sorted[upper] - sorted[lower]);
}

// Custom SVG Violin Plot component
function ViolinPlotChart({ summary, columnData }: { summary: ColumnSummary; columnData: number[] }) {
  const { min, max, q1, q3, median: med } = summary;

  const chartWidth = 500;
  const chartHeight = 240;
  const padding = 60;
  const plotLeft = padding;
  const plotRight = chartWidth - padding;
  const plotWidth = plotRight - plotLeft;
  const centerY = chartHeight / 2 - 10;
  const maxHalfWidth = 50;

  const dataMin = min;
  const dataMax = max;
  const dataRange = dataMax - dataMin || 1;

  const scale = (val: number) => plotLeft + ((val - dataMin) / dataRange) * plotWidth;

  // Compute density using histogram bins
  const bins = histogramData(columnData);
  const maxFreq = Math.max(...bins.map((b) => b.frequency), 1);

  // Build violin shape points (top half, then bottom half mirrored)
  const topPoints: string[] = [];
  const bottomPoints: string[] = [];

  bins.forEach((bin) => {
    const x = scale(bin.midpoint);
    const halfW = (bin.frequency / maxFreq) * maxHalfWidth;
    topPoints.push(`${x.toFixed(1)},${(centerY - halfW).toFixed(1)}`);
    bottomPoints.push(`${x.toFixed(1)},${(centerY + halfW).toFixed(1)}`);
  });

  // If we have bins, build the path
  if (topPoints.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        Insufficient data for violin plot
      </div>
    );
  }

  // Violin outline path: start from left top, go right, then bottom right to left, close
  const bottomReversed = [...bottomPoints].reverse();
  const violinPath = `M ${topPoints[0]} ${topPoints.slice(1).map((p) => `L ${p}`).join(' ')} L ${bottomReversed[0]} ${bottomReversed.slice(1).map((p) => `L ${p}`).join(' ')} Z`;

  const xQ1 = scale(q1);
  const xQ3 = scale(q3);
  const xMedian = scale(med);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`}
        className="w-full min-w-[300px]"
        role="img"
        aria-label={`Violin plot for ${summary.name}`}
      >
        {/* X-axis line */}
        <line
          x1={plotLeft}
          y1={chartHeight - 30}
          x2={plotRight}
          y2={chartHeight - 30}
          className="stroke-muted-foreground"
          strokeWidth={1}
        />

        {/* X-axis ticks */}
        {[dataMin, q1, med, q3, dataMax].map((val, i) => (
          <g key={i}>
            <line
              x1={scale(val)}
              y1={chartHeight - 34}
              x2={scale(val)}
              y2={chartHeight - 26}
              className="stroke-muted-foreground"
              strokeWidth={1}
            />
            <text
              x={scale(val)}
              y={chartHeight - 15}
              textAnchor="middle"
              fontSize={10}
              className="fill-muted-foreground"
            >
              {formatNumber(val, 2)}
            </text>
          </g>
        ))}

        {/* X-axis label */}
        <text
          x={chartWidth / 2}
          y={chartHeight + 15}
          textAnchor="middle"
          fontSize={12}
          className="fill-muted-foreground"
        >
          Value
        </text>

        {/* Center line */}
        <line
          x1={plotLeft}
          y1={centerY}
          x2={plotRight}
          y2={centerY}
          stroke={COLORS.teal}
          strokeWidth={1}
          strokeOpacity={0.3}
        />

        {/* Violin shape */}
        <path
          d={violinPath}
          fill={COLORS.teal}
          fillOpacity={0.2}
          stroke={COLORS.teal}
          strokeWidth={2}
        />

        {/* IQR bar (thin rectangle inside violin) */}
        <rect
          x={xQ1}
          y={centerY - 4}
          width={Math.max(xQ3 - xQ1, 1)}
          height={8}
          fill={COLORS.teal}
          fillOpacity={0.5}
          rx={2}
        />

        {/* Q1 marker */}
        <line
          x1={xQ1}
          y1={centerY - 12}
          x2={xQ1}
          y2={centerY + 12}
          stroke={COLORS.teal}
          strokeWidth={2}
          strokeDasharray="3,2"
        />

        {/* Q3 marker */}
        <line
          x1={xQ3}
          y1={centerY - 12}
          x2={xQ3}
          y2={centerY + 12}
          stroke={COLORS.teal}
          strokeWidth={2}
          strokeDasharray="3,2"
        />

        {/* Median dot */}
        <circle
          cx={xMedian}
          cy={centerY}
          r={5}
          fill={COLORS.emerald}
          stroke="white"
          strokeWidth={2}
        />

        {/* Labels */}
        <text x={xQ1} y={centerY - 16} textAnchor="middle" fontSize={9} fill={COLORS.teal} fontWeight={600}>
          Q1
        </text>
        <text x={xMedian} y={centerY - 18} textAnchor="middle" fontSize={9} fill={COLORS.emerald} fontWeight={600}>
          Med
        </text>
        <text x={xQ3} y={centerY - 16} textAnchor="middle" fontSize={9} fill={COLORS.teal} fontWeight={600}>
          Q3
        </text>
      </svg>
    </div>
  );
}

// Custom SVG Boxplot component
function BoxplotChart({ summary, outliers }: { summary: ColumnSummary; outliers: number[] }) {
  const { min, max, q1, q3, median: med, iqr: iqrVal } = summary;
  const lowerFence = q1 - 1.5 * iqrVal;
  const upperFence = q3 + 1.5 * iqrVal;

  // Compute unique outlier values with their counts for display
  const outlierCounts = new Map<number, number>();
  outliers.forEach((v) => {
    outlierCounts.set(v, (outlierCounts.get(v) || 0) + 1);
  });
  const uniqueOutliers = Array.from(outlierCounts.entries()).map(([val, count]) => ({
    val,
    count,
  }));

  // Scale function
  const padding = 60;
  const chartWidth = 500;
  const chartHeight = 200;
  const plotLeft = padding;
  const plotRight = chartWidth - padding;
  const plotWidth = plotRight - plotLeft;
  const center = chartHeight / 2;
  const boxHalfHeight = 30;
  const whiskerHalfHeight = 15;

  const dataMin = Math.min(min, ...outliers);
  const dataMax = Math.max(max, ...outliers);
  const range = dataMax - dataMin || 1;

  const scale = (val: number) => plotLeft + ((val - dataMin) / range) * plotWidth;

  const xQ1 = scale(q1);
  const xQ3 = scale(q3);
  const xMedian = scale(med);
  const xMin = scale(Math.max(min, lowerFence));
  const xMax = scale(Math.min(max, upperFence));

  // Outlier positions
  const outlierPoints = uniqueOutliers.map(({ val, count }) => ({
    x: scale(val),
    count,
    val,
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
        className="w-full min-w-[300px]"
        role="img"
        aria-label={`Boxplot for ${summary.name}: Min=${formatNumber(min)}, Q1=${formatNumber(q1)}, Median=${formatNumber(med)}, Q3=${formatNumber(q3)}, Max=${formatNumber(max)}`}
      >
        {/* Y-axis label */}
        <text
          x={20}
          y={center + 5}
          textAnchor="middle"
          fontSize={12}
          className="fill-muted-foreground"
          transform={`rotate(-90, 20, ${center})`}
        >
          {summary.name}
        </text>

        {/* X-axis line */}
        <line
          x1={plotLeft}
          y1={chartHeight - 20}
          x2={plotRight}
          y2={chartHeight - 20}
          className="stroke-muted-foreground"
          strokeWidth={1}
        />

        {/* X-axis ticks */}
        {[dataMin, q1, med, q3, dataMax].map((val, i) => (
          <g key={i}>
            <line
              x1={scale(val)}
              y1={chartHeight - 24}
              x2={scale(val)}
              y2={chartHeight - 16}
              className="stroke-muted-foreground"
              strokeWidth={1}
            />
            <text
              x={scale(val)}
              y={chartHeight - 5}
              textAnchor="middle"
              fontSize={10}
              className="fill-muted-foreground"
            >
              {formatNumber(val, 2)}
            </text>
          </g>
        ))}

        {/* X-axis label */}
        <text
          x={chartWidth / 2}
          y={chartHeight + 35}
          textAnchor="middle"
          fontSize={12}
          className="fill-muted-foreground"
        >
          Value
        </text>

        {/* Left whisker line */}
        <line
          x1={xMin}
          y1={center}
          x2={xQ1}
          y2={center}
          stroke={COLORS.teal}
          strokeWidth={2}
        />
        {/* Left whisker cap */}
        <line
          x1={xMin}
          y1={center - whiskerHalfHeight}
          x2={xMin}
          y2={center + whiskerHalfHeight}
          stroke={COLORS.teal}
          strokeWidth={2}
        />

        {/* Right whisker line */}
        <line
          x1={xQ3}
          y1={center}
          x2={xMax}
          y2={center}
          stroke={COLORS.teal}
          strokeWidth={2}
        />
        {/* Right whisker cap */}
        <line
          x1={xMax}
          y1={center - whiskerHalfHeight}
          x2={xMax}
          y2={center + whiskerHalfHeight}
          stroke={COLORS.teal}
          strokeWidth={2}
        />

        {/* IQR Box */}
        <rect
          x={xQ1}
          y={center - boxHalfHeight}
          width={xQ3 - xQ1}
          height={boxHalfHeight * 2}
          fill={COLORS.teal}
          fillOpacity={0.25}
          stroke={COLORS.teal}
          strokeWidth={2}
          rx={3}
        />

        {/* Median line */}
        <line
          x1={xMedian}
          y1={center - boxHalfHeight}
          x2={xMedian}
          y2={center + boxHalfHeight}
          stroke={COLORS.emerald}
          strokeWidth={3}
        />

        {/* Q1 label */}
        <text x={xQ1} y={center - boxHalfHeight - 8} textAnchor="middle" fontSize={10} fill={COLORS.teal} fontWeight={600}>
          Q1
        </text>
        {/* Median label */}
        <text x={xMedian} y={center - boxHalfHeight - 8} textAnchor="middle" fontSize={10} fill={COLORS.emerald} fontWeight={600}>
          Med
        </text>
        {/* Q3 label */}
        <text x={xQ3} y={center - boxHalfHeight - 8} textAnchor="middle" fontSize={10} fill={COLORS.teal} fontWeight={600}>
          Q3
        </text>

        {/* Outlier points */}
        {outlierPoints.map(({ x, count, val }, i) =>
          Array.from({ length: Math.min(count, 5) }).map((_, j) => (
            <circle
              key={`outlier-${i}-${j}`}
              cx={x + j * 4 - (Math.min(count, 5) - 1) * 2}
              cy={center + (j % 2 === 0 ? 0 : 6)}
              r={4}
              fill={COLORS.rose}
              stroke={COLORS.rose}
              fillOpacity={0.6}
              strokeWidth={1}
            >
              <title>{`Outlier: ${formatNumber(val)}`}</title>
            </circle>
          ))
        )}
      </svg>
    </div>
  );
}

export default function DescriptiveStatistics() {
  const { dataset, getNumericColumns, getColumnData, getCategoricalColumns, getCategoricalData } =
    useDataset();

  const numericColumns = useMemo(() => getNumericColumns(), [dataset, getNumericColumns]);
  const categoricalColumns = useMemo(() => getCategoricalColumns(), [dataset, getCategoricalColumns]);

  const [selectedNumericCol, setSelectedNumericCol] = useState<string>('');
  const [selectedCategoricalCol, setSelectedCategoricalCol] = useState<string>('');
  const [scatterXCol, setScatterXCol] = useState<string>('');
  const [scatterYCol, setScatterYCol] = useState<string>('');

  // Auto-select first numeric column
  const activeNumericCol =
    selectedNumericCol && numericColumns.includes(selectedNumericCol)
      ? selectedNumericCol
      : numericColumns[0] || '';

  // Auto-select first categorical column
  const activeCategoricalCol =
    selectedCategoricalCol && categoricalColumns.includes(selectedCategoricalCol)
      ? selectedCategoricalCol
      : categoricalColumns[0] || '';

  // Compute summary statistics for selected numeric column
  const summary: ColumnSummary | null = useMemo(() => {
    if (!activeNumericCol || !dataset) return null;
    const data = getColumnData(activeNumericCol);
    if (data.length === 0) return null;
    return computeColumnSummary(activeNumericCol, data);
  }, [activeNumericCol, dataset, getColumnData]);

  // Column data for selected numeric column (used by violin plot & histogram)
  const selectedColumnData = useMemo(() => {
    if (!activeNumericCol || !dataset) return [];
    return getColumnData(activeNumericCol);
  }, [activeNumericCol, dataset, getColumnData]);

  // Histogram data
  const histData = useMemo(() => {
    if (selectedColumnData.length === 0) return [];
    return histogramData(selectedColumnData);
  }, [selectedColumnData]);

  // Outlier data
  const outlierInfo = useMemo(() => {
    if (!activeNumericCol || !dataset) return { outliers: [], lowerBound: 0, upperBound: 0, indices: [] };
    const data = getColumnData(activeNumericCol);
    if (data.length === 0) return { outliers: [], lowerBound: 0, upperBound: 0, indices: [] };
    return detectOutliersIQR(data);
  }, [activeNumericCol, dataset, getColumnData]);

  // Categorical frequency data
  const categoricalFrequency = useMemo(() => {
    if (!activeCategoricalCol || !dataset) return [];
    const data = getCategoricalData(activeCategoricalCol);
    if (data.length === 0) return [];
    const freq = new Map<string, number>();
    data.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
    return Array.from(freq.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeCategoricalCol, dataset, getCategoricalData]);

  // Correlation matrix
  const correlationMatrix = useMemo(() => {
    if (numericColumns.length < 2) return { cols: [] as string[], matrix: [] as number[][] };
    const cols = numericColumns;
    const matrix: number[][] = [];
    const colDataMap = new Map<string, number[]>();
    cols.forEach((col) => colDataMap.set(col, getColumnData(col)));
    for (let i = 0; i < cols.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const xData = colDataMap.get(cols[i])!;
          const yData = colDataMap.get(cols[j])!;
          row.push(correlation(xData, yData));
        }
      }
      matrix.push(row);
    }
    return { cols, matrix };
  }, [numericColumns, dataset, getColumnData]);

  // Scatter plot data
  const activeScatterXCol =
    scatterXCol && numericColumns.includes(scatterXCol) ? scatterXCol : numericColumns[0] || '';
  const activeScatterYCol =
    scatterYCol && numericColumns.includes(scatterYCol) ? scatterYCol : numericColumns[1] || numericColumns[0] || '';

  const scatterData = useMemo(() => {
    if (!activeScatterXCol || !activeScatterYCol || !dataset) return [];
    const xData = getColumnData(activeScatterXCol);
    const yData = getColumnData(activeScatterYCol);
    const n = Math.min(xData.length, yData.length);
    return Array.from({ length: n }, (_, i) => ({
      x: xData[i],
      y: yData[i],
    }));
  }, [activeScatterXCol, activeScatterYCol, dataset, getColumnData]);

  // Correlation summary (strongest positive & negative)
  const correlationSummary = useMemo(() => {
    const { cols, matrix } = correlationMatrix;
    if (cols.length < 2) return null;
    let strongestPositive = { i: -1, j: -1, value: -Infinity };
    let strongestNegative = { i: -1, j: -1, value: Infinity };
    for (let i = 0; i < cols.length; i++) {
      for (let j = i + 1; j < cols.length; j++) {
        const val = matrix[i][j];
        if (val > strongestPositive.value) {
          strongestPositive = { i, j, value: val };
        }
        if (val < strongestNegative.value) {
          strongestNegative = { i, j, value: val };
        }
      }
    }
    return {
      strongestPositive: {
        col1: cols[strongestPositive.i],
        col2: cols[strongestPositive.j],
        value: strongestPositive.value,
      },
      strongestNegative: {
        col1: cols[strongestNegative.i],
        col2: cols[strongestNegative.j],
        value: strongestNegative.value,
      },
    };
  }, [correlationMatrix]);

  // Confidence intervals for each numeric column
  const confidenceIntervals = useMemo(() => {
    if (numericColumns.length === 0 || !dataset) return [];
    return numericColumns.map((col) => {
      const data = getColumnData(col);
      if (data.length < 2) {
        return { column: col, mean: NaN, lower: NaN, upper: NaN, marginOfError: NaN, standardError: NaN };
      }
      return { column: col, ...confidenceIntervalMean(data, 0.95) };
    });
  }, [numericColumns, dataset, getColumnData]);

  // All-column summary data for the overview table
  const allColumnSummaries = useMemo(() => {
    if (numericColumns.length === 0 || !dataset) return [];
    return numericColumns.map((col) => {
      const data = getColumnData(col);
      if (data.length === 0) {
        return { name: col, count: 0, mean: NaN, stdDev: NaN, min: NaN, median: NaN, max: NaN, skewness: NaN, kurtosis: NaN };
      }
      const s = computeColumnSummary(col, data);
      return {
        name: s.name,
        count: s.count,
        mean: s.mean,
        stdDev: s.stdDev,
        min: s.min,
        median: s.median,
        max: s.max,
        skewness: s.skewness,
        kurtosis: s.kurtosis,
      };
    });
  }, [numericColumns, dataset, getColumnData]);

  // Distribution shape classification for selected column
  const distributionShape = useMemo(() => {
    if (!summary) return null;
    return classifyDistribution(summary.skewness, summary.kurtosis);
  }, [summary]);

  // Compute global CI range for visual bars
  const ciGlobalRange = useMemo(() => {
    if (confidenceIntervals.length === 0) return { min: 0, max: 1 };
    const allVals = confidenceIntervals.flatMap((ci) =>
      Number.isFinite(ci.lower) && Number.isFinite(ci.upper) ? [ci.lower, ci.upper] : []
    );
    if (allVals.length === 0) return { min: 0, max: 1 };
    const ciMin = Math.min(...allVals);
    const ciMax = Math.max(...allVals);
    const pad = (ciMax - ciMin) * 0.1 || 1;
    return { min: ciMin - pad, max: ciMax + pad };
  }, [confidenceIntervals]);

  if (!dataset) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-teal-600" />
            Descriptive Statistics
          </CardTitle>
          <CardDescription>Upload a dataset to compute summary statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-3 opacity-40" />
            <p>No dataset loaded. Upload a CSV file to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (numericColumns.length === 0 && categoricalColumns.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-teal-600" />
            Descriptive Statistics
          </CardTitle>
          <CardDescription>No analyzable columns found in the dataset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-3 opacity-40" />
            <p>The dataset does not contain any numeric or categorical columns.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grouped summary rows with categories
  const summaryGroups: { category: CategoryKey; items: { label: string; value: string; icon: React.ReactNode }[] }[] = summary
    ? [
        {
          category: 'centralTendency',
          items: [
            { label: 'Count', value: formatNumber(summary.count, 0), icon: <Hash className="h-4 w-4" /> },
            { label: 'Mean', value: formatNumber(summary.mean), icon: <TrendingUp className="h-4 w-4" /> },
            { label: 'Median', value: formatNumber(summary.median), icon: <TrendingUp className="h-4 w-4" /> },
            { label: 'Mode', value: summary.mode.length > 0 ? summary.mode.map((m) => formatNumber(m)).join(', ') : 'None', icon: <BarChart3 className="h-4 w-4" /> },
          ],
        },
        {
          category: 'dispersion',
          items: [
            { label: 'Std Dev', value: formatNumber(summary.stdDev), icon: <Activity className="h-4 w-4" /> },
            { label: 'Variance', value: formatNumber(summary.variance), icon: <Activity className="h-4 w-4" /> },
            { label: 'Range', value: formatNumber(summary.range), icon: <Activity className="h-4 w-4" /> },
          ],
        },
        {
          category: 'position',
          items: [
            { label: 'Min', value: formatNumber(summary.min), icon: <BoxSelect className="h-4 w-4" /> },
            { label: 'Max', value: formatNumber(summary.max), icon: <BoxSelect className="h-4 w-4" /> },
            { label: 'Q1 (25th)', value: formatNumber(summary.q1), icon: <BoxSelect className="h-4 w-4" /> },
            { label: 'Q3 (75th)', value: formatNumber(summary.q3), icon: <BoxSelect className="h-4 w-4" /> },
            { label: 'IQR', value: formatNumber(summary.iqr), icon: <BoxSelect className="h-4 w-4" /> },
          ],
        },
        {
          category: 'shape',
          items: [
            { label: 'Skewness', value: formatNumber(summary.skewness), icon: <TrendingUp className="h-4 w-4" /> },
            { label: 'Kurtosis', value: formatNumber(summary.kurtosis), icon: <TrendingUp className="h-4 w-4" /> },
          ],
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Column Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-teal-600" />
            Descriptive Statistics
          </CardTitle>
          <CardDescription>
            Select a column to compute summary statistics and view visualizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Numeric Column Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap min-w-0">
                Numeric Column
              </label>
              <Select
                value={activeNumericCol}
                onValueChange={setSelectedNumericCol}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categorical Column Selector */}
            {categoricalColumns.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <label className="text-sm font-medium text-foreground whitespace-nowrap min-w-0">
                  Categorical Column
                </label>
                <Select
                  value={activeCategoricalCol}
                  onValueChange={setSelectedCategoricalCol}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoricalColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Info Badges */}
            {summary && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                  {summary.count} values
                </Badge>
                {summary.missing > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {summary.missing} missing
                  </Badge>
                )}
                {outlierInfo.outliers.length > 0 && (
                  <Badge variant="secondary" className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                    {outlierInfo.outliers.length} outlier{outlierInfo.outliers.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Summary Measures - Grouped by Category */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-teal-600 shrink-0" />
              Summary Measures &mdash; {summary.name}
            </CardTitle>
            <CardDescription>
              Central tendency, dispersion, position, and shape statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {summaryGroups.map((group) => {
                const catConfig = STAT_CATEGORIES[group.category];
                return (
                  <div key={group.category}>
                    {/* Category Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${catConfig.iconBg}`}>
                        <span className={`text-sm font-bold ${catConfig.iconColor}`}>
                          {group.category === 'centralTendency' ? 'μ' : group.category === 'dispersion' ? 'σ' : group.category === 'position' ? 'Q' : 'S'}
                        </span>
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">{catConfig.label}</h4>
                      <div className="flex-1 h-px bg-border mt-1" />
                    </div>
                    {/* Stat Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {group.items.map((row) => (
                        <div
                          key={row.label}
                          className={`rounded-lg border border-l-4 ${catConfig.border} bg-gradient-to-br ${catConfig.gradient} p-3 min-w-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-default`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={catConfig.iconColor}>{row.icon}</span>
                            <span className="text-xs text-muted-foreground truncate">{row.label}</span>
                          </div>
                          <p className="text-sm font-semibold font-mono truncate" title={row.value}>
                            {row.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Interpretation Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-teal-600 shrink-0" />
              Quick Interpretation
            </CardTitle>
            <CardDescription>
              Plain-English summary of the selected column&apos;s statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border p-5 bg-gradient-to-br from-teal-50/80 to-emerald-50/40 dark:from-teal-900/15 dark:to-emerald-900/10">
              <p className="text-sm text-foreground leading-relaxed">
                The column <span className="font-semibold text-teal-700 dark:text-teal-400">{summary.name}</span> has{' '}
                <span className="font-semibold">{summary.count} values</span> with a mean of{' '}
                <span className="font-semibold font-mono">{formatNumber(summary.mean)}</span>{' '}
                (SD = {formatNumber(summary.stdDev)}).{' '}
                {distributionShape && (
                  <>
                    The distribution is{' '}
                    <span className="font-semibold">{distributionShape.toLowerCase()}</span>
                    {distributionShape === 'Normal' && ' (approximately symmetric)'}
                    {distributionShape === 'Right-Skewed' && ' (tail extends toward higher values)'}
                    {distributionShape === 'Left-Skewed' && ' (tail extends toward lower values)'}
                    {distributionShape === 'Uniform' && ' (relatively flat across the range)'}
                    .{' '}
                  </>
                )}
                {outlierInfo.outliers.length > 0 ? (
                  <>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{outlierInfo.outliers.length} outlier{outlierInfo.outliers.length !== 1 ? 's' : ''}</span>{' '}
                    detected using the IQR method.
                  </>
                ) : (
                  'No outliers detected using the IQR method.'
                )}{' '}
                The data ranges from {formatNumber(summary.min)} to {formatNumber(summary.max)}{' '}
                (range = {formatNumber(summary.range)}).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Shape Indicator Card */}
      {summary && distributionShape && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-teal-600 shrink-0" />
              Distribution Shape &mdash; {summary.name}
            </CardTitle>
            <CardDescription>
              Classification based on skewness and kurtosis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`rounded-xl border p-5 ${SHAPE_CONFIG[distributionShape].bgClass}`}>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Mini SVG bell curve */}
                <div className="shrink-0">
                  <DistributionCurveSVG
                    shape={distributionShape}
                    color={SHAPE_CONFIG[distributionShape].svgColor}
                  />
                </div>
                {/* Classification info */}
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                    <Badge className={SHAPE_CONFIG[distributionShape].badgeClass}>
                      {distributionShape}
                    </Badge>
                  </div>
                  <p className={`text-sm ${SHAPE_CONFIG[distributionShape].textClass}`}>
                    The distribution appears{' '}
                    <span className="font-semibold">{distributionShape.toLowerCase()}</span>{' '}
                    (skewness = {formatNumber(summary.skewness)}, kurtosis = {formatNumber(summary.kurtosis)})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {distributionShape === 'Normal' && 'Data is approximately symmetric with moderate peakedness, similar to a Gaussian bell curve.'}
                    {distributionShape === 'Right-Skewed' && 'The right tail is longer than the left. The mean is typically greater than the median, suggesting a few high values pull the distribution.'}
                    {distributionShape === 'Left-Skewed' && 'The left tail is longer than the right. The mean is typically less than the median, suggesting a few low values pull the distribution.'}
                    {distributionShape === 'Uniform' && 'Values are relatively evenly distributed across the range with no clear peak, suggesting a flat distribution.'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Percentile Table Card */}
      {summary && selectedColumnData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-teal-600 shrink-0" />
              Percentile Table &mdash; {summary.name}
            </CardTitle>
            <CardDescription>
              Key percentiles showing data distribution at various thresholds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Percentile</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Label</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Value</th>
                    <th className="py-2 px-3 text-muted-foreground font-medium w-[40%]">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { p: 1, label: 'P1', name: '1st Percentile' },
                    { p: 5, label: 'P5', name: '5th Percentile' },
                    { p: 10, label: 'P10', name: '10th Percentile' },
                    { p: 25, label: 'Q1', name: '25th (Q1)' },
                    { p: 50, label: 'Median', name: '50th (Median)' },
                    { p: 75, label: 'Q3', name: '75th (Q3)' },
                    { p: 90, label: 'P90', name: '90th Percentile' },
                    { p: 95, label: 'P95', name: '95th Percentile' },
                    { p: 99, label: 'P99', name: '99th Percentile' },
                  ].map((item, idx) => {
                    const val = percentile(selectedColumnData, item.p);
                    const isQuartile = item.p === 25 || item.p === 50 || item.p === 75;
                    const progressPct = Number.isFinite(val) && summary.range > 0
                      ? ((val - summary.min) / summary.range) * 100
                      : 0;
                    return (
                      <tr
                        key={item.p}
                        className={`border-b last:border-b-0 transition-colors duration-200 hover:bg-muted/30 even:bg-muted/30 ${isQuartile ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''}`}
                      >
                        <td className="py-2 px-3 font-mono text-xs">{item.label}</td>
                        <td className="py-2 px-3 text-muted-foreground">{item.name}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          {formatNumber(val, 4)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="relative h-4 bg-muted/40 dark:bg-slate-800/50 rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 dark:from-teal-500 dark:to-emerald-500"
                              style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                            />
                            {isQuartile && (
                              <div
                                className="absolute top-0 h-full w-0.5 bg-emerald-600 dark:bg-emerald-400"
                                style={{ left: `${Math.max(0, Math.min(100, progressPct))}%` }}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histogram */}
        {histData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-teal-600 shrink-0" />
                Histogram
              </CardTitle>
              <CardDescription>
                Distribution of {activeNumericCol} values across bins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] sm:h-[320px] w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="midpoint"
                      label={{
                        value: `${activeNumericCol} (bin midpoint)`,
                        position: 'insideBottom',
                        offset: -15,
                        style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                      }}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val: number) =>
                        typeof val === 'number' ? formatNumber(val, 1) : val
                      }
                    />
                    <YAxis
                      label={{
                        value: 'Frequency',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 5,
                        style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                      }}
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, 'Frequency']}
                      labelFormatter={(label: number) =>
                        `Bin midpoint: ${formatNumber(label, 2)}`
                      }
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                        color: 'hsl(var(--card-foreground))',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                      {histData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Boxplot */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BoxSelect className="h-4 w-4 text-teal-600 shrink-0" />
                Boxplot
              </CardTitle>
              <CardDescription>
                Quartiles, whiskers, and outliers for {activeNumericCol}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] sm:h-[220px] w-full flex items-center justify-center">
                <BoxplotChart summary={summary} outliers={outlierInfo.outliers} />
              </div>
              <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground justify-center">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-teal-500/25 dark:bg-teal-500/25 border border-teal-500" />
                  IQR Box (Q1–Q3)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-emerald-600" />
                  Median
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-teal-500" />
                  Whiskers (1.5×IQR)
                </span>
                {outlierInfo.outliers.length > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                    Outlier
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Violin Plot */}
        {summary && selectedColumnData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AudioWaveform className="h-4 w-4 text-teal-600 shrink-0" />
                Violin Plot
              </CardTitle>
              <CardDescription>
                Density distribution with quartile markers for {activeNumericCol}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] sm:h-[240px] w-full flex items-center justify-center">
                <ViolinPlotChart summary={summary} columnData={selectedColumnData} />
              </div>
              <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground justify-center">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-teal-500/20 border border-teal-500" />
                  Density Shape
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-teal-500 opacity-50" />
                  IQR Range
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                  Median
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Categorical Bar Chart */}
      {categoricalFrequency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-amber-600 shrink-0" />
              Frequency Chart &mdash; {activeCategoricalCol}
            </CardTitle>
            <CardDescription>
              Value counts for each category in {activeCategoricalCol}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] sm:h-[360px] w-full overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoricalFrequency.slice(0, 20)}
                  margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    type="number"
                    label={{
                      value: 'Frequency (count)',
                      position: 'insideBottom',
                      offset: -15,
                      style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                    }}
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    label={{
                      value: activeCategoricalCol,
                      angle: -90,
                      position: 'insideLeft',
                      offset: 5,
                      style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                    }}
                    tick={{ fontSize: 11 }}
                    width={100}
                    tickFormatter={(val: string) =>
                      val.length > 15 ? val.substring(0, 15) + '…' : val
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => [value, 'Count']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--card-foreground))',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {categoricalFrequency.slice(0, 20).map((_, index) => (
                      <Cell
                        key={`cat-cell-${index}`}
                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {categoricalFrequency.length > 20 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Showing top 20 of {categoricalFrequency.length} categories
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Correlation Analysis */}
      {correlationMatrix.cols.length >= 2 && (
        <div className="space-y-6">
          {/* Correlation Matrix Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitCompare className="h-4 w-4 text-teal-600 shrink-0" />
                Correlation Matrix
              </CardTitle>
              <CardDescription>
                Pearson correlation coefficients between all numeric columns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-fit">
                  {/* Header row */}
                  <div className="flex">
                    <div className="w-24 shrink-0" />
                    {correlationMatrix.cols.map((col) => (
                      <div
                        key={`header-${col}`}
                        className="w-20 shrink-0 text-center text-xs font-medium text-muted-foreground truncate px-1"
                        title={col}
                      >
                        {col.length > 10 ? col.substring(0, 10) + '…' : col}
                      </div>
                    ))}
                  </div>
                  {/* Data rows */}
                  {correlationMatrix.matrix.map((row, i) => (
                    <div key={`row-${i}`} className="flex items-center">
                      <div
                        className="w-24 shrink-0 text-xs font-medium text-muted-foreground truncate pr-2 text-right"
                        title={correlationMatrix.cols[i]}
                      >
                        {correlationMatrix.cols[i].length > 12
                          ? correlationMatrix.cols[i].substring(0, 12) + '…'
                          : correlationMatrix.cols[i]}
                      </div>
                      {row.map((val, j) => {
                        const absVal = Math.abs(val);
                        let cellClass = '';
                        let textClass = '';
                        if (val > 0.7) {
                          cellClass = 'bg-emerald-500 dark:bg-emerald-600';
                          textClass = 'text-white';
                        } else if (val > 0.3) {
                          cellClass = 'bg-emerald-300 dark:bg-emerald-400';
                          textClass = 'text-emerald-900 dark:text-emerald-950';
                        } else if (val > -0.3) {
                          cellClass = 'bg-slate-200 dark:bg-slate-700';
                          textClass = 'text-slate-700 dark:text-slate-200';
                        } else if (val > -0.7) {
                          cellClass = 'bg-rose-300 dark:bg-rose-400';
                          textClass = 'text-rose-900 dark:text-rose-950';
                        } else {
                          cellClass = 'bg-rose-500 dark:bg-rose-600';
                          textClass = 'text-white';
                        }
                        return (
                          <div
                            key={`cell-${i}-${j}`}
                            className={`w-20 shrink-0 h-10 flex items-center justify-center text-xs font-mono font-semibold rounded-sm mx-0.5 my-0.5 ${cellClass} ${textClass}`}
                            title={`${correlationMatrix.cols[i]} × ${correlationMatrix.cols[j]}: ${formatNumber(val)}`}
                          >
                            {absVal >= 0.01 ? formatNumber(val, 2) : '0.00'}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground justify-center">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
                      Strong positive (&gt;0.7)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-emerald-300" />
                      Moderate positive (0.3–0.7)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700" />
                      Weak (−0.3 to 0.3)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-rose-300" />
                      Moderate negative (−0.7 to −0.3)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-rose-500" />
                      Strong negative (&lt;−0.7)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitCompare className="h-4 w-4 text-emerald-600 shrink-0" />
                Scatter Plot
              </CardTitle>
              <CardDescription>
                Visualize the relationship between two numeric columns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">X Axis</label>
                  <Select value={activeScatterXCol} onValueChange={setScatterXCol}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select X column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {numericColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">Y Axis</label>
                  <Select value={activeScatterYCol} onValueChange={setScatterYCol}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select Y column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {numericColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {activeScatterXCol && activeScatterYCol && activeScatterXCol !== activeScatterYCol && (
                  <Badge variant="secondary" className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 whitespace-nowrap">
                    r = {formatNumber(
                      correlation(getColumnData(activeScatterXCol), getColumnData(activeScatterYCol)),
                      3
                    )}
                  </Badge>
                )}
              </div>
              {scatterData.length > 0 ? (
                <div className="h-[320px] sm:h-[380px] w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={activeScatterXCol}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val: number) => formatNumber(val, 1)}
                        label={{
                          value: activeScatterXCol,
                          position: 'insideBottom',
                          offset: -10,
                          style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={activeScatterYCol}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val: number) => formatNumber(val, 1)}
                        label={{
                          value: activeScatterYCol,
                          angle: -90,
                          position: 'insideLeft',
                          offset: 5,
                          style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                        }}
                      />
                      <ZAxis range={[30, 30]} />
                      <Tooltip
                        formatter={(value: number, name: string) => [formatNumber(value, 3), name === 'x' ? activeScatterXCol : activeScatterYCol]}
                        labelFormatter={() => ''}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                          backgroundColor: 'hsl(var(--card))',
                          color: 'hsl(var(--card-foreground))',
                          fontSize: '12px',
                        }}
                      />
                      <Scatter
                        data={scatterData}
                        fill={COLORS.teal}
                        fillOpacity={0.7}
                        stroke={COLORS.emerald}
                        strokeWidth={1}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <GitCompare className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No data available for the selected columns.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Correlation Summary */}
          {correlationSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-teal-600 shrink-0" />
                  Correlation Summary
                </CardTitle>
                <CardDescription>
                  Strongest correlations found between column pairs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-900/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        Strongest Positive
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {correlationSummary.strongestPositive.col1} × {correlationSummary.strongestPositive.col2}
                    </p>
                    <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      r = {formatNumber(correlationSummary.strongestPositive.value, 4)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-rose-50/50 dark:bg-rose-900/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-rose-600 rotate-180" />
                      <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                        Strongest Negative
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {correlationSummary.strongestNegative.col1} × {correlationSummary.strongestNegative.col2}
                    </p>
                    <p className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                      r = {formatNumber(correlationSummary.strongestNegative.value, 4)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Confidence Intervals - Visual Horizontal Bars */}
      {confidenceIntervals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
                  Confidence Intervals for the Mean
                </CardTitle>
                <CardDescription>
                  Visual interval estimates for the population mean of each numeric column
                </CardDescription>
              </div>
              <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 text-xs">
                95% Confidence Level
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {confidenceIntervals.map((ci) => {
                if (!Number.isFinite(ci.lower) || !Number.isFinite(ci.upper) || !Number.isFinite(ci.mean)) {
                  return (
                    <div key={ci.column} className="flex items-center gap-3">
                      <div className="w-24 sm:w-32 shrink-0 text-sm font-medium truncate" title={ci.column}>
                        {ci.column}
                      </div>
                      <div className="flex-1 text-xs text-muted-foreground">Insufficient data</div>
                    </div>
                  );
                }

                const rangeSpan = ciGlobalRange.max - ciGlobalRange.min || 1;
                const toPercent = (val: number) => ((val - ciGlobalRange.min) / rangeSpan) * 100;

                const lowerPct = Math.max(0, Math.min(100, toPercent(ci.lower)));
                const upperPct = Math.max(0, Math.min(100, toPercent(ci.upper)));
                const meanPct = Math.max(0, Math.min(100, toPercent(ci.mean)));

                const barWidth = Math.max(upperPct - lowerPct, 1);

                return (
                  <div key={ci.column} className="flex items-center gap-3">
                    <div className="w-24 sm:w-32 shrink-0 text-sm font-medium truncate" title={ci.column}>
                      {ci.column}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="relative h-8 bg-muted/40 dark:bg-slate-800/50 rounded-md overflow-hidden">
                        {/* CI Bar */}
                        <div
                          className="absolute top-1 h-6 rounded-md bg-teal-400/70 dark:bg-teal-500/60"
                          style={{ left: `${lowerPct}%`, width: `${barWidth}%` }}
                        />
                        {/* Mean dot */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm z-10"
                          style={{ left: `calc(${meanPct}% - 6px)` }}
                          title={`Mean: ${formatNumber(ci.mean, 4)}`}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right min-w-[100px] sm:min-w-[130px]">
                      <div className="text-xs font-mono text-muted-foreground">
                        <span title="Lower bound">{formatNumber(ci.lower, 3)}</span>
                        {' – '}
                        <span title="Upper bound">{formatNumber(ci.upper, 3)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        MoE: ±{formatNumber(ci.marginOfError, 3)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground justify-center">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-2.5 rounded-sm bg-teal-400/70 dark:bg-teal-500/60" />
                95% CI Range
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                Sample Mean
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Shape Comparison — across all numeric columns */}
      {allColumnSummaries.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-teal-600 shrink-0" />
              Distribution Shape Comparison
            </CardTitle>
            <CardDescription>
              Compare distribution shapes across all numeric variables at a glance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allColumnSummaries.map((s) => {
                const shape = classifyDistribution(s.skewness, s.kurtosis);
                const shapeConfig = SHAPE_CONFIG[shape];
                return (
                  <div
                    key={s.name}
                    className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-md cursor-default ${
                      s.name === activeNumericCol ? 'ring-2 ring-teal-500/30 border-teal-300 dark:border-teal-700' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        <DistributionCurveSVG shape={shape} color={shapeConfig.svgColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                          <Badge className={`text-[9px] px-1.5 py-0 ${shapeConfig.badgeClass}`}>
                            {shape}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                          <span className="text-muted-foreground">Mean</span>
                          <span className="font-mono text-right">{formatNumber(s.mean)}</span>
                          <span className="text-muted-foreground">StdDev</span>
                          <span className="font-mono text-right">{formatNumber(s.stdDev)}</span>
                          <span className="text-muted-foreground">Skew</span>
                          <span className={`font-mono text-right ${Math.abs(s.skewness) > 0.5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {formatNumber(s.skewness)}
                          </span>
                          <span className="text-muted-foreground">Range</span>
                          <span className="font-mono text-right">{formatNumber(s.max - s.min)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All-Column Summary Table */}
      {allColumnSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-4 w-4 text-teal-600 shrink-0" />
              All-Column Summary Overview
            </CardTitle>
            <CardDescription>
              Quick overview of key statistics across all numeric variables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Column</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Mean</TableHead>
                    <TableHead className="text-right">StdDev</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Median</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">Skewness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allColumnSummaries.map((s) => {
                    const isSelected = s.name === activeNumericCol;
                    return (
                      <TableRow
                        key={s.name}
                        className={`transition-colors duration-200 hover:bg-muted/50 ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
                      >
                        <TableCell className={`font-medium ${isSelected ? 'text-teal-700 dark:text-teal-400' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            {isSelected && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                            )}
                            <span className="truncate" title={s.name}>{s.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(s.count, 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(s.mean)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(s.stdDev)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(s.min)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(s.median)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(s.max)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(s.skewness)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
