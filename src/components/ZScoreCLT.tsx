'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Calculator,
  Play,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  TableProperties,
  ArrowLeftRight,
  Timer,
  GitCompare,
  Database,
  ArrowUpDown,
  Info,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import {
  zScore,
  normalPDF,
  normalCDF,
  normalInvCDF,
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
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shrink-0">
            <Calculator className="size-4" />
          </div>
          Z-Score Calculator
        </CardTitle>
        <CardDescription>
          Calculate the z-score and visualize it on the standard normal
          distribution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formula Display */}
        <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">
            Formula
          </p>
          <p className="text-2xl font-mono font-bold text-emerald-800 dark:text-emerald-300 tracking-wide">
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
              className="font-mono transition-colors hover:border-emerald-400 focus:border-emerald-500"
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
              className="font-mono transition-colors hover:border-emerald-400 focus:border-emerald-500"
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
              className="font-mono transition-colors hover:border-emerald-400 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Validation error */}
        {sigmaValue && parseFloat(sigmaValue) <= 0 && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
            <AlertCircle className="size-4 shrink-0" />
            Standard deviation must be greater than 0
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleCalculate}
            disabled={!isValid}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all hover:shadow-md"
          >
            <Calculator className="size-4 mr-2 shrink-0" />
            Calculate
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
          >
            Reset
          </Button>
        </div>

        {/* Results */}
        {calculated && z !== null && probability !== null && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {/* Z-Score Result */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="min-w-0 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/30 dark:to-teal-900/20 border border-teal-200 dark:border-teal-800 p-4 text-center transition-transform hover:scale-[1.02]">
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mb-1">
                  Z-Score
                </p>
                <p className="text-2xl font-bold font-mono text-teal-800 dark:text-teal-300 truncate">
                  {z.toFixed(4)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-center transition-transform hover:scale-[1.02]">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                  P(Z ≤ z)
                </p>
                <p className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-300 truncate">
                  {probability.toFixed(4)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 text-center transition-transform hover:scale-[1.02]">
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-1">
                  P(Z &gt; z)
                </p>
                <p className="text-2xl font-bold font-mono text-rose-800 dark:text-rose-300 truncate">
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
              <div className="h-60 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={normalData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="normalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
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
                      fill="url(#normalGradient)"
                      fillOpacity={1}
                      strokeWidth={2}
                    />
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

              {/* Shaded area plot */}
              <div className="h-44 sm:h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={shadedData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="shadedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
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
                      fill="url(#shadedGradient)"
                      fillOpacity={1}
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

// ==================== Z-Score Lookup Table ====================

const CRITICAL_VALUES = [
  { z: 1.645, label: '90%', alpha: 0.10, alphaTwoTailed: 0.05, color: 'teal', bgClass: 'bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/30 dark:to-teal-900/20', borderClass: 'border-teal-200 dark:border-teal-800', textClass: 'text-teal-800 dark:text-teal-300', subTextClass: 'text-teal-600 dark:text-teal-400', badgeClass: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800' },
  { z: 1.96, label: '95%', alpha: 0.05, alphaTwoTailed: 0.025, color: 'emerald', bgClass: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20', borderClass: 'border-emerald-200 dark:border-emerald-800', textClass: 'text-emerald-800 dark:text-emerald-300', subTextClass: 'text-emerald-600 dark:text-emerald-400', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800' },
  { z: 2.576, label: '99%', alpha: 0.01, alphaTwoTailed: 0.005, color: 'amber', bgClass: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20', borderClass: 'border-amber-200 dark:border-amber-800', textClass: 'text-amber-800 dark:text-amber-300', subTextClass: 'text-amber-600 dark:text-amber-400', badgeClass: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800' },
  { z: 3.29, label: '99.9%', alpha: 0.001, alphaTwoTailed: 0.0005, color: 'rose', bgClass: 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20', borderClass: 'border-rose-200 dark:border-rose-800', textClass: 'text-rose-800 dark:text-rose-300', subTextClass: 'text-rose-600 dark:text-rose-400', badgeClass: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800' },
]

function ZScoreLookupTable() {
  const [view, setView] = useState<'critical' | 'full'>('critical')

  // Generate full z-table data for -3.99 to 3.99 (increment 0.01)
  const zTableData = useMemo(() => {
    const rows: { z: number; prob: number }[] = []
    for (let z = -3.99; z <= 4.0; z += 0.01) {
      const rounded = Math.round(z * 100) / 100
      rows.push({ z: rounded, prob: normalCDF(rounded) })
    }
    return rows
  }, [])

  // Group full table into rows by integer z-value
  const zTableGroups = useMemo(() => {
    const groups: Record<number, { z: number; prob: number }[]> = {}
    zTableData.forEach((row) => {
      const intPart = Math.floor(row.z)
      if (!groups[intPart]) groups[intPart] = []
      groups[intPart].push(row)
    })
    return groups
  }, [zTableData])

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shrink-0">
                <TableProperties className="size-4" />
              </div>
              Z-Score Lookup Table
            </CardTitle>
            <CardDescription className="mt-1">
              Standard normal distribution probabilities P(Z ≤ z)
            </CardDescription>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as 'critical' | 'full')}>
            <TabsList className="h-8">
              <TabsTrigger value="critical" className="text-xs px-3">Critical Values</TabsTrigger>
              <TabsTrigger value="full" className="text-xs px-3">Full Table</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {view === 'critical' ? (
          <div className="space-y-4">
            {/* Critical values cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CRITICAL_VALUES.map((cv) => (
                <div
                  key={cv.z}
                  className={`rounded-lg ${cv.bgClass} border ${cv.borderClass} p-4 transition-all hover:scale-[1.02] hover:shadow-md`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={cv.badgeClass}>{cv.label} Confidence</Badge>
                    <span className={`text-xl font-bold font-mono ${cv.textClass}`}>
                      ±{cv.z}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">α (one-tailed)</span>
                      <span className={`font-mono font-medium ${cv.subTextClass}`}>{cv.alpha}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">α (two-tailed)</span>
                      <span className={`font-mono font-medium ${cv.subTextClass}`}>{cv.alphaTwoTailed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P(Z ≤ z)</span>
                      <span className={`font-mono font-medium ${cv.subTextClass}`}>{normalCDF(cv.z).toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* One-tailed vs Two-tailed explanation */}
            <div className="rounded-lg bg-muted/30 border p-4">
              <div className="flex items-start gap-2">
                <Info className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium text-foreground">One-tailed test:</span> The entire α is in one tail. For z = 1.645, the right 10% of the distribution is the rejection region.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Two-tailed test:</span> α is split between both tails. For z = ±1.96, each tail has 2.5%, totaling 5%.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {Object.entries(zTableGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([intPart, rows]) => (
                <div key={intPart}>
                  <div className="text-xs font-semibold text-muted-foreground mb-1 sticky top-0 bg-background py-1">
                    z = {intPart}.xx
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                    {rows.map((row) => (
                      <div
                        key={row.z}
                        className={`text-center rounded px-1 py-0.5 text-[10px] font-mono cursor-default transition-colors ${
                          Math.abs(row.z) >= 1.96
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-semibold'
                            : Math.abs(row.z) >= 1.645
                            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300'
                            : 'bg-muted/30 text-muted-foreground'
                        }`}
                        title={`P(Z ≤ ${row.z.toFixed(2)}) = ${row.prob.toFixed(4)}`}
                      >
                        <div className="truncate">{row.z.toFixed(2)}</div>
                        <div className="truncate font-semibold">{row.prob.toFixed(4)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== Interactive Percentile Calculator ====================

const QUICK_PERCENTILES = [
  { label: 'P5', prob: 0.05 },
  { label: 'P10', prob: 0.10 },
  { label: 'P25', prob: 0.25 },
  { label: 'P50', prob: 0.50 },
  { label: 'P75', prob: 0.75 },
  { label: 'P90', prob: 0.90 },
  { label: 'P95', prob: 0.95 },
]

function InteractivePercentileCalculator() {
  const [probInput, setProbInput] = useState<string>('')
  const [computedZ, setComputedZ] = useState<number | null>(null)
  const [computedProb, setComputedProb] = useState<number | null>(null)

  const handleCalculate = () => {
    const p = parseFloat(probInput)
    if (isNaN(p) || p <= 0 || p >= 1) return
    const z = normalInvCDF(p)
    setComputedZ(z)
    setComputedProb(p)
  }

  const handleQuickPercentile = (prob: number) => {
    setProbInput(prob.toString())
    const z = normalInvCDF(prob)
    setComputedZ(z)
    setComputedProb(prob)
  }

  const handleReset = () => {
    setProbInput('')
    setComputedZ(null)
    setComputedProb(null)
  }

  // Normal curve data with shaded area for percentile
  const percentileData = useMemo(() => {
    const points: { x: number; y: number }[] = []
    const numPoints = 200
    const xMin = -4
    const xMax = 4
    const step = (xMax - xMin) / numPoints
    for (let i = 0; i <= numPoints; i++) {
      const xi = xMin + i * step
      points.push({ x: Math.round(xi * 1000) / 1000, y: normalPDF(xi, 0, 1) })
    }
    return points
  }, [])

  const shadedAreaData = useMemo(() => {
    if (computedZ === null) return []
    const points: { x: number; y: number }[] = []
    const numPoints = 200
    const xMin = -4
    const xMax = Math.min(Math.max(computedZ, -4), 4)
    if (xMin >= xMax) return [{ x: xMin, y: 0 }]
    const step = (xMax - xMin) / numPoints
    for (let i = 0; i <= numPoints; i++) {
      const xi = xMin + i * step
      points.push({ x: Math.round(xi * 1000) / 1000, y: normalPDF(xi, 0, 1) })
    }
    return points
  }, [computedZ])

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-teal-400 via-emerald-500 to-green-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shrink-0">
            <ArrowLeftRight className="size-4" />
          </div>
          Percentile Calculator
        </CardTitle>
        <CardDescription>
          Find the z-score corresponding to a given probability — inverse of P(Z ≤ z)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Probability P(Z ≤ z)</Label>
            <Input
              type="number"
              min="0.001"
              max="0.999"
              step="0.01"
              placeholder="Enter probability (0 to 1)"
              value={probInput}
              onChange={(e) => {
                setProbInput(e.target.value)
                setComputedZ(null)
                setComputedProb(null)
              }}
              className="font-mono transition-colors hover:border-teal-400 focus:border-teal-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCalculate}
              disabled={!probInput || parseFloat(probInput) <= 0 || parseFloat(probInput) >= 1}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white transition-all hover:shadow-md"
            >
              <Sparkles className="size-4 mr-2 shrink-0" />
              Find Z-Score
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-teal-300 dark:border-teal-700"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Quick percentile buttons */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quick Percentiles</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PERCENTILES.map((qp) => (
              <Button
                key={qp.label}
                size="sm"
                variant="outline"
                onClick={() => handleQuickPercentile(qp.prob)}
                className={`text-xs font-mono transition-all hover:shadow-sm ${
                  computedProb === qp.prob
                    ? 'bg-teal-100 border-teal-400 text-teal-700 dark:bg-teal-900/40 dark:border-teal-700 dark:text-teal-300'
                    : 'hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30'
                }`}
              >
                {qp.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Validation */}
        {probInput && (parseFloat(probInput) <= 0 || parseFloat(probInput) >= 1) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
            <AlertCircle className="size-4 shrink-0" />
            Probability must be between 0 and 1 (exclusive)
          </div>
        )}

        {/* Result */}
        {computedZ !== null && computedProb !== null && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800 p-4 text-center transition-transform hover:scale-[1.02]">
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mb-1">
                  Input Probability
                </p>
                <p className="text-2xl font-bold font-mono text-teal-800 dark:text-teal-300">
                  {computedProb.toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 p-4 text-center transition-transform hover:scale-[1.02]">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
                  Z-Score
                </p>
                <p className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
                  {computedZ.toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 p-4 text-center transition-transform hover:scale-[1.02]">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                  Percentile Rank
                </p>
                <p className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-300">
                  {(computedProb * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Visualization */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Standard Normal Curve — Shaded Area = P(Z ≤ {computedZ.toFixed(2)})
              </p>
              <div className="h-52 sm:h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={shadedAreaData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="percentileGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="x"
                      type="number"
                      domain={[-4, 4]}
                      ticks={[-3, -2, -1, 0, 1, 2, 3]}
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
                        style: { fontSize: 12, fill: '#666' },
                      }}
                      fontSize={11}
                    />
                    <Tooltip
                      formatter={(value: number) => [value.toFixed(4), 'Density']}
                      labelFormatter={(label: number) => `z = ${label.toFixed(2)}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke="#14b8a6"
                      fill="url(#percentileGradient)"
                      fillOpacity={1}
                      strokeWidth={2}
                    />
                    <ReferenceLine
                      x={Math.min(Math.max(computedZ, -4), 4)}
                      stroke="#059669"
                      strokeWidth={2.5}
                      strokeDasharray="6 3"
                      label={{
                        value: `z = ${computedZ.toFixed(2)}`,
                        position: 'top',
                        fill: '#059669',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interpretation */}
            <div className="rounded-lg bg-muted/30 border p-3 flex items-start gap-2">
              <BookOpen className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                A z-score of <span className="font-mono font-semibold text-foreground">{computedZ.toFixed(4)}</span> means
                that <span className="font-mono font-semibold text-foreground">{(computedProb * 100).toFixed(1)}%</span> of
                the standard normal distribution falls at or below this value. In other words, the {computedProb < 0.5 ? 'lower' : 'upper'}{' '}
                {computedProb < 0.5 ? `${(computedProb * 100).toFixed(1)}%` : `${((1 - computedProb) * 100).toFixed(1)}%`} of
                observations would have a z-score {computedProb < 0.5 ? 'less' : 'greater'} than this value.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== CLT Simulation (with Animation) ====================

type AnimationSpeed = 'slow' | 'medium' | 'fast'

const SPEED_MAP: Record<AnimationSpeed, number> = {
  slow: 200,
  medium: 50,
  fast: 10,
}

function CLTSimulation() {
  const { getNumericColumns, getColumnData, dataset } = useDataset()
  const numericColumns = getNumericColumns()

  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [sampleSize, setSampleSize] = useState<string>('30')
  const [numSamples, setNumSamples] = useState<string>('1000')
  const [sampleMeans, setSampleMeans] = useState<number[]>([])
  const [isRunning, setIsRunning] = useState(false)

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false)
  const [animSpeed, setAnimSpeed] = useState<AnimationSpeed>('medium')
  const [animProgress, setAnimProgress] = useState<number>(0)
  const [animTotal, setAnimTotal] = useState<number>(0)
  const [animMeans, setAnimMeans] = useState<number[]>([])
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    setTimeout(() => {
      const result = cltSimulation(columnData, n, num)
      setSampleMeans(result)
      setIsRunning(false)
    }, 50)
  }, [selectedColumn, columnData, sampleSize, numSamples])

  // Animation logic
  const handleAnimate = useCallback(() => {
    const n = parseInt(sampleSize)
    const num = parseInt(numSamples)
    if (!selectedColumn || columnData.length === 0 || isNaN(n) || isNaN(num) || n < 1 || num < 1) return

    // Stop any existing animation
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current)
      animTimerRef.current = null
    }

    // Generate all sample means at once
    const allMeans = cltSimulation(columnData, n, num)
    setAnimMeans([])
    setAnimProgress(0)
    setAnimTotal(num)
    setIsAnimating(true)
    setSampleMeans([])

    let currentIndex = 0
    const batchSize = animSpeed === 'slow' ? 1 : animSpeed === 'medium' ? 5 : 20
    const interval = SPEED_MAP[animSpeed]

    const addBatch = () => {
      const end = Math.min(currentIndex + batchSize, allMeans.length)
      const batch = allMeans.slice(currentIndex, end)
      setAnimMeans(prev => [...prev, ...batch])
      setAnimProgress(end)
      currentIndex = end

      if (currentIndex < allMeans.length) {
        animTimerRef.current = setTimeout(addBatch, interval)
      } else {
        setIsAnimating(false)
        setSampleMeans(allMeans)
      }
    }

    addBatch()
  }, [selectedColumn, columnData, sampleSize, numSamples, animSpeed])

  const handleStopAnimation = useCallback(() => {
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current)
      animTimerRef.current = null
    }
    setIsAnimating(false)
    // Keep whatever we have so far
    if (animMeans.length > 0) {
      setSampleMeans(animMeans)
    }
  }, [animMeans])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animTimerRef.current) {
        clearTimeout(animTimerRef.current)
      }
    }
  }, [])

  // Use animation means during animation, otherwise use full sample means
  const displayMeans = isAnimating ? animMeans : sampleMeans

  // Histogram data for sample means
  const histogramBins = useMemo(() => {
    if (displayMeans.length === 0) return []
    return histogramData(displayMeans, 30)
  }, [displayMeans])

  // Theoretical normal curve data overlaid on histogram
  const theoreticalCurveData = useMemo(() => {
    if (displayMeans.length === 0 || populationStdDev === 0) return []
    const displayMeansMean = mean(displayMeans)
    const displayMeansStd = standardDeviation(displayMeans, true)
    if (displayMeansStd === 0) return []

    const points: { x: number; y: number }[] = []
    const binWidth = histogramBins.length > 0
      ? histogramBins[0].binEnd - histogramBins[0].binStart
      : 1
    const totalArea = displayMeans.length * binWidth

    histogramBins.forEach((bin) => {
      const pdfVal = normalPDF(bin.midpoint, populationMean, populationStdDev / Math.sqrt(parseInt(sampleSize)))
      points.push({
        x: bin.midpoint,
        y: pdfVal * totalArea,
      })
    })
    return points
  }, [displayMeans, histogramBins, populationMean, populationStdDev, sampleSize])

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
    if (displayMeans.length === 0) return null
    const m = mean(displayMeans)
    const sd = standardDeviation(displayMeans, true)
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
  }, [displayMeans, populationMean, populationStdDev, sampleSize])

  const n = parseInt(sampleSize)
  const isValidSimulation =
    selectedColumn &&
    columnData.length >= 2 &&
    !isNaN(n) &&
    n >= 1 &&
    !isNaN(parseInt(numSamples)) &&
    parseInt(numSamples) >= 1

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0">
            <BarChart3 className="size-4" />
          </div>
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
                  <SelectTrigger className="w-full transition-colors hover:border-amber-400">
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
                  className="font-mono transition-colors hover:border-amber-400 focus:border-amber-500"
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
                  className="font-mono transition-colors hover:border-amber-400 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Population Info */}
            {selectedColumn && columnData.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="min-w-0 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/30 dark:to-teal-900/20 border border-teal-200 dark:border-teal-800 p-3 text-center transition-transform hover:scale-[1.01]">
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                    Population Size
                  </p>
                  <p className="text-lg font-bold font-mono text-teal-800 dark:text-teal-300 truncate">
                    {columnData.length.toLocaleString()}
                  </p>
                </div>
                <div className="min-w-0 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-center transition-transform hover:scale-[1.01]">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Population Mean (μ)
                  </p>
                  <p className="text-lg font-bold font-mono text-amber-800 dark:text-amber-300 truncate">
                    {populationMean.toFixed(4)}
                  </p>
                </div>
                <div className="min-w-0 rounded-lg bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 text-center transition-transform hover:scale-[1.01]">
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Population Std Dev (σ)
                  </p>
                  <p className="text-lg font-bold font-mono text-rose-800 dark:text-rose-300 truncate">
                    {populationStdDev.toFixed(4)}
                  </p>
                </div>
              </div>
            )}

            {/* Run + Animate Buttons */}
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                onClick={handleRunSimulation}
                disabled={!isValidSimulation || isRunning || isAnimating}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white transition-all hover:shadow-md"
              >
                <Play className="size-4 mr-2 shrink-0" />
                Run Simulation
              </Button>
              <Button
                onClick={isAnimating ? handleStopAnimation : handleAnimate}
                disabled={!isValidSimulation || isRunning}
                className={`text-white transition-all hover:shadow-md ${
                  isAnimating
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                }`}
              >
                {isAnimating ? (
                  <>
                    <span className="mr-2">⏹</span>
                    Stop
                  </>
                ) : (
                  <>
                    <Timer className="size-4 mr-2 shrink-0" />
                    Animate
                  </>
                )}
              </Button>

              {/* Speed selector */}
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-muted-foreground">Speed:</span>
                {(['slow', 'medium', 'fast'] as AnimationSpeed[]).map((speed) => (
                  <Button
                    key={speed}
                    size="sm"
                    variant={animSpeed === speed ? 'default' : 'outline'}
                    className={`text-xs h-7 ${
                      animSpeed === speed
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'hover:border-amber-400'
                    }`}
                    onClick={() => setAnimSpeed(speed)}
                    disabled={isAnimating}
                  >
                    {speed.charAt(0).toUpperCase() + speed.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Animation progress */}
            {isAnimating && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Animation Progress</span>
                  <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                    {animProgress} / {animTotal} samples processed
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-200"
                    style={{ width: `${animTotal > 0 ? (animProgress / animTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Simulation Results */}
            {displayMeans.length > 0 && sampleMeansStats && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Statistics Comparison Table */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4 text-amber-600 shrink-0" />
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
                        <tr className="border-t transition-colors hover:bg-muted/30">
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
                        <tr className="border-t transition-colors hover:bg-muted/30">
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
                    {displayMeans.length})
                  </p>
                  <div className="h-64 sm:h-80 w-full">
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

// ==================== CLT Sample Size Comparison ====================

const SAMPLE_SIZES = [5, 10, 30, 50, 100]
const SIZE_COLORS = ['#14b8a6', '#10b981', '#f59e0b', '#f97316', '#ef4444']
function CLTSampleSizeComparison() {
  const { getNumericColumns, getColumnData, dataset } = useDataset()
  const numericColumns = getNumericColumns()

  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [numResamples, setNumResamples] = useState<string>('500')
  const [results, setResults] = useState<{ n: number; means: number[] }[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const columnData = useMemo(() => {
    if (!selectedColumn) return []
    return getColumnData(selectedColumn)
  }, [selectedColumn, getColumnData])

  const popMean = useMemo(() => {
    if (columnData.length === 0) return 0
    return mean(columnData)
  }, [columnData])

  const popStdDev = useMemo(() => {
    if (columnData.length === 0) return 0
    return standardDeviation(columnData, true)
  }, [columnData])

  const handleRun = useCallback(() => {
    if (!selectedColumn || columnData.length === 0) return
    const numS = parseInt(numResamples)
    if (isNaN(numS) || numS < 1) return

    setIsRunning(true)
    setTimeout(() => {
      const simResults = SAMPLE_SIZES.map((n) => ({
        n,
        means: cltSimulation(columnData, n, numS),
      }))
      setResults(simResults)
      setIsRunning(false)
    }, 100)
  }, [selectedColumn, columnData, numResamples])

  // Build chart data for each sample size
  const chartDataSets = useMemo(() => {
    return results.map((result, idx) => {
      const bins = histogramData(result.means, 20)
      const n = result.n
      const se = popStdDev / Math.sqrt(n)

      // Theoretical curve
      const binWidth = bins.length > 0 ? bins[0].binEnd - bins[0].binStart : 1
      const totalArea = result.means.length * binWidth

      return {
        n,
        color: SIZE_COLORS[idx],
        bins: bins.map((bin) => ({
          midpoint: bin.midpoint,
          frequency: bin.frequency,
          curve: normalPDF(bin.midpoint, popMean, se) * totalArea,
        })),
        statsMean: mean(result.means),
        statsStd: standardDeviation(result.means, true),
      }
    })
  }, [results, popMean, popStdDev])

  if (!dataset) return null

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white shrink-0">
            <GitCompare className="size-4" />
          </div>
          Compare Sample Sizes
        </CardTitle>
        <CardDescription>
          Run CLT simulation for multiple sample sizes simultaneously to see how larger n produces more normal distributions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {numericColumns.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-4 shrink-0" />
            <span className="text-sm">No numeric columns found in the dataset.</span>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Column</Label>
                <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                  <SelectTrigger className="w-full transition-colors hover:border-amber-400">
                    <SelectValue placeholder="Choose column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Resamples per Size</Label>
                <Input
                  type="number"
                  min="50"
                  max="5000"
                  value={numResamples}
                  onChange={(e) => setNumResamples(e.target.value)}
                  className="font-mono transition-colors hover:border-amber-400 focus:border-amber-500"
                />
              </div>
              <Button
                onClick={handleRun}
                disabled={!selectedColumn || isRunning}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white transition-all hover:shadow-md"
              >
                {isRunning ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Comparing...
                  </>
                ) : (
                  <>
                    <GitCompare className="size-4 mr-2 shrink-0" />
                    Compare
                  </>
                )}
              </Button>
            </div>

            {/* Results grid */}
            {chartDataSets.length > 0 && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chartDataSets.map((data, idx) => (
                    <div
                      key={data.n}
                      className="rounded-lg border p-3 space-y-2 transition-all hover:shadow-md"
                      style={{ borderColor: `${SIZE_COLORS[idx]}40` }}
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          className="text-xs font-semibold"
                          style={{
                            backgroundColor: `${SIZE_COLORS[idx]}20`,
                            color: SIZE_COLORS[idx],
                            borderColor: `${SIZE_COLORS[idx]}40`,
                          }}
                        >
                          n = {data.n}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          SE = {(popStdDev / Math.sqrt(data.n)).toFixed(3)}
                        </span>
                      </div>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={data.bins} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="midpoint" type="number" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 9 }} />
                            <Tooltip
                              formatter={(value: number, name: string) => [
                                name === 'frequency' ? value : value.toFixed(2),
                                name === 'frequency' ? 'Freq' : 'Normal',
                              ]}
                              contentStyle={{ fontSize: '10px' }}
                            />
                            <Bar dataKey="frequency" fill={SIZE_COLORS[idx]} fillOpacity={0.6} radius={[1, 1, 0, 0]} />
                            <Line dataKey="curve" type="monotone" stroke={SIZE_COLORS[idx]} strokeWidth={1.5} dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>x̄ = {data.statsMean.toFixed(3)}</span>
                        <span>s = {data.statsStd.toFixed(3)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Insight */}
                <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    As sample size (n) increases, the distribution of sample means becomes more normal and narrower (smaller SE = σ/√n).
                    Notice how n = 5 may still show skewness, while n = 100 closely approximates the theoretical normal curve.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== Data-Driven Z-Score Analysis ====================

function DataDrivenZScoreAnalysis() {
  const { getNumericColumns, getColumnData, dataset } = useDataset()
  const numericColumns = getNumericColumns()

  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [selectedRow, setSelectedRow] = useState<string>('')
  const [sortField, setSortField] = useState<'index' | 'value' | 'zscore'>('index')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const columnData = useMemo(() => {
    if (!selectedColumn) return []
    return getColumnData(selectedColumn)
  }, [selectedColumn, getColumnData])

  const colMean = useMemo(() => {
    if (columnData.length === 0) return 0
    return mean(columnData)
  }, [columnData])

  const colStdDev = useMemo(() => {
    if (columnData.length === 0) return 0
    return standardDeviation(columnData)
  }, [columnData])

  // Compute z-scores for all data points
  const zScoreData = useMemo(() => {
    if (columnData.length === 0 || colStdDev === 0) return []
    return columnData.map((val, idx) => ({
      index: idx,
      value: val,
      z: zScore(val, colMean, colStdDev),
      isOutlier: Math.abs(zScore(val, colMean, colStdDev)) > 2,
    }))
  }, [columnData, colMean, colStdDev])

  // Sort data
  const sortedData = useMemo(() => {
    const data = [...zScoreData]
    data.sort((a, b) => {
      let cmp = 0
      if (sortField === 'index') cmp = a.index - b.index
      else if (sortField === 'value') cmp = a.value - b.value
      else cmp = a.z - b.z
      return sortDir === 'asc' ? cmp : -cmp
    })
    return data
  }, [zScoreData, sortField, sortDir])

  const selectedRowIdx = parseInt(selectedRow)
  const selectedDataPoint = useMemo(() => {
    if (isNaN(selectedRowIdx) || selectedRowIdx < 0 || selectedRowIdx >= zScoreData.length) return null
    return zScoreData[selectedRowIdx]
  }, [selectedRowIdx, zScoreData])

  const handleSort = (field: 'index' | 'value' | 'zscore') => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Shaded normal curve for selected data point
  const selectedShadedData = useMemo(() => {
    if (!selectedDataPoint) return []
    const points: { x: number; y: number }[] = []
    const numPoints = 200
    const xMin = -4
    const xMax = Math.min(Math.max(selectedDataPoint.z, -4), 4)
    if (xMin >= xMax) return [{ x: xMin, y: 0 }]
    const step = (xMax - xMin) / numPoints
    for (let i = 0; i <= numPoints; i++) {
      const xi = xMin + i * step
      points.push({ x: Math.round(xi * 1000) / 1000, y: normalPDF(xi, 0, 1) })
    }
    return points
  }, [selectedDataPoint])

  const outlierCount = zScoreData.filter(d => d.isOutlier).length

  if (!dataset) return null

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shrink-0">
            <Database className="size-4" />
          </div>
          Data-Driven Z-Score Analysis
        </CardTitle>
        <CardDescription>
          Select a column and row to compute z-scores within the column&apos;s distribution, identify outliers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {numericColumns.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-4 shrink-0" />
            <span className="text-sm">No numeric columns found in the dataset.</span>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Column</Label>
                <Select value={selectedColumn} onValueChange={(v) => { setSelectedColumn(v); setSelectedRow('') }}>
                  <SelectTrigger className="w-full transition-colors hover:border-emerald-400">
                    <SelectValue placeholder="Choose column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Row Index (0–{columnData.length > 0 ? columnData.length - 1 : 0})</Label>
                <Input
                  type="number"
                  min="0"
                  max={columnData.length > 0 ? columnData.length - 1 : 0}
                  placeholder="Enter row index"
                  value={selectedRow}
                  onChange={(e) => setSelectedRow(e.target.value)}
                  className="font-mono transition-colors hover:border-emerald-400 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Column summary */}
            {columnData.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/30 dark:to-teal-900/20 border border-teal-200 dark:border-teal-800 p-3 text-center">
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Count</p>
                  <p className="text-lg font-bold font-mono text-teal-800 dark:text-teal-300">{columnData.length}</p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Mean (x̄)</p>
                  <p className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300">{colMean.toFixed(3)}</p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-center">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Std Dev (s)</p>
                  <p className="text-lg font-bold font-mono text-amber-800 dark:text-amber-300">{colStdDev.toFixed(3)}</p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 text-center">
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Outliers (|z|&gt;2)</p>
                  <p className="text-lg font-bold font-mono text-rose-800 dark:text-rose-300">{outlierCount}</p>
                </div>
              </div>
            )}

            {/* Selected data point visualization */}
            {selectedDataPoint && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-center transition-transform hover:scale-[1.02]">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Value</p>
                    <p className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300">{selectedDataPoint.value.toFixed(4)}</p>
                    <p className="text-[10px] text-muted-foreground">Row {selectedDataPoint.index}</p>
                  </div>
                  <div className="rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 p-3 text-center transition-transform hover:scale-[1.02]">
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Z-Score</p>
                    <p className="text-2xl font-bold font-mono text-teal-800 dark:text-teal-300">{selectedDataPoint.z.toFixed(4)}</p>
                  </div>
                  <div className={`rounded-lg border p-3 text-center transition-transform hover:scale-[1.02] ${
                    selectedDataPoint.isOutlier
                      ? 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-900/20 border-rose-200 dark:border-rose-800'
                      : 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800'
                  }`}>
                    <p className="text-xs text-muted-foreground font-medium">Status</p>
                    {selectedDataPoint.isOutlier ? (
                      <Badge className="bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800 text-sm mt-1">
                        Outlier (|z| &gt; 2)
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 text-sm mt-1">
                        Within Normal Range
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Normal curve with point */}
                <div className="h-48 sm:h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={selectedShadedData}
                      margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="dataZGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[-4, 4]}
                        ticks={[-3, -2, -1, 0, 1, 2, 3]}
                        label={{ value: 'Z-Score', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#666' } }}
                        fontSize={10}
                      />
                      <YAxis
                        label={{ value: 'Density', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#666' } }}
                        fontSize={10}
                      />
                      <Tooltip
                        formatter={(value: number) => [value.toFixed(4), 'Density']}
                        labelFormatter={(label: number) => `z = ${label.toFixed(2)}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="y"
                        stroke="#10b981"
                        fill="url(#dataZGradient)"
                        fillOpacity={1}
                        strokeWidth={2}
                      />
                      <ReferenceLine
                        x={Math.min(Math.max(selectedDataPoint.z, -4), 4)}
                        stroke={selectedDataPoint.isOutlier ? '#ef4444' : '#059669'}
                        strokeWidth={2.5}
                        strokeDasharray="6 3"
                        label={{
                          value: `z = ${selectedDataPoint.z.toFixed(2)}`,
                          position: 'top',
                          fill: selectedDataPoint.isOutlier ? '#ef4444' : '#059669',
                          fontSize: 11,
                          fontWeight: 'bold',
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Sortable Z-Score Table */}
            {zScoreData.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">All Data Points with Z-Scores</p>
                  {outlierCount > 0 && (
                    <Badge className="bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800 text-xs">
                      {outlierCount} outlier{outlierCount !== 1 ? 's' : ''} detected
                    </Badge>
                  )}
                </div>
                <ScrollArea className="max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('index')}>
                          <div className="flex items-center gap-1">
                            Row
                            <ArrowUpDown className="size-3" />
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('value')}>
                          <div className="flex items-center gap-1">
                            Value
                            <ArrowUpDown className="size-3" />
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('zscore')}>
                          <div className="flex items-center gap-1">
                            Z-Score
                            <ArrowUpDown className="size-3" />
                          </div>
                        </TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedData.map((row) => (
                        <TableRow
                          key={row.index}
                          className={`transition-colors hover:bg-muted/50 cursor-default ${
                            row.index === selectedRowIdx ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''
                          } ${row.isOutlier ? 'bg-rose-50/50 dark:bg-rose-950/10' : ''}`}
                          onClick={() => setSelectedRow(String(row.index))}
                        >
                          <TableCell className="font-mono text-xs">{row.index}</TableCell>
                          <TableCell className="font-mono text-xs">{row.value.toFixed(4)}</TableCell>
                          <TableCell className="font-mono text-xs font-semibold">{row.z.toFixed(4)}</TableCell>
                          <TableCell>
                            {row.isOutlier ? (
                              <Badge className="bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800 text-[10px] px-1.5 py-0">
                                Outlier
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 text-[10px] px-1.5 py-0">
                                Normal
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
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
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Z-Score &amp; Central Limit Theorem
        </h2>
        <p className="text-muted-foreground text-sm">
          Calculate z-scores and explore the Central Limit Theorem through
          interactive simulation
        </p>
      </div>

      {/* Z-Score Section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
          <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">Z-Score Analysis</h3>
        </div>
        <ZScoreCalculator />
      </div>

      {/* Z-Score Lookup Table */}
      <ZScoreLookupTable />

      {/* Percentile Calculator */}
      <InteractivePercentileCalculator />

      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

      {/* CLT Section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-amber-500 to-orange-500" />
          <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400">Central Limit Theorem</h3>
        </div>
        <CLTSimulation />
      </div>

      {/* CLT Sample Size Comparison */}
      <CLTSampleSizeComparison />

      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

      {/* Data-Driven Analysis */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-teal-500 to-cyan-500" />
          <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-400">Data-Driven Analysis</h3>
        </div>
        <DataDrivenZScoreAnalysis />
      </div>
    </div>
  )
}
