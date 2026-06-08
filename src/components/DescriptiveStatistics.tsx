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
} from 'lucide-react';
import { useDataset } from '@/hooks/useDataset';
import {
  computeColumnSummary,
  histogramData,
  detectOutliersIQR,
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

function formatNumber(val: number, decimals = 4): string {
  if (Number.isNaN(val) || !Number.isFinite(val)) return 'N/A';
  return val.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
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
    <div className="w-full">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
        className="w-full"
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

  // Histogram data
  const histData = useMemo(() => {
    if (!activeNumericCol || !dataset) return [];
    const data = getColumnData(activeNumericCol);
    if (data.length === 0) return [];
    return histogramData(data);
  }, [activeNumericCol, dataset, getColumnData]);

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

  const summaryRows = summary
    ? [
        { label: 'Count', value: formatNumber(summary.count, 0), icon: <Hash className="h-4 w-4 text-teal-600" /> },
        { label: 'Mean', value: formatNumber(summary.mean), icon: <TrendingUp className="h-4 w-4 text-emerald-600" /> },
        { label: 'Median', value: formatNumber(summary.median), icon: <TrendingUp className="h-4 w-4 text-cyan-600" /> },
        { label: 'Mode', value: summary.mode.length > 0 ? summary.mode.map((m) => formatNumber(m)).join(', ') : 'None', icon: <BarChart3 className="h-4 w-4 text-amber-600" /> },
        { label: 'Std Dev', value: formatNumber(summary.stdDev), icon: <TrendingUp className="h-4 w-4 text-orange-600" /> },
        { label: 'Variance', value: formatNumber(summary.variance), icon: <TrendingUp className="h-4 w-4 text-rose-600" /> },
        { label: 'Min', value: formatNumber(summary.min), icon: <TrendingUp className="h-4 w-4 text-lime-600" /> },
        { label: 'Max', value: formatNumber(summary.max), icon: <TrendingUp className="h-4 w-4 text-pink-600" /> },
        { label: 'Range', value: formatNumber(summary.range), icon: <TrendingUp className="h-4 w-4 text-teal-600" /> },
        { label: 'Q1 (25th)', value: formatNumber(summary.q1), icon: <BoxSelect className="h-4 w-4 text-emerald-600" /> },
        { label: 'Q3 (75th)', value: formatNumber(summary.q3), icon: <BoxSelect className="h-4 w-4 text-cyan-600" /> },
        { label: 'IQR', value: formatNumber(summary.iqr), icon: <BoxSelect className="h-4 w-4 text-amber-600" /> },
        { label: 'Skewness', value: formatNumber(summary.skewness), icon: <TrendingUp className="h-4 w-4 text-orange-600" /> },
        { label: 'Kurtosis', value: formatNumber(summary.kurtosis), icon: <TrendingUp className="h-4 w-4 text-rose-600" /> },
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
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Numeric Column
              </label>
              <Select
                value={activeNumericCol}
                onValueChange={setSelectedNumericCol}
              >
                <SelectTrigger className="w-[220px]">
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
            {categoricalColumns.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Categorical Column
                </label>
                <Select
                  value={activeCategoricalCol}
                  onValueChange={setSelectedCategoricalCol}
                >
                  <SelectTrigger className="w-[220px]">
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

      {/* Summary Measures Table */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-teal-600 shrink-0" />
              Summary Measures &mdash; {summary.name}
            </CardTitle>
            <CardDescription>
              Central tendency, dispersion, and shape statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96 custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Measure</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryRows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {row.icon}
                          {row.label}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{row.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
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
              <div className="h-[280px] sm:h-[320px] w-full">
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
            <div className="h-[300px] sm:h-[360px] w-full">
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
    </div>
  );
}
