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
} from 'lucide-react'

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

  // Summary table data
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
        reject: isNaN(shapiroWilkResult.pValue) ? null : shapiroWilkResult.pValue <= 0.05,
      })
    }

    if (ksResult) {
      rows.push({
        testName: 'Kolmogorov-Smirnov',
        statistic: isNaN(ksResult.statistic) ? 'N/A' : ksResult.statistic,
        pValue: isNaN(ksResult.pValue) ? 'N/A' : ksResult.pValue,
        conclusion: ksResult.conclusion,
        reject: isNaN(ksResult.pValue) ? null : ksResult.pValue <= 0.05,
      })
    }

    if (adResult) {
      rows.push({
        testName: 'Anderson-Darling',
        statistic: isNaN(adResult.statistic) ? 'N/A' : adResult.statistic,
        pValue: isNaN(adResult.pValue) ? 'N/A' : adResult.pValue,
        conclusion: adResult.conclusion,
        reject: isNaN(adResult.pValue) ? null : adResult.pValue <= 0.05,
      })
    }

    return rows
  }, [shapiroWilkResult, ksResult, adResult])

  if (!dataset) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground/40 mb-4" />
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
          <CardTitle className="flex items-center gap-2 text-lg">
            <Columns3 className="h-5 w-5 text-teal-600" />
            Column Selection
          </CardTitle>
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
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
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
              <CardTitle className="flex items-center gap-2 text-lg">
                <FlaskConical className="h-5 w-5 text-teal-600" />
                Normality Test Results
              </CardTitle>
              <CardDescription>
                Summary of all normality tests for &quot;{selectedColumn}&quot; at α = 0.05 significance level
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    <TableRow key={row.testName}>
                      <TableCell className="font-medium">{row.testName}</TableCell>
                      <TableCell className="text-center font-mono">
                        {typeof row.statistic === 'number' ? row.statistic.toFixed(4) : row.statistic}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {typeof row.pValue === 'number' ? row.pValue.toFixed(4) : row.pValue}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.reject === null ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                            Inconclusive
                          </Badge>
                        ) : row.reject ? (
                          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/50">
                            Reject H₀
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50">
                            Fail to Reject H₀
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Individual Test Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Shapiro-Wilk Detail */}
            {shapiroWilkResult && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    Shapiro-Wilk Test
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Best for small-to-moderate samples (3 ≤ n ≤ 5000)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">W Statistic</p>
                      <p className="text-lg font-semibold font-mono">
                        {isNaN(shapiroWilkResult.statistic) ? 'N/A' : shapiroWilkResult.statistic.toFixed(4)}
                      </p>
                    </div>
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">P-value</p>
                      <p className="text-lg font-semibold font-mono">
                        {isNaN(shapiroWilkResult.pValue) ? 'N/A' : shapiroWilkResult.pValue.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {shapiroWilkResult.conclusion}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Kolmogorov-Smirnov Detail */}
            {ksResult && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-teal-600" />
                    Kolmogorov-Smirnov Test
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Compares empirical CDF to theoretical normal CDF
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">D Statistic</p>
                      <p className="text-lg font-semibold font-mono">
                        {isNaN(ksResult.statistic) ? 'N/A' : ksResult.statistic.toFixed(4)}
                      </p>
                    </div>
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">P-value</p>
                      <p className="text-lg font-semibold font-mono">
                        {isNaN(ksResult.pValue) ? 'N/A' : ksResult.pValue.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {ksResult.conclusion}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Anderson-Darling Detail */}
            {adResult && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-teal-600" />
                    Anderson-Darling Test
                  </CardTitle>
                  <CardDescription className="text-xs">
                    More sensitive to tails than K-S test
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">A² Statistic</p>
                      <p className="text-lg font-semibold font-mono">
                        {isNaN(adResult.statistic) ? 'N/A' : adResult.statistic.toFixed(4)}
                      </p>
                    </div>
                    <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">P-value</p>
                      <p className="text-lg font-semibold font-mono">
                        {isNaN(adResult.pValue) ? 'N/A' : adResult.pValue.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  {/* Critical Values Table */}
                  {adResult.criticalValues && adResult.criticalValues.length > 0 && (
                    <div>
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
                              <TableRow key={cv.level}>
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
                    {adResult.conclusion}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Plots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Histogram with Fitted Normal Curve Overlay */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-teal-600" />
                  Histogram with Normal Curve Overlay
                </CardTitle>
                <CardDescription>
                  Frequency distribution of &quot;{selectedColumn}&quot; with fitted normal curve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={testResultsChartConfig} className="h-[350px] w-full">
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
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  Q-Q Plot
                </CardTitle>
                <CardDescription>
                  Theoretical vs. sample quantiles for &quot;{selectedColumn}&quot;
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={testResultsChartConfig} className="h-[350px] w-full">
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
                  <TrendingUp className="h-4 w-4 text-teal-600" />
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
                  className="h-[350px] w-full"
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
                  <BarChart3 className="h-4 w-4 text-teal-600" />
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
                  className="h-[350px] w-full"
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
