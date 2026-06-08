'use client'

import { useMemo, useState } from 'react'
import {
  shapiroWilkTest,
  ksNormalityTest,
  andersonDarlingTest,
  qqPlotData,
  fittedNormalCurve,
  histogramData,
  mean,
  standardDeviation,
  normalPDF,
  computeColumnSummary,
  skewness,
  kurtosis,
} from '@/lib/statistics'
import { useDataset } from '@/hooks/useDataset'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Scatter,
  ScatterChart,
  ReferenceLine,
  ComposedChart,
  Line,
} from 'recharts'
import {
  FlaskConical,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Columns3,
  Download,
  Info,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  XCircle,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react'
import { downloadAsFile, exportNumber } from '@/lib/export'

const testResultsChartConfig: ChartConfig = {
  frequency: {
    label: 'Frequency',
    color: '#14b8a6',
  },
  normalCurve: {
    label: 'Normal Curve',
    color: '#f97316',
  },
  theoretical: {
    label: 'Theoretical Quantiles',
    color: '#f97316',
  },
  sample: {
    label: 'Sample Quantiles',
    color: '#14b8a6',
  },
  fittedY: {
    label: 'Fitted Normal',
    color: '#f97316',
  },
}

export default function NormalityTesting() {
  const { dataset, getNumericColumns, getColumnData } = useDataset()
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [alpha, setAlpha] = useState<number>(0.05)

  const numericColumns = useMemo(() => {
    if (!dataset) return []
    return getNumericColumns()
  }, [dataset, getNumericColumns])

  const columnData = useMemo(() => {
    if (!selectedColumn) return []
    return getColumnData(selectedColumn)
  }, [selectedColumn, getColumnData])

  // Normality test results
  const shapiroWilkResult = useMemo(() => {
    if (columnData.length < 3) return null
    return shapiroWilkTest(columnData)
  }, [columnData])

  const ksResult = useMemo(() => {
    if (columnData.length < 2) return null
    return ksNormalityTest(columnData)
  }, [columnData])

  const adResult = useMemo(() => {
    if (columnData.length < 2) return null
    return andersonDarlingTest(columnData)
  }, [columnData])

  // Column summary for skewness/kurtosis
  const columnSummary = useMemo(() => {
    if (columnData.length < 3) return null
    return computeColumnSummary(selectedColumn, columnData)
  }, [selectedColumn, columnData])

  // Skewness and kurtosis values
  const skewVal = useMemo(() => {
    if (columnData.length < 3) return null
    return skewness(columnData)
  }, [columnData])

  const kurtVal = useMemo(() => {
    if (columnData.length < 4) return null
    return kurtosis(columnData)
  }, [columnData])

  // Q-Q plot data
  const qqData = useMemo(() => {
    if (columnData.length < 2) return []
    return qqPlotData(columnData)
  }, [columnData])

  // Histogram data
  const histData = useMemo(() => {
    if (columnData.length < 2) return []
    return histogramData(columnData)
  }, [columnData])

  // Fitted normal curve data
  const fittedCurve = useMemo(() => {
    if (columnData.length < 2) return []
    return fittedNormalCurve(columnData)
  }, [columnData])

  // Combined histogram + normal curve overlay data
  const histogramWithCurveData = useMemo(() => {
    if (histData.length === 0 || fittedCurve.length === 0) return []
    const m = mean(columnData)
    const sd = standardDeviation(columnData)
    const n = columnData.length
    // Calculate bin width from histogram
    const binWidth = histData.length > 0
      ? histData[0].binEnd - histData[0].binStart
      : 1

    return histData.map((bin) => {
      const curveY = normalPDF(bin.midpoint, m, sd) * n * binWidth
      return {
        binLabel: `${bin.midpoint.toFixed(1)}`,
        frequency: bin.frequency,
        normalCurve: Math.round(curveY * 100) / 100,
      }
    })
  }, [histData, fittedCurve, columnData])

  // Summary table data - now uses alpha state
  const summaryTableData = useMemo(() => {
    const rows: {
      testName: string
      statistic: number | string
      pValue: number | string
      conclusion: string
      reject: boolean | null
    }[] = []

    if (shapiroWilkResult) {
      rows.push({
        testName: 'Shapiro-Wilk',
        statistic: isNaN(shapiroWilkResult.statistic) ? 'N/A' : shapiroWilkResult.statistic,
        pValue: isNaN(shapiroWilkResult.pValue) ? 'N/A' : shapiroWilkResult.pValue,
        conclusion: shapiroWilkResult.conclusion,
        reject: isNaN(shapiroWilkResult.pValue) ? null : shapiroWilkResult.pValue <= alpha,
      })
    }

    if (ksResult) {
      rows.push({
        testName: 'Kolmogorov-Smirnov',
        statistic: isNaN(ksResult.statistic) ? 'N/A' : ksResult.statistic,
        pValue: isNaN(ksResult.pValue) ? 'N/A' : ksResult.pValue,
        conclusion: ksResult.conclusion,
        reject: isNaN(ksResult.pValue) ? null : ksResult.pValue <= alpha,
      })
    }

    if (adResult) {
      rows.push({
        testName: 'Anderson-Darling',
        statistic: isNaN(adResult.statistic) ? 'N/A' : adResult.statistic,
        pValue: isNaN(adResult.pValue) ? 'N/A' : adResult.pValue,
        conclusion: adResult.conclusion,
        reject: isNaN(adResult.pValue) ? null : adResult.pValue <= alpha,
      })
    }

    return rows
  }, [shapiroWilkResult, ksResult, adResult, alpha])

  // Majority vote interpretation
  const majorityVote = useMemo(() => {
    const validResults = summaryTableData.filter(r => r.reject !== null)
    if (validResults.length === 0) return { isNormal: null, rejectCount: 0, failToRejectCount: 0, total: 0 }

    const rejectCount = validResults.filter(r => r.reject === true).length
    const failToRejectCount = validResults.filter(r => r.reject === false).length

    return {
      isNormal: failToRejectCount >= rejectCount,
      rejectCount,
      failToRejectCount,
      total: validResults.length,
    }
  }, [summaryTableData])

  // Vote details for the visual circles
  const voteDetails = useMemo(() => {
    const votes: { testName: string; reject: boolean | null }[] = []
    if (shapiroWilkResult) {
      votes.push({
        testName: 'Shapiro-Wilk',
        reject: isNaN(shapiroWilkResult.pValue) ? null : shapiroWilkResult.pValue <= alpha,
      })
    }
    if (ksResult) {
      votes.push({
        testName: 'Kolmogorov-Smirnov',
        reject: isNaN(ksResult.pValue) ? null : ksResult.pValue <= alpha,
      })
    }
    if (adResult) {
      votes.push({
        testName: 'Anderson-Darling',
        reject: isNaN(adResult.pValue) ? null : adResult.pValue <= alpha,
      })
    }
    return votes
  }, [shapiroWilkResult, ksResult, adResult, alpha])

  // Skewness classification
  const skewClassification = useMemo(() => {
    if (skewVal === null) return null
    const absSkew = Math.abs(skewVal)
    if (absSkew < 0.5) return { label: 'Symmetric', icon: '↔', color: 'emerald', direction: 'symmetric' }
    if (skewVal > 0) return { label: 'Right-Skewed', icon: '↗', color: 'amber', direction: 'right' }
    return { label: 'Left-Skewed', icon: '↙', color: 'amber', direction: 'left' }
  }, [skewVal])

  // Kurtosis classification
  const kurtClassification = useMemo(() => {
    if (kurtVal === null) return null
    if (kurtVal < -0.5) return { label: 'Platykurtic', description: 'Flatter than normal', color: 'amber' }
    if (kurtVal > 0.5) return { label: 'Leptokurtic', description: 'More peaked than normal', color: 'rose' }
    return { label: 'Mesokurtic', description: 'Similar to normal', color: 'emerald' }
  }, [kurtVal])

  // Generate normality testing report content
  const handleExportReport = () => {
    if (!dataset || !selectedColumn || columnData.length < 3) return;

    const lines: string[] = [];
    lines.push('====================================');
    lines.push('  Normality Testing Report');
    lines.push('====================================');
    lines.push(`File: ${dataset.fileName}`);
    lines.push(`Rows: ${dataset.rows.length}, Columns: ${dataset.headers.length}`);
    lines.push(`Column Analyzed: ${selectedColumn}`);
    lines.push(`Data Points: ${columnData.length}`);
    lines.push('');

    lines.push('--- Test Results Summary ---');
    lines.push(`Significance Level: α = ${alpha}`);
    lines.push('');

    // Summary table
    lines.push(
      'Test Name'.padEnd(25) +
      'Statistic'.padEnd(16) +
      'P-value'.padEnd(16) +
      'Conclusion'
    );
    lines.push('-'.repeat(80));

    for (const row of summaryTableData) {
      const statStr = typeof row.statistic === 'number' ? exportNumber(row.statistic, 6) : String(row.statistic);
      const pValStr = typeof row.pValue === 'number' ? exportNumber(row.pValue, 6) : String(row.pValue);
      const conclusion = row.reject === null ? 'Inconclusive' : row.reject ? 'Reject H₀' : 'Fail to Reject H₀';
      lines.push(
        row.testName.padEnd(25) +
        statStr.padEnd(16) +
        pValStr.padEnd(16) +
        conclusion
      );
    }
    lines.push('');

    // Majority vote interpretation
    lines.push('--- Overall Interpretation ---');
    if (majorityVote.isNormal !== null) {
      lines.push(majorityVote.isNormal
        ? `Data appears normally distributed (${majorityVote.failToRejectCount}/${majorityVote.total} tests fail to reject H₀)`
        : `Data does NOT appear normally distributed (${majorityVote.rejectCount}/${majorityVote.total} tests reject H₀)`
      );
    }
    lines.push('');

    // Skewness/Kurtosis
    if (skewVal !== null && kurtVal !== null) {
      lines.push('--- Shape Analysis ---');
      lines.push(`Skewness: ${exportNumber(skewVal, 4)} (${skewClassification?.label || 'N/A'})`);
      lines.push(`Kurtosis: ${exportNumber(kurtVal, 4)} (${kurtClassification?.label || 'N/A'})`);
      lines.push('');
    }

    // Shapiro-Wilk detail
    if (shapiroWilkResult) {
      lines.push('--- Shapiro-Wilk Test (Detail) ---');
      lines.push(`W Statistic: ${exportNumber(shapiroWilkResult.statistic, 6)}`);
      lines.push(`P-value: ${exportNumber(shapiroWilkResult.pValue, 6)}`);
      lines.push(`Conclusion: ${shapiroWilkResult.conclusion}`);
      lines.push('');
    }

    // K-S test detail
    if (ksResult) {
      lines.push('--- Kolmogorov-Smirnov Test (Detail) ---');
      lines.push(`D Statistic: ${exportNumber(ksResult.statistic, 6)}`);
      lines.push(`P-value: ${exportNumber(ksResult.pValue, 6)}`);
      lines.push(`Conclusion: ${ksResult.conclusion}`);
      lines.push('');
    }

    // Anderson-Darling detail
    if (adResult) {
      lines.push('--- Anderson-Darling Test (Detail) ---');
      lines.push(`A² Statistic: ${exportNumber(adResult.statistic, 6)}`);
      lines.push(`P-value: ${exportNumber(adResult.pValue, 6)}`);
      lines.push(`Conclusion: ${adResult.conclusion}`);
      if (adResult.criticalValues && adResult.criticalValues.length > 0) {
        lines.push('Critical Values:');
        lines.push(
          '  Significance Level'.padEnd(25) +
          'Critical Value'.padEnd(18) +
          'Result'
        );
        for (const cv of adResult.criticalValues) {
          const exceeds = !isNaN(adResult.statistic) && adResult.statistic > cv.value;
          lines.push(
            `  ${exportNumber(cv.level, 3).padEnd(23)}` +
            `${exportNumber(cv.value, 3).padEnd(18)}` +
            (exceeds ? 'Reject' : 'Fail to Reject')
          );
        }
      }
      lines.push('');
    }

    // Descriptive info
    const m = mean(columnData);
    const sd = standardDeviation(columnData);
    lines.push('--- Column Descriptive Stats ---');
    lines.push(`Mean: ${exportNumber(m, 4)}`);
    lines.push(`Std Dev: ${exportNumber(sd, 4)}`);
    lines.push(`Min: ${exportNumber(Math.min(...columnData), 4)}`);
    lines.push(`Max: ${exportNumber(Math.max(...columnData), 4)}`);
    lines.push('');

    lines.push('====================================');
    lines.push('  End of Report');
    lines.push('====================================');

    const timestamp = new Date().toISOString().slice(0, 10);
    downloadAsFile(`normality-testing-${selectedColumn}-${timestamp}.txt`, lines.join('\n'), 'text/plain');
  };

  if (!dataset) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground/40 mb-4 shrink-0" />
          <p className="text-muted-foreground text-lg font-medium">No Dataset Loaded</p>
          <p className="text-muted-foreground/70 text-sm mt-1">
            Upload a dataset to perform normality testing
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Column Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Columns3 className="h-5 w-5 text-teal-600 shrink-0" />
              Column Selection
            </CardTitle>
            {selectedColumn && columnData.length >= 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportReport}
                className="gap-1.5 text-teal-700 border-teal-300 hover:bg-teal-50 dark:text-teal-300 dark:border-teal-700 dark:hover:bg-teal-950/50 shrink-0"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download Report</span>
              </Button>
            )}
          </div>
          <CardDescription>
            Select a numeric column from your dataset to test for normality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Numeric Column:
            </label>
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select a column..." />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedColumn && columnData.length > 0 && (
              <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
                {columnData.length} values
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedColumn && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4 shrink-0" />
            <p className="text-muted-foreground text-lg font-medium">Select a Column</p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              Choose a numeric column above to begin normality analysis
            </p>
          </CardContent>
        </Card>
      )}

      {selectedColumn && columnData.length < 3 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Insufficient data points ({columnData.length}) for normality testing.
              At least 3 values are required.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedColumn && columnData.length >= 3 && (
        <>
          {/* P-value Summary Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FlaskConical className="h-5 w-5 text-teal-600 shrink-0" />
                    Normality Test Results
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Summary of all normality tests for &quot;{selectedColumn}&quot; at the selected significance level
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm font-mono px-3 py-1 border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-300 shrink-0">
                  α = {alpha}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Test Name</TableHead>
                    <TableHead className="text-center">Test Statistic</TableHead>
                    <TableHead className="text-center">P-value</TableHead>
                    <TableHead className="text-center">Conclusion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryTableData.map((row) => (
                    <TableRow key={row.testName} className="transition-colors hover:bg-muted/50">
                      <TableCell className="font-medium">{row.testName}</TableCell>
                      <TableCell className="text-center font-mono animate-[fadeIn_0.5s_ease-in-out]">
                        {typeof row.statistic === 'number' ? row.statistic.toFixed(6) : row.statistic}
                      </TableCell>
                      <TableCell className="text-center font-mono animate-[fadeIn_0.5s_ease-in-out]">
                        {typeof row.pValue === 'number' ? row.pValue.toFixed(6) : row.pValue}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.reject === null ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 px-3 py-1 text-sm dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                            Inconclusive
                          </Badge>
                        ) : row.reject ? (
                          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 px-3 py-1 text-sm dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/50">
                            Reject H₀
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 px-3 py-1 text-sm dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50">
                            Fail to Reject H₀
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Interactive Significance Level Selector */}
              <div className="flex items-center gap-3 pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Significance Level (α):
                </span>
                <div className="flex gap-1">
                  {([0.01, 0.05, 0.10] as const).map((a) => (
                    <Button
                      key={a}
                      variant={alpha === a ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAlpha(a)}
                      className={`font-mono text-sm px-4 py-1.5 transition-all ${
                        alpha === a
                          ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                          : 'hover:bg-teal-50 dark:hover:bg-teal-950/50'
                      }`}
                    >
                      {a.toFixed(2)}
                    </Button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {alpha === 0.01 ? 'Very strict criterion' : alpha === 0.05 ? 'Standard criterion' : 'Lenient criterion'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Individual Test Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Shapiro-Wilk Detail */}
            {shapiroWilkResult && (
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                    Shapiro-Wilk Test
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Best for small-to-moderate samples (3 ≤ n ≤ 5000)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">W Statistic</p>
                      <p className="text-lg font-semibold font-mono truncate animate-[fadeIn_0.5s_ease-in-out]">
                        {isNaN(shapiroWilkResult.statistic) ? 'N/A' : shapiroWilkResult.statistic.toFixed(6)}
                      </p>
                    </div>
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">P-value</p>
                      <p className="text-lg font-semibold font-mono truncate animate-[fadeIn_0.5s_ease-in-out]">
                        {isNaN(shapiroWilkResult.pValue) ? 'N/A' : shapiroWilkResult.pValue.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {isNaN(shapiroWilkResult.pValue)
                      ? shapiroWilkResult.conclusion
                      : shapiroWilkResult.pValue <= alpha
                        ? `Reject H₀: Data does not appear to be normally distributed (p ≤ ${alpha})`
                        : `Fail to reject H₀: Data appears to be normally distributed (p > ${alpha})`
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Kolmogorov-Smirnov Detail */}
            {ksResult && (
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-teal-600 shrink-0" />
                    Kolmogorov-Smirnov Test
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Compares empirical CDF to theoretical normal CDF
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">D Statistic</p>
                      <p className="text-lg font-semibold font-mono truncate animate-[fadeIn_0.5s_ease-in-out]">
                        {isNaN(ksResult.statistic) ? 'N/A' : ksResult.statistic.toFixed(6)}
                      </p>
                    </div>
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">P-value</p>
                      <p className="text-lg font-semibold font-mono truncate animate-[fadeIn_0.5s_ease-in-out]">
                        {isNaN(ksResult.pValue) ? 'N/A' : ksResult.pValue.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {isNaN(ksResult.pValue)
                      ? ksResult.conclusion
                      : ksResult.pValue <= alpha
                        ? `Reject H₀: Data does not appear to be normally distributed (p ≤ ${alpha})`
                        : `Fail to reject H₀: Data appears to be normally distributed (p > ${alpha})`
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Anderson-Darling Detail */}
            {adResult && (
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-teal-600 shrink-0" />
                    Anderson-Darling Test
                  </CardTitle>
                  <CardDescription className="text-xs">
                    More sensitive to tails than K-S test
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">A² Statistic</p>
                      <p className="text-lg font-semibold font-mono truncate animate-[fadeIn_0.5s_ease-in-out]">
                        {isNaN(adResult.statistic) ? 'N/A' : adResult.statistic.toFixed(6)}
                      </p>
                    </div>
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">P-value</p>
                      <p className="text-lg font-semibold font-mono truncate animate-[fadeIn_0.5s_ease-in-out]">
                        {isNaN(adResult.pValue) ? 'N/A' : adResult.pValue.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  {/* Critical Values Table */}
                  {adResult.criticalValues && adResult.criticalValues.length > 0 && (
                    <div className="overflow-x-auto">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Critical Values</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-8 text-xs py-1">Sig. Level</TableHead>
                            <TableHead className="h-8 text-xs py-1 text-center">Critical Value</TableHead>
                            <TableHead className="h-8 text-xs py-1 text-center">Result</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adResult.criticalValues.map((cv) => {
                            const exceeds = !isNaN(adResult.statistic) && adResult.statistic > cv.value
                            return (
                              <TableRow key={cv.level} className="transition-colors hover:bg-muted/50">
                                <TableCell className="text-xs py-1 font-mono">
                                  {cv.level.toFixed(3)}
                                </TableCell>
                                <TableCell className="text-xs py-1 text-center font-mono">
                                  {cv.value.toFixed(3)}
                                </TableCell>
                                <TableCell className="text-xs py-1 text-center">
                                  {exceeds ? (
                                    <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                                      Reject
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                                      Fail to Reject
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {isNaN(adResult.pValue)
                      ? adResult.conclusion
                      : adResult.pValue <= alpha
                        ? `Reject H₀: Data does not appear to be normally distributed (p ≤ ${alpha})`
                        : `Fail to reject H₀: Data appears to be normally distributed (p > ${alpha})`
                    }
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Test Interpretation Summary Card */}
          {majorityVote.total > 0 && (
            <Card className={`border-2 overflow-hidden ${
              majorityVote.isNormal
                ? 'border-emerald-300 dark:border-emerald-700'
                : 'border-red-300 dark:border-red-700'
            }`}>
              <div className={`h-1 ${
                majorityVote.isNormal
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400'
                  : 'bg-gradient-to-r from-red-400 via-rose-400 to-red-400'
              }`} />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {majorityVote.isNormal ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                  Test Interpretation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prominent Conclusion */}
                <div className={`rounded-lg p-4 ${
                  majorityVote.isNormal
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30'
                    : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {majorityVote.isNormal ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <span className={`text-lg font-semibold ${
                      majorityVote.isNormal
                        ? 'text-emerald-800 dark:text-emerald-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {majorityVote.isNormal
                        ? 'Data appears normally distributed'
                        : 'Data does NOT appear normally distributed'
                      }
                    </span>
                  </div>
                  <p className={`text-sm ml-9 ${
                    majorityVote.isNormal
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {majorityVote.isNormal
                      ? `${majorityVote.failToRejectCount} of ${majorityVote.total} tests fail to reject the null hypothesis at α = ${alpha}.`
                      : `${majorityVote.rejectCount} of ${majorityVote.total} tests reject the null hypothesis at α = ${alpha}.`
                    }
                  </p>
                </div>

                {/* Vote Count Visual */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Vote Count:</span>
                  <div className="flex items-center gap-3">
                    {voteDetails.map((vote) => (
                      <div key={vote.testName} className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                            vote.reject === null
                              ? 'bg-amber-200 dark:bg-amber-800'
                              : vote.reject
                                ? 'bg-red-500 dark:bg-red-600'
                                : 'bg-emerald-500 dark:bg-emerald-600'
                          }`}
                          title={vote.testName}
                        >
                          {vote.reject === null ? (
                            <span className="text-[8px] text-amber-800 dark:text-amber-200">?</span>
                          ) : vote.reject ? (
                            <XCircle className="h-3 w-3 text-white" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground hidden sm:inline">{vote.testName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                {!majorityVote.isNormal && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <p className="font-medium mb-1">Recommendations when normality is rejected:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-xs">
                          <li>Consider using non-parametric tests (Mann-Whitney U, Kruskal-Wallis, etc.)</li>
                          <li>Try data transformations (log, square root, Box-Cox)</li>
                          <li>Check for outliers that may be influencing the test results</li>
                          <li>For large samples, normality tests can be overly sensitive — consider practical significance</li>
                          <li>Examine Q-Q plots and histograms for visual assessment of departure from normality</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {majorityVote.isNormal && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-950/20">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-emerald-800 dark:text-emerald-200">
                        The normality assumption is satisfied. Parametric tests (t-tests, ANOVA) are appropriate for this data.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skewness/Kurtosis Quick Check Card */}
          {skewVal !== null && kurtVal !== null && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5 text-teal-600 shrink-0" />
                  Shape Analysis: Skewness & Kurtosis
                </CardTitle>
                <CardDescription>
                  Quick check for distribution shape characteristics of &quot;{selectedColumn}&quot;
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Skewness */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Skewness</span>
                      {skewClassification && (
                        <Badge className={`text-xs px-2.5 py-0.5 ${
                          skewClassification.color === 'emerald'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                            : skewClassification.color === 'amber'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                        }`}>
                          {skewClassification.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold font-mono animate-[fadeIn_0.5s_ease-in-out]">
                        {skewVal.toFixed(4)}
                      </span>
                      {skewClassification && (
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                          skewClassification.direction === 'right'
                            ? 'bg-amber-100 dark:bg-amber-900/40'
                            : skewClassification.direction === 'left'
                              ? 'bg-amber-100 dark:bg-amber-900/40'
                              : 'bg-emerald-100 dark:bg-emerald-900/40'
                        }`}>
                          {skewClassification.direction === 'right' ? (
                            <ArrowUpRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          ) : skewClassification.direction === 'left' ? (
                            <ArrowDownLeft className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <ArrowLeftRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {/* Visual skew indicator bar */}
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div className="absolute inset-0 flex">
                          <div className="w-1/3 bg-amber-200 dark:bg-amber-800/50" />
                          <div className="w-1/3 bg-emerald-200 dark:bg-emerald-800/50" />
                          <div className="w-1/3 bg-amber-200 dark:bg-amber-800/50" />
                        </div>
                        <div
                          className="absolute top-0 h-full w-1 bg-foreground rounded-full transition-all duration-500"
                          style={{
                            left: `${Math.min(100, Math.max(0, 50 + skewVal * 20))}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Left</span>
                        <span>Symmetric</span>
                        <span>Right</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.abs(skewVal) < 0.5
                        ? 'Distribution is approximately symmetric (|skewness| < 0.5)'
                        : Math.abs(skewVal) < 1
                          ? 'Moderate skewness detected (0.5 ≤ |skewness| < 1)'
                          : 'Substantial skewness detected (|skewness| ≥ 1)'
                      }
                    </p>
                  </div>

                  {/* Kurtosis */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Excess Kurtosis</span>
                      {kurtClassification && (
                        <Badge className={`text-xs px-2.5 py-0.5 ${
                          kurtClassification.color === 'emerald'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                            : kurtClassification.color === 'amber'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-rose-50 text-red-700 border-red-200 dark:bg-rose-900/30 dark:text-red-300 dark:border-rose-800'
                        }`}>
                          {kurtClassification.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold font-mono animate-[fadeIn_0.5s_ease-in-out]">
                        {kurtVal.toFixed(4)}
                      </span>
                      {kurtClassification && (
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                          kurtClassification.color === 'emerald'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                            : kurtClassification.color === 'amber'
                              ? 'bg-amber-100 dark:bg-amber-900/40'
                              : 'bg-rose-100 dark:bg-rose-900/40'
                        }`}>
                          {kurtClassification.color === 'emerald' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          ) : kurtClassification.color === 'amber' ? (
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                          )}
                        </div>
                      )}
                    </div>
                    {/* Kurtosis visual scale */}
                    <div className="space-y-1.5">
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div className="absolute inset-0 flex">
                          <div className="w-[30%] bg-amber-200 dark:bg-amber-800/50" />
                          <div className="w-[40%] bg-emerald-200 dark:bg-emerald-800/50" />
                          <div className="w-[30%] bg-rose-200 dark:bg-rose-800/50" />
                        </div>
                        <div
                          className="absolute top-0 h-full w-1 bg-foreground rounded-full transition-all duration-500"
                          style={{
                            left: `${Math.min(100, Math.max(0, 50 + kurtVal * 20))}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Platykurtic</span>
                        <span>Mesokurtic</span>
                        <span>Leptokurtic</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {kurtClassification?.description}
                      {kurtVal < -0.5
                        ? ' — flatter distribution with thinner tails than normal'
                        : kurtVal > 0.5
                          ? ' — heavier tails and sharper peak than normal'
                          : ' — kurtosis similar to normal distribution'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gradient Divider between test details and plots */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Plots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Histogram with Fitted Normal Curve Overlay */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-teal-600 shrink-0" />
                  Histogram with Normal Curve Overlay
                </CardTitle>
                <CardDescription>
                  Frequency distribution of &quot;{selectedColumn}&quot; with fitted normal curve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={testResultsChartConfig} className="h-[280px] sm:h-[350px] w-full">
                  <ComposedChart data={histogramWithCurveData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="binLabel"
                      label={{ value: selectedColumn, position: 'insideBottom', offset: -2, style: { fontSize: 12 } }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      label={{ value: 'Frequency', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: 12 } }}
                      tick={{ fontSize: 10 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="frequency" fill="var(--color-frequency)" opacity={0.7} radius={[2, 2, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="normalCurve"
                      stroke="var(--color-normalCurve)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Q-Q Plot */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-teal-600 shrink-0" />
                  Q-Q Plot
                </CardTitle>
                <CardDescription>
                  Theoretical vs. sample quantiles for &quot;{selectedColumn}&quot;
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={testResultsChartConfig} className="h-[280px] sm:h-[350px] w-full">
                  <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      type="number"
                      dataKey="theoretical"
                      name="Theoretical"
                      label={{ value: 'Theoretical Quantiles', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="sample"
                      name="Sample"
                      label={{ value: 'Sample Quantiles', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: 12 } }}
                      tick={{ fontSize: 10 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ReferenceLine
                      segment={[
                        { x: Math.min(...qqData.map((d) => d.theoretical)), y: Math.min(...qqData.map((d) => d.theoretical)) },
                        { x: Math.max(...qqData.map((d) => d.theoretical)), y: Math.max(...qqData.map((d) => d.theoretical)) },
                      ]}
                      stroke="#f97316"
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                    />
                    <Scatter
                      data={qqData}
                      fill="var(--color-sample)"
                      opacity={0.7}
                      r={3}
                    />
                  </ScatterChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Fitted Normal Curve (Standalone) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-teal-600 shrink-0" />
                  Fitted Normal Distribution Curve
                </CardTitle>
                <CardDescription>
                  Estimated normal distribution for &quot;{selectedColumn}&quot; (μ = {mean(columnData).toFixed(2)}, σ = {standardDeviation(columnData).toFixed(2)})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    fittedY: {
                      label: 'Probability Density',
                      color: '#14b8a6',
                    },
                  }}
                  className="h-[280px] sm:h-[350px] w-full"
                >
                  <AreaChart data={fittedCurve} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="x"
                      label={{ value: selectedColumn, position: 'insideBottom', offset: -2, style: { fontSize: 12 } }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      label={{ value: 'Probability Density', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: 12 } }}
                      tick={{ fontSize: 10 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="fittedY"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Histogram Overlay with Normal Curve (density scale) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-teal-600 shrink-0" />
                  Density Histogram with Normal Overlay
                </CardTitle>
                <CardDescription>
                  Normalized histogram of &quot;{selectedColumn}&quot; with normal PDF overlay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    density: {
                      label: 'Density',
                      color: '#14b8a6',
                    },
                    pdf: {
                      label: 'Normal PDF',
                      color: '#f97316',
                    },
                  }}
                  className="h-[280px] sm:h-[350px] w-full"
                >
                  {(() => {
                    const n = columnData.length
                    const m = mean(columnData)
                    const sd = standardDeviation(columnData)
                    const densityHistData = histData.map((bin) => {
                      const binWidth = bin.binEnd - bin.binStart
                      const density = binWidth > 0 ? bin.frequency / (n * binWidth) : 0
                      return {
                        binLabel: `${bin.midpoint.toFixed(1)}`,
                        density: Math.round(density * 10000) / 10000,
                        pdf: Math.round(normalPDF(bin.midpoint, m, sd) * 10000) / 10000,
                      }
                    })
                    return (
                      <ComposedChart data={densityHistData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="binLabel"
                          label={{ value: selectedColumn, position: 'insideBottom', offset: -2, style: { fontSize: 12 } }}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis
                          label={{ value: 'Density', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: 12 } }}
                          tick={{ fontSize: 10 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="density" fill="var(--color-density)" opacity={0.6} radius={[2, 2, 0, 0]} />
                        <Line
                          type="monotone"
                          dataKey="pdf"
                          stroke="var(--color-pdf)"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </ComposedChart>
                    )
                  })()}
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
