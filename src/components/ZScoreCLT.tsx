'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  ComposedChart,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Calculator,
  Play,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  zScore,
  normalPDF,
  normalCDF,
  cltSimulation,
  mean,
  standardDeviation,
  histogramData,
} from '@/lib/statistics'
import { useDataset } from '@/hooks/useDataset'

// ==================== Z-Score Calculator ====================

function ZScoreCalculator() {
  const [xValue, setXValue] = useState<string>('')
  const [muValue, setMuValue] = useState<string>('')
  const [sigmaValue, setSigmaValue] = useState<string>('')
  const [calculated, setCalculated] = useState(false)

  const x = parseFloat(xValue)
  const mu = parseFloat(muValue)
  const sigma = parseFloat(sigmaValue)

  const isValid = !isNaN(x) && !isNaN(mu) && !isNaN(sigma) && sigma > 0

  const z = useMemo(() => {
    if (!isValid) return null
    return zScore(x, mu, sigma)
  }, [x, mu, sigma, isValid])

  const probability = useMemo(() => {
    if (z === null) return null
    return normalCDF(z)
  }, [z])

  // Generate standard normal distribution data for the plot
  const normalData = useMemo(() => {
    const points: { x: number; y: number; area?: number }[] = []
    const numPoints = 200
    const xMin = -4
    const xMax = 4
    const step = (xMax - xMin) / numPoints

    for (let i = 0; i <= numPoints; i++) {
      const xi = xMin + i * step
      const yi = normalPDF(xi, 0, 1)
      points.push({ x: Math.round(xi * 1000) / 1000, y: yi })
    }
    return points
  }, [])

  // Generate shaded area data (left tail up to z-score)
  const shadedData = useMemo(() => {
    if (z === null) return []
    const points: { x: number; y: number }[] = []
    const numPoints = 200
    const xMin = -4
    const xMax = Math.min(Math.max(z, -4), 4)
    if (xMin >= xMax) return [{ x: xMin, y: 0 }]
    const step = (xMax - xMin) / numPoints

    for (let i = 0; i <= numPoints; i++) {
      const xi = xMin + i * step
      const yi = normalPDF(xi, 0, 1)
      points.push({ x: Math.round(xi * 1000) / 1000, y: yi })
    }
    return points
  }, [z])

  const handleCalculate = () => {
    if (isValid) {
      setCalculated(true)
    }
  }

  const handleReset = () => {
    setXValue('')
    setMuValue('')
    setSigmaValue('')
    setCalculated(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Calculator className="size-5" />
          Z-Score Calculator
        </CardTitle>
        <CardDescription>
          Calculate the z-score and visualize it on the standard normal
          distribution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formula Display */}
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">
            Formula
          </p>
          <p className="text-xl font-mono font-semibold text-emerald-800 dark:text-emerald-300">
            z = (x − μ) / σ
          </p>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="x-value" className="text-sm font-medium">
              x value
            </Label>
            <Input
              id="x-value"
              type="number"
              placeholder="Enter x value"
              value={xValue}
              onChange={(e) => {
                setXValue(e.target.value)
                setCalculated(false)
              }}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mu-value" className="text-sm font-medium">
              Population Mean (μ)
            </Label>
            <Input
              id="mu-value"
              type="number"
              placeholder="Enter μ"
              value={muValue}
              onChange={(e) => {
                setMuValue(e.target.value)
                setCalculated(false)
              }}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sigma-value" className="text-sm font-medium">
              Population Std Dev (σ)
            </Label>
            <Input
              id="sigma-value"
              type="number"
              placeholder="Enter σ"
              value={sigmaValue}
              onChange={(e) => {
                setSigmaValue(e.target.value)
                setCalculated(false)
              }}
              min="0.001"
              step="0.1"
              className="font-mono"
            />
          </div>
        </div>

        {/* Validation error */}
        {sigmaValue && parseFloat(sigmaValue) <= 0 && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
            <AlertCircle className="size-4" />
            Standard deviation must be greater than 0
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleCalculate}
            disabled={!isValid}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Calculator className="size-4 mr-2" />
            Calculate
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-emerald-300 dark:border-emerald-700"
          >
            Reset
          </Button>
        </div>

        {/* Results */}
        {calculated && z !== null && probability !== null && (
          <div className="space-y-4">
            {/* Z-Score Result */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-4 text-center">
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mb-1">
                  Z-Score
                </p>
                <p className="text-2xl font-bold font-mono text-teal-800 dark:text-teal-300">
                  {z.toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-center">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                  P(Z ≤ z)
                </p>
                <p className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-300">
                  {probability.toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4 text-center">
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-1">
                  P(Z &gt; z)
                </p>
                <p className="text-2xl font-bold font-mono text-rose-800 dark:text-rose-300">
                  {(1 - probability).toFixed(4)}
                </p>
              </div>
            </div>

            {/* Calculation Steps */}
            <div className="rounded-lg border p-4 space-y-2 text-sm font-mono">
              <p className="font-semibold text-base font-sans mb-2">
                Calculation Steps
              </p>
              <p>
                z = (x − μ) / σ
              </p>
              <p>
                z = ({x} − {mu}) / {sigma}
              </p>
              <p>
                z = {(x - mu).toFixed(4)} / {sigma}
              </p>
              <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                z = {z.toFixed(4)}
              </p>
            </div>

            {/* Standard Normal Distribution Plot */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Standard Normal Distribution with Z-Score
              </p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={normalData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="x"
                      type="number"
                      domain={[-4, 4]}
                      ticks={[-4, -3, -2, -1, 0, 1, 2, 3, 4]}
                      label={{
                        value: 'Z-Score',
                        position: 'insideBottom',
                        offset: -10,
                        style: { fontSize: 12, fill: '#666' },
                      }}
                      fontSize={11}
                    />
                    <YAxis
                      label={{
                        value: 'Probability Density',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 0,
                        style: { fontSize: 12, fill: '#666' },
                      }}
                      fontSize={11}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        value.toFixed(4),
                        'Density',
                      ]}
                      labelFormatter={(label: number) =>
                        `z = ${label.toFixed(2)}`
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke="#10b981"
                      fill="#d1fae5"
                      fillOpacity={0.6}
                      strokeWidth={2}
                    />
                    {/* Shaded area using ReferenceLine for the z-score marker */}
                    <ReferenceLine
                      x={Math.min(Math.max(z, -4), 4)}
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeDasharray="6 3"
                      label={{
                        value: `z=${z.toFixed(2)}`,
                        position: 'top',
                        fill: '#d97706',
                        fontSize: 13,
                        fontWeight: 'bold',
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Shaded area plot - separate chart for the cumulative area */}
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={shadedData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="x"
                      type="number"
                      domain={[-4, 4]}
                      ticks={[-4, -3, -2, -1, 0, 1, 2, 3, 4]}
                      label={{
                        value: 'Z-Score',
                        position: 'insideBottom',
                        offset: -10,
                        style: { fontSize: 12, fill: '#666' },
                      }}
                      fontSize={11}
                    />
                    <YAxis
                      label={{
                        value: 'Density',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 0,
                        style: { fontSize: 12, fill: '#666' },
                      }}
                      fontSize={11}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        value.toFixed(4),
                        'Density',
                      ]}
                      labelFormatter={(label: number) =>
                        `z = ${label.toFixed(2)}`
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke="#f59e0b"
                      fill="#fbbf24"
                      fillOpacity={0.5}
                      strokeWidth={2}
                    />
                    <ReferenceLine
                      x={Math.min(Math.max(z, -4), 4)}
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      label={{
                        value: `Area = ${probability.toFixed(4)}`,
                        position: 'top',
                        fill: '#d97706',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-4 flex-wrap text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-300 border border-emerald-400" />
                  <span>Full Distribution</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-300 border border-amber-400" />
                  <span>P(Z ≤ z) = {probability.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== CLT Simulation ====================

function CLTSimulation() {
  const { getNumericColumns, getColumnData, dataset } = useDataset()
  const numericColumns = getNumericColumns()

  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [sampleSize, setSampleSize] = useState<string>('30')
  const [numSamples, setNumSamples] = useState<string>('1000')
  const [sampleMeans, setSampleMeans] = useState<number[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const columnData = useMemo(() => {
    if (!selectedColumn) return []
    return getColumnData(selectedColumn)
  }, [selectedColumn, getColumnData])

  const populationMean = useMemo(() => {
    if (columnData.length === 0) return 0
    return mean(columnData)
  }, [columnData])

  const populationStdDev = useMemo(() => {
    if (columnData.length === 0) return 0
    return standardDeviation(columnData, true)
  }, [columnData])

  const handleRunSimulation = useCallback(() => {
    const n = parseInt(sampleSize)
    const num = parseInt(numSamples)
    if (!selectedColumn || columnData.length === 0 || isNaN(n) || isNaN(num) || n < 1 || num < 1) return

    setIsRunning(true)
    // Use setTimeout to allow UI update before computation
    setTimeout(() => {
      const result = cltSimulation(columnData, n, num)
      setSampleMeans(result)
      setIsRunning(false)
    }, 50)
  }, [selectedColumn, columnData, sampleSize, numSamples])

  // Histogram data for sample means
  const histogramBins = useMemo(() => {
    if (sampleMeans.length === 0) return []
    return histogramData(sampleMeans, 30)
  }, [sampleMeans])

  // Theoretical normal curve data overlaid on histogram
  const theoreticalCurveData = useMemo(() => {
    if (sampleMeans.length === 0 || populationStdDev === 0) return []
    const sampleMeansMean = mean(sampleMeans)
    const sampleMeansStd = standardDeviation(sampleMeans, true)
    if (sampleMeansStd === 0) return []

    const points: { x: number; y: number }[] = []
    const binWidth = histogramBins.length > 0
      ? histogramBins[0].binEnd - histogramBins[0].binStart
      : 1
    const totalArea = sampleMeans.length * binWidth // scale factor

    histogramBins.forEach((bin) => {
      const pdfVal = normalPDF(bin.midpoint, populationMean, populationStdDev / Math.sqrt(parseInt(sampleSize)))
      points.push({
        x: bin.midpoint,
        y: pdfVal * totalArea,
      })
    })
    return points
  }, [sampleMeans, histogramBins, populationMean, populationStdDev, sampleSize])

  // Combine histogram + curve data for composed chart
  const chartData = useMemo(() => {
    if (histogramBins.length === 0) return []
    return histogramBins.map((bin, i) => ({
      midpoint: bin.midpoint,
      binLabel: `${bin.binStart.toFixed(2)}–${bin.binEnd.toFixed(2)}`,
      frequency: bin.frequency,
      curve: theoreticalCurveData[i]?.y ?? 0,
    }))
  }, [histogramBins, theoreticalCurveData])

  // Statistics of sample means
  const sampleMeansStats = useMemo(() => {
    if (sampleMeans.length === 0) return null
    const m = mean(sampleMeans)
    const sd = standardDeviation(sampleMeans, true)
    const theoreticalMean = populationMean
    const theoreticalSE = populationStdDev / Math.sqrt(parseInt(sampleSize))
    return {
      mean: m,
      stdDev: sd,
      theoreticalMean,
      theoreticalSE,
      meanDiff: Math.abs(m - theoreticalMean),
      seDiff: Math.abs(sd - theoreticalSE),
    }
  }, [sampleMeans, populationMean, populationStdDev, sampleSize])

  const n = parseInt(sampleSize)
  const isValidSimulation =
    selectedColumn &&
    columnData.length >= 2 &&
    !isNaN(n) &&
    n >= 1 &&
    !isNaN(parseInt(numSamples)) &&
    parseInt(numSamples) >= 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <BarChart3 className="size-5" />
          Central Limit Theorem Simulation
        </CardTitle>
        <CardDescription>
          Observe how the distribution of sample means approaches a normal
          distribution, regardless of the population shape
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* No dataset warning */}
        {!dataset && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-4 shrink-0" />
            <span className="text-sm">
              Please upload a dataset first to use the CLT simulation.
            </span>
          </div>
        )}

        {dataset && numericColumns.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-4 shrink-0" />
            <span className="text-sm">
              No numeric columns found in the dataset.
            </span>
          </div>
        )}

        {dataset && numericColumns.length > 0 && (
          <>
            {/* Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Column</Label>
                <Select
                  value={selectedColumn}
                  onValueChange={setSelectedColumn}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose column..." />
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
              <div className="space-y-2">
                <Label htmlFor="sample-size" className="text-sm font-medium">
                  Sample Size (n)
                </Label>
                <Input
                  id="sample-size"
                  type="number"
                  min="1"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="num-samples" className="text-sm font-medium">
                  Number of Resamples
                </Label>
                <Input
                  id="num-samples"
                  type="number"
                  min="1"
                  max="10000"
                  value={numSamples}
                  onChange={(e) => setNumSamples(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Population Info */}
            {selectedColumn && columnData.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-3 text-center">
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                    Population Size
                  </p>
                  <p className="text-lg font-bold font-mono text-teal-800 dark:text-teal-300">
                    {columnData.length.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-center">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Population Mean (μ)
                  </p>
                  <p className="text-lg font-bold font-mono text-amber-800 dark:text-amber-300">
                    {populationMean.toFixed(4)}
                  </p>
                </div>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 text-center">
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Population Std Dev (σ)
                  </p>
                  <p className="text-lg font-bold font-mono text-rose-800 dark:text-rose-300">
                    {populationStdDev.toFixed(4)}
                  </p>
                </div>
              </div>
            )}

            {/* Run Button */}
            <Button
              onClick={handleRunSimulation}
              disabled={!isValidSimulation || isRunning}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isRunning ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Simulating...
                </>
              ) : (
                <>
                  <Play className="size-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>

            {/* Simulation Results */}
            {sampleMeans.length > 0 && sampleMeansStats && (
              <div className="space-y-6">
                {/* Statistics Comparison Table */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4 text-amber-600" />
                    Sample Means Statistics vs Theoretical Values
                  </p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium">
                            Statistic
                          </th>
                          <th className="px-4 py-2 text-right font-medium">
                            Sample Means
                          </th>
                          <th className="px-4 py-2 text-right font-medium">
                            Theoretical (CLT)
                          </th>
                          <th className="px-4 py-2 text-right font-medium">
                            Difference
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-2 font-medium">Mean</td>
                          <td className="px-4 py-2 text-right font-mono">
                            {sampleMeansStats.mean.toFixed(4)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-amber-600 dark:text-amber-400">
                            {sampleMeansStats.theoreticalMean.toFixed(4)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              {sampleMeansStats.meanDiff.toFixed(4)}
                            </Badge>
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-2 font-medium">
                            Std Dev (SE)
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            {sampleMeansStats.stdDev.toFixed(4)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-amber-600 dark:text-amber-400">
                            {sampleMeansStats.theoreticalSE.toFixed(4)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              {sampleMeansStats.seDiff.toFixed(4)}
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* CLT Insight */}
                  <div className="flex items-start gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                    <span>
                      The CLT predicts that the mean of sample means equals the
                      population mean (μ = {sampleMeansStats.theoreticalMean.toFixed(4)})
                      and the standard error equals σ/√n ={' '}
                      {sampleMeansStats.theoreticalSE.toFixed(4)}. The
                      simulation results closely match these theoretical values!
                    </span>
                  </div>
                </div>

                {/* Histogram of Sample Means */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">
                    Distribution of Sample Means (n = {sampleSize}, resamples ={' '}
                    {numSamples})
                  </p>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="midpoint"
                          type="number"
                          label={{
                            value: 'Sample Mean',
                            position: 'insideBottom',
                            offset: -15,
                            style: { fontSize: 12, fill: '#666' },
                          }}
                          fontSize={11}
                        />
                        <YAxis
                          label={{
                            value: 'Frequency',
                            angle: -90,
                            position: 'insideLeft',
                            offset: 0,
                            style: { fontSize: 12, fill: '#666' },
                          }}
                          fontSize={11}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === 'frequency'
                              ? value
                              : value.toFixed(2),
                            name === 'frequency'
                              ? 'Frequency'
                              : 'Theoretical Normal',
                          ]}
                          labelFormatter={(label: number) =>
                            `Sample Mean ≈ ${label.toFixed(2)}`
                          }
                        />
                        <Bar
                          dataKey="frequency"
                          fill="#f59e0b"
                          fillOpacity={0.7}
                          stroke="#d97706"
                          strokeWidth={1}
                          radius={[2, 2, 0, 0]}
                        />
                        <Line
                          dataKey="curve"
                          type="monotone"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={false}
                          name="Theoretical Normal"
                        />
                        <ReferenceLine
                          x={sampleMeansStats.mean}
                          stroke="#dc2626"
                          strokeWidth={2}
                          strokeDasharray="6 3"
                          label={{
                            value: `x̄ = ${sampleMeansStats.mean.toFixed(2)}`,
                            position: 'top',
                            fill: '#dc2626',
                            fontSize: 11,
                            fontWeight: 'bold',
                          }}
                        />
                        <ReferenceLine
                          x={populationMean}
                          stroke="#7c3aed"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          label={{
                            value: `μ = ${populationMean.toFixed(2)}`,
                            position: 'insideTopLeft',
                            fill: '#7c3aed',
                            fontSize: 11,
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-center gap-4 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm bg-amber-400 border border-amber-500" />
                      <span>Sample Means Histogram</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-4 h-0.5 bg-emerald-500 rounded" />
                      <span>Theoretical Normal Curve</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-4 h-0.5 bg-red-600 rounded" style={{ borderTop: '2px dashed #dc2626' }} />
                      <span>Sample Mean (x̄)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== Main Component ====================

export default function ZScoreCLT() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Z-Score &amp; Central Limit Theorem
        </h2>
        <p className="text-muted-foreground text-sm">
          Calculate z-scores and explore the Central Limit Theorem through
          interactive simulation
        </p>
      </div>

      <ZScoreCalculator />
      <CLTSimulation />
    </div>
  )
}
